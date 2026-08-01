#!/usr/bin/env node
/**
 * Source URL confirmation pass.
 *
 * Every URL in the source library was located through a search index and has
 * never been opened — see the README. This script does the opening: it
 * requests each one, reports what came back, and (with --write) records a
 * `retrieved` date against the entries that resolved.
 *
 * It cannot run in an environment whose egress policy blocks these hosts. That
 * is the normal state for a Claude Code on the web session unless the policy
 * has been widened; the script detects the block and says so rather than
 * recording 56 failures as if the documents were missing.
 *
 *   node scripts/check-sources.mjs           # report only
 *   node scripts/check-sources.mjs --write   # also record retrieved dates
 *   node scripts/check-sources.mjs --only=amp,budget-2025
 *
 * Confirming that a URL returns 200 is necessary but not sufficient. It proves
 * something is served at that address, not that the something is the document
 * described. For PDFs the script checks the content type and reports the size,
 * which catches the common failure where a municipal CMS returns an HTML "page
 * not found" with a 200 status. A human still has to open the important ones.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCES = join(root, 'src/data/sources.json')

const args = process.argv.slice(2)
const write = args.includes('--write')
const onlyArg = args.find((a) => a.startsWith('--only='))
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

// Deliberately not routed through HTTPS_PROXY. A sandboxed egress gateway
// intercepts outbound traffic transparently and answers a denied host with a
// plain 403 carrying x-deny-reason, which is a far better diagnostic than the
// buried CONNECT-tunnel exception the explicit proxy path produces.
const today = new Date().toISOString().slice(0, 10)
const sources = JSON.parse(readFileSync(SOURCES, 'utf8'))

const targets = sources.filter(
  (s) => s.url && !s.retrieved && (!only || only.has(s.id)),
)

if (targets.length === 0) {
  console.log('Nothing to check: every recorded URL already carries a retrieved date.')
  process.exit(0)
}

console.log(`Checking ${targets.length} unconfirmed URL${targets.length === 1 ? '' : 's'}…\n`)

const results = []
let blocked = 0

for (const source of targets) {
  const result = await check(source.url)
  results.push({ source, ...result })
  const mark = result.ok ? '✓' : result.blocked ? '⊘' : '✗'
  if (result.blocked) blocked += 1
  console.log(`${mark} ${source.id.padEnd(24)} ${result.detail}`)
}

console.log('')

const ok = results.filter((r) => r.ok)
const failed = results.filter((r) => !r.ok && !r.blocked)

if (blocked > 0) {
  const hosts = [...new Set(results.filter((r) => r.blocked).map((r) => hostOf(r.source.url)))]
  console.log(
    `${blocked} request${blocked === 1 ? '' : 's'} never reached the internet: this environment's egress\n` +
      `policy does not allow the host. Nothing has been confirmed and nothing will be\n` +
      `written — a blocked host is not a missing document.\n\n` +
      `Add these hosts to the environment's network egress settings, then re-run:\n`,
  )
  for (const h of hosts) console.log(`    ${h}`)
  process.exit(blocked === results.length ? 2 : 1)
}

console.log(`${ok.length} resolved, ${failed.length} did not.`)

if (failed.length > 0) {
  console.log('\nDid not resolve — the URL has moved, or the document was withdrawn:')
  for (const r of failed) console.log(`  · ${r.source.id}: ${r.detail}`)
  console.log(
    '\nMunicipal file URLs change whenever the site is reorganised. Find the\n' +
      'document again from its department index, update the url, and capture a\n' +
      'stored copy this time.',
  )
}

if (write && ok.length > 0) {
  for (const r of ok) {
    const entry = sources.find((s) => s.id === r.source.id)
    entry.retrieved = today
  }
  writeFileSync(SOURCES, `${JSON.stringify(sources, null, 2)}\n`)
  console.log(
    `\nRecorded retrieved=${today} against ${ok.length} source${ok.length === 1 ? '' : 's'}.\n` +
      `A 200 response is not proof the document is what this library says it is —\n` +
      `open the ones you are about to transcribe from before you trust them.`,
  )
} else if (ok.length > 0) {
  console.log('\nRe-run with --write to record retrieved dates.')
}

/** One request, classified into resolved / not resolved / never left the network. */
async function check(url) {
  try {
    // HEAD first: cheaper, and enough for a status. Some servers reject it,
    // in which case fall back to a ranged GET rather than pulling whole PDFs.
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { Range: 'bytes=0-2047' },
        signal: AbortSignal.timeout(20000),
      })
    }

    // A sandbox egress gateway denies a disallowed host with its own 403 and
    // an x-deny-reason header. Without this check the denial reads as "the
    // township withdrew the document", which is the worst possible confusion
    // for a library whose whole purpose is knowing what exists.
    const denyReason = response.headers.get('x-deny-reason')
    if (denyReason) {
      return { ok: false, blocked: true, detail: `blocked by egress policy (${denyReason})` }
    }

    const type = (response.headers.get('content-type') || '').split(';')[0]
    const length = response.headers.get('content-length')
    const size = length ? ` ${(Number(length) / 1024).toFixed(0)} kB` : ''
    const expectPdf = url.toLowerCase().endsWith('.pdf')

    if (!response.ok) {
      return { ok: false, blocked: false, detail: `HTTP ${response.status} ${type}` }
    }
    if (expectPdf && type && !type.includes('pdf')) {
      // A 200 that serves HTML where a PDF was expected is the CMS's
      // "not found" page wearing a success status. Treat it as a failure.
      return {
        ok: false,
        blocked: false,
        detail: `HTTP 200 but content-type is ${type}, expected a PDF — likely a not-found page`,
      }
    }
    return { ok: true, blocked: false, detail: `HTTP ${response.status} ${type}${size}` }
  } catch (error) {
    // The useful signal is buried: a policy denial surfaces as
    // TypeError "fetch failed" → cause "Request was cancelled." → cause
    // "Proxy response (403) !== 200 when HTTP Tunneling". Walk the whole
    // chain, or a blocked host reads as a missing document.
    const message = causeChain(error)
    const isBlocked =
      /Proxy response \(\d+\)/i.test(message) ||
      /tunnel/i.test(message) ||
      /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ERR_PROXY/.test(message) ||
      /proxy/i.test(message)
    return {
      ok: false,
      blocked: isBlocked,
      detail: isBlocked ? `blocked by egress policy` : message.slice(0, 70),
    }
  }
}

/** Flatten an error and everything it wraps into one searchable string. */
function causeChain(error) {
  const parts = []
  let current = error
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (current.message) parts.push(current.message)
    if (current.code) parts.push(String(current.code))
    current = current.cause
  }
  return parts.join(' | ') || String(error)
}

function hostOf(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

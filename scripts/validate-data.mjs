#!/usr/bin/env node
/**
 * Data validator. Runs as part of `npm run build`, so a violation fails the
 * build rather than reaching the dashboard.
 *
 * It enforces the two rules the product rests on:
 *
 *   Source or silence.  Every figure carries a citation, and every citation
 *                       resolves to a document in the source library.
 *   Uncertainty shown.  Every figure declares its provenance, so nothing can
 *                       be displayed without the interface knowing whether it
 *                       was transcribed or is still a placeholder.
 *
 * It also reports, without failing, how many placeholders remain. That count
 * is the project's real progress measure.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const errors = []
const warnings = []

const fail = (where, message) => errors.push(`${where}: ${message}`)
const warn = (where, message) => warnings.push(`${where}: ${message}`)

const TIERS = new Set(['township', 'county', 'shared', 'province', 'federal', 'other'])
const PROVENANCE = new Set(['sourced', 'sample'])
const POLARITY = new Set(['higher-is-favourable', 'lower-is-favourable', 'neutral'])
const FORMATS = new Set([
  'currency', 'currency2', 'number', 'number1', 'percent',
  'km', 'years', 'days', 'ratio', 'text',
])
const CLAIM_KINDS = new Set(['sourced', 'interpretation', 'open-question'])
const SOURCE_STATUS = new Set(['linked', 'stored', 'requested', 'unavailable'])
const CONFIDENCE = new Set(['high', 'medium', 'low'])
const DIRECTIONS = new Set(['improving', 'declining', 'flat', 'mixed', 'unknown'])
const ISO_DATE = /^\d{4}-\d{2}(-\d{2})?$/

const sources = read('src/data/sources.json')
const meta = read('src/data/meta.json')
const stewardship = read('src/data/stewardship.json')
const curriculum = read('src/data/curriculum.json')

const DOMAIN_FILES = [
  'src/data/domains/financial.json',
  'src/data/domains/infrastructure.json',
  'src/data/domains/community.json',
  'src/data/domains/safety.json',
  'src/data/domains/planning.json',
  'src/data/domains/council.json',
]
const domains = DOMAIN_FILES.map(read)

/* ---------------------------------------------------------------- */
/* Source library                                                    */
/* ---------------------------------------------------------------- */

const sourceIds = new Set()
for (const s of sources) {
  const where = `source "${s.id ?? '(no id)'}"`
  if (!s.id) fail(where, 'missing id')
  if (sourceIds.has(s.id)) fail(where, 'duplicate source id')
  sourceIds.add(s.id)
  if (!s.title) fail(where, 'missing title')
  if (!s.publisher) fail(where, 'missing publisher')
  if (!s.year) fail(where, 'missing year')
  if (!SOURCE_STATUS.has(s.status)) fail(where, `invalid status "${s.status}"`)
  if (s.tier && !TIERS.has(s.tier)) fail(where, `invalid tier "${s.tier}"`)
  if ((s.status === 'linked' || s.status === 'stored') && !s.url && s.status === 'linked') {
    fail(where, 'status is "linked" but no url is recorded')
  }
  if (s.url && !s.retrieved) {
    warn(where, 'has a url but no retrieved date — record when it was last confirmed to resolve')
  }
}

/** Every citation must resolve. An unresolvable citation is worse than none. */
function checkRef(ref, where) {
  if (!ref || typeof ref !== 'object') {
    fail(where, 'missing source reference')
    return
  }
  if (!ref.sourceId) {
    fail(where, 'source reference has no sourceId')
    return
  }
  if (!sourceIds.has(ref.sourceId)) {
    fail(where, `cites unknown source "${ref.sourceId}"`)
  }
}

/* ---------------------------------------------------------------- */
/* Domains                                                           */
/* ---------------------------------------------------------------- */

let totalPoints = 0
let samplePoints = 0
let sampleTables = 0
let totalTables = 0
const domainIds = new Set()
const domainSlugs = new Set()
const indicatorKeys = new Set()

for (const domain of domains) {
  const dWhere = `domain "${domain.id ?? '(no id)'}"`
  if (!domain.id) fail(dWhere, 'missing id')
  if (domainIds.has(domain.id)) fail(dWhere, 'duplicate domain id')
  domainIds.add(domain.id)
  if (!domain.slug) fail(dWhere, 'missing slug')
  if (domainSlugs.has(domain.slug)) fail(dWhere, 'duplicate domain slug')
  domainSlugs.add(domain.slug)
  if (!Array.isArray(domain.primer) || domain.primer.length === 0) {
    fail(dWhere, 'every domain must open with a plain-language primer')
  }
  if (!ISO_DATE.test(domain.lastUpdated ?? '')) fail(dWhere, 'missing or malformed lastUpdated')
  for (const id of domain.sourceIds ?? []) {
    if (!sourceIds.has(id)) fail(dWhere, `sourceIds cites unknown source "${id}"`)
  }
  for (const row of domain.tierSplit ?? []) {
    if (!TIERS.has(row.owner)) fail(dWhere, `tierSplit "${row.item}" has invalid owner "${row.owner}"`)
  }

  const seenIndicators = new Set()
  for (const ind of domain.indicators ?? []) {
    const where = `${dWhere} indicator "${ind.id ?? '(no id)'}"`
    if (!ind.id) fail(where, 'missing id')
    if (seenIndicators.has(ind.id)) fail(where, 'duplicate indicator id within the domain')
    seenIndicators.add(ind.id)
    indicatorKeys.add(`${domain.id}/${ind.id}`)

    if (!ind.name) fail(where, 'missing name')
    if (!ind.definition) fail(where, 'missing definition — a figure without one cannot be read correctly')
    if (!ind.geography) fail(where, 'missing geography — every figure must state the geography it describes')
    if (!TIERS.has(ind.tier)) fail(where, `invalid tier "${ind.tier}"`)
    if (!POLARITY.has(ind.polarity)) fail(where, `invalid polarity "${ind.polarity}"`)
    if (!FORMATS.has(ind.format)) fail(where, `invalid format "${ind.format}"`)
    if (!ISO_DATE.test(ind.lastUpdated ?? '')) fail(where, 'missing or malformed lastUpdated')
    if (!Array.isArray(ind.series) || ind.series.length === 0) {
      fail(where, 'has no series')
    }

    const periods = new Set()
    for (const point of ind.series ?? []) {
      const pWhere = `${where} period "${point.period ?? '(none)'}"`
      totalPoints += 1
      if (!point.period) fail(pWhere, 'missing period')
      if (periods.has(point.period)) fail(pWhere, 'duplicate period in series')
      periods.add(point.period)
      if (point.value !== null && typeof point.value !== 'number') {
        fail(pWhere, 'value must be a number or null')
      }
      if (!PROVENANCE.has(point.provenance)) fail(pWhere, `invalid provenance "${point.provenance}"`)
      if (point.provenance === 'sample') samplePoints += 1
      if (!ISO_DATE.test(point.recorded ?? '')) fail(pWhere, 'missing or malformed recorded date')
      checkRef(point.source, pWhere)
    }

    if (ind.target) {
      const tWhere = `${where} target`
      if (typeof ind.target.value !== 'number') fail(tWhere, 'target value must be a number')
      if (!ind.target.label) fail(tWhere, 'target missing label')
      if (!PROVENANCE.has(ind.target.provenance)) fail(tWhere, 'target missing provenance')
      checkRef(ind.target.source, tWhere)
    }
  }

  const seenTables = new Set()
  for (const table of domain.tables ?? []) {
    const where = `${dWhere} table "${table.id ?? '(no id)'}"`
    totalTables += 1
    if (!table.id) fail(where, 'missing id')
    if (seenTables.has(table.id)) fail(where, 'duplicate table id within the domain')
    seenTables.add(table.id)
    if (!table.title) fail(where, 'missing title')
    if (!PROVENANCE.has(table.provenance)) fail(where, `invalid provenance "${table.provenance}"`)
    if (table.provenance === 'sample') sampleTables += 1
    if (!ISO_DATE.test(table.lastUpdated ?? '')) fail(where, 'missing or malformed lastUpdated')
    if (table.tier && !TIERS.has(table.tier)) fail(where, `invalid tier "${table.tier}"`)
    checkRef(table.source, where)

    const keys = new Set((table.columns ?? []).map((c) => c.key))
    if (keys.size === 0) fail(where, 'has no columns')
    for (const col of table.columns ?? []) {
      if (col.format && !FORMATS.has(col.format)) fail(where, `column "${col.key}" has invalid format`)
    }
    table.rows?.forEach((row, i) => {
      for (const key of keys) {
        if (!(key in row)) {
          warn(where, `row ${i + 1} has no value for column "${key}" — it will render as an em dash`)
        }
      }
      for (const key of Object.keys(row)) {
        if (!keys.has(key)) warn(where, `row ${i + 1} has key "${key}" with no matching column`)
      }
    })
  }
}

/* ---------------------------------------------------------------- */
/* Stewardship                                                       */
/* ---------------------------------------------------------------- */

const topicIds = new Set()
for (const topic of stewardship) {
  const where = `stewardship topic "${topic.id ?? '(no id)'}"`
  if (!topic.id) fail(where, 'missing id')
  if (topicIds.has(topic.id)) fail(where, 'duplicate topic id')
  topicIds.add(topic.id)
  if (!topic.title) fail(where, 'missing title')
  if (!domainIds.has(topic.domainId)) fail(where, `references unknown domain "${topic.domainId}"`)
  if (!ISO_DATE.test(topic.lastUpdated ?? '')) fail(where, 'missing or malformed lastUpdated')

  for (const ref of topic.indicatorRefs ?? []) {
    if (!indicatorKeys.has(`${ref.domainId}/${ref.indicatorId}`)) {
      fail(where, `indicatorRef "${ref.domainId}/${ref.indicatorId}" does not resolve`)
    }
  }

  const checkClaims = (claims, label) => {
    if (!Array.isArray(claims)) {
      fail(where, `${label} is missing`)
      return
    }
    claims.forEach((claim, i) => {
      const cWhere = `${where} ${label}[${i}]`
      if (!CLAIM_KINDS.has(claim.kind)) fail(cWhere, `invalid claim kind "${claim.kind}"`)
      if (!claim.text) fail(cWhere, 'claim has no text')
      // The core rule of the synthesis layer: no source, no claim.
      if (claim.kind === 'sourced') {
        if (!Array.isArray(claim.sources) || claim.sources.length === 0) {
          fail(cWhere, 'claim is marked "sourced" but carries no citation')
        } else {
          claim.sources.forEach((r, j) => checkRef(r, `${cWhere} source[${j}]`))
        }
      }
      if (claim.kind !== 'sourced' && claim.sources?.length) {
        warn(cWhere, `claim is "${claim.kind}" but carries citations — should it be "sourced"?`)
      }
    })
  }

  checkClaims(topic.whatIsHappening, 'whatIsHappening')
  checkClaims(topic.whyIsItHappening, 'whyIsItHappening')
  checkClaims(topic.opportunities, 'opportunities')
  checkClaims(topic.trend?.basis ?? [], 'trend.basis')

  if (!DIRECTIONS.has(topic.trend?.direction)) fail(where, `invalid trend direction "${topic.trend?.direction}"`)
  if (!CONFIDENCE.has(topic.trend?.confidence)) fail(where, `invalid trend confidence "${topic.trend?.confidence}"`)
  if (!topic.trend?.magnitude) fail(where, 'trend has no stated magnitude')

  if (!Array.isArray(topic.reading) || topic.reading.length === 0) {
    fail(where, 'has no reading list')
  }
  topic.reading?.forEach((item, i) => {
    checkRef({ sourceId: item.sourceId }, `${where} reading[${i}]`)
    if (!item.why) fail(`${where} reading[${i}]`, 'reading item does not say why it is on the list')
  })

  if (!Array.isArray(topic.questions) || topic.questions.length === 0) {
    fail(where, 'has no questions')
  }

  topic.risks?.forEach((risk, i) => {
    const rWhere = `${where} risks[${i}]`
    if (!CLAIM_KINDS.has(risk.kind)) fail(rWhere, `invalid kind "${risk.kind}"`)
    if (!risk.leadingIndicator) fail(rWhere, 'risk has no leading indicator')
    if (!risk.threshold) fail(rWhere, 'risk has no threshold')
    if (risk.kind === 'sourced' && !risk.sources?.length) {
      fail(rWhere, 'risk is marked "sourced" but carries no citation')
    }
    risk.sources?.forEach((r, j) => checkRef(r, `${rWhere} source[${j}]`))
  })
}

/* ---------------------------------------------------------------- */
/* Curriculum                                                        */
/* ---------------------------------------------------------------- */

const days = new Set()
const curriculumDomainIds = new Set([...domainIds, 'stewardship'])
for (const unit of curriculum.units) {
  const where = `curriculum day ${unit.day}`
  if (typeof unit.day !== 'number') fail(where, 'missing day number')
  if (days.has(unit.day)) fail(where, 'duplicate day')
  days.add(unit.day)
  if (!unit.title) fail(where, 'missing title')
  if (!unit.primer) fail(where, 'missing primer')
  if (!unit.reflection) fail(where, 'missing reflection prompt')
  if (![1, 2, 3].includes(unit.phase)) fail(where, `invalid phase "${unit.phase}"`)
  if (!curriculumDomainIds.has(unit.domainId)) fail(where, `unknown domain "${unit.domainId}"`)
  if (unit.topicId && !topicIds.has(unit.topicId)) fail(where, `unknown topic "${unit.topicId}"`)
  if (!Array.isArray(unit.reading) || unit.reading.length === 0) fail(where, 'has no reading')
  unit.reading?.forEach((r, i) => checkRef({ sourceId: r.sourceId }, `${where} reading[${i}]`))
  if (!Array.isArray(unit.questions) || unit.questions.length === 0) fail(where, 'has no questions')
}

for (let d = 1; d <= 90; d += 1) {
  if (!days.has(d)) warn('curriculum', `day ${d} is missing from the ninety day sequence`)
}

/* ---------------------------------------------------------------- */
/* Meta                                                              */
/* ---------------------------------------------------------------- */

if (!ISO_DATE.test(meta.dataAsOf ?? '')) fail('meta', 'missing or malformed dataAsOf')
for (const field of ['municipality', 'upperTier', 'province', 'privacyNote', 'neutralityNote']) {
  if (!meta[field]) fail('meta', `missing ${field}`)
}

/* ---------------------------------------------------------------- */
/* Report                                                            */
/* ---------------------------------------------------------------- */

const sourced = totalPoints - samplePoints
const pct = totalPoints ? ((sourced / totalPoints) * 100).toFixed(1) : '0.0'

console.log('')
console.log('North Glengarry Stewardship Dashboard — data validation')
console.log('------------------------------------------------------')
console.log(`Domains            ${domains.length}`)
console.log(`Indicators         ${indicatorKeys.size}`)
console.log(`Data points        ${totalPoints}  (${sourced} sourced, ${samplePoints} sample, ${pct}% transcribed)`)
console.log(`Detail tables      ${totalTables}  (${sampleTables} sample)`)
console.log(`Stewardship topics ${topicIds.size}`)
console.log(`Curriculum units   ${days.size}`)
console.log(`Source library     ${sourceIds.size}  (${sources.filter((s) => s.status === 'linked' || s.status === 'stored').length} linked or stored)`)
console.log('')

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`)
  for (const w of warnings.slice(0, 40)) console.log(`  · ${w}`)
  if (warnings.length > 40) console.log(`  · …and ${warnings.length - 40} more`)
  console.log('')
}

if (errors.length) {
  console.error(`FAILED with ${errors.length} error${errors.length === 1 ? '' : 's'}:`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  console.error('')
  process.exit(1)
}

if (samplePoints > 0 || sampleTables > 0) {
  console.log(
    `Passed. ${samplePoints} data points and ${sampleTables} tables are still placeholders ` +
      `and are marked SAMPLE in the interface.`,
  )
} else {
  console.log('Passed. Every figure in the dashboard is transcribed from a cited document.')
}
console.log('')

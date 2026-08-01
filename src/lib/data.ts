import type {
  Domain,
  Indicator,
  SiteMeta,
  Source,
  StewardshipTopic,
} from '../types'

import metaJson from '../data/meta.json'
import sourcesJson from '../data/sources.json'
import financialJson from '../data/domains/financial.json'
import infrastructureJson from '../data/domains/infrastructure.json'
import communityJson from '../data/domains/community.json'
import safetyJson from '../data/domains/safety.json'
import planningJson from '../data/domains/planning.json'
import councilJson from '../data/domains/council.json'
import stewardshipJson from '../data/stewardship.json'

/**
 * JSON imports are widened to string by TypeScript, so the union types in
 * types.ts cannot be inferred from the files. The validator in
 * scripts/validate-data.mjs is what actually enforces the shape; these casts
 * simply let the rest of the application work against the real types.
 */
export const meta = metaJson as SiteMeta
export const sources = sourcesJson as unknown as Source[]
export const stewardshipTopics = stewardshipJson as unknown as StewardshipTopic[]

/** Display order across the whole site. Matches the order in the requirements. */
export const domains = [
  financialJson,
  infrastructureJson,
  communityJson,
  safetyJson,
  planningJson,
  councilJson,
] as unknown as Domain[]

const domainById = new Map(domains.map((d) => [d.id, d]))
const domainBySlug = new Map(domains.map((d) => [d.slug, d]))
const sourceById = new Map(sources.map((s) => [s.id, s]))

export function getDomain(idOrSlug: string): Domain | undefined {
  return domainBySlug.get(idOrSlug) ?? domainById.get(idOrSlug)
}

export function getSource(id: string): Source | undefined {
  return sourceById.get(id)
}

export function getIndicator(domainId: string, indicatorId: string): Indicator | undefined {
  return domainById.get(domainId)?.indicators.find((i) => i.id === indicatorId)
}

export function getTopic(id: string): StewardshipTopic | undefined {
  return stewardshipTopics.find((t) => t.id === id)
}

export function topicsForDomain(domainId: string): StewardshipTopic[] {
  return stewardshipTopics.filter((t) => t.domainId === domainId)
}

/** Domain name for display, including the two virtual domains. */
export function domainLabel(domainId: string): string {
  if (domainId === 'stewardship') return 'Stewardship'
  return domainById.get(domainId)?.name ?? domainId
}

export function domainHref(domainId: string): string {
  if (domainId === 'stewardship') return '/stewardship'
  const d = domainById.get(domainId)
  return d ? `/domain/${d.slug}` : '/'
}

/** Every indicator flagged for the health overview, in domain order. */
export function headlineIndicators(): { domain: Domain; indicator: Indicator }[] {
  const out: { domain: Domain; indicator: Indicator }[] = []
  for (const domain of domains) {
    for (const indicator of domain.indicators) {
      if (indicator.headline) out.push({ domain, indicator })
    }
  }
  return out
}

/** Which sources a domain cites anywhere, including inside its tables. */
export function sourcesForDomain(domain: Domain): Source[] {
  const ids = new Set<string>(domain.sourceIds)
  for (const indicator of domain.indicators) {
    for (const point of indicator.series) ids.add(point.source.sourceId)
    if (indicator.target) ids.add(indicator.target.source.sourceId)
  }
  for (const table of domain.tables) ids.add(table.source.sourceId)
  // Preserve the curated reading order from sourceIds, then append the rest.
  const ordered: Source[] = []
  for (const id of domain.sourceIds) {
    const s = sourceById.get(id)
    if (s) {
      ordered.push(s)
      ids.delete(id)
    }
  }
  for (const id of ids) {
    const s = sourceById.get(id)
    if (s) ordered.push(s)
  }
  return ordered
}

/* ------------------------------------------------------------------ */
/* Data integrity                                                      */
/* ------------------------------------------------------------------ */

export interface SampleEntry {
  domainId: string
  domainName: string
  kind: 'indicator' | 'table' | 'target'
  id: string
  label: string
  points: number
}

/**
 * Everything still carrying placeholder figures. This is what the Data
 * Integrity page reports, and what has to reach zero before any figure in
 * the dashboard can be quoted.
 */
export function sampleInventory(): SampleEntry[] {
  const out: SampleEntry[] = []
  for (const domain of domains) {
    for (const indicator of domain.indicators) {
      const n = indicator.series.filter((p) => p.provenance === 'sample').length
      if (n > 0) {
        out.push({
          domainId: domain.id,
          domainName: domain.name,
          kind: 'indicator',
          id: indicator.id,
          label: indicator.name,
          points: n,
        })
      }
      if (indicator.target?.provenance === 'sample') {
        out.push({
          domainId: domain.id,
          domainName: domain.name,
          kind: 'target',
          id: `${indicator.id}-target`,
          label: `${indicator.name} — ${indicator.target.label}`,
          points: 1,
        })
      }
    }
    for (const table of domain.tables) {
      if (table.provenance === 'sample') {
        out.push({
          domainId: domain.id,
          domainName: domain.name,
          kind: 'table',
          id: table.id,
          label: table.title,
          points: table.rows.length,
        })
      }
    }
  }
  return out
}

export interface IntegrityTotals {
  seriesPoints: number
  samplePoints: number
  sourcedPoints: number
  sampleTables: number
  totalTables: number
  sourcesLinked: number
  sourcesTotal: number
}

export function integrityTotals(): IntegrityTotals {
  let seriesPoints = 0
  let samplePoints = 0
  let sampleTables = 0
  let totalTables = 0
  for (const domain of domains) {
    for (const indicator of domain.indicators) {
      for (const point of indicator.series) {
        seriesPoints += 1
        if (point.provenance === 'sample') samplePoints += 1
      }
    }
    for (const table of domain.tables) {
      totalTables += 1
      if (table.provenance === 'sample') sampleTables += 1
    }
  }
  const sourcesLinked = sources.filter(
    (s) => s.status === 'linked' || s.status === 'stored',
  ).length
  return {
    seriesPoints,
    samplePoints,
    sourcedPoints: seriesPoints - samplePoints,
    sampleTables,
    totalTables,
    sourcesLinked,
    sourcesTotal: sources.length,
  }
}

/** True when any figure anywhere is still a placeholder. Drives the banner. */
export function hasSampleData(): boolean {
  return integrityTotals().samplePoints > 0 || integrityTotals().sampleTables > 0
}

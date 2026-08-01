/**
 * Data model for the North Glengarry Stewardship Dashboard.
 *
 * Two rules are encoded in these types rather than left to discipline:
 *
 * 1. "Source or silence." Every figure that reaches the screen carries a
 *    SourceRef. There is no shape in this file that lets a number appear
 *    without one.
 * 2. "Uncertainty is displayed, not hidden." Every figure carries a
 *    `provenance`. Anything not yet transcribed from a real document is
 *    `sample` and is rendered as visibly provisional everywhere it appears.
 */

/** Which order of government owns the thing being described. */
export type Tier =
  | 'township' // Township of North Glengarry
  | 'county' // United Counties of Stormont, Dundas and Glengarry
  | 'shared' // split or jointly delivered; explain in `tierNote`
  | 'province' // Province of Ontario
  | 'federal'
  | 'other' // school boards, conservation authority, utilities, etc.

/**
 * Where a figure came from.
 *  - `sourced`  transcribed from the cited document and verified by a human.
 *  - `sample`   structurally valid placeholder shipped so the instrument is
 *               usable before transcription. Never presented as fact.
 */
export type Provenance = 'sourced' | 'sample'

export type Confidence = 'high' | 'medium' | 'low'

export type ValueFormat =
  | 'currency' // $1,234,567
  | 'currency2' // $1,234.56
  | 'number'
  | 'number1' // one decimal
  | 'percent' // 12.3 %
  | 'km'
  | 'years'
  | 'days'
  | 'ratio'
  | 'text'

/** Which way is "up" for a reader. Never used to grade anyone. */
export type Polarity = 'higher-is-favourable' | 'lower-is-favourable' | 'neutral'

export interface SourceRef {
  sourceId: string
  /** Page, section, schedule, or line reference inside the document. */
  locator?: string
  note?: string
}

export interface DataPoint {
  /** "2024", "2024-Q2", "2021-census". Sorted lexically, so keep it sortable. */
  period: string
  /** null means the source does not report this period. Rendered as a gap. */
  value: number | null
  source: SourceRef
  /** ISO date the figure was entered or last re-checked against the source. */
  recorded: string
  provenance: Provenance
  /** Source gives an estimate, not an actual. */
  estimated?: boolean
  /** Source covers only part of the period or population. */
  partial?: boolean
  note?: string
}

export interface Indicator {
  id: string
  name: string
  /** Short unit label shown beside the value, e.g. "$", "km", "%". */
  unit: string
  format: ValueFormat
  /** The geography this number actually describes. Never omitted. */
  geography: string
  tier: Tier
  tierNote?: string
  polarity: Polarity
  /** Promoted to the health overview at the top of the site. */
  headline?: boolean
  /** Plain-language statement of what this counts and what it excludes. */
  definition: string
  /** How the number is produced or assessed, when that matters to reading it. */
  methodology?: string
  series: DataPoint[]
  lastUpdated: string
  /** Stated level of service or council-adopted target, where one exists. */
  target?: {
    value: number
    label: string
    source: SourceRef
    provenance: Provenance
  }
}

export interface TableColumn {
  key: string
  label: string
  format?: ValueFormat
  align?: 'left' | 'right'
}

export interface DetailTable {
  id: string
  title: string
  description?: string
  geography?: string
  tier?: Tier
  columns: TableColumn[]
  rows: Record<string, string | number | null>[]
  source: SourceRef
  lastUpdated: string
  provenance: Provenance
  note?: string
}

export interface Domain {
  id: string
  slug: string
  name: string
  /** One descriptive line. No adjectives of approval or disapproval. */
  tagline: string
  /** Primer paragraphs: how this part of the municipality works. Editorial. */
  primer: string[]
  /** Which tier does what, for the two-tier split this domain touches. */
  tierSplit?: { item: string; owner: Tier; note?: string }[]
  indicators: Indicator[]
  tables: DetailTable[]
  /** Source library entries for this domain, in reading order. */
  sourceIds: string[]
  lastUpdated: string
  /** Known holes in this domain's data, shown to the reader. */
  gaps?: string[]
}

export type SourceStatus =
  | 'linked' // public URL known and recorded
  | 'stored' // copy held locally, no stable public URL
  | 'requested' // records request or staff request outstanding
  | 'unavailable' // known to exist, not obtained

export type SourceKind =
  | 'return' // statutory return, e.g. Financial Information Return
  | 'statement' // audited financial statements
  | 'budget'
  | 'bylaw'
  | 'plan' // asset management plan, official plan, strategic plan
  | 'report' // staff report, consultant study
  | 'agenda' // agenda, minutes
  | 'dataset'
  | 'census'
  | 'registry'
  | 'other'

export interface Source {
  id: string
  title: string
  publisher: string
  kind: SourceKind
  /** Publication or coverage year. Use a range like "2019-2024" if multi-year. */
  year: string
  tier?: Tier
  url?: string
  /** ISO date the URL was last confirmed to resolve. */
  retrieved?: string
  status: SourceStatus
  /** How often this source is reissued, so staleness is checkable. */
  cadence?: 'annual' | 'quarterly' | 'per-meeting' | 'per-census' | 'irregular' | 'one-time'
  notes?: string
}

/* ------------------------------------------------------------------ */
/* Stewardship layer                                                   */
/* ------------------------------------------------------------------ */

/**
 * Every claim in the stewardship layer declares what kind of claim it is.
 * The interface renders the three kinds differently and never merges them.
 */
export type ClaimKind =
  | 'sourced' // taken from the record, citation required
  | 'interpretation' // the analyst's reading, marked as such
  | 'open-question' // no source found; shown as a hole, not an answer

export interface Claim {
  kind: ClaimKind
  text: string
  /** Required when kind is 'sourced'. Rejected by the validator otherwise. */
  sources?: SourceRef[]
}

export interface TrendAssessment {
  /** Direction of travel over the window, in neutral terms. */
  direction: 'improving' | 'declining' | 'flat' | 'mixed' | 'unknown'
  /** Plain-language magnitude, e.g. "down 18 percent over five years". */
  magnitude: string
  confidence: Confidence
  basis: Claim[]
}

export interface ReadingItem {
  sourceId: string
  locator?: string
  /** Why this document, and what to look for in it. */
  why: string
}

export interface StewardshipTopic {
  id: string
  title: string
  domainId: string
  /** Indicators elsewhere in the dashboard that this topic explains. */
  indicatorRefs?: { domainId: string; indicatorId: string }[]
  whatIsHappening: Claim[]
  whyIsItHappening: Claim[]
  trend: TrendAssessment
  reading: ReadingItem[]
  /** Questions framed to be asked of staff in good faith. */
  questions: string[]
  opportunities: Claim[]
  risks: { text: string; leadingIndicator: string; threshold: string; kind: ClaimKind; sources?: SourceRef[] }[]
  lastUpdated: string
}

/* ------------------------------------------------------------------ */
/* Study mode                                                          */
/* ------------------------------------------------------------------ */

export interface CurriculumUnit {
  day: number
  week: number
  phase: 1 | 2 | 3
  domainId: string
  topicId?: string
  title: string
  /** Two or three sentences to orient the day. */
  primer: string
  reading: ReadingItem[]
  questions: string[]
  reflection: string
}

export interface Curriculum {
  title: string
  note: string
  units: CurriculumUnit[]
}

/* ------------------------------------------------------------------ */
/* Site meta                                                           */
/* ------------------------------------------------------------------ */

export interface SiteMeta {
  municipality: string
  upperTier: string
  province: string
  version: string
  /** ISO date of the last data edit anywhere in the repository. */
  dataAsOf: string
  privacyNote: string
  neutralityNote: string
  sampleDataNote: string
  openQuestions: string[]
}

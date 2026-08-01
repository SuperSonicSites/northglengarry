import type { Provenance, SourceStatus, Tier } from '../types'
import { TIER_FULL, TIER_LABEL, daysSince, formatDate } from '../lib/format'

export function TierBadge({ tier, note }: { tier: Tier; note?: string }) {
  return (
    <span
      className={`badge tier tier-${tier}`}
      title={note ? `${TIER_FULL[tier]}. ${note}` : TIER_FULL[tier]}
    >
      {TIER_LABEL[tier]}
    </span>
  )
}

/**
 * The placeholder marker. It appears on every panel carrying an untranscribed
 * figure, without exception — a figure that is not sourced must never look
 * like one that is.
 */
export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  if (provenance === 'sourced') return null
  return (
    <span
      className="badge sample"
      title="Placeholder figure. Structurally valid, not transcribed from the cited document, and not to be quoted. Counted on the Data Integrity page."
    >
      Sample
    </span>
  )
}

export function FlagBadge({ kind }: { kind: 'estimated' | 'partial' }) {
  if (kind === 'estimated') {
    return (
      <span className="badge flag" title="The source gives an estimate, or the figure is interpolated between reported periods.">
        Estimated
      </span>
    )
  }
  return (
    <span className="badge flag" title="The source covers only part of the period or part of the population.">
      Partial
    </span>
  )
}

const STATUS_LABEL: Record<SourceStatus, string> = {
  linked: 'Linked',
  stored: 'Stored copy',
  requested: 'Requested',
  unavailable: 'Not obtained',
}

const STATUS_HELP: Record<SourceStatus, string> = {
  linked: 'A public URL for this document has been recorded and confirmed to resolve.',
  stored: 'A copy is held locally. No stable public URL is known.',
  requested: 'Identified but not yet obtained. Records request or staff request outstanding.',
  unavailable: 'Known to exist and not obtained. May not be published.',
}

export function StatusBadge({ status }: { status: SourceStatus }) {
  return (
    <span className={`badge status status-${status}`} title={STATUS_HELP[status]}>
      {STATUS_LABEL[status]}
    </span>
  )
}

/**
 * Every panel carries this. Where a panel is more than a year old it says so
 * explicitly rather than leaving the reader to do the arithmetic.
 */
export function LastUpdated({ date, label = 'Last updated' }: { date: string; label?: string }) {
  const age = daysSince(date)
  const stale = age !== null && age > 365
  return (
    <span className={stale ? 'updated stale' : 'updated'}>
      {label} {formatDate(date)}
      {stale ? ` · over a year old` : ''}
    </span>
  )
}

export function Geography({ children }: { children: string }) {
  return (
    <span className="geography" title="The geography this figure actually describes.">
      {children}
    </span>
  )
}

import { Link } from 'react-router-dom'
import type { SourceRef } from '../types'
import { getSource } from '../lib/data'

/**
 * One click from a figure to its entry in the source library, which carries
 * the link or stored copy. Where a source id does not resolve, that is shown
 * as a fault rather than rendered as a working citation.
 */
export function SourceLink({ refr, compact = false }: { refr: SourceRef; compact?: boolean }) {
  const source = getSource(refr.sourceId)
  if (!source) {
    return (
      <span className="cite cite-missing" title="This citation points at a source id that is not in the source library.">
        Unknown source: {refr.sourceId}
      </span>
    )
  }
  const label = compact ? shortTitle(source.title) : source.title
  return (
    <Link
      className="cite"
      to={`/sources#${source.id}`}
      title={`${source.title} — ${source.publisher}${refr.locator ? `, ${refr.locator}` : ''}`}
    >
      {label}
      {refr.locator ? <span className="cite-locator"> · {refr.locator}</span> : null}
    </Link>
  )
}

export function SourceList({ refs }: { refs: SourceRef[] }) {
  if (refs.length === 0) return null
  return (
    <span className="cite-list">
      {refs.map((r, i) => (
        <span key={`${r.sourceId}-${i}`}>
          {i > 0 ? '; ' : ''}
          <SourceLink refr={r} compact />
        </span>
      ))}
    </span>
  )
}

function shortTitle(title: string): string {
  const cut = title.indexOf(',')
  const head = cut > 12 ? title.slice(0, cut) : title
  return head.length > 62 ? `${head.slice(0, 60)}…` : head
}

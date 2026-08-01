import type { Claim } from '../types'
import { SourceList } from './SourceLink'

/**
 * The hard separation the requirements demand. A sourced claim, an
 * interpretation, and an open question are three different kinds of statement
 * and are never rendered alike. An interpretation without this marking would
 * read as record; an open question without it would read as an answer.
 */
export function ClaimBlock({ claim }: { claim: Claim }) {
  if (claim.kind === 'sourced') {
    return (
      <li className="claim claim-sourced">
        <span className="claim-kind">From the record</span>
        <p>{claim.text}</p>
        {claim.sources && claim.sources.length > 0 ? (
          <p className="claim-cites">
            <SourceList refs={claim.sources} />
          </p>
        ) : (
          <p className="claim-cites claim-fault">
            No citation attached. A sourced claim without a source is a fault in the data, not a
            finding.
          </p>
        )}
      </li>
    )
  }

  if (claim.kind === 'interpretation') {
    return (
      <li className="claim claim-interpretation">
        <span className="claim-kind">Interpretation</span>
        <p>{claim.text}</p>
        <p className="claim-cites">
          Analysis, not record. Not attributable to any source document.
        </p>
      </li>
    )
  }

  return (
    <li className="claim claim-open">
      <span className="claim-kind">Open question</span>
      <p>{claim.text}</p>
      <p className="claim-cites">No source located. Shown as a hole, not as an answer.</p>
    </li>
  )
}

export function ClaimList({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) {
    return <p className="empty">Nothing recorded here yet.</p>
  }
  return (
    <ul className="claim-list">
      {claims.map((c, i) => (
        <ClaimBlock key={i} claim={c} />
      ))}
    </ul>
  )
}

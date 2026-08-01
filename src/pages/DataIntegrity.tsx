import { Link } from 'react-router-dom'
import { domains, integrityTotals, meta, sampleInventory, sources } from '../lib/data'
import { daysSince, formatDate } from '../lib/format'
import { StatusBadge } from '../components/Badges'

/**
 * The page that makes the dashboard's own honesty checkable. Success criterion
 * three is zero unsourced figures in the interface; this is where that is
 * counted rather than asserted.
 */
export function DataIntegrity() {
  const totals = integrityTotals()
  const inventory = sampleInventory()
  const outstanding = sources.filter((s) => s.status === 'requested' || s.status === 'unavailable')
  const unconfirmed = sources.filter((s) => s.url && !s.retrieved)

  const stalePanels: { domain: string; label: string; date: string; days: number }[] = []
  for (const domain of domains) {
    for (const indicator of domain.indicators) {
      const age = daysSince(indicator.lastUpdated)
      if (age !== null && age > 365) {
        stalePanels.push({
          domain: domain.name,
          label: indicator.name,
          date: indicator.lastUpdated,
          days: age,
        })
      }
    }
    for (const table of domain.tables) {
      const age = daysSince(table.lastUpdated)
      if (age !== null && age > 365) {
        stalePanels.push({
          domain: domain.name,
          label: table.title,
          date: table.lastUpdated,
          days: age,
        })
      }
    }
  }

  const byDomain = new Map<string, typeof inventory>()
  for (const entry of inventory) {
    byDomain.set(entry.domainName, [...(byDomain.get(entry.domainName) ?? []), entry])
  }

  const pct = totals.seriesPoints
    ? ((totals.sourcedPoints / totals.seriesPoints) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="page">
      <header className="page-head">
        <h1>Data integrity</h1>
        <p className="lede">{meta.sampleDataNote}</p>
      </header>

      <section className="block">
        <div className="summary-strip">
          <div>
            <span className="summary-num">{totals.samplePoints}</span>
            <span className="summary-lab">placeholder data points</span>
          </div>
          <div>
            <span className="summary-num">{totals.sampleTables}</span>
            <span className="summary-lab">
              placeholder tables, of {totals.totalTables}
            </span>
          </div>
          <div>
            <span className="summary-num">{pct}%</span>
            <span className="summary-lab">of data points transcribed from a source</span>
          </div>
          <div>
            <span className="summary-num">{unconfirmed.length}</span>
            <span className="summary-lab">URLs recorded but not confirmed</span>
          </div>
          <div>
            <span className="summary-num">{outstanding.length}</span>
            <span className="summary-lab">documents not yet obtained</span>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>How to replace a placeholder</h2>
        <ol className="how-to">
          <li>
            Open the domain's file under <code>src/data/domains/</code>, or{' '}
            <code>src/data/stewardship.json</code> for a stewardship entry.
          </li>
          <li>
            Replace the <code>value</code> with the figure from the document, and set{' '}
            <code>source.locator</code> to the page, schedule, or table it came from.
          </li>
          <li>
            Set <code>recorded</code> to the date you entered it, and{' '}
            <code>provenance</code> to <code>"sourced"</code>.
          </li>
          <li>
            Add <code>estimated: true</code> if the source states an estimate, or{' '}
            <code>partial: true</code> if it covers only part of the period or population.
          </li>
          <li>
            Run <code>npm run validate</code>. The build fails if a figure has no source, if a
            citation points at a document not in the library, or if a sourced stewardship claim
            carries no citation.
          </li>
        </ol>
        <p className="caveat">
          The verification pass named in the risk register is a separate step from transcription.
          Enter the figure, then re-check it against the document before flipping it to{' '}
          <code>sourced</code>. Transcription error from PDFs is the most likely way a wrong number
          reaches this dashboard.
        </p>
      </section>

      <section className="block">
        <h2>Outstanding placeholders</h2>
        {inventory.length === 0 ? (
          <p className="empty">
            None. Every figure in the dashboard is transcribed from a cited document.
          </p>
        ) : (
          [...byDomain.entries()].map(([domainName, entries]) => (
            <div key={domainName} className="integrity-group">
              <h3>{domainName}</h3>
              <table className="integrity-table">
                <thead>
                  <tr>
                    <th className="left">Item</th>
                    <th className="left">Kind</th>
                    <th className="right">Placeholder values</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={`${e.kind}-${e.id}`}>
                      <td className="left">{e.label}</td>
                      <td className="left">{e.kind}</td>
                      <td className="right">{e.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </section>

      <section className="block">
        <h2>URLs recorded but not confirmed</h2>
        <p className="definition">
          These documents carry a URL located through a public search index. None has been opened:
          outbound fetching was blocked in the environment this build was assembled in. A URL that
          has not been retrieved is a lead, not a citation. Confirm each resolves to the document
          described, capture a stored copy, and set <code>retrieved</code> to that date.
        </p>
        {unconfirmed.length === 0 ? (
          <p className="empty">None. Every recorded URL has a retrieval date.</p>
        ) : (
          <ul className="source-list">
            {unconfirmed.map((s) => (
              <li key={s.id}>
                <Link to={`/sources#${s.id}`}>{s.title}</Link>
                <span className="source-meta">{s.publisher}</span>
                <span className="unconfirmed">Not confirmed</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block">
        <h2>Documents not yet obtained</h2>
        <p className="definition">
          Every figure above depends on one of these. The source inventory audit is the work that
          unblocks the rest.
        </p>
        <ul className="source-list">
          {outstanding.map((s) => (
            <li key={s.id}>
              <Link to={`/sources#${s.id}`}>{s.title}</Link>
              <span className="source-meta">
                {s.publisher} · {s.year}
              </span>
              <StatusBadge status={s.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2>Panels older than a year</h2>
        {stalePanels.length === 0 ? (
          <p className="empty">
            No panel carries a last-updated date more than a year old, measured against the
            dashboard's data-as-at date of {formatDate(meta.dataAsOf)}.
          </p>
        ) : (
          <ul className="stale-list">
            {stalePanels.map((p, i) => (
              <li key={i}>
                <strong>{p.label}</strong> <span className="source-meta">{p.domain}</span> · last
                updated {formatDate(p.date)} · {p.days} days
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { domains, sources } from '../lib/data'
import { StatusBadge, TierBadge } from '../components/Badges'
import type { Source, SourceKind } from '../types'

const KIND_LABEL: Record<SourceKind, string> = {
  return: 'Statutory return',
  statement: 'Financial statements',
  budget: 'Budget',
  bylaw: 'By-law',
  plan: 'Plan',
  report: 'Report or study',
  agenda: 'Agenda and minutes',
  dataset: 'Dataset',
  census: 'Census',
  registry: 'Registry',
  other: 'Other',
}

/**
 * The requirements are explicit that this page outlives the rest: if the data
 * files disappear tomorrow, the source library alone should still be worth
 * keeping. It is therefore a first-class page, not an appendix.
 */
export function Sources() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('all')

  const usedBy = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const domain of domains) {
      const ids = new Set<string>(domain.sourceIds)
      for (const indicator of domain.indicators) {
        for (const point of indicator.series) ids.add(point.source.sourceId)
      }
      for (const table of domain.tables) ids.add(table.source.sourceId)
      for (const id of ids) {
        map.set(id, [...(map.get(id) ?? []), domain.name])
      }
    }
    return map
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sources.filter((s) => {
      if (status !== 'all' && s.status !== status) return false
      if (!q) return true
      return (
        s.title.toLowerCase().includes(q) ||
        s.publisher.toLowerCase().includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q)
      )
    })
  }, [query, status])

  const counts = useMemo(() => {
    const c = { linked: 0, stored: 0, requested: 0, unavailable: 0 }
    for (const s of sources) c[s.status] += 1
    return c
  }, [])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Source library</h1>
        <p className="lede">
          Every document this dashboard references, whether or not a figure has yet been taken from
          it. This library is the durable asset: if the data files were lost tomorrow, this page
          would still be worth keeping, because it records what exists, who publishes it, how often
          it is reissued, and what to read it for.
        </p>
      </header>

      <section className="block">
        <div className="summary-strip">
          <div>
            <span className="summary-num">{sources.length}</span>
            <span className="summary-lab">documents identified</span>
          </div>
          <div>
            <span className="summary-num">{counts.linked + counts.stored}</span>
            <span className="summary-lab">linked or stored</span>
          </div>
          <div>
            <span className="summary-num">{counts.requested}</span>
            <span className="summary-lab">requested, outstanding</span>
          </div>
          <div>
            <span className="summary-num">{counts.unavailable}</span>
            <span className="summary-lab">known but not obtained</span>
          </div>
        </div>
        <p className="caveat">
          {counts.linked + counts.stored} documents now carry a URL. Those URLs were located
          through a public search index and have <strong>not been confirmed by retrieving them</strong>{' '}
          — outbound fetching is blocked in the environment this build was assembled in, so no
          link here has been opened and no document has been read. Every unconfirmed entry is
          marked below. Confirming them, and recording the date each was retrieved, is the first
          half of the source inventory audit; the second half is capturing a stored copy, because
          municipal file URLs move whenever the site is reorganised.
        </p>
      </section>

      <section className="block">
        <div className="filter-row">
          <h2>Documents</h2>
          <div className="filters">
            <input
              type="search"
              value={query}
              placeholder="Search title, publisher, notes"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search the source library"
            />
            {['all', 'linked', 'stored', 'requested', 'unavailable'].map((s) => (
              <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        <ul className="source-library">
          {filtered.map((s) => (
            <SourceEntry key={s.id} source={s} usedBy={usedBy.get(s.id) ?? []} />
          ))}
        </ul>
        {filtered.length === 0 ? <p className="empty">No documents match that filter.</p> : null}
      </section>
    </div>
  )
}

function SourceEntry({ source, usedBy }: { source: Source; usedBy: string[] }) {
  return (
    <li className="source-entry" id={source.id}>
      <div className="source-entry-head">
        <h3>{source.title}</h3>
        <div className="badge-row">
          <StatusBadge status={source.status} />
          {source.tier ? <TierBadge tier={source.tier} /> : null}
        </div>
      </div>
      <div className="source-entry-meta">
        <span>{source.publisher}</span>
        <span>{KIND_LABEL[source.kind]}</span>
        <span>{source.year}</span>
        {source.cadence ? <span>Reissued: {source.cadence}</span> : null}
      </div>
      {source.url ? (
        <p className="source-url">
          <a href={source.url} target="_blank" rel="noreferrer noopener">
            {source.url}
          </a>
          {source.retrieved ? (
            <span className="source-meta"> · retrieved {source.retrieved}</span>
          ) : (
            <span
              className="unconfirmed"
              title="This URL was located through a search index and has not been opened. Confirm it resolves to the document described, then record the retrieval date."
            >
              Not confirmed by retrieval
            </span>
          )}
        </p>
      ) : (
        <p className="source-url source-url-missing">
          No URL or stored copy recorded. Outstanding item in the source inventory audit.
        </p>
      )}
      {source.notes ? <p className="source-notes">{source.notes}</p> : null}
      {usedBy.length > 0 ? (
        <p className="source-usedby">
          Cited in: {[...new Set(usedBy)].join(', ')}
        </p>
      ) : (
        <p className="source-usedby">Not yet cited by any figure in the dashboard.</p>
      )}
    </li>
  )
}

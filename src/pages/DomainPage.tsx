import { Link, useParams } from 'react-router-dom'
import { getDomain, sourcesForDomain, topicsForDomain } from '../lib/data'
import { IndicatorCard } from '../components/IndicatorCard'
import { DataTable } from '../components/DataTable'
import { LastUpdated, StatusBadge, TierBadge } from '../components/Badges'
import { TIER_FULL } from '../lib/format'

export function DomainPage() {
  const { slug } = useParams()
  const domain = slug ? getDomain(slug) : undefined

  if (!domain) {
    return (
      <div className="page">
        <h1>Domain not found</h1>
        <p>
          <Link to="/">Return to the health overview</Link>.
        </p>
      </div>
    )
  }

  const topics = topicsForDomain(domain.id)
  const sources = sourcesForDomain(domain)

  return (
    <div className="page">
      <header className="page-head">
        <h1>{domain.name}</h1>
        <p className="lede">{domain.tagline}</p>
        <LastUpdated date={domain.lastUpdated} label="Domain last updated" />
      </header>

      {/* 1. Primer. Every domain opens by explaining how this part of the
          municipality works, before any figure appears. */}
      <section className="block primer">
        <h2>Primer</h2>
        <p className="editorial-mark">
          Explanatory background written for this dashboard. It describes how the system works
          rather than reporting figures, and is not attributed to a source document.
        </p>
        {domain.primer.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      {domain.tierSplit && domain.tierSplit.length > 0 ? (
        <section className="block">
          <h2>Who owns what</h2>
          <p className="definition">
            North Glengarry is a lower-tier municipality. Where responsibility for an item sits
            determines who can change it, and residents experience the two tiers as one government.
          </p>
          <div className="tier-split">
            {domain.tierSplit.map((row, i) => (
              <div key={i} className="tier-row">
                <div className="tier-item">{row.item}</div>
                <div>
                  <TierBadge tier={row.owner} note={row.note} />
                </div>
                <div className="tier-note">{row.note ?? TIER_FULL[row.owner]}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 2. Headline indicators with five-year trend charts. */}
      <section className="block">
        <h2>Indicators</h2>
        <p className="definition">
          Charts default to a five-year window. Series recorded per census are shown across all
          available cycles, since five calendar years would leave a single point.
        </p>
        <div className="indicator-list">
          {domain.indicators.map((indicator) => (
            <IndicatorCard key={indicator.id} indicator={indicator} />
          ))}
        </div>
      </section>

      {/* 3. Detail tables. */}
      {domain.tables.length > 0 ? (
        <section className="block">
          <h2>Detail</h2>
          <div className="table-list">
            {domain.tables.map((table) => (
              <DataTable key={table.id} table={table} />
            ))}
          </div>
        </section>
      ) : null}

      {domain.gaps && domain.gaps.length > 0 ? (
        <section className="block gaps">
          <h2>Known gaps in this domain</h2>
          <p className="definition">
            Stated so that an absence reads as an absence. Nothing below is estimated to fill the
            hole.
          </p>
          <ul>
            {domain.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section className="block">
          <h2>Stewardship topics in this domain</h2>
          <ul className="topic-links">
            {topics.map((t) => (
              <li key={t.id}>
                <Link to={`/stewardship/${t.id}`}>{t.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4. Source library for this domain. */}
      <section className="block">
        <h2>Sources for this domain</h2>
        <p className="definition">
          In reading order. Each entry links to its full record in the source library.
        </p>
        <ul className="source-list">
          {sources.map((s) => (
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
    </div>
  )
}

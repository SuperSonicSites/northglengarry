import type { Domain, Indicator } from '../types'
import { formatValue } from '../lib/format'
import { describeTrend, summarise, windowedSeries } from '../lib/trend'
import { FlagBadge, Geography, LastUpdated, ProvenanceBadge, TierBadge } from './Badges'
import { SourceLink } from './SourceLink'
import { TrendChart } from './TrendChart'

/**
 * The full panel: value, window, trend, chart, definition, geography, tier,
 * source, and last-updated. Everything the requirements say a displayed data
 * point must carry travels with the number rather than living in a legend.
 */
export function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const series = windowedSeries(indicator)
  const trend = summarise(indicator)
  const latest = trend.last

  return (
    <section className="panel indicator" id={indicator.id}>
      <header className="panel-head">
        <div>
          <h3>{indicator.name}</h3>
          <div className="badge-row">
            <TierBadge tier={indicator.tier} note={indicator.tierNote} />
            {/* Any placeholder anywhere in the window taints the whole series,
                not just the latest point — a chart drawn partly from real
                figures and partly from invented ones is still not a trend. */}
            <ProvenanceBadge provenance={trend.anySample ? 'sample' : 'sourced'} />
            {trend.anyEstimated ? <FlagBadge kind="estimated" /> : null}
            {trend.anyPartial ? <FlagBadge kind="partial" /> : null}
          </div>
        </div>
        <div className="value-block">
          <div className="value">{formatValue(latest?.value ?? null, indicator.format)}</div>
          <div className="value-period">{latest ? latest.period : '—'}</div>
        </div>
      </header>

      <p className={`trend trend-${trend.reading}`}>{describeTrend(trend)}</p>

      <TrendChart indicator={indicator} series={series} />

      <p className="definition">{indicator.definition}</p>
      {indicator.methodology ? (
        <p className="methodology">
          <span className="label">Methodology.</span> {indicator.methodology}
        </p>
      ) : null}
      {indicator.tierNote ? (
        <p className="methodology">
          <span className="label">Tier.</span> {indicator.tierNote}
        </p>
      ) : null}

      <footer className="panel-foot">
        <Geography>{indicator.geography}</Geography>
        {latest ? (
          <span className="source-line">
            Source: <SourceLink refr={latest.source} compact />
          </span>
        ) : null}
        <LastUpdated date={indicator.lastUpdated} />
      </footer>
    </section>
  )
}

/** Compact tile used on the health overview. Links into its domain view. */
export function IndicatorTile({
  domain,
  indicator,
}: {
  domain: Domain
  indicator: Indicator
}) {
  const trend = summarise(indicator)
  const latest = trend.last
  const arrow =
    trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : trend.direction === 'flat' ? '▬' : '·'

  return (
    <a className="tile" href={`/domain/${domain.slug}#${indicator.id}`}>
      <div className="tile-domain">{domain.name}</div>
      <div className="tile-name">{indicator.name}</div>
      <div className="tile-value">{formatValue(latest?.value ?? null, indicator.format)}</div>
      <div className={`tile-trend trend-${trend.reading}`}>
        <span className="arrow">{arrow}</span>{' '}
        {trend.percent === null
          ? 'no direction'
          : `${Math.abs(trend.percent).toFixed(1)}% · ${trend.windowLabel}`}
      </div>
      <div className="tile-foot">
        <TierBadge tier={indicator.tier} note={indicator.tierNote} />
        <ProvenanceBadge provenance={trend.anySample ? 'sample' : 'sourced'} />
        {trend.anyEstimated ? <FlagBadge kind="estimated" /> : null}
      </div>
      <div className="tile-period">{latest ? `As at ${latest.period}` : 'No value'}</div>
    </a>
  )
}

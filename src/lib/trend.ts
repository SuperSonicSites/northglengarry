import type { DataPoint, Indicator } from '../types'

export interface TrendSummary {
  first: DataPoint | null
  last: DataPoint | null
  /** Absolute change across the window. Null when either end is missing. */
  change: number | null
  /** Percentage change across the window. Null when the base is zero. */
  percent: number | null
  /** Direction of movement only. Says nothing about whether it is welcome. */
  direction: 'up' | 'down' | 'flat' | 'unknown'
  /** Whether the movement runs with or against the indicator's polarity. */
  reading: 'favourable' | 'unfavourable' | 'neutral' | 'unknown'
  /** Any point in the window carrying an uncertainty flag. */
  anyEstimated: boolean
  anyPartial: boolean
  anySample: boolean
  windowLabel: string
}

/** Points with a value, oldest first. */
function usable(series: DataPoint[]): DataPoint[] {
  return [...series]
    .filter((p) => p.value !== null)
    .sort((a, b) => a.period.localeCompare(b.period))
}

/**
 * The default window is five years, as required. Series recorded per census
 * are longer-spaced and are shown in full rather than truncated to five
 * calendar years, which would leave a single point.
 */
export function windowedSeries(indicator: Indicator, years = 5): DataPoint[] {
  const sorted = [...indicator.series].sort((a, b) => a.period.localeCompare(b.period))
  if (sorted.length === 0) return []
  const spans = sorted.map((p) => Number(p.period.slice(0, 4)))
  const spread = Math.max(...spans) - Math.min(...spans)
  // Census-cadence series (wide spread, few points) are shown whole.
  if (sorted.length <= 4 && spread > years) return sorted
  const latest = Math.max(...spans)
  return sorted.filter((p) => Number(p.period.slice(0, 4)) > latest - years)
}

export function summarise(indicator: Indicator, years = 5): TrendSummary {
  const window = windowedSeries(indicator, years)
  const points = usable(window)
  const first = points[0] ?? null
  const last = points[points.length - 1] ?? null

  let change: number | null = null
  let percent: number | null = null
  let direction: TrendSummary['direction'] = 'unknown'

  if (first && last && first !== last && first.value !== null && last.value !== null) {
    change = last.value - first.value
    percent = first.value !== 0 ? (change / Math.abs(first.value)) * 100 : null
    // Movement under half a percent across the window reads as flat.
    if (percent !== null && Math.abs(percent) < 0.5) direction = 'flat'
    else if (change > 0) direction = 'up'
    else if (change < 0) direction = 'down'
    else direction = 'flat'
  } else if (points.length === 1) {
    direction = 'unknown'
  }

  let reading: TrendSummary['reading'] = 'neutral'
  if (indicator.polarity === 'neutral' || direction === 'flat') reading = 'neutral'
  else if (direction === 'unknown') reading = 'unknown'
  else if (indicator.polarity === 'higher-is-favourable') {
    reading = direction === 'up' ? 'favourable' : 'unfavourable'
  } else if (indicator.polarity === 'lower-is-favourable') {
    reading = direction === 'down' ? 'favourable' : 'unfavourable'
  }

  const windowLabel =
    first && last && first.period !== last.period
      ? `${first.period} to ${last.period}`
      : (last?.period ?? '—')

  return {
    first,
    last,
    change,
    percent,
    direction,
    reading,
    anyEstimated: window.some((p) => p.estimated),
    anyPartial: window.some((p) => p.partial),
    anySample: window.some((p) => p.provenance === 'sample'),
    windowLabel,
  }
}

/** Neutral one-line description of movement. No judgement words. */
export function describeTrend(summary: TrendSummary, unitNoun = ''): string {
  if (summary.direction === 'unknown' || summary.percent === null) {
    return 'Not enough points in the window to state a direction.'
  }
  const magnitude = `${Math.abs(summary.percent).toFixed(1)} percent`
  const noun = unitNoun ? ` ${unitNoun}` : ''
  if (summary.direction === 'flat') {
    return `Effectively unchanged${noun} over ${summary.windowLabel}.`
  }
  const word = summary.direction === 'up' ? 'Up' : 'Down'
  return `${word} ${magnitude}${noun} over ${summary.windowLabel}.`
}

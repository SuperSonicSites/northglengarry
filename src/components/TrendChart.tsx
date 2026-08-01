import type { DataPoint, Indicator } from '../types'
import { compact, formatValue } from '../lib/format'

const W = 560
const H = 190
const PAD = { top: 18, right: 16, bottom: 26, left: 56 }

/**
 * Hand-drawn SVG rather than a charting library, because the requirements
 * demand things a general-purpose chart does not express: a segment between
 * two estimated points must look different from a segment between two
 * reported ones, a missing period must read as a gap rather than as a
 * straight line through it, and a whole series of placeholder figures must be
 * visibly provisional.
 */
export function TrendChart({
  indicator,
  series,
}: {
  indicator: Indicator
  series: DataPoint[]
}) {
  const points = series.filter((p) => p.value !== null)
  if (points.length === 0) {
    return <p className="chart-empty">No values recorded in this window.</p>
  }

  const allSample = points.every((p) => p.provenance === 'sample')
  const values = points.map((p) => p.value as number)
  if (indicator.target) values.push(indicator.target.value)

  let min = Math.min(...values)
  let max = Math.max(...values)
  // Never anchor at zero automatically — a zero-based axis on a series that
  // moves within a narrow band hides the movement the chart exists to show.
  // Instead pad the observed range, and include zero only when it is close.
  const span = max - min || Math.abs(max) || 1
  min -= span * 0.15
  max += span * 0.15
  if (min > 0 && min < span * 0.4) min = 0

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const n = series.length

  const x = (index: number) => PAD.left + (n === 1 ? innerW / 2 : (index / (n - 1)) * innerW)
  const y = (value: number) => PAD.top + innerH - ((value - min) / (max - min)) * innerH

  // Segments are built pairwise so a null breaks the line and an estimated
  // endpoint dashes it.
  const segments: { d: string; dashed: boolean }[] = []
  for (let i = 0; i < series.length - 1; i += 1) {
    const a = series[i]
    const b = series[i + 1]
    if (a.value === null || b.value === null) continue
    segments.push({
      d: `M ${x(i)} ${y(a.value)} L ${x(i + 1)} ${y(b.value)}`,
      dashed: Boolean(a.estimated || b.estimated),
    })
  }

  const gridValues = [min, min + (max - min) / 2, max]

  return (
    <figure className={allSample ? 'chart chart-sample' : 'chart'}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${indicator.name}, ${series[0]?.period} to ${series[n - 1]?.period}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {gridValues.map((v, i) => (
          <g key={i}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
              {compact(v, indicator.format)}
            </text>
          </g>
        ))}

        {indicator.target ? (
          <g>
            <line
              className="target"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(indicator.target.value)}
              y2={y(indicator.target.value)}
            />
            <text
              className="target-label"
              x={W - PAD.right}
              y={y(indicator.target.value) - 5}
              textAnchor="end"
            >
              {indicator.target.label}
            </text>
          </g>
        ) : null}

        {segments.map((s, i) => (
          <path key={i} className={s.dashed ? 'line line-estimated' : 'line'} d={s.d} />
        ))}

        {series.map((p, i) =>
          p.value === null ? (
            <g key={p.period}>
              <text className="axis gap-mark" x={x(i)} y={PAD.top + innerH / 2} textAnchor="middle">
                no data
              </text>
            </g>
          ) : (
            <circle
              key={p.period}
              className={p.estimated || p.partial ? 'dot dot-flagged' : 'dot'}
              cx={x(i)}
              cy={y(p.value)}
              r={4}
            >
              <title>
                {`${p.period}: ${formatValue(p.value, indicator.format)}`}
                {p.estimated ? ' · estimated' : ''}
                {p.partial ? ' · partial' : ''}
                {p.provenance === 'sample' ? ' · SAMPLE, not transcribed' : ''}
                {p.note ? ` · ${p.note}` : ''}
              </title>
            </circle>
          ),
        )}

        {series.map((p, i) => (
          <text
            key={`lab-${p.period}`}
            className="axis"
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {p.period}
          </text>
        ))}
      </svg>
      {allSample ? <figcaption className="chart-watermark">Sample figures</figcaption> : null}
    </figure>
  )
}

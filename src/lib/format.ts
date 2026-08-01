import type { Tier, ValueFormat } from '../types'

const CAD0 = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
})
const CAD2 = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const NUM = new Intl.NumberFormat('en-CA')
const NUM1 = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Compact form for chart axes and tiles, where the full figure will not fit. */
export function compact(value: number, format: ValueFormat): string {
  const abs = Math.abs(value)
  if (format === 'currency' || format === 'currency2') {
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    // One decimal rather than a rounded thousand: a series that moves inside a
    // narrow band would otherwise print the same axis label two or three times.
    if (abs >= 10_000) return `$${(value / 1000).toFixed(1)}k`
    return CAD0.format(value)
  }
  if (format === 'percent') return `${NUM1.format(value)}%`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `${(value / 1000).toFixed(1)}k`
  return NUM.format(value)
}

export function formatValue(value: number | null, format: ValueFormat): string {
  if (value === null || Number.isNaN(value)) return '—'
  switch (format) {
    case 'currency':
      return CAD0.format(value)
    case 'currency2':
      return CAD2.format(value)
    case 'percent':
      return `${NUM1.format(value)}%`
    case 'number1':
      return NUM1.format(value)
    case 'km':
      return `${NUM.format(value)} km`
    case 'years':
      return `${NUM1.format(value)} yrs`
    case 'days':
      return `${NUM.format(value)} days`
    case 'ratio':
      return NUM1.format(value)
    case 'text':
      return String(value)
    default:
      return NUM.format(value)
  }
}

/** Cell values in detail tables, where a column may hold text or a number. */
export function formatCell(
  value: string | number | null | undefined,
  format?: ValueFormat,
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') return value
  return formatValue(value, format ?? 'number')
}

export const TIER_LABEL: Record<Tier, string> = {
  township: 'Township',
  county: 'County',
  shared: 'Shared',
  province: 'Province',
  federal: 'Federal',
  other: 'Other body',
}

export const TIER_FULL: Record<Tier, string> = {
  township: 'Township of North Glengarry — lower tier',
  county: 'United Counties of Stormont, Dundas and Glengarry — upper tier',
  shared: 'Responsibility is split or jointly delivered between tiers',
  province: 'Province of Ontario',
  federal: 'Government of Canada',
  other: 'A body that is neither tier: school board, conservation authority, utility, or agency',
}

/** "2026-08-01" → "1 August 2026". Dates are stored ISO and shown readable. */
export function formatDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length < 2) return iso
  const [y, m, d] = parts
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const month = months[Number(m) - 1] ?? m
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`
}

/** How stale a panel is, in whole days, against a fixed "today". */
export function daysSince(iso: string, today = new Date()): number | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.floor((today.getTime() - t) / 86_400_000)
}

export const numberFormatter = new Intl.NumberFormat('en-US')
export const pctFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
})
const axisDateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' })

export function formatSigned(value: number, formatter: Intl.NumberFormat = numberFormatter): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatter.format(Math.abs(value))}`
}

export type Sign = 'positive' | 'negative' | 'neutral'

export function signOf(value: number): Sign {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

/** isoDate is YYYY-MM-DD; parsed as UTC so the local timezone can't shift it a day. */
export function parseIsoDateUtc(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(parseIsoDateUtc(isoDate))
}

export function formatAxisDate(isoDate: string): string {
  return axisDateFormatter.format(parseIsoDateUtc(isoDate))
}

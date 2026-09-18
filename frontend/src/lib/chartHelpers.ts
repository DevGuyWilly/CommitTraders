import type { CotTableRow } from '../api/types'
import { parseIsoDateUtc } from './format'

export interface TrendPoint {
  date: string
  netPctOi: number | null
}

const GAP_THRESHOLD_DAYS = 10

/**
 * Converts most-recent-first table rows into ascending chart points, with a
 * null-valued point inserted wherever consecutive weeks are further apart
 * than expected (e.g. a holiday-shifted report) — breaks the line there
 * instead of interpolating a false trend across the gap.
 */
export function buildSeriesWithGaps(rows: CotTableRow[]): TrendPoint[] {
  const ascending = [...rows].reverse()
  const points: TrendPoint[] = []

  ascending.forEach((row, i) => {
    if (i > 0) {
      const prevMs = parseIsoDateUtc(ascending[i - 1].date).getTime()
      const currMs = parseIsoDateUtc(row.date).getTime()
      const diffDays = (currMs - prevMs) / 86_400_000

      if (diffDays > GAP_THRESHOLD_DAYS) {
        points.push({ date: `gap-${i}`, netPctOi: null })
      }
    }
    points.push({ date: row.date, netPctOi: row.netPctOi })
  })

  return points
}

export interface AxisBounds {
  min: number
  max: number
  ticks: number[]
}

/** Rounds the value range outward to a clean 20-wide step for gridlines. */
export function niceAxisBounds(values: number[]): AxisBounds {
  const step = 20
  const dataMin = Math.min(0, ...values)
  const dataMax = Math.max(0, ...values)
  const min = Math.floor(dataMin / step) * step
  const max = Math.ceil(dataMax / step) * step || step

  const ticks: number[] = []
  for (let v = min; v <= max; v += step) ticks.push(v)

  return { min, max, ticks }
}

/** First / middle / last real (non-gap) dates, for sparse x-axis labeling. */
export function pickEdgeTicks(rows: CotTableRow[]): string[] {
  const ascending = [...rows].reverse()
  if (ascending.length === 0) return []
  if (ascending.length === 1) return [ascending[0].date]

  const mid = ascending[Math.floor((ascending.length - 1) / 2)]
  return [ascending[0].date, mid.date, ascending[ascending.length - 1].date]
}

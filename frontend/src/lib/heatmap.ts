const HEATMAP_MAX_ALPHA = 0.45
export const POSITIVE_RGB = '62, 207, 142' // color-positive
export const NEGATIVE_RGB = '240, 98, 95' // color-negative

export interface ColumnRange {
  min: number
  max: number
}

export function columnRange(values: number[]): ColumnRange {
  return { min: Math.min(...values), max: Math.max(...values) }
}

/** Unipolar min-max heat: darker toward the column's own max in the visible window. */
export function heatColor(value: number, range: ColumnRange, rgb: string): string | undefined {
  if (range.max === range.min) return undefined
  const intensity = (value - range.min) / (range.max - range.min)
  return `rgba(${rgb}, ${(intensity * HEATMAP_MAX_ALPHA).toFixed(2)})`
}

/**
 * Diverging min-max heat for signed columns (Net, Net % OI): positive values
 * shade toward green scaled against the column's max, negative values shade
 * toward red scaled against the column's min.
 */
export function divergingHeatColor(value: number, range: ColumnRange): string | undefined {
  if (range.max === range.min) return undefined
  if (value > 0 && range.max > 0) {
    return `rgba(${POSITIVE_RGB}, ${((value / range.max) * HEATMAP_MAX_ALPHA).toFixed(2)})`
  }
  if (value < 0 && range.min < 0) {
    return `rgba(${NEGATIVE_RGB}, ${((value / range.min) * HEATMAP_MAX_ALPHA).toFixed(2)})`
  }
  return undefined
}

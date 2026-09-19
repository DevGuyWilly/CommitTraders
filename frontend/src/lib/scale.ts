/**
 * Multiplier between the design's 16px root and the actual root font size set
 * in index.css (`html { font-size: 80% }` → 0.8). CSS gets this for free via
 * rem; use it for pixel sizes CSS can't reach, such as Recharts props.
 */
export function rootScale(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / 16
}

/** Scales a design-pixel value to the current UI scale. */
export function scaled(px: number): number {
  return px * rootScale()
}

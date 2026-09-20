/** Net position as a percentage of open interest, rounded to 2 decimals. Zero open interest reads as 0%, not Infinity. */
export function netPctOi(net: number, openInterest: number): number {
  if (openInterest === 0) return 0
  return Math.round((net / openInterest) * 100 * 100) / 100
}

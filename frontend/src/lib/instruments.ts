import type { CotInstrumentSummary } from '../api/types'

export interface HeadlineMetal {
  name: string
  exchange: string
}

/**
 * The five headline metals cards shown on the Overview grid, regardless of
 * which ones the backend currently has data for. Matched against the live
 * `/api/cot-reports` list by name prefix (backend instrument names are raw
 * CFTC labels, e.g. "COPPER- #1", not "Copper").
 */
export const HEADLINE_METALS: HeadlineMetal[] = [
  { name: 'Gold', exchange: 'COMEX' },
  { name: 'Silver', exchange: 'COMEX' },
  { name: 'Copper', exchange: 'COMEX' },
  { name: 'Platinum', exchange: 'NYMEX' },
  { name: 'Palladium', exchange: 'NYMEX' }
]

/** Maps a raw backend instrument label (e.g. "GOLD", "COPPER- #1") to its display name ("Gold", "Copper"). */
export function displayNameFor(rawInstrument: string): string {
  const match = HEADLINE_METALS.find((metal) =>
    rawInstrument.toUpperCase().startsWith(metal.name.toUpperCase())
  )
  return match?.name ?? rawInstrument
}

export interface HeadlineMatch {
  metal: HeadlineMetal
  summary?: CotInstrumentSummary
}

/**
 * Pairs each headline metal with its live summary row, if the backend has
 * one. A card/select entry is linkable exactly when `summary` is present —
 * i.e. driven by real data, not a fixed allowlist.
 */
export function matchHeadlineInstruments(summaries: CotInstrumentSummary[]): HeadlineMatch[] {
  return HEADLINE_METALS.map((metal) => ({
    metal,
    summary: summaries.find((s) => s.instrument.toUpperCase().startsWith(metal.name.toUpperCase()))
  }))
}

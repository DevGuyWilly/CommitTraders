/**
 * GET /api/cot-reports — one entry per active instrument, latest reported week.
 * Everything the UI shows about a market's identity comes from here: names,
 * exchange, category, and the labels for its report format and speculator-
 * equivalent trader group. Category and format are deliberately plain strings —
 * the frontend keeps no list of them, so a new one needs no frontend change.
 */
export interface CotInstrumentSummary {
  /** Raw CFTC market name (e.g. "EURO FX"). Not for display — use displayName. */
  instrument: string
  displayName: string
  contractCode: string
  exchange: string
  category: string
  categoryLabel: string
  reportFormat: string
  /** e.g. "CFTC Legacy Report · Futures Only" */
  reportFormatLabel: string
  /** The report's speculator-equivalent group, e.g. "Non-Commercial" or "Leveraged Funds". */
  primaryCategoryLabel: string
  /** Shown on first load; the rest sit behind "Load more" and search. */
  featured: boolean
  asOfDate: string
  long: number
  short: number
  net: number
  netPctOi: number
}

/** A single week's row from GET /api/cot-reports/:contractCode. */
export interface CotTableRow {
  date: string
  long: number
  short: number
  changeLong: number
  changeShort: number
  net: number
  netPctOi: number
}

/** GET /api/cot-reports/:contractCode response body. */
export interface CotHistoryPage {
  data: CotTableRow[]
  nextCursor: string | null
}

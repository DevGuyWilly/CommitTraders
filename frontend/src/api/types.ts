/** GET /api/cot-reports — one entry per instrument, latest reported week. */
export interface CotInstrumentSummary {
  instrument: string
  contractCode: string
  exchange: string
  asOfDate: string
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

import { pool } from '../db/client'
import type { CotReportRow } from '../db/schema'

/**
 * Shape matching the dashboard table columns: Date, Long, Short, Change Long,
 * Change Short, Net, Net % of OI. Always sourced from the Non-Commercial
 * fields — Commercial net is stored but not surfaced in v1.
 */
export interface CotTableRow {
  date: string
  long: number
  short: number
  changeLong: number
  changeShort: number
  net: number
  netPctOi: number
}

export interface CotInstrumentSummary {
  instrument: string
  contractCode: string
  exchange: string
  asOfDate: string
  net: number
  netPctOi: number
}

function toTableRow(row: CotReportRow): CotTableRow {
  return {
    date: row.as_of_date,
    long: row.noncommercial_long,
    short: row.noncommercial_short,
    changeLong: row.change_noncommercial_long,
    changeShort: row.change_noncommercial_short,
    net: row.noncommercial_net,
    netPctOi: row.noncommercial_net_pct_oi
  }
}

/** Latest reported week per instrument, for a dashboard overview list. */
export async function listLatestByInstrument(): Promise<CotInstrumentSummary[]> {
  const { rows } = await pool.query<CotReportRow>(
    `SELECT DISTINCT ON (contract_code) *
     FROM cot_reports
     ORDER BY contract_code, as_of_date DESC`
  )

  return rows.map((row) => ({
    instrument: row.instrument,
    contractCode: row.contract_code,
    exchange: row.exchange,
    asOfDate: row.as_of_date,
    net: row.noncommercial_net,
    netPctOi: row.noncommercial_net_pct_oi
  }))
}

export const DEFAULT_HISTORY_PAGE_SIZE = 52 // ~1 year of weekly reports
export const MAX_HISTORY_PAGE_SIZE = 260 // ~5 years of weekly reports

export interface CotHistoryPage {
  rows: CotTableRow[]
  /** Pass as `before` to fetch the next (older) page; null once history is exhausted. */
  nextCursor: string | null
}

export interface GetHistoryOptions {
  limit?: number
  /** Return rows strictly older than this YYYY-MM-DD date, for paging backward through history. */
  before?: string
}

/**
 * One page of weekly history for an instrument, most recent week first.
 * Uses keyset pagination (WHERE as_of_date < cursor) rather than OFFSET so
 * fetch cost stays constant however deep into the history the UI pages.
 */
export async function getHistoryByContractCode(
  contractCode: string,
  options: GetHistoryOptions = {}
): Promise<CotHistoryPage> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_HISTORY_PAGE_SIZE, 1), MAX_HISTORY_PAGE_SIZE)

  const { rows } = options.before
    ? await pool.query<CotReportRow>(
        `SELECT * FROM cot_reports
         WHERE contract_code = $1 AND as_of_date < $2
         ORDER BY as_of_date DESC
         LIMIT $3`,
        [contractCode, options.before, limit]
      )
    : await pool.query<CotReportRow>(
        `SELECT * FROM cot_reports
         WHERE contract_code = $1
         ORDER BY as_of_date DESC
         LIMIT $2`,
        [contractCode, limit]
      )

  const tableRows = rows.map(toTableRow)
  const nextCursor = tableRows.length === limit ? tableRows[tableRows.length - 1].date : null

  return { rows: tableRows, nextCursor }
}

/**
 * Inserts parsed CFTC report rows, or overwrites the existing row for weeks
 * already stored (re-running ingestion for an already-loaded week updates it
 * in place rather than duplicating it).
 */
export async function upsertReports(rows: CotReportRow[]): Promise<number> {
  for (const row of rows) {
    await pool.query(
      `INSERT INTO cot_reports (
        instrument, contract_market_name, exchange, contract_code, report_type, as_of_date,
        open_interest, change_open_interest,
        noncommercial_long, noncommercial_short, noncommercial_spreads,
        commercial_long, commercial_short, total_long, total_short,
        nonreportable_long, nonreportable_short,
        change_noncommercial_long, change_noncommercial_short, change_noncommercial_spreads,
        change_commercial_long, change_commercial_short, change_total_long, change_total_short,
        change_nonreportable_long, change_nonreportable_short,
        pct_noncommercial_long, pct_noncommercial_short, pct_noncommercial_spreads,
        pct_commercial_long, pct_commercial_short,
        total_traders, traders_noncommercial_long, traders_noncommercial_short, traders_noncommercial_spreads,
        traders_commercial_long, traders_commercial_short,
        noncommercial_net, noncommercial_net_pct_oi, commercial_net, commercial_net_pct_oi,
        change_noncommercial_net, change_commercial_net
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,
        $9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,
        $18,$19,$20,
        $21,$22,$23,$24,
        $25,$26,
        $27,$28,$29,
        $30,$31,
        $32,$33,$34,$35,
        $36,$37,
        $38,$39,$40,$41,
        $42,$43
      )
      ON CONFLICT (contract_code, report_type, as_of_date) DO UPDATE SET
        instrument = EXCLUDED.instrument,
        contract_market_name = EXCLUDED.contract_market_name,
        exchange = EXCLUDED.exchange,
        open_interest = EXCLUDED.open_interest,
        change_open_interest = EXCLUDED.change_open_interest,
        noncommercial_long = EXCLUDED.noncommercial_long,
        noncommercial_short = EXCLUDED.noncommercial_short,
        noncommercial_spreads = EXCLUDED.noncommercial_spreads,
        commercial_long = EXCLUDED.commercial_long,
        commercial_short = EXCLUDED.commercial_short,
        total_long = EXCLUDED.total_long,
        total_short = EXCLUDED.total_short,
        nonreportable_long = EXCLUDED.nonreportable_long,
        nonreportable_short = EXCLUDED.nonreportable_short,
        change_noncommercial_long = EXCLUDED.change_noncommercial_long,
        change_noncommercial_short = EXCLUDED.change_noncommercial_short,
        change_noncommercial_spreads = EXCLUDED.change_noncommercial_spreads,
        change_commercial_long = EXCLUDED.change_commercial_long,
        change_commercial_short = EXCLUDED.change_commercial_short,
        change_total_long = EXCLUDED.change_total_long,
        change_total_short = EXCLUDED.change_total_short,
        change_nonreportable_long = EXCLUDED.change_nonreportable_long,
        change_nonreportable_short = EXCLUDED.change_nonreportable_short,
        pct_noncommercial_long = EXCLUDED.pct_noncommercial_long,
        pct_noncommercial_short = EXCLUDED.pct_noncommercial_short,
        pct_noncommercial_spreads = EXCLUDED.pct_noncommercial_spreads,
        pct_commercial_long = EXCLUDED.pct_commercial_long,
        pct_commercial_short = EXCLUDED.pct_commercial_short,
        total_traders = EXCLUDED.total_traders,
        traders_noncommercial_long = EXCLUDED.traders_noncommercial_long,
        traders_noncommercial_short = EXCLUDED.traders_noncommercial_short,
        traders_noncommercial_spreads = EXCLUDED.traders_noncommercial_spreads,
        traders_commercial_long = EXCLUDED.traders_commercial_long,
        traders_commercial_short = EXCLUDED.traders_commercial_short,
        noncommercial_net = EXCLUDED.noncommercial_net,
        noncommercial_net_pct_oi = EXCLUDED.noncommercial_net_pct_oi,
        commercial_net = EXCLUDED.commercial_net,
        commercial_net_pct_oi = EXCLUDED.commercial_net_pct_oi,
        change_noncommercial_net = EXCLUDED.change_noncommercial_net,
        change_commercial_net = EXCLUDED.change_commercial_net`,
      [
        row.instrument, row.contract_market_name, row.exchange, row.contract_code, row.report_type, row.as_of_date,
        row.open_interest, row.change_open_interest,
        row.noncommercial_long, row.noncommercial_short, row.noncommercial_spreads,
        row.commercial_long, row.commercial_short, row.total_long, row.total_short,
        row.nonreportable_long, row.nonreportable_short,
        row.change_noncommercial_long, row.change_noncommercial_short, row.change_noncommercial_spreads,
        row.change_commercial_long, row.change_commercial_short, row.change_total_long, row.change_total_short,
        row.change_nonreportable_long, row.change_nonreportable_short,
        row.pct_noncommercial_long, row.pct_noncommercial_short, row.pct_noncommercial_spreads,
        row.pct_commercial_long, row.pct_commercial_short,
        row.total_traders, row.traders_noncommercial_long, row.traders_noncommercial_short, row.traders_noncommercial_spreads,
        row.traders_commercial_long, row.traders_commercial_short,
        row.noncommercial_net, row.noncommercial_net_pct_oi, row.commercial_net, row.commercial_net_pct_oi,
        row.change_noncommercial_net, row.change_commercial_net
      ]
    )
  }

  return rows.length
}

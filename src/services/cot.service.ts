import { pool } from '../db/client'
import type { CotReportRow, InstrumentCategory, ReportFormat } from '../db/schema'
import { CATEGORY_ORDER, categoryLabel, REPORT_FORMATS } from './report-formats'

/**
 * Shape matching the dashboard table columns: Date, Long, Short, Change Long,
 * Change Short, Net, Net % of OI. Always sourced from the row's primary
 * (speculator-equivalent) trader group — Non-Commercial for Legacy, Leveraged
 * Funds for TFF — so consumers never depend on which report format it is.
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
  /** Raw CFTC market name. Kept for backwards compatibility; prefer displayName. */
  instrument: string
  displayName: string
  contractCode: string
  exchange: string
  category: InstrumentCategory
  categoryLabel: string
  reportFormat: ReportFormat
  reportFormatLabel: string
  /** What this report format calls the speculator-equivalent group, e.g. "Non-Commercial" or "Leveraged Funds". */
  primaryCategoryLabel: string
  /** Shown on first load; the rest are behind "Load more" / search. */
  featured: boolean
  asOfDate: string
  long: number
  short: number
  net: number
  netPctOi: number
}

function toTableRow(row: CotReportRow): CotTableRow {
  return {
    date: row.as_of_date,
    long: row.primary_long,
    short: row.primary_short,
    changeLong: row.change_primary_long,
    changeShort: row.change_primary_short,
    net: row.primary_net,
    netPctOi: row.primary_net_pct_oi
  }
}

interface InstrumentSummaryRow {
  contract_code: string
  display_name: string
  exchange: string
  category: InstrumentCategory
  report_format: ReportFormat
  primary_category_label: string
  featured: boolean
  instrument: string
  as_of_date: string
  primary_long: number
  primary_short: number
  primary_net: number
  primary_net_pct_oi: number
}

function toInstrumentSummary(row: InstrumentSummaryRow): CotInstrumentSummary {
  return {
    instrument: row.instrument,
    displayName: row.display_name,
    contractCode: row.contract_code,
    exchange: row.exchange,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    reportFormat: row.report_format,
    reportFormatLabel: REPORT_FORMATS[row.report_format].label,
    primaryCategoryLabel: row.primary_category_label,
    featured: row.featured,
    asOfDate: row.as_of_date,
    long: row.primary_long,
    short: row.primary_short,
    net: row.primary_net,
    netPctOi: row.primary_net_pct_oi
  }
}

// Which stored report_type belongs to an instrument's format, built from the
// REPORT_FORMATS constants (never from user input).
const REPORT_TYPE_FOR_FORMAT_SQL = `CASE i.report_format ${Object.entries(REPORT_FORMATS)
  .map(([format, { reportType }]) => `WHEN '${format}' THEN '${reportType}'`)
  .join(' ')} END`

/**
 * Registry-driven: an instrument appears only if it is `active` AND has at
 * least one stored week (the inner join), so a market is never listed before
 * its data is real. Add a market by inserting a registry row — no code change.
 */
async function queryLatestSummaries(contractCode?: string): Promise<CotInstrumentSummary[]> {
  const { rows } = await pool.query<InstrumentSummaryRow>(
    `SELECT i.contract_code, i.display_name, i.exchange, i.category, i.report_format, i.primary_category_label, i.featured,
            r.instrument, r.as_of_date, r.primary_long, r.primary_short, r.primary_net, r.primary_net_pct_oi
     FROM instruments i
     JOIN LATERAL (
       SELECT instrument, as_of_date, primary_long, primary_short, primary_net, primary_net_pct_oi
       FROM cot_reports
       WHERE contract_code = i.contract_code AND report_type = ${REPORT_TYPE_FOR_FORMAT_SQL}
       ORDER BY as_of_date DESC
       LIMIT 1
     ) r ON true
     WHERE i.active AND ($1::text IS NULL OR i.contract_code = $1)`,
    [contractCode ?? null]
  )

  // By the app's category order, then name — in code rather than SQL, since alphabetical isn't the display order.
  return rows
    .map(toInstrumentSummary)
    .sort((a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.displayName.localeCompare(b.displayName)
    )
}

/** Latest reported week per active instrument, for a dashboard overview list. */
export async function listLatestByInstrument(): Promise<CotInstrumentSummary[]> {
  return queryLatestSummaries()
}

/** Latest reported week for one active instrument, or null if it is unknown, inactive, or has no data. */
export async function getLatestSummary(contractCode: string): Promise<CotInstrumentSummary | null> {
  const [summary] = await queryLatestSummaries(contractCode)
  return summary ?? null
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

// Every stored column except the generated ones (id, created_at), in insert order.
const UPSERT_COLUMNS = [
  'instrument', 'contract_market_name', 'exchange', 'contract_code', 'report_type', 'as_of_date',
  'open_interest', 'change_open_interest', 'total_traders',
  'primary_long', 'primary_short', 'primary_net', 'primary_net_pct_oi',
  'change_primary_long', 'change_primary_short', 'change_primary_net',
  'noncommercial_long', 'noncommercial_short', 'noncommercial_spreads',
  'commercial_long', 'commercial_short', 'total_long', 'total_short',
  'nonreportable_long', 'nonreportable_short',
  'change_noncommercial_long', 'change_noncommercial_short', 'change_noncommercial_spreads',
  'change_commercial_long', 'change_commercial_short', 'change_total_long', 'change_total_short',
  'change_nonreportable_long', 'change_nonreportable_short',
  'pct_noncommercial_long', 'pct_noncommercial_short', 'pct_noncommercial_spreads',
  'pct_commercial_long', 'pct_commercial_short',
  'traders_noncommercial_long', 'traders_noncommercial_short', 'traders_noncommercial_spreads',
  'traders_commercial_long', 'traders_commercial_short',
  'noncommercial_net', 'noncommercial_net_pct_oi', 'commercial_net', 'commercial_net_pct_oi',
  'change_noncommercial_net', 'change_commercial_net'
] as const satisfies readonly (keyof CotReportRow)[]

const CONFLICT_COLUMNS: readonly (typeof UPSERT_COLUMNS)[number][] = ['contract_code', 'report_type', 'as_of_date']

// 200 rows x 50 columns = 10k bind parameters, well under Postgres' 65,535 limit.
const UPSERT_BATCH_SIZE = 200

/**
 * Inserts parsed CFTC report rows, or overwrites the existing row for weeks
 * already stored (re-running ingestion for an already-loaded week updates it
 * in place rather than duplicating it). Works for every report format:
 * columns a format doesn't have are stored as NULL.
 */
export async function upsertReports(rows: CotReportRow[]): Promise<number> {
  // ON CONFLICT DO UPDATE errors if one statement touches the same row twice,
  // so collapse duplicate keys first (last one wins).
  const unique = new Map<string, CotReportRow>()
  for (const row of rows) {
    unique.set(`${row.contract_code}|${row.report_type}|${row.as_of_date}`, row)
  }
  const deduped = [...unique.values()]

  const updateSet = UPSERT_COLUMNS
    .filter((column) => !CONFLICT_COLUMNS.includes(column))
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ')

  for (let offset = 0; offset < deduped.length; offset += UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(offset, offset + UPSERT_BATCH_SIZE)

    const placeholders = batch
      .map((_, rowIndex) =>
        `(${UPSERT_COLUMNS.map((_, colIndex) => `$${rowIndex * UPSERT_COLUMNS.length + colIndex + 1}`).join(', ')})`
      )
      .join(', ')

    const values = batch.flatMap((row) => UPSERT_COLUMNS.map((column) => row[column] ?? null))

    await pool.query(
      `INSERT INTO cot_reports (${UPSERT_COLUMNS.join(', ')})
       VALUES ${placeholders}
       ON CONFLICT (${CONFLICT_COLUMNS.join(', ')}) DO UPDATE SET ${updateSet}`,
      values
    )
  }

  return deduped.length
}

import { unzipSync } from 'fflate'
import type { CotReportRow } from '../db/schema'
import { CftcHttpError, fetchCftcBuffer, fetchCftcText } from './cftc-http'
import { netPctOi } from './cot-math'

/**
 * Traders in Financial Futures (TFF), futures-only. Classifies traders as
 * Dealer/Intermediary, Asset Manager/Institutional, Leveraged Funds and Other
 * Reportables. Leveraged Funds is this app's speculator-equivalent, so it is
 * what fills the format-neutral primary_* columns.
 *
 * Both sources are comma-delimited with the same 87 columns:
 *  - the weekly file carries the current week for every TFF contract, no header row
 *  - the yearly zips (one per calendar year) carry a header row
 */
export const CFTC_TFF_WEEKLY_URL = 'https://www.cftc.gov/dea/newcot/FinFutWk.txt'

export function tffHistoryUrl(year: number): string {
  return `https://www.cftc.gov/files/dea/history/fut_fin_txt_${year}.zip`
}

/** Column order of every TFF futures-only file; the weekly file has no header row to say so. */
const TFF_COLUMNS = [
  'Market_and_Exchange_Names', 'As_of_Date_In_Form_YYMMDD', 'Report_Date_as_YYYY-MM-DD', 'CFTC_Contract_Market_Code',
  'CFTC_Market_Code', 'CFTC_Region_Code', 'CFTC_Commodity_Code', 'Open_Interest_All', 'Dealer_Positions_Long_All',
  'Dealer_Positions_Short_All', 'Dealer_Positions_Spread_All', 'Asset_Mgr_Positions_Long_All',
  'Asset_Mgr_Positions_Short_All', 'Asset_Mgr_Positions_Spread_All', 'Lev_Money_Positions_Long_All',
  'Lev_Money_Positions_Short_All', 'Lev_Money_Positions_Spread_All', 'Other_Rept_Positions_Long_All',
  'Other_Rept_Positions_Short_All', 'Other_Rept_Positions_Spread_All', 'Tot_Rept_Positions_Long_All',
  'Tot_Rept_Positions_Short_All', 'NonRept_Positions_Long_All', 'NonRept_Positions_Short_All',
  'Change_in_Open_Interest_All', 'Change_in_Dealer_Long_All', 'Change_in_Dealer_Short_All', 'Change_in_Dealer_Spread_All',
  'Change_in_Asset_Mgr_Long_All', 'Change_in_Asset_Mgr_Short_All', 'Change_in_Asset_Mgr_Spread_All',
  'Change_in_Lev_Money_Long_All', 'Change_in_Lev_Money_Short_All', 'Change_in_Lev_Money_Spread_All',
  'Change_in_Other_Rept_Long_All', 'Change_in_Other_Rept_Short_All', 'Change_in_Other_Rept_Spread_All',
  'Change_in_Tot_Rept_Long_All', 'Change_in_Tot_Rept_Short_All', 'Change_in_NonRept_Long_All',
  'Change_in_NonRept_Short_All', 'Pct_of_Open_Interest_All', 'Pct_of_OI_Dealer_Long_All', 'Pct_of_OI_Dealer_Short_All',
  'Pct_of_OI_Dealer_Spread_All', 'Pct_of_OI_Asset_Mgr_Long_All', 'Pct_of_OI_Asset_Mgr_Short_All',
  'Pct_of_OI_Asset_Mgr_Spread_All', 'Pct_of_OI_Lev_Money_Long_All', 'Pct_of_OI_Lev_Money_Short_All',
  'Pct_of_OI_Lev_Money_Spread_All', 'Pct_of_OI_Other_Rept_Long_All', 'Pct_of_OI_Other_Rept_Short_All',
  'Pct_of_OI_Other_Rept_Spread_All', 'Pct_of_OI_Tot_Rept_Long_All', 'Pct_of_OI_Tot_Rept_Short_All',
  'Pct_of_OI_NonRept_Long_All', 'Pct_of_OI_NonRept_Short_All', 'Traders_Tot_All', 'Traders_Dealer_Long_All',
  'Traders_Dealer_Short_All', 'Traders_Dealer_Spread_All', 'Traders_Asset_Mgr_Long_All', 'Traders_Asset_Mgr_Short_All',
  'Traders_Asset_Mgr_Spread_All', 'Traders_Lev_Money_Long_All', 'Traders_Lev_Money_Short_All',
  'Traders_Lev_Money_Spread_All', 'Traders_Other_Rept_Long_All', 'Traders_Other_Rept_Short_All',
  'Traders_Other_Rept_Spread_All', 'Traders_Tot_Rept_Long_All', 'Traders_Tot_Rept_Short_All',
  'Conc_Gross_LE_4_TDR_Long_All', 'Conc_Gross_LE_4_TDR_Short_All', 'Conc_Gross_LE_8_TDR_Long_All',
  'Conc_Gross_LE_8_TDR_Short_All', 'Conc_Net_LE_4_TDR_Long_All', 'Conc_Net_LE_4_TDR_Short_All',
  'Conc_Net_LE_8_TDR_Long_All', 'Conc_Net_LE_8_TDR_Short_All', 'Contract_Units', 'CFTC_Contract_Market_Code_Quotes',
  'CFTC_Market_Code_Quotes', 'CFTC_Commodity_Code_Quotes', 'CFTC_SubGroup_Code', 'FutOnly_or_Combined'
]

const NAME_COLUMN = 'Market_and_Exchange_Names'

/** Columns the parser reads; a file missing any of them is a format change we must not guess around. */
const REQUIRED_COLUMNS = [
  NAME_COLUMN, 'Report_Date_as_YYYY-MM-DD', 'CFTC_Contract_Market_Code', 'CFTC_Market_Code',
  'Open_Interest_All', 'Change_in_Open_Interest_All', 'Traders_Tot_All',
  'Lev_Money_Positions_Long_All', 'Lev_Money_Positions_Short_All',
  'Change_in_Lev_Money_Long_All', 'Change_in_Lev_Money_Short_All'
]

export interface TffParseResult {
  rows: CotReportRow[]
  /** Data lines that couldn't be turned into a row (wrong width, bad date, non-numeric position). */
  skipped: number
}

/** Minimal RFC 4180 line splitter — market names are quoted, everything else is a bare number. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

function toNumber(cell: string | undefined): number | null {
  if (cell === undefined) return null
  const value = Number(cell.trim().replace(/,/g, ''))
  return cell.trim() !== '' && Number.isFinite(value) ? value : null
}

/**
 * CFTC writes "." in the week-over-week Change columns when there is no prior
 * week to compare against (a contract's first report, or its first after a
 * gap). The positions themselves are real, so the row is kept with no change
 * (0) instead of being dropped. Positions and open interest get no such pass:
 * "." there means the row is unreadable.
 */
function toChange(cell: string | undefined): number | null {
  return cell?.trim() === '.' ? 0 : toNumber(cell)
}

/**
 * "EURO FX - CHICAGO MERCANTILE EXCHANGE" -> name + raw exchange. Split on the
 * last " - " so names that themselves contain a hyphen ("E-MINI S&P 500")
 * stay intact.
 */
function splitMarketName(full: string, fallbackExchange: string): { instrument: string, exchange: string } {
  const separator = full.lastIndexOf(' - ')
  if (separator === -1) return { instrument: full.trim(), exchange: fallbackExchange.trim() }
  return { instrument: full.slice(0, separator).trim(), exchange: full.slice(separator + 3).trim() }
}

/**
 * Parses a TFF futures-only CSV, with or without a header row. Every contract
 * in the file is returned; deciding which ones to store is the registry's job.
 */
export function parseTffCsv(text: string): TffParseResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { rows: [], skipped: 0 }

  const firstCells = parseCsvLine(lines[0])
  const hasHeader = firstCells[0].trim() === NAME_COLUMN
  const header = (hasHeader ? firstCells : TFF_COLUMNS).map((name) => name.trim())
  const dataLines = hasHeader ? lines.slice(1) : lines

  const missing = REQUIRED_COLUMNS.filter((name) => !header.includes(name))
  if (missing.length > 0) {
    throw new Error(`TFF file is missing expected columns: ${missing.join(', ')}`)
  }

  const col = (name: string): number => header.indexOf(name)
  const futOnlyColumn = col('FutOnly_or_Combined')

  const rows: CotReportRow[] = []
  let skipped = 0

  for (const line of dataLines) {
    const cells = parseCsvLine(line)
    const cell = (name: string): string => (cells[col(name)] ?? '').trim()

    const date = cell('Report_Date_as_YYYY-MM-DD')
    const openInterest = toNumber(cells[col('Open_Interest_All')])
    const changeOpenInterest = toChange(cells[col('Change_in_Open_Interest_All')])
    const totalTraders = toNumber(cells[col('Traders_Tot_All')])
    const long = toNumber(cells[col('Lev_Money_Positions_Long_All')])
    const short = toNumber(cells[col('Lev_Money_Positions_Short_All')])
    const changeLong = toChange(cells[col('Change_in_Lev_Money_Long_All')])
    const changeShort = toChange(cells[col('Change_in_Lev_Money_Short_All')])

    const valid =
      cells.length === header.length &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      cell('CFTC_Contract_Market_Code') !== '' &&
      (futOnlyColumn === -1 || cell('FutOnly_or_Combined') === 'FutOnly') &&
      openInterest !== null && changeOpenInterest !== null && totalTraders !== null &&
      long !== null && short !== null && changeLong !== null && changeShort !== null

    if (!valid) {
      skipped++
      continue
    }

    const { instrument, exchange } = splitMarketName(cell(NAME_COLUMN), cell('CFTC_Market_Code'))
    const net = long - short

    rows.push({
      instrument,
      contract_market_name: instrument,
      exchange,
      contract_code: cell('CFTC_Contract_Market_Code'),
      report_type: 'tff_futures_only',
      as_of_date: date,

      open_interest: openInterest,
      change_open_interest: changeOpenInterest,
      total_traders: totalTraders,

      primary_long: long,
      primary_short: short,
      primary_net: net,
      primary_net_pct_oi: netPctOi(net, openInterest),
      change_primary_long: changeLong,
      change_primary_short: changeShort,
      change_primary_net: changeLong - changeShort,

      // Legacy-only columns have no TFF equivalent.
      noncommercial_long: null, noncommercial_short: null, noncommercial_spreads: null,
      commercial_long: null, commercial_short: null,
      total_long: null, total_short: null, nonreportable_long: null, nonreportable_short: null,
      change_noncommercial_long: null, change_noncommercial_short: null, change_noncommercial_spreads: null,
      change_commercial_long: null, change_commercial_short: null,
      change_total_long: null, change_total_short: null,
      change_nonreportable_long: null, change_nonreportable_short: null,
      pct_noncommercial_long: null, pct_noncommercial_short: null, pct_noncommercial_spreads: null,
      pct_commercial_long: null, pct_commercial_short: null,
      traders_noncommercial_long: null, traders_noncommercial_short: null, traders_noncommercial_spreads: null,
      traders_commercial_long: null, traders_commercial_short: null,
      noncommercial_net: null, noncommercial_net_pct_oi: null, commercial_net: null, commercial_net_pct_oi: null,
      change_noncommercial_net: null, change_commercial_net: null
    })
  }

  return { rows, skipped }
}

/** Each yearly archive holds a single text file. */
export function extractZipText(zip: Uint8Array): string {
  const files = unzipSync(zip)
  const names = Object.keys(files)

  if (names.length !== 1) {
    throw new Error(`Expected one file in the TFF archive, found ${names.length}: ${names.join(', ')}`)
  }

  return Buffer.from(files[names[0]]).toString('utf8')
}

/** The latest week's positions for every TFF contract. */
export async function fetchTffWeekly(): Promise<TffParseResult> {
  return parseTffCsv(await fetchCftcText(CFTC_TFF_WEEKLY_URL))
}

/**
 * A whole calendar year of weekly positions. Returns null when CFTC hasn't
 * published that year's file yet (404, e.g. the first days of January).
 */
export async function fetchTffYear(year: number): Promise<TffParseResult | null> {
  try {
    return parseTffCsv(extractZipText(await fetchCftcBuffer(tffHistoryUrl(year))))
  } catch (err) {
    if (err instanceof CftcHttpError && err.statusCode === 404) return null
    throw err
  }
}

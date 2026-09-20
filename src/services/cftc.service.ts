import type { CotReportRow, ReportType } from '../db/schema'
import { fetchCftcText } from './cftc-http'
import { netPctOi } from './cot-math'

/**
 * Legacy (Non-Commercial / Commercial) futures-only report — the source for
 * every instrument whose registry report_format is 'legacy'. The keys are
 * report pages; which contracts on a page get stored is decided by the
 * instruments registry, not by this list.
 */

export const CFTC_LEGACY_REPORT_URLS: Record<string, string> = {
  metals: 'https://www.cftc.gov/dea/futures/deacmxsf.htm'
}

const HEADER_RE = /^(.+?) - (.+?)\s+Code-(\d+)\s*$/
const AS_OF_DATE_RE = /FUTURES ONLY POSITIONS AS OF (\d{2})\/(\d{2})\/(\d{2})/
const OPEN_INTEREST_RE = /OPEN INTEREST:\s*(-?[\d,]+)/
const CHANGE_OPEN_INTEREST_RE = /CHANGE IN OPEN INTEREST:\s*(-?[\d,]+)/
const TOTAL_TRADERS_RE = /TOTAL TRADERS:\s*(-?[\d,]+)/

// Everything the Legacy parser reads straight off the report; the rest is derived in withDerivedFields.
type DerivedKeys =
  | 'id' | 'created_at'
  | 'primary_long' | 'primary_short' | 'primary_net' | 'primary_net_pct_oi'
  | 'change_primary_long' | 'change_primary_short' | 'change_primary_net'
  | 'noncommercial_net' | 'noncommercial_net_pct_oi' | 'commercial_net' | 'commercial_net_pct_oi'
  | 'change_noncommercial_net' | 'change_commercial_net'

// A parsed Legacy section always has every Legacy column (they're only null on TFF rows).
type ParsedCotSection = Omit<{ [K in keyof CotReportRow]-?: NonNullable<CotReportRow[K]> }, DerivedKeys>

function parseNumberList(line: string): number[] {
  return line
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => parseFloat(token.replace(/,/g, '')))
}

/** The data line for each report section sits directly below its label line. */
function lineAfter(lines: string[], matches: (line: string) => boolean): string | undefined {
  const index = lines.findIndex(matches)
  if (index === -1) return undefined

  for (let i = index + 1; i < lines.length; i++) {
    if (lines[i].trim().length > 0) return lines[i]
  }
  return undefined
}

function toIsoDate(mm: string, dd: string, yy: string): string {
  const year = Number(yy) < 70 ? 2000 + Number(yy) : 1900 + Number(yy)
  return `${year}-${mm}-${dd}`
}

function parseSection(sectionText: string): ParsedCotSection | null {
  const lines = sectionText.split('\n')
  const headerMatch = lines[0].match(HEADER_RE)
  if (!headerMatch) return null

  const [, instrument, exchange, contractCode] = headerMatch

  const asOfMatch = sectionText.match(AS_OF_DATE_RE)
  const openInterestMatch = sectionText.match(OPEN_INTEREST_RE)
  const changeOiMatch = sectionText.match(CHANGE_OPEN_INTEREST_RE)
  const totalTradersMatch = sectionText.match(TOTAL_TRADERS_RE)

  if (!asOfMatch || !openInterestMatch || !changeOiMatch || !totalTradersMatch) return null

  const commitmentsLine = lineAfter(lines, (l) => l.trim() === 'COMMITMENTS')
  const changesLine = lineAfter(lines, (l) => l.trim().startsWith('CHANGES FROM'))
  const pctLine = lineAfter(lines, (l) => l.trim().startsWith('PERCENT OF OPEN INTEREST'))
  const tradersLine = lineAfter(lines, (l) => l.trim().startsWith('NUMBER OF TRADERS'))

  if (!commitmentsLine || !changesLine || !pctLine || !tradersLine) return null

  // Column order for COMMITMENTS/CHANGES: NC long, NC short, NC spreads,
  // C long, C short, total long, total short, nonreportable long, short.
  const commitments = parseNumberList(commitmentsLine)
  const changes = parseNumberList(changesLine)
  // PERCENT/TRADERS only report the first 5 columns (NC long/short/spreads, C long/short).
  const pct = parseNumberList(pctLine)
  const traders = parseNumberList(tradersLine)

  if (commitments.length < 9 || changes.length < 9 || pct.length < 5 || traders.length < 5) {
    return null
  }

  return {
    instrument: instrument.trim(),
    contract_market_name: instrument.trim(),
    exchange: exchange.trim(),
    contract_code: contractCode.trim(),
    report_type: 'legacy_futures_only' as ReportType,
    as_of_date: toIsoDate(asOfMatch[1], asOfMatch[2], asOfMatch[3]),

    open_interest: parseFloat(openInterestMatch[1].replace(/,/g, '')),
    change_open_interest: parseFloat(changeOiMatch[1].replace(/,/g, '')),

    noncommercial_long: commitments[0],
    noncommercial_short: commitments[1],
    noncommercial_spreads: commitments[2],
    commercial_long: commitments[3],
    commercial_short: commitments[4],
    total_long: commitments[5],
    total_short: commitments[6],
    nonreportable_long: commitments[7],
    nonreportable_short: commitments[8],

    change_noncommercial_long: changes[0],
    change_noncommercial_short: changes[1],
    change_noncommercial_spreads: changes[2],
    change_commercial_long: changes[3],
    change_commercial_short: changes[4],
    change_total_long: changes[5],
    change_total_short: changes[6],
    change_nonreportable_long: changes[7],
    change_nonreportable_short: changes[8],

    pct_noncommercial_long: pct[0],
    pct_noncommercial_short: pct[1],
    pct_noncommercial_spreads: pct[2],
    pct_commercial_long: pct[3],
    pct_commercial_short: pct[4],

    total_traders: parseFloat(totalTradersMatch[1].replace(/,/g, '')),
    traders_noncommercial_long: traders[0],
    traders_noncommercial_short: traders[1],
    traders_noncommercial_spreads: traders[2],
    traders_commercial_long: traders[3],
    traders_commercial_short: traders[4]
  }
}

function splitIntoSections(preText: string): string[] {
  const lines = preText.split('\n')
  const sections: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (HEADER_RE.test(line)) {
      if (current.length > 0) sections.push(current.join('\n'))
      current = [line]
    } else if (current.length > 0) {
      current.push(line)
    }
  }
  if (current.length > 0) sections.push(current.join('\n'))

  return sections
}

async function fetchReportText(url: string): Promise<string> {
  const html = await fetchCftcText(url)
  const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i)

  if (!preMatch) {
    throw new Error(`Could not find <pre> block in CFTC report at ${url}`)
  }

  return preMatch[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/**
 * net = long - short; change_net = change_long - change_short (algebraically
 * equivalent to diffing net week-over-week). For Legacy, the primary
 * (speculator-equivalent) group is Non-Commercial.
 */
function withDerivedFields(parsed: ParsedCotSection): CotReportRow {
  const noncommercial_net = parsed.noncommercial_long - parsed.noncommercial_short
  const commercial_net = parsed.commercial_long - parsed.commercial_short
  const change_noncommercial_net = parsed.change_noncommercial_long - parsed.change_noncommercial_short
  const change_commercial_net = parsed.change_commercial_long - parsed.change_commercial_short

  const noncommercial_net_pct_oi = netPctOi(noncommercial_net, parsed.open_interest)

  return {
    ...parsed,
    primary_long: parsed.noncommercial_long,
    primary_short: parsed.noncommercial_short,
    primary_net: noncommercial_net,
    primary_net_pct_oi: noncommercial_net_pct_oi,
    change_primary_long: parsed.change_noncommercial_long,
    change_primary_short: parsed.change_noncommercial_short,
    change_primary_net: change_noncommercial_net,
    noncommercial_net,
    noncommercial_net_pct_oi,
    commercial_net,
    commercial_net_pct_oi: netPctOi(commercial_net, parsed.open_interest),
    change_noncommercial_net,
    change_commercial_net
  }
}

/** Parses every instrument section of a Legacy report's text (the contents of its <pre> block). */
export function parseLegacyReportText(preText: string): CotReportRow[] {
  return splitIntoSections(preText)
    .map(parseSection)
    .filter((row): row is ParsedCotSection => row !== null)
    .map(withDerivedFields)
}

/** Fetches a CFTC Legacy Futures-Only report page and parses every instrument section in it. */
export async function fetchAndParseLegacyReport(url: string): Promise<CotReportRow[]> {
  return parseLegacyReportText(await fetchReportText(url))
}

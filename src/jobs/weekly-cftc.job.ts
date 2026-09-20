import type { CotReportRow, ReportFormat } from '../db/schema'
import { CFTC_LEGACY_REPORT_URLS, fetchAndParseLegacyReport } from '../services/cftc.service'
import { CFTC_TFF_WEEKLY_URL, fetchTffWeekly } from '../services/cftc-tff.service'
import { upsertReports } from '../services/cot.service'
import { listInstrumentsByFormat } from '../services/instrument.service'

export interface CftcIngestionSummary {
  reportName: string
  url: string
  /** Rows written (inserted or updated) — only for instruments in the registry. */
  rowsUpserted: number
  /** Rows in the source for contracts that aren't in the registry (ignored). */
  unregisteredRows: number
  /** Lines the parser couldn't read. Should be 0; anything else deserves a look. */
  skippedRows: number
  /** Registered contracts of this format that the source didn't contain at all — a wrong code or a delisted market. */
  missingContracts: string[]
}

/**
 * Stores only the rows for registered instruments (active or not — a market
 * awaiting verification still needs data), so which markets we track is
 * decided by the `instruments` table and nothing in this file.
 */
export async function storeRegisteredRows(
  format: ReportFormat,
  rows: CotReportRow[]
): Promise<Pick<CftcIngestionSummary, 'rowsUpserted' | 'unregisteredRows' | 'missingContracts'>> {
  const registered = new Set((await listInstrumentsByFormat(format)).map((instrument) => instrument.contract_code))
  const kept = rows.filter((row) => registered.has(row.contract_code))
  const seen = new Set(kept.map((row) => row.contract_code))

  return {
    rowsUpserted: await upsertReports(kept),
    unregisteredRows: rows.length - kept.length,
    missingContracts: [...registered].filter((code) => !seen.has(code)).sort()
  }
}

interface WeeklySource {
  reportName: string
  format: ReportFormat
  url: string
  fetch: () => Promise<{ rows: CotReportRow[], skipped: number }>
}

function weeklySources(): WeeklySource[] {
  return [
    ...Object.entries(CFTC_LEGACY_REPORT_URLS).map(([reportName, url]): WeeklySource => ({
      reportName: `legacy:${reportName}`,
      format: 'legacy',
      url,
      fetch: async () => ({ rows: await fetchAndParseLegacyReport(url), skipped: 0 })
    })),
    {
      reportName: 'tff:financials',
      format: 'tff',
      url: CFTC_TFF_WEEKLY_URL,
      fetch: fetchTffWeekly
    }
  ]
}

/**
 * Fetches and upserts the latest week from every CFTC report we ingest
 * (Legacy and TFF). Safe to re-run (e.g. after a failed attempt, or by hand
 * between scheduled runs) since upsertReports overwrites rather than
 * duplicates. Sources are independent: one failing doesn't stop the others,
 * and the failures are raised together at the end.
 */
export async function runWeeklyCftcIngestion(): Promise<CftcIngestionSummary[]> {
  const summaries: CftcIngestionSummary[] = []
  const failures: string[] = []

  for (const source of weeklySources()) {
    try {
      const { rows, skipped } = await source.fetch()
      const stored = await storeRegisteredRows(source.format, rows)
      summaries.push({ reportName: source.reportName, url: source.url, skippedRows: skipped, ...stored })
    } catch (err) {
      failures.push(`${source.reportName}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`CFTC ingestion failed for ${failures.length} report(s): ${failures.join('; ')}`)
  }

  return summaries
}

import { CFTC_LEGACY_REPORT_URLS, fetchAndParseLegacyReport } from '../services/cftc.service'
import { upsertReports } from '../services/cot.service'

export interface CftcIngestionSummary {
  reportName: string
  url: string
  instrumentsIngested: number
}

/**
 * Fetches and upserts every configured CFTC Legacy report. Safe to re-run
 * (e.g. after a failed attempt, or by hand between scheduled runs) since
 * upsertReports overwrites rather than duplicates.
 */
export async function runWeeklyCftcIngestion(): Promise<CftcIngestionSummary[]> {
  const summaries: CftcIngestionSummary[] = []

  for (const [reportName, url] of Object.entries(CFTC_LEGACY_REPORT_URLS)) {
    const rows = await fetchAndParseLegacyReport(url)
    const instrumentsIngested = await upsertReports(rows)
    summaries.push({ reportName, url, instrumentsIngested })
  }

  return summaries
}

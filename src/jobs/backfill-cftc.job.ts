import { fetchTffYear, tffHistoryUrl } from '../services/cftc-tff.service'
import { storeRegisteredRows, type CftcIngestionSummary } from './weekly-cftc.job'

/**
 * Loads TFF history year by year, from `fromYear` through `toYear`, for every
 * registered TFF instrument. Idempotent — safe to re-run, e.g. after adding a
 * new instrument to the registry.
 *
 * Legacy metals aren't handled here: they are already loaded and kept current
 * by the weekly run. A newly registered Legacy market would need a Legacy
 * history loader, which doesn't exist yet.
 */
export async function runTffBackfill(
  fromYear: number,
  toYear: number = new Date().getUTCFullYear()
): Promise<CftcIngestionSummary[]> {
  const summaries: CftcIngestionSummary[] = []

  for (let year = fromYear; year <= toYear; year++) {
    const url = tffHistoryUrl(year)
    const parsed = await fetchTffYear(year)

    if (parsed === null) {
      // Only the current year can legitimately be missing (before CFTC's first release of the year).
      if (year === toYear) continue
      throw new Error(`CFTC has no TFF history file for ${year} (${url})`)
    }

    const stored = await storeRegisteredRows('tff', parsed.rows)
    summaries.push({ reportName: `tff:${year}`, url, skippedRows: parsed.skipped, ...stored })
  }

  return summaries
}

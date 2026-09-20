import { runWeeklyCftcIngestion } from './weekly-cftc.job'
import { closePool } from '../db/client'

runWeeklyCftcIngestion()
  .then((summaries) => {
    for (const s of summaries) {
      console.log(
        `${s.reportName}: ${s.rowsUpserted} row(s) stored, ${s.unregisteredRows} ignored (not in registry), ` +
        `${s.skippedRows} unreadable (${s.url})` +
        (s.missingContracts.length > 0 ? `\n  WARNING registered but absent from this report: ${s.missingContracts.join(', ')}` : '')
      )
    }
    console.log(`Done. ${summaries.reduce((sum, s) => sum + s.rowsUpserted, 0)} row(s) stored in total.`)
  })
  .catch((err) => {
    console.error('CFTC ingestion failed:', err)
    process.exitCode = 1
  })
  .finally(() => closePool())

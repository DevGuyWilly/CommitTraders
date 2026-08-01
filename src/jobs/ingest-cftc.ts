import { runWeeklyCftcIngestion } from './weekly-cftc.job'
import { closePool } from '../db/client'

runWeeklyCftcIngestion()
  .then((summaries) => {
    for (const summary of summaries) {
      console.log(`Ingested ${summary.instrumentsIngested} instrument(s) from "${summary.reportName}" report (${summary.url})`)
    }
    const total = summaries.reduce((sum, s) => sum + s.instrumentsIngested, 0)
    console.log(`Done. Ingested ${total} instrument(s) total.`)
  })
  .catch((err) => {
    console.error('CFTC ingestion failed:', err)
    process.exitCode = 1
  })
  .finally(() => closePool())

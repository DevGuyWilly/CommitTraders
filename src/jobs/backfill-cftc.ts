import { runTffBackfill } from './backfill-cftc.job'
import { closePool } from '../db/client'

// Usage: npm run cftc:backfill [-- --from 2025]
const fromArg = process.argv.indexOf('--from')
const fromYear = fromArg === -1 ? 2025 : Number(process.argv[fromArg + 1])

if (!Number.isInteger(fromYear) || fromYear < 2006) {
  console.error('Usage: npm run cftc:backfill [-- --from <year>]   (TFF data starts in 2006; default 2025)')
  process.exit(1)
}

runTffBackfill(fromYear)
  .then((summaries) => {
    for (const s of summaries) {
      console.log(
        `${s.reportName}: ${s.rowsUpserted} row(s) stored, ${s.unregisteredRows} ignored (not in registry), ` +
        `${s.skippedRows} unreadable` +
        (s.missingContracts.length > 0 ? `, registered but absent: ${s.missingContracts.join(', ')}` : '')
      )
    }
    console.log(`Done. ${summaries.reduce((sum, s) => sum + s.rowsUpserted, 0)} row(s) stored from ${fromYear} to present.`)
  })
  .catch((err) => {
    console.error('TFF backfill failed:', err)
    process.exitCode = 1
  })
  .finally(() => closePool())

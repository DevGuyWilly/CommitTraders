import { syncTffInstruments } from './sync-tff-instruments.job'
import { closePool } from '../db/client'

// Usage: npm run instruments:sync-tff [-- --dry-run]
const dryRun = process.argv.includes('--dry-run')

syncTffInstruments({ dryRun })
  .then((result) => {
    console.log(
      `${result.contractsInReport} contracts in the TFF report; ${result.alreadyRegistered} already registered; ` +
      `${result.toAdd.length} new` + (dryRun ? ' (dry run — nothing written)' : `, ${result.inserted} inserted (inactive, not featured)`)
    )
    console.log(`Names: ${result.curatedNames} from the catalog, ${result.derivedNames.length} cleaned up from CFTC's label`)

    for (const d of result.derivedNames) {
      console.log(`  check this name: ${d.contractCode}  "${d.cftcName}"  ->  "${d.displayName}"`)
    }

    if (result.toAdd.length > 0 && !dryRun) {
      console.log('Next: npm run cftc:backfill, then npm run instruments:activate -- --all')
    }
  })
  .catch((err) => {
    console.error('TFF instrument sync failed:', err)
    process.exitCode = 1
  })
  .finally(() => closePool())

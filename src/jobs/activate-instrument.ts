import { activateInstrument, listActivatableCodes } from '../services/instrument.service'
import { closePool } from '../db/client'

// Usage: npm run instruments:activate -- <contract_code> [<contract_code> ...]
//        npm run instruments:activate -- --all     (every inactive instrument that already has data)
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: npm run instruments:activate -- <contract_code> [<contract_code> ...] | --all')
  process.exit(1)
}

async function main(): Promise<void> {
  const codes = args.includes('--all') ? await listActivatableCodes() : args

  if (args.includes('--all')) {
    console.log(`${codes.length} inactive instrument(s) have stored data; activating them one at a time.`)
  }

  // One at a time, stopping at the first refusal, so a bad contract is never skipped past.
  for (const code of codes) {
    const result = await activateInstrument(code)
    console.log(`Activated ${result.displayName} (${result.contractCode}): ${result.weeksStored} week(s) stored, latest ${result.latestAsOfDate}`)
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => closePool())

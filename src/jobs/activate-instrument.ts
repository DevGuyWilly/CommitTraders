import { activateInstrument } from '../services/instrument.service'
import { closePool } from '../db/client'

// Usage: npm run instruments:activate -- <contract_code> [<contract_code> ...]
const codes = process.argv.slice(2)

if (codes.length === 0) {
  console.error('Usage: npm run instruments:activate -- <contract_code> [<contract_code> ...]')
  process.exit(1)
}

async function main(): Promise<void> {
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

import { migrate } from './schema'
import { closePool } from './client'

migrate()
  .then(() => {
    console.log('Migration complete: cot_reports table is up to date')
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exitCode = 1
  })
  .finally(() => closePool())

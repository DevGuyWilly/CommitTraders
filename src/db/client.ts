import { config } from 'dotenv'
import { join } from 'node:path'

// dotenv's default lookup uses process.cwd(), which is `dist/` when Fastify
// CLI starts the server. Anchor to __dirname so .env is always found two
// levels up from dist/db/ regardless of working directory.
config({ path: join(__dirname, '..', '..', '.env') })

import { Pool, types, type QueryResultRow } from 'pg'

// Return DATE as the raw 'YYYY-MM-DD' string instead of a local-midnight Date
// (which shifts a day when serialized to UTC JSON), and NUMERIC as a JS
// number instead of a string, matching the CotReportRow type declarations.
types.setTypeParser(types.builtins.DATE, (value) => value)
types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value))

const connectionString  = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const pool = new Pool({ connectionString })

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params)
}

export async function closePool(): Promise<void> {
  await pool.end()
}

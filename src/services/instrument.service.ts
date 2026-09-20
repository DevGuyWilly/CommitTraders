import { pool } from '../db/client'
import type { InstrumentRow, ReportFormat } from '../db/schema'
import { REPORT_FORMATS } from './report-formats'

/**
 * Every registered instrument for a report format, active or not. Ingestion
 * uses this so contracts awaiting verification still get data; only the API
 * listing is gated on `active`.
 */
export async function listInstrumentsByFormat(format: ReportFormat): Promise<InstrumentRow[]> {
  const { rows } = await pool.query<InstrumentRow>(
    'SELECT * FROM instruments WHERE report_format = $1 ORDER BY contract_code',
    [format]
  )
  return rows
}

export interface ActivationResult {
  contractCode: string
  displayName: string
  weeksStored: number
  latestAsOfDate: string
}

/**
 * Turns an instrument on for the API. Refuses unless real data is already
 * stored for it — the "don't show a market until it's real" rule, enforced
 * here so it can't be skipped by hand.
 */
export async function activateInstrument(contractCode: string): Promise<ActivationResult> {
  const { rows: found } = await pool.query<InstrumentRow>(
    'SELECT * FROM instruments WHERE contract_code = $1',
    [contractCode]
  )

  if (found.length === 0) {
    throw new Error(`No instrument with contract code ${contractCode} in the registry`)
  }

  const instrument = found[0]

  const { rows: stats } = await pool.query<{ weeks: string, latest: string | null }>(
    `SELECT count(*) AS weeks, max(as_of_date) AS latest
     FROM cot_reports
     WHERE contract_code = $1 AND report_type = $2`,
    [contractCode, REPORT_FORMATS[instrument.report_format].reportType]
  )

  const weeksStored = Number(stats[0].weeks)

  if (weeksStored === 0 || stats[0].latest === null) {
    throw new Error(
      `Refusing to activate ${instrument.display_name} (${contractCode}): no ${instrument.report_format} data is stored for it yet. ` +
      'Run ingestion first and confirm it worked.'
    )
  }

  await pool.query('UPDATE instruments SET active = true WHERE contract_code = $1', [contractCode])

  return {
    contractCode,
    displayName: instrument.display_name,
    weeksStored,
    latestAsOfDate: stats[0].latest
  }
}

/** Registers new instruments. Existing rows are left exactly as they are. Returns how many were actually new. */
export async function insertInstruments(instruments: readonly InstrumentRow[]): Promise<number> {
  let inserted = 0

  for (const instrument of instruments) {
    const result = await pool.query(
      `INSERT INTO instruments (contract_code, display_name, exchange, category, report_format, primary_category_label, active, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (contract_code) DO NOTHING`,
      [
        instrument.contract_code, instrument.display_name, instrument.exchange, instrument.category,
        instrument.report_format, instrument.primary_category_label, instrument.active, instrument.featured
      ]
    )
    inserted += result.rowCount ?? 0
  }

  return inserted
}

export async function listRegisteredCodes(): Promise<Set<string>> {
  const { rows } = await pool.query<{ contract_code: string }>('SELECT contract_code FROM instruments')
  return new Set(rows.map((row) => row.contract_code))
}

/** Inactive instruments that already have stored data — the ones `activateInstrument` would accept. */
export async function listActivatableCodes(): Promise<string[]> {
  const typeCase = Object.entries(REPORT_FORMATS)
    .map(([format, { reportType }]) => `WHEN '${format}' THEN '${reportType}'`)
    .join(' ')

  const { rows } = await pool.query<{ contract_code: string }>(
    `SELECT i.contract_code
     FROM instruments i
     WHERE NOT i.active AND EXISTS (
       SELECT 1 FROM cot_reports r
       WHERE r.contract_code = i.contract_code AND r.report_type = CASE i.report_format ${typeCase} END
     )
     ORDER BY i.contract_code`
  )
  return rows.map((row) => row.contract_code)
}

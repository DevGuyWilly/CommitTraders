import { pool } from './client'
import { INSTRUMENT_SEED } from './instrument-seed'

/** Which CFTC report an instrument's data comes from. Each format needs its own parser. */
export type ReportFormat = 'legacy' | 'tff'

/** Stored on every cot_reports row; derived from the instrument's ReportFormat. */
export type ReportType = 'legacy_futures_only' | 'tff_futures_only'

export type InstrumentCategory = 'metals' | 'financials' | 'energy' | 'agriculture'

/**
 * The registry of markets the app tracks. Adding a market is a new row here
 * (plus ingestion), never a code change. `active` gates what the API lists:
 * flip it on only once real data has been ingested for the contract.
 */
export interface InstrumentRow {
  contract_code: string
  display_name: string
  /** Display-ready exchange, e.g. "COMEX" — the raw CFTC string stays on cot_reports. */
  exchange: string
  category: InstrumentCategory
  report_format: ReportFormat
  /** What this report format calls the speculator-equivalent trader group, e.g. "Non-Commercial" or "Leveraged Funds". */
  primary_category_label: string
  active: boolean
  /**
   * Shown on first load. Everything else in the category is reachable through
   * "Load more" and search, so a category can hold hundreds of markets without
   * burying the main ones.
   */
  featured: boolean
}

/**
 * One row per instrument per week.
 *
 * The `primary_*` columns hold the speculator-equivalent trader group for the
 * row's report format (Non-Commercial for Legacy, Leveraged Funds for TFF), so
 * everything downstream reads one set of columns regardless of format. The
 * category-specific columns below them are Legacy-only and null on TFF rows.
 *
 * `*_net`, `*_net_pct_oi`, and `change_*_net` are always derived by the
 * parser/service layer, never read directly off the CFTC report.
 */
export interface CotReportRow {
  id?: number

  instrument: string
  contract_market_name: string
  exchange: string
  contract_code: string
  report_type: ReportType
  as_of_date: string // YYYY-MM-DD

  open_interest: number
  change_open_interest: number
  total_traders: number

  primary_long: number
  primary_short: number
  primary_net: number
  primary_net_pct_oi: number
  change_primary_long: number
  change_primary_short: number
  change_primary_net: number

  // Legacy-only (null on TFF rows)
  noncommercial_long: number | null
  noncommercial_short: number | null
  noncommercial_spreads: number | null
  commercial_long: number | null
  commercial_short: number | null
  total_long: number | null
  total_short: number | null
  nonreportable_long: number | null
  nonreportable_short: number | null

  change_noncommercial_long: number | null
  change_noncommercial_short: number | null
  change_noncommercial_spreads: number | null
  change_commercial_long: number | null
  change_commercial_short: number | null
  change_total_long: number | null
  change_total_short: number | null
  change_nonreportable_long: number | null
  change_nonreportable_short: number | null

  pct_noncommercial_long: number | null
  pct_noncommercial_short: number | null
  pct_noncommercial_spreads: number | null
  pct_commercial_long: number | null
  pct_commercial_short: number | null

  traders_noncommercial_long: number | null
  traders_noncommercial_short: number | null
  traders_noncommercial_spreads: number | null
  traders_commercial_long: number | null
  traders_commercial_short: number | null

  noncommercial_net: number | null
  noncommercial_net_pct_oi: number | null
  commercial_net: number | null
  commercial_net_pct_oi: number | null
  change_noncommercial_net: number | null
  change_commercial_net: number | null

  created_at?: string
}

// language=SQL format=false
export const CREATE_COT_REPORTS_TABLE = `
CREATE TABLE IF NOT EXISTS cot_reports (
  id                            BIGSERIAL PRIMARY KEY,

  instrument                    TEXT NOT NULL,
  contract_market_name          TEXT NOT NULL,
  exchange                      TEXT NOT NULL,
  contract_code                 TEXT NOT NULL,
  report_type                   TEXT NOT NULL,
  as_of_date                    DATE NOT NULL,

  open_interest                 INTEGER NOT NULL,
  change_open_interest          INTEGER NOT NULL,

  noncommercial_long            INTEGER NOT NULL,
  noncommercial_short           INTEGER NOT NULL,
  noncommercial_spreads         INTEGER NOT NULL,
  commercial_long                INTEGER NOT NULL,
  commercial_short               INTEGER NOT NULL,
  total_long                     INTEGER NOT NULL,
  total_short                    INTEGER NOT NULL,
  nonreportable_long             INTEGER NOT NULL,
  nonreportable_short            INTEGER NOT NULL,

  change_noncommercial_long      INTEGER NOT NULL,
  change_noncommercial_short     INTEGER NOT NULL,
  change_noncommercial_spreads   INTEGER NOT NULL,
  change_commercial_long         INTEGER NOT NULL,
  change_commercial_short        INTEGER NOT NULL,
  change_total_long              INTEGER NOT NULL,
  change_total_short             INTEGER NOT NULL,
  change_nonreportable_long      INTEGER NOT NULL,
  change_nonreportable_short     INTEGER NOT NULL,

  pct_noncommercial_long         NUMERIC(5,2) NOT NULL,
  pct_noncommercial_short        NUMERIC(5,2) NOT NULL,
  pct_noncommercial_spreads      NUMERIC(5,2) NOT NULL,
  pct_commercial_long            NUMERIC(5,2) NOT NULL,
  pct_commercial_short           NUMERIC(5,2) NOT NULL,

  total_traders                  INTEGER NOT NULL,
  traders_noncommercial_long     INTEGER NOT NULL,
  traders_noncommercial_short    INTEGER NOT NULL,
  traders_noncommercial_spreads  INTEGER NOT NULL,
  traders_commercial_long        INTEGER NOT NULL,
  traders_commercial_short       INTEGER NOT NULL,

  noncommercial_net              INTEGER NOT NULL,
  noncommercial_net_pct_oi       NUMERIC(6,2) NOT NULL,
  commercial_net                 INTEGER NOT NULL,
  commercial_net_pct_oi          NUMERIC(6,2) NOT NULL,
  change_noncommercial_net       INTEGER NOT NULL,
  change_commercial_net          INTEGER NOT NULL,

  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cot_reports_unique_report UNIQUE (contract_code, report_type, as_of_date)
);

CREATE INDEX IF NOT EXISTS cot_reports_instrument_idx ON cot_reports (instrument);
CREATE INDEX IF NOT EXISTS cot_reports_as_of_date_idx ON cot_reports (as_of_date);

-- Matches the /cot-reports/:contractCode access pattern: filter by
-- contract_code, keyset-paginate by as_of_date descending.
CREATE INDEX IF NOT EXISTS cot_reports_contract_code_as_of_date_idx
  ON cot_reports (contract_code, as_of_date DESC);
`

// language=SQL format=false
export const CREATE_INSTRUMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS instruments (
  contract_code           TEXT PRIMARY KEY,
  display_name            TEXT NOT NULL,
  exchange                TEXT NOT NULL,
  category                TEXT NOT NULL CHECK (category IN ('metals', 'financials', 'energy', 'agriculture')),
  report_format           TEXT NOT NULL CHECK (report_format IN ('legacy', 'tff')),
  primary_category_label  TEXT NOT NULL,
  active                  BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

/**
 * Columns that only exist in the Legacy report (Non-Commercial / Commercial /
 * Nonreportable breakdown). They were NOT NULL when Legacy was the only
 * format; TFF rows have no equivalent, so the constraint is relaxed — the
 * data already in them is untouched.
 */
const LEGACY_ONLY_COLUMNS = [
  'noncommercial_long', 'noncommercial_short', 'noncommercial_spreads',
  'commercial_long', 'commercial_short',
  'total_long', 'total_short', 'nonreportable_long', 'nonreportable_short',
  'change_noncommercial_long', 'change_noncommercial_short', 'change_noncommercial_spreads',
  'change_commercial_long', 'change_commercial_short',
  'change_total_long', 'change_total_short', 'change_nonreportable_long', 'change_nonreportable_short',
  'pct_noncommercial_long', 'pct_noncommercial_short', 'pct_noncommercial_spreads',
  'pct_commercial_long', 'pct_commercial_short',
  'traders_noncommercial_long', 'traders_noncommercial_short', 'traders_noncommercial_spreads',
  'traders_commercial_long', 'traders_commercial_short',
  'noncommercial_net', 'noncommercial_net_pct_oi', 'commercial_net', 'commercial_net_pct_oi',
  'change_noncommercial_net', 'change_commercial_net'
]

/**
 * Adds the format-neutral primary_* columns and backfills them from the
 * Non-Commercial columns for existing Legacy rows. Additive and idempotent:
 * nothing is dropped or overwritten — every existing column and value stays
 * as it was, and re-running only fills rows the backfill hasn't reached yet.
 */
// language=SQL format=false
export const GENERALIZE_COT_REPORTS = `
ALTER TABLE cot_reports
  ADD COLUMN IF NOT EXISTS primary_long          INTEGER,
  ADD COLUMN IF NOT EXISTS primary_short         INTEGER,
  ADD COLUMN IF NOT EXISTS primary_net           INTEGER,
  ADD COLUMN IF NOT EXISTS primary_net_pct_oi    NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS change_primary_long   INTEGER,
  ADD COLUMN IF NOT EXISTS change_primary_short  INTEGER,
  ADD COLUMN IF NOT EXISTS change_primary_net    INTEGER;

UPDATE cot_reports SET
  primary_long         = noncommercial_long,
  primary_short        = noncommercial_short,
  primary_net          = noncommercial_net,
  primary_net_pct_oi   = noncommercial_net_pct_oi,
  change_primary_long  = change_noncommercial_long,
  change_primary_short = change_noncommercial_short,
  change_primary_net   = change_noncommercial_net
WHERE primary_long IS NULL AND noncommercial_long IS NOT NULL;

ALTER TABLE cot_reports
  ${LEGACY_ONLY_COLUMNS.map((column) => `ALTER COLUMN ${column} DROP NOT NULL`).join(',\n  ')};

ALTER TABLE cot_reports
  ALTER COLUMN primary_long          SET NOT NULL,
  ALTER COLUMN primary_short         SET NOT NULL,
  ALTER COLUMN primary_net           SET NOT NULL,
  ALTER COLUMN primary_net_pct_oi    SET NOT NULL,
  ALTER COLUMN change_primary_long   SET NOT NULL,
  ALTER COLUMN change_primary_short  SET NOT NULL,
  ALTER COLUMN change_primary_net    SET NOT NULL;
`

/**
 * Adds `featured` to a registry created before it existed. Runs once, when the
 * column is first added, and marks the seeded instruments featured so
 * everything that was already visible stays visible. Never re-applied — a
 * later un-feature by hand must stick.
 */
async function ensureFeaturedColumn(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'instruments' AND column_name = 'featured'`
  )
  if (rows.length > 0) return

  await pool.query('ALTER TABLE instruments ADD COLUMN featured BOOLEAN NOT NULL DEFAULT false')
  await pool.query(
    'UPDATE instruments SET featured = true WHERE contract_code = ANY($1)',
    [INSTRUMENT_SEED.filter((instrument) => instrument.featured).map((instrument) => instrument.contract_code)]
  )
}

/**
 * Bootstraps the registry. DO NOTHING on conflict so re-running the migration
 * never reverts a row someone has edited since (e.g. flipped `active`).
 */
async function seedInstruments(): Promise<void> {
  for (const instrument of INSTRUMENT_SEED) {
    await pool.query(
      `INSERT INTO instruments (contract_code, display_name, exchange, category, report_format, primary_category_label, active, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (contract_code) DO NOTHING`,
      [
        instrument.contract_code, instrument.display_name, instrument.exchange, instrument.category,
        instrument.report_format, instrument.primary_category_label, instrument.active, instrument.featured
      ]
    )
  }
}

export async function migrate(): Promise<void> {
  await pool.query(CREATE_COT_REPORTS_TABLE)
  await pool.query(CREATE_INSTRUMENTS_TABLE)
  await pool.query(GENERALIZE_COT_REPORTS)
  await ensureFeaturedColumn()
  await seedInstruments()
}

import { pool } from './client'

export type ReportType = 'legacy_futures_only'

/**
 * One row per instrument per week.
 * `*_net`, `*_net_pct_oi`, and `change_*_net` are always derived by the
 * parser/service layer, never read directly off the
 * CFTC report.
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

  noncommercial_long: number
  noncommercial_short: number
  noncommercial_spreads: number
  commercial_long: number
  commercial_short: number
  total_long: number
  total_short: number
  nonreportable_long: number
  nonreportable_short: number

  change_noncommercial_long: number
  change_noncommercial_short: number
  change_noncommercial_spreads: number
  change_commercial_long: number
  change_commercial_short: number
  change_total_long: number
  change_total_short: number
  change_nonreportable_long: number
  change_nonreportable_short: number

  pct_noncommercial_long: number
  pct_noncommercial_short: number
  pct_noncommercial_spreads: number
  pct_commercial_long: number
  pct_commercial_short: number

  total_traders: number
  traders_noncommercial_long: number
  traders_noncommercial_short: number
  traders_noncommercial_spreads: number
  traders_commercial_long: number
  traders_commercial_short: number

  noncommercial_net: number
  noncommercial_net_pct_oi: number
  commercial_net: number
  commercial_net_pct_oi: number
  change_noncommercial_net: number
  change_commercial_net: number

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
`

export async function migrate(): Promise<void> {
  await pool.query(CREATE_COT_REPORTS_TABLE)
}

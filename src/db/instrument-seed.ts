import type { InstrumentRow } from './schema'

/**
 * Initial contents of the `instruments` registry. This only bootstraps a fresh
 * database — the table is the source of truth afterwards (see seedInstruments
 * in schema.ts: existing rows are never overwritten). To add a market later,
 * insert a row; no code change is needed.
 *
 * Contract codes come from the CFTC data itself, not from memory:
 *  - metals: the Legacy futures-only COMEX report (deacmxsf.htm)
 *  - financials: the TFF futures-only report (FinFutWk.txt / fut_fin_txt_YYYY.zip)
 */

const COMEX_METAL = {
  exchange: 'COMEX',
  category: 'metals',
  report_format: 'legacy',
  primary_category_label: 'Non-Commercial',
  // Already ingested and served in production.
  active: true,
  featured: true
} as const

const TFF_FINANCIAL = {
  category: 'financials',
  report_format: 'tff',
  primary_category_label: 'Leveraged Funds',
  // Stays off until ingestion has been verified and at least one week is
  // stored for the contract — see `npm run instruments:activate`.
  active: false,
  // The first markets asked for. Every other TFF contract is added, unfeatured,
  // by `npm run instruments:sync-tff`.
  featured: true
} as const

export const INSTRUMENT_SEED: readonly InstrumentRow[] = [
  { ...COMEX_METAL, contract_code: '088691', display_name: 'Gold' },
  { ...COMEX_METAL, contract_code: '088695', display_name: 'Micro Gold' },
  { ...COMEX_METAL, contract_code: '084691', display_name: 'Silver' },
  { ...COMEX_METAL, contract_code: '085692', display_name: 'Copper' },
  { ...COMEX_METAL, contract_code: '191693', display_name: 'Aluminum MWP' },
  { ...COMEX_METAL, contract_code: '191696', display_name: 'Aluminium Euro Prem Duty-Paid' },
  { ...COMEX_METAL, contract_code: '188691', display_name: 'Cobalt' },
  { ...COMEX_METAL, contract_code: '189691', display_name: 'Lithium Hydroxide' },
  { ...COMEX_METAL, contract_code: '192651', display_name: 'Steel-HRC' },
  { ...COMEX_METAL, contract_code: '192691', display_name: 'North Euro Hot-Roll Coil Steel' },

  { ...TFF_FINANCIAL, contract_code: '099741', display_name: 'EUR/USD', exchange: 'CME' },
  { ...TFF_FINANCIAL, contract_code: '097741', display_name: 'Japanese Yen', exchange: 'CME' },
  { ...TFF_FINANCIAL, contract_code: '043602', display_name: '10-Year T-Note', exchange: 'CBOT' },
  // E-mini only. CFTC also publishes 13874+ "S&P 500 Consolidated" (E-mini + Micro combined).
  { ...TFF_FINANCIAL, contract_code: '13874A', display_name: 'S&P 500 E-mini', exchange: 'CME' },
  { ...TFF_FINANCIAL, contract_code: '1170E1', display_name: 'VIX', exchange: 'CFE' }
]

import type { InstrumentCategory, ReportFormat, ReportType } from '../db/schema'

/** Display order of categories (the app's tab order). Anything sorted or grouped by category should follow it. */
export const CATEGORY_ORDER: readonly InstrumentCategory[] = ['metals', 'financials', 'energy', 'agriculture']

/**
 * Per-format facts the code owns: which report_type is stored on rows and the
 * label shown in the app header. A format needs a parser, so unlike instruments
 * these are legitimately code, not data. Served through the API so the frontend
 * needs no lookup table of its own.
 */
export const REPORT_FORMATS: Record<ReportFormat, { reportType: ReportType, label: string }> = {
  legacy: {
    reportType: 'legacy_futures_only',
    label: 'CFTC Legacy Report · Futures Only'
  },
  tff: {
    reportType: 'tff_futures_only',
    label: 'CFTC Traders in Financial Futures (TFF) · Futures Only'
  }
}

/** "financials" -> "Financials". Category slugs are single lowercase words. */
export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

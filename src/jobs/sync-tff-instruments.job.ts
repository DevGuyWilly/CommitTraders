import { planTffInstruments, type TffSyncPlan } from '../services/instrument-catalog'
import { insertInstruments, listRegisteredCodes } from '../services/instrument.service'
import { fetchTffWeekly } from '../services/cftc-tff.service'

export interface TffSyncResult extends TffSyncPlan {
  contractsInReport: number
  alreadyRegistered: number
  inserted: number
}

/**
 * Registers every contract in the current TFF report that isn't in the
 * registry yet — inactive and unfeatured, so nothing appears in the app until
 * it has been ingested, checked, and activated. Safe to re-run: existing rows
 * are never touched, so hand edits (names, featured, active) always survive.
 */
export async function syncTffInstruments({ dryRun = false }: { dryRun?: boolean } = {}): Promise<TffSyncResult> {
  const { rows } = await fetchTffWeekly()
  const existing = await listRegisteredCodes()
  const plan = planTffInstruments(rows, existing)

  return {
    ...plan,
    contractsInReport: rows.length,
    alreadyRegistered: rows.length - plan.toAdd.length,
    inserted: dryRun ? 0 : await insertInstruments(plan.toAdd)
  }
}

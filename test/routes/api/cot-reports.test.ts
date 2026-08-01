import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../../helper'
import { upsertReports } from '../../../src/services/cot.service'
import { pool } from '../../../src/db/client'
import type { CotReportRow } from '../../../src/db/schema'

const GOLD_CONTRACT_CODE = '088691'

// Far in the future so this fixture always sorts as the most recent week,
// regardless of whatever real data has already been ingested.
const FIXTURE_AS_OF_DATE = '2099-01-01'

const fixtureRow: CotReportRow = {
  instrument: 'GOLD',
  contract_market_name: 'GOLD',
  exchange: 'COMMODITY EXCHANGE INC.',
  contract_code: GOLD_CONTRACT_CODE,
  report_type: 'legacy_futures_only',
  as_of_date: FIXTURE_AS_OF_DATE,

  open_interest: 100000,
  change_open_interest: 1000,

  noncommercial_long: 60000,
  noncommercial_short: 10000,
  noncommercial_spreads: 5000,
  commercial_long: 20000,
  commercial_short: 70000,
  total_long: 85000,
  total_short: 85000,
  nonreportable_long: 15000,
  nonreportable_short: 15000,

  change_noncommercial_long: 500,
  change_noncommercial_short: -200,
  change_noncommercial_spreads: 0,
  change_commercial_long: -300,
  change_commercial_short: 400,
  change_total_long: 200,
  change_total_short: 200,
  change_nonreportable_long: 0,
  change_nonreportable_short: 0,

  pct_noncommercial_long: 60,
  pct_noncommercial_short: 10,
  pct_noncommercial_spreads: 5,
  pct_commercial_long: 20,
  pct_commercial_short: 70,

  total_traders: 200,
  traders_noncommercial_long: 100,
  traders_noncommercial_short: 40,
  traders_noncommercial_spreads: 30,
  traders_commercial_long: 25,
  traders_commercial_short: 20,

  noncommercial_net: 50000,
  noncommercial_net_pct_oi: 50,
  commercial_net: -50000,
  commercial_net_pct_oi: -50,
  change_noncommercial_net: 700,
  change_commercial_net: -700
}

test('GET /api/cot-reports/:contractCode returns history, most recent week first', async (t) => {
  await upsertReports([fixtureRow])
  t.after(() => pool.query(
    'DELETE FROM cot_reports WHERE contract_code = $1 AND as_of_date = $2',
    [GOLD_CONTRACT_CODE, FIXTURE_AS_OF_DATE]
  ))

  const app = await build(t)

  const res = await app.inject({ url: `/api/cot-reports/${GOLD_CONTRACT_CODE}` })
  assert.strictEqual(res.statusCode, 200)

  const body = JSON.parse(res.payload)
  assert.strictEqual(body.data[0].date, FIXTURE_AS_OF_DATE)
  assert.strictEqual(body.data[0].long, fixtureRow.noncommercial_long)
  assert.strictEqual(body.data[0].short, fixtureRow.noncommercial_short)
  assert.strictEqual(body.data[0].changeLong, fixtureRow.change_noncommercial_long)
  assert.strictEqual(body.data[0].changeShort, fixtureRow.change_noncommercial_short)
  assert.strictEqual(body.data[0].net, fixtureRow.noncommercial_net)
  assert.strictEqual(body.data[0].netPctOi, fixtureRow.noncommercial_net_pct_oi)
})

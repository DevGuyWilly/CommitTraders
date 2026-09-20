import { test } from 'node:test'
import * as assert from 'node:assert'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseLegacyReportText } from '../../src/services/cftc.service'

// A real Gold section from CFTC's COMEX Legacy futures-only report (week of 2026-09-15).
const goldSection = readFileSync(path.join(__dirname, '..', 'fixtures', 'legacy-gold-section.txt'), 'utf8')

test('Legacy parser: reads the section into the Non-Commercial / Commercial columns', () => {
  const [gold, ...rest] = parseLegacyReportText(goldSection)

  assert.strictEqual(rest.length, 0)
  assert.strictEqual(gold.instrument, 'GOLD')
  assert.strictEqual(gold.exchange, 'COMMODITY EXCHANGE INC.')
  assert.strictEqual(gold.contract_code, '088691')
  assert.strictEqual(gold.report_type, 'legacy_futures_only')
  assert.strictEqual(gold.as_of_date, '2026-09-15')
  assert.strictEqual(gold.open_interest, 409899)
  assert.strictEqual(gold.total_traders, 296)
  assert.strictEqual(gold.noncommercial_long, 258059)
  assert.strictEqual(gold.noncommercial_short, 27721)
  assert.strictEqual(gold.commercial_long, 56417)
  assert.strictEqual(gold.commercial_short, 318138)
})

test('Legacy parser: primary_* is the Non-Commercial group, with derived net and net % of OI', () => {
  const [gold] = parseLegacyReportText(goldSection)

  assert.strictEqual(gold.primary_long, 258059)
  assert.strictEqual(gold.primary_short, 27721)
  assert.strictEqual(gold.primary_net, 230338)
  assert.strictEqual(gold.primary_net_pct_oi, 56.19)
  assert.strictEqual(gold.change_primary_long, -2948)
  assert.strictEqual(gold.change_primary_short, -1326)
  assert.strictEqual(gold.change_primary_net, -1622)

  // The Legacy-specific columns are still populated and agree with the primary ones.
  assert.strictEqual(gold.noncommercial_net, gold.primary_net)
  assert.strictEqual(gold.noncommercial_net_pct_oi, gold.primary_net_pct_oi)
  assert.strictEqual(gold.change_noncommercial_net, gold.change_primary_net)
})

test('Legacy parser: text with no report sections yields no rows', () => {
  assert.deepStrictEqual(parseLegacyReportText('nothing to see here\n'), [])
})

import { test } from 'node:test'
import * as assert from 'node:assert'
import { exchangeDisplayName, planTffInstruments, prettifyMarketName, type DiscoveredContract } from '../../src/services/instrument-catalog'

const eur: DiscoveredContract = { contract_code: '099741', instrument: 'EURO FX', exchange: 'CHICAGO MERCANTILE EXCHANGE' }
const vix: DiscoveredContract = { contract_code: '1170E1', instrument: 'VIX FUTURES', exchange: 'CBOE FUTURES EXCHANGE' }
const unknown: DiscoveredContract = { contract_code: '999ZZ9', instrument: 'NEW CRYPTO THING PERP STYLE', exchange: 'SOME NEW EXCHANGE' }

test('exchangeDisplayName shortens known exchanges and passes unknown ones through', () => {
  assert.strictEqual(exchangeDisplayName('CHICAGO MERCANTILE EXCHANGE'), 'CME')
  assert.strictEqual(exchangeDisplayName('CHICAGO BOARD OF TRADE'), 'CBOT')
  assert.strictEqual(exchangeDisplayName('COINBASE DERIVATIVES, LLC'), 'Coinbase')
  assert.strictEqual(exchangeDisplayName('  some new exchange '), 'some new exchange')
})

test('prettifyMarketName cleans up an unknown CFTC label', () => {
  assert.strictEqual(prettifyMarketName('NEW CRYPTO THING PERP STYLE'), 'New Crypto Thing (Perp-Style)')
  assert.strictEqual(prettifyMarketName('E-MINI S&P ENERGY INDEX'), 'E-Mini S&P Energy Index')
  assert.strictEqual(prettifyMarketName('UST 2Y NOTE'), 'UST 2Y Note')
  assert.strictEqual(prettifyMarketName('MSCI EM INDEX'), 'MSCI EM Index')
})

test('planTffInstruments registers only unknown contracts, inactive and unfeatured, with curated names first', () => {
  const plan = planTffInstruments([eur, vix, unknown], new Set(['1170E1']))

  assert.deepStrictEqual(plan.toAdd.map((row) => row.contract_code), ['099741', '999ZZ9'])

  const [eurRow, newRow] = plan.toAdd
  assert.deepStrictEqual(eurRow, {
    contract_code: '099741',
    display_name: 'EUR/USD', // curated, not "Euro Fx"
    exchange: 'CME',
    category: 'financials',
    report_format: 'tff',
    primary_category_label: 'Leveraged Funds',
    active: false,
    featured: false
  })
  assert.strictEqual(newRow.display_name, 'New Crypto Thing (Perp-Style)')
  assert.strictEqual(newRow.exchange, 'SOME NEW EXCHANGE')

  assert.strictEqual(plan.curatedNames, 1)
  assert.deepStrictEqual(plan.derivedNames, [
    { contractCode: '999ZZ9', cftcName: 'NEW CRYPTO THING PERP STYLE', displayName: 'New Crypto Thing (Perp-Style)' }
  ])
})

test('planTffInstruments ignores repeats and plans nothing when everything is registered', () => {
  assert.strictEqual(planTffInstruments([eur, eur], new Set()).toAdd.length, 1)
  assert.strictEqual(planTffInstruments([eur, vix], new Set(['099741', '1170E1'])).toAdd.length, 0)
})

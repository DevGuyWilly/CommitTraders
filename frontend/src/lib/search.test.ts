import { test } from 'node:test'
import * as assert from 'node:assert'
import { matchesQuery, searchItems, type Searchable } from './search.ts'

const market = (displayName: string, instrument: string, exchange: string, contractCode: string): Searchable =>
  ({ displayName, instrument, exchange, contractCode })

// Real names, CFTC labels and codes from the registry.
const eurUsd = market('EUR/USD', 'EURO FX', 'CME', '099741')
const eurJpy = market('EUR/JPY', 'EURO FX/JAPANESE YEN XRATE', 'CME', '399741')
const yen = market('Japanese Yen', 'JAPANESE YEN', 'CME', '097741')
const tenYear = market('10-Year T-Note', 'UST 10Y NOTE', 'CBOT', '043602')
const ultraTen = market('Ultra 10-Year T-Note', 'ULTRA UST 10Y', 'CBOT', '043607')
const sp = market('S&P 500 E-mini', 'E-MINI S&P 500', 'CME', '13874A')
const sofr = market('SOFR (3-Month)', 'SOFR-3M', 'CME', '134741')
const vix = market('VIX', 'VIX FUTURES', 'CFE', '1170E1')
const btcPerp = market('Nano Bitcoin (Perp-Style)', 'NANO BITCOIN PERP STYLE', 'Coinbase', '133LM4')
const all = [eurUsd, eurJpy, yen, tenYear, ultraTen, sp, sofr, vix, btcPerp]

const names = (query: string) => searchItems(all, query).map((item) => item.displayName)

test('a blank query matches everything, in the original order', () => {
  assert.deepStrictEqual(searchItems(all, '   '), all)
  assert.strictEqual(matchesQuery(vix, ''), true)
})

test('ignores case, punctuation and spacing', () => {
  // Not the crypto contract whose "Perp-Style" happens to contain an s and a p.
  assert.deepStrictEqual(names('s&p'), ['S&P 500 E-mini'])
  assert.deepStrictEqual(names('sp500'), ['S&P 500 E-mini'])
  assert.deepStrictEqual(names('EURUSD'), ['EUR/USD'])
  assert.deepStrictEqual(names('10y'), ['10-Year T-Note', 'Ultra 10-Year T-Note'])
})

test('finds a market by its CFTC label, not just the display name', () => {
  assert.ok(names('euro fx').includes('EUR/USD'))
  assert.deepStrictEqual(names('ust 10y'), ['10-Year T-Note', 'Ultra 10-Year T-Note'])
})

test('finds a market by exchange or contract code', () => {
  assert.deepStrictEqual(names('coinbase'), ['Nano Bitcoin (Perp-Style)'])
  assert.deepStrictEqual(names('097741'), ['Japanese Yen'])
  assert.deepStrictEqual(names('1170e1'), ['VIX'])
})

test('several words match in any order, each as the start of a word', () => {
  // EUR/JPY qualifies too: its CFTC name is "EURO FX/JAPANESE YEN XRATE".
  assert.deepStrictEqual(names('yen japanese'), ['EUR/JPY', 'Japanese Yen'])
  assert.deepStrictEqual(names('sof 3'), ['SOFR (3-Month)'])
  assert.deepStrictEqual(names('perp bit'), ['Nano Bitcoin (Perp-Style)'])
})

test('ranks a name that starts with the query above one that merely contains it', () => {
  // "ultra 10-year" contains "10y"-ish text late; "10-Year T-Note" starts with it.
  assert.deepStrictEqual(names('10-year'), ['10-Year T-Note', 'Ultra 10-Year T-Note'])
  // "eur" starts both EUR/USD and EUR/JPY (original order kept) — and only those.
  assert.deepStrictEqual(names('eur'), ['EUR/USD', 'EUR/JPY'])
})

test('returns nothing for a query that matches nothing', () => {
  assert.deepStrictEqual(names('gold'), [])
  assert.strictEqual(matchesQuery(vix, 'zzz'), false)
})

test('punctuation-only input is treated as blank rather than matching nothing', () => {
  assert.deepStrictEqual(searchItems(all, '&&&'), all)
})

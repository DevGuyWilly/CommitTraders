import { test } from 'node:test'
import * as assert from 'node:assert'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { zipSync } from 'fflate'
import { extractZipText, parseTffCsv, tffHistoryUrl } from '../../src/services/cftc-tff.service'

// Real rows from CFTC's TFF futures-only files (week of 2026-09-15).
// Weekly file: no header row. Yearly file: header row first.
const weeklySample = readFileSync(path.join(__dirname, '..', 'fixtures', 'tff-weekly-sample.txt'), 'utf8')
const yearSample = readFileSync(path.join(__dirname, '..', 'fixtures', 'tff-year-sample.csv'), 'utf8')

const byCode = (text: string) => new Map(parseTffCsv(text).rows.map((row) => [row.contract_code, row]))

test('TFF parser: reads a headerless weekly file', () => {
  const { rows, skipped } = parseTffCsv(weeklySample)

  assert.strictEqual(skipped, 0)
  assert.deepStrictEqual(rows.map((row) => row.contract_code).sort(), ['099741', '1170E1', '13874A'])
})

test('TFF parser: maps Leveraged Funds into the primary_* columns (EURO FX)', () => {
  const eur = byCode(weeklySample).get('099741')!

  assert.strictEqual(eur.instrument, 'EURO FX')
  assert.strictEqual(eur.exchange, 'CHICAGO MERCANTILE EXCHANGE')
  assert.strictEqual(eur.report_type, 'tff_futures_only')
  assert.strictEqual(eur.as_of_date, '2026-09-15')

  assert.strictEqual(eur.open_interest, 920035)
  assert.strictEqual(eur.change_open_interest, -22429)
  assert.strictEqual(eur.total_traders, 318)

  // Lev_Money long/short and their week-over-week changes, straight off the file.
  assert.strictEqual(eur.primary_long, 103260)
  assert.strictEqual(eur.primary_short, 131416)
  assert.strictEqual(eur.change_primary_long, 8452)
  assert.strictEqual(eur.change_primary_short, 3323)

  // Derived: net = long - short, change = change long - change short, pct of OI to 2dp.
  assert.strictEqual(eur.primary_net, -28156)
  assert.strictEqual(eur.change_primary_net, 5129)
  assert.strictEqual(eur.primary_net_pct_oi, -3.06)
})

test('TFF parser: splits names on the last " - " so hyphenated and ampersand names survive', () => {
  const rows = byCode(weeklySample)

  const sp = rows.get('13874A')!
  assert.strictEqual(sp.instrument, 'E-MINI S&P 500')
  assert.strictEqual(sp.exchange, 'CHICAGO MERCANTILE EXCHANGE')
  assert.strictEqual(sp.primary_net, 161176 - 454319)
  assert.strictEqual(sp.primary_net_pct_oi, -11.98)

  const vix = rows.get('1170E1')!
  assert.strictEqual(vix.instrument, 'VIX FUTURES')
  assert.strictEqual(vix.exchange, 'CBOE FUTURES EXCHANGE')
})

test('TFF parser: Legacy-only columns are null, never fabricated', () => {
  const eur = byCode(weeklySample).get('099741')!

  for (const column of ['noncommercial_long', 'commercial_short', 'total_long', 'pct_noncommercial_long', 'traders_commercial_long', 'noncommercial_net', 'change_commercial_net'] as const) {
    assert.strictEqual(eur[column], null, column)
  }
})

test('TFF parser: a yearly file with a header row gives the same result as the headerless format', () => {
  const withHeader = parseTffCsv(yearSample)
  assert.deepStrictEqual(withHeader.rows.map((row) => row.as_of_date), ['2026-09-15', '2026-09-08'])

  const withoutHeader = parseTffCsv(yearSample.split('\n').slice(1).join('\n'))
  assert.deepStrictEqual(withoutHeader.rows, withHeader.rows)
})

test('TFF parser: tolerates CRLF line endings and a UTF-8 BOM', () => {
  const messy = '﻿' + yearSample.split('\n').join('\r\n')
  assert.strictEqual(parseTffCsv(messy).rows.length, 2)
})

test('TFF parser: skips and counts unreadable lines instead of storing guesses', () => {
  const [good] = weeklySample.split('\n').filter(Boolean)
  const cells = good.split(',')

  const truncated = cells.slice(0, 40).join(',')
  const badDate = [...cells.slice(0, 2), 'not-a-date', ...cells.slice(3)].join(',')
  const nonNumericPosition = cells.map((cell, i) => (i === 14 ? ' n/a' : cell)).join(',') // Lev_Money_Positions_Long_All

  const result = parseTffCsv([good, truncated, badDate, nonNumericPosition].join('\n'))

  assert.strictEqual(result.rows.length, 1)
  assert.strictEqual(result.skipped, 3)
})

test('TFF parser: "." in the Change columns (no prior week) keeps the row with no change', () => {
  const cells = weeklySample.split('\n').filter(Boolean)[0].split(',')
  for (const index of [24, 31, 32]) cells[index] = '     .' // Change_in_Open_Interest_All, Change_in_Lev_Money_Long/Short_All

  const { rows, skipped } = parseTffCsv(cells.join(','))

  assert.strictEqual(skipped, 0)
  assert.strictEqual(rows.length, 1)
  assert.strictEqual(rows[0].change_open_interest, 0)
  assert.strictEqual(rows[0].change_primary_long, 0)
  assert.strictEqual(rows[0].change_primary_short, 0)
  assert.strictEqual(rows[0].change_primary_net, 0)
  // The positions are untouched.
  assert.strictEqual(rows[0].primary_long, 103260)
})

test('TFF parser: "." in a position column is still unreadable', () => {
  const cells = weeklySample.split('\n').filter(Boolean)[0].split(',')
  cells[14] = '     .' // Lev_Money_Positions_Long_All

  assert.deepStrictEqual(parseTffCsv(cells.join(',')).skipped, 1)
})

test('TFF parser: zero open interest reads as 0%, not Infinity', () => {
  const cells = weeklySample.split('\n').filter(Boolean)[0].split(',')
  cells[7] = ' 0' // Open_Interest_All

  const [row] = parseTffCsv(cells.join(',')).rows
  assert.strictEqual(row.primary_net_pct_oi, 0)
})

test('TFF parser: refuses a file whose header lacks a column it depends on', () => {
  const [header, ...rest] = yearSample.split('\n')
  const broken = [header.replace('Lev_Money_Positions_Long_All', 'Renamed_Column'), ...rest].join('\n')

  assert.throws(() => parseTffCsv(broken), /missing expected columns: Lev_Money_Positions_Long_All/)
})

test('TFF parser: empty input yields nothing', () => {
  assert.deepStrictEqual(parseTffCsv(''), { rows: [], skipped: 0 })
})

test('extractZipText reads the single file out of a yearly archive', () => {
  const zip = zipSync({ 'FinFutYY.txt': new TextEncoder().encode(yearSample) })
  assert.strictEqual(extractZipText(zip), yearSample)
})

test('extractZipText refuses an archive with an unexpected layout', () => {
  const zip = zipSync({ 'a.txt': new Uint8Array([1]), 'b.txt': new Uint8Array([2]) })
  assert.throws(() => extractZipText(zip), /Expected one file/)
})

test('tffHistoryUrl points at the futures-only yearly archive', () => {
  assert.strictEqual(tffHistoryUrl(2025), 'https://www.cftc.gov/files/dea/history/fut_fin_txt_2025.zip')
})

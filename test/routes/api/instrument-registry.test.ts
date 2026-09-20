import { test } from 'node:test'
import * as assert from 'node:assert'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { build } from '../../helper'
import { pool } from '../../../src/db/client'
import type { CotReportRow } from '../../../src/db/schema'
import { parseLegacyReportText } from '../../../src/services/cftc.service'
import { parseTffCsv } from '../../../src/services/cftc-tff.service'
import { upsertReports } from '../../../src/services/cot.service'
import { activateInstrument, insertInstruments, listActivatableCodes } from '../../../src/services/instrument.service'
import { storeRegisteredRows } from '../../../src/jobs/weekly-cftc.job'

const fixture = (name: string) => readFileSync(path.join(__dirname, '..', '..', 'fixtures', name), 'utf8')

// Fixture contracts use a TST prefix and a far-future week so they can never
// collide with real instruments or real data, and are removed afterwards.
const AS_OF = '2099-06-01'
const CODES = {
  legacyActive: 'TST001', // active, Legacy, has data
  tffActive: 'TST002', // active, TFF, has data
  tffInactive: 'TST003', // NOT active, TFF, has data
  tffNoData: 'TST004' // active, TFF, no data yet
}

const legacyTemplate = parseLegacyReportText(fixture('legacy-gold-section.txt'))[0]
const tffTemplate = parseTffCsv(fixture('tff-weekly-sample.txt')).rows.find((row) => row.contract_code === '099741')!

const legacyRow: CotReportRow = { ...legacyTemplate, contract_code: CODES.legacyActive, instrument: 'TEST METAL', as_of_date: AS_OF }
const tffRow = (contractCode: string): CotReportRow => ({ ...tffTemplate, contract_code: contractCode, instrument: 'TEST FX', as_of_date: AS_OF })

async function insertInstrument(
  code: string,
  opts: { name: string, category: string, format: string, label: string, active: boolean, featured?: boolean }
) {
  await pool.query(
    `INSERT INTO instruments (contract_code, display_name, exchange, category, report_format, primary_category_label, active, featured)
     VALUES ($1, $2, 'TESTEX', $3, $4, $5, $6, $7)`,
    [code, opts.name, opts.category, opts.format, opts.label, opts.active, opts.featured ?? false]
  )
}

// One app for the whole file: the db plugin closes the shared pg pool when an
// app closes, so a second build() in the same process would get an ended pool.
test('registry-driven /api/cot-reports', async (t) => {
  const cleanup = async () => {
    await pool.query("DELETE FROM cot_reports WHERE contract_code LIKE 'TST%'")
    await pool.query("DELETE FROM instruments WHERE contract_code LIKE 'TST%'")
  }
  await cleanup() // in case an earlier run died half-way
  t.after(cleanup)

  await insertInstrument(CODES.legacyActive, { name: 'Test Metal', category: 'metals', format: 'legacy', label: 'Non-Commercial', active: true, featured: true })
  await insertInstrument(CODES.tffActive, { name: 'Test FX', category: 'financials', format: 'tff', label: 'Leveraged Funds', active: true, featured: true })
  await insertInstrument(CODES.tffInactive, { name: 'Test Inactive', category: 'financials', format: 'tff', label: 'Leveraged Funds', active: false })
  await insertInstrument(CODES.tffNoData, { name: 'Test No Data', category: 'financials', format: 'tff', label: 'Leveraged Funds', active: true })

  await upsertReports([legacyRow])
  const stored = await storeRegisteredRows('tff', [
    tffRow(CODES.tffActive),
    tffRow(CODES.tffInactive),
    tffRow('TSTZ99') // not in the registry
  ])

  const app = await build(t)

  await t.test('ingestion stores only registered contracts (active or not) and reports what it ignored or never saw', () => {
    assert.strictEqual(stored.rowsUpserted, 2)
    assert.strictEqual(stored.unregisteredRows, 1)
    assert.ok(stored.missingContracts.includes(CODES.tffNoData), 'a registered contract absent from the source is flagged')
    assert.ok(!stored.missingContracts.includes(CODES.tffActive))
  })

  await t.test('the list contains active instruments that have data, with registry-driven fields', async () => {
    const res = await app.inject({ url: '/api/cot-reports' })
    assert.strictEqual(res.statusCode, 200)

    const list = JSON.parse(res.payload) as Array<Record<string, unknown>>
    const fx = list.find((item) => item.contractCode === CODES.tffActive)!
    const metal = list.find((item) => item.contractCode === CODES.legacyActive)!

    assert.deepStrictEqual(
      { ...fx },
      {
        instrument: 'TEST FX',
        displayName: 'Test FX',
        contractCode: CODES.tffActive,
        exchange: 'TESTEX',
        category: 'financials',
        categoryLabel: 'Financials',
        reportFormat: 'tff',
        reportFormatLabel: 'CFTC Traders in Financial Futures (TFF) · Futures Only',
        primaryCategoryLabel: 'Leveraged Funds',
        featured: true,
        asOfDate: AS_OF,
        long: 103260,
        short: 131416,
        net: -28156,
        netPctOi: -3.06
      }
    )

    assert.strictEqual(metal.long, 258059)
    assert.strictEqual(metal.short, 27721)
    assert.strictEqual(metal.category, 'metals')
    assert.strictEqual(metal.reportFormat, 'legacy')
    assert.strictEqual(metal.primaryCategoryLabel, 'Non-Commercial')
    assert.strictEqual(metal.net, 230338)
  })

  await t.test('inactive instruments and active ones with no data are not listed', async () => {
    const list = JSON.parse((await app.inject({ url: '/api/cot-reports' })).payload) as Array<{ contractCode: string }>
    const codes = list.map((item) => item.contractCode)

    assert.ok(!codes.includes(CODES.tffInactive), 'inactive is hidden even though data exists')
    assert.ok(!codes.includes(CODES.tffNoData), 'active is hidden until real data exists')
  })

  await t.test('an unfeatured instrument is still listed, flagged so the UI can keep it behind "Load more"', async () => {
    await pool.query('UPDATE instruments SET active = true WHERE contract_code = $1', [CODES.tffInactive])
    try {
      const list = JSON.parse((await app.inject({ url: '/api/cot-reports' })).payload) as Array<{ contractCode: string, featured: boolean }>
      assert.strictEqual(list.find((item) => item.contractCode === CODES.tffInactive)?.featured, false)
      assert.strictEqual(list.find((item) => item.contractCode === CODES.tffActive)?.featured, true)
    } finally {
      await pool.query('UPDATE instruments SET active = false WHERE contract_code = $1', [CODES.tffInactive])
    }
  })

  await t.test('insertInstruments adds new rows and never overwrites an existing one', async () => {
    await pool.query("UPDATE instruments SET display_name = 'Edited by hand' WHERE contract_code = $1", [CODES.tffNoData])

    const added = await insertInstruments([
      { contract_code: CODES.tffNoData, display_name: 'Would overwrite', exchange: 'X', category: 'financials', report_format: 'tff', primary_category_label: 'Leveraged Funds', active: true, featured: true },
      { contract_code: 'TST005', display_name: 'Brand new', exchange: 'X', category: 'financials', report_format: 'tff', primary_category_label: 'Leveraged Funds', active: false, featured: false }
    ])

    assert.strictEqual(added, 1)
    const { rows } = await pool.query('SELECT contract_code, display_name, featured FROM instruments WHERE contract_code = ANY($1) ORDER BY 1', [[CODES.tffNoData, 'TST005']])
    assert.deepStrictEqual(rows, [
      { contract_code: CODES.tffNoData, display_name: 'Edited by hand', featured: false },
      { contract_code: 'TST005', display_name: 'Brand new', featured: false }
    ])
  })

  await t.test('listActivatableCodes offers inactive instruments that have data, and not those without', async () => {
    const codes = await listActivatableCodes()
    assert.ok(codes.includes(CODES.tffInactive))
    assert.ok(!codes.includes(CODES.tffNoData), 'active already, and no data')
    assert.ok(!codes.includes('TST005'), 'inactive but no data')
  })

  await t.test('the detail endpoint serves a TFF market from the same primary columns', async () => {
    const res = await app.inject({ url: `/api/cot-reports/${CODES.tffActive}` })
    assert.strictEqual(res.statusCode, 200)

    const { data } = JSON.parse(res.payload)
    assert.deepStrictEqual(data[0], {
      date: AS_OF,
      long: 103260,
      short: 131416,
      changeLong: 8452,
      changeShort: 3323,
      net: -28156,
      netPctOi: -3.06
    })
  })

  await t.test('activation is refused without data, and lists the instrument once it succeeds', async () => {
    await assert.rejects(() => activateInstrument(CODES.tffNoData), /no tff data is stored/)
    await assert.rejects(() => activateInstrument('NOPE99'), /No instrument with contract code/)

    const result = await activateInstrument(CODES.tffInactive)
    assert.strictEqual(result.weeksStored, 1)
    assert.strictEqual(result.latestAsOfDate, AS_OF)

    const list = JSON.parse((await app.inject({ url: '/api/cot-reports' })).payload) as Array<{ contractCode: string }>
    assert.ok(list.some((item) => item.contractCode === CODES.tffInactive))
    assert.ok(!list.some((item) => item.contractCode === CODES.tffNoData), 'the refused one stays hidden')
  })
})

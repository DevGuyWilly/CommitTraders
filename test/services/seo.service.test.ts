import { test } from 'node:test'
import * as assert from 'node:assert'
import type { CotInstrumentSummary, CotTableRow } from '../../src/services/cot.service'
import {
  buildInstrumentPage,
  buildNotFoundPage,
  buildOverviewPage,
  buildRobotsTxt,
  buildSitemapXml,
  escapeHtml,
  renderPage,
  resolveSiteUrl
} from '../../src/services/seo.service'

const SITE = 'https://example.com'

const TEMPLATE = '<html><head><!--app-head--></head><body><div id="root"><!--app-html--></div></body></html>'

const gold: CotInstrumentSummary = {
  instrument: 'GOLD',
  displayName: 'Gold',
  contractCode: '088691',
  exchange: 'COMEX',
  category: 'metals',
  categoryLabel: 'Metals',
  reportFormat: 'legacy',
  reportFormatLabel: 'CFTC Legacy Report · Futures Only',
  primaryCategoryLabel: 'Non-Commercial',
  featured: true,
  asOfDate: '2026-09-15',
  long: 258059,
  short: 27721,
  net: 230338,
  netPctOi: 56.19
}

const silver: CotInstrumentSummary = {
  ...gold,
  instrument: 'SILVER',
  displayName: 'Silver',
  contractCode: '084691',
  asOfDate: '2026-09-08',
  net: -1200,
  netPctOi: -4.5
}

const eurUsd: CotInstrumentSummary = {
  instrument: 'EURO FX',
  displayName: 'EUR/USD',
  contractCode: '099741',
  exchange: 'CME',
  category: 'financials',
  categoryLabel: 'Financials',
  reportFormat: 'tff',
  reportFormatLabel: 'CFTC Traders in Financial Futures (TFF) · Futures Only',
  primaryCategoryLabel: 'Leveraged Funds',
  featured: true,
  asOfDate: '2026-09-15',
  long: 103260,
  short: 131416,
  net: -28156,
  netPctOi: -3.06
}

const goldRows: CotTableRow[] = [
  { date: '2026-09-15', long: 258059, short: 27721, changeLong: 10, changeShort: -5, net: 230338, netPctOi: 56.19 }
]

test('escapeHtml escapes markup and quotes', () => {
  assert.strictEqual(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;')
})

test('renderPage fills both placeholders', () => {
  const html = renderPage(TEMPLATE, buildOverviewPage([gold], SITE), SITE)

  assert.ok(!html.includes('<!--app-head-->'))
  assert.ok(!html.includes('<!--app-html-->'))
  assert.match(html, /<title>Commitment of Traders \(COT\) Report Dashboard \| CommitTraders<\/title>/)
  assert.match(html, /<div id="root"><div id="seo-snapshot">\s*<main>/)
})

test('renderPage does not interpret "$" sequences in page content', () => {
  const page = { seo: { title: 'Costs $& more $1' }, body: '<p>$&</p>' }
  const html = renderPage(TEMPLATE, page, SITE)

  assert.ok(html.includes('<title>Costs $&amp; more $1</title>'))
  assert.ok(html.includes('<p>$&</p>'))
})

test('renderPage throws when the template lacks the placeholders', () => {
  assert.throws(() => renderPage('<html></html>', buildNotFoundPage(), SITE), /placeholders/)
})

test('overview page: canonical, JSON-LD, and a crawlable link per instrument sorted by name', () => {
  const html = renderPage(TEMPLATE, buildOverviewPage([silver, gold], SITE), SITE)

  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/" />`))
  assert.ok(html.includes('"@type":"WebSite"'))
  assert.ok(html.includes('<a href="/instruments/088691">Gold</a>'))
  assert.ok(html.includes('<a href="/instruments/084691">Silver</a>'))
  assert.ok(html.indexOf('>Gold<') < html.indexOf('>Silver<'))
  assert.ok(html.includes('as of Sep 15, 2026'), 'caption should show the most recent week')
})

test('instrument page: net long wording, canonical, breadcrumb', () => {
  const html = renderPage(TEMPLATE, buildInstrumentPage(gold, goldRows, SITE), SITE)

  assert.ok(html.includes('<title>Gold COT Report: Speculator Net Positioning | CommitTraders</title>'))
  assert.ok(html.includes('Non-Commercial were net long 230,338 contracts (56.19% of open interest) as of Sep 15, 2026'))
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/instruments/088691" />`))
  assert.ok(html.includes('"@type":"BreadcrumbList"'))
  assert.ok(html.includes('258,059 long, 27,721 short'))
})

test('overview page groups instruments by category, driven by the data rather than fixed copy', () => {
  const html = renderPage(TEMPLATE, buildOverviewPage([eurUsd, silver, gold], SITE), SITE)

  assert.ok(html.includes('<h1>Commitment of Traders (COT) Report: Metals and Financials</h1>'), 'display order, not input or alphabetical order')
  assert.ok(html.includes('<h2>Metals</h2>') && html.includes('<h2>Financials</h2>'))
  assert.ok(html.indexOf('<h2>Metals</h2>') < html.indexOf('<h2>Financials</h2>'))
  assert.ok(html.includes('<a href="/instruments/099741">EUR/USD</a>'))
  assert.ok(html.includes('<td>Leveraged Funds</td>'))
  assert.ok(html.includes('across Metals and Financials markets'))
})

test('overview page with nothing live yet has no dangling punctuation', () => {
  const html = renderPage(TEMPLATE, buildOverviewPage([], SITE), SITE)

  assert.ok(html.includes('<h1>Commitment of Traders (COT) Report</h1>'))
  assert.ok(html.includes('Weekly CFTC Commitment of Traders (COT) data. Net positioning'))
  assert.ok(!html.includes('across  '), 'no empty category list')
})

test('instrument page for a TFF market uses its own trader-group label and report format', () => {
  const html = renderPage(TEMPLATE, buildInstrumentPage(eurUsd, [], SITE), SITE)

  assert.ok(html.includes('<h1>EUR/USD &mdash; Leveraged Funds Net Positioning</h1>'))
  assert.ok(html.includes('Leveraged Funds were net short 28,156 contracts (3.06% of open interest)'))
  assert.ok(html.includes('CFTC Traders in Financial Futures (TFF) · Futures Only'))
  assert.ok(!html.includes('Non-Commercial'))
})

test('instrument page: net short and flat wording', () => {
  const short = renderPage(TEMPLATE, buildInstrumentPage(silver, [], SITE), SITE)
  assert.ok(short.includes('Non-Commercial were net short 1,200 contracts (4.50% of open interest)'))

  const flat = renderPage(TEMPLATE, buildInstrumentPage({ ...silver, net: 0, netPctOi: 0 }, [], SITE), SITE)
  assert.ok(flat.includes('Non-Commercial were flat (no net position)'))
})

test('instrument page: hostile instrument text cannot break out of HTML or JSON-LD', () => {
  const hostile = { ...gold, displayName: '</script><img src=x onerror=alert(1)>' }
  const html = renderPage(TEMPLATE, buildInstrumentPage(hostile, [], SITE), SITE)

  assert.ok(!html.includes('<img src=x'))
  assert.strictEqual(html.match(/<\/script>/g)?.length, 1, 'only the JSON-LD block\'s own closing tag')
})

test('not-found page is noindex and declares no canonical', () => {
  const html = renderPage(TEMPLATE, buildNotFoundPage(), SITE)

  assert.ok(html.includes('<meta name="robots" content="noindex" />'))
  assert.ok(!html.includes('rel="canonical"'))
})

test('robots.txt allows crawling and points at the sitemap', () => {
  assert.strictEqual(buildRobotsTxt(SITE), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
})

test('sitemap lists the home page and each instrument, with lastmod', () => {
  const xml = buildSitemapXml([silver, gold], SITE)

  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
  assert.ok(xml.includes(`<loc>${SITE}/</loc>\n    <lastmod>2026-09-15</lastmod>`), 'home lastmod is the newest week')
  assert.ok(xml.includes(`<loc>${SITE}/instruments/088691</loc>\n    <lastmod>2026-09-15</lastmod>`))
  assert.ok(xml.includes(`<loc>${SITE}/instruments/084691</loc>\n    <lastmod>2026-09-08</lastmod>`))
})

test('resolveSiteUrl prefers SITE_URL, then RENDER_EXTERNAL_URL, then the request; strips trailing slashes', () => {
  const request = { protocol: 'http', host: 'localhost:3000' }
  const saved = { site: process.env.SITE_URL, render: process.env.RENDER_EXTERNAL_URL }

  try {
    delete process.env.SITE_URL
    delete process.env.RENDER_EXTERNAL_URL
    assert.strictEqual(resolveSiteUrl(request), 'http://localhost:3000')

    process.env.RENDER_EXTERNAL_URL = 'https://app.onrender.com/'
    assert.strictEqual(resolveSiteUrl(request), 'https://app.onrender.com')

    process.env.SITE_URL = 'https://commit-traders.com'
    assert.strictEqual(resolveSiteUrl(request), 'https://commit-traders.com')
  } finally {
    if (saved.site === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = saved.site
    if (saved.render === undefined) delete process.env.RENDER_EXTERNAL_URL; else process.env.RENDER_EXTERNAL_URL = saved.render
  }
})

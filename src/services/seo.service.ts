import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { FastifyReply } from 'fastify'
import type { CotInstrumentSummary, CotTableRow } from './cot.service'
import { displayNameFor, exchangeAbbreviation } from './instruments'

/**
 * The frontend is a client-rendered SPA, so its index.html is an empty shell
 * that is identical for every URL. This module fills that shell in on the
 * server: per-page <head> tags (title, description, canonical, Open Graph,
 * JSON-LD) plus a plain-HTML snapshot of the page content inside #root, so
 * crawlers that don't run JavaScript still see real content. React replaces
 * the snapshot as soon as the app mounts.
 */

export const SITE_NAME = 'CommitTraders'

// Placeholders in frontend/index.html.
const HEAD_MARKER = '<!--app-head-->'
const BODY_MARKER = '<!--app-html-->'

export interface PageSeo {
  title: string
  description?: string
  /** Canonical path, e.g. "/instruments/088691". Omit for pages that shouldn't declare one. */
  path?: string
  noindex?: boolean
  jsonLd?: object[]
}

export interface Page {
  seo: PageSeo
  /** Crawlable HTML placed inside #root. */
  body: string
}

// Kept in step with the <title> set client-side in frontend/src/pages/Overview.tsx.
const OVERVIEW_TITLE = `Commitment of Traders (COT) Report Dashboard | ${SITE_NAME}`

const OVERVIEW_DESCRIPTION =
  'Weekly CFTC Commitment of Traders (COT) data for gold, silver, copper and other metals futures. ' +
  'Speculator net positioning, trend charts and full history.'

// ---------------------------------------------------------------------------
// Template + site URL
// ---------------------------------------------------------------------------

let cachedTemplate: string | undefined

/** The built frontend shell (frontend/dist/index.html), read once per process. */
export function loadTemplate(): string {
  if (cachedTemplate === undefined) {
    cachedTemplate = readFileSync(
      path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'),
      'utf8'
    )
  }
  return cachedTemplate
}

/**
 * Absolute origin used in canonical URLs and the sitemap. Set SITE_URL once a
 * custom domain is attached; on Render, RENDER_EXTERNAL_URL is provided
 * automatically. The request host is only a local-dev fallback — it's
 * client-controlled, so it must not decide what production canonicals say.
 */
export function resolveSiteUrl(request: { protocol: string, host: string }): string {
  const configured = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL
  return (configured ?? `${request.protocol}://${request.host}`).replace(/\/+$/, '')
}

// ---------------------------------------------------------------------------
// Escaping + formatting
// ---------------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const numberFormatter = new Intl.NumberFormat('en-US')
const pctFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

function formatSigned(value: number, formatter: Intl.NumberFormat = numberFormatter): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatter.format(Math.abs(value))}`
}

/** isoDate is YYYY-MM-DD; formatted in UTC so the server's timezone can't shift it a day. */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

function describeNet(net: number): string {
  if (net > 0) return `net long ${numberFormatter.format(net)} contracts`
  if (net < 0) return `net short ${numberFormatter.format(Math.abs(net))} contracts`
  return 'flat (no net position)'
}

/** JSON inside a <script> must not be able to close the tag early. */
function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

// ---------------------------------------------------------------------------
// Head + shell rendering
// ---------------------------------------------------------------------------

export function renderHead(seo: PageSeo, siteUrl: string): string {
  const tags = [`<title>${escapeHtml(seo.title)}</title>`]

  if (seo.description) {
    tags.push(`<meta name="description" content="${escapeHtml(seo.description)}" />`)
  }

  if (seo.noindex) {
    tags.push('<meta name="robots" content="noindex" />')
  } else if (seo.path !== undefined) {
    // A canonical on a noindex page would send contradictory signals, so it's only for indexable pages.
    const url = escapeHtml(siteUrl + seo.path)
    tags.push(
      `<link rel="canonical" href="${url}" />`,
      '<meta property="og:type" content="website" />',
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
      `<meta property="og:url" content="${url}" />`,
      '<meta name="twitter:card" content="summary" />'
    )
    if (seo.description) {
      tags.push(`<meta property="og:description" content="${escapeHtml(seo.description)}" />`)
    }
  }

  for (const block of seo.jsonLd ?? []) {
    tags.push(`<script type="application/ld+json">${serializeJsonLd(block)}</script>`)
  }

  return tags.join('\n    ')
}

/** Fills the head and body placeholders of the built index.html. */
export function renderPage(template: string, page: Page, siteUrl: string): string {
  if (!template.includes(HEAD_MARKER) || !template.includes(BODY_MARKER)) {
    throw new Error(`index.html is missing the ${HEAD_MARKER} / ${BODY_MARKER} placeholders`)
  }

  // Replacer functions, not strings: page content can contain "$&" or "$1",
  // which String.replace would otherwise interpret.
  return template
    .replace(HEAD_MARKER, () => renderHead(page.seo, siteUrl))
    .replace(BODY_MARKER, () => page.body)
}

export function sendPage(reply: FastifyReply, statusCode: number, page: Page, siteUrl: string): FastifyReply {
  return reply
    .code(statusCode)
    .type('text/html; charset=utf-8')
    .send(renderPage(loadTemplate(), page, siteUrl))
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export function buildOverviewPage(instruments: CotInstrumentSummary[], siteUrl: string): Page {
  const rows = instruments
    .map((item) => ({ ...item, name: displayNameFor(item.instrument) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const latest = rows.reduce<string | undefined>(
    (acc, item) => (!acc || item.asOfDate > acc ? item.asOfDate : acc),
    undefined
  )

  const tableRows = rows
    .map((item) => `
        <tr>
          <td><a href="/instruments/${encodeURIComponent(item.contractCode)}">${escapeHtml(item.name)}</a></td>
          <td>${escapeHtml(exchangeAbbreviation(item.exchange))}</td>
          <td>${formatSigned(item.net)}</td>
          <td>${formatSigned(item.netPctOi, pctFormatter)}%</td>
        </tr>`)
    .join('')

  const body = `
    <main>
      <h1>Commitment of Traders (COT) Report: Metals</h1>
      <p>Weekly Non-Commercial (speculator) net positioning across CME metals futures, from the CFTC Legacy
      Futures-Only report. Net = Long minus Short; positive means speculators are net long.</p>
      <table>
        <caption>Latest weekly positioning${latest ? ` (as of ${formatDate(latest)})` : ''}</caption>
        <thead>
          <tr><th scope="col">Instrument</th><th scope="col">Exchange</th><th scope="col">Net</th><th scope="col">Net % of OI</th></tr>
        </thead>
        <tbody>${tableRows}
        </tbody>
      </table>
    </main>`

  return {
    seo: {
      title: OVERVIEW_TITLE,
      description: OVERVIEW_DESCRIPTION,
      path: '/',
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${siteUrl}/`
      }]
    },
    body
  }
}

export function buildInstrumentPage(
  summary: CotInstrumentSummary,
  recentRows: CotTableRow[],
  siteUrl: string
): Page {
  const name = displayNameFor(summary.instrument)
  const exchange = exchangeAbbreviation(summary.exchange)
  const pagePath = `/instruments/${encodeURIComponent(summary.contractCode)}`
  const asOf = formatDate(summary.asOfDate)
  const latest = recentRows[0]

  const tableRows = recentRows
    .map((row) => `
        <tr>
          <td>${formatDate(row.date)}</td>
          <td>${numberFormatter.format(row.long)}</td>
          <td>${numberFormatter.format(row.short)}</td>
          <td>${formatSigned(row.net)}</td>
          <td>${formatSigned(row.netPctOi, pctFormatter)}%</td>
        </tr>`)
    .join('')

  const body = `
    <main>
      <nav aria-label="Breadcrumb"><a href="/">Markets</a> / <span>${escapeHtml(name)}</span></nav>
      <h1>${escapeHtml(name)} &mdash; Non-Commercial Net Positioning</h1>
      <p>Weekly speculator net positioning for ${escapeHtml(name)} (${escapeHtml(exchange)}), from the CFTC Legacy
      Futures-Only Commitment of Traders report. Net = Long minus Short; positive means speculators are net long.</p>
      <p>As of ${asOf}, speculators were ${describeNet(summary.net)}, ${pctFormatter.format(Math.abs(summary.netPctOi))}% of open interest${
        latest ? ` (${numberFormatter.format(latest.long)} long, ${numberFormatter.format(latest.short)} short)` : ''
      }.</p>
      <table>
        <caption>Recent weekly positions</caption>
        <thead>
          <tr><th scope="col">Week</th><th scope="col">Long</th><th scope="col">Short</th><th scope="col">Net</th><th scope="col">Net % of OI</th></tr>
        </thead>
        <tbody>${tableRows}
        </tbody>
      </table>
    </main>`

  return {
    seo: {
      // Kept in step with the <title> set client-side in frontend/src/pages/Detail.tsx.
      title: `${name} COT Report: Speculator Net Positioning | ${SITE_NAME}`,
      description:
        `${name} COT report: speculators were ${describeNet(summary.net)} ` +
        `(${pctFormatter.format(Math.abs(summary.netPctOi))}% of open interest) as of ${asOf}. ` +
        'Weekly Commitment of Traders history and chart.',
      path: pagePath,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Markets', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name, item: `${siteUrl}${pagePath}` }
        ]
      }]
    },
    body
  }
}

/** Served with a 404 status for unknown URLs and unknown contract codes. */
export function buildNotFoundPage(): Page {
  return {
    seo: { title: `Page not found | ${SITE_NAME}`, noindex: true },
    body: `
    <main>
      <h1>Page not found</h1>
      <p><a href="/">Back to all markets</a></p>
    </main>`
  }
}

/** Served with a 503 when the database can't be reached, so crawlers retry later instead of indexing a blank page. */
export function buildUnavailablePage(): Page {
  return { seo: { title: SITE_NAME }, body: '' }
}

// ---------------------------------------------------------------------------
// robots.txt + sitemap.xml
// ---------------------------------------------------------------------------

// /api/ is deliberately not disallowed: Googlebot has to fetch it to render
// the SPA. It's kept out of the index with an X-Robots-Tag header instead
// (see src/plugins/seo.ts).
export function buildRobotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
}

export function buildSitemapXml(instruments: CotInstrumentSummary[], siteUrl: string): string {
  const latest = instruments.reduce<string | undefined>(
    (acc, item) => (!acc || item.asOfDate > acc ? item.asOfDate : acc),
    undefined
  )

  const entries = [
    { loc: `${siteUrl}/`, lastmod: latest },
    ...instruments
      .slice()
      .sort((a, b) => a.contractCode.localeCompare(b.contractCode))
      .map((item) => ({
        loc: `${siteUrl}/instruments/${encodeURIComponent(item.contractCode)}`,
        lastmod: item.asOfDate
      }))
  ]

  const urls = entries
    .map(({ loc, lastmod }) =>
      `  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

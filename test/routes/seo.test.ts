import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

// These exercise the real page routes, which serve the built frontend shell —
// run `npm run build` in frontend/ first. They only read from the database.
//
// One app for the whole file: the db plugin closes the shared pg pool when an
// app closes, so a second build() in the same process would get an ended pool.
test('SEO routes', async (t) => {
  const app = await build(t)

  await t.test('GET /robots.txt allows crawling and links the sitemap', async () => {
    const res = await app.inject({ url: '/robots.txt' })
    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] as string, /^text\/plain/)
    assert.match(res.payload, /^Allow: \/$/m)
    assert.match(res.payload, /^Sitemap: .+\/sitemap\.xml$/m)
  })

  await t.test('GET /sitemap.xml is XML and includes the home page', async () => {
    const res = await app.inject({ url: '/sitemap.xml' })
    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] as string, /^application\/xml/)
    assert.match(res.payload, /<urlset /)
    assert.match(res.payload, /<loc>[^<]+\/<\/loc>/)
  })

  await t.test('GET / serves server-rendered head tags and crawlable content', async () => {
    const res = await app.inject({ url: '/' })
    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /<title>Commitment of Traders \(COT\) Report Dashboard/)
    assert.match(res.payload, /<link rel="canonical" href="[^"]+\/" \/>/)
    // The ": Metals …" suffix only appears once instruments are live, so an empty database must pass too.
    assert.match(res.payload, /<h1>Commitment of Traders \(COT\) Report(: [^<]+)?<\/h1>/)
    assert.ok(!res.payload.includes('<!--app-head-->') && !res.payload.includes('<!--app-html-->'))
  })

  await t.test('the crawler snapshot is hidden from people (no flash of an unstyled page) but stays in the HTML', async () => {
    const res = await app.inject({ url: '/' })
    assert.match(res.payload, /<div id="root"><div id="seo-snapshot">/, 'snapshot is present for crawlers')
    // The build minifies the inline <style> (no space after the colon, properties reordered).
    assert.match(res.payload, /#seo-snapshot\s*\{[^}]*clip:\s*rect\(0 0 0 0\)/, 'and hidden by the page styles')
    assert.match(res.payload, /<noscript>\s*<style>[^<]*#seo-snapshot\{[^}]*position:static/, 'but shown again when JavaScript is off')
  })

  await t.test('the splash screen is in the page, hidden without JavaScript, and stops covering the page on its own', async () => {
    const res = await app.inject({ url: '/' })
    assert.match(res.payload, /<div id="splash" aria-hidden="true">/, 'present, and ignored by screen readers')
    assert.match(res.payload, /<noscript>\s*<style>#splash\{display:none\}/, 'not left covering the page when JavaScript is off')
    assert.match(res.payload, /@keyframes splash-failsafe/, 'gives up by itself if the app never starts')
    assert.match(res.payload, /prefers-reduced-motion:\s*reduce/, 'respects reduced motion')
  })

  await t.test('GET /instruments/:contractCode returns a real 404 for an unknown contract', async () => {
    const res = await app.inject({ url: '/instruments/not-a-contract' })
    assert.strictEqual(res.statusCode, 404)
    assert.match(res.payload, /<meta name="robots" content="noindex" \/>/)
  })

  await t.test('unknown URLs return 404 with noindex instead of a 200 app shell', async () => {
    const res = await app.inject({ url: '/no/such/page' })
    assert.strictEqual(res.statusCode, 404)
    assert.match(res.payload, /<meta name="robots" content="noindex" \/>/)
  })

  await t.test('GET /index.html redirects to /', async () => {
    const res = await app.inject({ url: '/index.html' })
    assert.strictEqual(res.statusCode, 301)
    assert.strictEqual(res.headers.location, '/')
  })

  await t.test('API responses, including 404s, are marked noindex', async () => {
    const missing = await app.inject({ url: '/api/nope' })
    assert.strictEqual(missing.statusCode, 404)
    assert.strictEqual(missing.headers['x-robots-tag'], 'noindex')

    const list = await app.inject({ url: '/api/cot-reports' })
    assert.strictEqual(list.headers['x-robots-tag'], 'noindex')
  })
})

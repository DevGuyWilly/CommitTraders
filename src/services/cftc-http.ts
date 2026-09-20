export class CftcHttpError extends Error {
  constructor(readonly url: string, readonly statusCode: number) {
    super(`Failed to fetch CFTC data from ${url}: HTTP ${statusCode}`)
    this.name = 'CftcHttpError'
  }
}

// Node's built-in fetch (undici) gets TLS-fingerprinted and blocked by
// Cloudflare regardless of headers sent; got-scraping mimics a real
// browser's TLS handshake and header set to get through.
export async function fetchCftcBuffer(url: string): Promise<Buffer> {
  // got-scraping ships ESM-only; this project compiles to CommonJS, so it
  // must be loaded via dynamic import rather than a static one.
  const { gotScraping } = await import('got-scraping')
  const response = await gotScraping.get(url, { responseType: 'buffer' })

  if (response.statusCode >= 400) {
    throw new CftcHttpError(url, response.statusCode)
  }

  return response.body
}

export async function fetchCftcText(url: string): Promise<string> {
  return (await fetchCftcBuffer(url)).toString('utf8')
}

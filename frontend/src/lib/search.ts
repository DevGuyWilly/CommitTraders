export interface Searchable {
  displayName: string
  /** The raw CFTC market name, e.g. "EURO FX" for EUR/USD. */
  instrument: string
  exchange: string
  contractCode: string
}

/** Lower-case letters and digits only: "S&P 500" -> "sp500". */
function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** The words of a field, split on any punctuation: "SOFR-3M" -> ["sofr", "3m"]. */
function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

/** How well an item matches, lower is better; null = no match. */
function score(item: Searchable, query: string): number | null {
  const fields = [item.displayName, item.instrument, item.exchange, item.contractCode]
  const wanted = compact(query)
  if (wanted === '') return 0

  // Punctuation- and spacing-insensitive substring: "10y" finds "10-Year T-Note",
  // "sp500" finds "S&P 500 E-mini", "eurusd" finds "EUR/USD", "euro fx" finds it via its CFTC name.
  const name = compact(item.displayName)
  if (name.startsWith(wanted)) return 0
  if (name.includes(wanted)) return 1
  if (fields.some((field) => compact(field).includes(wanted))) return 2

  // Every typed word starts some word of the item, in any order: "yen japanese", "sofr 3".
  // Typed words split on whitespace only — splitting "s&p" on the "&" would turn it
  // into "s" and "p", which start "style" and "perp".
  const tokens = query.trim().split(/\s+/).map(compact).filter(Boolean)
  const haystack = fields.flatMap(words)
  if (tokens.length > 0 && tokens.every((token) => haystack.some((word) => word.startsWith(token)))) return 3

  return null
}

export function matchesQuery(item: Searchable, query: string): boolean {
  return score(item, query) !== null
}

/**
 * The items that match, best first (name starts with the query, then name
 * contains it, then any other field), keeping the given order among equals.
 * A blank query matches everything, unchanged.
 */
export function searchItems<T extends Searchable>(items: readonly T[], query: string): T[] {
  return items
    .map((item, index) => ({ item, index, rank: score(item, query) }))
    .filter((entry): entry is { item: T, index: number, rank: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item)
}

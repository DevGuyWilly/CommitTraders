/** Well-known metals get a clean display name; matched by prefix against raw CFTC labels. */
const KNOWN_METAL_NAMES = ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium']

const KNOWN_ACRONYMS = ['MWP', 'HRC']

function titleCaseToken(token: string): string {
  const upper = token.toUpperCase()
  if (KNOWN_ACRONYMS.includes(upper)) return upper
  if (token.length === 0) return token
  return token[0].toUpperCase() + token.slice(1).toLowerCase()
}

function titleCaseWord(word: string): string {
  return word.split('-').map(titleCaseToken).join('-')
}

/**
 * Maps a raw backend instrument label (e.g. "GOLD", "COPPER- #1",
 * "ALUMINUM MWP") to a display name. Known metals get their clean name;
 * anything else gets a generic title-case pass (with a couple of known
 * acronyms like MWP/HRC kept uppercase).
 */
export function displayNameFor(rawInstrument: string): string {
  const known = KNOWN_METAL_NAMES.find((name) => rawInstrument.toUpperCase().startsWith(name.toUpperCase()))
  if (known) return known

  return rawInstrument.split(' ').map(titleCaseWord).join(' ')
}

const EXCHANGE_ABBREVIATIONS: Record<string, string> = {
  'COMMODITY EXCHANGE INC.': 'COMEX',
  'NEW YORK MERCANTILE EXCHANGE': 'NYMEX'
}

/** Shortens a raw CFTC exchange name to its common abbreviation, e.g. "COMMODITY EXCHANGE INC." -> "COMEX". */
export function exchangeAbbreviation(rawExchange: string): string {
  return EXCHANGE_ABBREVIATIONS[rawExchange.toUpperCase()] ?? rawExchange
}

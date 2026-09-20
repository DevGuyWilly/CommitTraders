import type { InstrumentRow } from '../db/schema'

/**
 * Naming data for `npm run instruments:sync-tff`, which registers every
 * contract in the TFF report. It only supplies *initial* display names and
 * exchange labels for new rows; once a row exists in the `instruments` table
 * the table is the source of truth and is never overwritten from here.
 */

/** CFTC's exchange name -> the short form shown on cards. Unknown exchanges show the raw CFTC name. */
const EXCHANGE_NAMES: Record<string, string> = {
  'CHICAGO MERCANTILE EXCHANGE': 'CME',
  'CHICAGO BOARD OF TRADE': 'CBOT',
  'CBOE FUTURES EXCHANGE': 'CFE',
  'ICE FUTURES U.S.': 'ICE US',
  'COINBASE DERIVATIVES, LLC': 'Coinbase'
}

export function exchangeDisplayName(rawExchange: string): string {
  return EXCHANGE_NAMES[rawExchange.trim().toUpperCase()] ?? rawExchange.trim()
}

/** Curated display names, by CFTC contract code, for every contract in the report as of 2026-09. */
const TFF_DISPLAY_NAMES: Record<string, string> = {
  // Currencies
  '232741': 'Australian Dollar',
  '102741': 'Brazilian Real',
  '096742': 'British Pound',
  '090741': 'Canadian Dollar',
  '099741': 'EUR/USD',
  '299741': 'EUR/GBP',
  '399741': 'EUR/JPY',
  '097741': 'Japanese Yen',
  '095741': 'Mexican Peso',
  '112741': 'New Zealand Dollar',
  '122741': 'South African Rand',
  '092741': 'Swiss Franc',
  '098662': 'U.S. Dollar Index',

  // Interest rates
  '042601': '2-Year T-Note',
  '044601': '5-Year T-Note',
  '043602': '10-Year T-Note',
  '043607': 'Ultra 10-Year T-Note',
  '04360Y': 'Micro 10-Year Yield',
  '020601': 'T-Bond',
  '020604': 'Ultra T-Bond',
  '045601': 'Fed Funds',
  '134742': 'SOFR (1-Month)',
  '134741': 'SOFR (3-Month)',
  '047745': 'Euro Short-Term Rate',
  '342603': '2-Year ERIS SOFR Swap',
  '344606': '3-Year ERIS SOFR Swap',
  '344605': '5-Year ERIS SOFR Swap',
  '343603': '10-Year ERIS SOFR Swap',

  // Credit and commodity indexes
  '221605': 'Bloomberg High-Yield Credit',
  '221606': 'Bloomberg Investment-Grade Credit',
  '221602': 'Bloomberg Commodity Index',

  // Equity indexes
  '13874A': 'S&P 500 E-mini',
  '13874U': 'Micro S&P 500',
  '13874+': 'S&P 500 (Consolidated)',
  '13874W': 'S&P 500 Total Return (Adj. Interest Rate)',
  '43874A': 'S&P 500 Annual Dividend',
  '43874Q': 'S&P 500 Quarterly Dividend',
  '33874A': 'S&P MidCap 400 E-mini',
  '13874P': 'S&P Communication Services E-mini',
  '138748': 'S&P Consumer Staples E-mini',
  '138749': 'S&P Energy E-mini',
  '13874C': 'S&P Financials E-mini',
  '13874E': 'S&P Health Care E-mini',
  '13874F': 'S&P Industrials E-mini',
  '13874I': 'S&P Technology E-mini',
  '13874J': 'S&P Utilities E-mini',
  '209742': 'Nasdaq-100 E-mini',
  '209747': 'Micro Nasdaq-100',
  '20974+': 'Nasdaq-100 (Consolidated)',
  '239742': 'Russell 2000 E-mini',
  '239747': 'Micro Russell 2000',
  '239744': 'Russell 1000 Value E-mini',
  '239750': 'Russell 2000 Annual Dividend',
  '124603': 'Dow Jones ($5)',
  '124608': 'Micro Dow Jones',
  '12460+': 'Dow Jones (Consolidated)',
  '124606': 'Dow Jones U.S. Real Estate',
  '244041': 'MSCI EAFE',
  '244042': 'MSCI Emerging Markets',
  '240743': 'Nikkei 225 (Yen)',
  '1170E1': 'VIX',

  // Crypto
  '133741': 'Bitcoin',
  '133742': 'Micro Bitcoin',
  '133LM1': 'Nano Bitcoin',
  '133LM4': 'Nano Bitcoin (Perp-Style)',
  '133LM5': 'Bitcoin Cash (Perp-Style)',
  '146021': 'Ether',
  '146022': 'Micro Ether',
  '146LM1': 'Nano Ether',
  '146LM3': 'Nano Ether (Perp-Style)',
  '177741': 'Solana',
  '177742': 'Micro Solana',
  '177LM1': 'Nano Solana',
  '177LM3': 'Nano Solana (Perp-Style)',
  '176740': 'XRP',
  '176LM2': 'XRP',
  '176LM1': 'Nano XRP',
  '176LM3': 'Nano XRP (Perp-Style)',
  '172LM2': 'Shiba Inu 1K (Perp-Style)',
  '180LM5': 'Aave (Perp-Style)',
  '171LM1': 'Avalanche',
  '171LM2': 'Avalanche (Perp-Style)',
  '174LM2': 'Cardano (Perp-Style)',
  '170LM2': 'Chainlink (Perp-Style)',
  '183LM2': 'HYPE (Perp-Style)',
  '168DC1': 'Dogecoin',
  '168LM2': 'Dogecoin (Perp-Style)',
  '180LM6': 'Ethena (Perp-Style)',
  '180LM4': 'Hedera (Perp-Style)',
  '167LM1': 'Litecoin (Perp-Style)',
  '180LM7': 'NEAR Protocol (Perp-Style)',
  '180LM8': 'Ondo (Perp-Style)',
  '180LM9': 'PAX Gold (Perp-Style)',
  '169LM2': 'Polkadot (Perp-Style)',
  '173LM2': 'Stellar (Perp-Style)',
  '180LM3': 'Sui (Perp-Style)',
  '180LMB': 'Zcash (Perp-Style)'
}

const ACRONYMS = new Set([
  'S&P', 'DJIA', 'MSCI', 'EAFE', 'EM', 'UST', 'SOFR', 'ERIS', 'BBG', 'HY', 'IG', 'NZ', 'USD', 'US',
  'VIX', 'FX', 'XRP', 'SOL', 'SHIB'
])

/**
 * Fallback for a contract the catalog doesn't know (one CFTC adds later):
 * "SOME NEW MARKET PERP STYLE" -> "Some New Market (Perp-Style)". Good enough
 * to be readable; fix the name in the registry if it isn't right.
 */
export function prettifyMarketName(raw: string): string {
  const perpStyle = /\s+PERP STYLE$/i.test(raw)
  const base = raw.replace(/\s+PERP STYLE$/i, '').trim()

  const words = base.split(/\s+/).map((word) => {
    if (/\d/.test(word) || ACRONYMS.has(word.toUpperCase())) return word.toUpperCase()
    return word
      .split('-')
      .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase()))
      .join('-')
  })

  return words.join(' ') + (perpStyle ? ' (Perp-Style)' : '')
}

export interface DiscoveredContract {
  contract_code: string
  /** CFTC's market name, e.g. "EURO FX". */
  instrument: string
  /** CFTC's exchange name, e.g. "CHICAGO MERCANTILE EXCHANGE". */
  exchange: string
}

export interface TffSyncPlan {
  toAdd: InstrumentRow[]
  /** Names taken from the curated catalog vs cleaned up from CFTC's own label. */
  curatedNames: number
  derivedNames: Array<{ contractCode: string, cftcName: string, displayName: string }>
}

/**
 * Turns the contracts found in a TFF report into registry rows for the ones
 * not registered yet. New rows start inactive (nothing shows until data is
 * verified) and unfeatured (they sit behind "Load more" and search).
 */
export function planTffInstruments(discovered: DiscoveredContract[], existingCodes: ReadonlySet<string>): TffSyncPlan {
  const toAdd: InstrumentRow[] = []
  const derivedNames: TffSyncPlan['derivedNames'] = []
  let curatedNames = 0
  const seen = new Set<string>()

  for (const contract of discovered) {
    if (existingCodes.has(contract.contract_code) || seen.has(contract.contract_code)) continue
    seen.add(contract.contract_code)

    const curated = TFF_DISPLAY_NAMES[contract.contract_code]
    const displayName = curated ?? prettifyMarketName(contract.instrument)

    if (curated) curatedNames++
    else derivedNames.push({ contractCode: contract.contract_code, cftcName: contract.instrument, displayName })

    toAdd.push({
      contract_code: contract.contract_code,
      display_name: displayName,
      exchange: exchangeDisplayName(contract.exchange),
      category: 'financials',
      report_format: 'tff',
      primary_category_label: 'Leveraged Funds',
      active: false,
      featured: false
    })
  }

  return { toAdd, curatedNames, derivedNames }
}

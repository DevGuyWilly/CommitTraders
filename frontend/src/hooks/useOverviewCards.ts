import { useEffect, useRef, useState } from 'react'
import { fetchHistory, fetchInstrumentList } from '../api/client'
import { displayNameFor, exchangeAbbreviation } from '../lib/instruments'

export interface OverviewCard {
  instrument: string
  exchange: string
  contractCode: string
  net: number
  netPctOi: number
  long?: number
  short?: number
  href: string
}

export interface UseOverviewCardsResult {
  cards: OverviewCard[]
  updatedDate?: string
  loading: boolean
  error: Error | null
}

/**
 * One card per instrument the backend actually has data for — no fixed
 * curation. The list endpoint doesn't return long/short (only net/netPctOi),
 * so we additionally fetch each instrument's latest single row (?limit=1)
 * to fill those in, without changing the backend.
 */
export function useOverviewCards(): UseOverviewCardsResult {
  const [cards, setCards] = useState<OverviewCard[]>([])
  const [updatedDate, setUpdatedDate] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)

    fetchInstrumentList()
      .then(async (summaries) => {
        if (requestId !== requestIdRef.current) return

        const latest = summaries.reduce<string | undefined>(
          (acc, summary) => (!acc || summary.asOfDate > acc ? summary.asOfDate : acc),
          undefined
        )
        setUpdatedDate(latest)

        const details = await Promise.all(
          summaries.map((summary) => fetchHistory(summary.contractCode, { limit: 1 }).catch(() => null))
        )

        if (requestId !== requestIdRef.current) return

        const nextCards: OverviewCard[] = summaries
          .map((summary, i) => ({
            instrument: displayNameFor(summary.instrument),
            exchange: exchangeAbbreviation(summary.exchange),
            contractCode: summary.contractCode,
            net: summary.net,
            netPctOi: summary.netPctOi,
            long: details[i]?.data[0]?.long,
            short: details[i]?.data[0]?.short,
            href: `/instruments/${summary.contractCode}`
          }))
          .sort((a, b) => a.instrument.localeCompare(b.instrument))

        setCards(nextCards)
        setError(null)
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err : new Error('Failed to load market data'))
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [])

  return { cards, updatedDate, loading, error }
}

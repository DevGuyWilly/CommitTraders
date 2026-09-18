import { useEffect, useRef, useState } from 'react'
import { fetchHistory, fetchInstrumentList } from '../api/client'
import { HEADLINE_METALS, matchHeadlineInstruments } from '../lib/instruments'

export interface OverviewCard {
  instrument: string
  exchange: string
  contractCode?: string
  net?: number
  netPctOi?: number
  long?: number
  short?: number
  href?: string
}

export interface UseOverviewCardsResult {
  cards: OverviewCard[]
  updatedDate?: string
  loading: boolean
  error: Error | null
}

const emptyCards = (): OverviewCard[] =>
  HEADLINE_METALS.map((metal) => ({ instrument: metal.name, exchange: metal.exchange }))

/**
 * The list endpoint (/api/cot-reports) doesn't return long/short, only
 * net/netPctOi — so for the small, bounded set of headline metals that do
 * have data, we fetch their latest single row (?limit=1) too, to fill in
 * the card's Long/Short figures without changing the backend.
 */
export function useOverviewCards(): UseOverviewCardsResult {
  const [cards, setCards] = useState<OverviewCard[]>(emptyCards)
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

        const matched = matchHeadlineInstruments(summaries)

        const details = await Promise.all(
          matched.map(({ summary }) =>
            summary ? fetchHistory(summary.contractCode, { limit: 1 }).catch(() => null) : Promise.resolve(null)
          )
        )

        if (requestId !== requestIdRef.current) return

        // Any headline metal the backend actually has data for is linkable —
        // gated on data presence, not a fixed rollout allowlist.
        const nextCards: OverviewCard[] = matched.map(({ metal, summary }, i) => {
          if (!summary) return { instrument: metal.name, exchange: metal.exchange }

          const latestRow = details[i]?.data[0]

          return {
            instrument: metal.name,
            exchange: metal.exchange,
            contractCode: summary.contractCode,
            net: summary.net,
            netPctOi: summary.netPctOi,
            long: latestRow?.long,
            short: latestRow?.short,
            href: `/instruments/${summary.contractCode}`
          }
        })

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

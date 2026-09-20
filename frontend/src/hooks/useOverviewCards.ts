import { useEffect, useRef, useState } from 'react'
import { fetchInstrumentList } from '../api/client'

export interface OverviewCard {
  displayName: string
  /** Raw CFTC market name — not shown, but searchable ("euro fx" finds EUR/USD). */
  instrument: string
  exchange: string
  contractCode: string
  category: string
  categoryLabel: string
  reportFormatLabel: string
  primaryCategoryLabel: string
  featured: boolean
  asOfDate: string
  net: number
  netPctOi: number
  long: number
  short: number
  href: string
}

export interface UseOverviewCardsResult {
  cards: OverviewCard[]
  loading: boolean
  error: Error | null
}

/**
 * One card per instrument the backend lists — no fixed curation, and in the
 * order the API returns them (category order, then name). Everything a card
 * shows comes back in the single list response.
 */
export function useOverviewCards(): UseOverviewCardsResult {
  const [cards, setCards] = useState<OverviewCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)

    fetchInstrumentList()
      .then((summaries) => {
        if (requestId !== requestIdRef.current) return

        setCards(
          summaries.map((summary) => ({
            displayName: summary.displayName,
            instrument: summary.instrument,
            exchange: summary.exchange,
            contractCode: summary.contractCode,
            category: summary.category,
            categoryLabel: summary.categoryLabel,
            reportFormatLabel: summary.reportFormatLabel,
            primaryCategoryLabel: summary.primaryCategoryLabel,
            featured: summary.featured,
            asOfDate: summary.asOfDate,
            net: summary.net,
            netPctOi: summary.netPctOi,
            long: summary.long,
            short: summary.short,
            href: `/instruments/${summary.contractCode}`
          }))
        )
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

  return { cards, loading, error }
}

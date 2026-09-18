import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchHistory } from '../api/client'
import type { CotTableRow } from '../api/types'

const DEFAULT_LIMIT = 52

export interface UseCoTResult {
  rows: CotTableRow[]
  nextCursor: string | null
  loading: boolean
  error: Error | null
  loadMore: () => void
  hasMore: boolean
}

/**
 * Fetches weekly history for an instrument, with keyset pagination via
 * loadMore(). On a contractCode change, previous rows stay visible (not
 * cleared) while the new page loads — the caller is expected to blur/dim
 * the table using `loading` rather than swap to a spinner.
 */
export function useCoT(contractCode: string | undefined): UseCoTResult {
  const [rows, setRows] = useState<CotTableRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const requestIdRef = useRef(0)
  const rowsRef = useRef<CotTableRow[]>([])

  const runFetch = useCallback((code: string, before: string | undefined, append: boolean) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    fetchHistory(code, { limit: DEFAULT_LIMIT, before })
      .then((page) => {
        if (requestId !== requestIdRef.current) return // superseded by a newer request

        const nextRows = append ? [...rowsRef.current, ...page.data] : page.data
        rowsRef.current = nextRows
        setRows(nextRows)
        setNextCursor(page.nextCursor)
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return

        setError(err instanceof Error ? err : new Error('Failed to load data'))
        if (!append) {
          rowsRef.current = []
          setRows([])
          setNextCursor(null)
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!contractCode) return
    runFetch(contractCode, undefined, false)
  }, [contractCode, runFetch])

  const loadMore = useCallback(() => {
    if (!contractCode || !nextCursor || loading) return
    runFetch(contractCode, nextCursor, true)
  }, [contractCode, nextCursor, loading, runFetch])

  return { rows, nextCursor, loading, error, loadMore, hasMore: nextCursor !== null }
}

export { ApiError }

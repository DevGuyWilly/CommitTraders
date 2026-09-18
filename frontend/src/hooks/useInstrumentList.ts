import { useEffect, useRef, useState } from 'react'
import { fetchInstrumentList } from '../api/client'
import type { CotInstrumentSummary } from '../api/types'

export interface UseInstrumentListResult {
  instruments: CotInstrumentSummary[]
  loading: boolean
  error: Error | null
}

export function useInstrumentList(): UseInstrumentListResult {
  const [instruments, setInstruments] = useState<CotInstrumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)

    fetchInstrumentList()
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        setInstruments(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err : new Error('Failed to load instruments'))
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [])

  return { instruments, loading, error }
}

import type { CotHistoryPage, CotInstrumentSummary } from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.message ?? `Request failed with status ${res.status}`, res.status)
  }

  return res.json() as Promise<T>
}

export function fetchInstrumentList(signal?: AbortSignal): Promise<CotInstrumentSummary[]> {
  return apiFetch<CotInstrumentSummary[]>('/api/cot-reports', signal)
}

export interface FetchHistoryOptions {
  limit?: number
  before?: string
}

export function fetchHistory(
  contractCode: string,
  options: FetchHistoryOptions = {},
  signal?: AbortSignal
): Promise<CotHistoryPage> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set('limit', String(options.limit))
  if (options.before !== undefined) params.set('before', options.before)

  const query = params.toString()
  return apiFetch<CotHistoryPage>(
    `/api/cot-reports/${contractCode}${query ? `?${query}` : ''}`,
    signal
  )
}

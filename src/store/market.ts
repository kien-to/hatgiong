import { create } from 'zustand'
import { localStatus } from '@/domain/session'
import type { MarketStatus, Quote } from '@/domain/types'
import { API_BASE } from '@/lib/api'
import { backendAccounts, marketData, type DataSource } from '@/services'

const STATUS_POLL_MS = 30_000
const ALWAYS_OPEN: MarketStatus = { session: 'continuous', label: 'Mô phỏng 24/7', canTrade: true, alwaysOpen: true }

interface MarketState {
  quotes: Record<string, Quote>
  ready: boolean
  source: DataSource
  status: MarketStatus
  connect: (onQuotes: (quotes: Record<string, Quote>) => void) => () => void
}

const toMap = (quotes: Quote[]) => Object.fromEntries(quotes.map((q) => [q.symbol, q]))

async function fetchStatus(): Promise<MarketStatus> {
  if (!backendAccounts) return ALWAYS_OPEN
  try {
    const res = await fetch(`${API_BASE}/market-status`)
    if (res.ok) return (await res.json()) as MarketStatus
  } catch {
    return localStatus()
  }
  return localStatus()
}

export const useMarket = create<MarketState>()((set) => ({
  quotes: {},
  ready: false,
  source: marketData.source,
  status: backendAccounts ? localStatus() : ALWAYS_OPEN,
  connect: (onQuotes) => {
    const refreshStatus = () => void fetchStatus().then((status) => set({ status }))
    refreshStatus()
    const statusTimer = setInterval(refreshStatus, STATUS_POLL_MS)
    void marketData.getQuotes().then((q) => {
      const quotes = toMap(q)
      set({ quotes, ready: true, source: marketData.source })
      onQuotes(quotes)
    })
    const unsubscribe = marketData.subscribe((q) => {
      const quotes = toMap(q)
      set({ quotes, ready: true, source: marketData.source })
      onQuotes(quotes)
    })
    return () => {
      clearInterval(statusTimer)
      unsubscribe()
    }
  },
}))

export function changePct(q: Quote | undefined): number {
  return q ? ((q.price - q.ref) / q.ref) * 100 : 0
}

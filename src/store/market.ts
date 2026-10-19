import { create } from 'zustand'
import { marketData, type DataSource } from '@/services'
import type { Quote } from '@/domain/types'

interface MarketState {
  quotes: Record<string, Quote>
  ready: boolean
  source: DataSource
  connect: (onQuotes: (quotes: Record<string, Quote>) => void) => () => void
}

const toMap = (quotes: Quote[]) => Object.fromEntries(quotes.map((q) => [q.symbol, q]))

export const useMarket = create<MarketState>()((set) => ({
  quotes: {},
  ready: false,
  source: marketData.source,
  connect: (onQuotes) => {
    void marketData.getQuotes().then((q) => {
      const quotes = toMap(q)
      set({ quotes, ready: true, source: marketData.source })
      onQuotes(quotes)
    })
    return marketData.subscribe((q) => {
      const quotes = toMap(q)
      set({ quotes, ready: true, source: marketData.source })
      onQuotes(quotes)
    })
  },
}))

export function changePct(q: Quote | undefined): number {
  return q ? ((q.price - q.ref) / q.ref) * 100 : 0
}

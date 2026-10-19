import { create } from 'zustand'
import type { Stock, StockProfile } from '@/domain/types'
import { API_BASE } from '@/lib/api'
import { lookupStock, registerStocks } from '@/lib/stockRegistry'
import { marketData } from '@/services'

interface CatalogState {
  stocks: Stock[]
  bySymbol: Record<string, Stock>
  ready: boolean
  load: () => Promise<void>
  loadFundamentals: (symbol: string) => Promise<void>
}

const inFlight = new Map<string, Promise<void>>()
const loaded = new Set<string>()

function withLive(stock: Stock, live: StockProfile): Stock {
  return { ...stock, profile: { ...live, description: live.description ?? stock.profile?.description } }
}

export const useCatalog = create<CatalogState>()((set, get) => ({
  stocks: [],
  bySymbol: {},
  ready: false,

  load: async () => {
    if (get().ready) return
    const stocks = await marketData.listStocks()
    set({ stocks, bySymbol: registerStocks(stocks), ready: true })
  },

  loadFundamentals: (symbol) => {
    const key = symbol.toUpperCase()
    if (marketData.source !== 'live' || loaded.has(key)) return Promise.resolve()
    const pending = inFlight.get(key)
    if (pending) return pending
    const request = fetch(`${API_BASE}/fundamentals/${encodeURIComponent(key)}`)
      .then(async (res) => {
        loaded.add(key)
        if (!res.ok) return
        const live = (await res.json()) as StockProfile
        const stock = get().bySymbol[key] ?? lookupStock(key)
        if (!stock) return
        const updated = withLive(stock, live)
        const stocks = get().stocks.map((s) => (s.symbol === key ? updated : s))
        set({ stocks, bySymbol: registerStocks(stocks) })
      })
      .catch(() => undefined)
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
    return request
  },
}))

export const getStock = lookupStock

export function useStock(symbol: string): Stock | undefined {
  return useCatalog((s) => s.bySymbol[symbol.toUpperCase()]) ?? lookupStock(symbol)
}

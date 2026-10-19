import { create } from 'zustand'
import type { Stock } from '@/domain/types'
import { lookupStock, registerStocks } from '@/lib/stockRegistry'
import { marketData } from '@/services'

interface CatalogState {
  stocks: Stock[]
  bySymbol: Record<string, Stock>
  ready: boolean
  load: () => Promise<void>
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
}))

export const getStock = lookupStock

export function useStock(symbol: string): Stock | undefined {
  return useCatalog((s) => s.bySymbol[symbol.toUpperCase()]) ?? lookupStock(symbol)
}

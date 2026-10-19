import { SEED_STOCKS } from '@/content/stocks'
import type { Stock } from '@/domain/types'

let bySymbol: Record<string, Stock> = Object.fromEntries(SEED_STOCKS.map((s) => [s.symbol, s]))

export function registerStocks(stocks: Stock[]): Record<string, Stock> {
  bySymbol = Object.fromEntries(stocks.map((s) => [s.symbol, s]))
  return bySymbol
}

export function lookupStock(symbol: string): Stock | undefined {
  return bySymbol[symbol.toUpperCase()]
}

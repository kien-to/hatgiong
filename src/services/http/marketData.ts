import { STOCK_PROFILES } from '@/content/stocks'
import type { Candle, Quote, Range, Stock } from '@/domain/types'
import type { MarketDataService } from '../types'

const POLL_MS = 10_000

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json() as Promise<T>
}

export class HttpMarketDataService implements MarketDataService {
  readonly source = 'live' as const
  private listeners = new Set<(quotes: Quote[]) => void>()
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(private readonly baseUrl = '/api') {}

  async listStocks(): Promise<Stock[]> {
    const stocks = await getJSON<Stock[]>(`${this.baseUrl}/stocks`)
    return stocks.map((s) => (STOCK_PROFILES[s.symbol] ? { ...s, profile: STOCK_PROFILES[s.symbol] } : s))
  }

  getQuotes(): Promise<Quote[]> {
    return getJSON<Quote[]>(`${this.baseUrl}/board`)
  }

  getHistory(symbol: string, range: Range): Promise<Candle[]> {
    return getJSON<Candle[]>(`${this.baseUrl}/history/${encodeURIComponent(symbol)}?range=${range}`)
  }

  subscribe(onQuotes: (quotes: Quote[]) => void): () => void {
    this.listeners.add(onQuotes)
    if (!this.timer) this.timer = setInterval(() => void this.poll(), POLL_MS)
    return () => {
      this.listeners.delete(onQuotes)
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = undefined
      }
    }
  }

  private async poll() {
    try {
      const quotes = await this.getQuotes()
      for (const l of this.listeners) l(quotes)
    } catch {
      // Keep the last good quotes on a transient failure; the next poll retries.
    }
  }
}

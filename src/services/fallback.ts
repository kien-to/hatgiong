import type { Candle, Quote, Range, Stock } from '@/domain/types'
import type { DataSource, MarketDataService } from './types'

export class FallbackMarketDataService implements MarketDataService {
  private active: MarketDataService
  private decided: Promise<void> | undefined

  constructor(
    private readonly primary: MarketDataService,
    private readonly backup: MarketDataService,
  ) {
    this.active = primary
  }

  get source(): DataSource {
    return this.active.source
  }

  async listStocks(): Promise<Stock[]> {
    await (this.decided ?? this.getQuotes())
    try {
      return await this.active.listStocks()
    } catch {
      this.active = this.backup
      return this.backup.listStocks()
    }
  }

  async getQuotes(): Promise<Quote[]> {
    if (!this.decided) {
      let quotes: Quote[] = []
      this.decided = this.primary
        .getQuotes()
        .then((q) => {
          if (q.length === 0) throw new Error('empty quotes')
          quotes = q
        })
        .catch(() => {
          this.active = this.backup
        })
      await this.decided
      return quotes.length ? quotes : this.backup.getQuotes()
    }
    await this.decided
    return this.active.getQuotes()
  }

  async getHistory(symbol: string, range: Range): Promise<Candle[]> {
    await this.decided
    try {
      return await this.active.getHistory(symbol, range)
    } catch {
      return this.backup.getHistory(symbol, range)
    }
  }

  subscribe(onQuotes: (quotes: Quote[]) => void): () => void {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    void (this.decided ?? this.getQuotes()).then(() => {
      if (!cancelled) unsubscribe = this.active.subscribe(onQuotes)
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }
}

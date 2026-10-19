import { STOCK_PROFILES } from '@/content/stocks'
import type { Candle, Quote, Range, Stock, StockProfile } from '@/domain/types'
import { API_BASE, wsUrl } from '@/lib/api'
import type { MarketDataService } from '../types'

const POLL_MS = 10_000
const MAX_BACKOFF_MS = 30_000

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json() as Promise<T>
}

type BoardMessage = { type: 'snapshot' | 'diff'; quotes: Quote[] }

export class HttpMarketDataService implements MarketDataService {
  readonly source = 'live' as const
  private listeners = new Set<(quotes: Quote[]) => void>()
  private quotes = new Map<string, Quote>()
  private socket: WebSocket | undefined
  private pollTimer: ReturnType<typeof setInterval> | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private backoff = 1000

  constructor(private readonly baseUrl = API_BASE) {}

  async listStocks(): Promise<Stock[]> {
    const [stocks, fundamentals] = await Promise.all([
      getJSON<Stock[]>(`${this.baseUrl}/stocks`),
      getJSON<(StockProfile & { symbol: string })[]>(`${this.baseUrl}/fundamentals`).catch(() => []),
    ])
    const loaded = new Map(fundamentals.map(({ symbol, ...profile }) => [symbol, profile]))
    return stocks.map((s) => {
      const curated = STOCK_PROFILES[s.symbol]
      const fresh = loaded.get(s.symbol)
      if (!curated && !fresh) return s
      return { ...s, profile: { ...curated, ...fresh, description: fresh?.description ?? curated?.description } }
    })
  }

  async getQuotes(): Promise<Quote[]> {
    const quotes = await getJSON<Quote[]>(`${this.baseUrl}/board`)
    for (const q of quotes) this.quotes.set(q.symbol, q)
    return quotes
  }

  getHistory(symbol: string, range: Range): Promise<Candle[]> {
    return getJSON<Candle[]>(`${this.baseUrl}/history/${encodeURIComponent(symbol)}?range=${range}`)
  }

  subscribe(onQuotes: (quotes: Quote[]) => void): () => void {
    this.listeners.add(onQuotes)
    if (this.listeners.size === 1) this.connect()
    return () => {
      this.listeners.delete(onQuotes)
      if (this.listeners.size === 0) this.disconnect()
    }
  }

  private emit() {
    const all = [...this.quotes.values()]
    for (const l of this.listeners) l(all)
  }

  private connect() {
    if (typeof WebSocket === 'undefined') {
      this.startPolling()
      return
    }
    const socket = new WebSocket(wsUrl('/ws/board'))
    this.socket = socket
    socket.onopen = () => {
      this.backoff = 1000
      this.stopPolling()
    }
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as BoardMessage
      if (msg.type === 'snapshot') this.quotes.clear()
      for (const q of msg.quotes) this.quotes.set(q.symbol, q)
      this.emit()
    }
    socket.onclose = () => {
      if (this.socket !== socket || this.listeners.size === 0) return
      this.startPolling()
      this.retryTimer = setTimeout(() => this.connect(), this.backoff)
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS)
    }
  }

  private disconnect() {
    const socket = this.socket
    this.socket = undefined
    socket?.close()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.stopPolling()
  }

  private startPolling() {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => {
      this.getQuotes()
        .then(() => this.emit())
        .catch(() => undefined)
    }, POLL_MS)
  }

  private stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = undefined
  }
}

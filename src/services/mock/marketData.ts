import { SEED_STOCKS, type SeedStock } from '@/content/stocks'
import { priceLimits, roundToTick } from '@/domain/market'
import type { Candle, Quote, Range, Stock } from '@/domain/types'
import type { MarketDataService } from '../types'
import { gaussian, hashString, mulberry32 } from './random'

const HISTORY_DAYS = 250
const INTRADAY_STEPS = 54
const INTRADAY_STEP_MS = 5 * 60 * 1000
const TICK_MS = 3000
const TICKS_PER_INTRADAY_POINT = 10
const MAX_INTRADAY_POINTS = 400

const RANGE_DAYS: Record<Exclude<Range, '1D'>, number> = { '1W': 5, '1M': 22, '3M': 66, '1Y': HISTORY_DAYS }

interface SymbolState {
  stock: SeedStock
  daily: Candle[]
  intraday: Candle[]
  ref: number
  ceiling: number
  floor: number
  today: Candle
  ticks: number
}

function tradingDaysBack(count: number): number[] {
  const days: number[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  while (days.length < count) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) days.unshift(d.getTime())
    d.setDate(d.getDate() - 1)
  }
  return days
}

function buildSymbol(stock: SeedStock, days: number[]): SymbolState {
  const rand = mulberry32(hashString(stock.symbol))
  const drift = (rand() - 0.45) * 0.0012
  const returns = Array.from({ length: HISTORY_DAYS }, () => drift + gaussian(rand) * stock.volatility)
  const cumulative: number[] = []
  let acc = 0
  for (const r of returns) {
    acc += r
    cumulative.push(acc)
  }
  const last = cumulative[cumulative.length - 1]
  const closes = cumulative.map((c) => roundToTick(stock.basePrice * Math.exp(c - last), stock.exchange))

  const daily: Candle[] = closes.map((c, i) => {
    const o = i === 0 ? c : closes[i - 1]
    const wick = stock.volatility * c * 0.6
    const h = roundToTick(Math.max(o, c) + rand() * wick, stock.exchange)
    const l = roundToTick(Math.min(o, c) - rand() * wick, stock.exchange)
    const v = Math.round((0.5 + rand()) * 2_000_000 * (100_000 / stock.basePrice))
    return { t: days[i], o, h, l, c, v }
  })

  daily.pop()
  const ref = daily[daily.length - 1].c
  const { ceiling, floor } = priceLimits(ref, stock.exchange)
  const clamp = (p: number) => Math.min(ceiling, Math.max(floor, roundToTick(p, stock.exchange)))

  const dayRand = mulberry32(hashString(stock.symbol + new Date().toDateString()))
  const sessionStart = new Date()
  sessionStart.setHours(9, 0, 0, 0)
  let price = clamp(ref * (1 + gaussian(dayRand) * stock.volatility * 0.25))
  const intraday: Candle[] = []
  for (let i = 0; i < INTRADAY_STEPS; i++) {
    if (i > 0) price = clamp(price * (1 + gaussian(dayRand) * stock.volatility * 0.14))
    intraday.push({ t: sessionStart.getTime() + i * INTRADAY_STEP_MS, o: price, h: price, l: price, c: price, v: 0 })
  }
  const prices = intraday.map((p) => p.c)
  const today: Candle = {
    t: days[days.length - 1],
    o: prices[0],
    h: Math.max(...prices),
    l: Math.min(...prices),
    c: prices[prices.length - 1],
    v: Math.round(daily[daily.length - 1].v * (0.4 + dayRand() * 0.4)),
  }
  return { stock, daily, intraday, ref, ceiling, floor, today, ticks: 0 }
}

function toQuote(s: SymbolState): Quote {
  return {
    symbol: s.stock.symbol,
    price: s.today.c,
    ref: s.ref,
    ceiling: s.ceiling,
    floor: s.floor,
    open: s.today.o,
    high: s.today.h,
    low: s.today.l,
    volume: s.today.v,
  }
}

export class MockMarketDataService implements MarketDataService {
  readonly source = 'simulated' as const
  private state: Map<string, SymbolState>
  private listeners = new Set<(quotes: Quote[]) => void>()
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(stocks: SeedStock[] = SEED_STOCKS) {
    const days = tradingDaysBack(HISTORY_DAYS)
    this.state = new Map(stocks.map((s) => [s.symbol, buildSymbol(s, days)]))
  }

  async listStocks(): Promise<Stock[]> {
    return [...this.state.values()].map((s) => s.stock)
  }

  async getQuotes(): Promise<Quote[]> {
    return [...this.state.values()].map(toQuote)
  }

  async getHistory(symbol: string, range: Range): Promise<Candle[]> {
    const s = this.state.get(symbol)
    if (!s) return []
    if (range === '1D') return s.intraday.map((c) => ({ ...c }))
    const all = [...s.daily, { ...s.today }]
    return all.slice(-RANGE_DAYS[range])
  }

  subscribe(onQuotes: (quotes: Quote[]) => void): () => void {
    this.listeners.add(onQuotes)
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS)
    return () => {
      this.listeners.delete(onQuotes)
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = undefined
      }
    }
  }

  private tick() {
    for (const s of this.state.values()) {
      s.ticks++
      if (Math.random() < 0.55) {
        const step = gaussian(Math.random) * s.stock.volatility * 0.09
        const next = Math.min(s.ceiling, Math.max(s.floor, roundToTick(s.today.c * (1 + step), s.stock.exchange)))
        s.today = { ...s.today, c: next, h: Math.max(s.today.h, next), l: Math.min(s.today.l, next) }
      }
      s.today.v += Math.round(Math.random() * 3000) * 10
      const lastPoint = s.intraday[s.intraday.length - 1]
      if (s.ticks % TICKS_PER_INTRADAY_POINT === 0) {
        s.intraday.push({ t: Date.now(), o: s.today.c, h: s.today.c, l: s.today.c, c: s.today.c, v: 0 })
        if (s.intraday.length > MAX_INTRADAY_POINTS) s.intraday.shift()
      } else {
        s.intraday[s.intraday.length - 1] = { ...lastPoint, c: s.today.c, h: s.today.c, l: s.today.c, o: s.today.c }
      }
    }
    const quotes = [...this.state.values()].map(toQuote)
    for (const l of this.listeners) l(quotes)
  }
}

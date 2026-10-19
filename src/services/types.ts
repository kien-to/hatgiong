import type { PlaceResult } from '@/domain/trading'
import type { Account, Candle, Exchange, ExperienceLevel, Order, OrderRequest, Profile, Quote, QuizAttempt, QuizResult, Range, SessionUser, Stock } from '@/domain/types'

export interface UserSnapshot {
  user: SessionUser | null
  profile: Profile
  onboarded: boolean
  account: Account
  watchlist: string[]
  quizResults: Record<string, QuizResult>
  quizAttempts: QuizAttempt[]
}

export interface AccountService {
  load(): Promise<UserSnapshot>
  saveProfile(profile: Profile, onboarded: boolean): Promise<void>
  placeOrder(req: OrderRequest, stock: Stock, quote: Quote): Promise<PlaceResult>
  cancelOrder(id: string): Promise<Account>
  resetAccount(): Promise<Account>
  setWatch(symbol: string, on: boolean): Promise<string[]>
  recordQuiz(lessonId: string, score: number, total: number, answers: Record<string, number>): Promise<void>
  /** Called on every quote update; returns orders that filled since the last sync, or null if nothing changed. */
  sync(account: Account, quotes: Record<string, Quote>): Promise<{ account: Account; filled: Order[] } | null>
}

export type DataSource = 'live' | 'simulated'

export interface MarketDataService {
  readonly source: DataSource
  listStocks(): Promise<Stock[]>
  getQuotes(): Promise<Quote[]>
  getHistory(symbol: string, range: Range): Promise<Candle[]>
  subscribe(onQuotes: (quotes: Quote[]) => void): () => void
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface TutorPosition {
  symbol: string
  sector: string
  weightPct: number
  pnlPct: number
}

export interface TutorContext {
  page: 'home' | 'stock' | 'portfolio' | 'learn' | 'other'
  level: ExperienceLevel
  name: string
  cash: number
  equity: number
  startingCash: number
  positions: TutorPosition[]
  filledOrders: number
  recentTrades: { symbol: string; side: 'buy' | 'sell'; qty: number; price: number; reason?: string; daysAgo: number; changeSincePct?: number }[]
  stock?: {
    symbol: string
    name: string
    sector: string
    exchange: Exchange
    price: number
    ref: number
    ceiling: number
    floor: number
    changePct: number
    approxPe?: number
    approxDividendYield?: number
  }
}

export type InsightTone = 'info' | 'warning' | 'success'

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  body: string
  ask?: string
}

export interface AIService {
  reply(message: string, history: ChatMessage[], context: TutorContext): AsyncIterable<string>
  suggestions(context: TutorContext): string[]
  insights(context: TutorContext): Insight[]
}

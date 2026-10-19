export type Exchange = 'HOSE' | 'HNX' | 'UPCOM'

export interface StockProfile {
  description?: string | null
  pe?: number | null
  pb?: number | null
  eps?: number | null
  roe?: number | null
  dividendYield?: number | null
  marketCapTrillion?: number
  source?: string
  asOf?: string
}

export interface Stock {
  symbol: string
  name: string
  shortName?: string | null
  exchange: Exchange
  sector: string
  type?: 'STOCK' | 'ETF'
  profile?: StockProfile
}

export interface Quote {
  symbol: string
  price: number
  ref: number
  ceiling: number
  floor: number
  open: number
  high: number
  low: number
  volume: number
  listedShares?: number
}

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type Range = '1D' | '1W' | '1M' | '3M' | '1Y'

export type Side = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'
export type OrderStatus = 'filled' | 'pending' | 'cancelled' | 'expired'

export interface OrderRequest {
  symbol: string
  side: Side
  type: OrderType
  qty: number
  limitPrice?: number
  note?: string
}

export interface Order extends Omit<OrderRequest, 'note'> {
  note?: string | null
  id: string
  status: OrderStatus
  fillPrice?: number
  fee: number
  tax: number
  createdAt: number
  filledAt?: number
}

export interface Position {
  symbol: string
  qty: number
  avgCost: number
}

export interface EquityPoint {
  t: number
  v: number
}

export interface DividendPayout {
  symbol: string
  kind: 'cash_dividend' | 'stock_dividend'
  exDate: string
  payDate: string
  qty: number
  cash: number
  tax: number
  shares: number
  paid: boolean
}

export interface Account {
  startingCash: number
  cash: number
  realizedPnl: number
  positions: Record<string, Position>
  unsettled?: Record<string, number>
  orders: Order[]
  equityHistory: EquityPoint[]
  dividends?: DividendPayout[]
}

export interface QuizAttempt {
  lessonId: string
  score: number
  total: number
  answers: Record<string, number>
  createdAt: number
}

export type MarketSession = 'ato' | 'continuous' | 'lunch' | 'atc' | 'closing' | 'pre' | 'closed' | 'weekend' | 'holiday'

export interface MarketStatus {
  session: MarketSession
  label: string
  canTrade: boolean
  alwaysOpen?: boolean
}

export type ExperienceLevel = 'newbie' | 'some' | 'experienced'

export interface Profile {
  name: string
  level: ExperienceLevel
}

export interface QuizResult {
  score: number
  total: number
  attempts: number
  completedAt: number
}

export interface SessionUser {
  id: string
  email: string | null
  isAnonymous: boolean
}

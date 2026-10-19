export type Exchange = 'HOSE' | 'HNX' | 'UPCOM'

export interface StockProfile {
  description: string
  pe: number
  dividendYield: number
  marketCapTrillion: number
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
export type OrderStatus = 'filled' | 'pending' | 'cancelled'

export interface OrderRequest {
  symbol: string
  side: Side
  type: OrderType
  qty: number
  limitPrice?: number
}

export interface Order extends OrderRequest {
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

export interface Account {
  startingCash: number
  cash: number
  realizedPnl: number
  positions: Record<string, Position>
  orders: Order[]
  equityHistory: EquityPoint[]
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

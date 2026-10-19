import { LOT_SIZE, isOnTick, orderFee, sellTax } from './market'
import type { Account, Order, OrderRequest, Position, Quote, Stock } from './types'

export type LessonTopic = 'lot' | 'price-band' | 'tick' | 'buying-power' | 'holdings' | 'quantity'

export interface OrderError {
  message: string
  topic?: LessonTopic
}

export type PlaceResult = { ok: true; account: Account; order: Order } | { ok: false; error: OrderError }

export interface OrderEstimate {
  price: number
  value: number
  fee: number
  tax: number
  total: number
}

export function createAccount(startingCash: number, now: number): Account {
  return {
    startingCash,
    cash: startingCash,
    realizedPnl: 0,
    positions: {},
    orders: [],
    equityHistory: [{ t: now, v: startingCash }],
  }
}

export function reservedCash(account: Account): number {
  return account.orders
    .filter((o) => o.status === 'pending' && o.side === 'buy')
    .reduce((sum, o) => {
      const value = (o.limitPrice ?? 0) * o.qty
      return sum + value + orderFee(value)
    }, 0)
}

export function buyingPower(account: Account): number {
  return account.cash - reservedCash(account)
}

export function availableToSell(account: Account, symbol: string): number {
  const held = account.positions[symbol]?.qty ?? 0
  const pending = account.orders
    .filter((o) => o.status === 'pending' && o.side === 'sell' && o.symbol === symbol)
    .reduce((sum, o) => sum + o.qty, 0)
  return held - pending
}

export function estimateOrder(req: Pick<OrderRequest, 'side' | 'type' | 'qty' | 'limitPrice'>, marketPrice: number): OrderEstimate {
  const price = req.type === 'limit' && req.limitPrice ? req.limitPrice : marketPrice
  const value = price * req.qty
  const fee = orderFee(value)
  const tax = req.side === 'sell' ? sellTax(value) : 0
  const total = req.side === 'buy' ? value + fee : value - fee - tax
  return { price, value, fee, tax, total }
}

export function validateOrder(account: Account, req: OrderRequest, stock: Stock, quote: Quote): OrderError | null {
  if (!Number.isInteger(req.qty) || req.qty <= 0) {
    return { message: 'Số lượng phải là số nguyên dương.', topic: 'quantity' }
  }
  const available = availableToSell(account, req.symbol)
  if (req.side === 'buy' && req.qty % LOT_SIZE !== 0) {
    return { message: `Lệnh mua phải theo lô ${LOT_SIZE} cổ phiếu (ví dụ 100, 200, 300…).`, topic: 'lot' }
  }
  if (req.side === 'sell' && req.qty % LOT_SIZE !== 0 && req.qty !== available) {
    return { message: `Lệnh bán phải theo lô ${LOT_SIZE}, trừ khi bạn bán hết số cổ phiếu lẻ còn lại.`, topic: 'lot' }
  }
  if (req.type === 'limit') {
    const p = req.limitPrice ?? 0
    if (p < quote.floor || p > quote.ceiling) {
      return { message: `Giá đặt phải nằm trong biên độ hôm nay: từ giá sàn đến giá trần.`, topic: 'price-band' }
    }
    if (!isOnTick(p, stock.exchange)) {
      return { message: 'Giá đặt không đúng bước giá của sàn.', topic: 'tick' }
    }
  }
  if (req.side === 'buy') {
    const { total } = estimateOrder(req, quote.price)
    if (total > buyingPower(account)) {
      return { message: 'Sức mua không đủ cho lệnh này (đã tính cả phí giao dịch).', topic: 'buying-power' }
    }
  } else if (req.qty > available) {
    return { message: `Bạn chỉ có ${available} cổ phiếu ${req.symbol} có thể bán.`, topic: 'holdings' }
  }
  return null
}

function isMarketable(order: Pick<Order, 'side' | 'type' | 'limitPrice'>, price: number): boolean {
  if (order.type === 'market') return true
  const limit = order.limitPrice ?? 0
  return order.side === 'buy' ? price <= limit : price >= limit
}

function applyFill(account: Account, order: Order, fillPrice: number, now: number): { account: Account; order: Order } {
  const value = fillPrice * order.qty
  const fee = orderFee(value)
  const tax = order.side === 'sell' ? sellTax(value) : 0
  const positions = { ...account.positions }
  const existing: Position | undefined = positions[order.symbol]
  let cash = account.cash
  let realizedPnl = account.realizedPnl

  if (order.side === 'buy') {
    cash -= value + fee
    const prevQty = existing?.qty ?? 0
    const prevCost = (existing?.avgCost ?? 0) * prevQty
    const qty = prevQty + order.qty
    positions[order.symbol] = { symbol: order.symbol, qty, avgCost: (prevCost + value + fee) / qty }
  } else {
    cash += value - fee - tax
    const avgCost = existing?.avgCost ?? fillPrice
    realizedPnl += value - fee - tax - avgCost * order.qty
    const qty = (existing?.qty ?? 0) - order.qty
    if (qty > 0) positions[order.symbol] = { symbol: order.symbol, qty, avgCost }
    else delete positions[order.symbol]
  }

  const filled: Order = { ...order, status: 'filled', fillPrice, fee, tax, filledAt: now }
  return { account: { ...account, cash, realizedPnl, positions }, order: filled }
}

export function placeOrder(account: Account, req: OrderRequest, stock: Stock, quote: Quote, now: number, id: string): PlaceResult {
  const error = validateOrder(account, req, stock, quote)
  if (error) return { ok: false, error }

  const order: Order = { ...req, id, status: 'pending', fee: 0, tax: 0, createdAt: now }
  if (isMarketable(order, quote.price)) {
    const result = applyFill(account, order, quote.price, now)
    return { ok: true, account: { ...result.account, orders: [result.order, ...account.orders] }, order: result.order }
  }
  return { ok: true, account: { ...account, orders: [order, ...account.orders] }, order }
}

export function processPendingOrders(account: Account, quotes: Record<string, Quote>, now: number): { account: Account; filled: Order[] } {
  const filled: Order[] = []
  let next = account
  for (const order of account.orders) {
    if (order.status !== 'pending') continue
    const quote = quotes[order.symbol]
    if (!quote || !isMarketable(order, quote.price)) continue
    const result = applyFill(next, order, order.limitPrice ?? quote.price, now)
    next = { ...result.account, orders: next.orders.map((o) => (o.id === order.id ? result.order : o)) }
    filled.push(result.order)
  }
  return { account: next, filled }
}

export function cancelOrder(account: Account, id: string): Account {
  return {
    ...account,
    orders: account.orders.map((o) => (o.id === id && o.status === 'pending' ? { ...o, status: 'cancelled' } : o)),
  }
}

export function holdingsValue(account: Account, quotes: Record<string, Quote>): number {
  return Object.values(account.positions).reduce((sum, p) => sum + p.qty * (quotes[p.symbol]?.price ?? p.avgCost), 0)
}

export function totalEquity(account: Account, quotes: Record<string, Quote>): number {
  return account.cash + holdingsValue(account, quotes)
}

export function dayChange(account: Account, quotes: Record<string, Quote>): number {
  return Object.values(account.positions).reduce((sum, p) => {
    const q = quotes[p.symbol]
    return q ? sum + p.qty * (q.price - q.ref) : sum
  }, 0)
}

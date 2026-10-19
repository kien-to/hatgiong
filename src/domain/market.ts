import type { Exchange } from './types'

export const LOT_SIZE = 100
export const BROKER_FEE_RATE = 0.0015
export const SELL_TAX_RATE = 0.001
export const STARTING_CASH = 100_000_000

const PRICE_BAND: Record<Exchange, number> = { HOSE: 0.07, HNX: 0.1, UPCOM: 0.15 }

export function priceBandPct(exchange: Exchange): number {
  return PRICE_BAND[exchange]
}

export function tickSize(price: number, exchange: Exchange): number {
  if (exchange !== 'HOSE') return 100
  if (price < 10_000) return 10
  if (price < 50_000) return 50
  return 100
}

export function roundToTick(price: number, exchange: Exchange, mode: 'nearest' | 'down' | 'up' = 'nearest'): number {
  const tick = tickSize(price, exchange)
  const units = price / tick
  const rounded = mode === 'down' ? Math.floor(units) : mode === 'up' ? Math.ceil(units) : Math.round(units)
  return rounded * tick
}

export function priceLimits(ref: number, exchange: Exchange): { ceiling: number; floor: number } {
  const band = PRICE_BAND[exchange]
  return {
    ceiling: roundToTick(ref * (1 + band), exchange, 'down'),
    floor: roundToTick(ref * (1 - band), exchange, 'up'),
  }
}

export function isOnTick(price: number, exchange: Exchange): boolean {
  return price % tickSize(price, exchange) === 0
}

export function orderFee(value: number): number {
  return Math.round(value * BROKER_FEE_RATE)
}

export function sellTax(value: number): number {
  return Math.round(value * SELL_TAX_RATE)
}

export type PriceZone = 'ceiling' | 'floor' | 'ref' | 'up' | 'down'

export function priceZone(price: number, ref: number, ceiling: number, floor: number): PriceZone {
  if (price >= ceiling) return 'ceiling'
  if (price <= floor) return 'floor'
  if (price === ref) return 'ref'
  return price > ref ? 'up' : 'down'
}

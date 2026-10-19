import { describe, expect, it } from 'vitest'
import { SEED_BY_SYMBOL } from '@/content/stocks'
import { priceLimits, roundToTick, tickSize } from './market'
import { availableToSell, buyingPower, cancelOrder, createAccount, placeOrder, processPendingOrders } from './trading'
import type { Quote } from './types'

const VNM = SEED_BY_SYMBOL.VNM
const quote = (price: number, ref = 60_000): Quote => {
  const { ceiling, floor } = priceLimits(ref, 'HOSE')
  return { symbol: 'VNM', price, ref, ceiling, floor, open: ref, high: price, low: price, volume: 0 }
}

describe('market rules', () => {
  it('uses HOSE tick sizes', () => {
    expect(tickSize(9_990, 'HOSE')).toBe(10)
    expect(tickSize(28_000, 'HOSE')).toBe(50)
    expect(tickSize(62_000, 'HOSE')).toBe(100)
    expect(tickSize(15_000, 'HNX')).toBe(100)
    expect(roundToTick(28_020, 'HOSE')).toBe(28_000)
  })

  it('computes ceiling and floor inside the band', () => {
    expect(priceLimits(60_000, 'HOSE')).toEqual({ ceiling: 64_200, floor: 55_800 })
    expect(priceLimits(28_000, 'HOSE')).toEqual({ ceiling: 29_950, floor: 26_050 })
    expect(priceLimits(15_000, 'HNX')).toEqual({ ceiling: 16_500, floor: 13_500 })
  })
})

describe('trading engine', () => {
  it('fills a market buy with fees folded into cost basis', () => {
    const r = placeOrder(createAccount(100_000_000, 0), { symbol: 'VNM', side: 'buy', type: 'market', qty: 100 }, VNM, quote(60_000), 1, 'a')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.order.status).toBe('filled')
    expect(r.order.fee).toBe(9_000)
    expect(r.account.cash).toBe(100_000_000 - 6_000_000 - 9_000)
    expect(r.account.positions.VNM.avgCost).toBe(60_090)
  })

  it('rejects odd lots, out-of-band prices, off-tick prices and overspending', () => {
    const acct = createAccount(100_000_000, 0)
    const q = quote(60_000)
    const err = (req: Parameters<typeof placeOrder>[1]) => {
      const r = placeOrder(acct, req, VNM, q, 1, 'x')
      return r.ok ? null : r.error.topic
    }
    expect(err({ symbol: 'VNM', side: 'buy', type: 'market', qty: 150 })).toBe('lot')
    expect(err({ symbol: 'VNM', side: 'buy', type: 'limit', qty: 100, limitPrice: 70_000 })).toBe('price-band')
    expect(err({ symbol: 'VNM', side: 'buy', type: 'limit', qty: 100, limitPrice: 60_050 })).toBe('tick')
    expect(err({ symbol: 'VNM', side: 'buy', type: 'market', qty: 2_000 })).toBe('buying-power')
    expect(err({ symbol: 'VNM', side: 'sell', type: 'market', qty: 100 })).toBe('holdings')
  })

  it('reserves cash for a resting limit buy and fills it when price drops', () => {
    const acct = createAccount(100_000_000, 0)
    const r = placeOrder(acct, { symbol: 'VNM', side: 'buy', type: 'limit', qty: 100, limitPrice: 58_000 }, VNM, quote(60_000), 1, 'p')
    if (!r.ok) throw new Error(r.error.message)
    expect(r.order.status).toBe('pending')
    expect(buyingPower(r.account)).toBe(100_000_000 - 5_800_000 - 8_700)

    const untouched = processPendingOrders(r.account, { VNM: quote(59_000) }, 2)
    expect(untouched.filled).toHaveLength(0)

    const hit = processPendingOrders(r.account, { VNM: quote(57_900) }, 3)
    expect(hit.filled).toHaveLength(1)
    expect(hit.account.positions.VNM.qty).toBe(100)
    expect(buyingPower(hit.account)).toBe(hit.account.cash)
  })

  it('charges sell tax and books realized P&L', () => {
    let acct = createAccount(100_000_000, 0)
    const buy = placeOrder(acct, { symbol: 'VNM', side: 'buy', type: 'market', qty: 200 }, VNM, quote(60_000), 1, 'b')
    if (!buy.ok) throw new Error()
    acct = buy.account
    const sell = placeOrder(acct, { symbol: 'VNM', side: 'sell', type: 'market', qty: 100 }, VNM, quote(62_000), 2, 's')
    if (!sell.ok) throw new Error()
    expect(sell.order.tax).toBe(6_200)
    expect(sell.order.fee).toBe(9_300)
    expect(sell.account.realizedPnl).toBe(6_200_000 - 9_300 - 6_200 - 6_009_000)
    expect(sell.account.positions.VNM.qty).toBe(100)
  })

  it('holds shares for pending sells and releases them on cancel', () => {
    const buy = placeOrder(createAccount(100_000_000, 0), { symbol: 'VNM', side: 'buy', type: 'market', qty: 300 }, VNM, quote(60_000), 1, 'b')
    if (!buy.ok) throw new Error()
    const sell = placeOrder(buy.account, { symbol: 'VNM', side: 'sell', type: 'limit', qty: 200, limitPrice: 63_000 }, VNM, quote(60_000), 2, 's')
    if (!sell.ok) throw new Error()
    expect(availableToSell(sell.account, 'VNM')).toBe(100)
    expect(availableToSell(cancelOrder(sell.account, 's'), 'VNM')).toBe(300)
  })
})

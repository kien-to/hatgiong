import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { getStock, useCatalog } from '@/store/catalog'
import { holdingsValue, totalEquity } from '@/domain/trading'
import type { TutorContext } from '@/services'
import { changePct, useMarket } from '@/store/market'
import { useTutor } from '@/store/tutor'
import { useUI } from '@/store/ui'
import { useUser } from '@/store/user'

export function useTutorContext(): TutorContext {
  const { pathname } = useLocation()
  const account = useUser((s) => s.account)
  const profile = useUser((s) => s.profile)
  const quotes = useMarket((s) => s.quotes)
  const catalogReady = useCatalog((s) => s.ready)

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const page: TutorContext['page'] =
      segments.length === 0 ? 'home' : segments[0] === 'stock' ? 'stock' : segments[0] === 'portfolio' ? 'portfolio' : segments[0] === 'learn' ? 'learn' : 'other'
    const invested = holdingsValue(account, quotes)
    const positions = Object.values(account.positions).map((p) => {
      const price = quotes[p.symbol]?.price ?? p.avgCost
      return {
        symbol: p.symbol,
        sector: getStock(p.symbol)?.sector ?? 'Khác',
        weightPct: invested > 0 ? ((p.qty * price) / invested) * 100 : 0,
        pnlPct: ((price - p.avgCost) / p.avgCost) * 100,
      }
    })
    const symbol = page === 'stock' ? segments[1]?.toUpperCase() : undefined
    const stock = symbol ? getStock(symbol) : undefined
    const quote = symbol ? quotes[symbol] : undefined
    return {
      page,
      level: profile.level,
      name: profile.name,
      cash: account.cash,
      equity: totalEquity(account, quotes),
      startingCash: account.startingCash,
      positions,
      filledOrders: account.orders.filter((o) => o.status === 'filled').length,
      recentTrades: account.orders
        .filter((o) => o.status === 'filled' && o.fillPrice)
        .slice(0, 10)
        .map((o) => {
          const now = quotes[o.symbol]?.price
          return {
            symbol: o.symbol,
            side: o.side,
            qty: o.qty,
            price: o.fillPrice!,
            reason: o.note ?? undefined,
            daysAgo: Math.floor((Date.now() - (o.filledAt ?? o.createdAt)) / 86_400_000),
            changeSincePct: now ? ((now - o.fillPrice!) / o.fillPrice!) * 100 : undefined,
          }
        }),
      stock:
        stock && quote
          ? {
              symbol: stock.symbol,
              name: stock.name,
              sector: stock.sector,
              exchange: stock.exchange,
              price: quote.price,
              ref: quote.ref,
              ceiling: quote.ceiling,
              floor: quote.floor,
              changePct: changePct(quote),
              approxPe: stock.profile?.pe ?? undefined,
              approxDividendYield: stock.profile?.dividendYield ?? undefined,
            }
          : undefined,
    }
  }, [pathname, account, profile, quotes, catalogReady])
}

export function useAskTutor(): (question: string) => void {
  const context = useTutorContext()
  const send = useTutor((s) => s.send)
  const setOpen = useUI((s) => s.setTutorOpen)
  return useCallback(
    (question: string) => {
      setOpen(true)
      void send(question, context)
    },
    [context, send, setOpen],
  )
}

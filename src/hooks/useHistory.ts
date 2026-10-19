import { useEffect, useMemo, useState } from 'react'
import type { Candle, Range } from '@/domain/types'
import { marketData } from '@/services'
import { useMarket } from '@/store/market'

const INTRADAY_REFRESH_MS = 30_000

export function useHistory(symbol: string, range: Range): Candle[] {
  const [data, setData] = useState<Candle[]>([])
  const quote = useMarket((s) => s.quotes[symbol])

  useEffect(() => {
    let alive = true
    const load = () => {
      void marketData.getHistory(symbol, range).then((d) => {
        if (alive) setData(d)
      })
    }
    load()
    const timer = range === '1D' ? setInterval(load, INTRADAY_REFRESH_MS) : undefined
    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [symbol, range])

  return useMemo(() => {
    if (!quote || data.length === 0) return data
    const last = data[data.length - 1]
    const merged: Candle =
      range === '1D'
        ? { ...last, o: quote.price, h: quote.price, l: quote.price, c: quote.price }
        : { ...last, c: quote.price, h: Math.max(last.h, quote.price), l: Math.min(last.l, quote.price), v: quote.volume }
    return [...data.slice(0, -1), merged]
  }, [data, quote, range])
}

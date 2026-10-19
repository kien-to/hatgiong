import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Stock } from '@/domain/types'
import { normalize } from '@/lib/text'
import { useCatalog } from '@/store/catalog'
import { useMarket } from '@/store/market'
import { ChangePill, StockLogo } from './ui'

export function SearchBox({ className = '', autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const quotes = useMarket((s) => s.quotes)
  const stocks = useCatalog((s) => s.stocks)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return []
    const exact = stocks.filter((s) => normalize(s.symbol).startsWith(q))
    const byName = stocks.filter((s) => !normalize(s.symbol).startsWith(q) && normalize(`${s.name} ${s.shortName ?? ''}`).includes(q))
    const rank = (s: Stock) => -(quotes[s.symbol] ? quotes[s.symbol].volume * quotes[s.symbol].price : 0)
    return [...exact.sort((a, b) => rank(a) - rank(b)), ...byName.sort((a, b) => rank(a) - rank(b))].slice(0, 8)
  }, [query, stocks, quotes])

  const go = (symbol: string) => {
    navigate(`/stock/${symbol}`)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2 focus-within:border-brand-500 focus-within:bg-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
            if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            if (e.key === 'Enter' && results[active]) go(results[active].symbol)
          }}
          placeholder="Tìm mã hoặc tên công ty (VNM, sữa, ngân hàng…)"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          {results.map((s, i) => (
            <button
              key={s.symbol}
              onMouseDown={() => go(s.symbol)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${i === active ? 'bg-canvas' : ''}`}
            >
              <StockLogo symbol={s.symbol} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{s.symbol}</div>
                <div className="truncate text-xs text-muted">
                  {s.exchange} · {s.shortName || s.name}
                </div>
              </div>
              {quotes[s.symbol] && <ChangePill quote={quotes[s.symbol]} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

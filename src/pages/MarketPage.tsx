import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AskButton, Card, LivePrice, Segmented, StockLogo, ZONE_TEXT, quoteZone } from '@/components/ui'
import { formatCompactVND, formatPct, formatPrice } from '@/domain/format'
import type { Exchange } from '@/domain/types'
import { useAskTutor } from '@/hooks/useTutorContext'
import { normalize } from '@/lib/text'
import { useCatalog } from '@/store/catalog'
import { changePct, useMarket } from '@/store/market'

type Sort = 'symbol' | 'change' | 'value'
type ExchangeFilter = 'ALL' | Exchange

const PAGE_SIZE = 50
const ALL_SECTORS = 'Tất cả ngành'

export function MarketPage() {
  const quotes = useMarket((s) => s.quotes)
  const source = useMarket((s) => s.source)
  const stocks = useCatalog((s) => s.stocks)
  const navigate = useNavigate()
  const ask = useAskTutor()
  const [exchange, setExchange] = useState<ExchangeFilter>('ALL')
  const [sector, setSector] = useState(ALL_SECTORS)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('value')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [exchange, sector, query, sort])

  const sectors = useMemo(() => [ALL_SECTORS, ...[...new Set(stocks.map((s) => s.sector))].sort((a, b) => a.localeCompare(b, 'vi'))], [stocks])

  const rows = useMemo(() => {
    const q = normalize(query.trim())
    return stocks
      .filter((s) => exchange === 'ALL' || s.exchange === exchange)
      .filter((s) => sector === ALL_SECTORS || s.sector === sector)
      .filter((s) => !q || normalize(s.symbol).startsWith(q) || normalize(`${s.name} ${s.shortName ?? ''}`).includes(q))
      .map((stock) => ({ stock, quote: quotes[stock.symbol] }))
      .filter((r) => r.quote)
      .sort((a, b) => {
        if (sort === 'symbol') return a.stock.symbol.localeCompare(b.stock.symbol)
        if (sort === 'change') return changePct(b.quote) - changePct(a.quote)
        return b.quote.volume * b.quote.price - a.quote.volume * a.quote.price
      })
  }, [stocks, quotes, exchange, sector, query, sort])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bảng giá</h1>
          <p className="text-sm text-muted">
            {stocks.length ? `${stocks.length.toLocaleString('vi-VN')} mã trên HOSE, HNX và UPCoM` : 'Đang tải danh sách mã…'} ·{' '}
            {source === 'live' ? 'Giá thật từ Vietcap, cập nhật mỗi 10 giây' : 'Giá mô phỏng'}
          </p>
        </div>
        <AskButton question="Giá trần, giá sàn là gì?" onAsk={ask} label="Đọc bảng giá thế nào?" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={exchange}
          onChange={setExchange}
          options={[
            { value: 'ALL', label: 'Tất cả' },
            { value: 'HOSE', label: 'HOSE' },
            { value: 'HNX', label: 'HNX' },
            { value: 'UPCOM', label: 'UPCoM' },
          ]}
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-brand-500"
        >
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lọc theo mã hoặc tên…"
          className="min-w-48 flex-1 rounded-full border border-line bg-white px-4 py-1.5 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <Legend className="bg-ceil" label="Trần" />
        <Legend className="bg-up" label="Tăng" />
        <Legend className="bg-ref" label="Tham chiếu" />
        <Legend className="bg-down" label="Giảm" />
        <Legend className="bg-floor" label="Sàn" />
        <span className="ml-auto">{rows.length.toLocaleString('vi-VN')} mã</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-canvas text-xs text-muted">
              <tr>
                <Th onClick={() => setSort('symbol')} active={sort === 'symbol'} align="left">
                  Mã
                </Th>
                <Th className="text-ref">TC</Th>
                <Th className="text-ceil">Trần</Th>
                <Th className="text-floor">Sàn</Th>
                <Th>Giá</Th>
                <Th onClick={() => setSort('change')} active={sort === 'change'}>
                  +/−
                </Th>
                <Th onClick={() => setSort('value')} active={sort === 'value'}>
                  Giá trị GD
                </Th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ stock, quote }) => {
                const zone = ZONE_TEXT[quoteZone(quote)]
                return (
                  <tr key={stock.symbol} onClick={() => navigate(`/stock/${stock.symbol}`)} className="cursor-pointer border-t border-line transition hover:bg-canvas">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <StockLogo symbol={stock.symbol} size={30} />
                        <div className="min-w-0">
                          <div className={`font-bold ${zone}`}>{stock.symbol}</div>
                          <div className="max-w-[200px] truncate text-xs text-muted">
                            {stock.exchange} · {stock.shortName || stock.sector}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-right text-ref tabular">{formatPrice(quote.ref)}</td>
                    <td className="px-3 text-right text-ceil tabular">{formatPrice(quote.ceiling)}</td>
                    <td className="px-3 text-right text-floor tabular">{formatPrice(quote.floor)}</td>
                    <td className="px-3 text-right font-bold">
                      <LivePrice quote={quote} />
                    </td>
                    <td className={`px-3 text-right font-semibold tabular ${zone}`}>{formatPct(changePct(quote))}</td>
                    <td className="px-4 text-right text-muted tabular">{formatCompactVND(quote.volume * quote.price)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="py-10 text-center text-sm text-muted">{stocks.length ? 'Không có mã nào khớp bộ lọc.' : 'Đang tải…'}</p>}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold disabled:opacity-40">
            ‹ Trước
          </button>
          <span className="text-muted tabular">
            Trang {page + 1}/{pages}
          </span>
          <button
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Sau ›
          </button>
        </div>
      )}
    </div>
  )
}

function Th({ children, onClick, active, align = 'right', className = '' }: { children: ReactNode; onClick?: () => void; active?: boolean; align?: 'left' | 'right'; className?: string }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2.5 font-semibold first:px-4 last:px-4 ${align === 'left' ? 'text-left' : 'text-right'} ${onClick ? 'cursor-pointer hover:text-ink' : ''} ${active ? 'text-ink' : ''} ${className}`}
    >
      {children}
      {active && ' ↓'}
    </th>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  )
}

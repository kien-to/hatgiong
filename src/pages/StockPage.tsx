import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CandleChart, LineChart } from '@/components/charts'
import { TradeTicket } from '@/components/TradeTicket'
import { AskButton, Card, ChangePill, PnlText, Segmented, SparkleIcon, StockLogo, ZONE_TEXT, quoteZone } from '@/components/ui'
import { useCatalog, useStock } from '@/store/catalog'
import { formatCompactVND, formatDate, formatDateTime, formatDecimal, formatNumber, formatPct, formatPrice, formatSignedVND, formatVND } from '@/domain/format'
import { priceBandPct } from '@/domain/market'
import type { Range, Side } from '@/domain/types'
import { useHistory } from '@/hooks/useHistory'
import { useAskTutor } from '@/hooks/useTutorContext'
import { useMarket } from '@/store/market'
import { useUser } from '@/store/user'

const RANGES: { value: Range; label: string }[] = [
  { value: '1D', label: '1N' },
  { value: '1W', label: '1T' },
  { value: '1M', label: '1Th' },
  { value: '3M', label: '3Th' },
  { value: '1Y', label: '1Năm' },
]

const RANGE_LABEL: Record<Range, string> = { '1D': 'hôm nay', '1W': '1 tuần', '1M': '1 tháng', '3M': '3 tháng', '1Y': '1 năm' }

export function StockPage() {
  const { symbol = '' } = useParams()
  const stock = useStock(symbol)
  const catalogReady = useCatalog((s) => s.ready)
  const quote = useMarket((s) => s.quotes[symbol.toUpperCase()])
  const position = useUser((s) => s.account.positions[symbol.toUpperCase()])
  const watchlist = useUser((s) => s.watchlist)
  const toggleWatch = useUser((s) => s.toggleWatch)
  const ask = useAskTutor()
  const [range, setRange] = useState<Range>('1D')
  const [mode, setMode] = useState<'line' | 'candle'>('line')
  const [hover, setHover] = useState<number | null>(null)
  const [side, setSide] = useState<Side>('buy')
  const history = useHistory(stock?.symbol ?? '', range)

  if (!stock && !catalogReady) return <div className="py-20 text-center text-muted">Đang tải dữ liệu…</div>
  if (!stock) {
    return (
      <Card className="p-10 text-center">
        <div className="text-lg font-semibold">Không tìm thấy mã “{symbol}”</div>
        <Link to="/market" className="mt-3 inline-block text-sm font-semibold text-brand-500">
          Xem bảng giá
        </Link>
      </Card>
    )
  }
  if (!quote) return <div className="py-20 text-center text-muted">Đang tải dữ liệu…</div>

  const closes = history.map((c) => c.c)
  const baseline = range === '1D' ? quote.ref : closes[0]
  const hovered = hover !== null ? history[hover] : undefined
  const shownPrice = hovered?.c ?? quote.price
  const delta = shownPrice - (baseline ?? quote.ref)
  const deltaPct = baseline ? (delta / baseline) * 100 : 0
  const lineColor = (closes[closes.length - 1] ?? 0) >= (baseline ?? 0) ? 'var(--color-up)' : 'var(--color-down)'
  const watched = watchlist.includes(stock.symbol)
  const band = priceBandPct(stock.exchange) * 100
  const estimated = !stock.profile?.source

  const marketValue = position ? position.qty * quote.price : 0
  const pnl = position ? marketValue - position.qty * position.avgCost : 0

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="flex items-start gap-4">
          <Link to="/market" className="mt-2 rounded-lg p-1 text-muted hover:bg-white hover:text-ink" aria-label="Quay lại">
            ‹
          </Link>
          <StockLogo symbol={stock.symbol} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">{stock.symbol}</h1>
              <span className="rounded-md bg-canvas px-1.5 py-0.5 text-xs font-semibold text-muted">{stock.exchange}</span>
            </div>
            <div className="truncate text-sm text-muted">{stock.name}</div>
          </div>
          <button
            onClick={() => toggleWatch(stock.symbol)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${watched ? 'border-ref/40 bg-ref/10 text-ref' : 'border-line bg-white text-muted hover:text-ink'}`}
          >
            {watched ? '★ Đang theo dõi' : '☆ Theo dõi'}
          </button>
        </div>

        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className={`text-4xl font-extrabold tracking-tight tabular ${hovered ? 'text-ink' : ZONE_TEXT[quoteZone(quote)]}`}>{formatPrice(shownPrice)} ₫</div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <PnlText value={delta} className="font-semibold">
                  {formatSignedVND(delta)} ({formatPct(deltaPct)})
                </PnlText>
                <span className="text-muted">
                  {hovered ? (range === '1D' ? formatDateTime(hovered.t) : formatDate(hovered.t)) : RANGE_LABEL[range]}
                </span>
              </div>
            </div>
            {!hovered && <ChangePill quote={quote} className="text-sm" />}
          </div>

          <div className="mt-5">
            {mode === 'line' || range === '1D' ? (
              <LineChart data={closes} color={lineColor} baseline={baseline} onHover={setHover} />
            ) : (
              <CandleChart data={history} onHover={setHover} />
            )}
          </div>

          {hovered && mode === 'candle' && range !== '1D' && (
            <div className="mt-2 flex gap-4 text-xs text-muted tabular">
              <span>Mở {formatPrice(hovered.o)}</span>
              <span>Cao {formatPrice(hovered.h)}</span>
              <span>Thấp {formatPrice(hovered.l)}</span>
              <span>Đóng {formatPrice(hovered.c)}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented value={range} onChange={setRange} options={RANGES} />
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'line', label: 'Đường' },
                { value: 'candle', label: 'Nến' },
              ]}
            />
          </div>
          {mode === 'candle' && range === '1D' && <p className="mt-2 text-xs text-muted">Biểu đồ nến hiển thị theo ngày — chọn khung 1T trở lên.</p>}
          {mode === 'candle' && range !== '1D' && (
            <div className="mt-3">
              <AskButton question="Biểu đồ nến đọc thế nào?" onAsk={ask} label="Cách đọc biểu đồ nến" />
            </div>
          )}
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <PriceBox label="Tham chiếu" value={quote.ref} className="text-ref" />
          <PriceBox label={`Trần (+${band}%)`} value={quote.ceiling} className="text-ceil" />
          <PriceBox label={`Sàn (−${band}%)`} value={quote.floor} className="text-floor" />
        </div>

        <div className="lg:hidden">
          <TradeTicket stock={stock} quote={quote} initialSide={side} />
        </div>

        {position && (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Vị thế của bạn</h2>
              <button onClick={() => setSide('sell')} className="text-sm font-semibold text-down">
                Bán
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Số lượng" value={`${formatNumber(position.qty)} cp`} />
              <Stat label="Giá vốn" value={`${formatPrice(position.avgCost)} ₫`} hint={<AskButton question="Giá vốn là gì?" onAsk={ask} label="?" className="px-1.5 py-0" />} />
              <Stat label="Giá trị" value={formatVND(marketValue)} />
              <Stat
                label="Lãi/lỗ"
                value={
                  <PnlText value={pnl}>
                    {formatSignedVND(pnl)} ({formatPct((pnl / (position.qty * position.avgCost)) * 100)})
                  </PnlText>
                }
              />
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Thông tin cơ bản</h2>
            <span className="text-xs text-muted">Nhấn vào chỉ số để hỏi Mầm</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <Stat label="Mở cửa" value={formatPrice(quote.open)} />
            <Stat label="Cao / Thấp" value={`${formatPrice(quote.high)} / ${formatPrice(quote.low)}`} />
            <Stat label="Khối lượng" value={formatNumber(quote.volume)} onClick={() => ask('Thanh khoản là gì?')} />
            <Stat
              label="Vốn hóa"
              value={
                quote.listedShares
                  ? formatCompactVND(quote.price * quote.listedShares)
                  : stock.profile?.marketCapTrillion
                    ? `~${formatNumber(stock.profile.marketCapTrillion)} nghìn tỷ`
                    : '—'
              }
              onClick={() => ask('Vốn hóa là gì?')}
            />
            <Stat label={estimated ? 'P/E (ước tính)' : 'P/E'} value={stock.profile?.pe ? `${estimated ? '~' : ''}${formatDecimal(stock.profile.pe)}` : '—'} onClick={() => ask('P/E là gì?')} />
            <Stat
              label={estimated ? 'Cổ tức (ước tính)' : 'Tỷ suất cổ tức'}
              value={stock.profile?.dividendYield ? `${estimated ? '~' : ''}${formatDecimal(stock.profile.dividendYield)}%` : '—'}
              onClick={() => ask('Cổ tức là gì?')}
            />
            <Stat label="Ngành" value={stock.sector} />
            <Stat label="Lô tối thiểu" value={formatCompactVND(quote.price * 100)} onClick={() => ask('Lô giao dịch là gì?')} />
            {stock.profile?.pb ? <Stat label="P/B" value={formatDecimal(stock.profile.pb)} /> : null}
            {stock.profile?.roe ? <Stat label="ROE" value={`${formatDecimal(stock.profile.roe)}%`} /> : null}
            {stock.profile?.eps ? <Stat label="EPS" value={`${formatNumber(stock.profile.eps)} ₫`} /> : null}
          </div>
          {stock.profile?.source && (
            <p className="mt-3 text-[11px] text-muted">
              Nguồn chỉ số: {stock.profile.source}
              {stock.profile.asOf ? `, cập nhật ${formatDate(new Date(stock.profile.asOf).getTime())}` : ''}
            </p>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold">Về {stock.symbol}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {stock.profile?.description ??
                `${stock.name}, niêm yết trên sàn ${stock.exchange}, thuộc nhóm ${stock.sector.toLowerCase()}. Hỏi Mầm để tìm hiểu công ty này kiếm tiền từ đâu.`}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-accent/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <SparkleIcon className="h-4 w-4 text-accent-600" />
            <h2 className="font-bold">Hỏi Mầm về {stock.symbol}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[`${stock.symbol} là công ty gì?`, `Có nên mua ${stock.symbol} không?`, 'Biến động là gì?', 'Đa dạng hóa là gì?'].map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium transition hover:border-brand-500 hover:text-brand-500"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-24">
          <TradeTicket stock={stock} quote={quote} initialSide={side} />
        </div>
      </div>
    </div>
  )
}

function PriceBox({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 font-bold tabular ${className}`}>{formatPrice(value)}</div>
    </Card>
  )
}

function Stat({ label, value, onClick, hint }: { label: string; value: ReactNode; onClick?: () => void; hint?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted">
        {onClick ? (
          <button onClick={onClick} className="underline decoration-dotted underline-offset-2 hover:text-brand-500">
            {label}
          </button>
        ) : (
          label
        )}
        {hint}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular">{value}</div>
    </div>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from '@/components/charts'
import { InsightCards } from '@/components/InsightCards'
import { StockRow } from '@/components/StockRow'
import { Card, PnlText, Segmented, StockLogo } from '@/components/ui'
import { LESSONS } from '@/content/lessons'
import { getStock } from '@/store/catalog'
import { formatDateTime, formatPct, formatSignedVND, formatVND } from '@/domain/format'
import { dayChange, totalEquity } from '@/domain/trading'
import { changePct, useMarket } from '@/store/market'
import { useUser } from '@/store/user'

const MOVER_MIN_VALUE = 10_000_000_000

function Hero() {
  const account = useUser((s) => s.account)
  const name = useUser((s) => s.profile.name)
  const quotes = useMarket((s) => s.quotes)
  const [hover, setHover] = useState<number | null>(null)

  const equity = totalEquity(account, quotes)
  const series = useMemo(() => [...account.equityHistory.map((p) => p.v), equity], [account.equityHistory, equity])
  const shown = hover !== null ? series[hover] : equity
  const total = shown - account.startingCash
  const totalPct = (total / account.startingCash) * 100
  const today = dayChange(account, quotes)
  const label = hover !== null && hover < account.equityHistory.length ? formatDateTime(account.equityHistory[hover].t) : 'Từ khi bắt đầu'

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-600 to-brand-500 p-6 text-white shadow-lg md:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-32 right-24 h-72 w-72 rounded-full bg-accent/10" />
      <div className="relative">
        <div className="text-sm text-white/70">Xin chào{name ? ` ${name}` : ''} 👋</div>
        <div className="mt-0.5 text-lg font-semibold">Chào mừng trở lại!</div>
        <div className="mt-5 text-sm text-white/70">Tổng tài sản (tiền ảo)</div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-4xl font-extrabold tracking-tight tabular md:text-5xl">{formatVND(shown)}</span>
          <span className={`rounded-full px-2.5 py-1 text-sm font-bold tabular ${total >= 0 ? 'bg-accent/20 text-accent' : 'bg-down/25 text-red-200'}`}>
            {formatPct(totalPct)} {total >= 0 ? '↗' : '↘'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
          <span>
            {label}: <strong className="tabular">{formatSignedVND(total)}</strong>
          </span>
          {hover === null && (
            <span>
              Hôm nay: <strong className="tabular">{formatSignedVND(today)}</strong>
            </span>
          )}
        </div>
        <div className="-mx-2 mt-4">
          <LineChart data={series} color="#7CF07F" baseline={account.startingCash} height={150} onHover={setHover} />
        </div>
      </div>
    </div>
  )
}

function Holdings() {
  const positions = useUser((s) => s.account.positions)
  const quotes = useMarket((s) => s.quotes)
  const list = Object.values(positions)
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Cổ phiếu của tôi</h2>
        <Link to="/portfolio" className="text-sm font-semibold text-brand-500">
          Xem tất cả
        </Link>
      </div>
      {list.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="text-3xl">🌱</div>
          <div className="font-semibold">Bạn chưa có cổ phiếu nào</div>
          <p className="max-w-sm text-sm text-muted">Hãy bắt đầu với một công ty bạn hiểu rõ. Mầm sẽ hướng dẫn bạn từng bước.</p>
          <Link to="/market" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-600">
            Khám phá cổ phiếu
          </Link>
        </Card>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {list.map((p) => {
            const price = quotes[p.symbol]?.price ?? p.avgCost
            const pnlPct = ((price - p.avgCost) / p.avgCost) * 100
            return (
              <Link
                key={p.symbol}
                to={`/stock/${p.symbol}`}
                className="w-48 shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2.5 p-4 pb-3">
                  <StockLogo symbol={p.symbol} size={36} />
                  <div>
                    <div className="font-bold">{p.symbol}</div>
                    <div className="text-xs text-muted">{getStock(p.symbol)?.exchange}</div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="text-xs text-muted">Giá trị</div>
                  <div className="font-bold tabular">{formatVND(price * p.qty)}</div>
                </div>
                <div className={`px-4 py-2 text-sm font-semibold ${pnlPct >= 0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
                  {formatPct(pnlPct)} {pnlPct >= 0 ? 'lãi ↗' : 'lỗ ↘'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Movers() {
  const quotes = useMarket((s) => s.quotes)
  const [tab, setTab] = useState<'up' | 'down'>('up')
  const sorted = Object.values(quotes)
    .filter((q) => q.volume * q.price >= MOVER_MIN_VALUE)
    .sort((a, b) => (tab === 'up' ? changePct(b) - changePct(a) : changePct(a) - changePct(b)))
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Biến động hôm nay</h2>
          <p className="text-xs text-muted">Chỉ tính mã có giá trị giao dịch từ 10 tỷ ₫</p>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'up', label: 'Tăng mạnh' },
            { value: 'down', label: 'Giảm mạnh' },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
        {sorted.slice(0, 6).map((q) => (
          <StockRow key={q.symbol} symbol={q.symbol} subtitle={getStock(q.symbol)?.sector} />
        ))}
      </div>
    </Card>
  )
}

function Watchlist() {
  const watchlist = useUser((s) => s.watchlist)
  return (
    <Card className="p-5">
      <h2 className="mb-2 font-bold">Danh sách theo dõi</h2>
      {watchlist.length === 0 ? (
        <p className="text-sm text-muted">Nhấn ☆ trên trang cổ phiếu để theo dõi.</p>
      ) : (
        watchlist.map((s) => <StockRow key={s} symbol={s} />)
      )}
    </Card>
  )
}

function LearningProgress() {
  const results = useUser((s) => s.quizResults)
  const done = LESSONS.filter((l) => results[l.id]).length
  const next = LESSONS.find((l) => !results[l.id])
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Hành trình học</h2>
        <span className="text-sm font-semibold text-muted tabular">
          {done}/{LESSONS.length}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / LESSONS.length) * 100}%` }} />
      </div>
      {next ? (
        <Link to={`/learn/${next.id}`} className="mt-4 flex items-center gap-3 rounded-xl bg-canvas p-3 transition hover:bg-line">
          <div className="text-2xl">{next.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted">Bài tiếp theo · {next.minutes} phút</div>
            <div className="truncate text-sm font-semibold">{next.title}</div>
          </div>
          <span className="text-muted">›</span>
        </Link>
      ) : (
        <p className="mt-3 text-sm text-muted">Bạn đã hoàn thành tất cả bài học 🎉</p>
      )}
    </Card>
  )
}

export function HomePage() {
  const account = useUser((s) => s.account)
  const cash = account.cash
  const pending = account.orders.filter((o) => o.status === 'pending').length
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Hero />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Tiền mặt" value={formatVND(cash)} />
          <Stat label="Lãi/lỗ đã chốt" value={<PnlText value={account.realizedPnl}>{formatSignedVND(account.realizedPnl)}</PnlText>} />
          <Stat label="Lệnh chờ khớp" value={String(pending)} className="hidden md:block" />
        </div>
        <Holdings />
        <Movers />
      </div>
      <div className="space-y-6">
        <InsightCards />
        <LearningProgress />
        <Watchlist />
      </div>
    </div>
  )
}

function Stat({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <Card className={`px-4 py-3 ${className}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-bold tabular">{value}</div>
    </Card>
  )
}

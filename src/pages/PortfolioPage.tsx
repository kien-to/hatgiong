import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AskButton, Card, PnlText, Segmented, StockLogo } from '@/components/ui'
import { getStock } from '@/store/catalog'
import { formatDateTime, formatDecimal, formatNumber, formatPct, formatPrice, formatSignedVND, formatVND } from '@/domain/format'
import { buyingPower, holdingsValue, totalEquity } from '@/domain/trading'
import { useAskTutor } from '@/hooks/useTutorContext'
import { useMarket } from '@/store/market'
import { useUser } from '@/store/user'

const SECTOR_COLORS = ['#1d4ed8', '#00a63e', '#c99a06', '#a033d6', '#0aa7bb', '#e5413a', '#0f766e', '#c2410c', '#475569', '#be185d']

export function PortfolioPage() {
  const account = useUser((s) => s.account)
  const cancelOrder = useUser((s) => s.cancelOrder)
  const resetAccount = useUser((s) => s.resetAccount)
  const quotes = useMarket((s) => s.quotes)
  const ask = useAskTutor()
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  const equity = totalEquity(account, quotes)
  const invested = holdingsValue(account, quotes)
  const totalPnl = equity - account.startingCash
  const positions = Object.values(account.positions)
    .map((p) => {
      const price = quotes[p.symbol]?.price ?? p.avgCost
      const value = price * p.qty
      return { ...p, price, value, pnl: value - p.avgCost * p.qty, stock: getStock(p.symbol) }
    })
    .sort((a, b) => b.value - a.value)

  const sectors = new Map<string, number>()
  for (const p of positions) sectors.set(p.stock?.sector ?? 'Khác', (sectors.get(p.stock?.sector ?? 'Khác') ?? 0) + p.value)
  const allocation = [...sectors.entries(), ['Tiền mặt', account.cash] as [string, number]].filter(([, v]) => v > 0)

  const pending = account.orders.filter((o) => o.status === 'pending')
  const history = account.orders.filter((o) => o.status !== 'pending')
  const totalFees = account.orders.reduce((s, o) => s + o.fee + o.tax, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Danh mục</h1>
        <AskButton question="Đánh giá danh mục của tôi" onAsk={ask} label="Mầm đánh giá danh mục" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Tổng tài sản" value={formatVND(equity)} />
        <Summary label="Tổng lãi/lỗ" value={<PnlText value={totalPnl}>{formatSignedVND(totalPnl)} ({formatPct((totalPnl / account.startingCash) * 100)})</PnlText>} />
        <Summary label="Giá trị cổ phiếu" value={formatVND(invested)} />
        <Summary label="Sức mua" value={formatVND(buyingPower(account))} />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Phân bổ tài sản</h2>
          <AskButton question="Đa dạng hóa là gì?" onAsk={ask} label="Vì sao điều này quan trọng?" />
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-canvas">
          {allocation.map(([name, v], i) => (
            <div
              key={name}
              title={name}
              style={{ width: `${(v / equity) * 100}%`, background: name === 'Tiền mặt' ? '#cbd5e1' : SECTOR_COLORS[i % SECTOR_COLORS.length] }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {allocation.map(([name, v], i) => (
            <span key={name} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: name === 'Tiền mặt' ? '#cbd5e1' : SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
              {name}
              <span className="font-semibold tabular">{formatDecimal((v / equity) * 100)}%</span>
            </span>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-bold">Cổ phiếu đang nắm giữ</h2>
          <span className="text-sm text-muted">{positions.length} mã</span>
        </div>
        {positions.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-muted">
            Chưa có cổ phiếu nào.{' '}
            <Link to="/market" className="font-semibold text-brand-500">
              Mở bảng giá
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">Mã</th>
                  <th className="px-3 text-right font-semibold">Số lượng</th>
                  <th className="px-3 text-right font-semibold">Giá vốn</th>
                  <th className="px-3 text-right font-semibold">Giá hiện tại</th>
                  <th className="px-3 text-right font-semibold">Giá trị</th>
                  <th className="px-5 text-right font-semibold">Lãi/lỗ</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol} className="border-t border-line">
                    <td className="px-5 py-3">
                      <Link to={`/stock/${p.symbol}`} className="flex items-center gap-2.5">
                        <StockLogo symbol={p.symbol} size={30} />
                        <div>
                          <div className="font-bold">{p.symbol}</div>
                          <div className="text-xs text-muted">{formatDecimal((p.value / invested) * 100)}% cổ phiếu</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 text-right tabular">{formatNumber(p.qty)}</td>
                    <td className="px-3 text-right tabular">{formatPrice(p.avgCost)}</td>
                    <td className="px-3 text-right font-semibold tabular">{formatPrice(p.price)}</td>
                    <td className="px-3 text-right tabular">{formatVND(p.value)}</td>
                    <td className="px-5 text-right font-semibold">
                      <PnlText value={p.pnl}>
                        {formatSignedVND(p.pnl)}
                        <div className="text-xs">{formatPct((p.pnl / (p.avgCost * p.qty)) * 100)}</div>
                      </PnlText>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Sổ lệnh</h2>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pending', label: `Lệnh chờ (${pending.length})` },
              { value: 'history', label: 'Lịch sử' },
            ]}
          />
        </div>
        {(tab === 'pending' ? pending : history).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{tab === 'pending' ? 'Không có lệnh chờ khớp.' : 'Chưa có lệnh nào.'}</p>
        ) : (
          <div className="divide-y divide-line">
            {(tab === 'pending' ? pending : history).slice(0, 50).map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${o.side === 'buy' ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>{o.side === 'buy' ? 'MUA' : 'BÁN'}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {formatNumber(o.qty)} {o.symbol} · {o.type === 'limit' ? `LO ${formatPrice(o.limitPrice ?? 0)}` : 'Thị trường'}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateTime(o.createdAt)}
                    {o.status === 'filled' && ` · Khớp ${formatPrice(o.fillPrice ?? 0)} · Phí ${formatVND(o.fee + o.tax)}`}
                  </div>
                </div>
                {o.status === 'pending' ? (
                  <button onClick={() => cancelOrder(o.id)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-down hover:text-down">
                    Hủy
                  </button>
                ) : (
                  <span className={`text-xs font-semibold ${o.status === 'filled' ? 'text-up' : 'text-muted'}`}>{o.status === 'filled' ? 'Đã khớp' : 'Đã hủy'}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
          <span className="text-muted">
            Tổng phí & thuế đã trả: <strong className="text-ink tabular">{formatVND(totalFees)}</strong>
          </span>
          <AskButton question="Phí giao dịch tính thế nào?" onAsk={ask} />
        </div>
      </Card>

      <div className="text-center">
        <button
          onClick={() => window.confirm('Đặt lại tài khoản về 100.000.000 ₫ tiền ảo? Toàn bộ cổ phiếu và lịch sử lệnh sẽ bị xóa.') && resetAccount()}
          className="text-sm font-semibold text-muted hover:text-down"
        >
          Đặt lại tài khoản tiền ảo
        </button>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-bold tabular">{value}</div>
    </Card>
  )
}

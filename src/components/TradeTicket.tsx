import { useEffect, useMemo, useState } from 'react'
import { formatDecimal, formatNumber, formatPrice, formatVND } from '@/domain/format'
import { BROKER_FEE_RATE, LOT_SIZE, SELL_TAX_RATE, tickSize } from '@/domain/market'
import { availableToSell, buyingPower, estimateOrder, holdingsValue, validateOrder, type LessonTopic } from '@/domain/trading'
import type { OrderType, Quote, Side, Stock } from '@/domain/types'
import { useAskTutor } from '@/hooks/useTutorContext'
import { useMarket } from '@/store/market'
import { useUI } from '@/store/ui'
import { useUser } from '@/store/user'
import { AskButton, Card, Segmented } from './ui'

const TOPIC_QUESTION: Record<LessonTopic, string> = {
  lot: 'Lô giao dịch là gì?',
  quantity: 'Lô giao dịch là gì?',
  'price-band': 'Giá trần, giá sàn là gì?',
  tick: 'Bước giá là gì?',
  'buying-power': 'Sức mua là gì?',
  holdings: 'Đánh giá danh mục của tôi',
  session: 'Giờ giao dịch là gì?',
  settlement: 'Thanh toán T+2 là gì?',
}

const REASON_STARTERS = ['Tôi hiểu công ty này kiếm tiền thế nào', 'Giá đang giảm, tôi muốn mua rẻ', 'Muốn đa dạng danh mục', 'Thử nghiệm để học hỏi', 'Chốt lời / cắt lỗ theo kế hoạch']

function Stepper({ value, onChange, step, min = 0, suffix }: { value: number; onChange: (v: number) => void; step: number; min?: number; suffix?: string }) {
  return (
    <div className="flex items-center rounded-xl border border-line focus-within:border-brand-500">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="px-3 py-2.5 text-lg font-semibold text-muted hover:text-ink">
        −
      </button>
      <input
        inputMode="numeric"
        value={value ? formatNumber(value) : ''}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        className="w-full min-w-0 bg-transparent text-center font-semibold tabular outline-none"
      />
      {suffix && <span className="pr-1 text-xs text-muted">{suffix}</span>}
      <button type="button" onClick={() => onChange(value + step)} className="px-3 py-2.5 text-lg font-semibold text-muted hover:text-ink">
        +
      </button>
    </div>
  )
}

export function TradeTicket({ stock, quote, initialSide = 'buy' }: { stock: Stock; quote: Quote; initialSide?: Side }) {
  const account = useUser((s) => s.account)
  const place = useUser((s) => s.placeOrder)
  const quotes = useMarket((s) => s.quotes)
  const source = useMarket((s) => s.source)
  const status = useMarket((s) => s.status)
  const toast = useUI((s) => s.toast)
  const ask = useAskTutor()

  const [side, setSide] = useState<Side>(initialSide)
  const [type, setType] = useState<OrderType>('limit')
  const [qty, setQty] = useState(LOT_SIZE)
  const [limitPrice, setLimitPrice] = useState(quote.price)
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    setLimitPrice(quote.price)
    setReviewing(false)
    setNote('')
  }, [stock.symbol])

  useEffect(() => {
    setSide(initialSide)
  }, [initialSide])

  useEffect(() => {
    if (!status.canTrade) setType('limit')
  }, [status.canTrade])

  const req = { symbol: stock.symbol, side, type, qty, limitPrice: type === 'limit' ? limitPrice : undefined, note: note.trim() || undefined }
  const estimate = estimateOrder(req, quote.price)
  const error = validateOrder(account, req, stock, quote)
  const power = buyingPower(account)
  const available = availableToSell(account, stock.symbol)
  const maxLots = Math.floor(power / (estimate.price * (1 + BROKER_FEE_RATE)) / LOT_SIZE)

  const concentration = useMemo(() => {
    if (side !== 'buy') return null
    const invested = holdingsValue(account, quotes) + estimate.value
    const current = (account.positions[stock.symbol]?.qty ?? 0) * quote.price
    const pct = invested > 0 ? ((current + estimate.value) / invested) * 100 : 0
    return Object.keys(account.positions).length > 0 && pct > 40 ? pct : null
  }, [side, account, quotes, estimate.value, stock.symbol, quote.price])

  const submit = async () => {
    setSubmitting(true)
    const result = await place(req, stock, quote)
    setSubmitting(false)
    setReviewing(false)
    if (!result.ok) {
      const topic = result.error.topic
      toast({ tone: 'error', title: 'Lệnh bị từ chối', body: result.error.message, ask: topic ? TOPIC_QUESTION[topic] : undefined })
      return
    }
    const o = result.order
    if (o.status === 'filled') {
      toast({
        tone: 'success',
        title: `Đã khớp: ${o.side === 'buy' ? 'Mua' : 'Bán'} ${formatNumber(o.qty)} ${o.symbol}`,
        body: `Giá ${formatPrice(o.fillPrice ?? 0)} ₫ · Phí ${formatVND(o.fee)}${o.tax ? ` · Thuế ${formatVND(o.tax)}` : ''}`,
        ask: 'Phí giao dịch tính thế nào?',
      })
    } else {
      toast({
        tone: 'info',
        title: `Lệnh LO đang chờ khớp`,
        body: `${o.side === 'buy' ? 'Mua' : 'Bán'} ${formatNumber(o.qty)} ${o.symbol} khi giá ${o.side === 'buy' ? '≤' : '≥'} ${formatPrice(o.limitPrice ?? 0)} ₫`,
        ask: 'Lệnh giới hạn là gì?',
      })
    }
  }

  const tick = tickSize(limitPrice, stock.exchange)
  const sideColor = side === 'buy' ? 'bg-up hover:bg-up/90' : 'bg-down hover:bg-down/90'

  if (reviewing) {
    return (
      <Card className="p-5">
        <div className="text-lg font-bold">Xem lại lệnh</div>
        <p className="mt-3 rounded-xl bg-canvas p-4 text-sm leading-relaxed">
          Bạn sẽ <strong>{side === 'buy' ? 'mua' : 'bán'} {formatNumber(qty)} cổ phiếu {stock.symbol}</strong>{' '}
          {type === 'market'
            ? `ngay lập tức theo giá thị trường (khoảng ${formatPrice(quote.price)} ₫).`
            : `với giá ${side === 'buy' ? 'tối đa' : 'tối thiểu'} ${formatPrice(limitPrice)} ₫. Nếu giá chưa đạt, lệnh sẽ chờ${status.alwaysOpen ? '' : ' đến hết phiên hôm nay (15:00)'}.`}
          {!status.canTrade && ' Thị trường đang không khớp lệnh, nên lệnh sẽ được xử lý ở phiên tiếp theo.'}
        </p>
        <div className="mt-4">
          <label className="text-sm font-semibold" htmlFor="order-note">
            Vì sao bạn đặt lệnh này? <span className="font-normal text-muted">(không bắt buộc)</span>
          </label>
          <textarea
            id="order-note"
            value={note}
            maxLength={500}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi lại lý do giúp bạn nhìn lại và rút kinh nghiệm sau này"
            className="mt-1.5 w-full resize-none rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {REASON_STARTERS.map((r) => (
              <button key={r} type="button" onClick={() => setNote(r)} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-muted hover:text-ink">
                {r}
              </button>
            ))}
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Giá trị lệnh" value={formatVND(estimate.value)} />
          <Row label={`Phí môi giới (${formatDecimal(BROKER_FEE_RATE * 100)}%)`} value={formatVND(estimate.fee)} />
          {side === 'sell' && <Row label={`Thuế TNCN (${formatDecimal(SELL_TAX_RATE * 100)}%)`} value={formatVND(estimate.tax)} />}
          <div className="border-t border-line pt-2">
            <Row label={side === 'buy' ? 'Tổng tiền cần' : 'Tiền nhận về'} value={formatVND(estimate.total)} strong />
          </div>
        </dl>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setReviewing(false)} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold">
            Sửa
          </button>
          <button
            disabled={submitting}
            onClick={() => void submit()}
            className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60 ${sideColor}`}
          >
            {submitting ? 'Đang gửi lệnh…' : `Xác nhận ${side === 'buy' ? 'mua' : 'bán'}`}
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
        {(['buy', 'sell'] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`rounded-lg py-2 text-sm font-bold transition ${side === s ? (s === 'buy' ? 'bg-up text-white' : 'bg-down text-white') : 'text-muted'}`}
          >
            {s === 'buy' ? 'Mua' : 'Bán'}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold">Loại lệnh</span>
        <Segmented
          value={type}
          onChange={(t) => (t === 'market' && !status.canTrade ? undefined : setType(t))}
          options={[
            { value: 'limit', label: 'Giới hạn (LO)' },
            { value: 'market', label: status.canTrade ? 'Thị trường' : 'Thị trường 🔒' },
          ]}
        />
      </div>
      <div className="mt-1 text-right">
        <AskButton question={type === 'limit' ? 'Lệnh giới hạn là gì?' : 'Lệnh thị trường là gì?'} onAsk={ask} label="Khác nhau thế nào?" />
      </div>
      {!status.canTrade && (
        <div className="mt-3 rounded-xl bg-ref/10 p-3 text-xs leading-relaxed text-ink">
          <strong>{status.label}.</strong> Lệnh thị trường tạm khóa. Bạn vẫn đặt được lệnh LO — lệnh sẽ chờ phiên khớp lệnh tiếp theo và hết hạn lúc 15:00 nếu chưa khớp.
          <AskButton className="ml-1 mt-1" question="Giờ giao dịch là gì?" onAsk={ask} label="Giờ giao dịch" />
        </div>
      )}

      {type === 'limit' && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold">Giá đặt</span>
            <span className="text-xs text-muted">Bước giá {formatPrice(tick)} ₫</span>
          </div>
          <Stepper value={limitPrice} onChange={setLimitPrice} step={tick} min={quote.floor} suffix="₫" />
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs font-semibold">
            <button onClick={() => setLimitPrice(quote.floor)} className="rounded-lg bg-floor/10 py-1.5 text-floor">
              Sàn {formatPrice(quote.floor)}
            </button>
            <button onClick={() => setLimitPrice(quote.ref)} className="rounded-lg bg-ref/10 py-1.5 text-ref">
              TC {formatPrice(quote.ref)}
            </button>
            <button onClick={() => setLimitPrice(quote.ceiling)} className="rounded-lg bg-ceil/10 py-1.5 text-ceil">
              Trần {formatPrice(quote.ceiling)}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold">Số lượng</span>
          <span className="text-xs text-muted">Lô {LOT_SIZE} cổ phiếu</span>
        </div>
        <Stepper value={qty} onChange={setQty} step={LOT_SIZE} />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {side === 'buy'
            ? [1, 5, 10].map((lots) => (
                <button key={lots} onClick={() => setQty(lots * LOT_SIZE)} className="rounded-lg bg-canvas py-1.5 text-xs font-semibold hover:bg-line">
                  {formatNumber(lots * LOT_SIZE)}
                </button>
              ))
            : [0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  disabled={available <= 0}
                  onClick={() => setQty(f === 1 ? available : Math.floor((available * f) / LOT_SIZE) * LOT_SIZE)}
                  className="rounded-lg bg-canvas py-1.5 text-xs font-semibold hover:bg-line disabled:opacity-40"
                >
                  {f === 1 ? 'Tất cả' : `${f * 100}%`}
                </button>
              ))}
          {side === 'buy' && (
            <button onClick={() => setQty(Math.max(0, maxLots) * LOT_SIZE)} className="rounded-lg bg-canvas py-1.5 text-xs font-semibold hover:bg-line">
              Tối đa
            </button>
          )}
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
        <Row label="Giá trị ước tính" value={formatVND(estimate.value)} />
        <Row label="Phí + thuế" value={formatVND(estimate.fee + estimate.tax)} />
        <Row label={side === 'buy' ? 'Sức mua' : 'Có thể bán'} value={side === 'buy' ? formatVND(power) : `${formatNumber(Math.max(available, 0))} cp`} muted />
        {side === 'sell' && (account.unsettled?.[stock.symbol] ?? 0) > 0 && (
          <Row label="Chờ về (T+2)" value={`${formatNumber(account.unsettled?.[stock.symbol] ?? 0)} cp`} muted />
        )}
      </dl>

      {error && qty > 0 && (
        <div className="mt-4 rounded-xl border border-down/20 bg-down/5 p-3 text-sm">
          <div className="text-down">{error.message}</div>
          {error.topic && <AskButton className="mt-2" question={TOPIC_QUESTION[error.topic]} onAsk={ask} label="Vì sao vậy?" />}
        </div>
      )}

      {!error && concentration && (
        <div className="mt-4 rounded-xl border border-ref/30 bg-ref/5 p-3 text-sm">
          <div>
            ⚠️ Sau lệnh này, <strong>{stock.symbol}</strong> sẽ chiếm khoảng <strong>{formatDecimal(concentration)}%</strong> phần cổ phiếu của bạn.
          </div>
          <AskButton className="mt-2" question="Đa dạng hóa là gì?" onAsk={ask} label="Điều này có rủi ro gì?" />
        </div>
      )}

      <button
        disabled={Boolean(error)}
        onClick={() => setReviewing(true)}
        className={`mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${sideColor}`}
      >
        Xem lại lệnh {side === 'buy' ? 'mua' : 'bán'}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">
        Giao dịch bằng tiền ảo · {source === 'live' ? 'Khớp theo giá thật' : 'Giá mô phỏng, không phải giá thực'}
      </p>
    </Card>
  )
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`tabular ${strong ? 'text-base font-bold' : 'font-semibold'} ${muted ? 'text-muted' : ''}`}>{value}</dd>
    </div>
  )
}

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { formatPct, formatPrice } from '@/domain/format'
import { priceZone, type PriceZone } from '@/domain/market'
import type { Quote } from '@/domain/types'
import { hashString } from '@/lib/text'

const LOGO_COLORS = ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#15803d', '#a21caf', '#c2410c', '#334155']

export function StockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const color = LOGO_COLORS[hashString(symbol) % LOGO_COLORS.length]
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.3 }}
    >
      {symbol}
    </div>
  )
}

export const ZONE_TEXT: Record<PriceZone, string> = {
  ceiling: 'text-ceil',
  floor: 'text-floor',
  ref: 'text-ref',
  up: 'text-up',
  down: 'text-down',
}

const ZONE_PILL: Record<PriceZone, string> = {
  ceiling: 'bg-ceil/10 text-ceil',
  floor: 'bg-floor/10 text-floor',
  ref: 'bg-ref/10 text-ref',
  up: 'bg-up/10 text-up',
  down: 'bg-down/10 text-down',
}

export function quoteZone(q: Quote): PriceZone {
  return priceZone(q.price, q.ref, q.ceiling, q.floor)
}

export function ChangePill({ quote, className = '' }: { quote: Quote; className?: string }) {
  const zone = quoteZone(quote)
  const pct = ((quote.price - quote.ref) / quote.ref) * 100
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular ${ZONE_PILL[zone]} ${className}`}>
      {zone === 'ceiling' ? 'Trần ' : zone === 'floor' ? 'Sàn ' : ''}
      {formatPct(pct)}
    </span>
  )
}

export function PnlText({ value, children, className = '' }: { value: number; children: ReactNode; className?: string }) {
  const color = value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-ref'
  return <span className={`${color} tabular ${className}`}>{children}</span>
}

export function LivePrice({ quote, className = '' }: { quote: Quote; className?: string }) {
  const prev = useRef(quote.price)
  const [flash, setFlash] = useState('')
  useEffect(() => {
    if (quote.price !== prev.current) {
      setFlash(quote.price > prev.current ? 'flash-up' : 'flash-down')
      prev.current = quote.price
      const t = setTimeout(() => setFlash(''), 900)
      return () => clearTimeout(t)
    }
  }, [quote.price])
  return <span className={`rounded px-1 tabular ${ZONE_TEXT[quoteZone(quote)]} ${flash} ${className}`}>{formatPrice(quote.price)}</span>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>
}

export function Segmented<T extends string>({ options, value, onChange, className = '' }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`inline-flex rounded-full bg-canvas p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${value === o.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SparkleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
      <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity={0.7} />
    </svg>
  )
}

export function AskButton({ question, onAsk, label = 'Hỏi Mầm', className = '' }: { question: string; onAsk: (q: string) => void; label?: string; className?: string }) {
  return (
    <button
      onClick={() => onAsk(question)}
      className={`inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-500 transition hover:bg-brand-500/15 ${className}`}
    >
      <SparkleIcon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={i} className="text-muted">{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; start: number; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag
        key={blocks.length}
        start={list.ordered && list.start !== 1 ? list.start : undefined}
        className={`my-1 space-y-1 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'}`}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    )
    list = null
  }
  for (const line of text.split('\n')) {
    const bullet = line.match(/^- (.*)/)
    const numbered = line.match(/^(\d+)\. (.*)/)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flush()
      if (!list) list = { ordered, start: numbered ? Number(numbered[1]) : 1, items: [] }
      list.items.push(bullet ? bullet[1] : numbered![2])
      continue
    }
    if (line.trim() === '') continue
    flush()
    blocks.push(
      <p key={blocks.length} className="my-1">
        {inline(line)}
      </p>,
    )
  }
  flush()
  return <>{blocks}</>
}

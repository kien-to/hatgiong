import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Candle } from '@/domain/types'
import { formatPrice } from '@/domain/format'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function scale(values: number[], extra: number[], height: number, pad = 0.08) {
  const all = [...values, ...extra]
  let min = Math.min(...all)
  let max = Math.max(...all)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * pad
  max += span * pad
  return { min, max, y: (v: number) => height - ((v - min) / (max - min)) * height }
}

interface LineChartProps {
  data: number[]
  height?: number
  color: string
  baseline?: number
  onHover?: (index: number | null) => void
}

export function LineChart({ data, height = 260, color, baseline, onHover }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const geometry = useMemo(() => {
    if (data.length < 2 || width === 0) return null
    const { y } = scale(data, baseline !== undefined ? [baseline] : [], height)
    const x = (i: number) => (i / (data.length - 1)) * width
    const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    const area = `${path} L${width},${height} L0,${height} Z`
    return { x, y, path, area }
  }, [data, width, height, baseline])

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!geometry) return
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (data.length - 1))
    const idx = Math.max(0, Math.min(data.length - 1, i))
    setHover(idx)
    onHover?.(idx)
  }
  const leave = () => {
    setHover(null)
    onHover?.(null)
  }
  const gradientId = `grad-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <div ref={ref} style={{ height }} className="w-full select-none">
      {geometry && (
        <svg width={width} height={height} className="overflow-visible touch-none" onPointerMove={move} onPointerDown={move} onPointerLeave={leave}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {baseline !== undefined && (
            <line x1={0} x2={width} y1={geometry.y(baseline)} y2={geometry.y(baseline)} stroke="#94a3b8" strokeDasharray="2 5" strokeWidth={1.5} />
          )}
          <path d={geometry.area} fill={`url(#${gradientId})`} />
          <path d={geometry.path} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && (
            <>
              <line x1={geometry.x(hover)} x2={geometry.x(hover)} y1={0} y2={height} stroke="#94a3b8" strokeWidth={1} />
              <circle cx={geometry.x(hover)} cy={geometry.y(data[hover])} r={5} fill={color} stroke="white" strokeWidth={2} />
            </>
          )}
          {hover === null && (
            <circle cx={geometry.x(data.length - 1)} cy={geometry.y(data[data.length - 1])} r={4} fill={color}>
              <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      )}
    </div>
  )
}

interface CandleChartProps {
  data: Candle[]
  height?: number
  onHover?: (index: number | null) => void
}

export function CandleChart({ data, height = 260, onHover }: CandleChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const axis = 56

  const geometry = useMemo(() => {
    if (data.length === 0 || width === 0) return null
    const plot = width - axis
    const { y, min, max } = scale(
      data.flatMap((c) => [c.h, c.l]),
      [],
      height,
      0.06,
    )
    const step = plot / data.length
    const body = Math.max(1, Math.min(14, step * 0.65))
    const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * (i + 0.5)) / 4)
    return { y, step, body, plot, ticks }
  }, [data, width, height])

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!geometry) return
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - rect.left) / geometry.step)
    const idx = Math.max(0, Math.min(data.length - 1, i))
    setHover(idx)
    onHover?.(idx)
  }
  const leave = () => {
    setHover(null)
    onHover?.(null)
  }

  return (
    <div ref={ref} style={{ height }} className="w-full select-none">
      {geometry && (
        <svg width={width} height={height} className="overflow-visible touch-none" onPointerMove={move} onPointerDown={move} onPointerLeave={leave}>
          {geometry.ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={geometry.plot} y1={geometry.y(t)} y2={geometry.y(t)} stroke="#eef1f5" />
              <text x={geometry.plot + 8} y={geometry.y(t) + 4} className="fill-muted text-[11px] tabular">
                {formatPrice(t)}
              </text>
            </g>
          ))}
          {hover !== null && (
            <rect x={hover * geometry.step} y={0} width={geometry.step} height={height} fill="#0f172a" opacity={0.05} />
          )}
          {data.map((c, i) => {
            const up = c.c >= c.o
            const color = up ? 'var(--color-up)' : 'var(--color-down)'
            const cx = i * geometry.step + geometry.step / 2
            const top = geometry.y(Math.max(c.o, c.c))
            const bottom = geometry.y(Math.min(c.o, c.c))
            return (
              <g key={c.t}>
                <line x1={cx} x2={cx} y1={geometry.y(c.h)} y2={geometry.y(c.l)} stroke={color} strokeWidth={1.2} />
                <rect x={cx - geometry.body / 2} y={top} width={geometry.body} height={Math.max(1.5, bottom - top)} fill={color} rx={1} />
              </g>
            )
          })}
          {data.length > 0 && (
            <g>
              <line
                x1={0}
                x2={geometry.plot}
                y1={geometry.y(data[data.length - 1].c)}
                y2={geometry.y(data[data.length - 1].c)}
                stroke="var(--color-brand-500)"
                strokeDasharray="3 3"
              />
              <rect x={geometry.plot + 2} y={geometry.y(data[data.length - 1].c) - 10} width={axis - 4} height={20} rx={6} fill="var(--color-brand-500)" />
              <text x={geometry.plot + axis / 2} y={geometry.y(data[data.length - 1].c) + 4} textAnchor="middle" className="fill-white text-[11px] font-semibold tabular">
                {formatPrice(data[data.length - 1].c)}
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  )
}

export function Sparkline({ data, color, width = 96, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }} />
  const { y } = scale(data, [], height, 0.1)
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (data.length - 1)) * width).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

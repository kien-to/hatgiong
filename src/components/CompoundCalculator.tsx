import { useMemo, useState } from 'react'
import { formatCompactVND, formatNumber } from '@/domain/format'
import { LineChart } from './charts'

export function futureValue(monthly: number, annualPct: number, years: number): number[] {
  const r = annualPct / 100 / 12
  const values: number[] = [0]
  let v = 0
  for (let m = 1; m <= years * 12; m++) {
    v = v * (1 + r) + monthly
    if (m % 12 === 0) values.push(v)
  }
  return values
}

export function CompoundCalculator() {
  const [monthly, setMonthly] = useState(2_000_000)
  const [rate, setRate] = useState(10)
  const [years, setYears] = useState(20)
  const series = useMemo(() => futureValue(monthly, rate, years), [monthly, rate, years])
  const final = series[series.length - 1]
  const contributed = monthly * 12 * years

  return (
    <div className="rounded-2xl border border-line bg-canvas p-5">
      <div className="font-semibold">🧮 Máy tính lãi kép</div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Slider label="Mỗi tháng" value={monthly} display={formatCompactVND(monthly)} min={500_000} max={10_000_000} step={500_000} onChange={setMonthly} />
        <Slider label="Lợi nhuận/năm" value={rate} display={`${rate}%`} min={0} max={20} step={1} onChange={setRate} />
        <Slider label="Thời gian" value={years} display={`${years} năm`} min={1} max={40} step={1} onChange={setYears} />
      </div>
      <div className="mt-4">
        <LineChart data={series} color="var(--color-accent-600)" height={140} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <div className="text-xs text-muted">Tiền bỏ vào</div>
          <div className="font-bold tabular">{formatCompactVND(contributed)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Tiền lãi</div>
          <div className="font-bold text-up tabular">{formatCompactVND(final - contributed)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Kết quả</div>
          <div className="font-bold text-brand tabular">{formatCompactVND(final)}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">Giả định lợi nhuận đều đặn mỗi năm — thực tế thị trường lên xuống thất thường, và {formatNumber(rate)}% không được đảm bảo.</p>
    </div>
  )
}

function Slider({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-accent-600)]" />
    </label>
  )
}

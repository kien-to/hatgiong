const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatNumber(n: number): string {
  return number.format(Math.round(n))
}

export function formatVND(n: number): string {
  return `${number.format(Math.round(n))} ₫`
}

export function formatSignedVND(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${number.format(Math.abs(Math.round(n)))} ₫`
}

export function formatCompactVND(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${decimal.format(n / 1e9).replace(/,00$/, '')} tỷ`
  if (abs >= 1e6) return `${decimal.format(n / 1e6).replace(/,00$/, '')} triệu`
  return formatVND(n)
}

export function formatPct(n: number, withSign = true): string {
  const sign = withSign ? (n > 0 ? '+' : n < 0 ? '−' : '') : n < 0 ? '−' : ''
  return `${sign}${decimal.format(Math.abs(n))}%`
}

export function formatPrice(n: number): string {
  return number.format(Math.round(n))
}

export function formatDate(t: number): string {
  return new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(t: number): string {
  return new Date(t).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDecimal(n: number): string {
  return decimal.format(n)
}

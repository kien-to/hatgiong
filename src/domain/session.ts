import type { MarketSession, MarketStatus } from './types'

const VN_OFFSET_MIN = 7 * 60

// Mirror of server/app/holidays.py.
const HOLIDAYS = new Set([
  '2026-01-01', '2026-01-02',
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-04-27', '2026-04-30', '2026-05-01',
  '2026-08-31', '2026-09-01', '2026-09-02',
])

const SESSIONS: [number, number, MarketSession][] = [
  [9 * 60, 9 * 60 + 15, 'ato'],
  [9 * 60 + 15, 11 * 60 + 30, 'continuous'],
  [11 * 60 + 30, 13 * 60, 'lunch'],
  [13 * 60, 14 * 60 + 30, 'continuous'],
  [14 * 60 + 30, 14 * 60 + 45, 'atc'],
  [14 * 60 + 45, 15 * 60, 'closing'],
]

export const SESSION_LABEL: Record<MarketSession, string> = {
  ato: 'Phiên mở cửa (ATO)',
  continuous: 'Đang khớp lệnh liên tục',
  lunch: 'Nghỉ trưa',
  atc: 'Phiên đóng cửa (ATC)',
  closing: 'Sau giờ khớp lệnh',
  pre: 'Chưa mở cửa',
  closed: 'Đã đóng cửa',
  weekend: 'Nghỉ cuối tuần',
  holiday: 'Nghỉ lễ',
}

export function localSessionAt(t: Date): MarketSession {
  const vn = new Date(t.getTime() + (VN_OFFSET_MIN + t.getTimezoneOffset()) * 60_000)
  const ymd = `${vn.getFullYear()}-${String(vn.getMonth() + 1).padStart(2, '0')}-${String(vn.getDate()).padStart(2, '0')}`
  if (HOLIDAYS.has(ymd)) return 'holiday'
  const day = vn.getDay()
  if (day === 0 || day === 6) return 'weekend'
  const minutes = vn.getHours() * 60 + vn.getMinutes()
  if (minutes < SESSIONS[0][0]) return 'pre'
  return SESSIONS.find(([start, end]) => minutes >= start && minutes < end)?.[2] ?? 'closed'
}

export function localStatus(t = new Date()): MarketStatus {
  const session = localSessionAt(t)
  return { session, label: SESSION_LABEL[session], canTrade: session === 'continuous' }
}

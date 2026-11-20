import { supabase } from './supabase'

type Props = Record<string, string | number | boolean | null>

interface UsageEvent {
  session_id: string
  name: string
  path: string
  props: Props
  device: Device
}

type Device = 'mobile' | 'tablet' | 'desktop'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

const SESSION_KEY = 'hg_session'
const SESSION_IDLE_MS = 30 * 60 * 1000
const FLUSH_MS = 5000
const MAX_QUEUE = 200

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Class ids are opaque; collapse them so pages group together. Stock symbols and lesson ids stay. */
export function normalizePath(pathname: string): string {
  return pathname.replace(UUID, ':id').slice(0, 200) || '/'
}

export function deviceFor(width: number): Device {
  return width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'
}

/** A session ends after 30 idle minutes, like most analytics tools. */
export function nextSession(stored: { id: string; last: number } | null, now: number, newId: () => string): { id: string; last: number } {
  return stored && now - stored.last < SESSION_IDLE_MS ? { id: stored.id, last: now } : { id: newId(), last: now }
}

let memorySession: { id: string; last: number } | null = null

function sessionId(): string {
  let stored: { id: string; last: number } | null
  try {
    stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')
  } catch {
    stored = memorySession
  }
  const next = nextSession(stored, Date.now(), () => crypto.randomUUID())
  memorySession = next
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    return next.id
  }
  return next.id
}

let queue: UsageEvent[] = []
let token: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null

function flush() {
  if (timer) clearTimeout(timer)
  timer = null
  if (!url || !key || !token || queue.length === 0) return
  const batch = queue
  queue = []
  void fetch(`${url}/rest/v1/usage_events`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(batch),
  }).catch(() => {})
}

function schedule() {
  if (!timer) timer = setTimeout(flush, FLUSH_MS)
}

if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    token = session?.access_token ?? null
    if (token && queue.length) schedule()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}

/** Records that someone used a page or feature. Never include free text the user typed. */
export function track(name: string, props: Props = {}): void {
  if (!supabase || typeof window === 'undefined') return
  queue.push({ session_id: sessionId(), name, path: normalizePath(window.location.pathname), props, device: deviceFor(window.innerWidth) })
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE)
  schedule()
}

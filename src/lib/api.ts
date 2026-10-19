import { accessToken } from './supabase'

export const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api`

export function wsUrl(path: string): string {
  if (/^https?:/.test(API_BASE)) return `${API_BASE.replace(/^http/, 'ws')}${path}`
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}${API_BASE}${path}`
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: { detail?: string; topic?: string },
  ) {
    super(body.detail ?? `HTTP ${status}`)
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body)
  }
  return res
}

export async function apiJSON<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  return (res.status === 204 ? undefined : await res.json()) as T
}

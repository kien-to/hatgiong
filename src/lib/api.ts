import { accessToken } from './supabase'

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
  const res = await fetch(`/api${path}`, { ...init, headers })
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

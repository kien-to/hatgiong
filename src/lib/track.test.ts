import { describe, expect, it, vi } from 'vitest'
import { deviceFor, nextSession, normalizePath } from './track'

vi.mock('./supabase', () => ({ supabase: null }))

describe('normalizePath', () => {
  it('collapses class ids but keeps symbols and lessons', () => {
    expect(normalizePath('/classes/0b6f1c2e-5d1a-4c8e-9f3b-2a7d4e6f8a10')).toBe('/classes/:id')
    expect(normalizePath('/stock/FPT')).toBe('/stock/FPT')
    expect(normalizePath('/learn/lai-kep')).toBe('/learn/lai-kep')
  })
})

describe('deviceFor', () => {
  it('buckets by viewport width', () => {
    expect(deviceFor(390)).toBe('mobile')
    expect(deviceFor(800)).toBe('tablet')
    expect(deviceFor(1440)).toBe('desktop')
  })
})

describe('nextSession', () => {
  const newId = () => 'new'
  it('keeps the session while active', () => {
    expect(nextSession({ id: 'old', last: 0 }, 29 * 60 * 1000, newId)).toEqual({ id: 'old', last: 29 * 60 * 1000 })
  })
  it('starts a new one after 30 idle minutes or without a stored session', () => {
    expect(nextSession({ id: 'old', last: 0 }, 30 * 60 * 1000, newId).id).toBe('new')
    expect(nextSession(null, 5, newId).id).toBe('new')
  })
})

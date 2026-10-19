import type { PlaceResult } from '@/domain/trading'
import type { Account, Order, OrderRequest, Profile, Quote, Stock } from '@/domain/types'
import { ApiError, apiJSON } from '@/lib/api'
import type { AccountService, UserSnapshot } from '../types'

const PENDING_REFRESH_MS = 10_000

export class HttpAccountService implements AccountService {
  private lastSync = 0

  load(): Promise<UserSnapshot> {
    return apiJSON<UserSnapshot>('/me')
  }

  saveProfile(profile: Profile, onboarded: boolean): Promise<void> {
    return apiJSON('/profile', { method: 'PUT', body: JSON.stringify({ ...profile, onboarded }) })
  }

  async placeOrder(req: OrderRequest, _stock: Stock, _quote: Quote): Promise<PlaceResult> {
    try {
      const res = await apiJSON<{ order: Order; account: Account }>('/orders', { method: 'POST', body: JSON.stringify(req) })
      return { ok: true, ...res }
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        return { ok: false, error: { message: e.body.detail ?? 'Lệnh bị từ chối.', topic: e.body.topic as never } }
      }
      return { ok: false, error: { message: 'Không gửi được lệnh. Kiểm tra kết nối và thử lại.' } }
    }
  }

  async cancelOrder(id: string): Promise<Account> {
    return (await apiJSON<{ account: Account }>(`/orders/${id}/cancel`, { method: 'POST' })).account
  }

  async resetAccount(): Promise<Account> {
    return (await apiJSON<{ account: Account }>('/portfolio/reset', { method: 'POST' })).account
  }

  async setWatch(symbol: string, on: boolean): Promise<string[]> {
    return (await apiJSON<{ watchlist: string[] }>(`/watchlist/${symbol}`, { method: on ? 'PUT' : 'DELETE' })).watchlist
  }

  recordQuiz(lessonId: string, score: number, total: number, answers: Record<string, number>): Promise<void> {
    return apiJSON('/quiz-attempts', { method: 'POST', body: JSON.stringify({ lessonId, score, total, answers }) })
  }

  async sync(account: Account): Promise<{ account: Account; filled: Order[] } | null> {
    const pending = account.orders.filter((o) => o.status === 'pending')
    if (pending.length === 0 || Date.now() - this.lastSync < PENDING_REFRESH_MS) return null
    this.lastSync = Date.now()
    const { account: next } = await this.load()
    const byId = new Map(next.orders.map((o) => [o.id, o]))
    const filled = pending.map((o) => byId.get(o.id)).filter((o): o is Order => o?.status === 'filled')
    return { account: next, filled }
  }
}

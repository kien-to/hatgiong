import { create } from 'zustand'
import { STARTING_CASH } from '@/domain/market'
import { createAccount, type PlaceResult } from '@/domain/trading'
import { REVIEW_LESSON_ID } from '@/domain/review'
import type { Account, Order, OrderRequest, Profile, Quote, QuizAttempt, QuizResult, SessionUser, Stock } from '@/domain/types'
import { accounts } from '@/services'

interface UserState {
  loaded: boolean
  loadError: boolean
  user: SessionUser | null
  onboarded: boolean
  profile: Profile
  account: Account
  watchlist: string[]
  quizResults: Record<string, QuizResult>
  quizAttempts: QuizAttempt[]
  load: () => Promise<void>
  completeOnboarding: (profile: Profile) => Promise<void>
  placeOrder: (req: OrderRequest, stock: Stock, quote: Quote) => Promise<PlaceResult>
  cancelOrder: (id: string) => Promise<void>
  resetAccount: () => Promise<void>
  toggleWatch: (symbol: string) => Promise<void>
  recordQuiz: (lessonId: string, score: number, total: number, answers: Record<string, number>) => Promise<void>
  onQuotes: (quotes: Record<string, Quote>) => Promise<Order[]>
}

let syncing = false

export const useUser = create<UserState>()((set, get) => ({
  loaded: false,
  loadError: false,
  user: null,
  onboarded: false,
  profile: { name: '', level: 'newbie' },
  account: createAccount(STARTING_CASH, Date.now()),
  watchlist: [],
  quizResults: {},
  quizAttempts: [],

  load: async () => {
    try {
      const snapshot = await accounts.load()
      set({ ...snapshot, loaded: true, loadError: false })
    } catch {
      set({ loadError: true })
    }
  },

  completeOnboarding: async (profile) => {
    set({ profile, onboarded: true })
    await accounts.saveProfile(profile, true)
  },

  placeOrder: async (req, stock, quote) => {
    const result = await accounts.placeOrder(req, stock, quote)
    if (result.ok) set({ account: result.account })
    return result
  },

  cancelOrder: async (id) => set({ account: await accounts.cancelOrder(id) }),

  resetAccount: async () => set({ account: await accounts.resetAccount() }),

  toggleWatch: async (symbol) => {
    const on = !get().watchlist.includes(symbol)
    set({ watchlist: on ? [...get().watchlist, symbol] : get().watchlist.filter((s) => s !== symbol) })
    try {
      set({ watchlist: await accounts.setWatch(symbol, on) })
    } catch {
      set({ watchlist: on ? get().watchlist.filter((s) => s !== symbol) : [...get().watchlist, symbol] })
    }
  },

  recordQuiz: async (lessonId, score, total, answers) => {
    const now = Date.now()
    const quizAttempts = [...get().quizAttempts, { lessonId, score, total, answers, createdAt: now }]
    if (lessonId === REVIEW_LESSON_ID) {
      set({ quizAttempts })
    } else {
      const prev = get().quizResults[lessonId]
      set({
        quizAttempts,
        quizResults: {
          ...get().quizResults,
          [lessonId]: { score: Math.max(score, prev?.score ?? 0), total, attempts: (prev?.attempts ?? 0) + 1, completedAt: now },
        },
      })
    }
    await accounts.recordQuiz(lessonId, score, total, answers)
  },

  onQuotes: async (quotes) => {
    if (!get().loaded || syncing) return []
    syncing = true
    try {
      const result = await accounts.sync(get().account, quotes)
      if (!result) return []
      set({ account: result.account })
      return result.filled
    } catch {
      return []
    } finally {
      syncing = false
    }
  },
}))

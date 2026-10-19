import { STARTING_CASH } from '@/domain/market'
import { REVIEW_LESSON_ID } from '@/domain/review'
import { cancelOrder, createAccount, placeOrder, processPendingOrders, totalEquity, type PlaceResult } from '@/domain/trading'
import type { Account, OrderRequest, Profile, Quote, QuizResult, Stock } from '@/domain/types'
import type { AccountService, UserSnapshot } from '../types'

const KEY = 'hatgiong:local:v2'
const MAX_EQUITY_POINTS = 1000
const EQUITY_SAMPLE_MS = 15_000

type Stored = Omit<UserSnapshot, 'user'>

function fresh(): Stored {
  return {
    profile: { name: '', level: 'newbie' },
    onboarded: false,
    account: createAccount(STARTING_CASH, Date.now()),
    watchlist: ['VNM', 'FPT', 'VCB', 'HPG', 'MWG'],
    quizResults: {},
    quizAttempts: [],
  }
}

function withEquity(account: Account, quotes: Record<string, Quote>, force: boolean): Account {
  const last = account.equityHistory[account.equityHistory.length - 1]
  const now = Date.now()
  if (!force && last && now - last.t < EQUITY_SAMPLE_MS) return account
  return { ...account, equityHistory: [...account.equityHistory, { t: now, v: totalEquity(account, quotes) }].slice(-MAX_EQUITY_POINTS) }
}

/** Browser-only account used when no backend is configured (offline demo mode). */
export class LocalAccountService implements AccountService {
  private state: Stored

  constructor() {
    try {
      this.state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    } catch {
      this.state = fresh()
    }
  }

  private save(patch: Partial<Stored>) {
    this.state = { ...this.state, ...patch }
    localStorage.setItem(KEY, JSON.stringify(this.state))
  }

  async load(): Promise<UserSnapshot> {
    return { ...this.state, user: null }
  }

  async saveProfile(profile: Profile, onboarded: boolean): Promise<void> {
    this.save({ profile, onboarded })
  }

  async placeOrder(req: OrderRequest, stock: Stock, quote: Quote): Promise<PlaceResult> {
    const result = placeOrder(this.state.account, req, stock, quote, Date.now(), crypto.randomUUID())
    if (!result.ok) return result
    const account = withEquity(result.account, { [quote.symbol]: quote }, result.order.status === 'filled')
    this.save({ account })
    return { ...result, account }
  }

  async cancelOrder(id: string): Promise<Account> {
    this.save({ account: cancelOrder(this.state.account, id) })
    return this.state.account
  }

  async resetAccount(): Promise<Account> {
    this.save({ account: createAccount(STARTING_CASH, Date.now()) })
    return this.state.account
  }

  async setWatch(symbol: string, on: boolean): Promise<string[]> {
    const list = this.state.watchlist.filter((s) => s !== symbol)
    this.save({ watchlist: on ? [...list, symbol] : list })
    return this.state.watchlist
  }

  async recordQuiz(lessonId: string, score: number, total: number, answers: Record<string, number>): Promise<void> {
    const quizAttempts = [...this.state.quizAttempts, { lessonId, score, total, answers, createdAt: Date.now() }]
    if (lessonId === REVIEW_LESSON_ID) {
      this.save({ quizAttempts })
      return
    }
    const prev: QuizResult | undefined = this.state.quizResults[lessonId]
    this.save({
      quizAttempts,
      quizResults: {
        ...this.state.quizResults,
        [lessonId]: { score: Math.max(score, prev?.score ?? 0), total, attempts: (prev?.attempts ?? 0) + 1, completedAt: Date.now() },
      },
    })
  }

  async sync(_account: Account, quotes: Record<string, Quote>) {
    const { account, filled } = processPendingOrders(this.state.account, quotes, Date.now())
    const next = withEquity(account, quotes, filled.length > 0)
    if (next === this.state.account) return null
    this.save({ account: next })
    return { account: next, filled }
  }
}

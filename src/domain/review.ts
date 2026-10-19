import { LESSON_BY_ID, type QuizQuestion } from '@/content/lessons'
import type { QuizAttempt } from './types'

export const REVIEW_LESSON_ID = 'review'
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]
export const MASTERED_BOX = 3
const DAY_MS = 86_400_000

export interface ReviewCard {
  key: string
  lessonId: string
  question: QuizQuestion
  box: number
  lastSeen: number
  due: number
  seen: number
}

export function cardKey(lessonId: string, questionId: string): string {
  return `${lessonId}:${questionId}`
}

function resolve(key: string): { lessonId: string; question: QuizQuestion } | null {
  const [lessonId, questionId] = key.split(':')
  const question = LESSON_BY_ID[lessonId]?.quiz.find((q) => q.id === questionId)
  return question ? { lessonId, question } : null
}

export function buildCards(attempts: QuizAttempt[]): Map<string, ReviewCard> {
  const cards = new Map<string, ReviewCard>()
  const ordered = [...attempts].sort((a, b) => a.createdAt - b.createdAt)
  for (const attempt of ordered) {
    for (const [answerKey, choice] of Object.entries(attempt.answers)) {
      const key = attempt.lessonId === REVIEW_LESSON_ID ? answerKey : cardKey(attempt.lessonId, answerKey)
      const found = resolve(key)
      if (!found) continue
      const prev = cards.get(key)
      const correct = choice === found.question.answer
      const box = correct ? Math.min((prev?.box ?? 0) + 1, INTERVAL_DAYS.length - 1) : 0
      cards.set(key, {
        key,
        lessonId: found.lessonId,
        question: found.question,
        box,
        lastSeen: attempt.createdAt,
        due: attempt.createdAt + INTERVAL_DAYS[box] * DAY_MS,
        seen: (prev?.seen ?? 0) + 1,
      })
    }
  }
  return cards
}

export function dueCards(cards: Map<string, ReviewCard>, now: number, limit = 8): ReviewCard[] {
  return [...cards.values()]
    .filter((c) => c.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due)
    .slice(0, limit)
}

export interface LearningStats {
  lessonsDone: number
  firstTryPct: number | null
  bestPct: number | null
  cards: number
  mastered: number
  due: number
  reviews: number
  timeline: { t: number; pct: number }[]
}

export function learningStats(attempts: QuizAttempt[], now: number): LearningStats {
  const lessons = new Map<string, { first: number; best: number }>()
  for (const a of [...attempts].sort((x, y) => x.createdAt - y.createdAt)) {
    if (a.lessonId === REVIEW_LESSON_ID) continue
    const pct = (a.score / a.total) * 100
    const prev = lessons.get(a.lessonId)
    lessons.set(a.lessonId, { first: prev?.first ?? pct, best: Math.max(prev?.best ?? 0, pct) })
  }
  const values = [...lessons.values()]
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
  const cards = buildCards(attempts)
  return {
    lessonsDone: lessons.size,
    firstTryPct: avg(values.map((v) => v.first)),
    bestPct: avg(values.map((v) => v.best)),
    cards: cards.size,
    mastered: [...cards.values()].filter((c) => c.box >= MASTERED_BOX).length,
    due: [...cards.values()].filter((c) => c.due <= now).length,
    reviews: attempts.filter((a) => a.lessonId === REVIEW_LESSON_ID).length,
    timeline: [...attempts].sort((a, b) => a.createdAt - b.createdAt).map((a) => ({ t: a.createdAt, pct: (a.score / a.total) * 100 })),
  }
}

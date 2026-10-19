import { describe, expect, it } from 'vitest'
import { LESSON_BY_ID } from '@/content/lessons'
import { buildCards, dueCards, learningStats } from './review'

const DAY = 86_400_000
const lesson = LESSON_BY_ID['stocks-101']
const right = (i: number) => lesson.quiz[i].answer
const wrong = (i: number) => (lesson.quiz[i].answer + 1) % lesson.quiz[i].options.length

describe('spaced repetition', () => {
  it('schedules correct answers further out and resets wrong ones', () => {
    const t0 = Date.UTC(2026, 9, 1)
    const cards = buildCards([
      { lessonId: 'stocks-101', score: 2, total: 3, answers: { q1: right(0), q2: wrong(1), q3: right(2) }, createdAt: t0 },
      { lessonId: 'review', score: 1, total: 1, answers: { 'stocks-101:q1': right(0) }, createdAt: t0 + DAY },
    ])
    expect(cards.get('stocks-101:q1')).toMatchObject({ box: 2, due: t0 + DAY + 3 * DAY, seen: 2 })
    expect(cards.get('stocks-101:q2')).toMatchObject({ box: 0, due: t0 })
    expect(cards.get('stocks-101:q3')).toMatchObject({ box: 1, due: t0 + DAY })

    const due = dueCards(cards, t0 + 2 * DAY)
    expect(due.map((c) => c.key)).toEqual(['stocks-101:q2', 'stocks-101:q3'])
  })

  it('reports learning gain from first try to best score', () => {
    const t0 = Date.UTC(2026, 9, 1)
    const stats = learningStats(
      [
        { lessonId: 'stocks-101', score: 1, total: 3, answers: {}, createdAt: t0 },
        { lessonId: 'stocks-101', score: 3, total: 3, answers: {}, createdAt: t0 + DAY },
      ],
      t0 + 2 * DAY,
    )
    expect(stats.lessonsDone).toBe(1)
    expect(stats.firstTryPct).toBeCloseTo(33.33, 1)
    expect(stats.bestPct).toBe(100)
  })
})

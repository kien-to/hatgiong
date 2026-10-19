import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AskButton, Card } from '@/components/ui'
import { GLOSSARY } from '@/content/glossary'
import { LESSONS, SKILL_LABEL, type Skill } from '@/content/lessons'
import { normalize } from '@/lib/text'
import { useAskTutor } from '@/hooks/useTutorContext'
import type { QuizResult } from '@/domain/types'
import { useUser } from '@/store/user'

export function skillScores(results: Record<string, QuizResult>): Record<Skill, number | null> {
  const out = {} as Record<Skill, number | null>
  for (const skill of Object.keys(SKILL_LABEL) as Skill[]) {
    const lessons = LESSONS.filter((l) => l.skill === skill)
    const scored = lessons.map((l) => results[l.id]).filter(Boolean)
    out[skill] = scored.length ? (scored.reduce((s, r) => s + r.score / r.total, 0) / lessons.length) * 100 : null
  }
  return out
}

export function LearnPage() {
  const results = useUser((s) => s.quizResults)
  const ask = useAskTutor()
  const [query, setQuery] = useState('')
  const scores = skillScores(results)
  const done = LESSONS.filter((l) => results[l.id]).length

  const terms = useMemo(() => {
    const q = normalize(query.trim())
    return q ? GLOSSARY.filter((g) => normalize(`${g.term} ${g.short} ${g.aliases.join(' ')}`).includes(q)) : GLOSSARY
  }, [query])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-500 p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/15" />
        <h1 className="text-2xl font-bold">Học đầu tư</h1>
        <p className="mt-1 max-w-lg text-sm text-white/75">Bài học 3–5 phút, kiểm tra ngay bằng câu hỏi. Điểm số đo mức độ bạn thật sự hiểu — không phải bạn giao dịch nhiều thế nào.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(SKILL_LABEL) as Skill[]).map((skill) => (
            <div key={skill} className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <div className="text-xs text-white/70">{SKILL_LABEL[skill]}</div>
              <div className="mt-1 text-2xl font-extrabold tabular">{scores[skill] === null ? '—' : `${Math.round(scores[skill]!)}%`}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-accent" style={{ width: `${scores[skill] ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-white/80">
          Đã hoàn thành <strong>{done}</strong>/{LESSONS.length} bài học
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Lộ trình cho người mới</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {LESSONS.map((l, i) => {
            const r = results[l.id]
            return (
              <Link key={l.id} to={`/learn/${l.id}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canvas text-2xl">{l.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">
                    Bài {i + 1} · {l.minutes} phút · {SKILL_LABEL[l.skill]}
                  </div>
                  <div className="font-semibold group-hover:text-brand-500">{l.title}</div>
                  <div className="truncate text-xs text-muted">{l.summary}</div>
                </div>
                {r ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.score === r.total ? 'bg-up/10 text-up' : 'bg-ref/15 text-ref'}`}>
                    {r.score}/{r.total}
                  </span>
                ) : (
                  <span className="text-muted">›</span>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Từ điển đầu tư</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thuật ngữ…"
            className="w-full max-w-xs rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {terms.map((g) => (
            <Card key={g.id} className="flex flex-col p-4">
              <div className="font-semibold">{g.term}</div>
              <p className="mt-1 flex-1 text-sm text-muted">{g.short}</p>
              <AskButton className="mt-3 self-start" question={`${g.term} là gì?`} onAsk={ask} label="Giải thích kỹ hơn" />
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuizQuestionCard } from '@/components/QuizQuestionCard'
import { Card } from '@/components/ui'
import { LESSON_BY_ID } from '@/content/lessons'
import { buildCards, dueCards, REVIEW_LESSON_ID, type ReviewCard } from '@/domain/review'
import { useAskTutor } from '@/hooks/useTutorContext'
import { useUser } from '@/store/user'

export function ReviewPage() {
  const attempts = useUser((s) => s.quizAttempts)
  const recordQuiz = useUser((s) => s.recordQuiz)
  const ask = useAskTutor()
  const [session, setSession] = useState<ReviewCard[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const cards = useMemo(() => buildCards(attempts), [attempts])
  const due = useMemo(() => dueCards(cards, Date.now()), [cards])
  const next = useMemo(() => [...cards.values()].filter((c) => c.due > Date.now()).sort((a, b) => a.due - b.due)[0], [cards])

  const start = () => {
    setSession(due)
    setAnswers({})
    setSubmitted(false)
  }

  const active = session ?? []
  const score = active.filter((c) => answers[c.key] === c.question.answer).length

  const submit = () => {
    setSubmitted(true)
    void recordQuiz(REVIEW_LESSON_ID, score, active.length, answers)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/learn" className="text-sm font-semibold text-muted hover:text-ink">
        ‹ Học
      </Link>
      <div>
        <div className="text-4xl">🔁</div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Ôn tập</h1>
        <p className="mt-2 text-muted">
          Câu hỏi bạn từng làm sẽ quay lại đúng lúc bạn sắp quên: trả lời đúng thì lần sau xa hơn (1, 3, 7, 14, 30 ngày), trả lời sai thì gặp lại sớm.
        </p>
      </div>

      {!session && (
        <Card className="p-6 text-center">
          {cards.size === 0 ? (
            <>
              <div className="font-semibold">Chưa có gì để ôn</div>
              <p className="mt-1 text-sm text-muted">Hoàn thành một bài học trước, câu hỏi của bài đó sẽ xuất hiện ở đây.</p>
              <Link to="/learn" className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">
                Chọn bài học
              </Link>
            </>
          ) : due.length === 0 ? (
            <>
              <div className="text-3xl">✅</div>
              <div className="mt-2 font-semibold">Bạn đã ôn hết cho hôm nay</div>
              {next && <p className="mt-1 text-sm text-muted">Câu tiếp theo đến hạn vào {new Date(next.due).toLocaleDateString('vi-VN')}.</p>}
            </>
          ) : (
            <>
              <div className="text-4xl font-extrabold text-brand tabular">{due.length}</div>
              <div className="mt-1 text-sm text-muted">câu hỏi đến hạn ôn tập</div>
              <button onClick={start} className="mt-5 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-600">
                Bắt đầu ôn
              </button>
            </>
          )}
        </Card>
      )}

      {session && (
        <section className="space-y-4">
          {active.map((c, i) => (
            <QuizQuestionCard
              key={c.key}
              index={i}
              tag={LESSON_BY_ID[c.lessonId]?.title}
              question={c.question}
              picked={answers[c.key]}
              submitted={submitted}
              onPick={(oi) => setAnswers({ ...answers, [c.key]: oi })}
              askPrompt={LESSON_BY_ID[c.lessonId]?.askPrompt ?? c.question.question}
              onAsk={ask}
            />
          ))}
          {!submitted ? (
            <button
              disabled={active.some((c) => answers[c.key] === undefined)}
              onClick={submit}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white hover:bg-accent-600 disabled:opacity-40"
            >
              Nộp bài ôn tập
            </button>
          ) : (
            <Card className="p-6 text-center">
              <div className="text-xl font-bold">
                Đúng {score}/{active.length} câu
              </div>
              <p className="mt-1 text-sm text-muted">Câu đúng được dời lịch ôn xa hơn; câu sai sẽ quay lại sớm.</p>
              <button onClick={() => setSession(null)} className="mt-4 rounded-xl border border-line px-5 py-2.5 text-sm font-semibold">
                Xong
              </button>
            </Card>
          )}
        </section>
      )}
    </div>
  )
}

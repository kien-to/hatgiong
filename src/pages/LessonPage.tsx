import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CompoundCalculator } from '@/components/CompoundCalculator'
import { QuizQuestionCard } from '@/components/QuizQuestionCard'
import { AskButton, Card } from '@/components/ui'
import { LESSONS, LESSON_BY_ID } from '@/content/lessons'
import { useAskTutor } from '@/hooks/useTutorContext'
import { useUser } from '@/store/user'

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const lesson = LESSON_BY_ID[lessonId]
  const navigate = useNavigate()
  const recordQuiz = useUser((s) => s.recordQuiz)
  const ask = useAskTutor()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setAnswers({})
    setSubmitted(false)
  }, [lessonId])

  if (!lesson) {
    return (
      <Card className="p-10 text-center">
        <div className="font-semibold">Không tìm thấy bài học</div>
        <Link to="/learn" className="mt-2 inline-block text-sm font-semibold text-brand-500">
          Về trang Học
        </Link>
      </Card>
    )
  }

  const index = LESSONS.findIndex((l) => l.id === lesson.id)
  const next = LESSONS[index + 1]
  const score = lesson.quiz.filter((q) => answers[q.id] === q.answer).length
  const allAnswered = lesson.quiz.every((q) => answers[q.id] !== undefined)

  const submit = () => {
    setSubmitted(true)
    void recordQuiz(lesson.id, score, lesson.quiz.length, answers)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/learn" className="text-sm font-semibold text-muted hover:text-ink">
        ‹ Tất cả bài học
      </Link>
      <div>
        <div className="text-4xl">{lesson.icon}</div>
        <div className="mt-3 text-sm text-muted">
          Bài {index + 1}/{LESSONS.length} · {lesson.minutes} phút đọc
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{lesson.title}</h1>
        <p className="mt-2 text-muted">{lesson.summary}</p>
      </div>

      <Card className="divide-y divide-line">
        {lesson.sections.map((s) => (
          <div key={s.heading} className="p-5">
            <h2 className="font-bold">{s.heading}</h2>
            <p className="mt-1.5 leading-relaxed text-ink/80">{s.body}</p>
          </div>
        ))}
      </Card>

      {lesson.widget === 'compound' && <CompoundCalculator />}

      <div className="flex items-center gap-3 rounded-2xl bg-brand-500/5 p-4 text-sm">
        <span className="flex-1">Còn thắc mắc? Mầm có thể giải thích theo cách khác hoặc cho thêm ví dụ.</span>
        <AskButton question={lesson.askPrompt} onAsk={ask} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Kiểm tra nhanh</h2>
        <div className="space-y-4">
          {lesson.quiz.map((q, qi) => (
            <QuizQuestionCard
              key={q.id}
              index={qi}
              question={q}
              picked={answers[q.id]}
              submitted={submitted}
              onPick={(oi) => setAnswers({ ...answers, [q.id]: oi })}
              askPrompt={lesson.askPrompt}
              onAsk={ask}
            />
          ))}
        </div>

        {!submitted ? (
          <button
            disabled={!allAnswered}
            onClick={submit}
            className="mt-5 w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-40"
          >
            Nộp bài
          </button>
        ) : (
          <Card className="mt-5 p-6 text-center">
            <div className="text-4xl">{score === lesson.quiz.length ? '🎉' : score >= 2 ? '👍' : '📚'}</div>
            <div className="mt-2 text-xl font-bold">
              Bạn trả lời đúng {score}/{lesson.quiz.length} câu
            </div>
            <p className="mt-1 text-sm text-muted">{score === lesson.quiz.length ? 'Xuất sắc! Bạn đã nắm vững bài này.' : 'Đọc lại phần giải thích và thử lại nhé.'}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => {
                  setAnswers({})
                  setSubmitted(false)
                }}
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold"
              >
                Làm lại
              </button>
              {next ? (
                <button onClick={() => navigate(`/learn/${next.id}`)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">
                  Bài tiếp: {next.title} ›
                </button>
              ) : (
                <Link to="/market" className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">
                  Thực hành trên bảng giá ›
                </Link>
              )}
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}

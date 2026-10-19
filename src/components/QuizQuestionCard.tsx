import type { QuizQuestion } from '@/content/lessons'
import { AskButton, Card } from './ui'

interface Props {
  index: number
  question: QuizQuestion
  picked: number | undefined
  submitted: boolean
  onPick: (option: number) => void
  askPrompt: string
  onAsk: (q: string) => void
  tag?: string
}

export function QuizQuestionCard({ index, question, picked, submitted, onPick, askPrompt, onAsk, tag }: Props) {
  return (
    <Card className="p-5">
      {tag && <div className="mb-1 text-xs font-semibold text-muted">{tag}</div>}
      <div className="font-semibold">
        {index + 1}. {question.question}
      </div>
      <div className="mt-3 space-y-2">
        {question.options.map((opt, oi) => {
          const isPicked = picked === oi
          const correct = submitted && oi === question.answer
          const wrong = submitted && isPicked && oi !== question.answer
          return (
            <button
              key={oi}
              disabled={submitted}
              onClick={() => onPick(oi)}
              className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                correct ? 'border-up bg-up/10 font-semibold text-up' : wrong ? 'border-down bg-down/10 text-down' : isPicked ? 'border-brand-500 bg-brand-500/5' : 'border-line hover:border-muted'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {submitted && (
        <div className={`mt-3 rounded-xl p-3 text-sm ${picked === question.answer ? 'bg-up/5' : 'bg-ref/10'}`}>
          <strong>{picked === question.answer ? 'Chính xác! ' : 'Chưa đúng. '}</strong>
          {question.explain}
          {picked !== question.answer && <AskButton className="ml-1 mt-2" question={askPrompt} onAsk={onAsk} label="Hỏi Mầm thêm" />}
        </div>
      )}
    </Card>
  )
}

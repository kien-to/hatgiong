import { useAskTutor, useTutorContext } from '@/hooks/useTutorContext'
import { ai, type InsightTone } from '@/services'
import { AskButton, Card, SparkleIcon } from './ui'

const TONE: Record<InsightTone, string> = {
  info: 'bg-brand-500/10 text-brand-500',
  warning: 'bg-ref/15 text-ref',
  success: 'bg-up/10 text-up',
}

const ICON: Record<InsightTone, string> = { info: '💡', warning: '⚠️', success: '✅' }

export function InsightCards() {
  const context = useTutorContext()
  const ask = useAskTutor()
  const insights = ai.insights(context)
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent-600">
          <SparkleIcon className="h-3.5 w-3.5" />
        </div>
        <div className="font-bold">Mầm nhận thấy</div>
      </div>
      <div className="space-y-3">
        {insights.map((i) => (
          <div key={i.id} className="flex gap-3 rounded-xl bg-canvas p-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${TONE[i.tone]}`}>{ICON[i.tone]}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{i.title}</div>
              <div className="mt-0.5 text-xs text-muted">{i.body}</div>
              {i.ask && <AskButton className="mt-2" question={i.ask} onAsk={ask} />}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

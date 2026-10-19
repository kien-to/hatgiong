import { useAskTutor } from '@/hooks/useTutorContext'
import { useUI } from '@/store/ui'
import { AskButton } from './ui'

const TONE = {
  success: 'border-up/30 before:bg-up',
  error: 'border-down/30 before:bg-down',
  info: 'border-brand-500/30 before:bg-brand-500',
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  const ask = useAskTutor()
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 lg:bottom-6 lg:left-6 lg:translate-x-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`fade-up pointer-events-auto relative overflow-hidden rounded-xl border bg-white py-3 pl-5 pr-4 shadow-lg before:absolute before:inset-y-0 before:left-0 before:w-1 ${TONE[t.tone]}`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.body && <div className="mt-0.5 text-sm text-muted">{t.body}</div>}
              {t.ask && (
                <AskButton
                  className="mt-2"
                  question={t.ask}
                  label="Mầm giải thích"
                  onAsk={(q) => {
                    dismiss(t.id)
                    ask(q)
                  }}
                />
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Đóng">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

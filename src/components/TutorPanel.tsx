import { useEffect, useRef, useState } from 'react'
import { useTutorContext } from '@/hooks/useTutorContext'
import { ai } from '@/services'
import { useTutor } from '@/store/tutor'
import { useUI } from '@/store/ui'
import { Markdown, SparkleIcon } from './ui'

export function TutorPanel() {
  const open = useUI((s) => s.tutorOpen)
  const setOpen = useUI((s) => s.setTutorOpen)
  const { messages, streaming, send, clear } = useTutor()
  const context = useTutorContext()
  const [input, setInput] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const submit = (text: string) => {
    if (!text.trim()) return
    void send(text, context)
    setInput('')
  }

  if (!open) return null
  const suggestions = ai.suggestions(context)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-brand/20 backdrop-blur-[1px] lg:hidden" onClick={() => setOpen(false)} />
      <aside className="slide-in relative flex h-full w-full max-w-md flex-col border-l border-line bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-brand to-brand-600 px-5 py-4 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
            <SparkleIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Mầm · Trợ lý học đầu tư</div>
            <div className="text-xs text-white/70">Giải thích mọi thứ, không đưa ra khuyến nghị mua bán</div>
          </div>
          {messages.length > 0 && (
            <button onClick={clear} className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white">
              Xóa
            </button>
          )}
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="Đóng">
            ✕
          </button>
        </header>

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="fade-up rounded-2xl bg-canvas p-4 text-sm leading-relaxed">
              <p className="font-semibold">Chào{context.name ? ` ${context.name}` : ''}! Mình là Mầm 🌱</p>
              <p className="mt-1 text-muted">
                Mình biết bạn đang xem trang nào và danh mục của bạn ra sao, nên cứ hỏi tự nhiên nhé. Ví dụ: “P/E là gì?”, “Vì sao lệnh của mình bị từ chối?”
              </p>
            </div>
          )}
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="fade-up flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-white">{m.content}</div>
              </div>
            ) : (
              <div key={m.id} className="fade-up flex gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-600">
                  <SparkleIcon className="h-3.5 w-3.5" />
                </div>
                <div className={`min-w-0 flex-1 text-sm leading-relaxed text-ink ${streaming && m === messages[messages.length - 1] ? 'caret' : ''}`}>
                  {m.content ? <Markdown text={m.content} /> : <span className="text-muted">Mầm đang suy nghĩ…</span>}
                </div>
              </div>
            ),
          )}
        </div>

        <div className="border-t border-line px-4 pb-4 pt-3">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <button
                key={s}
                disabled={streaming}
                onClick={() => submit(s)}
                className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:border-brand-500 hover:text-brand-500 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
            className="flex items-end gap-2 rounded-2xl border border-line bg-canvas p-2 focus-within:border-brand-500"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit(input)
                }
              }}
              rows={1}
              placeholder="Hỏi Mầm bất cứ điều gì…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-40"
            >
              Gửi
            </button>
          </form>
        </div>
      </aside>
    </div>
  )
}

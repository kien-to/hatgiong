import { create } from 'zustand'
import { ai, type ChatMessage, type TutorContext } from '@/services'

interface TutorState {
  messages: ChatMessage[]
  streaming: boolean
  send: (text: string, context: TutorContext) => Promise<void>
  clear: () => void
}

export const useTutor = create<TutorState>()((set, get) => ({
  messages: [],
  streaming: false,
  send: async (text, context) => {
    const trimmed = text.trim()
    if (!trimmed || get().streaming) return
    const history = get().messages
    const user: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const reply: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' }
    set({ messages: [...history, user, reply], streaming: true })
    try {
      for await (const chunk of ai.reply(trimmed, history, context)) {
        set({ messages: get().messages.map((m) => (m.id === reply.id ? { ...m, content: m.content + chunk } : m)) })
      }
    } catch {
      set({ messages: get().messages.map((m) => (m.id === reply.id ? { ...m, content: 'Xin lỗi, Mầm đang gặp sự cố. Bạn thử lại sau nhé.' } : m)) })
    } finally {
      set({ streaming: false })
    }
  },
  clear: () => set({ messages: [] }),
}))

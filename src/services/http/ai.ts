import { apiFetch } from '@/lib/api'
import type { AIService, ChatMessage, Insight, TutorContext } from '../types'

export class HttpAIService implements AIService {
  private health: Promise<boolean> | undefined

  constructor(
    private readonly fallback: AIService,
    private readonly baseUrl = '/api',
  ) {}

  private available(): Promise<boolean> {
    this.health ??= fetch(`${this.baseUrl}/health`)
      .then((r) => (r.ok ? r.json() : { tutor: false }))
      .then((h: { tutor?: boolean }) => Boolean(h.tutor))
      .catch(() => false)
    return this.health
  }

  async *reply(message: string, history: ChatMessage[], context: TutorContext): AsyncIterable<string> {
    if (!(await this.available())) {
      yield* this.fallback.reply(message, history, context)
      return
    }
    let res: Response
    try {
      res = await apiFetch('/tutor', {
        method: 'POST',
        body: JSON.stringify({
          message,
          history: history.filter((m) => m.content).map(({ role, content }) => ({ role, content })),
          context,
        }),
      })
    } catch {
      yield* this.fallback.reply(message, history, context)
      return
    }
    if (!res.body) {
      yield* this.fallback.reply(message, history, context)
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (text) yield text
    }
    const tail = decoder.decode()
    if (tail) yield tail
  }

  suggestions(context: TutorContext): string[] {
    return this.fallback.suggestions(context)
  }

  insights(context: TutorContext): Insight[] {
    return this.fallback.insights(context)
  }
}

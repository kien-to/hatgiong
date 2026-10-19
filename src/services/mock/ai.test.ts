import { describe, expect, it } from 'vitest'
import type { TutorContext } from '../types'
import { MockAIService, composeReply } from './ai'

const base: TutorContext = {
  page: 'home',
  level: 'newbie',
  name: 'Minh',
  cash: 100_000_000,
  equity: 100_000_000,
  startingCash: 100_000_000,
  positions: [],
  filledOrders: 0,
  recentTrades: [],
}

describe('mock tutor', () => {
  it('answers glossary questions with or without diacritics', () => {
    expect(composeReply('P/E là gì?', base)).toContain('P/E')
    expect(composeReply('lai kep la gi', base)).toContain('Lãi kép')
    expect(composeReply('Giá trần là gì?', base)).toContain('±7%')
  })

  it('explains a company by ticker', () => {
    const reply = composeReply('fpt là công ty gì?', base)
    expect(reply).toContain('FPT – Công ty CP FPT')
    expect(reply).toContain('biên độ ±7%)')
  })

  it('never gives a buy recommendation', () => {
    const reply = composeReply('Có nên mua VNM không?', base)
    expect(reply).toContain('không thể nói bạn nên mua hay bán')
  })

  it('flags a concentrated portfolio', () => {
    const ctx: TutorContext = {
      ...base,
      cash: 20_000_000,
      positions: [
        { symbol: 'VCB', sector: 'Ngân hàng', weightPct: 80, pnlPct: 2 },
        { symbol: 'FPT', sector: 'Công nghệ', weightPct: 20, pnlPct: -1 },
      ],
    }
    expect(composeReply('Đánh giá danh mục của tôi', ctx)).toContain('VCB** chiếm 80')
    expect(new MockAIService().insights(ctx).map((i) => i.id)).toContain('concentration')
  })

  it('does not mistake common words for keywords', () => {
    expect(composeReply('khoảng bao nhiêu tiền thì mua được FPT?', base)).not.toContain('Thấy danh mục đỏ')
  })
})

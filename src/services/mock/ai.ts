import { GLOSSARY, type GlossaryEntry } from '@/content/glossary'
import { SEED_BY_SYMBOL, SEED_STOCKS } from '@/content/stocks'
import { formatCompactVND, formatDecimal, formatPct, formatPrice } from '@/domain/format'
import { priceBandPct } from '@/domain/market'
import { lookupStock as getStock } from '@/lib/stockRegistry'
import { normalize } from '@/lib/text'
import type { AIService, ChatMessage, Insight, TutorContext } from '../types'

const has = (text: string, ...keys: string[]) => keys.some((k) => text.includes(normalize(k)))

const DISCLAIMER = '_Đây là môi trường mô phỏng để học. Mình không đưa ra khuyến nghị mua bán thật._'

function findGlossary(text: string): GlossaryEntry | undefined {
  let best: { entry: GlossaryEntry; len: number } | undefined
  for (const entry of GLOSSARY) {
    for (const alias of [entry.term, ...entry.aliases]) {
      const a = normalize(alias)
      if (a.length >= 2 && new RegExp(`(^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}($|[^a-z0-9])`).test(text)) {
        if (!best || a.length > best.len) best = { entry, len: a.length }
      }
    }
  }
  return best?.entry
}

function findSymbol(message: string, ctx: TutorContext): string | undefined {
  const tokens = message.split(/[^\p{L}\p{N}]+/u)
  const typed = tokens.find((t) => /^[A-Z0-9]{3}$/.test(t) && getStock(t))
  if (typed) return typed
  const known = tokens.map((t) => t.toUpperCase()).find((t) => SEED_BY_SYMBOL[t])
  if (known) return known
  return has(normalize(message), 'cổ phiếu này', 'công ty này', 'mã này') ? ctx.stock?.symbol : undefined
}

function greeting(ctx: TutorContext): string {
  const name = ctx.name ? ` ${ctx.name}` : ''
  return [
    `Chào${name}! 👋 Mình là **Mầm**, trợ lý học đầu tư của bạn.`,
    '',
    'Mình có thể:',
    '- Giải thích bất kỳ thuật ngữ nào (P/E, cổ tức, giá trần…)',
    '- Giới thiệu về một công ty, ví dụ "FPT là công ty gì?"',
    '- Đánh giá mức độ rủi ro của danh mục bạn đang tập',
    '',
    'Bạn muốn bắt đầu từ đâu?',
  ].join('\n')
}

function gettingStarted(ctx: TutorContext): string {
  if (ctx.positions.length === 0) {
    return [
      `Bạn đang có **${formatCompactVND(ctx.cash)}** tiền ảo. Đây là lộ trình 4 bước mình gợi ý:`,
      '',
      '1. **Học 2 bài đầu** ở mục Học: "Cổ phiếu là gì?" và "Đọc bảng giá Việt Nam" (khoảng 7 phút).',
      '2. **Chọn một công ty bạn hiểu**, ví dụ bạn hay uống sữa Vinamilk (VNM) hoặc dùng ví/ngân hàng MB (MBB).',
      '3. **Mua lô đầu tiên**: 100 cổ phiếu, dùng lệnh giới hạn (LO) ở gần giá hiện tại.',
      '4. **Theo dõi 1–2 tuần** và ghi lại cảm xúc khi giá lên xuống.',
      '',
      'Mẹo: lệnh đầu tiên không cần "đúng". Mục tiêu là hiểu quy trình, không phải lãi.',
    ].join('\n')
  }
  return [
    `Bạn đã có ${ctx.positions.length} cổ phiếu trong danh mục rồi — khởi đầu tốt! Bước tiếp theo:`,
    '',
    '- Hỏi mình "**Đánh giá danh mục của tôi**" để kiểm tra mức độ đa dạng.',
    '- Hoàn thành bài "Biến động và sụt giảm" để chuẩn bị cho những ngày thị trường đỏ.',
    '- Thử đặt một **lệnh giới hạn** thấp hơn giá hiện tại và xem nó có khớp không.',
  ].join('\n')
}

function reviewPortfolio(ctx: TutorContext): string {
  if (ctx.positions.length === 0) {
    return 'Danh mục của bạn hiện chỉ có tiền mặt. Khi bạn mua cổ phiếu đầu tiên, mình sẽ phân tích mức độ đa dạng và rủi ro cho bạn. Hỏi mình "Mình nên bắt đầu từ đâu?" nhé!'
  }
  const invested = ctx.equity - ctx.cash
  const cashPct = (ctx.cash / ctx.equity) * 100
  const totalReturn = ((ctx.equity - ctx.startingCash) / ctx.startingCash) * 100
  const sorted = [...ctx.positions].sort((a, b) => b.weightPct - a.weightPct)
  const top = sorted[0]
  const sectors = new Map<string, number>()
  for (const p of ctx.positions) sectors.set(p.sector, (sectors.get(p.sector) ?? 0) + p.weightPct)
  const topSector = [...sectors.entries()].sort((a, b) => b[1] - a[1])[0]

  const lines = [
    '**Tổng quan danh mục**',
    `- Tổng tài sản: ${formatCompactVND(ctx.equity)} (${formatPct(totalReturn)} so với ban đầu)`,
    `- Đã đầu tư: ${formatCompactVND(invested)} · Tiền mặt: ${formatDecimal(cashPct)}%`,
    `- ${ctx.positions.length} cổ phiếu thuộc ${sectors.size} ngành`,
    '',
    '**Nhận xét**',
  ]
  if (top.weightPct > 40) {
    lines.push(`- ⚠️ **${top.symbol}** chiếm ${formatDecimal(top.weightPct)}% phần đã đầu tư. Nếu ${top.symbol} giảm 20%, danh mục cổ phiếu của bạn giảm khoảng ${formatDecimal(top.weightPct * 0.2)}%.`)
  } else {
    lines.push(`- ✅ Không cổ phiếu nào chiếm quá 40% — tỷ trọng lớn nhất là ${top.symbol} (${formatDecimal(top.weightPct)}%).`)
  }
  if (topSector && topSector[1] > 50 && sectors.size > 0) {
    lines.push(`- ⚠️ Ngành **${topSector[0]}** chiếm ${formatDecimal(topSector[1])}%. Các cổ phiếu cùng ngành thường lên xuống cùng nhau.`)
  } else if (sectors.size >= 3) {
    lines.push(`- ✅ Bạn đã phân bổ vào ${sectors.size} ngành, giúp giảm rủi ro riêng lẻ.`)
  }
  if (cashPct > 70) {
    lines.push(`- 💵 ${formatDecimal(cashPct)}% vẫn là tiền mặt. Không sao cả — giữ tiền mặt cũng là một quyết định. Chỉ cần đảm bảo đó là chủ ý của bạn.`)
  }
  const losers = ctx.positions.filter((p) => p.pnlPct < -10)
  if (losers.length) {
    lines.push(`- 📉 ${losers.map((p) => `${p.symbol} (${formatPct(p.pnlPct)})`).join(', ')} đang lỗ hơn 10%. Hãy tự hỏi: lý do bạn mua ban đầu còn đúng không?`)
  }
  if (ctx.filledOrders > 20) {
    lines.push(`- 🔁 Bạn đã khớp ${ctx.filledOrders} lệnh. Mỗi vòng mua-bán tốn khoảng 0,4% phí và thuế — hãy để ý chi phí này.`)
  }
  lines.push('', 'Bạn muốn mình giải thích thêm về **đa dạng hóa** hay **drawdown** không?')
  return lines.join('\n')
}

function explainStock(symbol: string, ctx: TutorContext): string {
  const stock = getStock(symbol)
  if (!stock) return `Mình chưa có dữ liệu về mã ${symbol}.`
  const live = ctx.stock?.symbol === symbol ? ctx.stock : undefined
  const profile = stock.profile
  const seed = SEED_BY_SYMBOL[symbol]
  const peers = SEED_STOCKS.filter((s) => s.sector === seed?.sector && s.symbol !== symbol)
  const avgPe = profile && peers.length ? peers.reduce((s, p) => s + p.profile.pe, 0) / peers.length : undefined
  const lines = [`**${stock.symbol} – ${stock.name}**`]
  if (profile) lines.push(profile.description)
  lines.push('', `- Ngành: ${stock.sector} · Sàn ${stock.exchange} (biên độ ±${priceBandPct(stock.exchange) * 100}%)`)
  if (profile) {
    lines.push(
      `- Vốn hóa khoảng ${profile.marketCapTrillion} nghìn tỷ ₫ (ước tính)`,
      `- P/E khoảng ${formatDecimal(profile.pe)}${avgPe ? ` (trung bình nhóm cùng ngành trong app: ${formatDecimal(avgPe)})` : ''}`,
      `- Tỷ suất cổ tức: ${profile.dividendYield ? `khoảng ${formatDecimal(profile.dividendYield)}%/năm` : 'gần đây không trả cổ tức tiền mặt đáng kể'}`,
    )
  }
  if (live) {
    lines.push(`- Giá hiện tại: ${formatPrice(live.price)} ₫ (${formatPct(live.changePct)} hôm nay)`)
  }
  if (seed) lines.push(`- Mức biến động: ${seed.volatility >= 0.024 ? 'cao' : seed.volatility >= 0.017 ? 'trung bình' : 'thấp'} so với các mã lớn khác`)
  const lotPrice = live?.price ?? seed?.basePrice
  if (lotPrice) lines.push('', `💡 Lô tối thiểu 100 cổ phiếu ≈ ${formatCompactVND(lotPrice * 100)}.`)
  if (!profile) lines.push('', `Mình chưa có hồ sơ chi tiết về ${symbol}. Hãy xem báo cáo thường niên trên trang quan hệ nhà đầu tư của công ty để hiểu họ kiếm tiền từ đâu.`)
  if (profile && avgPe && profile.pe > avgPe * 1.4) {
    lines.push('', `P/E của ${symbol} cao hơn khá nhiều so với các công ty cùng ngành — thị trường đang kỳ vọng tăng trưởng lớn, và kỳ vọng cao cũng đi kèm rủi ro thất vọng.`)
  } else if (profile && avgPe && profile.pe < avgPe * 0.75) {
    lines.push('', `P/E của ${symbol} thấp hơn nhóm cùng ngành. Đôi khi đó là cơ hội, đôi khi thị trường đang lo ngại điều gì đó — hãy tìm hiểu lý do.`)
  }
  return lines.join('\n')
}

function shouldIBuy(ctx: TutorContext, symbol?: string): string {
  const sym = symbol ?? ctx.stock?.symbol
  const target = sym ? getStock(sym) : undefined
  const holding = sym ? ctx.positions.find((p) => p.symbol === sym) : undefined
  const lines = [
    'Mình không thể nói bạn nên mua hay bán — không ai dự đoán chắc chắn được giá. Nhưng mình có thể giúp bạn **tự ra quyết định tốt hơn**. Trước khi đặt lệnh, hãy trả lời 5 câu hỏi:',
    '',
    `1. **Hiểu doanh nghiệp:** Bạn có giải thích được ${target ? `${target.symbol} kiếm tiền từ đâu` : 'công ty này kiếm tiền từ đâu'} trong 2 câu không?`,
    `2. **Định giá:** ${target?.profile ? `P/E khoảng ${formatDecimal(target.profile.pe)} là cao hay thấp so với các công ty ${target.sector.toLowerCase()} khác?` : 'P/E là cao hay thấp so với các công ty cùng ngành?'}`,
    '3. **Tỷ trọng:** Sau khi mua, cổ phiếu này chiếm bao nhiêu % danh mục? (gợi ý: ≤ 20–25%)',
    '4. **Kịch bản xấu:** Nếu giá giảm 20% ngay tuần sau, bạn sẽ làm gì?',
    '5. **Thời gian:** Bạn định giữ bao lâu? Vài ngày, vài tháng hay vài năm?',
  ]
  if (holding) {
    lines.push('', `Bạn đang nắm ${sym}, chiếm ${formatDecimal(holding.weightPct)}% phần đã đầu tư, lãi/lỗ ${formatPct(holding.pnlPct)}.`)
  }
  lines.push('', 'Viết câu trả lời ra giấy là một thói quen của nhà đầu tư giỏi. Đây là tiền ảo — cứ thử, sai, rồi rút kinh nghiệm!', '', DISCLAIMER)
  return lines.join('\n')
}

function lossCoaching(ctx: TutorContext): string {
  const losers = ctx.positions.filter((p) => p.pnlPct < 0).sort((a, b) => a.pnlPct - b.pnlPct)
  return [
    'Thấy danh mục đỏ là cảm giác ai cũng từng trải qua. Đây là cách nhà đầu tư kỷ luật suy nghĩ:',
    '',
    '1. **Tách cảm xúc khỏi quyết định.** Đừng bán chỉ vì sợ, đừng mua thêm chỉ vì muốn "gỡ".',
    '2. **Hỏi lại lý do ban đầu.** Công ty có thay đổi gì không, hay chỉ cả thị trường đang giảm?',
    '3. **Kiểm tra tỷ trọng.** Nếu một mã chiếm quá nhiều, có thể đó mới là vấn đề thật sự.',
    '4. **Nhớ toán học của thua lỗ:** giảm 50% cần tăng 100% để hòa vốn — vì vậy giới hạn rủi ro từ đầu rất quan trọng.',
    losers.length ? `\nHiện tại mã đang lỗ nhiều nhất của bạn là **${losers[0].symbol}** (${formatPct(losers[0].pnlPct)}).` : '',
    '',
    DISCLAIMER,
  ].join('\n')
}

function glossaryAnswer(entry: GlossaryEntry, ctx: TutorContext): string {
  const lines = [`**${entry.term}**`, entry.short, '', entry.body]
  if (entry.id === 'tran-san' && ctx.stock) {
    const s = ctx.stock
    lines.push('', `Ví dụ với ${s.symbol} hôm nay: tham chiếu ${formatPrice(s.ref)} ₫, sàn ${s.exchange} có biên độ ±${priceBandPct(s.exchange) * 100}%.`)
  }
  if (entry.id === 'pe' && ctx.stock?.approxPe) {
    lines.push('', `${ctx.stock.symbol} có P/E khoảng ${formatDecimal(ctx.stock.approxPe)} (ước tính).`)
  }
  if (entry.id === 'suc-mua') {
    lines.push('', `Tiền mặt của bạn hiện là ${formatCompactVND(ctx.cash)}.`)
  }
  if (ctx.level === 'newbie') lines.push('', 'Bạn muốn mình cho thêm một ví dụ đời thường không?')
  return lines.join('\n')
}

function fallback(): string {
  return [
    'Mình chưa hiểu rõ câu hỏi này 🤔. Mình đang ở phiên bản thử nghiệm và giỏi nhất ở các chủ đề:',
    '',
    '- Thuật ngữ: "P/E là gì?", "Giá trần là gì?", "Lãi kép là gì?"',
    '- Công ty: "VNM là công ty gì?"',
    '- Danh mục: "Đánh giá danh mục của tôi"',
    '- Bắt đầu: "Mình nên bắt đầu từ đâu?"',
  ].join('\n')
}

export function composeReply(message: string, ctx: TutorContext): string {
  const text = normalize(message)
  const symbol = findSymbol(message, ctx)

  if (/^(xin )?chao|^hello|^hi\b|^alo/.test(text)) return greeting(ctx)
  if (has(text, 'có nên', 'nên mua', 'nên bán', 'mua gì', 'mua mã nào', 'tư vấn', 'khuyên', 'khuyến nghị', 'mua không', 'bán không')) return shouldIBuy(ctx, symbol)
  if (has(text, 'đánh giá danh mục', 'danh mục của tôi', 'danh mục của mình', 'portfolio', 'kiểm tra danh mục')) return reviewPortfolio(ctx)
  if (has(text, 'bắt đầu', 'người mới', 'đầu tiên', 'hướng dẫn', 'làm gì tiếp')) return gettingStarted(ctx)
  if (has(text, 'đang lỗ', 'bị lỗ', 'giảm mạnh', 'thua lỗ', 'hoảng loạn', 'cắt lỗ', 'đang đỏ')) return lossCoaching(ctx)
  const entry = findGlossary(text)
  if (symbol && (!entry || has(text, 'công ty', 'là gì', 'giới thiệu', 'giải thích', 'thế nào'))) return explainStock(symbol, ctx)
  if (entry) return glossaryAnswer(entry, ctx)
  if (symbol) return explainStock(symbol, ctx)
  return fallback()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class MockAIService implements AIService {
  async *reply(message: string, _history: ChatMessage[], context: TutorContext): AsyncIterable<string> {
    const answer = composeReply(message, context)
    await sleep(350)
    const parts = answer.split(/(\s+)/)
    for (let i = 0; i < parts.length; i += 3) {
      yield parts.slice(i, i + 3).join('')
      await sleep(18)
    }
  }

  suggestions(ctx: TutorContext): string[] {
    if (ctx.page === 'stock' && ctx.stock) {
      return [`${ctx.stock.symbol} là công ty gì?`, `Có nên mua ${ctx.stock.symbol} không?`, 'P/E là gì?', 'Giá trần, giá sàn là gì?']
    }
    if (ctx.page === 'learn') return ['Lãi kép là gì?', 'Drawdown là gì?', 'Quỹ ETF là gì?']
    if (ctx.positions.length === 0) return ['Mình nên bắt đầu từ đâu?', 'Cổ phiếu là gì?', 'Lô giao dịch là gì?']
    return ['Đánh giá danh mục của tôi', 'Đa dạng hóa là gì?', 'Phí giao dịch tính thế nào?', 'Cổ phiếu giảm mạnh thì làm gì?']
  }

  insights(ctx: TutorContext): Insight[] {
    const out: Insight[] = []
    const invested = ctx.equity - ctx.cash
    if (ctx.positions.length === 0) {
      out.push({
        id: 'first-trade',
        tone: 'info',
        title: 'Sẵn sàng cho lệnh đầu tiên?',
        body: `Bạn có ${formatCompactVND(ctx.cash)} tiền ảo. Hãy chọn một công ty bạn hiểu rõ và mua thử 100 cổ phiếu.`,
        ask: 'Mình nên bắt đầu từ đâu?',
      })
      return out
    }
    const top = [...ctx.positions].sort((a, b) => b.weightPct - a.weightPct)[0]
    if (top.weightPct > 40 && invested / ctx.equity > 0.2) {
      out.push({
        id: 'concentration',
        tone: 'warning',
        title: `${top.symbol} chiếm ${formatDecimal(top.weightPct)}% cổ phiếu của bạn`,
        body: 'Danh mục đang phụ thuộc nhiều vào một mã. Thử tìm hiểu cách đa dạng hóa.',
        ask: 'Đánh giá danh mục của tôi',
      })
    }
    const sectors = new Map<string, number>()
    for (const p of ctx.positions) sectors.set(p.sector, (sectors.get(p.sector) ?? 0) + p.weightPct)
    const [sector, weight] = [...sectors.entries()].sort((a, b) => b[1] - a[1])[0]
    if (sectors.size > 1 && weight > 60) {
      out.push({ id: 'sector', tone: 'warning', title: `${formatDecimal(weight)}% danh mục thuộc ngành ${sector}`, body: 'Cổ phiếu cùng ngành thường lên xuống cùng nhau.', ask: 'Đa dạng hóa là gì?' })
    }
    const loser = ctx.positions.find((p) => p.pnlPct < -8)
    if (loser) {
      out.push({ id: 'loss', tone: 'info', title: `${loser.symbol} đang ${formatPct(loser.pnlPct)}`, body: 'Đây là lúc tốt để tập phản ứng bình tĩnh với thua lỗ.', ask: 'Cổ phiếu giảm mạnh thì làm gì?' })
    }
    if (ctx.filledOrders >= 20) {
      out.push({ id: 'fees', tone: 'warning', title: `Bạn đã khớp ${ctx.filledOrders} lệnh`, body: 'Giao dịch nhiều làm phí và thuế cộng dồn.', ask: 'Phí giao dịch tính thế nào?' })
    }
    if (sectors.size >= 4 && top.weightPct <= 30) {
      out.push({ id: 'diversified', tone: 'success', title: `Đa dạng tốt: ${sectors.size} ngành`, body: 'Không mã nào chiếm quá 30%. Giữ vững nguyên tắc này nhé!' })
    }
    if (out.length === 0) {
      out.push({ id: 'review', tone: 'info', title: 'Kiểm tra sức khỏe danh mục', body: 'Mầm có thể xem nhanh mức độ đa dạng và rủi ro của bạn.', ask: 'Đánh giá danh mục của tôi' })
    }
    return out
  }
}

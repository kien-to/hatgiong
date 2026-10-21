import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './ui'

describe('Markdown', () => {
  it('keeps a numbered list together across blank lines', () => {
    const html = renderToStaticMarkup(<Markdown text={'Hai lý do:\n\n1. **Nghỉ trưa.** Chờ 13:00.\n\n2. Giá đặt thấp hơn giá thị trường.\n\nLưu ý thêm.'} />)
    expect(html.match(/<ol/g)).toHaveLength(1)
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(html).toContain('<strong>Nghỉ trưa.</strong>')
  })

  it('starts an ordered list at the number written', () => {
    const html = renderToStaticMarkup(<Markdown text={'3. Ba\n4. Bốn'} />)
    expect(html).toContain('start="3"')
  })

  it('splits a list when a paragraph comes between items', () => {
    const html = renderToStaticMarkup(<Markdown text={'- a\nđoạn văn\n- b'} />)
    expect(html.match(/<ul/g)).toHaveLength(2)
  })
})

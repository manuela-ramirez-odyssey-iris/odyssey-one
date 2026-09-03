// apps/odyssey-one/src/spotboard/email/emailLayout.test.js
import { renderText, renderHtml, blocks } from './emailLayout.js'

describe('renderText', () => {
  it('joins lines, drops null/undefined, keeps blank separators', () => {
    expect(renderText(['A', null, '', 'B'])).toBe('A\n\nB')
  })
})

describe('renderHtml', () => {
  const html = renderHtml({
    title: 'Quote Request 14903 Awarded',
    blocks: [
      blocks.headline('Great news!'),
      blocks.paragraph('Your all in rate has been approved.'),
      blocks.fields([['Quote#', '14903'], ['Shipper', 'Acme']]),
      blocks.address('Ship From', ['Acme Plant 1', '12345 N. Tryon', 'Charlotte NC 28217 US']),
      blocks.button('Open quote', 'https://example.test/q/1'),
      blocks.notice('Do not process any bids.', 'warning'),
    ],
  })
  it('is a 600px table document with no CSS variables and no flex/grid', () => {
    expect(html).toContain('<table')
    expect(html).toContain('width="600"')
    expect(html).not.toMatch(/var\(--/)
    expect(html).not.toMatch(/display:\s*(flex|grid)/)
    expect(html).not.toMatch(/border-radius/)
  })
  it('carries the logo, the title, every block, and a footer', () => {
    expect(html).toContain('odyssey-one-logo.png')
    expect(html).toContain('<title>Quote Request 14903 Awarded</title>')
    expect(html).toContain('Great news!')
    expect(html).toContain('Quote#')
    expect(html).toContain('Charlotte NC 28217 US')
    expect(html).toContain('href="https://example.test/q/1"')
    expect(html).toContain('Do not process any bids.')
    expect(html).toContain('Odyssey Logistics')
  })
  it('escapes HTML in values', () => {
    const out = renderHtml({ title: 'x', blocks: [blocks.paragraph('<b>hi</b> & bye')] })
    expect(out).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye')
  })
})

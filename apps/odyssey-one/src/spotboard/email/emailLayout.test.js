// apps/odyssey-one/src/spotboard/email/emailLayout.test.js
import { renderText, renderHtml, blocks } from './emailLayout.js'

describe('renderText', () => {
  it('joins lines, drops null/undefined, keeps blank separators', () => {
    expect(renderText(['A', null, '', 'B'])).toBe('A\n\nB')
  })
})

describe('blocks.factGrid', () => {
  it('defaults to 8px top padding, and padTop:0 removes it (Distance row)', () => {
    const withTop = blocks.factGrid([['Distance', '727 mi']], { columns: 1 })
    const flush = blocks.factGrid([['Distance', '727 mi']], { columns: 1, padTop: 0 })
    expect(withTop).toContain('padding:8px 10px 8px 10px;')
    expect(flush).toContain('padding:0px 10px 8px 10px;')
  })
  it('topRule adds a single hairline border-top above the whole grid, none between rows', () => {
    const three = blocks.factGrid(
      [['S1 - Spartanburg SC', 'Drop-off: 09/22'], ['S2 - Atlanta GA', 'Drop-off: 09/23'], ['S3 - Mobile AL', 'Drop-off: 09/24']],
      { columns: 1, topRule: true },
    )
    expect(three.match(/border-top:1px solid #E4E6EB;/g)).toHaveLength(1)
    const noRule = blocks.factGrid([['S1 - Spartanburg SC', 'Drop-off: 09/22']], { columns: 1 })
    expect(noRule).not.toContain('border-top')
  })
  it('bottomRule adds a matching hairline border-bottom, independent of topRule', () => {
    const both = blocks.factGrid([['S1 - Spartanburg SC', 'Drop-off: 09/22']], { columns: 1, topRule: true, bottomRule: true })
    expect(both.match(/border-top:1px solid #E4E6EB;/g)).toHaveLength(1)
    expect(both.match(/border-bottom:1px solid #E4E6EB;/g)).toHaveLength(1)
    const bottomOnly = blocks.factGrid([['S1 - Spartanburg SC', 'Drop-off: 09/22']], { columns: 1, bottomRule: true })
    expect(bottomOnly).not.toContain('border-top')
    expect(bottomOnly).toContain('border-bottom:1px solid #E4E6EB;')
  })
})

describe('blocks.columnStack', () => {
  it('lays out two groups as two <td> columns, each pair stacked label-over-value', () => {
    const out = blocks.columnStack([
      [['Shipper', 'Acme'], ['Carrier', 'CCNI']],
      [['Quote#', '14903'], ['Equipment', 'TL']],
    ])
    expect(out.match(/<td width="50%"/g)).toHaveLength(2)
    expect(out.indexOf('Shipper')).toBeLessThan(out.indexOf('Carrier'))
    expect(out.indexOf('Carrier')).toBeLessThan(out.indexOf('Quote#'))
  })
  it('drops an empty group so the remaining one renders full width', () => {
    const out = blocks.columnStack([[['Reference#', 'C1']], []])
    expect(out).toContain('<td width="100%"')
    expect(out).not.toContain('width="50%"')
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
  it('button clears 16px above (room under a preceding hairline) and 20px below', () => {
    expect(blocks.button('Open quote', 'https://example.test/q/1')).toContain('padding:16px 0 20px 0;')
  })
  it('escapes HTML in values', () => {
    const out = renderHtml({ title: 'x', blocks: [blocks.paragraph('<b>hi</b> & bye')] })
    expect(out).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye')
  })
})

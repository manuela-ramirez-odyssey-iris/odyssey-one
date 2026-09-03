// apps/odyssey-one/src/spotboard/email/emailTheme.test.js
import { THEME } from './emailTheme.js'

describe('emailTheme', () => {
  it('exposes only literal hex colors (Outlook cannot read CSS variables)', () => {
    for (const [k, v] of Object.entries(THEME.color)) {
      expect(v, k).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
  it('names a hosted logo and a font stack', () => {
    expect(THEME.logoUrl).toMatch(/\/email\/odyssey-one-logo\.png$/)
    expect(THEME.font).toContain('Arial')
  })
})

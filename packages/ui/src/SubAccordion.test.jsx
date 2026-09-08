// @vitest-environment jsdom
import { render, cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import SubAccordion from './SubAccordion.jsx'

describe('SubAccordion toggleAllVariant', () => {
  afterEach(cleanup)

  const base = { title: 'T', collapsible: false, onToggleAll: () => {}, children: 'body' }

  test('defaults to the link control', () => {
    render(<SubAccordion {...base} />)
    const btn = screen.getByRole('button', { name: /Expand All/ })
    expect(btn.classList.contains('btn--link')).toBe(true)
    expect(btn.classList.contains('btn--secondary')).toBe(false)
  })

  test("'secondary' swaps the chrome to a small Secondary button, label and action unchanged", () => {
    render(<SubAccordion {...base} toggleAllVariant="secondary" />)
    const btn = screen.getByRole('button', { name: /Expand All/ })
    expect(btn.classList.contains('btn--secondary')).toBe(true)
    expect(btn.classList.contains('btn--sm')).toBe(true)
    // Only the chrome changes — link styling must not linger.
    expect(btn.classList.contains('btn--link')).toBe(false)
  })
})

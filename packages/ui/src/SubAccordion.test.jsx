// @vitest-environment jsdom
import { render, cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import SubAccordion from './SubAccordion.jsx'

describe('SubAccordion header actions', () => {
  afterEach(cleanup)

  test('buttonToggle renders before the expand-all control, and only when Static', () => {
    const { container, rerender } = render(
      <SubAccordion title="T" collapsible={false} onToggleAll={() => {}}
        buttonToggle={<span data-testid="bt">BT</span>}>body</SubAccordion>,
    )
    const bt = screen.getByTestId('bt')
    const expandAll = screen.getByRole('button', { name: /Expand All/ })
    // It changes what the section SHOWS, so it reads before the actions on it.
    expect(bt.compareDocumentPosition(expandAll)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    // Collapsible drops every header action, this one included.
    rerender(
      <SubAccordion title="T" collapsible buttonToggle={<span data-testid="bt">BT</span>}>body</SubAccordion>,
    )
    expect(screen.queryByTestId('bt')).toBeNull()
    expect(container.querySelector('.sub-accordion__header-row')).toBeTruthy()
  })

  test('omitting buttonToggle renders nothing extra', () => {
    render(<SubAccordion title="T" collapsible={false}>body</SubAccordion>)
    expect(screen.queryByTestId('bt')).toBeNull()
  })
})

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

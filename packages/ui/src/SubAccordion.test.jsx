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

describe('SubAccordion header slots (S152, LINX-15895)', () => {
  afterEach(cleanup)

  test('the header icon is OFF by default and opts in', () => {
    // The old default was true, and 28 of 35 call sites overrode it to false —
    // the default was backwards (user ruling 2026-09-18; Figma `Show header
    // icon`, default false).
    const { container, rerender } = render(<SubAccordion title="T">body</SubAccordion>)
    expect(container.querySelector('.sub-accordion__info')).toBeNull()

    rerender(<SubAccordion title="T" showHeaderIcon>body</SubAccordion>)
    expect(container.querySelector('.sub-accordion__info')).toBeTruthy()
  })

  test('badge sits immediately after the title, inside the title row', () => {
    const { container } = render(
      <SubAccordion title="Version 5" badge={<span data-testid="b">new</span>} showHeaderIcon>
        body
      </SubAccordion>,
    )
    const lead = container.querySelector('.sub-accordion__lead')
    const badge = screen.getByTestId('b')
    expect(lead.contains(badge)).toBe(true)
    // Glued to the text it qualifies: title → badge → icon (HeaderStrip's rule,
    // and the Figma layer order).
    const title = container.querySelector('.sub-accordion__title')
    const icon = container.querySelector('.sub-accordion__info')
    expect(title.compareDocumentPosition(badge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(badge.compareDocumentPosition(icon)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test('meta renders under the title row but still inside the header control', () => {
    const { container } = render(
      <SubAccordion title="T" meta={<span data-testid="m">05/12/2026 14:02 UTC</span>}>
        body
      </SubAccordion>,
    )
    const meta = container.querySelector('.sub-accordion__meta')
    expect(meta.contains(screen.getByTestId('m'))).toBe(true)
    // Under the title ROW, not beside it — that is what the title block is for.
    const lead = container.querySelector('.sub-accordion__lead')
    expect(container.querySelector('.sub-accordion__title-block').contains(meta)).toBe(true)
    expect(lead.compareDocumentPosition(meta)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    // It is part of the disclosure control, so clicking it toggles the section.
    expect(meta.closest('button')).toBe(container.querySelector('.sub-accordion__header'))
  })

  test('trail renders last before the chevron, and takes a string or a node', () => {
    const { container, rerender } = render(
      <SubAccordion title="T" trail="Read-only">body</SubAccordion>,
    )
    const trail = container.querySelector('.sub-accordion__trail')
    expect(trail.textContent).toBe('Read-only')
    const chevron = container.querySelector('.sub-accordion__chevron-wrapper')
    expect(trail.compareDocumentPosition(chevron)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    rerender(<SubAccordion title="T" trail={<span data-testid="t">node</span>}>body</SubAccordion>)
    expect(screen.getByTestId('t')).toBeTruthy()
  })

  test('all three slots are absent when not passed — no empty wrappers', () => {
    const { container } = render(<SubAccordion title="T">body</SubAccordion>)
    expect(container.querySelector('.sub-accordion__meta')).toBeNull()
    expect(container.querySelector('.sub-accordion__trail')).toBeNull()
    // The title block is unconditional (it IS the title's home), but it must not
    // add a row when there is nothing under the title.
    expect(container.querySelector('.sub-accordion__title-block').children).toHaveLength(1)
  })
})

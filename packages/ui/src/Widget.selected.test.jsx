// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import Widget from './Widget.jsx'

afterEach(cleanup)

// `selected` — the active-filter axis WidgetMini already had, added to Widget
// (S153) so a row of widgets can BE the filter control. The user's condition
// when asking for it: "just the border line, and you are not introducing a
// weird padding or something like that."
describe('Widget selected', () => {
  const draw = (props) => render(
    <Widget variant="3xChart" title="T" value={1} label="L"
      rows={[{ label: 'a', value: 1 }]} chartSegments={[{ value: 1, color: 'var(--chart-1)' }]} {...props} />,
  ).container.firstChild

  it('adds widget--selected, and nothing else changes in the markup', () => {
    const off = draw({}).outerHTML
    cleanup()
    const on = draw({ selected: true }).outerHTML
    expect(on).toContain('widget--selected')
    // The ONLY difference is that class: same nodes, same attributes, same
    // inline styles. A structural change here is what would move the layout.
    expect(on.replace(' widget--selected', '')).toBe(off)
  })

  it('defaults to off, and keeps a caller className alongside', () => {
    expect(draw({}).className).not.toContain('widget--selected')
    cleanup()
    const cls = draw({ selected: true, className: 'mine' }).className
    expect(cls).toContain('widget--selected')
    expect(cls).toContain('mine')
    expect(cls).toContain('widget--3xChart')
  })

  it('never sets an inline style, so it cannot introduce padding or size', () => {
    const el = draw({ selected: true })
    expect(el.getAttribute('style')).toBeNull()
  })
})

// `onSelect` — the whole card is the hit area (user, 2026-09-18), "unless
// another clickable element inside takes a click space".
describe('Widget onSelect', () => {
  const drawSel = (onSelect, extra = {}) => render(
    <Widget variant="3xChart" title="T" value={1} label="L" onSelect={onSelect}
      goToLabel="Go" onGoToClick={() => {}}
      rows={[{ label: 'row', value: 1, ...extra }]}
      chartSegments={[{ value: 1, color: 'var(--chart-1)' }]} />,
  ).container.firstChild

  it('a click on the card body selects', () => {
    let hits = 0
    const card = drawSel(() => { hits += 1 })
    fireEvent.click(card.querySelector('.widget__title'))
    expect(hits).toBe(1)
  })

  // CONTRACT: pass onSelect only on a card with no interactive children (a
  // button inside a button is invalid HTML). Where one exists anyway — the
  // edit-mode close button — it still owns its own click.
  it('a click on an inner control does NOT select — the control owns it', () => {
    let cardHits = 0, rowHits = 0
    const card = drawSel(() => { cardHits += 1 }, { onClick: () => { rowHits += 1 } })
    // the footer Go-to link
    fireEvent.click([...card.querySelectorAll('button')].find(b => /Go/.test(b.textContent)))
    expect(cardHits).toBe(0)
    // a metric row wired to its own action
    const row = [...card.querySelectorAll('button, [role="button"]')].find(b => /row/.test(b.textContent))
    if (row) { fireEvent.click(row); expect(cardHits).toBe(0); expect(rowHits).toBe(1) }
  })

  it('becomes a real control: role, tab stop, pressed state, Enter and Space', () => {
    let hits = 0
    const card = render(
      <Widget variant="3x" title="T" rows={[{ label: 'a', value: 1 }]}
        selected onSelect={() => { hits += 1 }} />,
    ).container.firstChild
    expect(card.getAttribute('role')).toBe('button')
    expect(card.getAttribute('tabindex')).toBe('0')
    expect(card.getAttribute('aria-pressed')).toBe('true')
    expect(card.className).toContain('widget--selectable')
    fireEvent.keyDown(card, { key: 'Enter' }); expect(hits).toBe(1)
    fireEvent.keyDown(card, { key: ' ' }); expect(hits).toBe(2)
    fireEvent.keyDown(card, { key: 'a' }); expect(hits).toBe(2)   // other keys pass through
  })

  // The card carries role="button" itself, so the "an inner control owns the
  // click" guard has to match STRICT descendants — a plain closest() finds the
  // card and swallows every one of its own clicks. This is that regression.
  it('the card being role=button does not swallow its own clicks', () => {
    let hits = 0
    const card = render(
      <Widget variant="3x" title="T" rows={[{ label: 'a', value: 1 }]} onSelect={() => { hits += 1 }} />,
    ).container.firstChild
    fireEvent.click(card.querySelector('.widget__title'))
    expect(hits).toBe(1)
  })

  it('without onSelect the card is inert and unmarked', () => {
    let hits = 0
    const card = render(
      <Widget variant="3x" title="T" rows={[{ label: 'a', value: 1 }]} onClick={() => { hits += 1 }} />,
    ).container.firstChild
    expect(card.className).not.toContain('widget--selectable')
    fireEvent.click(card.querySelector('.widget__title'))
    expect(hits).toBe(1)  // a raw onClick via ...rest still reaches the root
  })
})

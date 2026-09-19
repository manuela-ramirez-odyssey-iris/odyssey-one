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

  it('is NOT given role=button — it contains buttons, and nesting them is invalid', () => {
    const card = drawSel(() => {})
    expect(card.getAttribute('role')).toBeNull()
    expect(card.getAttribute('tabindex')).toBeNull()
    expect(card.className).toContain('widget--selectable')
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

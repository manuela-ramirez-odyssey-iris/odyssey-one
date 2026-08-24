// @vitest-environment jsdom
import { afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SummaryStrip from './SummaryStrip.jsx'

afterEach(cleanup)

// jsdom has no layout engine — scrollWidth/clientWidth are stubbed per-test via
// Object.defineProperty to simulate real vs. no overflow (established pattern:
// DataTable's own truncationTooltip hover detection, S85).
function stubOverflow(el, { overflowing }) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 })
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: overflowing ? 200 : 100 })
}

describe('SummaryStrip truncate: "lead" (S107 — Tracking Link overflow fix)', () => {
  it('non-truncating items render plain, no title, no truncate classes', () => {
    render(<SummaryStrip items={[{ label: 'Pro/Booking #', value: 'PB-12345' }]} />)
    const dd = screen.getByText('PB-12345')
    expect(dd.tagName).toBe('DD')
    expect(dd.className).not.toContain('summary-strip__value--truncate-lead')
    expect(dd.hasAttribute('title')).toBe(false)
    expect(dd.parentElement.className).not.toContain('summary-strip__cell--truncate')
  })

  it('truncate: "lead" sets the title attr, the truncate classes, and wraps value in a <bdi>', () => {
    const url = 'example.com/very/long/tracking/path/that/overflows/the/strip'
    render(<SummaryStrip items={[{ label: 'Tracking Link', value: url, truncate: 'lead' }]} />)
    const dd = screen.getByText(url).closest('dd')
    expect(dd.getAttribute('title')).toBe(url)
    expect(dd.className).toContain('summary-strip__value--truncate-lead')
    expect(dd.parentElement.className).toContain('summary-strip__cell--truncate')
    expect(dd.querySelector('bdi')).not.toBeNull()
  })

  it('truncate: "lead" with an empty value still renders the "--" placeholder, no truncate classes', () => {
    render(<SummaryStrip items={[{ label: 'Tracking Link', value: null, truncate: 'lead' }]} />)
    const dd = screen.getByText('--')
    expect(dd.className).not.toContain('summary-strip__value--truncate-lead')
    expect(dd.hasAttribute('title')).toBe(false)
  })

  // No horizontal overflow, ever (user, 2026-08-03): jsdom has no layout engine
  // to assert actual shrink/ellipsis geometry, but this locks the DOM contract
  // the CSS fix depends on — .summary-strip__cell has no per-cell inline
  // width/min-width that would fight the CSS shrink rule, and a mixed row
  // (short cells + one lead-truncate cell, mirroring ShipmentDetailsModal)
  // renders exactly one truncate cell alongside untouched siblings.
  it('cells carry no inline width styles (shrink is CSS-only, not JS-measured)', () => {
    render(
      <SummaryStrip
        items={[
          { label: 'Buy Shipment', value: 'BS-1' },
          { label: 'Pro/Booking #', value: 'PB-12345' },
          { label: 'Tracking Link', value: 'example.com/a/b/c/d/e/f/g/h', truncate: 'lead' },
          { label: 'Rating Status', value: 'Rated' },
          { label: 'Sell Shipment', value: 'SS-1' },
        ]}
      />,
    )
    const cells = document.querySelectorAll('.summary-strip__cell')
    expect(cells).toHaveLength(5)
    cells.forEach((cell) => expect(cell.getAttribute('style')).toBeNull())
    const truncateCells = document.querySelectorAll('.summary-strip__cell--truncate')
    expect(truncateCells).toHaveLength(1)
  })
})

describe('SummaryStrip label-less / value-less cells (SPB-43 §2 — bid countdown digits)', () => {
  it('a cell with `value` but no `label` renders no <dt> and no key warning across siblings', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <SummaryStrip
        items={[{ label: 'Bid closes in:' }, { value: '9' }, { value: '7' }, { value: ':' }, { value: '1' }, { value: '5' }]}
      />,
    )
    const cells = document.querySelectorAll('.summary-strip__cell')
    expect(cells).toHaveLength(6)
    // Digit cells carry no <dt> at all — not an empty one.
    expect(cells[1].querySelector('dt')).toBeNull()
    expect(cells[1].querySelector('dd').textContent).toBe('9')
    // No React "same key" warning — cells key off index, not label.
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('a cell with `label` but no `value` renders no <dd> — not the "--" placeholder', () => {
    render(<SummaryStrip items={[{ label: 'Bid closes in:' }]} />)
    const cell = document.querySelector('.summary-strip__cell')
    expect(cell.querySelector('dt').textContent).toBe('Bid closes in:')
    expect(cell.querySelector('dd')).toBeNull()
    expect(screen.queryByText('--')).toBeNull()
  })

  it('existing callers (label + explicit empty/nullish value) still get the "--" placeholder', () => {
    render(<SummaryStrip items={[{ label: 'Opened', value: null }, { label: 'Closed', value: '' }]} />)
    const dds = screen.getAllByText('--')
    expect(dds).toHaveLength(2)
    expect(dds[0].tagName).toBe('DD')
  })
})

describe('SummaryStrip emphasis: "display" (SPB-43, carrier bid countdown H/M/S — Figma 5172:7856)', () => {
  it('adds the --display modifier class, on top of tone/truncate, without touching the base classes', () => {
    render(<SummaryStrip items={[{ label: 'Hours', value: '01', emphasis: 'display' }]} />)
    const dd = screen.getByText('01')
    expect(dd.className).toContain('summary-strip__value')
    expect(dd.className).toContain('summary-strip__value--display')
  })

  it('a default item (no `emphasis`) never carries the --display modifier — regression guard for every existing caller', () => {
    render(
      <SummaryStrip
        items={[
          { label: 'Pro/Booking #', value: 'PB-12345' },
          { label: 'Rating Status', value: 'Rated', tone: 'positive' },
          { label: 'Tracking Link', value: 'example.com/a/b/c', truncate: 'lead' },
        ]}
      />,
    )
    const values = document.querySelectorAll('.summary-strip__value')
    expect(values).toHaveLength(3)
    values.forEach((v) => expect(v.className).not.toContain('summary-strip__value--display'))
    // Tone/truncate modifiers still apply unmodified alongside the new option.
    expect(screen.getByText('Rated').className).toContain('summary-strip__value--positive')
  })

  it('a strip mixes emphasized and default cells in the same instance — not a whole-strip variant', () => {
    render(
      <SummaryStrip
        items={[
          { label: 'Hours', value: '01', emphasis: 'display' },
          { label: 'Time remaining', value: 'to close bid' },
        ]}
      />,
    )
    expect(screen.getByText('01').className).toContain('summary-strip__value--display')
    expect(screen.getByText('to close bid').className).not.toContain('summary-strip__value--display')
  })
})

describe('SummaryStrip truncationTooltip (opt-in, mirrors DataTable truncationTooltip)', () => {
  it('prop off: hovering an overflowing value never raises a tooltip, and lead `title` is preserved unchanged', () => {
    const url = 'example.com/very/long/tracking/path/that/overflows'
    render(<SummaryStrip items={[{ label: 'Tracking Link', value: url, truncate: 'lead' }]} />)
    const dd = screen.getByText(url).closest('dd')
    stubOverflow(dd, { overflowing: true })
    fireEvent.mouseEnter(dd.closest('.summary-strip__cell'))
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(dd.getAttribute('title')).toBe(url)
  })

  it('prop on + overflowing value (<dd>): shows the Tooltip with the full value text, and suppresses native title', () => {
    const url = 'example.com/very/long/tracking/path/that/overflows'
    render(<SummaryStrip items={[{ label: 'Tracking Link', value: url, truncate: 'lead' }]} truncationTooltip />)
    const dd = screen.getByText(url).closest('dd')
    expect(dd.hasAttribute('title')).toBe(false)
    stubOverflow(dd, { overflowing: true })
    fireEvent.mouseEnter(dd.closest('.summary-strip__cell'))
    const tip = screen.getByRole('tooltip')
    expect(tip.textContent).toBe(url)
  })

  it('prop on + overflowing label (<dt>): shows the Tooltip with the full label text — labels clip too', () => {
    const longLabel = 'A Very Long Uppercase Metric Label That Overflows The Cell'
    render(<SummaryStrip items={[{ label: longLabel, value: 'OK' }]} truncationTooltip />)
    const dt = screen.getByText(longLabel)
    stubOverflow(dt, { overflowing: true })
    fireEvent.mouseEnter(dt.closest('.summary-strip__cell'))
    const tip = screen.getByRole('tooltip')
    expect(tip.textContent).toBe(longLabel)
  })

  it('prop on + no overflow: no tooltip fires (not gated on hidden-word-count — a single overflowing token still requires real overflow)', () => {
    render(<SummaryStrip items={[{ label: 'Status', value: 'OK' }]} truncationTooltip />)
    const dd = screen.getByText('OK')
    stubOverflow(dd, { overflowing: false })
    fireEvent.mouseEnter(dd.closest('.summary-strip__cell'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('mouseleave hides the tooltip', () => {
    const url = 'example.com/very/long/tracking/path/that/overflows'
    render(<SummaryStrip items={[{ label: 'Tracking Link', value: url, truncate: 'lead' }]} truncationTooltip />)
    const dd = screen.getByText(url).closest('dd')
    stubOverflow(dd, { overflowing: true })
    const cell = dd.closest('.summary-strip__cell')
    fireEvent.mouseEnter(cell)
    expect(screen.getByRole('tooltip')).not.toBeNull()
    fireEvent.mouseLeave(cell)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

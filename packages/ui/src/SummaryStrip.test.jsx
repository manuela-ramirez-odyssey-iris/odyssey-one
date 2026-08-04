// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import SummaryStrip from './SummaryStrip.jsx'

afterEach(cleanup)

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

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import CostAllocationTab from './CostAllocationTab'

afterEach(cleanup)

const baseOrder = {
  orderId: 'ORD-1',
  apCost: '$1,000.00', arCost: '$1,200.00',
  apBase: '$900.00', arBase: '$1,100.00',
  apFuel: '--', arFuel: '--',
  apDiscount: '--', arDiscount: '--',
  apHzc: '--', arHzc: '--',
  apSoc: '--', arSoc: '--',
}

function makeData({ margin, orders }) {
  return {
    planned: {
      summary: {
        base: '$900.00', discount: '-$50.00', fuel: '$60.00',
        accessorials: '$0.00', apTotal: '$1,000.00', arTotal: '$1,200.00',
        margin,
      },
      orders,
    },
  }
}

// LINX-12106/12109 (2026-08-10) — Margin's tone used to be the LITERAL
// 'positive', so a shipment losing money still rendered green. Both
// directions are required: asserting only the negative case would also pass
// on a hardcoded 'negative'.
describe('CostAllocationTab — Margin tone (LINX-12106/12109)', () => {
  it('renders a NEGATIVE margin with the negative tone class', () => {
    render(<CostAllocationTab data={makeData({ margin: '-$250.00', orders: [baseOrder] })} />)
    const dd = screen.getByText('-$250.00')
    expect(dd.className).toContain('summary-strip__value--negative')
    expect(dd.className).not.toContain('summary-strip__value--positive')
  })

  it('renders a POSITIVE margin with the positive tone class', () => {
    render(<CostAllocationTab data={makeData({ margin: '$250.00', orders: [baseOrder] })} />)
    const dd = screen.getByText('$250.00')
    expect(dd.className).toContain('summary-strip__value--positive')
    expect(dd.className).not.toContain('summary-strip__value--negative')
  })

  it('treats an unparseable margin ("--") as neutral — no tone class at all', () => {
    render(<CostAllocationTab data={makeData({ margin: '--', orders: [baseOrder] })} />)
    const dd = screen.getByText('--', { selector: '.summary-strip__value' })
    expect(dd.className).not.toContain('summary-strip__value--positive')
    expect(dd.className).not.toContain('summary-strip__value--negative')
  })
})

// LINX-12107 (2026-08-10) — the controlled `expanded` map started at {} and
// was reset to {} on every data change, so EVERY order rendered collapsed
// regardless of GroupTable's defaultExpanded. AC requires the first order
// expanded, the rest collapsed.
describe('CostAllocationTab — first order expanded by default (LINX-12107)', () => {
  it('expands the first order and leaves the second collapsed', () => {
    const orders = [
      { ...baseOrder, orderId: 'ORD-1' },
      { ...baseOrder, orderId: 'ORD-2' },
    ]
    render(<CostAllocationTab data={makeData({ margin: '$250.00', orders })} />)
    const toggles = screen.getAllByRole('button', { name: /ORD-\d/ })
    expect(toggles[0].getAttribute('aria-expanded')).toBe('true')
    expect(toggles[1].getAttribute('aria-expanded')).toBe('false')
  })
})

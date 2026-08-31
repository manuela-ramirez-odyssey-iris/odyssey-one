// @vitest-environment jsdom
// Task 10b — "Preview Tender Details" (LINX-14512). Fixtures use the real
// OrderChangeComparisonRowVM shape (api/types/shipmentDetail.ts, verified
// against generate.mjs's `comparison` builder): field, source, prior, new,
// changed. Real seed field name is 'Pickup Date/Time' (not 'Pick Up
// Date/Time' as the task brief spelled it).
//
// S134 — Corrections 1/2/3/4: dropped the old 3-column table (field | Prior
// Tender | New Tender) and its "Changed Fields"/"Unchanged Fields" band
// split. List mode is now the same sibling shape OrderChangeTenderLists/
// OrderChangeHazmat already use — two stacked flat GroupTables, each headed
// "Prior Tender List"/"New Tender List", every field listed once. Table mode
// composes a HeaderStrip ("Prior Tender"/"New Tender", matching Figma
// 1931-8797) above a plain 2-column KV grid, not a GroupTable.
import { afterEach, describe, expect, test } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import OrderChangeTenderDetails from './OrderChangeTenderDetails.jsx'

afterEach(cleanup)

const comparison = [
  { field: 'Pickup Date/Time', source: 'Routing', prior: '01/07/2026 09:00 CST', new: '01/07/2026 10:00 CST', changed: true },
  { field: 'Distance', source: 'Routing', prior: '282 MI', new: '301 MI', changed: true },
  { field: 'Package Count', source: 'Shipment', prior: '12', new: '14', changed: true },
  { field: 'Gross Weight', source: 'Shipment', prior: '2,000 LB', new: '2,000 LB', changed: false },
  { field: 'Incoterm Info', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
]

function makeOc(overrides = {}) {
  return { comparison, ...overrides }
}

describe('OrderChangeTenderDetails — chrome', () => {
  test('Differences (N) counts only changed rows, one badge each', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    expect(screen.getByText('Differences (3)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pickup Date/Time' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Distance' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Package Count' })).toBeTruthy()
    // Unchanged fields never get a badge.
    expect(screen.queryByRole('button', { name: 'Gross Weight' })).toBeNull()
  })

  test('an all-unchanged comparison renders Differences (0) and no badges', () => {
    const allUnchanged = comparison.map((r) => ({ ...r, changed: false, new: r.prior }))
    render(<OrderChangeTenderDetails oc={makeOc({ comparison: allUnchanged })} />)
    expect(screen.getByText('Differences (0)')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Distance' })).toBeNull()
  })

  test('missing oc.comparison renders without throwing', () => {
    expect(() => render(<OrderChangeTenderDetails oc={{}} />)).not.toThrow()
    expect(screen.getByText('Differences (0)')).toBeTruthy()
  })
})

describe('OrderChangeTenderDetails — no Changed/Unchanged split anywhere (S134)', () => {
  test('the band labels never appear in List mode', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    expect(screen.queryByText('Changed Fields')).toBeNull()
    expect(screen.queryByText('Unchanged Fields')).toBeNull()
  })

  test('the band labels never appear in Table mode', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(screen.queryByText('Changed Fields')).toBeNull()
    expect(screen.queryByText('Unchanged Fields')).toBeNull()
  })
})

describe('OrderChangeTenderDetails — List mode (default)', () => {
  test('the header band shows Prior Tender List / New Tender List, not a 3-column table', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const priorHeader = screen.getByText('Prior Tender List')
    const newHeader = screen.getByText('New Tender List')
    expect(priorHeader).toBeTruthy()
    expect(newHeader).toBeTruthy()
    // Two SEPARATE tables (one per side), not one shared 3-column table —
    // an unchanged field (no filter chip competing for the same text) shows
    // up exactly twice, once per side.
    expect(screen.getAllByText('Incoterm Info')).toHaveLength(2)
    // DOM order: Prior precedes New.
    expect(priorHeader.compareDocumentPosition(newHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("a changed field's prior AND new values are each inside a purple badge", () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const prior = screen.getByText('282 MI')
    const next = screen.getByText('301 MI')
    expect(prior.closest('span')?.className).toMatch(/text-badge/)
    expect(next.closest('span')?.className).toMatch(/text-badge/)
  })

  test("an unchanged field's values are not inside badges", () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const values = screen.getAllByText('FOB')
    for (const v of values) {
      expect(v.closest('span')?.className || '').not.toMatch(/text-badge/)
    }
  })

  test('the header bands are plain labels, not toggle buttons', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    // GroupTable's `header` strip is never a toggle — no chevron, no button,
    // no aria-expanded (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Prior Tender List' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender List' })).toBeNull()
  })
})

describe('OrderChangeTenderDetails — Table mode', () => {
  function switchToTable() {
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
  }

  test('renders Prior Tender and New Tender side by side with every field', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    expect(screen.getByText('Prior Tender')).toBeTruthy()
    expect(screen.getByText('New Tender')).toBeTruthy()
    // Every comparison field appears as a KV label, once per side.
    expect(screen.getAllByText('Distance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Incoterm Info').length).toBeGreaterThan(0)
  })

  test('the header strips are plain labels, not toggle buttons', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    expect(screen.queryByRole('button', { name: 'Prior Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender' })).toBeNull()
  })

  test('S134: Table mode renders a KV entry grid, not a GroupTable (Figma 1931-8797)', () => {
    const { container } = render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    expect(container.querySelectorAll('.odyssey-group-table').length).toBe(0)
    expect(container.querySelectorAll('.comparison-preview__kv-grid').length).toBe(2) // one per side
  })

  test('the two sides touch (zero-gap grid) with a vertical rule on the first side', () => {
    const { container } = render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    const grid = container.querySelector('.comparison-preview__grid')
    expect(grid.querySelectorAll(':scope > .comparison-preview__panel')).toHaveLength(2)
  })

  test('a changed field is purple; an unchanged one is not', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    const changed = screen.getAllByText('282 MI')[0]
    expect(changed.closest('span')?.className).toMatch(/text-badge/)
    const unchanged = screen.getAllByText('FOB')[0]
    expect(unchanged.closest('span')?.className || '').not.toMatch(/text-badge/)
  })
})

describe('OrderChangeTenderDetails — filtering', () => {
  test('filtering by a badge narrows to that field on both sides; clicking again restores', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const badge = screen.getByRole('button', { name: 'Distance' })
    fireEvent.click(badge)
    // 'Distance' now matches both the (still-visible) filter badge and the
    // surviving field cell on each of the two stacked tables.
    expect(screen.getAllByText('Distance').length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('cell', { name: 'Package Count' })).toHaveLength(0)
    expect(screen.queryAllByRole('cell', { name: 'Incoterm Info' })).toHaveLength(0)

    fireEvent.click(badge)
    // Unfiltered: the field name renders once per side (two stacked tables).
    expect(screen.getAllByRole('cell', { name: 'Package Count' })).toHaveLength(2)
    expect(screen.getAllByRole('cell', { name: 'Incoterm Info' })).toHaveLength(2)
  })
})

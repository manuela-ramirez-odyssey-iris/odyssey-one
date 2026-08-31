// @vitest-environment jsdom
// Task 10b — "Preview Tender Details" (LINX-14512). Fixtures use the real
// OrderChangeComparisonRowVM shape (api/types/shipmentDetail.ts, verified
// against generate.mjs's `comparison` builder): field, source, prior, new,
// changed. Real seed field name is 'Pickup Date/Time' (not 'Pick Up
// Date/Time' as the task brief spelled it).
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

describe('OrderChangeTenderDetails — List mode (default)', () => {
  test('renders both Changed Fields and Unchanged Fields bands, changed first', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const changed = screen.getByText('Changed Fields')
    const unchanged = screen.getByText('Unchanged Fields')
    expect(changed).toBeTruthy()
    expect(unchanged).toBeTruthy()
    // DOM order: the changed band's row comes before the unchanged band's.
    expect(changed.compareDocumentPosition(unchanged) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("a changed row's prior AND new values are inside badges", () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const prior = screen.getByText('282 MI')
    const next = screen.getByText('301 MI')
    expect(prior.closest('span')?.className).toMatch(/text-badge/)
    expect(next.closest('span')?.className).toMatch(/text-badge/)
  })

  test("an unchanged row's values are not inside badges", () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const values = screen.getAllByText('FOB')
    for (const v of values) {
      expect(v.closest('span')?.className || '').not.toMatch(/text-badge/)
    }
  })

  test('the static band labels are plain labels, not toggle buttons', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    // GroupTable's `expandable: false` static band renders the label as
    // plain text — no chevron, no button, no aria-expanded. A regression
    // back to a toggle would still pass a getByText check, so this asserts
    // the negative directly (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Changed Fields' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Unchanged Fields' })).toBeNull()
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
    // Every comparison field appears as a KV label, once (shared across
    // both sides' tables since the field name is the row label there too).
    expect(screen.getAllByText('Distance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Incoterm Info').length).toBeGreaterThan(0)
  })

  test('the static group labels are plain labels, not toggle buttons', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    // Same static-band regression guard as List mode, for Table mode's two
    // per-side static groups (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Prior Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender' })).toBeNull()
  })

  test('S134: Table mode KV blocks are non-striped (white rows, hairlines), not tinted bands', () => {
    // Figma 1931-8797 shows white Prior/New KV blocks with hairlines, not
    // GroupTable's default tinted child-row bands.
    const { container } = render(<OrderChangeTenderDetails oc={makeOc()} />)
    switchToTable()
    expect(container.querySelectorAll('.odyssey-group-table--flat').length).toBe(2)
  })
})

describe('OrderChangeTenderDetails — filtering', () => {
  test('filtering by a badge narrows to that field; clicking again restores', () => {
    render(<OrderChangeTenderDetails oc={makeOc()} />)
    const badge = screen.getByRole('button', { name: 'Distance' })
    fireEvent.click(badge)
    // 'Distance' now matches both the (still-visible) filter badge and the
    // one surviving table row — getAllByText, not getByText. The OTHER
    // badges (Package Count) also stay visible — filtering narrows table
    // ROWS, not the badge list itself — so assert on table CELLS, not text
    // anywhere on the page.
    expect(screen.getAllByText('Distance').length).toBeGreaterThan(0)
    expect(screen.queryByRole('cell', { name: 'Package Count' })).toBeNull()
    expect(screen.queryByRole('cell', { name: 'Incoterm Info' })).toBeNull()

    fireEvent.click(badge)
    expect(screen.getByRole('cell', { name: 'Package Count' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'Incoterm Info' })).toBeTruthy()
  })
})

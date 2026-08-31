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
//
// Ordering: changed fields render FIRST, then unchanged — LINX-14512
// Business Rules ("listed on the top... followed by fields which didn't
// undergo the change"), confirmed by the domain expert in grooming. This is
// a written AC and outranks the Table-mode mock's sample data (which
// happens to render in plain domain order) — see
// OrderChangeTenderDetails.jsx's header comment.
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

// S135 — this card now lands COLLAPSED (designer: the review page opens with
// Preview Tender Details closed; the planner expands it). Every test below needs
// its body, so rendering opens it, exactly as a click would.
function renderCard(oc) {
  const result = render(<OrderChangeTenderDetails oc={oc} />)
  // getAll + last: one test renders the card twice in a row, so the most
  // recently rendered header is the one to open.
  const headers = screen.getAllByRole('button', { name: /^Preview Tender Details/ })
  fireEvent.click(headers[headers.length - 1])
  return result
}

describe('OrderChangeTenderDetails — chrome', () => {
  test('Differences (N) counts only changed rows, one badge each', () => {
    renderCard(makeOc())
    expect(screen.getByText('(3)')).toBeTruthy() // purple count in the accordion title
    expect(screen.getByRole('button', { name: 'Pickup Date/Time' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Distance' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Package Count' })).toBeTruthy()
    // Unchanged fields never get a badge.
    expect(screen.queryByRole('button', { name: 'Gross Weight' })).toBeNull()
  })

  test('an all-unchanged comparison renders Differences (0) and no badges', () => {
    const allUnchanged = comparison.map((r) => ({ ...r, changed: false, new: r.prior }))
    renderCard(makeOc({ comparison: allUnchanged }))
    expect(screen.getByText('No Differences')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Distance' })).toBeNull()
  })

  test('missing oc.comparison renders without throwing', () => {
    expect(() => renderCard({})).not.toThrow()
    expect(screen.getByText('No Differences')).toBeTruthy()
  })
})

describe('OrderChangeTenderDetails — the Changed/Unchanged split (S135)', () => {
  // Reinstated per Figma 1703-156564, but as the first COLUMN HEADER of each
  // of the two segment tables — not as extra band rows inside one table.
  test('List mode labels the two segments in their column-header rows', () => {
    renderCard(makeOc())
    expect(screen.getByRole('columnheader', { name: 'Changed Fields' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Unchanged Fields' })).toBeTruthy()
  })

  test('Table mode has no split — one undivided KV block per side', () => {
    renderCard(makeOc())
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(screen.queryByText('Changed Fields')).toBeNull()
    expect(screen.queryByText('Unchanged Fields')).toBeNull()
  })

  test('a segment with no rows renders no table at all', () => {
    const allUnchanged = comparison.map((r) => ({ ...r, changed: false, new: r.prior }))
    const { container } = renderCard(makeOc({ comparison: allUnchanged }))
    expect(container.querySelectorAll('.odyssey-group-table')).toHaveLength(1)
    expect(screen.queryByRole('columnheader', { name: 'Changed Fields' })).toBeNull()
  })
})

describe('OrderChangeTenderDetails — List mode (default)', () => {
  // S135 — Figma 1703-156564: two stacked 3-column tables (segment label |
  // Prior Tender | New Tender), one row per comparison field.
  test('renders two 3-column tables with strip-style Prior/New headers', () => {
    const { container } = renderCard(makeOc())
    const tables = container.querySelectorAll('.odyssey-group-table')
    expect(tables).toHaveLength(2)
    // The strip look is GroupTable's own `headerStyle="strip"`, not a local override.
    for (const t of tables) expect(t.className).toMatch(/odyssey-group-table--flat-head/)
    expect(screen.getAllByRole('columnheader', { name: 'Prior Tender' })).toHaveLength(2)
    expect(screen.getAllByRole('columnheader', { name: 'New Tender' })).toHaveLength(2)
    // Each field is ONE row, so its name appears exactly once.
    expect(screen.getAllByRole('cell', { name: 'Incoterm Info' })).toHaveLength(1)
  })

  test("a changed field's prior AND new values are each inside a purple badge", () => {
    renderCard(makeOc())
    const prior = screen.getByText('282 MI')
    const next = screen.getByText('301 MI')
    expect(prior.closest('span')?.className).toMatch(/text-badge/)
    expect(next.closest('span')?.className).toMatch(/text-badge/)
  })

  test("an unchanged field's values are not inside badges", () => {
    renderCard(makeOc())
    const values = screen.getAllByText('FOB')
    for (const v of values) {
      expect(v.closest('span')?.className || '').not.toMatch(/text-badge/)
    }
  })

  test('rows are plain, not toggles (flat mode — no chevron, no expand)', () => {
    const { container } = renderCard(makeOc())
    // (the card's own SubAccordion toggle is outside the table)
    const table = container.querySelector('.odyssey-group-table')
    expect(table.querySelectorAll('[aria-expanded]')).toHaveLength(0)
  })
})

describe('OrderChangeTenderDetails — Table mode', () => {
  function switchToTable() {
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
  }

  // S135 (designer): same construction as OrderChangeTenderLists/Hazmat's
  // Table mode — HeaderStrip + KV entry panels in a zero-gap grid, no
  // GroupTable, no gutter.
  test('renders the sibling sections KV panel shape, two sides touching', () => {
    const { container } = renderCard(makeOc())
    switchToTable()
    expect(container.querySelectorAll('.odyssey-group-table')).toHaveLength(0)
    const grid = container.querySelector('.comparison-preview__grid')
    expect(grid.querySelectorAll(':scope > .comparison-preview__panel')).toHaveLength(2)
    expect(grid.querySelectorAll('.comparison-preview__kv-grid')).toHaveLength(2)
    expect(screen.getByText('Prior Tender')).toBeTruthy()
    expect(screen.getByText('New Tender')).toBeTruthy()
    expect(screen.getAllByText('Incoterm Info')).toHaveLength(2)
  })

  test('the header strips are plain labels, not toggle buttons', () => {
    renderCard(makeOc())
    switchToTable()
    expect(screen.queryByRole('button', { name: 'Prior Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender' })).toBeNull()
  })

  test('a changed field is purple; an unchanged one is not', () => {
    renderCard(makeOc())
    switchToTable()
    const changed = screen.getAllByText('282 MI')[0]
    expect(changed.closest('span')?.className).toMatch(/text-badge/)
    const unchanged = screen.getAllByText('FOB')[0]
    expect(unchanged.closest('span')?.className || '').not.toMatch(/text-badge/)
  })
})

describe('OrderChangeTenderDetails — filtering', () => {
  test('filtering by a badge narrows to that field on both sides; clicking again restores', () => {
    renderCard(makeOc())
    const badge = screen.getByRole('button', { name: 'Distance' })
    fireEvent.click(badge)
    // List mode is one row per field, so a filter leaves exactly that row.
    expect(screen.getAllByRole('cell', { name: 'Distance' })).toHaveLength(1)
    expect(screen.queryAllByRole('cell', { name: 'Package Count' })).toHaveLength(0)
    expect(screen.queryAllByRole('cell', { name: 'Incoterm Info' })).toHaveLength(0)

    fireEvent.click(badge)
    expect(screen.getAllByRole('cell', { name: 'Package Count' })).toHaveLength(1)
    expect(screen.getAllByRole('cell', { name: 'Incoterm Info' })).toHaveLength(1)
  })
})

describe('OrderChangeTenderDetails — ordering (LINX-14512 Business Rules)', () => {
  // Unchanged fields FIRST in the source array, the one changed field LAST —
  // the opposite of the required render order — so a passing test can only
  // mean the component actually sorts, not that the fixture was already in
  // the right order.
  const outOfOrder = [
    { field: 'Gross Weight', source: 'Shipment', prior: '2,000 LB', new: '2,000 LB', changed: false },
    { field: 'Incoterm Info', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
    { field: 'Distance', source: 'Routing', prior: '282 MI', new: '301 MI', changed: true },
  ]

  test('List mode: the changed field renders before the unchanged ones despite coming last in oc.comparison', () => {
    renderCard(makeOc({ comparison: outOfOrder }))
    // Scope to table cells — 'Distance' also labels the Differences filter
    // chip, which sits above the table and would otherwise be picked up as
    // the "first" match.
    const distance = screen.getAllByRole('cell', { name: 'Distance' })[0]
    const grossWeight = screen.getAllByRole('cell', { name: 'Gross Weight' })[0]
    expect(distance.compareDocumentPosition(grossWeight) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('Table mode: the changed field renders before the unchanged ones despite coming last in oc.comparison', () => {
    renderCard(makeOc({ comparison: outOfOrder }))
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    // Scope to KVField labels — same filter-chip caveat as List mode.
    const distance = screen.getAllByText('Distance').find((el) => el.closest('.comparison-preview__field'))
    const grossWeight = screen.getAllByText('Gross Weight').find((el) => el.closest('.comparison-preview__field'))
    expect(distance.compareDocumentPosition(grossWeight) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

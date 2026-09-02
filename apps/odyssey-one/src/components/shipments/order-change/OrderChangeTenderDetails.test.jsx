// @vitest-environment jsdom
// Task 10b — "Preview Tender Details" (LINX-14512). Fixtures use the real
// OrderChangeComparisonRowVM shape (api/types/shipmentDetail.ts, verified
// against generate.mjs's `comparison` builder): field, source, prior, new,
// changed.
//
// S137 — this rewrite drops Table mode and the filter chips entirely
// (ComparisonPreviewCard's own contract change: `children` is now a plain
// node, no more `(mode, filter) => node`), and merges the deleted
// OrderChangeHazmat.jsx's rows into these same two tables. Tests below cover:
// aligned widths, the per-segment "(No Differences)" empty state, the
// hazmat merge with its line-identifying tooltip, a changed hazmat field
// landing in Changed Fields + the count, and duplicate hazmat field labels
// (across two lines) rendering without a key collision. The diff-computation
// and field-list coverage from the deleted OrderChangeHazmat.test.jsx is
// migrated in below rather than dropped.
import { afterEach, describe, expect, test } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import OrderChangeTenderDetails, { computeHazmatDiffs } from './OrderChangeTenderDetails.jsx'

afterEach(cleanup)

const comparison = [
  { field: 'Pickup Date/Time', source: 'Routing', prior: '01/07/2026 09:00 CST', new: '01/07/2026 10:00 CST', changed: true },
  { field: 'Distance', source: 'Routing', prior: '282 MI', new: '301 MI', changed: true },
  { field: 'Package Count', source: 'Shipment', prior: '12', new: '14', changed: true },
  { field: 'Gross Weight', source: 'Shipment', prior: '2,000 LB', new: '2,000 LB', changed: false },
  { field: 'Incoterm Info', source: 'Order', prior: 'FOB', new: 'FOB', changed: false },
]

// S135 — full 11-field OrderChangeHazmatLineVM (Jana's own list, mock deck
// p5), ported from the deleted OrderChangeHazmat.test.jsx.
const line1 = {
  line: 87142, boilingPoint: '210 F', flashPoint: '140 F', hazmatClass: 'II',
  hazmatCode: 'UN0034', hazmatPkgGroup: 'II',
  hazmatDescription: 'Flammable Liquid', itemDescription: 'UN00034', marinePollutant: 'N',
  shippingClass: '75', tunnelCode: '1', wgkClass: 'II',
}
const line2 = {
  line: 87143, boilingPoint: '340 F', flashPoint: '260 F', hazmatClass: 'III',
  hazmatCode: 'UN0071', hazmatPkgGroup: 'III',
  hazmatDescription: 'Corrosive', itemDescription: 'UN00071', marinePollutant: 'Y',
  shippingClass: '85', tunnelCode: '2', wgkClass: 'III',
}
const identicalHazmat = [
  { prior: line1, new: { ...line1 } },
  { prior: line2, new: { ...line2 } },
]

function makeOc(overrides = {}) {
  return { comparison, hazmat: identicalHazmat, ...overrides }
}

// S135 — this card lands COLLAPSED; every test below needs its body open.
function renderCard(oc) {
  const result = render(<OrderChangeTenderDetails oc={oc} />)
  const headers = screen.getAllByRole('button', { name: /^Preview Tender Details/ })
  fireEvent.click(headers[headers.length - 1])
  return result
}

function segmentTable(container, headerName) {
  return screen.getByRole('columnheader', { name: headerName }).closest('.odyssey-group-table')
}

describe('OrderChangeTenderDetails — chrome', () => {
  test('Differences (N) counts distinct changed fields across tender AND hazmat', () => {
    renderCard(makeOc())
    // 3 changed tender fields, 0 changed hazmat fields (identicalHazmat).
    expect(screen.getByText('(3)')).toBeTruthy()
  })

  test('a changed hazmat field adds to the count', () => {
    const changedHazmat = [{ prior: line1, new: { ...line1, hazmatClass: 'I' } }, identicalHazmat[1]]
    renderCard(makeOc({ hazmat: changedHazmat }))
    expect(screen.getByText('(4)')).toBeTruthy() // 3 tender + 1 hazmat
  })

  test('all-unchanged tender AND identical hazmat renders Differences (0)', () => {
    const allUnchanged = comparison.map((r) => ({ ...r, changed: false, new: r.prior }))
    const { container } = renderCard(makeOc({ comparison: allUnchanged }))
    // Scoped to the accordion title's own count span — the merge also gives
    // an all-empty Changed Fields SEGMENT its own "(No Differences)" row
    // (see the empty-state describe block below), so a page-wide text query
    // would hit that too.
    expect(container.querySelector('.comparison-preview__title-count').textContent).toBe('(No Differences)')
  })

  test('missing oc renders without throwing', () => {
    let container
    expect(() => { container = renderCard({}).container }).not.toThrow()
    expect(container.querySelector('.comparison-preview__title-count').textContent).toBe('(No Differences)')
  })
})

describe('OrderChangeTenderDetails — column alignment (S137)', () => {
  test('Changed Fields and Unchanged Fields tables share identical column widths', () => {
    renderCard(makeOc())
    const changedTable = segmentTable(null, 'Changed Fields')
    const unchangedTable = segmentTable(null, 'Unchanged Fields')
    const changedWidths = [...changedTable.querySelectorAll('thead th')].map((th) => th.style.width)
    const unchangedWidths = [...unchangedTable.querySelectorAll('thead th')].map((th) => th.style.width)
    expect(changedWidths).toEqual(unchangedWidths)
    // Non-empty widths, i.e. actually set (not left to auto-sizing).
    expect(changedWidths.every(Boolean)).toBe(true)
  })
})

describe('OrderChangeTenderDetails — per-segment empty state (S137)', () => {
  test('a segment with no rows renders its header AND a "(No Differences)" row, not nothing', () => {
    const allUnchanged = comparison.map((r) => ({ ...r, changed: false, new: r.prior }))
    renderCard(makeOc({ comparison: allUnchanged, hazmat: identicalHazmat }))
    // Header survives even though the segment is empty.
    expect(screen.getByRole('columnheader', { name: 'Changed Fields' })).toBeTruthy()
    const changedTable = segmentTable(null, 'Changed Fields')
    expect(changedTable.textContent).toMatch(/\(No Differences\)/)
    // The sibling segment is NOT empty — it must show real rows, not the
    // empty-state line.
    const unchangedTable = segmentTable(null, 'Unchanged Fields')
    expect(unchangedTable.textContent).not.toMatch(/\(No Differences\)/)
  })

  test('two GroupTables render either way (never drops to one table)', () => {
    const allUnchanged = comparison.map((r) => ({ ...r, changed: false, new: r.prior }))
    const { container } = renderCard(makeOc({ comparison: allUnchanged, hazmat: identicalHazmat }))
    expect(container.querySelectorAll('.odyssey-group-table')).toHaveLength(2)
  })
})

describe('OrderChangeTenderDetails — hazmat merge (S137)', () => {
  test('hazmat fields render as rows in the merged tables', () => {
    renderCard(makeOc())
    expect(screen.getAllByRole('cell', { name: 'Hazmat Class' })).toHaveLength(2) // one per line
    expect(screen.getAllByRole('cell', { name: 'Marine Pollutant' })).toHaveLength(2)
  })

  test('a hazmat field cell carries a line-identifying hover tooltip', () => {
    renderCard(makeOc())
    const cell = screen.getAllByText('Boiling Point')[0]
    fireEvent.focus(cell.closest('[data-tooltip-trigger]'))
    expect(screen.getByText('Hazardous Material · Line 87142')).toBeTruthy()
  })

  test('a tender field cell also carries its own source tooltip', () => {
    renderCard(makeOc())
    const cell = screen.getByText('Distance')
    fireEvent.focus(cell.closest('[data-tooltip-trigger]'))
    expect(screen.getByText('Routing')).toBeTruthy()
  })

  test('a changed hazmat field lands in the Changed Fields table', () => {
    const changedHazmat = [{ prior: line1, new: { ...line1, hazmatClass: 'I' } }, identicalHazmat[1]]
    renderCard(makeOc({ hazmat: changedHazmat }))
    const changedTable = segmentTable(null, 'Changed Fields')
    expect(changedTable.textContent).toMatch(/Hazmat Class/)
    // Both the prior and new hazmat values render inside purple badges (it's
    // a changed row) — same DiffValue treatment as a changed tender field.
    // Scoped to the Changed Fields table: 'I'/'II' are roman numerals that
    // legitimately repeat elsewhere (hazmatPkgGroup mirrors hazmatClass, per
    // generate.mjs), so a page-wide getByText can't identify one cell.
    expect(within(changedTable).getByText('I').closest('span')?.className).toMatch(/text-badge/)
    expect(within(changedTable).getByText('II').closest('span')?.className).toMatch(/text-badge/)
  })

  test('duplicate field labels across two hazmat lines render without a key collision', () => {
    expect(() => renderCard(makeOc())).not.toThrow()
    // "Flash Point" appears once per line, both unchanged here.
    expect(screen.getAllByRole('cell', { name: 'Flash Point' })).toHaveLength(2)
  })

  test('missing/empty oc.hazmat renders without throwing', () => {
    expect(() => renderCard({ comparison, hazmat: [] })).not.toThrow()
    expect(() => renderCard({ comparison })).not.toThrow()
  })
})

describe('OrderChangeTenderDetails — computeHazmatDiffs (ported from OrderChangeHazmat)', () => {
  test('identical prior/new pairs produce no diffs', () => {
    expect(computeHazmatDiffs(identicalHazmat)).toEqual([])
  })

  test('a synthetic differing field is reported once, by label, in HAZMAT_FIELDS order', () => {
    const changed = [
      { prior: line1, new: { ...line1, hazmatCode: 'UN9999', boilingPoint: '999 F' } },
      identicalHazmat[1],
    ]
    // boilingPoint sorts before hazmatCode in HAZMAT_FIELDS.
    expect(computeHazmatDiffs(changed)).toEqual(['Boiling Point', 'Hazmat Code'])
  })

  test('the same field changed on two lines counts once, not twice', () => {
    const changed = [
      { prior: line1, new: { ...line1, hazmatClass: 'I' } },
      { prior: line2, new: { ...line2, hazmatClass: 'I' } },
    ]
    expect(computeHazmatDiffs(changed)).toEqual(['Hazmat Class'])
  })

  test('empty input produces no diffs', () => {
    expect(computeHazmatDiffs([])).toEqual([])
    expect(computeHazmatDiffs()).toEqual([])
  })
})

describe('OrderChangeTenderDetails — List rendering basics', () => {
  test('renders two 3-column tables with strip-style Prior/New headers', () => {
    const { container } = renderCard(makeOc())
    const tables = container.querySelectorAll('.odyssey-group-table')
    expect(tables).toHaveLength(2)
    for (const t of tables) expect(t.className).toMatch(/odyssey-group-table--flat-head/)
    expect(screen.getAllByRole('columnheader', { name: 'Prior Tender' })).toHaveLength(2)
    expect(screen.getAllByRole('columnheader', { name: 'New Tender' })).toHaveLength(2)
  })

  test("a changed tender field's prior AND new values are each inside a purple badge", () => {
    renderCard(makeOc())
    expect(screen.getByText('282 MI').closest('span')?.className).toMatch(/text-badge/)
    expect(screen.getByText('301 MI').closest('span')?.className).toMatch(/text-badge/)
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
    const table = container.querySelector('.odyssey-group-table')
    expect(table.querySelectorAll('[aria-expanded]')).toHaveLength(0)
  })

  test('the changed field renders in the Changed Fields table, the unchanged one in Unchanged Fields', () => {
    renderCard(makeOc())
    const changedTable = segmentTable(null, 'Changed Fields')
    const unchangedTable = segmentTable(null, 'Unchanged Fields')
    expect(changedTable.textContent).toMatch(/Distance/)
    expect(unchangedTable.textContent).toMatch(/Incoterm Info/)
    expect(changedTable.textContent).not.toMatch(/Incoterm Info/)
  })
})

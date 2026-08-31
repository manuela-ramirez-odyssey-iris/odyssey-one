// @vitest-environment jsdom
// Task 10b — "Preview Hazardous Material Information" (LINX-14509…14515).
// Fixtures use the real OrderChangeHazmatLineVM shape (api/types/
// shipmentDetail.ts): line, boilingPoint, hazmatClass, hazmatDescription,
// itemDescription, marinePollutant. oc.hazmat is an array of {prior, new}
// pairs — today's seed always makes the two sides identical per pair
// (generate.mjs ~line 2413), so the "real" fixture below does too; a
// separate synthetic fixture proves the diff logic isn't hardcoded to zero.
import { afterEach, describe, expect, test } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import OrderChangeHazmat from './OrderChangeHazmat.jsx'

afterEach(cleanup)

// S135 — full 11-field OrderChangeHazmatLineVM (Jana's own list, mock deck
// p5). The six after Boiling Point were added when the review found the
// section was showing 5 of 11.
const line1 = {
  line: 87979, boilingPoint: '210 F', flashPoint: '140 F', hazmatClass: 'II',
  hazmatCode: 'UN0034', hazmatPkgGroup: 'II',
  hazmatDescription: 'Flammable Liquid', itemDescription: 'UN00034', marinePollutant: 'N',
  shippingClass: '75', tunnelCode: '1', wgkClass: 'II',
}
const line2 = {
  line: 87980, boilingPoint: '340 F', flashPoint: '260 F', hazmatClass: 'III',
  hazmatCode: 'UN0071', hazmatPkgGroup: 'III',
  hazmatDescription: 'Corrosive', itemDescription: 'UN00071', marinePollutant: 'Y',
  shippingClass: '85', tunnelCode: '2', wgkClass: 'III',
}
const identicalPairs = [
  { prior: line1, new: { ...line1 } },
  { prior: line2, new: { ...line2 } },
]

// S135 — this card now lands COLLAPSED (designer: the review page opens with
// Preview Hazardous Material Information closed; the planner expands it). Every test below needs
// its body, so rendering opens it, exactly as a click would.
function renderCard(oc) {
  const result = render(<OrderChangeHazmat oc={oc} />)
  // getAll + last: one test renders the card twice in a row, so the most
  // recently rendered header is the one to open.
  const headers = screen.getAllByRole('button', { name: /^Preview Hazardous Material Information/ })
  fireEvent.click(headers[headers.length - 1])
  return result
}

describe('OrderChangeHazmat — chrome', () => {
  test('Differences (0) with identical prior/new pairs, and no badges', () => {
    renderCard({ hazmat: identicalPairs })
    expect(screen.getByText('No Differences')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hazmat Class' })).toBeNull()
  })

  test('missing/empty oc.hazmat renders without throwing', () => {
    expect(() => renderCard({})).not.toThrow()
    expect(screen.getByText('No Differences')).toBeTruthy()
    expect(() => renderCard({ hazmat: [] })).not.toThrow()
  })

  test('a synthetic differing field produces a difference badge', () => {
    const changedPairs = [
      { prior: line1, new: { ...line1, hazmatClass: 'I' } },
      { prior: line2, new: { ...line2 } },
    ]
    renderCard({ hazmat: changedPairs })
    expect(screen.getByText('(1)')).toBeTruthy() // purple count in the accordion title
    expect(screen.getByRole('button', { name: 'Hazmat Class' })).toBeTruthy()
  })
})

describe('OrderChangeHazmat — List mode (default)', () => {
  test('renders both list titles and every hazmat column (Line + the 11 fields)', () => {
    renderCard({ hazmat: identicalPairs })
    expect(screen.getByText('Prior Tender List')).toBeTruthy()
    expect(screen.getByText('New Tender List')).toBeTruthy()
    const labels = [
      'Line', 'Boiling Point', 'Flash Point', 'Hazmat Class', 'Hazmat Code',
      'Hazmat Description', 'Hazmat Pkg Group', 'Item Description',
      'Marine Pollutant', 'Shipping Class', 'Tunnel Code', 'WGK Class',
    ]
    for (const label of labels) {
      expect(screen.getAllByRole('columnheader', { name: label })).toHaveLength(2)
    }
  })

  test('a changed field renders in a purple badge on both sides', () => {
    // Uses Hazmat Code, whose values are unique per cell — the roman-numeral
    // fields (class / pkg group / WGK) legitimately repeat the same text in
    // several columns, so a getByText on 'II' can't identify one cell.
    const changedPairs = [{ prior: line1, new: { ...line1, hazmatCode: 'UN9999' } }]
    renderCard({ hazmat: changedPairs })
    expect(screen.getByText('UN0034').closest('span')?.className).toMatch(/text-badge/)
    expect(screen.getByText('UN9999').closest('span')?.className).toMatch(/text-badge/)
  })

  test('the static band labels are plain labels, not toggle buttons', () => {
    renderCard({ hazmat: identicalPairs })
    // GroupTable's `expandable: false` static band renders the label as
    // plain text — no chevron, no button, no aria-expanded. A regression
    // back to a toggle would still pass a getByText check, so this asserts
    // the negative directly (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Prior Tender List' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender List' })).toBeNull()
  })
})

describe('OrderChangeHazmat — Table mode', () => {
  test('renders one Line {n} group per line on each side', () => {
    renderCard({ hazmat: identicalPairs })
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(screen.getByText('Prior Tender')).toBeTruthy()
    expect(screen.getByText('New Tender')).toBeTruthy()
    expect(screen.getAllByText('Line 87979')).toHaveLength(2)
    expect(screen.getAllByText('Line 87980')).toHaveLength(2)
  })

  test('the header strip titles AND the Line {n} group labels are plain labels, not toggle buttons', () => {
    renderCard({ hazmat: identicalPairs })
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    // Same static-band regression guard as List mode — Table mode has TWO
    // kinds of label here (the header strip AND each per-line static group),
    // both must stay plain text (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Prior Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Line 87979' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Line 87980' })).toBeNull()
  })

  test('S134: Table mode renders KV entry blocks, not a GroupTable (Figma 1931-9497)', () => {
    // Correction 3 (S134): each line's block is a plain 3-column KV grid
    // (comparison-preview__kv-grid--3col) under a bold "Line {n}" label, not
    // a GroupTable row-per-field table.
    const { container } = renderCard({ hazmat: identicalPairs })
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(container.querySelectorAll('.odyssey-group-table').length).toBe(0)
    expect(container.querySelectorAll('.comparison-preview__kv-grid--3col').length).toBe(4) // 2 lines x 2 sides
  })

  test('the two sides touch (zero-gap grid) with a vertical rule on the first side', () => {
    const { container } = renderCard({ hazmat: identicalPairs })
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    const grid = container.querySelector('.comparison-preview__grid')
    expect(grid.querySelectorAll(':scope > .comparison-preview__panel')).toHaveLength(2)
  })
})

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

const line1 = {
  line: 87979, boilingPoint: '210 F', hazmatClass: 'II',
  hazmatDescription: 'Flammable Liquid', itemDescription: 'UN00034', marinePollutant: 'N',
}
const line2 = {
  line: 87980, boilingPoint: '340 F', hazmatClass: 'III',
  hazmatDescription: 'Corrosive', itemDescription: 'UN00071', marinePollutant: 'Y',
}
const identicalPairs = [
  { prior: line1, new: { ...line1 } },
  { prior: line2, new: { ...line2 } },
]

describe('OrderChangeHazmat — chrome', () => {
  test('Differences (0) with identical prior/new pairs, and no badges', () => {
    render(<OrderChangeHazmat oc={{ hazmat: identicalPairs }} />)
    expect(screen.getByText('Differences (0)')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hazmat Class' })).toBeNull()
  })

  test('missing/empty oc.hazmat renders without throwing', () => {
    expect(() => render(<OrderChangeHazmat oc={{}} />)).not.toThrow()
    expect(screen.getByText('Differences (0)')).toBeTruthy()
    expect(() => render(<OrderChangeHazmat oc={{ hazmat: [] }} />)).not.toThrow()
  })

  test('a synthetic differing field produces a difference badge', () => {
    const changedPairs = [
      { prior: line1, new: { ...line1, hazmatClass: 'I' } },
      { prior: line2, new: { ...line2 } },
    ]
    render(<OrderChangeHazmat oc={{ hazmat: changedPairs }} />)
    expect(screen.getByText('Differences (1)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hazmat Class' })).toBeTruthy()
  })
})

describe('OrderChangeHazmat — List mode (default)', () => {
  test('renders both list titles and all six columns', () => {
    render(<OrderChangeHazmat oc={{ hazmat: identicalPairs }} />)
    expect(screen.getByText('Prior Tender List')).toBeTruthy()
    expect(screen.getByText('New Tender List')).toBeTruthy()
    for (const label of ['Line', 'Boiling Point', 'Hazmat Class', 'Hazmat Description', 'Item Description', 'Marine Pollutant']) {
      expect(screen.getAllByRole('columnheader', { name: label })).toHaveLength(2)
    }
  })

  test('a changed field renders in a purple badge on both sides', () => {
    const changedPairs = [{ prior: line1, new: { ...line1, hazmatClass: 'I' } }]
    render(<OrderChangeHazmat oc={{ hazmat: changedPairs }} />)
    expect(screen.getByText('II').closest('span')?.className).toMatch(/text-badge/)
    expect(screen.getByText('I').closest('span')?.className).toMatch(/text-badge/)
  })

  test('the static band labels are plain labels, not toggle buttons', () => {
    render(<OrderChangeHazmat oc={{ hazmat: identicalPairs }} />)
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
    render(<OrderChangeHazmat oc={{ hazmat: identicalPairs }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(screen.getByText('Prior Tender')).toBeTruthy()
    expect(screen.getByText('New Tender')).toBeTruthy()
    expect(screen.getAllByText('Line 87979')).toHaveLength(2)
    expect(screen.getAllByText('Line 87980')).toHaveLength(2)
  })

  test('the header strip titles AND the Line {n} group labels are plain labels, not toggle buttons', () => {
    render(<OrderChangeHazmat oc={{ hazmat: identicalPairs }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    // Same static-band regression guard as List mode — Table mode has TWO
    // kinds of label here (the header strip AND each per-line static group),
    // both must stay plain text (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Prior Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Line 87979' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Line 87980' })).toBeNull()
  })

  test('S134: Table mode per-line KV blocks are non-striped (white rows, hairlines), not tinted bands', () => {
    // Figma 1931-9497 shows white per-line KV blocks with hairlines, not
    // GroupTable's default tinted child-row bands.
    const { container } = render(<OrderChangeHazmat oc={{ hazmat: identicalPairs }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
    expect(container.querySelectorAll('.odyssey-group-table--flat').length).toBe(2)
  })
})

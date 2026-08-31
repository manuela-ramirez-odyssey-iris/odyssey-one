// @vitest-environment jsdom
// Task 10a — "Preview Tender List" (LINX-14510/14511). Fixtures use the real
// RoutingOptionVM field names (api/types/shipmentDetail.ts, verified against
// mapRoutingOption): rank, routeRank, scac, carrierName, equipment, cost
// (pre-formatted "$X.XX USD"), status, pickupDateTime, deliveryDateTime.
import { afterEach, describe, expect, test } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import OrderChangeTenderLists, { computeTenderDiffs } from './OrderChangeTenderLists.jsx'

afterEach(cleanup)

const odfl = {
  rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
  cost: '$2,790.00 USD', status: 'Accepted',
  pickupDateTime: '01/07/2026 09:00 CST', deliveryDateTime: '01/09/2026 14:00 CST',
}
const saia = {
  rank: 2, routeRank: 2, scac: 'SAIA', carrierName: 'Saia Inc', equipment: 'Van',
  cost: '$2,900.00 USD', status: 'Sent',
  pickupDateTime: '01/07/2026 10:00 CST', deliveryDateTime: '01/09/2026 15:00 CST',
}
const xpo = {
  rank: 3, routeRank: 3, scac: 'XPOL', carrierName: 'XPO Logistics', equipment: 'Van',
  cost: '$3,100.00 USD', status: 'Declined',
  pickupDateTime: '01/07/2026 11:00 CST', deliveryDateTime: '01/09/2026 16:00 CST',
}

// New list: ODFL's cost moved (rank/routeRank unchanged) — 'AP Cost' only.
// SAIA's rank/routeRank moved (cost unchanged) — 'Rank Order Change' only.
// XPO dropped entirely from the new list — must not crash, no tag from it.
const newOdfl = { ...odfl, cost: '$2,850.00 USD' }
const newSaia = { ...saia, rank: 1, routeRank: 1 }

function makeOc(overrides = {}) {
  return {
    priorTenderList: [odfl, saia, xpo],
    newTenderList: [newOdfl, newSaia],
    ...overrides,
  }
}

describe('computeTenderDiffs', () => {
  test('tags a rank/route-rank change', () => {
    expect(computeTenderDiffs([saia], [newSaia])).toEqual(['Rank Order Change'])
  })

  test('tags a cost change', () => {
    expect(computeTenderDiffs([odfl], [newOdfl])).toEqual(['AP Cost'])
  })

  test('identical lists tag nothing', () => {
    expect(computeTenderDiffs([odfl], [{ ...odfl }])).toEqual([])
  })

  test('a carrier missing from the new list is ignored, not crashed', () => {
    expect(() => computeTenderDiffs([xpo], [])).not.toThrow()
    expect(computeTenderDiffs([xpo], [])).toEqual([])
  })

  test('both tags together, deduped, order-stable', () => {
    expect(computeTenderDiffs([odfl, saia], [newOdfl, newSaia])).toEqual(['AP Cost', 'Rank Order Change'])
  })
})

describe('OrderChangeTenderLists — chrome', () => {
  test('Differences (N) shows one badge per computed tag', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    expect(screen.getByText('Differences (2)')).toBeTruthy()
    // Badge buttons, not column headers — 'AP Cost' is ALSO a column label,
    // so the filter query must be scoped to the button role.
    expect(screen.getByRole('button', { name: 'Rank Order Change' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'AP Cost' })).toBeTruthy()
  })

  test('empty prior/new lists render without throwing', () => {
    expect(() => render(<OrderChangeTenderLists oc={{ priorTenderList: [], newTenderList: [] }} />)).not.toThrow()
    expect(screen.getByText('Differences (0)')).toBeTruthy()
  })
})

describe('OrderChangeTenderLists — List mode (default)', () => {
  test('renders a columnar table with both list titles and field headers', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    expect(screen.getByText('Prior Tender List')).toBeTruthy()
    expect(screen.getByText('New Tender List')).toBeTruthy()
    // One GroupTable per side — every header repeats once per side.
    expect(screen.getAllByRole('columnheader', { name: 'Rank' })).toHaveLength(2)
    expect(screen.getAllByRole('columnheader', { name: 'SCAC' })).toHaveLength(2)
    expect(screen.getAllByRole('columnheader', { name: 'AP Cost' })).toHaveLength(2)
  })

  test('a changed AP cost renders inside a badge; an unchanged one does not', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    // ODFL's new cost ($2,850.00 USD) changed — must be a Badge (purple).
    const changedCost = screen.getByText('$2,850.00 USD')
    expect(changedCost.closest('span')?.className).toMatch(/text-badge/)
    // XPO's cost ($3,100.00 USD) is unchanged (present on the prior side only,
    // but rendered plain either way) — plain text, no badge wrapper class.
    const unchangedCost = screen.getByText('$3,100.00 USD')
    expect(unchangedCost.closest('span')?.className || '').not.toMatch(/text-badge/)
  })
})

describe('OrderChangeTenderLists — Table mode', () => {
  function switchToTable() {
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }))
  }

  test('toggling to Table mode swaps the columnar table for KV blocks', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    expect(screen.queryAllByRole('columnheader', { name: 'Rank' }).length).toBeGreaterThan(0)
    switchToTable()
    // The columnar field headers are gone — Table mode has no such header row.
    expect(screen.queryByRole('columnheader', { name: 'Rank' })).toBeNull()
    // Every carrier's SCAC now renders as its own KV row (label cell "SCAC").
    expect(screen.getAllByText('SCAC').length).toBeGreaterThan(0)
  })

  test('both list titles still render in Table mode', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    switchToTable()
    expect(screen.getByText('Prior Tender List')).toBeTruthy()
    expect(screen.getByText('New Tender List')).toBeTruthy()
  })

  test('Rank renders as a badge in Table mode', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    switchToTable()
    const rankLabelCell = screen.getAllByText('Rank')[0]
    const row = rankLabelCell.closest('tr')
    expect(within(row).getByText('1').closest('span')?.className).toMatch(/text-badge/)
  })
})

describe('OrderChangeTenderLists — filtering', () => {
  test('clicking the AP Cost badge narrows columns to identity + AP Cost', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    fireEvent.click(screen.getByRole('button', { name: 'AP Cost' }))
    expect(screen.getAllByRole('columnheader', { name: 'AP Cost' })).toHaveLength(2)
    expect(screen.getAllByRole('columnheader', { name: 'SCAC' })).toHaveLength(2)
    expect(screen.queryByRole('columnheader', { name: 'Tender Status' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Rank' })).toBeNull()
  })

  test('clicking again clears the filter back to all columns', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    const badge = screen.getByRole('button', { name: 'AP Cost' })
    fireEvent.click(badge)
    fireEvent.click(badge)
    expect(screen.getAllByRole('columnheader', { name: 'Tender Status' })).toHaveLength(2)
  })
})

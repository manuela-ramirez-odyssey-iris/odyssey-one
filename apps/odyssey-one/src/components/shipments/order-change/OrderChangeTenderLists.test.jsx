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

// Two rows sharing scac+equipment — the domain genuinely allows the same
// carrier to appear twice at different ranks. Regression fixture for the
// buildChangeMap bug: a string `scac|equipment` key collapsed both rows into
// one shared verdict, so the UNCHANGED row (dup1) rendered a false-positive
// "changed" badge whenever its duplicate (dup2) actually moved. Ranks/costs
// are deliberately unique numbers (1 vs 9 vs 5) so text queries below can't
// accidentally match the wrong row's cell.
// rank/routeRank deliberately DIFFER from each other (1 vs 11, 9 vs 99, 5 vs
// 55) so a rank-column text query and a route-rank-column text query can
// never collide inside the same fixture.
const dup1 = {
  rank: 1, routeRank: 11, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
  cost: '$500.00 USD', status: 'Accepted',
  pickupDateTime: '01/07/2026 09:00 CST', deliveryDateTime: '01/09/2026 14:00 CST',
}
const dup2 = {
  rank: 9, routeRank: 99, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
  cost: '$700.00 USD', status: 'Sent',
  pickupDateTime: '01/07/2026 10:00 CST', deliveryDateTime: '01/09/2026 15:00 CST',
}
const newDup1 = { ...dup1 } // unchanged
const newDup2 = { ...dup2, rank: 5, routeRank: 55 } // moved 9 -> 5, cost held constant

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

  test('duplicate scac+equipment rows resolve independently — the tag reflects the one that actually moved', () => {
    expect(computeTenderDiffs([dup1, dup2], [newDup1, newDup2])).toEqual(['Rank Order Change'])
  })

  test('single-row cases are unaffected by the duplicate-matching change', () => {
    expect(computeTenderDiffs([saia], [newSaia])).toEqual(['Rank Order Change'])
    expect(computeTenderDiffs([odfl], [newOdfl])).toEqual(['AP Cost'])
    expect(computeTenderDiffs([odfl], [{ ...odfl }])).toEqual([])
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

  test('S134: filter chips render gray while a changed value inside the table stays purple', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    const allChip = screen.getByRole('button', { name: 'All' })
    const costChip = screen.getByRole('button', { name: 'AP Cost' })
    expect(allChip.querySelector('span').style.background).toBe('var(--badge-gray-bg)')
    expect(costChip.querySelector('span').style.background).toBe('var(--badge-gray-bg)')
    // ODFL's changed cost, inside the table — stays purple, the only thing
    // purple means now.
    const changedCost = screen.getByText('$2,850.00 USD')
    expect(changedCost.style.background).toBe('var(--badge-purple-bg)')
  })

  test('the static band header is a plain label, not a toggle button', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    // GroupTable's `expandable: false` static band renders the label as
    // plain text — no chevron, no button, no aria-expanded. A regression
    // back to a toggle would still pass a getByText check, so this asserts
    // the negative directly (review finding, S134).
    expect(screen.queryByRole('button', { name: 'Prior Tender List' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender List' })).toBeNull()
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

  test('S134: Table mode renders KV entry blocks, not a GroupTable (Figma 1931-7398)', () => {
    // Correction 3 (S134): Table mode's carrier blocks are a plain 2-column
    // KV grid (comparison-preview__kv-grid), not a GroupTable row-per-field
    // table — GroupTable's own classes must not appear in Table mode at all.
    const { container } = render(<OrderChangeTenderLists oc={makeOc()} />)
    switchToTable()
    expect(container.querySelectorAll('.odyssey-group-table').length).toBe(0)
    // 3 prior carriers + 2 new carriers = 5 entry blocks total.
    expect(container.querySelectorAll('.comparison-preview__entry').length).toBe(5)
    expect(container.querySelectorAll('.comparison-preview__kv-grid').length).toBe(5)
  })

  test('the two sides touch (zero-gap grid) with a vertical rule on the first side', () => {
    // Correction 3 (S134): the mock's Prior/New columns touch — no gutter —
    // separated only by a hairline, which is the first panel's own right
    // border (`.comparison-preview__panel:first-child`, order-change.css).
    const { container } = render(<OrderChangeTenderLists oc={makeOc()} />)
    switchToTable()
    const grid = container.querySelector('.comparison-preview__grid')
    const panels = grid.querySelectorAll(':scope > .comparison-preview__panel')
    expect(panels).toHaveLength(2)
  })

  test('Rank renders as a badge in Table mode', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    switchToTable()
    const rankLabelCell = screen.getAllByText('Rank')[0]
    const field = rankLabelCell.closest('.comparison-preview__field')
    expect(within(field).getByText('1').closest('span')?.className).toMatch(/text-badge/)
  })

  test('the header strip title is a plain label, not a toggle button', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    switchToTable()
    expect(screen.queryByRole('button', { name: 'Prior Tender List' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'New Tender List' })).toBeNull()
  })
})

describe('OrderChangeTenderLists — duplicate carriers (same scac+equipment, different rows)', () => {
  const dupOc = { priorTenderList: [dup1, dup2], newTenderList: [newDup1, newDup2] }

  test('Differences reflects only the row that moved', () => {
    render(<OrderChangeTenderLists oc={dupOc} />)
    expect(screen.getByText('Differences (1)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rank Order Change' })).toBeTruthy()
  })

  test('only the moved duplicate renders a changed Rank badge; the unchanged one stays plain', () => {
    render(<OrderChangeTenderLists oc={dupOc} />)
    // dup1 is unchanged (rank 1 on both sides) — neither its prior nor its
    // new cell should be a badge.
    for (const el of screen.getAllByText('1')) {
      expect(el.closest('span')?.className || '').not.toMatch(/text-badge/)
    }
    // dup2 moved (prior rank 9 -> new rank 5) — both cells are badges.
    expect(screen.getByText('9').closest('span')?.className).toMatch(/text-badge/)
    expect(screen.getByText('5').closest('span')?.className).toMatch(/text-badge/)
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

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
  // S137 — the "Differences:" filter chips are gone (ComparisonPreviewCard
  // dropped its whole sub-header row); only the count riding the title
  // survives.
  test('Differences (N) shows the computed tag count in the title', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    expect(screen.getByText('(2)')).toBeTruthy() // purple count in the accordion title
    expect(screen.queryByRole('button', { name: 'Rank Order Change' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'AP Cost' })).toBeNull()
  })

  test('empty prior/new lists render without throwing', () => {
    expect(() => render(<OrderChangeTenderLists oc={{ priorTenderList: [], newTenderList: [] }} />)).not.toThrow()
    // ComparisonPreviewCard (S137 rewrite) states this in the title itself,
    // "(No Differences)" — no separate sub-header line any more.
    expect(screen.getByText('(No Differences)')).toBeTruthy()
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

describe('OrderChangeTenderLists — duplicate carriers (same scac+equipment, different rows)', () => {
  const dupOc = { priorTenderList: [dup1, dup2], newTenderList: [newDup1, newDup2] }

  test('Differences reflects only the row that moved', () => {
    render(<OrderChangeTenderLists oc={dupOc} />)
    expect(screen.getByText('(1)')).toBeTruthy() // purple count in the accordion title
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

// S135 — dropped-carrier signal in the New Tender List's header strip (third
// iteration, designer: replaces the quiet note and the standalone accordion):
// an amber "Dropped from this version" badge + a secondary button opening the
// dropped carriers in a modal.
describe('OrderChangeTenderLists — dropped carriers', () => {
  const withDrops = () => makeOc({
    droppedCarriers: {
      prior: [{ scac: 'RLCA', reason: 'No Rates' }], // must NOT render — new-version drops only
      new: [
        { scac: 'XPOL', carrierName: 'XPO Logistics', equipment: 'Van', routeRank: 3, dropCode: 23, reason: 'Missing Transit Time', reasonDescription: 'Transit time could not be calculated due to missing transit or distance data.' },
        { scac: 'JBHT', carrierName: 'JB Hunt', equipment: 'Van', routeRank: null, dropCode: 1, reason: 'No Rates', reasonDescription: 'No rate is available for this carrier on this lane and equipment.' },
      ],
    },
  })

  test('the New list header carries the amber badge + Preview button', () => {
    render(<OrderChangeTenderLists oc={withDrops()} />)
    expect(screen.getByText('Dropped from this version')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Preview Dropped Carriers' })).toBeTruthy()
  })

  test('the button opens the modal with the NEW version drops; prior-version drops stay out', () => {
    render(<OrderChangeTenderLists oc={withDrops()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview Dropped Carriers' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('cell', { name: 'XPO Logistics' })).toBeTruthy()
    expect(dialog.getByRole('cell', { name: 'JB Hunt' })).toBeTruthy()
    expect(dialog.getByRole('cell', { name: 'Missing Transit Time' })).toBeTruthy()
    expect(dialog.queryByText(/RLCA/)).toBeNull()
    // Read-only: the header X is the only button in the dialog.
    expect(dialog.getAllByRole('button')).toHaveLength(1)

    fireEvent.click(dialog.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('absent entirely when the new version dropped nothing', () => {
    render(<OrderChangeTenderLists oc={makeOc({ droppedCarriers: { prior: [], new: [] } })} />)
    expect(screen.queryByText('Dropped from this version')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Preview Dropped Carriers' })).toBeNull()
  })

  test('absent on a pre-S135 payload with no droppedCarriers key', () => {
    render(<OrderChangeTenderLists oc={makeOc()} />)
    expect(screen.queryByText('Dropped from this version')).toBeNull()
  })
})

// S137 (designer/user, 2026-09-02) — "new Cost selected will update the base
// cost": the New Tender List's AP Cost cell for the row matching
// oc.prior.scac shows what Select Cost picked, recomputed into the column's
// own AP-TOTAL unit (base rate + that row's additionalCharges), not the raw
// base rate — a unit mismatch caught in review (oc.prior/newOption.apCost is
// rateDetails.baseRate, this column's `cost` is totalCostAmount).
describe('OrderChangeTenderLists — selected cost override (S137)', () => {
  const odflNew = {
    rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
    cost: '$2,850.00 USD', status: null,
    rateDetails: { baseRate: 2800, additionalCharges: [{ amount: 50 }] }, // 2800 + 50 = 2850, matches `cost`
    pickupDateTime: '01/08/2026 09:00 CST', deliveryDateTime: '01/10/2026 14:00 CST',
  }
  const ocFixture = () => ({
    prior: { scac: 'ODFL' },
    priorTenderList: [odfl, saia],
    newTenderList: [odflNew, newSaia],
  })

  test('a selected base rate that changes the recomputed total renders purple, in the AP-total unit', () => {
    render(<OrderChangeTenderLists oc={ocFixture()} selectedCost={{ choice: 'new', amount: 3000 }} />)
    // 3000 (selected base) + 50 (ODFL's own additional charge) = 3050 — NOT
    // a raw "$3,000.00" echo of the base rate.
    const cell = screen.getByText('$3,050.00 USD')
    expect(cell.closest('span')?.className).toMatch(/text-badge/)
    expect(screen.queryByText('$2,850.00 USD')).toBeNull() // routed value is gone, overridden
  })

  test('a selected base rate whose recomputed total matches the routed cost renders plain, not changed', () => {
    // 2800 (selected, same as the row's own baseRate) + 50 = 2850 — equals
    // odflNew's routed `cost` exactly.
    render(<OrderChangeTenderLists oc={ocFixture()} selectedCost={{ choice: 'new', amount: 2800 }} />)
    const cell = screen.getByText('$2,850.00 USD')
    expect(cell.closest('span')?.className || '').not.toMatch(/text-badge/)
  })

  test('other carriers in the New Tender List are untouched by the override', () => {
    render(<OrderChangeTenderLists oc={ocFixture()} selectedCost={{ choice: 'new', amount: 3000 }} />)
    // SAIA's own cost never moved and is not the selected carrier — appears
    // once per side (prior + new), neither a badge.
    for (const el of screen.getAllByText('$2,900.00 USD')) {
      expect(el.closest('span')?.className || '').not.toMatch(/text-badge/)
    }
  })

  test('no row for oc.prior.scac in newTenderList (not-returned, dropped) — no override, nothing invented', () => {
    const notReturned = { prior: { scac: 'ODFL' }, priorTenderList: [odfl], newTenderList: [] }
    expect(() => render(<OrderChangeTenderLists oc={notReturned} selectedCost={{ choice: 'new', amount: 3000 }} />)).not.toThrow()
    expect(screen.queryByText(/3,050/)).toBeNull()
  })

  test('no selectedCost yet — renders the routed cost untouched', () => {
    render(<OrderChangeTenderLists oc={ocFixture()} />)
    expect(screen.getByText('$2,850.00 USD')).toBeTruthy()
  })
})

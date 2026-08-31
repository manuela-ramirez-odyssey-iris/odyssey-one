// @vitest-environment jsdom
// Task 9 — "Actions to Keep Current Carrier" card (LINX-14513 cost selection,
// LINX-14514 tender resolution actions). The whole card is about ONE carrier
// — the prior one — so every fixture below varies `scenario`/`quoted`/nulls
// on the SAME carrier rather than inventing a second one.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import OrderChangeActionsCard from './OrderChangeActionsCard.jsx'

afterEach(cleanup)

// Real OrderChangeCarrierVM shape (api/types/shipmentDetail.ts) — raw values,
// not pre-formatted display strings (dates ARE already display-ready per the
// mapper/generator, since they're copied verbatim off a RoutingOptionVM row).
const priorOption = {
  rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
  rate: '$2,790.00', cost: '$2,790.00 USD',
  rateDetails: { baseRate: 2790, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 2790, arTotal: 2790 },
  status: 'Accepted',
  pickupDateTime: '01/07/2026 09:00 CST', pickupTZ: 'CST', pickupOrgHours: '', pickupOrgDay: '',
  deliveryDateTime: '01/09/2026 14:00 CST', deliveryTZ: 'CST', deliveryOrgHours: '',
}

function makeOc(overrides = {}) {
  return {
    scenario: 'returned',
    prior: {
      scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
      tenderStatus: 'Accepted', routeRank: 1, rank: 1,
      pickupDateTime: '01/07/2026 09:00 CST', deliveryDateTime: '01/09/2026 14:00 CST',
      apCost: 2790, quoted: false,
    },
    newOption: {
      scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
      tenderStatus: null, routeRank: 1, rank: 1,
      pickupDateTime: '01/08/2026 09:00 CST', deliveryDateTime: '01/10/2026 14:00 CST',
      apCost: 2950,
    },
    priorTenderList: [priorOption],
    newTenderList: [],
    comparison: [],
    hazmat: [],
    resolution: null,
    ...overrides,
  }
}

const NOT_RETURNED = makeOc({
  scenario: 'not-returned',
  newOption: {
    scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
    tenderStatus: null, routeRank: null, rank: 4,
    pickupDateTime: '01/08/2026 09:00 CST', deliveryDateTime: '01/10/2026 14:00 CST',
    apCost: null,
  },
})

describe('OrderChangeActionsCard — cost selection scenarios (LINX-14513)', () => {
  test('returned scenario pre-selects New Cost', () => {
    render(<OrderChangeActionsCard oc={makeOc()} onAction={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'New Cost' }).checked).toBe(true)
    expect(screen.getByRole('radio', { name: 'Prior Cost' }).checked).toBe(false)
  })

  test('not-returned scenario disables New Cost and pre-selects Prior Cost', () => {
    render(<OrderChangeActionsCard oc={NOT_RETURNED} onAction={vi.fn()} />)
    const newCostRadio = screen.getByRole('radio', { name: 'New Cost' })
    expect(newCostRadio.disabled).toBe(true)
    expect(newCostRadio.checked).toBe(false)
    expect(screen.getByRole('radio', { name: 'Prior Cost' }).checked).toBe(true)
  })

  test('quoted prior shows the Quoted Cost badge', () => {
    const oc = makeOc({ prior: { ...makeOc().prior, quoted: true } })
    render(<OrderChangeActionsCard oc={oc} onAction={vi.fn()} />)
    expect(screen.getByText('Quoted Cost')).toBeTruthy()
  })

  test('un-quoted prior does not show the badge', () => {
    render(<OrderChangeActionsCard oc={makeOc()} onAction={vi.fn()} />)
    expect(screen.queryByText('Quoted Cost')).toBeNull()
  })
})

describe('OrderChangeActionsCard — tender resolution actions (LINX-14514)', () => {
  test('Re tender emits retender with the selected cost choice and amount', () => {
    const onAction = vi.fn()
    render(<OrderChangeActionsCard oc={makeOc()} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Re tender' }))
    expect(onAction).toHaveBeenCalledWith('retender', { choice: 'new', amount: 2950 })
  })

  test('Bypass Tender emits bypass with the selected cost choice and amount', () => {
    const onAction = vi.fn()
    render(<OrderChangeActionsCard oc={makeOc()} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bypass Tender' }))
    expect(onAction).toHaveBeenCalledWith('bypass', { choice: 'new', amount: 2950 })
  })

  test('switching to Prior Cost changes the emitted amount', () => {
    const onAction = vi.fn()
    render(<OrderChangeActionsCard oc={makeOc()} onAction={onAction} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Prior Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Re tender' }))
    expect(onAction).toHaveBeenCalledWith('retender', { choice: 'prior', amount: 2790 })
  })
})

describe('OrderChangeActionsCard — Prior | New comparison panel', () => {
  test('New side renders -- for null routeRank and null tenderStatus', () => {
    render(<OrderChangeActionsCard oc={NOT_RETURNED} onAction={vi.fn()} />)

    const tenderStatusRows = screen.getAllByText('Tender Status')
    expect(tenderStatusRows).toHaveLength(2) // Prior column + New column
    const newTenderStatusRow = tenderStatusRows[1].closest('.order-change-actions__row')
    expect(within(newTenderStatusRow).getByText('--')).toBeTruthy()

    const routeRankRows = screen.getAllByText('Route Rank')
    const newRouteRankRow = routeRankRows[1].closest('.order-change-actions__row')
    expect(within(newRouteRankRow).getByText('--')).toBeTruthy()
  })
})

describe('OrderChangeActionsCard — New Quote flow', () => {
  test('choosing New Quote opens the quote modal for the prior carrier', () => {
    render(<OrderChangeActionsCard oc={makeOc()} onAction={vi.fn()} />)
    fireEvent.click(screen.getByRole('radio', { name: 'New Quote' }))
    // QuoteModal in 'add' mode, titled "Add Quote", carrierData = the PRIOR
    // carrier's own routing-option row (matched by scac) — never the new one.
    expect(screen.getByText('Add Quote')).toBeTruthy()
    expect(screen.getAllByText('ODFL').length).toBeGreaterThan(0)
  })
})

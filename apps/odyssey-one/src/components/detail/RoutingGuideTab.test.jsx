// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import RoutingGuideTab from './RoutingGuideTab'

// Mocked so the persist-round-trip test below can inspect the EXACT payload
// `saveTenderOption` receives — the real function is a live-mode-only no-op
// in tests (getApiMode() defaults to 'mock'), which would hide a regression
// completely rather than surface it.
vi.mock('../../api/services/shipmentService', () => ({ saveTenderOption: vi.fn().mockResolvedValue(undefined) }))
import { saveTenderOption } from '../../api/services/shipmentService'

afterEach(cleanup)

const baseOption = {
  rank: 1,
  routeRank: 1,
  scac: 'ODFL',
  carrierName: 'Old Dominion Freight Line',
  equipment: 'Van',
  cost: '$2,790.00 USD',
  status: 'Sent',
}

describe('RoutingGuideTab — SPOT RATE badge', () => {
  it('renders a SPOT RATE badge beside the carrier when spotRate is true', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Spot', spotRate: true }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.getByText('SPOT RATE')).toBeTruthy()
  })

  it('does not render the badge for a non-Spot route group', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Network' }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.queryByText('SPOT RATE')).toBeNull()
  })

  it('does not render the badge for a manually-keyed quote (routeGroup Spot, no spotRate marker)', () => {
    const data = { options: [{ ...baseOption, routeGroup: 'Spot', rateSource: 'Manual' }] }
    render(<RoutingGuideTab data={data} />)
    expect(screen.getByText('Old Dominion Freight Line')).toBeTruthy()
    expect(screen.queryByText('SPOT RATE')).toBeNull()
  })
})

// Persist round-trip (2026-08-10) — proves the FULL pipeline from a UI edit
// to the wire payload, not just that QuoteModal's onSave carries the right
// shape. Guards the bug found alongside adding Equipment to QuoteModal: the
// write path used to serialize persistTender's VM-shaped option verbatim,
// which the read path (mapRoutingOption) doesn't recognize — equipmentCode,
// totalCostAmount, etc. — so the FIRST save on any shipment silently
// degraded those fields to '--' on the next load. routingOptionVmToDto
// (mapSellShipmentOutToDetail.ts) is the fix; this exercises it from a real
// Edit Quote click through to saveTenderOption's actual argument, the same
// choke point every Add/Edit Quote and tender-status action goes through.
describe('RoutingGuideTab — tender persist (VM → DTO)', () => {
  it('a picked Equipment survives from the Edit Quote UI to saveTenderOption as equipmentCode, not equipment', () => {
    const option = {
      rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion Freight Line',
      equipment: 'LTL', cost: '$2,790.00 USD', status: 'Sent',
      rateDetails: { baseRate: 1000, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 1000, arTotal: 1000 },
    }
    const data = { options: [option] }
    const shipment = { sellShipment: 'SHIP-1' }
    render(<RoutingGuideTab data={data} shipment={shipment} />)

    // Open the row's action menu (the truck-icon cell, last column of the
    // right table) and pick "Edit Quote".
    const menuCell = document.querySelector('[data-right-table] tbody tr td:last-child')
    fireEvent.click(menuCell)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quote' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit Quote' })
    const equipmentCombo = within(dialog).getByText('Equipment').closest('.combo-box')
    fireEvent.focus(within(equipmentCombo).getByRole('combobox'))
    fireEvent.keyDown(equipmentCombo, { key: 'ArrowDown' })
    fireEvent.keyDown(equipmentCombo, { key: 'ArrowDown' })
    fireEvent.keyDown(equipmentCombo, { key: 'Enter' }) // LTL (seed) -> LTR

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Quote' }))

    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    const [id, sentOption] = saveTenderOption.mock.calls[0]
    expect(id).toBe('SHIP-1')
    // The bug: this used to be `sentOption.equipment === 'LTR'` and
    // `equipmentCode` was absent entirely — mapRoutingOption reads
    // equipmentCode on the next load, so that shape silently degrades.
    expect(sentOption.equipmentCode).toBe('LTR')
    expect(sentOption.equipment).toBeUndefined()
    // Same bug class applies to cost/distance/transit/api; rate/cost happen
    // to be present here as numbers now instead of formatted VM strings.
    expect(sentOption.totalCostAmount).toBe(1000)
    expect(typeof sentOption.cost).toBe('undefined')
  })
})

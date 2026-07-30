// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ShipmentDetailsModal from './ShipmentDetailsModal'

afterEach(cleanup)

const shipment = { buyShipment: '85611354', sellShipment: '25068206', mode: 'TL', equipmentCode: 'TL', grossWeight: 26308, orders: ['VAN2TBVV8', 'OUF4PEUH2'] }
const details = {
  orderDetails: [{ hazmat: 'Yes', earliestPickup: '06/18/2026 09:15 CST', shipFrom: { company: 'G2O Technologies LLC' }, shipTo: {} }],
  stopsData: { stops: [{ type: 'pickup', date: '06/02/2026 08:00 CST', packageCount: '17' }], summary: { volume: '295 cuft', distance: '1293.3 mi' } },
}

describe('ShipmentDetailsModal', () => {
  it('renders the four sections with values, dashing the empties', () => {
    render(<ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} />)
    for (const t of ['Shipment', 'Order', 'Initial Pickup', 'Final Delivery']) {
      expect(screen.getByRole('heading', { name: t })).toBeTruthy()
    }
    expect(screen.getByText('26,308 LB')).toBeTruthy()
    expect(screen.getByText('VAN2TBVV8, OUF4PEUH2')).toBeTruthy()
    // 06/02/2026 is a Tuesday — the weekday suffix is derived, not stored
    expect(screen.getByText('06/02/2026 08:00 CST, TUE')).toBeTruthy()
    // Pickup # has no value on this fixture
    expect(screen.getAllByText('--').length).toBeGreaterThan(0)
  })

  it('shows the error body (footer intact) when the detail fetch failed', () => {
    render(<ShipmentDetailsModal shipment={shipment} shipmentDetails={null} error onClose={() => {}} />)
    expect(screen.getByText(/Unable to load shipment details/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Routing Query (QCP)' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Initial Pickup' })).toBeNull()
  })
})

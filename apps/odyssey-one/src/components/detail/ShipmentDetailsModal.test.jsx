// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShipmentDetailsModal from './ShipmentDetailsModal'

afterEach(cleanup)

const shipment = {
  buyShipment: '85611354', sellShipment: '25068206', pro: '67819A88',
  customerName: 'USALCO', shipmentStatus: 'Accepted',
  mode: 'LTL', equipmentCode: 'LTL', orders: ['VAN2TBVV8', 'OUF4PEUH2'],
}
const details = {
  ratingStatus: 'Successful',
  trackingUrl: 'https://tracking.oneodyssey.com/t/67819A88',
  orderDetails: [
    { orderNumber: 'L14372086', hazmat: 'Yes', paymentTerms: 'Collect', proBooking: '67819A88', poNumber: 'PO-5512', salesOrder: '--' },
    { orderNumber: 'L14372084', hazmat: 'No', salesOrder: '--', poNumber: '--' },
  ],
  stopsData: {
    stops: [
      { type: 'pickup', stopNumber: 1, order: 'L14372086, L14372084', orderIds: ['L14372086', 'L14372084'], address: '244 E Jackson Street, Baytown, TX', date: '06/02/2026 08:00 CST' },
      { type: 'delivery', stopNumber: 2, order: 'L14372084', orderIds: ['L14372084'], address: '129 Broadway Avenue, Miami, FL', date: '06/04/2026 14:00 CST' },
    ],
    summary: { grossWeight: '44,470 LB', volume: '200 cuft', acceptedCarrier: 'CTNS', seedEquipment: 'LTL' },
  },
  routingData: { options: [
    { rank: 1, status: null, pickupDateTime: '06/01/2026 07:00 CST', deliveryDateTime: '06/03/2026 12:00 CST' },
    { rank: 2, status: 'Accepted', pickupDateTime: '06/02/2026 08:00 CST', deliveryDateTime: '06/04/2026 14:00 CST' },
  ] },
  userDefinedData: { orders: [
    { orderId: 'L14372086', fields: [{ name: 'TEMP_SENSITIVITY', value: 'REEFER 34-38F' }, { name: 'AFTER_HOURS', value: 'Y' }] },
    { orderId: 'L14372084', fields: [] },
  ] },
  costData: { planned: { summary: {
    base: '$2,900.00', fuel: '$250.00', accessorials: '$56.00',
    apTotal: '$3,206.00', arTotal: '$3,456.00', margin: '$250.00 (7.7%)',
    directCost: '$3,906.00',
  } } },
}

describe('ShipmentDetailsModal', () => {
  it('renders the header strip + General Information from the accepted option', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    for (const t of ['General Information', 'Cost']) {
      expect(screen.getByRole('heading', { name: t })).toBeTruthy()
    }
    expect(screen.getByText('85611354')).toBeTruthy()
    expect(screen.getByText('Successful')).toBeTruthy()
    // Source Name is the customer (Jana's wording), Freight Term is paymentTerms
    expect(screen.getByText('USALCO')).toBeTruthy()
    expect(screen.getByText('Collect')).toBeTruthy()
    expect(screen.getByText('CTNS')).toBeTruthy()
    // Dates come from the ACCEPTED option (rank 2), not rank 1. 24h per
    // LINX-8120 / LINX-7629 — displayed exactly as stored.
    expect(screen.getAllByText('06/02/2026 08:00 CST').length).toBeGreaterThan(0)
    expect(screen.queryByText('06/01/2026 07:00 CST')).toBeNull()
    // Tracking Link is backed by `trackingUrl` (R2-1), shown WITHOUT the
    // protocol (display convention, 2026-08-02) — the stored URL keeps it.
    expect(screen.getByText('tracking.oneodyssey.com/t/67819A88')).toBeTruthy()
    expect(screen.queryByText('https://tracking.oneodyssey.com/t/67819A88')).toBeNull()
  })

  it('renders all seven cost rows', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    for (const l of ['Base', 'Fuel (FSC)', 'Accessorials', 'AP Total (Carrier)', 'AR Total (Customer)', 'Margin', 'Direct Cost']) {
      expect(screen.getByText(l)).toBeTruthy()
    }
    expect(screen.getByText('$3,906.00')).toBeTruthy()
  })

  it('lists Customer Reference Values per order, sparsely', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Customer Reference Values' })).toBeTruthy()
    // Also appears as a Stops link, so match on count not uniqueness
    expect(screen.getAllByText('L14372086').length).toBeGreaterThan(0)
    expect(screen.getAllByText('L14372084').length).toBeGreaterThan(0)
    // Only populated references render — '--' values are dropped, not shown as rows
    expect(screen.getByText('PO-5512')).toBeTruthy()
    expect(screen.queryByText('Sales Order Number')).toBeNull()
  })

  it('moves User Defined Fields behind its own tab, dropping the strip', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    // UDF content is not in the Details tab
    expect(screen.queryByText('TEMP_SENSITIVITY')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'User Defined Fields' }))
    expect(screen.getByText('TEMP_SENSITIVITY')).toBeTruthy()
    expect(screen.getByText('REEFER 34-38F')).toBeTruthy()
    // The identifiers strip is Details-only, and so are the Details sections
    expect(screen.queryByText('85611354')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Cost' })).toBeNull()
  })

  it('summarizes stops with an address and a link to the order view', () => {
    const onClose = vi.fn()
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={onClose} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Stops' })).toBeTruthy()
    expect(screen.getByText('Stop 1')).toBeTruthy()
    expect(screen.getByText('244 E Jackson Street, Baytown, TX')).toBeTruthy()
    expect(screen.getByText('129 Broadway Avenue, Miami, FL')).toBeTruthy()

    // A stop serving several orders renders ONE link per order
    expect(screen.getAllByRole('button', { name: 'L14372086' }).length).toBe(1)
    expect(screen.getAllByRole('button', { name: 'L14372084' }).length).toBe(2) // both stops

    // Links go into the Orders domain; the modal closes first so the user
    // isn't left with a dialog over a different route.
    fireEvent.click(screen.getAllByRole('button', { name: 'L14372086' })[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('falls back to rank 1 when no option is accepted', () => {
    const d = { ...details, routingData: { options: [{ rank: 2, pickupDateTime: 'x' }, { rank: 1, pickupDateTime: '06/01/2026 07:00 CST' }] } }
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={d} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('06/01/2026 07:00 CST')).toBeTruthy()
  })

  it('puts Routing Query (QCP) on the tab row, not a footer', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    const qcp = screen.getByRole('button', { name: 'Routing Query (QCP)' })
    // Trails the tabs inside the same row — the modal has no footer at all
    expect(qcp.closest('.shp-details__tabrow')).toBeTruthy()
    expect(document.querySelector('.modal-medium__footer')).toBeNull()
    expect(screen.queryByRole('button', { name: 'View Stops' })).toBeNull()
    // Survives the tab switch (the row is outside the per-tab content)
    fireEvent.click(screen.getByRole('tab', { name: 'User Defined Fields' }))
    expect(screen.getByRole('button', { name: 'Routing Query (QCP)' })).toBeTruthy()
  })

  it('shows the error body when the detail fetch failed', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={null} error onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText(/Unable to load shipment details/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'General Information' })).toBeNull()
  })
})

// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SpotBoardTab from './SpotBoardTab'
import { decodeToken } from '../../spotboard/token.js'

const shipment = { sellShipment: '0000000091105', buyShipment: '0000000091105' }

function makeShipmentDetails(options = []) {
  return {
    routingData: { options },
    stopsData: {
      summary: { distance: '245.00 mi', grossWeight: '12,000 LB', volume: '400 cuft', acceptedCarrier: '--', seedEquipment: 'Van', utilization: '--' },
      stops: [
        { type: 'pickup', stopNumber: 1, location: 'Atlanta, GA', address: '123 Main St', date: '08/10/2026', appointment: '--', weight: '--', volume: '--', packageCount: '--', pickupNo: '--', order: 'ORD-1', orderIds: ['ORD-1'] },
        { type: 'delivery', stopNumber: 2, location: 'Charlotte, NC', address: '456 Elm St', date: '08/11/2026', appointment: '--', weight: '--', volume: '--', packageCount: '--', pickupNo: '--', order: 'ORD-1', orderIds: ['ORD-1'] },
      ],
    },
    orderDetails: [
      { orderNumber: 'ORD-1', equipment: 'Van', hazmat: 'No', earliestPickup: '08/10/2026 08:00', latestPickup: '08/10/2026 12:00' },
    ],
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('SpotBoardTab', () => {
  it('renders both sub-tabs for an eligible shipment', () => {
    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    expect(screen.getByText('Setup & Carriers')).toBeTruthy()
    expect(screen.getByText('Live Bids')).toBeTruthy()
  })

  // The context strip was hoisted out of Setup & Carriers so it stays put across
  // sub-tabs — assert it on Live Bids, where it never rendered before.
  it('keeps the shipment-context SummaryStrip visible on both sub-tabs', () => {
    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    const strip = screen.getByLabelText('Shipment Summary')
    expect(strip.textContent).toContain('Atlanta, GA')
    expect(strip.textContent).toContain('Charlotte, NC')
    fireEvent.click(screen.getByText('Live Bids'))
    expect(screen.getByLabelText('Shipment Summary').textContent).toContain('Atlanta, GA')
  })

  it('shows the EmptyState (not the sub-tabs) when the shipment has an Accepted tender', () => {
    const details = makeShipmentDetails([
      { rank: 1, status: 'Accepted', scac: 'ODFL', carrierName: 'Old Dominion' },
    ])
    render(<SpotBoardTab shipmentDetails={details} shipment={shipment} />)
    expect(screen.getByText(/already has an? Accepted tender with Old Dominion/)).toBeTruthy()
    expect(screen.queryByText('Setup & Carriers')).toBeFalsy()
    expect(screen.queryByText('Live Bids')).toBeFalsy()
  })

  it('keeps Setup & Carriers read-only (no action buttons) once a quote is awarded', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'list-1',
        listName: 'Regional Van',
        durationMin: 60,
        openAt: 1000,
        closeAt: 2000,
        status: 'awarded',
        awardType: 'manual',
        awardedScac: 'ODFL',
        carriers: [],
        flexiblePickup: false,
      })
    )
    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    expect(screen.queryByText('Send RFQ')).toBeFalsy()
    expect(screen.queryByText('Save Draft')).toBeFalsy()
  })

  it('on Send RFQ, surfaces one working bid link per included carrier and none for excluded ones', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: null,
        closeAt: null,
        status: 'draft',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [] },
          { scac: 'SAIA', name: 'Saia', email: 'ops@saia.example.com', equipment: 'Van', incl: false, plannedPickup: '', plannedDelivery: '', flags: [] },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    fireEvent.click(screen.getByText('Send RFQ'))

    const odflLink = screen.getByRole('link', { name: /ODFL.*Old Dominion/ })
    expect(odflLink).toBeTruthy()
    expect(screen.queryByRole('link', { name: /SAIA/ })).toBeFalsy()

    const href = odflLink.getAttribute('href')
    expect(href.startsWith('/spot-bid/')).toBe(true)
    const token = href.slice('/spot-bid/'.length)
    expect(decodeToken(token)).toEqual({ shipmentId: shipment.sellShipment, scac: 'ODFL' })
  })

  // Bug: RFQ links must survive a reload/remount — Send RFQ is never clicked
  // in this component's lifetime here, the quote is already 'open' in the
  // store with minted tokens (as spotStore.sendRFQ leaves it).
  it('recovers bid links on fresh mount when the persisted quote is already open with tokens', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: 1000,
        closeAt: 999999999999,
        status: 'open',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [], token: 'fake-token-odfl' },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)

    const odflLink = screen.getByRole('link', { name: /ODFL.*Old Dominion/ })
    expect(odflLink).toBeTruthy()
    expect(odflLink.getAttribute('href')).toBe('/spot-bid/fake-token-odfl')
  })

  it('shows no links panel for a draft quote (no tokens minted yet)', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: null,
        closeAt: null,
        status: 'draft',
        awardType: null,
        awardedScac: null,
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [] },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    expect(screen.queryByRole('link', { name: /ODFL/ })).toBeFalsy()
  })

  it('shows no links panel for a closed/awarded quote', () => {
    localStorage.setItem(
      `spotboard:${shipment.sellShipment}`,
      JSON.stringify({
        quoteId: 'q1',
        shipmentId: shipment.sellShipment,
        listId: 'tl-se',
        listName: 'TL Southeast Overflow',
        durationMin: 120,
        openAt: 1000,
        closeAt: 2000,
        status: 'awarded',
        awardType: 'manual',
        awardedScac: 'ODFL',
        carriers: [
          { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [], token: 'fake-token-odfl' },
        ],
        flexiblePickup: false,
      })
    )

    render(<SpotBoardTab shipmentDetails={makeShipmentDetails([])} shipment={shipment} />)
    expect(screen.queryByRole('link', { name: /ODFL/ })).toBeFalsy()
  })
})

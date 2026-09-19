// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ConsolidationReviewRoute from './ConsolidationReviewRoute.jsx'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async (id) => ({
    stopsData: { summary: { volume: id === 'a' ? '1,000 cuft' : '375 cuft' } },
    orderDetails: [{ hazmat: id === 'b' ? 'Yes' : 'No' }],
  })),
}))

afterEach(cleanup)

const rows = [
  { id: 'a', sellShipment: 'a', buyShipment: 'BUY-A', odysseyShipmentIdentifier: 'O00000001', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sparta, NJ', destination: 'Baltimore, MD', pickupDate: '12/16/2026 08:00 CST', deliveryDate: '12/17/2026 08:00 CST', grossWeight: '15000', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-1'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
  { id: 'b', sellShipment: 'b', buyShipment: 'BUY-B', odysseyShipmentIdentifier: 'O00000002', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sewaren, NJ', destination: 'Fairfax, VA', pickupDate: '12/16/2026 12:00 CST', deliveryDate: '12/18/2026 08:00 CST', grossWeight: '12500', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-2'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
]

function ShipmentsProbe() {
  const { state } = useLocation()
  return <div data-testid="shipments-probe">{JSON.stringify(state ?? null)}</div>
}

function renderReview(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments/consolidate/review', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/review" element={<ConsolidationReviewRoute />} />
            <Route path="/shipments/*" element={<ShipmentsProbe />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ConsolidationReviewRoute', () => {
  test('renders the proposal from location.state rows', async () => {
    renderReview({ rows })
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
    expect(screen.getByText('Valtris Specialty Chemicals')).toBeTruthy()
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
    expect(screen.getByText('O00000001')).toBeTruthy()
    expect(screen.getByText('2 Pickup Stops')).toBeTruthy()
    expect(screen.getByText('2 Delivery Stops')).toBeTruthy()
    expect(screen.getByText('27,500 LB')).toBeTruthy()
    expect(await screen.findByText('1,375 cuft')).toBeTruthy()
    expect(screen.getByText('Yes')).toBeTruthy()
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('BUY-A')).toBeTruthy()
    expect(within(table).getByText('BUY-B')).toBeTruthy()
  })

  test('stop timeline lists pickups then deliveries in selection order', () => {
    renderReview({ rows })
    const labels = screen.getAllByText(/^(P|D)\d$/).map((el) => el.textContent)
    expect(labels).toEqual(['P1', 'P2', 'D1', 'D2'])
  })

  test('Modify Selection returns to Shipments in mode with the rows', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Modify Selection' }))
    const state = JSON.parse(screen.getByTestId('shipments-probe').textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  test('Cancel and Modify Selection asks "Yes, Cancel", then leaves with nothing retained', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and Modify Selection' }))
    expect(screen.getByText(/Are you sure you want to cancel the proposed consolidation\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText(/Are you sure you want to cancel/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and Modify Selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
    expect(JSON.parse(screen.getByTestId('shipments-probe').textContent)).toBeNull()
  })

  test('Apply Consolidation confirms; Yes is a stub that stays on the page', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
    expect(screen.getByText('Are you sure you want to apply this consolidation?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.queryByText('Are you sure you want to apply this consolidation?')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
  })

  test('a failed detail fetch shows the alert but still renders the weight total', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    renderReview({ rows })
    expect(await screen.findByText("Couldn't load volume and hazmat for every selected shipment. The totals below are incomplete.")).toBeTruthy()
    expect(screen.getByText('27,500 LB')).toBeTruthy()
  })

  test('no rows in state → empty state with a way back', () => {
    renderReview(undefined)
    expect(screen.getByText('No consolidation to review.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipments' }))
    expect(screen.getByTestId('shipments-probe')).toBeTruthy()
  })
})

// @vitest-environment jsdom
// S154 — the open/close slide for the full-page breadcrumb views
// (useSlideRoute.js). Exercised through ConsolidationReviewRoute, the
// simplest of the three routes this hook is wired into — same harness as
// ConsolidationReviewRoute.test.jsx.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ConsolidationReviewRoute from './ConsolidationReviewRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async () => ({ stopsData: { summary: {} }, orderDetails: [] })),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const rows = [
  { id: 'a', sellShipment: 'a', buyShipment: 'BUY-A', customerId: 'VALTRIS_01', customerName: 'Valtris', origin: 'Sparta, NJ', destination: 'Baltimore, MD', pickupDate: '12/16/2026', deliveryDate: '12/17/2026', grossWeight: '15000', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-1'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
  { id: 'b', sellShipment: 'b', buyShipment: 'BUY-B', customerId: 'VALTRIS_01', customerName: 'Valtris', origin: 'Sewaren, NJ', destination: 'Fairfax, VA', pickupDate: '12/16/2026', deliveryDate: '12/18/2026', grossWeight: '12500', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-2'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
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

describe('useSlideRoute / .slide-route (S154)', () => {
  test('a breadcrumb view renders with the slide-route class on mount', () => {
    const { container } = renderReview({ rows })
    expect(container.querySelector('.order-change.slide-route')).toBeTruthy()
    expect(container.querySelector('.slide-route--leaving')).toBeNull()
    expect(within(container).getByLabelText('Breadcrumb')).toBeTruthy()
  })

  test('clicking an exit control adds slide-route--leaving and does not navigate immediately', () => {
    const { container } = renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
    expect(container.querySelector('.slide-route--leaving')).toBeTruthy()
    expect(screen.queryByTestId('shipments-probe')).toBeNull()
  })

  test('navigates after the slide duration, to the same destination and state a direct call would have used', async () => {
    vi.useFakeTimers()
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Consolidation' }))
    expect(screen.queryByTestId('shipments-probe')).toBeNull()
    await act(async () => { vi.advanceTimersByTime(300) })
    const state = JSON.parse(screen.getByTestId('shipments-probe').textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  test('prefers-reduced-motion: navigates immediately with no leaving class', () => {
    const original = window.matchMedia
    window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} })
    try {
      const { container } = renderReview({ rows })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
      expect(container.querySelector('.slide-route--leaving')).toBeNull()
      expect(JSON.parse(screen.getByTestId('shipments-probe').textContent)).toBeNull()
    } finally {
      window.matchMedia = original
    }
  })
})

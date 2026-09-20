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

  test('every row starts checked, and totals reflect all rows', () => {
    renderReview({ rows })
    expect(screen.getByRole('checkbox', { name: 'Include BUY-A' }).checked).toBe(true)
    expect(screen.getByRole('checkbox', { name: 'Include BUY-B' }).checked).toBe(true)
    expect(screen.getByText('27,500 LB')).toBeTruthy()
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
  })

  test('unchecking a row keeps it in the table but drops its totals and chip', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('BUY-A')).toBeTruthy() // still there, just excluded
    expect(screen.getByText('12,500 LB')).toBeTruthy() // row b only
    expect(screen.getByText('Selected Shipments (1)')).toBeTruthy()
    expect(screen.queryByText('O00000001')).toBeNull()
    expect(screen.getByText('O00000002')).toBeTruthy()
  })

  test('an unchecked row loses data-selected on its <tr> (the graying hook)', () => {
    renderReview({ rows })
    const rowEl = screen.getByText('BUY-A').closest('tr')
    expect(rowEl.hasAttribute('data-selected')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    expect(rowEl.hasAttribute('data-selected')).toBe(false)
  })

  test('Apply Consolidation is disabled once fewer than 2 rows are checked', () => {
    renderReview({ rows })
    expect(screen.getByRole('button', { name: 'Apply Consolidation' }).disabled).toBe(false)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    expect(screen.getByRole('button', { name: 'Apply Consolidation' }).disabled).toBe(true)
  })

  test('the "Selected shipments to consolidate" SubAccordion is not collapsible', () => {
    renderReview({ rows })
    expect(screen.queryByRole('button', { name: 'Selected shipments to consolidate' })).toBeNull()
    expect(screen.getByText('Selected shipments to consolidate')).toBeTruthy()
    // content is always revealed for a static (non-collapsible) accordion — no chevron control hides it
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('BUY-A')).toBeTruthy()
  })

  test('stop timeline lists pickups then deliveries in selection order', () => {
    renderReview({ rows })
    const labels = screen.getAllByText(/^(P|D)\d$/).map((el) => el.textContent)
    expect(labels).toEqual(['P1', 'P2', 'D1', 'D2'])
  })

  test('pickup and delivery stop markers are visually distinguished (S154)', () => {
    const { container } = renderReview({ rows })
    const badgeFor = (label) => screen.getByText(label).closest('.stop-badge')
    // Both are the solid `completed` skin (white label, no status circle) —
    // the pickup/delivery split comes from the extra tint class Timeline
    // forwards, not from status.
    expect(badgeFor('P1').className).toContain('stop-badge--completed')
    expect(badgeFor('D1').className).toContain('stop-badge--completed')
    expect(badgeFor('P1').className).toContain('consolidation-review__stop-badge--pickup')
    expect(badgeFor('P2').className).toContain('consolidation-review__stop-badge--pickup')
    expect(badgeFor('D1').className).not.toContain('consolidation-review__stop-badge--pickup')
    expect(badgeFor('D2').className).not.toContain('consolidation-review__stop-badge--pickup')
    // No status circle overlay on planned-stop markers.
    expect(container.querySelectorAll('.stop-badge__status')).toHaveLength(0)
  })

  test('Modify Whole Selection returns to Shipments in mode with the rows, lives in the accordion action slot, no pencil icon', () => {
    renderReview({ rows })
    expect(screen.queryByRole('button', { name: 'Modify Selection' })).toBeNull()
    const button = screen.getByRole('button', { name: 'Modify Whole Selection' })
    expect(button.querySelector('svg')).toBeNull() // no icon
    fireEvent.click(button)
    const state = JSON.parse(screen.getByTestId('shipments-probe').textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  test('Modify Whole Selection carries only the CHECKED rows back', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Modify Whole Selection' }))
    const state = JSON.parse(screen.getByTestId('shipments-probe').textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a'])
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

  test('the rail is hidden — the review continues consolidate mode, and the VD has no sidebar', () => {
    const { container } = renderReview({ rows })
    expect(container.querySelector('.sidebar--hidden')).toBeTruthy()
    expect(container.querySelector('.sidebar:not(.sidebar--hidden)')).toBeNull()
  })
})

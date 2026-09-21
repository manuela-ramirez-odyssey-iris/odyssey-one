// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ConsolidationReviewRoute from './ConsolidationReviewRoute.jsx'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { applyConsolidation } from '../../api/services/consolidationService'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/consolidationService', () => ({
  applyConsolidation: vi.fn(async ({ sellShipments }) => ({
    row: { id: '27000001', sellShipment: '27000001', buyShipment: '910000001', odysseyShipmentIdentifier: 'C70000001', orders: sellShipments },
    detail: {},
  })),
}))

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async (id) => ({
    stopsData: { summary: { volume: id === 'a' ? '1,000 cuft' : '375 cuft' } },
    orderDetails: [{ hazmat: id === 'b' ? 'Yes' : 'No' }],
  })),
}))

afterEach(() => { cleanup(); vi.mocked(applyConsolidation).mockClear() })

const rows = [
  { id: 'a', sellShipment: 'a', buyShipment: 'BUY-A', odysseyShipmentIdentifier: 'O00000001', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sparta, NJ', destination: 'Baltimore, MD', pickupDate: '12/16/2026 08:00 CST', deliveryDate: '12/17/2026 08:00 CST', grossWeight: '15000', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-1'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
  { id: 'b', sellShipment: 'b', buyShipment: 'BUY-B', odysseyShipmentIdentifier: 'O00000002', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sewaren, NJ', destination: 'Fairfax, VA', pickupDate: '12/16/2026 12:00 CST', deliveryDate: '12/18/2026 08:00 CST', grossWeight: '12500', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-2'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
]

// A third row, so a single uncheck still leaves two and is NOT refused by the
// minimum-two guard (S155 §2.4).
const rows3 = [...rows, { ...rows[1], id: 'c', sellShipment: 'c', buyShipment: 'BUY-C', odysseyShipmentIdentifier: 'O00000003', orders: ['ORD-3'] }]

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
    renderReview({ rows: rows3 })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('BUY-A')).toBeTruthy() // still there, just excluded
    expect(screen.getByText('25,000 LB')).toBeTruthy() // rows b + c
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
    expect(screen.queryByText('O00000001')).toBeNull()
    expect(screen.getByText('O00000002')).toBeTruthy()
  })

  test('an unchecked row loses data-selected on its <tr> (the graying hook)', () => {
    renderReview({ rows: rows3 })
    const rowEl = screen.getByText('BUY-A').closest('tr')
    expect(rowEl.hasAttribute('data-selected')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    expect(rowEl.hasAttribute('data-selected')).toBe(false)
  })

  // S155 §2.4 — a toggle that would leave fewer than two is REFUSED, from the
  // row checkbox and the header checkbox alike; the dialog routes the planner
  // to the place the selection can actually be changed.
  test('unchecking the second-to-last row is refused and opens the minimum-two dialog', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    expect(screen.getByText('A consolidation needs at least two shipments. To change the selection, go back to Shipments Consolidation and modify it.')).toBeTruthy()
    // the toggle did NOT take effect
    expect(screen.getByRole('checkbox', { name: 'Include BUY-A' }).checked).toBe(true)
    expect(screen.getByText('27,500 LB')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByText(/A consolidation needs at least two shipments/)).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Include BUY-A' }).checked).toBe(true)
  })

  test('the HEADER checkbox hits the same guard', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include all shipments to consolidate' }))
    expect(screen.getByText('Minimum Two Shipments')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Include BUY-B' }).checked).toBe(true)
  })

  test('Modify Selection leaves with the rows the planner tried to uncheck removed', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include BUY-A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Modify Selection' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['b'])
  })

  test('the header-checkbox refusal carries an EMPTY selection back', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include all shipments to consolidate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Modify Selection' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.consolidate.rows).toEqual([])
  })

  test('the select column is pinned left so it survives horizontal scroll', () => {
    const { container } = renderReview({ rows })
    expect(container.querySelector('.odyssey-table__cell--sticky-left')).toBeTruthy()
  })

  // S155 — the accordion action is gone; the footer owns the way back.
  test('Edit Consolidation returns to Shipments in mode with the CHECKED rows', async () => {
    renderReview({ rows })
    expect(screen.queryByRole('button', { name: 'Modify Whole Selection' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Consolidation' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  test('Cancel Consolidation asks "Yes, Cancel", then leaves with nothing retained', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    expect(screen.getByText(/Are you sure you want to cancel the proposed consolidation\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText(/Are you sure you want to cancel/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
    expect(JSON.parse((await screen.findByTestId('shipments-probe')).textContent)).toBeNull()
  })

  test('Apply confirms with the identifier chips, then applies the CHECKED sell shipments', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
    expect(screen.getByText('Are you sure you want to apply the proposed consolidation?')).toBeTruthy()
    const dialog = document.querySelector('.confirm-dialog')
    expect(within(dialog).getAllByText(/^O0000000\d$/).length).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Apply' }))
    await screen.findByText(/Consolidation Successfully Applied!/)
    // react-query hands the mutationFn a context object alongside the variables
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].sellShipments).toEqual(['a', 'b'])
  })

  test('"No" closes the apply dialog without applying', () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText('Are you sure you want to apply the proposed consolidation?')).toBeNull()
    expect(vi.mocked(applyConsolidation)).not.toHaveBeenCalled()
  })

  // S155 §2.6 — after Apply the page is a preview of what was created.
  async function applyAndWait() {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Apply' }))
    await screen.findByText(/Consolidation Successfully Applied!/)
  }

  test('after Apply: success alert, renamed header and breadcrumb, read-only table', async () => {
    await applyAndWait()
    expect(screen.getByText(/Consolidation ID: C70000001\. 2 Shipments successfully consolidated\./)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Review C70000001' })).toBeTruthy()
    expect(screen.getAllByText('Review C70000001').length).toBeGreaterThan(1) // header + breadcrumb
    expect(screen.queryByRole('checkbox', { name: 'Include BUY-A' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Include all shipments to consolidate' })).toBeNull()
    // the table itself stays
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('BUY-A')).toBeTruthy()
  })

  test('after Apply: the success alert is dismissable', async () => {
    await applyAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/Consolidation Successfully Applied!/)).toBeNull()
  })

  test('after Apply: View Shipment hands the created row to the grid', async () => {
    await applyAndWait()
    fireEvent.click(screen.getByRole('button', { name: /View Shipment/ }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.createdShipment.id).toBe('27000001')
    expect(state.createdShipment.odysseyShipmentIdentifier).toBe('C70000001')
  })

  test('after Apply: Edit Consolidated Shipment re-enters mode with the NEW row', async () => {
    await applyAndWait()
    expect(screen.queryByRole('button', { name: 'Edit Consolidation' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Consolidated Shipment' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['27000001'])
  })

  test('after Apply: Back to Shipments leaves with no dialog and no state', async () => {
    await applyAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipments' }))
    expect(screen.queryByText(/Are you sure/)).toBeNull()
    expect(JSON.parse((await screen.findByTestId('shipments-probe')).textContent)).toBeNull()
  })

  test('a failed Apply shows the error and leaves the page editable', async () => {
    vi.mocked(applyConsolidation).mockRejectedValueOnce(new Error('Unknown shipment(s): a'))
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Apply' }))
    expect(await screen.findByText('Unknown shipment(s): a')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Include BUY-A' })).toBeTruthy()
  })

  test('a failed detail fetch shows the alert but still renders the weight total', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    renderReview({ rows })
    expect(await screen.findByText("Couldn't load volume and hazmat for every selected shipment. The totals below are incomplete.")).toBeTruthy()
    expect(screen.getByText('27,500 LB')).toBeTruthy()
  })

  test('no rows in state → empty state with a way back', async () => {
    renderReview(undefined)
    expect(screen.getByText('No consolidation to review.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipments' }))
    expect(await screen.findByTestId('shipments-probe')).toBeTruthy()
  })

  test('the rail is hidden — the review continues consolidate mode, and the VD has no sidebar', () => {
    const { container } = renderReview({ rows })
    expect(container.querySelector('.sidebar--hidden')).toBeTruthy()
    expect(container.querySelector('.sidebar:not(.sidebar--hidden)')).toBeNull()
  })
})

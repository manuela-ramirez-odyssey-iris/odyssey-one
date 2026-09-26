// @vitest-environment jsdom
// jest-dom is not installed in this repo (only @testing-library/react + dom)
// — plain assertions (.disabled) instead of toBeDisabled(), matching
// ManualDatesModal.test.jsx / DroppedCarrierSection.test.jsx.
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StopsTab from './StopsTab'

// T3 (S160) — StopsTab's Approve Plan now resolves through useApproveOrderChange
// (useResolveOrderChange -> the service layer), same mocking convention as
// OrderChangeEditStopsRoute.test.jsx: mock the SERVICE, not the query hook.
vi.mock('../../api/services/shipmentService', () => ({
  resolveOrderChange: vi.fn(),
}))
import { resolveOrderChange } from '../../api/services/shipmentService'

afterEach(() => {
  cleanup()
  resolveOrderChange.mockReset()
})

// StopsTab now navigates (Edit Shipment Stops, S143 Task 2b; Approve Plan
// Scenario A/B, T3) — it needs a Router ancestor same as ShipmentTable.test.jsx's
// row-menu tests, plus a QueryClientProvider (useApproveOrderChange's mutate).
//
// The probe is a PERSISTENT sibling (not a route-specific element): Scenario
// B's closeSheet lands back on the SAME '/shipments' path with only new
// `state` (requestedTab etc.), which a route-swap probe can't observe —
// this one shows pathname + state after every navigation, same-path or not.
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="nav-probe">{location.pathname} {JSON.stringify(location.state)}</div>
}
function renderWithRouter(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/shipments']}>
        <LocationProbe />
        <Routes>
          <Route path="/shipments" element={ui} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const summary = { distance: '364.14 mi', grossWeight: '54,907 LB', volume: '226 cuft', acceptedCarrier: 'SEFL - LTL', seedEquipment: 'LTH', utilization: '--' }
const stops = [
  { type: 'pickup', stopNumber: 1, order: 'A, B', orderIds: ['A', 'B'], location: 'COLUMBUS PL, Kansas City', address: '831 8th Street', date: 'June 4, 2026 03:00 PDT', appointment: '3:00 PDT', weight: '32,333 LB', volume: '300 cuft', packageCount: '180', pickupNo: 'PU-1' },
  { type: 'delivery', stopNumber: 2, order: 'A, B', orderIds: ['A', 'B'], location: 'X', address: 'Y', date: 'June 6, 2026 03:00 PDT', appointment: '3:00 PDT', weight: '32,333 LB', volume: '300 cuft', packageCount: '180', pickupNo: '' },
]
const consolidation = {
  locationChange: false, changedOrderIds: ['B'],
  stopChanges: { '1': { changedOrderIds: ['B'], fields: { date: { prior: 'June 4, 2026 03:00 PDT', new: 'June 5, 2026 03:00 PDT' }, weight: { prior: '32,333 LB', new: '34,000 LB' } } } },
  orderComparisons: { B: [{ field: 'Gross Weight', source: 'Order', prior: '1 LB', new: '2 LB', changed: true }] },
  summaryChanges: { grossWeight: { prior: '54,907 LB', new: '70,907 LB' } },
  costs: { prior: '1,500.00 USD', newDirect: '2,000.00 USD', newConsolidated: '3,000.00 USD' },
}
const oc = { scenario: 'returned', prior: {}, newOption: {}, priorTenderList: [], newTenderList: [], comparison: [], hazmat: [], droppedCarriers: { prior: [], new: [] }, resolution: null, consolidation }
const shipment = { sellShipment: '25319141', buyShipment: '87654321' }
const renderReview = (extra = {}) => renderWithRouter(<StopsTab data={{ summary, stops }} orderChange={oc} orderDetails={[]} shipment={shipment} {...extra} />)

describe('StopsTab — plain mode', () => {
  it('renders as before without a consolidation payload', () => {
    renderWithRouter(<StopsTab data={{ summary, stops }} orderChange={null} />)
    expect(screen.queryByText('Approve Plan')).toBeNull()
    expect(screen.queryByText('Affected Orders')).toBeNull()
    expect(screen.getByText('COLUMBUS PL, Kansas City')).toBeTruthy()
  })
  // User ruling 2026-09-09: plain mode has no purple change badges on this
  // surface, so the type badge stays green (only review mode goes purple).
  it('keeps the stop type badge green', () => {
    renderWithRouter(<StopsTab data={{ summary, stops }} orderChange={null} />)
    expect(screen.getByText('Pickup').style.background).toContain('badge-green-bg')
  })
  it('stays plain once the review is resolved', () => {
    renderReview({ orderChange: { ...oc, resolution: { action: 'approve-plan' } } })
    expect(screen.queryByRole('button', { name: 'Evaluate' })).toBeNull()
  })
})

describe('StopsTab — consolidated order-change review (LINX-15435/15436)', () => {
  it('shows Prior/New pairs only for changed summary cells and no Margin', () => {
    renderReview()
    const strip = screen.getByLabelText('Shipment KPIs')
    expect(within(strip).getByText('70,907 LB')).toBeTruthy()
    expect(within(strip).getAllByText('Prior')).toHaveLength(1)
    expect(within(strip).getAllByText('New')).toHaveLength(1)
    expect(within(strip).getByText('364.14 mi')).toBeTruthy()
    expect(within(strip).queryByText('Margin')).toBeNull()
  })
  // T3 (S160/DEC-207): Evaluate replaces both the old View Routing button
  // and the Approve Plan ComingSoon stub — there is exactly one of it.
  it('renders Edit Shipment Stops, Evaluate and View Planning Dates; no separate View Routing or a disabled Approve Plan stub', () => {
    renderReview()
    expect(screen.getByRole('button', { name: 'Edit Shipment Stops' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Evaluate' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'View Planning Dates' }).disabled).toBe(false)
    expect(screen.queryByRole('button', { name: 'View Routing' })).toBeNull()
    expect(screen.queryAllByRole('button', { name: 'Approve Plan' })).toHaveLength(0)
    expect(screen.getByText('New Consolidated Cost')).toBeTruthy()
    expect(screen.getByText('3,000.00 USD')).toBeTruthy()
  })
  it('Edit Shipment Stops navigates to the stops editor route with buyShipment in state', () => {
    renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Shipment Stops' }))
    const probe = screen.getByTestId('nav-probe')
    expect(probe.textContent).toContain(`/shipments/order-change/${shipment.sellShipment}/stops`)
    // openSheet (S158) adds its own `sheetStack` key alongside the state this
    // opener has always sent — assert on that payload with `toContain`
    // rather than exact equality.
    expect(probe.textContent).toContain(JSON.stringify({ buyShipment: shipment.buyShipment, from: 'stops' }).slice(0, -1))
  })
  it('badges changed stop fields and changed orders; unchanged stay plain', () => {
    renderReview()
    const newDate = screen.getByText('June 5, 2026 03:00 PDT')
    expect(newDate.closest('.text-badge')).toBeTruthy()
    expect(screen.getByText('34,000 LB').closest('.text-badge')).toBeTruthy()
    expect(screen.getByText('June 6, 2026 03:00 PDT').closest('.text-badge')).toBeNull()
    const stop1 = screen.getByText('Stop 1').closest('.odyssey-timeline__row')
    const orderCell = within(stop1).getByText('Order').parentElement
    expect(within(orderCell).getByText('B').closest('.text-badge')).toBeTruthy()
    expect(within(orderCell).getByText('A').closest('.text-badge')).toBeNull()
  })
  it('lists affected orders per stop and opens the compare modal', () => {
    renderReview()
    const stop1 = screen.getByText('Stop 1').closest('.odyssey-timeline__row')
    expect(within(stop1).getByText('Affected Orders')).toBeTruthy()
    const link = within(stop1).getByRole('button', { name: /B/ })
    fireEvent.click(link)
    expect(screen.getByRole('dialog', { name: 'Order Changes' })).toBeTruthy()
    expect(screen.getByText('Order Number: B')).toBeTruthy()
  })
  it('shows Affected Orders on pickup stops only (DEC-191)', () => {
    renderReview()
    const rows = [...document.querySelectorAll('.odyssey-timeline__row')]
    const delivery = rows.find((r) => r.textContent.includes('Delivery'))
    expect(within(delivery).queryByText('Affected Orders')).toBeNull()
  })
  it('wraps New Consolidated Cost with a tooltip explaining the N/A when a location changed', () => {
    renderReview({ orderChange: { ...oc, consolidation: { ...consolidation, locationChange: true, costs: { ...consolidation.costs, newConsolidated: null } } } })
    const label = screen.getByText('New Consolidated Cost')
    expect(label.closest('[data-tooltip-trigger]')).toBeTruthy()
    fireEvent.mouseEnter(label.closest('[data-tooltip-trigger]'))
    expect(screen.getByText(/Not calculated — an order location changed/)).toBeTruthy()
  })
  it('disables Evaluate while a location change is unfinalized (LINX-15438)', () => {
    renderReview({ orderChange: { ...oc, consolidation: { ...consolidation, locationChange: true } } })
    expect(screen.getByRole('button', { name: 'Evaluate' }).disabled).toBe(true)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Evaluate' }).closest('[data-tooltip-trigger]'))
    expect(screen.getByText('Finalize stop changes in Edit Shipment Stops first')).toBeTruthy()
  })
  it('flags a changed stop as changed (purple) on the rail; leaves an unchanged stop alone', () => {
    renderReview()
    // Stop 1 (P1) carries a stopChanges entry, stop 2 (D1) doesn't — StopBadge
    // (packages/ui/src/StopBadge.jsx) renders status via a `stop-badge--<status>`
    // class and an aria-label of "<label> — <status text>". A change is not a
    // fault, so it wears purple 'changed', not red 'issue' (user ruling, 2026-09-09).
    expect(document.querySelector('.stop-badge--changed')?.getAttribute('aria-label')).toBe('P1 — changed')
    expect(document.querySelector('.stop-badge--issue')).toBeNull()
    expect(document.querySelector('.stop-badge--completed')?.getAttribute('aria-label')).toBe('D1 — completed')
  })
  // User ruling 2026-09-09: review mode already carries purple change
  // badges, so the type badge picks up purple too (not the canon
  // customer-change color mapping — a deliberate reuse here).
  it('makes the stop type badge purple in review mode', () => {
    renderReview()
    const stop1 = screen.getByText('Stop 1').closest('.odyssey-timeline__row')
    expect(within(stop1).getByText('Pickup').style.background).toContain('badge-purple-bg')
  })
})

// T3 (S160/DEC-207) — Evaluate -> ViewRoutingModal (Keep Reviewing / Approve
// Plan) -> ConfirmDialog -> useApproveOrderChange's Scenario A/B.
describe('StopsTab — Evaluate -> Approve Plan (T3)', () => {
  it('Evaluate opens the routing modal with Keep Reviewing / Approve Plan; Keep Reviewing closes it', () => {
    renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Keep Reviewing' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep Reviewing' }))
    expect(screen.queryByRole('dialog', { name: 'View Routing' })).toBeNull()
  })

  it("Approve Plan's confirm stacks ABOVE the routing modal; cancelling the confirm leaves the routing modal open", () => {
    renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Plan' }))
    expect(screen.getByRole('dialog', { name: 'Approve Plan' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Approve Plan' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  })

  it('Approve Plan confirm dialog carries the AC copy', () => {
    renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Plan' }))
    expect(screen.getByText('The shipment will be approved with the order changes as shown.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy()
  })

  // Scenario A: oc.prior.tenderStatus is active — no server call, straight
  // to the Direct decision screen.
  it('Scenario A (active prior tender): confirming Approve navigates to the Direct review with NO resolveOrderChange call', async () => {
    renderReview({ orderChange: { ...oc, prior: { tenderStatus: 'Sent' } } })
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const probe = await screen.findByTestId('nav-probe')
    expect(probe.textContent).toContain(`/shipments/order-change/${shipment.sellShipment}`)
    expect(probe.textContent).not.toContain('/stops')
    expect(resolveOrderChange).not.toHaveBeenCalled()
  })

  // Scenario B: no active prior tender — calls approve-plan, then lands on
  // the Tender tab.
  it('Scenario B (no active prior tender): confirming Approve calls resolveOrderChange with approve-plan, then navigates to the Tender tab', async () => {
    resolveOrderChange.mockResolvedValue(undefined)
    renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(resolveOrderChange).toHaveBeenCalledWith(
      shipment.sellShipment,
      expect.objectContaining({ action: 'approve-plan', priorTenderStatus: null }),
    ))
    const probe = await screen.findByTestId('nav-probe')
    expect(probe.textContent).toContain('/shipments ')
    expect(probe.textContent).toContain('"key":"routing"')
  })

  it('a failed Approve keeps the routing modal open and shows the error inside it', async () => {
    resolveOrderChange.mockRejectedValue(new Error('boom'))
    renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('boom')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  })
})

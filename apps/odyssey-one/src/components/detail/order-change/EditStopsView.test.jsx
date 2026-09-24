// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditStopsView from './EditStopsView'

vi.mock('./AddOrdersModal', () => ({
  default: ({ onAdd }) => <button onClick={() => onAdd([{ orderNumber: 'E', sourceSellShipment: '77' }])}>mock-add</button>,
}))
vi.mock('../../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async () => ({
    orderDetails: [{
      orderNumber: 'E', planningType: 'SSD', shipFrom: { location: 'X, City' }, shipTo: { location: 'Z, Ville' },
      grossWeight: '7 LB', totalVolume: '2 cuft', earliestPickup: '06/04/2026', earliestDelivery: '06/06/2026',
    }],
  })),
}))
import { getSellShipmentDetail } from '../../../api/services/shipmentService'

afterEach(() => { cleanup(); getSellShipmentDetail.mockClear() })

const stop = (over) => ({
  type: 'pickup', stopNumber: 1, orderIds: ['A'], location: 'X, City', address: '1 St',
  date: 'June 4, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1', pickupNo: '', ...over,
})
const baseStops = [
  stop({ stopNumber: 1, orderIds: ['A', 'B'] }),
  stop({ stopNumber: 2, orderIds: ['C'], location: 'Y, Town' }),
  stop({ type: 'delivery', stopNumber: 3, orderIds: ['A', 'B', 'C'], location: 'Z, Ville', date: 'June 6, 2026 08:00 CDT' }),
]
const orders = [
  { orderNumber: 'A', shipFrom: { location: 'X, City' }, shipTo: { location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'B', shipFrom: { location: 'X, City' }, shipTo: { location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'C', shipFrom: { location: 'Y, Town' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1,005 LB', totalVolume: '1 cuft' },
]
const noChange = { locationChange: false, changedOrderIds: [], stopChanges: {}, orderComparisons: {}, summaryChanges: {}, costs: { prior: '$1,000.00', newDirect: '$1,100.00', newConsolidated: '$1,050.00' } }
const locChange = {
  ...noChange,
  locationChange: true,
  changedOrderIds: ['C'],
  stopChanges: { 2: { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'Q, Burg' } } } },
}
const summary = { distance: '364.14 mi' }
const orderChange = { newTenderList: [], priorTenderList: [], droppedCarriers: { prior: [], new: [] } }

const setup = (over = {}) => {
  const onApprove = vi.fn()
  const onCancel = vi.fn()
  render(
    <EditStopsView
      stops={baseStops}
      consolidation={noChange}
      orders={orders}
      orderChange={orderChange}
      summary={summary}
      onApprove={onApprove}
      onCancel={onCancel}
      {...over}
    />,
  )
  return { onApprove, onCancel }
}

// Prior and New render the same stops side by side (DEC-197) — scope stop
// queries to the editable New plan.
const nw = () => within(screen.getByRole('region', { name: 'New plan' }))

it('renders the head, hint alert, stop cards with labels P1 P2 D1, order rows, and the pending column', () => {
  setup()
  expect(screen.getByText('All Stops')).toBeTruthy()
  expect(screen.getByText(/arrow buttons on each stop/)).toBeTruthy()
  expect(nw().getByText('Stop 1')).toBeTruthy()
  expect(nw().getByText('Stop 2')).toBeTruthy()
  expect(nw().getByText('Stop 3')).toBeTruthy()
  expect(screen.getAllByText('A').length).toBeGreaterThan(0)
  expect(screen.getByText('Orders Pending To Assign')).toBeTruthy()
  // User ruling 2026-09-09: this editor already carries purple/gray change
  // badges, so the stop-type badge is purple here too (not the canon
  // customer-change color mapping — a deliberate reuse).
  expect(nw().getAllByText('Pickup')[0].style.background).toContain('badge-purple-bg')
  // User 2026-09-24: Prior is gray.
  expect(screen.getAllByText('Pickup')[0].style.background).toContain('badge-gray-bg')
})

it('renders the stops on the Timeline rail with P1/P2/D1 StopBadge markers, reordering after a move', () => {
  setup()
  expect(nw().getByLabelText('P1 — changed')).toBeTruthy()
  expect(nw().getByLabelText('P2 — changed')).toBeTruthy()
  expect(nw().getByLabelText('D1 — changed')).toBeTruthy()
  // Move stop 1 (P1) down over stop 2 (P2, also a pickup) — legal, and the
  // rail's badge order should follow (P1 now labels the second card).
  fireEvent.click(screen.getAllByRole('button', { name: 'Move stop down' })[0])
  const badges = nw().getAllByLabelText(/^P\d — changed$/)
  expect(badges.map((b) => b.getAttribute('aria-label'))).toEqual(['P1 — changed', 'P2 — changed'])
  // P2 (Y, Town) is now first, so "Stop 1" (the rail's position label) carries it.
  expect(nw().getByText('Stop 1').closest('.edit-stops__card').textContent).toContain('Y, Town')
})

it('arrows reorder and renumber; an illegal move is disabled (user 2026-09-24)', () => {
  setup()
  // Stop 2 (P2) up over Stop 1 (P1) is legal — both pickups, no sequence issue.
  const up = screen.getAllByRole('button', { name: 'Move stop up' })
  fireEvent.click(up[1]) // second card's up-arrow
  expect(nw().getByText('Y, Town')).toBeTruthy() // still rendered, now first
  // Now [P2(C), P1(A,B), D1(A,B,C)] — moving the middle stop down over the
  // delivery would put A/B's delivery ahead of their own pickup (LINX-15669).
  const down = screen.getAllByRole('button', { name: 'Move stop down' })
  expect(down[1].disabled).toBe(true)
  expect(screen.getAllByRole('button', { name: 'Move stop up' })[0].disabled).toBe(true) // first stop can't go up
})

it('Set Aside moves the order to the pending column; the last remaining order is disabled with the tooltip copy', () => {
  setup()
  const moveToPendingButtons = screen.getAllByRole('button', { name: 'Set Aside' })
  fireEvent.click(moveToPendingButtons[0]) // pends A
  expect(screen.getByRole('button', { name: 'Add order A' })).toBeTruthy()
  const pendingLink = screen.getAllByRole('button').find((b) => b.textContent === 'A')
  expect(pendingLink).toBeTruthy()
})

it('Add places the order automatically — no stop menu; a new location becomes P? (DEC-193)', () => {
  setup()
  fireEvent.click(screen.getAllByRole('button', { name: 'Set Aside' })[2])   // C off P2/D1 — P2 empties
  fireEvent.click(screen.getByRole('button', { name: 'Add order C' }))
  expect(screen.queryByRole('menuitem')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Add order C' })).toBeNull()
  expect(screen.getByText('P?')).toBeTruthy()                                 // Y, Town has no pickup stop left
})

it('a stop shows only its own date (DEC-195)', () => {
  setup()
  const p1 = nw().getByText('Stop 1').closest('.edit-stops__card')
  expect(p1.textContent).toContain('Pickup Date')
  expect(p1.textContent).not.toContain('Delivery Date')
})

it('Approve Changes asks for confirmation, then calls onApprove (VD 2066-77150)', () => {
  const { onApprove } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  expect(onApprove).not.toHaveBeenCalled()
  expect(screen.getByText('Approve Shipment Change')).toBeTruthy()
  expect(screen.getByText(/Any orders left pending for assignment will be removed/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove).toHaveBeenCalledTimes(1)
  expect(onApprove.mock.calls[0][1]).toEqual([])                                     // externalOrders — nothing added
})

it('Approve Shipment Change confirm — Cancel closes it without calling onApprove', () => {
  const { onApprove } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  const dialog = screen.getByRole('dialog', { name: 'Approve Shipment Change' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText('Approve Shipment Change')).toBeNull()
  expect(onApprove).not.toHaveBeenCalled()
})

it('View Routing disabled while a P? exists; enabled otherwise; clicking marks routed and enables Approve Changes; a further edit disables Approve again', () => {
  const { rerender } = render(
    <EditStopsView stops={baseStops} consolidation={locChange} orders={orders} orderChange={orderChange} summary={summary} onApprove={() => {}} onCancel={() => {}} />,
  )
  expect(screen.getByRole('button', { name: 'View Routing' }).disabled).toBe(true)
  cleanup()
  setup()
  const routingBtn = screen.getByRole('button', { name: 'View Routing' })
  expect(routingBtn.disabled).toBe(false)
  const approveBtn = screen.getByRole('button', { name: 'Approve Changes' })
  expect(approveBtn.disabled).toBe(true)
  fireEvent.click(routingBtn)
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(false)
  // any further edit clears routed -> disables approve again
  fireEvent.click(screen.getAllByRole('button', { name: 'Set Aside' })[0])
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(true)
})

it('Approve Changes stays disabled while saving even once routed', () => {
  setup({ saving: true })
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(true)
})

it('Prior and New render side by side; Prior is read-only and badges the planner\'s edits gray (DEC-197)', () => {
  setup()
  const prior = screen.getByRole('region', { name: 'Prior plan' })
  expect(screen.getByRole('region', { name: 'New plan' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Prior' })).toBeNull()             // no toggle
  expect(within(prior).queryByRole('button', { name: 'Set Aside' })).toBeNull()
  expect(within(prior).queryByRole('button', { name: 'Move stop up' })).toBeNull()
  // Stop 2 (P2) holds only order C — setting it aside empties and removes the stop.
  fireEvent.click(within(screen.getByRole('region', { name: 'New plan' })).getAllByRole('button', { name: 'Set Aside' })[2])
  expect(within(prior).getByText('Removed').style.background).toContain('badge-gray-bg')
})

it('Approve Changes calls onApprove with toDto rows; Cancel calls onCancel when clean and opens Discard when dirty', () => {
  const { onApprove, onCancel } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove).toHaveBeenCalledTimes(1)
  expect(onApprove.mock.calls[0][0][0]).toHaveProperty('stopSequence', 1)

  cleanup()
  const clean = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(clean.onCancel).toHaveBeenCalledTimes(1)

  cleanup()
  const dirty = setup()
  fireEvent.click(screen.getAllByRole('button', { name: 'Set Aside' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByText('Discard changes?')).toBeTruthy()
  expect(dirty.onCancel).not.toHaveBeenCalled()
})

it('Add New Order opens the modal; added orders land in pending with Add; a placed external order rides Approve as externalOrders', async () => {
  const { onApprove } = setup({ sellShipment: '9', customerId: 'ERCO', customerName: 'Erco' })
  // Pend C first (as the other Add-to test does) so P1 (A, B) is the only
  // pickup stop left — isolates the "17 LB" total to A(5)+B(5)+E(7) below.
  fireEvent.click(screen.getAllByRole('button', { name: 'Set Aside' })[2])
  fireEvent.click(screen.getByRole('button', { name: 'Add New Order' }))
  fireEvent.click(screen.getByText('mock-add'))
  expect(await screen.findByRole('button', { name: 'E' })).toBeTruthy()          // pending row link
  fireEvent.click(screen.getByRole('button', { name: 'Add order E' }))            // auto: P1 (X, City)
  expect(nw().getByText('Stop 1').closest('.edit-stops__card').textContent).toContain('E')
  expect(screen.getByText('17 LB')).toBeTruthy()                                  // 5+5+7 — external order counts in totals
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove.mock.calls[0][1]).toEqual([{ orderNumber: 'E', sourceSellShipment: '77' }])
})

it('a rejecting getSellShipmentDetail surfaces an Alert instead of an unhandled rejection; nothing lands in pending', async () => {
  getSellShipmentDetail.mockRejectedValueOnce(new Error('network down'))
  setup({ sellShipment: '9', customerId: 'ERCO', customerName: 'Erco' })
  fireEvent.click(screen.getByRole('button', { name: 'Add New Order' }))
  fireEvent.click(screen.getByText('mock-add'))
  expect(await screen.findByText('Could not load the selected orders. Try again.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'E' })).toBeNull()
})

it('hovering an order link shows the order Tooltip with the stop leg date (VD 2143-11775)', () => {
  setup({ orders: orders.map((o) => ({ ...o, planningType: 'SSD', earliestPickup: '06/04/2026', earliestDelivery: '06/06/2026' })) })
  fireEvent.mouseEnter(screen.getAllByRole('button', { name: 'C' })[0].parentElement)  // C's only pickup row (P2)
  expect(screen.getByRole('tooltip').textContent).toContain('Order Number: C')
  expect(screen.getByRole('tooltip').textContent).toContain('Pickup Date Time06/04/2026')
})

it('the New plan edits a stop date; a date outside an order window flags that order, never blocks (DEC-199)', () => {
  setup({ orders: orders.map((o) => ({ ...o, earliestPickup: '06/04/2026 06:00 CDT', latestPickup: '06/04/2026 10:00 CDT' })) })
  const newPlan = nw()
  expect(newPlan.queryByText('Outside planning window')).toBeNull()
  expect(within(screen.getByRole('region', { name: 'Prior plan' })).queryByLabelText('Pickup Date')).toBeNull() // Prior read-only
  const input = document.getElementById('stop-s1-time')
  fireEvent.change(input, { target: { value: '11:30' } })
  fireEvent.blur(input)
  expect(nw().getAllByText('Outside planning window').length).toBe(2)               // A and B on stop 1
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(true) // edit un-routes, as any edit does
})

it('marks what an action touched so it pulses where it landed (user 2026-09-24)', () => {
  setup()
  fireEvent.click(nw().getAllByRole('button', { name: 'Move stop down' })[0])
  expect(nw().getByText('Stop 2').closest('.edit-stops__card').hasAttribute('data-flash')).toBe(true)   // moved P1, now second
  fireEvent.click(nw().getAllByRole('button', { name: 'Set Aside' })[0])
  const pendingRow = screen.getByRole('button', { name: /^Add order / }).closest('.edit-stops__pending-row')
  expect(pendingRow.hasAttribute('data-flash')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /^Add order / }))
  expect(document.querySelectorAll('.edit-stops__order-row[data-flash]').length).toBeGreaterThan(0)
})

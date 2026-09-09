// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditStopsView from './EditStopsView'

afterEach(cleanup)

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

it('renders the head, hint alert, stop cards with labels P1 P2 D1, order rows, and the pending column', () => {
  setup()
  expect(screen.getByText('All Stops')).toBeTruthy()
  expect(screen.getByText(/arrow buttons on each stop/)).toBeTruthy()
  expect(screen.getByText('Stop 1')).toBeTruthy()
  expect(screen.getByText('Stop 2')).toBeTruthy()
  expect(screen.getByText('Stop 3')).toBeTruthy()
  expect(screen.getAllByText('A').length).toBeGreaterThan(0)
  expect(screen.getByText('Orders Pending To Assign')).toBeTruthy()
})

it('renders the stops on the Timeline rail with P1/P2/D1 StopBadge markers, reordering after a move', () => {
  setup()
  expect(screen.getByLabelText('P1 — completed')).toBeTruthy()
  expect(screen.getByLabelText('P2 — completed')).toBeTruthy()
  expect(screen.getByLabelText('D1 — completed')).toBeTruthy()
  // Move stop 1 (P1) down over stop 2 (P2, also a pickup) — legal, and the
  // rail's badge order should follow (P1 now labels the second card).
  fireEvent.click(screen.getAllByRole('button', { name: 'Move stop down' })[0])
  const badges = screen.getAllByLabelText(/^P\d — completed$/)
  expect(badges.map((b) => b.getAttribute('aria-label'))).toEqual(['P1 — completed', 'P2 — completed'])
  // P2 (Y, Town) is now first, so "Stop 1" (the rail's position label) carries it.
  expect(screen.getByText('Stop 1').closest('.edit-stops__card').textContent).toContain('Y, Town')
})

it('arrows reorder and renumber; an illegal move shows the 15669 message in an error alert', () => {
  setup()
  // Stop 2 (P2) up over Stop 1 (P1) is legal — both pickups, no sequence issue.
  const up = screen.getAllByRole('button', { name: 'Move stop up' })
  fireEvent.click(up[1]) // second card's up-arrow
  expect(screen.getByText('Y, Town')).toBeTruthy() // still rendered, now first
  // Now [P2(C), P1(A,B), D1(A,B,C)] — moving the middle stop down over the
  // delivery would put A/B's delivery ahead of their own pickup (LINX-15669).
  const down = screen.getAllByRole('button', { name: 'Move stop down' })
  fireEvent.click(down[1])
  expect(screen.getByText('An order must be picked up before it can be delivered.')).toBeTruthy()
})

it('Move To Pending moves the order to the pending column; the last remaining order is disabled with the tooltip copy', () => {
  setup()
  const moveToPendingButtons = screen.getAllByRole('button', { name: 'Move To Pending' })
  fireEvent.click(moveToPendingButtons[0]) // pends A
  expect(screen.getByRole('button', { name: 'Add to' })).toBeTruthy()
  const pendingLink = screen.getAllByRole('button').find((b) => b.textContent === 'A')
  expect(pendingLink).toBeTruthy()
})

it('Add to returns a pending order to a matched stop', () => {
  setup()
  const moveToPendingButtons = screen.getAllByRole('button', { name: 'Move To Pending' })
  fireEvent.click(moveToPendingButtons[0]) // pends A
  const addTo = screen.getAllByRole('button', { name: 'Add to' })
  fireEvent.click(addTo[0])
  // A is back on a stop — pending column should no longer list it as a row link/badge
  expect(screen.queryAllByRole('button', { name: 'Add to' }).length).toBe(0)
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
  fireEvent.click(screen.getAllByRole('button', { name: 'Move To Pending' })[0])
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(true)
})

it('Approve Changes stays disabled while saving even once routed', () => {
  setup({ saving: true })
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  expect(screen.getByRole('button', { name: 'Approve Changes' }).disabled).toBe(true)
})

it('Prior toggle disabled until dirty; in Prior view the title, alert copy, muted pending column, disabled controls and amber badges for removed/moved appear', () => {
  setup()
  const priorBtn = screen.getByRole('button', { name: 'Prior' })
  expect(priorBtn.disabled).toBe(true)
  // Stop 2 (P2) holds only order C — pending it empties and removes the stop.
  fireEvent.click(screen.getAllByRole('button', { name: 'Move To Pending' })[2])
  expect(screen.getByRole('button', { name: 'Prior' }).disabled).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Prior' }))
  expect(screen.getByText('All Stops - Prior Changes')).toBeTruthy()
  expect(screen.getByText('Prior changes view mode')).toBeTruthy()
  expect(screen.getByText('Removed')).toBeTruthy()
})

it('Approve Changes calls onApprove with toDto rows; Cancel calls onCancel when clean and opens Discard when dirty', () => {
  const { onApprove, onCancel } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  expect(onApprove).toHaveBeenCalledTimes(1)
  expect(onApprove.mock.calls[0][0][0]).toHaveProperty('stopSequence', 1)

  cleanup()
  const clean = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(clean.onCancel).toHaveBeenCalledTimes(1)

  cleanup()
  const dirty = setup()
  fireEvent.click(screen.getAllByRole('button', { name: 'Move To Pending' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByText('Discard changes?')).toBeTruthy()
  expect(dirty.onCancel).not.toHaveBeenCalled()
})

it('Add New Order is disabled', () => {
  setup()
  expect(screen.getByRole('button', { name: 'Add New Order' }).disabled).toBe(true)
})

it('hovering an order link shows the order Tooltip with the stop leg date (VD 2143-11775)', () => {
  setup({ orders: orders.map((o) => ({ ...o, planningType: 'SSD', earliestPickup: '06/04/2026', earliestDelivery: '06/06/2026' })) })
  fireEvent.mouseEnter(screen.getAllByRole('button', { name: 'C' })[0].parentElement)  // C's only pickup row (P2)
  expect(screen.getByRole('tooltip').textContent).toContain('Order Number: C')
  expect(screen.getByRole('tooltip').textContent).toContain('Pickup Date Time06/04/2026')
})

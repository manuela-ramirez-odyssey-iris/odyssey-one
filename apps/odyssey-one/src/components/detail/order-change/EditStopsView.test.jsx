// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditStopsView, { zoneOn } from './EditStopsView'
import { legDistances, initFromSources } from './stopsSandbox.js'
import { readFileSync } from 'node:fs'
// vitest stubs CSS imports (?raw comes back empty), so read the file directly
const editStopsCss = readFileSync('src/components/detail/order-change/edit-stops.css', 'utf8') // vitest runs from apps/odyssey-one

// jsdom can't drag: capture onDragEnd and invoke it with the event a real drop produces.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, DndContext: (props) => { window.__dragEnd = props.onDragEnd; return <actual.DndContext {...props} /> } }
})
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

// The address is split across text nodes (last word glued to its badges,
// user 2026-09-28), so stops are matched on the span's data-location.
const atLoc = (want) => (_, el) => !!el?.classList?.contains('edit-stops__stop-location')
  && (typeof want === 'string' ? el.dataset.location === want : want.test(el.dataset.location))
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
// The nth stop row (0-based) in the New plan — rows carry data-stop-key.
const newStop = (n) => screen.getByRole('region', { name: 'New plan' }).querySelectorAll('[data-stop-key]')[n]
// User 2026-09-28: New opens collapsed (drag); arrows, pickers and Remove
// live in edit mode behind its Edit button.
const edit = () => fireEvent.click(nw().getByRole('button', { name: 'Edit' }))
const save = () => fireEvent.click(nw().getByRole('button', { name: 'Save' }))

it('renders the head, hint alert, stop cards with labels P1 P2 D1, order rows, and the pending column', () => {
  setup()
  expect(screen.getByText('All Stops')).toBeTruthy()
  expect(screen.getByText(/^Drag a stop to move it/)).toBeTruthy()
  // User 2026-09-28 (round 2): Consolidation Planned Stops rows — no
  // HeaderStrip, no "Stop N"; the rail badge + row order carry position.
  expect(screen.queryByRole('heading', { name: 'Orders Pending To Assign' })).toBeNull()   // collapsed: pending column closed (inert, aria-hidden)
  edit()
  expect(nw().getAllByRole('button', { name: 'Move stop up' })).toHaveLength(3)
  expect(nw().queryByText('Stop 1')).toBeNull()
  expect(document.querySelector('.edit-stops .header-strip')).toBeNull()
  expect(nw().getByText(atLoc('Y, Town'))).toBeTruthy()
  expect(screen.queryByText(/^Distance: /)).toBeNull()               // the leg lives in the hover tooltip now
  expect(screen.getAllByText('A').length).toBeGreaterThan(0)
  expect(screen.getByText('Orders Pending To Assign')).toBeTruthy()
  // User ruling 2026-09-09: this editor already carries purple/gray change
  // badges, so the stop-type badge is purple here too (not the canon
  // customer-change color mapping — a deliberate reuse).
  expect(nw().getAllByText('Pickup')[0].style.background).toContain('badge-purple-bg')
  // One "Orders:" line per stop, no per-row "Order #".
  expect(nw().getAllByText('Orders:')).toHaveLength(3)
  expect(screen.queryByText('Order #')).toBeNull()
  // View Planning Dates is a link with a leading calendar icon.
  expect(screen.getByRole('button', { name: 'View Planning Dates' }).className).toMatch(/btn--link.*btn--has-icon/)
  // User 2026-09-28: Prior's type badge is green (was gray, 2026-09-24).
  // S164 F1: Prior collapsed on Edit — reopen it to read its badges.
  fireEvent.click(screen.getByRole('button', { name: 'Show prior plan' }))
  expect(screen.getAllByText('Pickup')[0].style.background).toContain('badge-green-bg')
})

it('renders the stops on the Timeline rail with P1/P2/D1 StopBadge markers, reordering after a move', () => {
  setup()
  expect(nw().getByLabelText('P1 — changed')).toBeTruthy()
  expect(nw().getByLabelText('P2 — changed')).toBeTruthy()
  expect(nw().getByLabelText('D1 — changed')).toBeTruthy()
  // Move stop 1 (P1) down over stop 2 (P2, also a pickup) — legal, and the
  // rail's badge order should follow (P1 now labels the second card).
  edit()
  fireEvent.click(screen.getAllByRole('button', { name: 'Move stop down' })[0])
  const badges = nw().getAllByLabelText(/^P\d — changed$/)
  expect(badges.map((b) => b.getAttribute('aria-label'))).toEqual(['P1 — changed', 'P2 — changed'])
  // P2 (Y, Town) is now the first row.
  expect(newStop(0).textContent).toContain('Y, Town')
})

it('arrows reorder and renumber; an illegal move is disabled (user 2026-09-24)', () => {
  setup()
  edit()
  // Stop 2 (P2) up over Stop 1 (P1) is legal — both pickups, no sequence issue.
  const up = screen.getAllByRole('button', { name: 'Move stop up' })
  fireEvent.click(up[1]) // second card's up-arrow
  expect(nw().getByText(atLoc('Y, Town'))).toBeTruthy() // still rendered, now first
  // Now [P2(C), P1(A,B), D1(A,B,C)] — moving the middle stop down over the
  // delivery would put A/B's delivery ahead of their own pickup (LINX-15669).
  const down = screen.getAllByRole('button', { name: 'Move stop down' })
  expect(down[1].disabled).toBe(true)
  expect(screen.getAllByRole('button', { name: 'Move stop up' })[0].disabled).toBe(true) // first stop can't go up
})

it('Remove moves the order to the pending column; the last remaining order is disabled with the tooltip copy', () => {
  setup()
  edit()
  const moveToPendingButtons = screen.getAllByRole('button', { name: 'Remove' })
  fireEvent.click(moveToPendingButtons[0]) // pends A
  expect(screen.getByRole('button', { name: 'Add order A' })).toBeTruthy()
  const pendingLink = screen.getAllByRole('button').find((b) => b.textContent === 'A')
  expect(pendingLink).toBeTruthy()
})

it('Add places the order automatically — no stop menu; a new location becomes P? (DEC-193)', () => {
  setup()
  edit()
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[2])   // C off P2/D1 — P2 empties
  fireEvent.click(screen.getByRole('button', { name: 'Add order C' }))
  expect(screen.queryByRole('menuitem')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Add order C' })).toBeNull()
  expect(screen.getByText('P?')).toBeTruthy()                                 // Y, Town has no pickup stop left
})

it('a stop shows only its own date (DEC-195)', () => {
  setup()
  const p1 = newStop(0)
  expect(p1.textContent).toContain('Pickup Date')
  expect(p1.textContent).not.toContain('Delivery Date')
})

it('Evaluate opens the routing modal; its Approve Changes asks for confirmation, then calls onApprove (VD 2066-77150, DEC-207)', () => {
  const { onApprove } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  const modal = screen.getByRole('dialog', { name: 'View Routing' })
  fireEvent.click(within(modal).getByRole('button', { name: 'Approve Changes' }))
  expect(onApprove).not.toHaveBeenCalled()
  expect(screen.getByText('Approve Shipment Change')).toBeTruthy()
  expect(screen.getByText('Orders left in Orders Pending To Assign will each be moved to a new shipment of their own when you approve it.')).toBeTruthy() // DEC-205
  // The confirm stacks ABOVE the routing modal — both still in the DOM.
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove).toHaveBeenCalledTimes(1)
  expect(onApprove.mock.calls[0][1]).toEqual([])                                     // externalOrders — nothing added
})

it('Approve Shipment Change confirm — Cancel closes the confirm only, routing modal stays open', () => {
  const { onApprove } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Approve Changes' }))
  const dialog = screen.getByRole('dialog', { name: 'Approve Shipment Change' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText('Approve Shipment Change')).toBeNull()
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  expect(onApprove).not.toHaveBeenCalled()
})

it('Keep Editing closes the routing modal with state intact', () => {
  setup()
  edit()
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]) // dirty the sandbox
  save()
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Keep Editing' }))
  expect(screen.queryByRole('dialog', { name: 'View Routing' })).toBeNull()
  // "state intact" — the pended order is still off its stop (Add order A still
  // offered in the pending column, which shows in edit mode only).
  expect(screen.queryByRole('button', { name: 'Add order A' })).toBeNull()
  edit()
  expect(screen.getByRole('button', { name: 'Add order A' })).toBeTruthy()
})

it('there is no separate View Routing button', () => {
  setup()
  expect(screen.queryByRole('button', { name: 'View Routing' })).toBeNull()
})

it('Evaluate is gated on isRoutable, with a tooltip naming routeBlocker\'s reason; T1 (S160) removed the routed gate', () => {
  // Bug fix (S160 follow-up) — a location-changed order's OWN shipFrom must
  // already carry the relocated site (buildConsolidationChange's B3b(c)
  // rewrite, real data) for initSandbox to create the P? this test needs.
  const relocatedOrders = orders.map((o) => (o.orderNumber === 'C' ? { ...o, shipFrom: { ...o.shipFrom, location: 'Q, Burg' } } : o))
  const { rerender } = render(
    <EditStopsView stops={baseStops} consolidation={locChange} orders={relocatedOrders} orderChange={orderChange} summary={summary} onApprove={() => {}} onCancel={() => {}} />,
  )
  const evaluateBtn = screen.getByRole('button', { name: 'Evaluate' })
  expect(evaluateBtn.disabled).toBe(true)
  fireEvent.mouseEnter(evaluateBtn.closest('[data-tooltip-trigger]'))
  expect(screen.getByRole('tooltip').textContent).toContain('Place every P? / D? stop first')
  cleanup()
  setup()
  // Routable — Evaluate opens the modal, no tooltip needed.
  const enabled = screen.getByRole('button', { name: 'Evaluate' })
  expect(enabled.disabled).toBe(false)
  fireEvent.click(enabled)
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
})

it('an undated (sequenced) stop disables Evaluate with the "Set a date, time and time zone" tooltip (C16)', () => {
  const relocatedOrders = orders.map((o) => (o.orderNumber === 'C' ? { ...o, shipFrom: { ...o.shipFrom, location: 'Q, Burg' } } : o))
  render(
    <EditStopsView stops={baseStops} consolidation={locChange} orders={relocatedOrders} orderChange={orderChange} summary={summary} onApprove={() => {}} onCancel={() => {}} />,
  )
  // Sequence the P? via "Keep here" — still undated, so Evaluate stays disabled with the OTHER reason.
  fireEvent.click(nw().getByRole('button', { name: 'Keep here' }))
  const evaluateBtn = screen.getByRole('button', { name: 'Evaluate' })
  expect(evaluateBtn.disabled).toBe(true)
  fireEvent.mouseEnter(evaluateBtn.closest('[data-tooltip-trigger]'))
  expect(screen.getByRole('tooltip').textContent).toContain('Set a date, time and time zone on every stop')
})

// C7 (LINX-15669) — a delivery-before-pickup order holds Evaluate and the
// tooltip names it.
it('a delivery-before-pickup order disables Evaluate with the sequence tooltip naming the order', () => {
  setup({ stops: [baseStops[0], baseStops[2], baseStops[1]] }) // D(A,B,C) above P(C)
  const evaluateBtn = screen.getByRole('button', { name: 'Evaluate' })
  expect(evaluateBtn.disabled).toBe(true)
  fireEvent.mouseEnter(evaluateBtn.closest('[data-tooltip-trigger]'))
  expect(screen.getByRole('tooltip').textContent).toContain('Order C is delivered before it is picked up. Move its pickup stop above its delivery stop.')
})

it('Evaluate stays disabled while saving even once routable, with no tooltip', () => {
  setup({ saving: true })
  const evaluateBtn = screen.getByRole('button', { name: 'Evaluate' })
  expect(evaluateBtn.disabled).toBe(true)
  expect(evaluateBtn.closest('[data-tooltip-trigger]')).toBeNull()
})

it('"Keep here" appears only on an unsequenced (P?/D?) stop in the New timeline, sequences it without moving, and is gone once sequenced', () => {
  const relocatedOrders = orders.map((o) => (o.orderNumber === 'C' ? { ...o, shipFrom: { ...o.shipFrom, location: 'Q, Burg' } } : o))
  setup({ consolidation: locChange, orders: relocatedOrders })
  expect(within(screen.getByRole('region', { name: 'Prior plan' })).queryByRole('button', { name: 'Keep here' })).toBeNull()
  const keepHere = nw().getByRole('button', { name: 'Keep here' })
  const before = nw().getAllByText(atLoc(/^Y, Town$|^Q, Burg$/)).map((el) => el.dataset.location)
  fireEvent.click(keepHere)
  expect(nw().queryByRole('button', { name: 'Keep here' })).toBeNull()
  // Still on its own P? location — sequenced in place, not moved elsewhere.
  expect(nw().getAllByText(atLoc(/^Y, Town$|^Q, Burg$/)).map((el) => el.dataset.location)).toEqual(before)
})

it('the Prior column shows the relocated order at its ORIGINAL stop, never the P? the New column creates (T1.1/T2)', () => {
  const relocatedOrders = orders.map((o) => (o.orderNumber === 'C' ? { ...o, shipFrom: { ...o.shipFrom, location: 'Q, Burg' } } : o))
  setup({ consolidation: locChange, orders: relocatedOrders })
  const prior = screen.getByRole('region', { name: 'Prior plan' })
  expect(within(prior).getByText(atLoc('Y, Town'))).toBeTruthy()       // C's original pickup, untouched
  expect(within(prior).queryByText(atLoc('Q, Burg'))).toBeNull()       // never the relocated site
  expect(nw().getByText('P?')).toBeTruthy()                     // New shows the relocation as an unsequenced P?
})

it('Prior and New render side by side; Prior is read-only and badges the planner\'s edits gray (DEC-197)', () => {
  setup()
  const prior = screen.getByRole('region', { name: 'Prior plan' })
  expect(screen.getByRole('region', { name: 'New plan' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Prior' })).toBeNull()             // no toggle
  expect(within(prior).queryByRole('button', { name: 'Remove' })).toBeNull()
  expect(within(prior).queryByRole('button', { name: 'Move stop up' })).toBeNull()
  // Stop 2 (P2) holds only order C — setting it aside empties and removes the stop.
  edit()
  fireEvent.click(within(screen.getByRole('region', { name: 'New plan' })).getAllByRole('button', { name: 'Remove' })[2])
  fireEvent.click(screen.getByRole('button', { name: 'Show prior plan' }))   // S164 F1
  expect(within(prior).getByText('Removed').style.background).toContain('badge-gray-bg')
})

it('Approve Changes calls onApprove with toDto rows; Cancel calls onCancel when clean and opens Discard when dirty', () => {
  const { onApprove, onCancel } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Approve Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove).toHaveBeenCalledTimes(1)
  expect(onApprove.mock.calls[0][0][0]).toHaveProperty('stopSequence', 1)

  cleanup()
  const clean = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(clean.onCancel).toHaveBeenCalledTimes(1)

  cleanup()
  const dirty = setup()
  edit()
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByText('Discard changes?')).toBeTruthy()
  expect(dirty.onCancel).not.toHaveBeenCalled()
})

it('a saveError shows inside the open routing modal; while saving the modal footer shows Approving… (LINX-15872)', () => {
  const { rerender } = render(
    <EditStopsView stops={baseStops} consolidation={noChange} orders={orders} orderChange={orderChange} summary={summary} onApprove={() => {}} onCancel={() => {}} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  // A save started (and failed) while the modal was open — planner never left this screen.
  rerender(
    <EditStopsView stops={baseStops} consolidation={noChange} orders={orders} orderChange={orderChange} summary={summary} onApprove={() => {}} onCancel={() => {}} saveError="Could not save. Try again." />,
  )
  expect(screen.getByRole('dialog', { name: 'View Routing' })).toBeTruthy()
  expect(screen.getByText('Could not save. Try again.')).toBeTruthy()
  rerender(
    <EditStopsView stops={baseStops} consolidation={noChange} orders={orders} orderChange={orderChange} summary={summary} onApprove={() => {}} onCancel={() => {}} saving />,
  )
  const primary = screen.getByRole('button', { name: 'Approving…' })
  expect(primary.disabled).toBe(true)
})

it('Add New Order opens the modal; added orders land in pending with Add; a placed external order rides Approve as externalOrders', async () => {
  const { onApprove } = setup({ sellShipment: '9', customerId: 'ERCO', customerName: 'Erco' })
  // Pend C first (as the other Add-to test does) so P1 (A, B) is the only
  // pickup stop left — isolates the "17 LB" total to A(5)+B(5)+E(7) below.
  edit()
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[2])
  fireEvent.click(screen.getByRole('button', { name: 'Add New Order' }))         // pending lives in edit mode
  fireEvent.click(screen.getByText('mock-add'))
  expect(await screen.findByRole('button', { name: 'E' })).toBeTruthy()          // pending row link
  fireEvent.click(screen.getByRole('button', { name: 'Add order E' }))            // auto: P1 (X, City)
  save()
  expect(newStop(0).textContent).toContain('E')
  expect(screen.getAllByText('17 LB').length).toBeGreaterThan(0)   // header metrics + strip                                  // 5+5+7 — external order counts in totals
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Approve Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove.mock.calls[0][1]).toEqual([{ orderNumber: 'E', sourceSellShipment: '77' }])
})

it('a rejecting getSellShipmentDetail surfaces an Alert instead of an unhandled rejection; nothing lands in pending', async () => {
  getSellShipmentDetail.mockRejectedValueOnce(new Error('network down'))
  setup({ sellShipment: '9', customerId: 'ERCO', customerName: 'Erco' })
  edit()
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

// C17 (LINX-15667 §3) — the street address sits under the location, both sides.
it('renders each stop\'s street address, on Prior and New', () => {
  setup({ stops: [stop({ stopNumber: 1, orderIds: ['A', 'B', 'C'], address: '831 8th Street' }), baseStops[2]] })
  expect(within(screen.getByRole('region', { name: 'Prior plan' })).getByText('831 8th Street')).toBeTruthy()
  expect(nw().getByText('831 8th Street')).toBeTruthy()
})

// C23 — a DST stamp round-trips: it opens on its zone (the list's standard
// option), saves unchanged when untouched, and a picked zone is stamped as
// that zone's abbreviation ON the stop's date, never an hour off.
it('a PDT-stamped stop opens on Pacific and saves unchanged when nothing is edited', () => {
  const pdt = [stop({ stopNumber: 1, orderIds: ['A', 'B', 'C'], date: 'June 4, 2026 08:00 PDT' }), stop({ type: 'delivery', stopNumber: 3, orderIds: ['A', 'B', 'C'], location: 'Z, Ville', date: 'June 6, 2026 08:00 PDT' })]
  const { onApprove } = setup({ stops: pdt })
  edit()
  expect(document.getElementById('stop-s1-tz').value).toBe('PST')
  save()
  fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Approve Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove.mock.calls[0][0].map((r) => r.scheduledDateTime)).toEqual(['June 4, 2026 08:00 PDT', 'June 6, 2026 08:00 PDT'])
})
it('zoneOn: re-picking the shown zone keeps the stamp; another zone takes its DST-correct abbreviation for the date', () => {
  const june = { y: 2026, mo: 5, d: 4, h: 8, mi: 0, tz: 'PDT' }
  expect(zoneOn('PST', june)).toBe('PDT')
  expect(zoneOn('CST', june)).toBe('CDT')
  expect(zoneOn('CST', { ...june, mo: 0, tz: 'PST' })).toBe('CST')
  expect(zoneOn('HST', june)).toBe('HST')
})

it('the New plan edits a stop date; a date outside an order window flags that order, never blocks (DEC-199)', () => {
  setup({ orders: orders.map((o) => ({ ...o, earliestPickup: '06/04/2026 06:00 CDT', latestPickup: '06/04/2026 10:00 CDT' })) })
  const newPlan = nw()
  expect(newPlan.queryByText('Outside planning window')).toBeNull()
  expect(within(screen.getByRole('region', { name: 'Prior plan' })).queryByLabelText('Pickup Date')).toBeNull() // Prior read-only
  edit()
  const input = document.getElementById('stop-s1-time')
  fireEvent.change(input, { target: { value: '11:30' } })
  fireEvent.blur(input)
  expect(nw().getAllByText('Outside planning window').length).toBe(2)               // A and B on stop 1
  save()
  // T1 (S160): the `routed` gate is gone — a window violation is flagged, never
  // blocked, and every stop still carries a date, so Evaluate stays enabled.
  expect(screen.getByRole('button', { name: 'Evaluate' }).disabled).toBe(false)
})

it('marks what an action touched so it pulses where it landed — but a moved stop doesn\'t pulse (users 2026-09-24 / 09-29)', () => {
  setup()
  edit()
  fireEvent.click(nw().getAllByRole('button', { name: 'Move stop down' })[0])
  expect(newStop(1).hasAttribute('data-flash')).toBe(false)  // moved P1, now second: slides, no pulse
  fireEvent.click(nw().getAllByRole('button', { name: 'Remove' })[0])
  const pendingRow = screen.getByRole('button', { name: /^Add order / }).closest('.edit-stops__pending-row')
  expect(pendingRow.hasAttribute('data-flash')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /^Add order / }))
  expect(document.querySelectorAll('.edit-stops__order-row[data-flash]').length).toBeGreaterThan(0)
})

describe('New plan modes (user 2026-09-28)', () => {
  it('collapsed: grip + read-only dates, no arrows / pickers / Remove; Edit swaps in Reset / Discard / Save and icon-Button arrows', () => {
    setup()
    expect(nw().queryByRole('button', { name: 'Move stop up' })).toBeNull()
    expect(nw().queryByRole('button', { name: 'Remove' })).toBeNull()
    expect(document.getElementById('stop-s1-date')).toBeNull()
    expect(newStop(0).textContent).toContain('Pickup Date: June 4, 2026 08:00 CDT')
    expect(newStop(0).getAttribute('aria-roledescription')).toBe('sortable')
    expect(newStop(0).querySelector('.edit-stops__stop-grip')).toBeTruthy()
    expect(nw().queryByRole('button', { name: 'Save' })).toBeNull()
    edit()
    expect(nw().queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(nw().getByRole('button', { name: 'Reset' }).disabled).toBe(true) // nothing differs from the page's opening state
    expect(nw().getByRole('button', { name: 'Discard' })).toBeTruthy()
    expect(nw().getByRole('button', { name: 'Save' })).toBeTruthy()
    const up = nw().getAllByRole('button', { name: 'Move stop up' })[0]
    expect(up.className).toContain('btn--icon')
    expect(up.closest('.edit-stops__stop-arrows')).toBeTruthy()   // F4: always visible in edit mode, no hover needed
    expect(newStop(0).getAttribute('aria-roledescription')).toBeNull()      // no drag in edit mode
    expect(newStop(0).querySelector('.edit-stops__stop-grip')).toBeNull()
    expect(document.getElementById('stop-s1-date')).toBeTruthy()
    expect(screen.getByText(/^Use the arrows to move a stop with all its orders, set dates, or remove orders\./)).toBeTruthy()
  })

  it('Evaluate is disabled while editing, with the "Save or discard" tooltip; Save re-enables it and keeps the edit', () => {
    setup()
    edit()
    fireEvent.click(nw().getAllByRole('button', { name: 'Move stop down' })[0])
    const evaluateBtn = screen.getByRole('button', { name: 'Evaluate' })
    expect(evaluateBtn.disabled).toBe(true)
    fireEvent.mouseEnter(evaluateBtn.closest('[data-tooltip-trigger]'))
    expect(screen.getByRole('tooltip').textContent).toContain('Save or discard your stop edits first')
    save()
    expect(screen.getByRole('button', { name: 'Evaluate' }).disabled).toBe(false)
    expect(newStop(0).textContent).toContain('Y, Town')                      // the move survived Save
    expect(nw().getByRole('button', { name: 'Edit' })).toBeTruthy()
  })

  it('Discard reverts to the state when Edit was pressed (confirm only if changed); Reset goes back to the page\'s opening state', () => {
    setup()
    // Nothing changed → Discard leaves edit mode without a confirm.
    edit()
    fireEvent.click(nw().getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('Discard Stop Changes')).toBeNull()
    expect(nw().getByRole('button', { name: 'Edit' })).toBeTruthy()
    // Saved move, then an unsaved one: Discard drops only the unsaved one.
    edit()
    fireEvent.click(nw().getAllByRole('button', { name: 'Move stop down' })[0]) // [Y, X, Z]
    save()
    edit()
    fireEvent.click(nw().getAllByRole('button', { name: 'Remove' })[0])
    fireEvent.click(nw().getByRole('button', { name: 'Discard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Discard' }))
    expect(newStop(0).textContent).toContain('Y, Town')
    expect(screen.queryByRole('button', { name: /^Add order / })).toBeNull()
    // Reset undoes the saved move too, after its confirm.
    edit()
    fireEvent.click(nw().getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Reset Stop Sequence')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }))
    expect(newStop(0).textContent).toContain('X, City')
    expect(nw().getByRole('button', { name: 'Edit' })).toBeTruthy()
  })
})

it('the leg distance shows only over a stop\'s rail (badge + line), for the line it draws; the last stop has none (user 2026-09-28)', () => {
  const located = baseStops.map((s, i) => ({ ...s, lat: 40 + i, lng: -90 }))
  const leg1 = legDistances(located).legs[1]
  setup({ stops: located })
  const railOf = (el) => el.closest('.odyssey-timeline__row').querySelector('.odyssey-timeline__rail')
  const newPlan = screen.getByRole('region', { name: 'New plan' })
  // Over the stop's content: nothing.
  fireEvent.mouseMove(newStop(0))
  expect(screen.queryByRole('tooltip')).toBeNull()
  // Over stop 1's rail: the leg its line draws, to stop 2.
  fireEvent.mouseMove(railOf(newStop(0)), { clientY: 120 })
  const tip = screen.getByRole('tooltip')
  expect(tip.textContent).toBe(`Distance from P1 to P2${leg1.toFixed(2)} mi`)
  expect(tip.parentElement.style.pointerEvents).toBe('none')
  expect(newStop(0).hasAttribute('data-leg-tip')).toBe(true)          // its own segment darkens (CSS :has)
  expect(newStop(1).hasAttribute('data-leg-tip')).toBe(false)
  // Back onto content → hidden; the last stop's rail has no line → none.
  fireEvent.mouseMove(newStop(0))
  expect(screen.queryByRole('tooltip')).toBeNull()
  const last = newPlan.querySelectorAll('[data-stop-key]').length - 1
  fireEvent.mouseMove(railOf(newStop(last)))
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.mouseMove(railOf(newStop(0)))
  fireEvent.mouseLeave(newPlan)
  expect(screen.queryByRole('tooltip')).toBeNull()
  // Prior rails carry it too.
  const priorRow = screen.getByRole('region', { name: 'Prior plan' }).querySelectorAll('[data-stop-key]')[1]
  fireEvent.mouseMove(railOf(priorRow))
  expect(screen.getByRole('tooltip').textContent).toContain('Distance from')
})

// ── S164 (Jana 09-29 layout slice) ───────────────────────────────────────
const prior = () => screen.getByRole('region', { name: 'Prior plan' })
const strip = () => within(document.querySelector('.stops-kpi-strip'))
const summaryFull = { distance: '364.14 mi', grossWeight: '1,015 LB', volume: '3 cuft', acceptedCarrier: 'ACME', seedEquipment: 'Dry Van', utilization: '80%' }

it('F1: Edit collapses Prior to a marker rail; the chevron toggles it; Save re-expands', () => {
  setup()
  expect(prior().querySelector('.edit-stops__plan--collapsed')).toBeNull()
  expect(within(prior()).queryByRole('button', { name: 'Hide prior plan' })).toBeNull()   // not editing: always open
  edit()
  expect(prior().className).toContain('edit-stops__plan--collapsed')
  const show = within(prior()).getByRole('button', { name: 'Show prior plan' })
  expect(show.getAttribute('aria-expanded')).toBe('false')
  // markers only: no addresses, order ids, or dates
  expect(within(prior()).getAllByLabelText(/^[PD]\d — completed$/)).toHaveLength(3)
  expect(within(prior()).queryByText('Orders:')).toBeNull()
  expect(prior().querySelector('.edit-stops__stop-location')).toBeNull()
  fireEvent.click(show)
  const hide = within(prior()).getByRole('button', { name: 'Hide prior plan' })
  expect(hide.getAttribute('aria-expanded')).toBe('true')
  expect(within(prior()).getAllByText('Orders:')).toHaveLength(3)
  fireEvent.click(hide)
  expect(prior().className).toContain('edit-stops__plan--collapsed')
  save()
  expect(prior().className).not.toContain('edit-stops__plan--collapsed')
})

it('F1: Discard and Reset re-expand Prior', () => {
  setup()
  edit()
  fireEvent.click(nw().getByRole('button', { name: 'Discard' }))   // clean: leaves directly
  expect(prior().className).not.toContain('edit-stops__plan--collapsed')
  edit()
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
  fireEvent.click(nw().getByRole('button', { name: 'Reset' }))
  fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }))
  expect(prior().className).not.toContain('edit-stops__plan--collapsed')
})

it('F1: collapsed rail signals Removed (struck) on a removed stop', () => {
  setup()
  edit()
  fireEvent.click(within(screen.getByRole('region', { name: 'New plan' })).getAllByRole('button', { name: 'Remove' })[2])
  expect(within(prior()).getByLabelText('P2, Y, Town, June 4, 2026 08:00 CDT, Removed')).toBeTruthy()
  expect(prior().querySelector('.edit-stops__badge--removed')).toBeTruthy()
})

const STRIP = ['Distance', 'Gross Weight', 'Volume', 'Prior Cost', 'New Direct Cost']
const HEAD = ['New Consolidated Cost', 'Accepted Carrier', 'Seed Equipment', 'Utilization']

it('F2: strip = exactly Distance/Gross Weight/Volume/Prior Cost/New Direct Cost, in order, in both states; costs identical', () => {
  setup({ summary: summaryFull })
  const region = () => screen.getByLabelText('Shipment KPIs')
  const costs = []
  for (const collapsed of [false, true]) {
    if (collapsed) edit()
    const txt = region().textContent
    const idx = STRIP.map((t) => txt.indexOf(t))
    expect(idx.every((i) => i >= 0)).toBe(true)
    expect([...idx].sort((x, y) => x - y)).toEqual(idx)
    for (const t of HEAD) expect(strip().queryByText(t)).toBeNull()
    expect(strip().getByText('$1,000.00')).toBeTruthy()
    expect(strip().getByText('$1,100.00')).toBeTruthy()
    costs.push(strip().getByText('$1,000.00').closest('div').textContent)
  }
  expect(costs[0]).toBe(costs[1])
  // live: removing an order changes the weight (A = 5 LB, of 1,015 LB)
  const before = strip().getByText(/LB$/).textContent
  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
  expect(strip().getByText(/LB$/).textContent).not.toBe(before)
})

it('F2: All Stops shows exactly the 4 fields left of View Planning Dates, none of the strip\'s; no label in both', () => {
  setup({ summary: summaryFull })
  const head = document.querySelector('.edit-stops__head')
  const metrics = head.querySelector('.edit-stops__metrics')
  const link = within(head).getByRole('button', { name: 'View Planning Dates' })
  for (const t of HEAD) expect(within(metrics).getByText(t)).toBeTruthy()
  for (const t of STRIP) expect(within(metrics).queryByText(t)).toBeNull()
  expect(metrics.children).toHaveLength(4)
  for (const t of STRIP) expect(screen.getAllByText(t)).toHaveLength(1)   // strip only
  for (const t of HEAD) expect(screen.getAllByText(t)).toHaveLength(1)    // header only
  expect(within(metrics).getByText('ACME')).toBeTruthy()
  // metrics precede the link in DOM order (lead side)
  expect(metrics.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(link)
  expect(screen.getByText('Planned Pickup')).toBeTruthy()
  expect(screen.getByText('Planned Delivery')).toBeTruthy()
})

it('F2: All Stops shows -- for a missing summary field', () => {
  setup()
  const m = within(document.querySelector('.edit-stops__metrics'))
  expect(m.getByText('Utilization').parentElement.textContent).toContain('--')
})

it('F2: an expanded changed value shows the Prior/New pair; collapsed shows the current value only', () => {
  setup({ summary: summaryFull, consolidation: { ...noChange, summaryChanges: { grossWeight: { prior: '999 LB', new: '1,015 LB' } } } })
  expect(strip().getByText('999 LB')).toBeTruthy()
  edit()
  expect(strip().queryByText('999 LB')).toBeNull()
})

it('F3/F7: one decorative info icon per segment in New, expanded Prior and collapsed Prior, beside (not on) the rail', () => {
  setup()
  const icons = (root) => root.querySelectorAll('.edit-stops__leg-icon')
  expect(icons(prior())).toHaveLength(2)
  expect(icons(screen.getByRole('region', { name: 'New plan' }))).toHaveLength(2)
  expect(icons(prior())[0].getAttribute('aria-hidden')).toBe('true')
  edit()
  expect(icons(prior())).toHaveLength(2)
  expect(icons(screen.getByRole('region', { name: 'New plan' }))).toHaveLength(2)
  // never inside the rail element that draws the line
  document.querySelectorAll('.edit-stops__leg-icon').forEach((i) => expect(i.closest('.odyssey-timeline__rail')).toBeNull())
})

it('hovering a leg Info icon shows that leg\'s distance tooltip; its icon hides, the tooltip carries the info badge, leave restores (user 2026-09-29)', () => {
  const located = baseStops.map((s, i) => ({ ...s, lat: 40 + i, lng: -90 }))
  setup({ stops: located })
  const newPlan = screen.getByRole('region', { name: 'New plan' })
  const icons = () => [...newPlan.querySelectorAll('.edit-stops__leg-icon')]
  fireEvent.mouseMove(icons()[0], { clientY: 120 })
  const tip = screen.getByRole('tooltip')
  expect(tip.textContent).toContain('Distance from P1 to P2')
  expect(tip.querySelector('svg')).toBeTruthy()                       // info badge icon
  expect(icons()[0].hasAttribute('data-tipped')).toBe(true)
  expect(icons()[1].hasAttribute('data-tipped')).toBe(false)
  expect(icons()[0].getAttribute('aria-hidden')).toBe('true')
  fireEvent.mouseLeave(newPlan)
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(icons()[0].hasAttribute('data-tipped')).toBe(false)
})

it('F7: a gap element sits between the KPI strip and the All Stops panel', () => {
  setup()
  const gap = document.querySelector('.edit-stops__strip-gap')
  expect(gap).toBeTruthy()
  expect(gap.nextElementSibling.textContent).toContain('All Stops')
})

it('F7/F8: collapsed Prior: UnfoldHorizontal expand icon, same header font as expanded, leg tooltip on a segment', () => {
  setup()
  const titleOf = () => within(prior()).getByRole('heading', { name: 'Prior' })
  const expandedClass = titleOf().className
  edit()
  expect(titleOf().className).toBe(expandedClass)
  expect(titleOf().className).toContain('text-label-base-semibold')
  const show = within(prior()).getByRole('button', { name: 'Show prior plan' })
  expect(show.querySelector('.lucide-unfold-horizontal')).toBeTruthy()
  // hovering the first segment shows Prior's leg distance (existing showRailTip)
  const seg = prior().querySelector('.odyssey-timeline__rail')
  fireEvent.mouseMove(seg, { clientY: 100 })
  expect(screen.getByRole('tooltip').textContent).toContain('Distance from P1 to P2')
  fireEvent.mouseLeave(prior())
  expect(screen.queryByRole('tooltip')).toBeNull()
  // the last marker has no segment, so no tooltip
  const rails = prior().querySelectorAll('.odyssey-timeline__rail')
  fireEvent.mouseMove(rails[rails.length - 1])
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('F7: Prior line darkens while its leg tooltip shows — expanded and collapsed, segment or Info icon', () => {
  setup()
  const tipped = () => [...prior().querySelectorAll('[data-leg-tip]')]
  const check = () => {
    expect(tipped()).toHaveLength(0)
    fireEvent.mouseMove(prior().querySelector('.odyssey-timeline__rail'), { clientY: 100 })
    expect(tipped()).toHaveLength(1)
    // the tipped element sits in the row whose own segment the rule darkens
    expect(tipped()[0].closest('.odyssey-timeline__row').querySelector('.odyssey-timeline__segment--full')).toBeTruthy()
    fireEvent.mouseLeave(prior())
    expect(tipped()).toHaveLength(0)
    // opened via the leg Info icon instead
    fireEvent.mouseMove(prior().querySelector('.edit-stops__leg-icon'), { clientY: 100 })
    expect(tipped()).toHaveLength(1)
    fireEvent.mouseLeave(prior())
    expect(tipped()).toHaveLength(0)
  }
  check() // expanded
  edit()
  expect(prior().querySelector('.edit-stops__rail--markers')).toBeTruthy()
  check() // collapsed
  // Prior's segment is covered by the completed FILL, so the rule targets the fill, in neutral-700 (New's tipped tone)
  const rule = editStopsCss.match(/:has\(\[data-leg-tip\]\) > \.odyssey-timeline__rail \.odyssey-timeline__segment--full \.odyssey-timeline__segment-fill \{[^}]*\}/)[0]
  expect(rule).toContain('var(--deep-sea-neutral-700)')
})

it('F8: expanded Prior collapse button is FoldHorizontal', () => {
  setup()
  edit()
  fireEvent.click(within(prior()).getByRole('button', { name: 'Show prior plan' }))
  const hide = within(prior()).getByRole('button', { name: 'Hide prior plan' })
  expect(hide.querySelector('.lucide-fold-horizontal')).toBeTruthy()
})

it('F8: collapsed Prior card is not sticky and has no footer-derived height', () => {
  const rule = editStopsCss.match(/\.edit-stops__prior-card--rail \{[^}]*\}/)[0]
  expect(rule).not.toMatch(/sticky|height:\s*calc|footer-h|scroll-h/)
  expect(editStopsCss).not.toMatch(/--edit-stops-footer-h|--edit-stops-scroll-h/)
})

it('F8: prior line = first-to-last marker centre on the ORIGINAL expanded Prior; Edit never overwrites it; rail CSS uses the var', () => {
  const orig = HTMLElement.prototype.getBoundingClientRect
  let mid = [100, 340]
  HTMLElement.prototype.getBoundingClientRect = function () {
    const badges = this.closest('.edit-stops__prior-card')?.querySelectorAll('.edit-stops__rail .stop-badge')
    const i = badges ? [...badges].indexOf(this) : -1
    const c = i === 0 ? mid[0] : i === badges?.length - 1 ? mid[1] : 0
    return { top: c - 10, height: 20, bottom: c + 10, left: 0, right: 0, width: 0 }
  }
  try {
    setup()
    const root = document.querySelector('.edit-stops')
    expect(root.style.getPropertyValue('--edit-stops-prior-line-h')).toBe('240px')
    mid = [10, 900]
    edit()
    expect(root.style.getPropertyValue('--edit-stops-prior-line-h')).toBe('240px')
  } finally {
    HTMLElement.prototype.getBoundingClientRect = orig
  }
  expect(editStopsCss).toMatch(/\.edit-stops__rail--markers \{[^}]*height:\s*calc\(var\(--edit-stops-prior-line-h\) \+ 20px\)/)
  expect(editStopsCss).not.toMatch(/prior-rail-h|prior-seg-h/)
})

it('F7: the info icon is offset to the LEFT of the line (translate -100%, negative left)', () => {
  const rule = editStopsCss.match(/\.edit-stops__leg-icon \{[^}]*\}/)[0]
  expect(rule).toMatch(/left: calc\(-1 \*/)
  expect(rule).toMatch(/translate\(-100%/)
  expect(rule).toMatch(/var\(--deep-sea-neutral-300\)/)
  setup()
  expect(document.querySelector('.edit-stops__leg-icon svg').getAttribute('width')).toBe('16')   // ICON_MD
})

it('F7: Prior\'s collapse motion is switched off under prefers-reduced-motion', () => {
  // the media block holds two rules, so match through its closing "}\n}"
  const block = editStopsCss.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\.edit-stops__plan--prior[\s\S]*?\n\}/)
  expect(block?.[0]).toMatch(/transition: none/)
  expect(block?.[0]).toMatch(/animation: none/)
})

it('F4: the move arrows render in edit mode without any hover, disabled ones included', () => {
  setup()
  edit()
  expect(nw().getAllByRole('button', { name: 'Move stop up' })).toHaveLength(3)
  expect(nw().getAllByRole('button', { name: 'Move stop down' })).toHaveLength(3)
  expect(nw().getAllByRole('button', { name: 'Move stop up' })[0].disabled).toBe(true)
})

it('F5: the Planning Dates modal shows the planned pickup and delivery dates', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'View Planning Dates' }))
  expect(screen.getAllByText('June 4, 2026 08:00 CDT').length).toBeGreaterThan(0)
  expect(screen.getAllByText('June 6, 2026 08:00 CDT').length).toBeGreaterThan(0)
})

describe('audit gaps (S164)', () => {
  const markOf = (label) => prior().querySelector(`.edit-stops__mark[aria-label^="${label},"]`)

  it('F1: collapsed Prior marks a MOVED stop with the gray dot; the marker tooltip reads location · date · Moved', () => {
    setup()
    edit()
    fireEvent.click(nw().getAllByRole('button', { name: 'Move stop up' })[1]) // P2 over P1
    expect(prior().querySelectorAll('.edit-stops__mark-dot').length).toBeGreaterThan(0)
    const moved = prior().querySelector('.edit-stops__mark:has(.edit-stops__mark-dot)')
    expect(moved.getAttribute('aria-label')).toMatch(/, Moved$/)
    fireEvent.mouseEnter(moved.closest('[data-tooltip-trigger]'))
    const tip = screen.getByRole('tooltip').textContent
    expect(tip).toContain('Moved')
    expect(tip).toContain(' · June 4, 2026 08:00 CDT')
  })

  it('F1: the marker tooltip on a removed stop reads Removed', () => {
    setup()
    edit()
    fireEvent.click(nw().getAllByRole('button', { name: 'Remove' })[2])
    const removed = markOf('P2')
    fireEvent.mouseEnter(removed.closest('[data-tooltip-trigger]'))
    const tip = screen.getByRole('tooltip').textContent
    expect(tip).toContain('P2 · Removed')
    expect(tip).toContain('Y, Town · June 4, 2026 08:00 CDT')
  })

  it('the last remaining order cannot be removed: disabled Remove carries the tooltip copy', () => {
    const one = [stop({ orderIds: ['A'] }), stop({ type: 'delivery', stopNumber: 2, orderIds: ['A'], location: 'Z, Ville', date: 'June 6, 2026 08:00 CDT' })]
    setup({ stops: one, orders: [orders[0]] })
    edit()
    const btn = nw().getAllByRole('button', { name: 'Remove' })[0]
    expect(btn.disabled).toBe(true)
    fireEvent.mouseEnter(btn.closest('[data-tooltip-trigger]'))
    expect(screen.getByRole('tooltip').textContent).toContain('The last remaining order cannot be removed from the shipment.')
  })

  it('the fold / unfold buttons are secondary + sm', () => {
    setup()
    edit() // Prior collapses on Edit (DEC-225)
    const show = within(prior()).getByRole('button', { name: 'Show prior plan' })
    expect(show.className).toMatch(/btn--secondary/)
    expect(show.className).toMatch(/btn--sm/)
    fireEvent.click(show)
    const hide = within(prior()).getByRole('button', { name: 'Hide prior plan' })
    expect(hide.className).toMatch(/btn--secondary/)
    expect(hide.className).toMatch(/btn--sm/)
  })
})

// CNS-19 — consolidation hosts the same editor from New, with no Prior (S5).
describe('EditStopsView — consolidation props (no Prior)', () => {
  const src = (sell, list) => ({ row: { sellShipment: sell }, detail: { stopsData: { stops: list } } })
  const sources = [
    src('111', [stop({ stopNumber: 1, orderIds: ['A'], siteKey: 'S1' }), stop({ type: 'delivery', stopNumber: 2, orderIds: ['A'], siteKey: 'S9', location: 'Z, Ville', date: 'June 6, 2026 08:00 CDT' })]),
    src('222', [stop({ stopNumber: 1, orderIds: ['B'], siteKey: 'S1' }), stop({ type: 'delivery', stopNumber: 2, orderIds: ['B'], siteKey: 'S8', location: 'W, Burg', date: 'June 7, 2026 08:00 CDT' })]),
  ]
  const tenderList = [{ rank: 1, scac: 'ODFL', status: '', pickupDateTime: '', rateDetails: { baseRate: 100, additionalCharges: [], currency: 'USD' } }]
  const consol = (over = {}) => {
    const onApprove = vi.fn()
    render(
      <EditStopsView
        initial={initFromSources(sources)}
        orders={orders.slice(0, 2)}
        tenderList={tenderList}
        summary={{ headerDistance: '100.00 mi', seedEquipment: 'TL' }}
        equipmentCode="TL"
        showPrior={false}
        minOrders={2}
        confirmApprove={false}
        approveLabel="Apply Consolidation"
        onApprove={onApprove}
        onCancel={() => {}}
        sellShipment="111"
        {...over}
      />,
    )
    return { onApprove }
  }

  it('carries the no-prior modifier (room for the leg tooltip); order change does not', () => {
    consol()
    expect(document.querySelector('.edit-stops').classList.contains('edit-stops--no-prior')).toBe(true)
    cleanup()
    setup()
    expect(document.querySelector('.edit-stops').classList.contains('edit-stops--no-prior')).toBe(false)
  })

  it('no purple in a consolidation: green type badges and rail markers; order change keeps purple', () => {
    consol()
    const plan = screen.getByRole('region', { name: 'New plan' })
    expect(plan.querySelector('.stop-badge--changed')).toBeNull()
    expect(plan.querySelector('.stop-badge--completed')).toBeTruthy()
    for (const b of within(plan).getAllByText('Pickup')) expect(b.style.background).toContain('badge-green-bg')
    expect(document.querySelector('.stops-kpi-strip .badge, .stops-kpi__pair')).toBeNull()
    cleanup()
    setup()
    const oc = screen.getByRole('region', { name: 'New plan' })
    expect(oc.querySelector('.stop-badge--changed')).toBeTruthy()
    expect(within(oc).getAllByText('Pickup')[0].style.background).toContain('badge-purple-bg')
  })

  it('has no Prior panel, and Edit shows no prior-collapse controls', () => {
    consol()
    expect(screen.queryByRole('region', { name: 'Prior plan' })).toBeNull()
    edit()
    expect(screen.queryByRole('button', { name: /prior plan/i })).toBeNull()
    expect(screen.getByRole('region', { name: 'New plan' })).toBeTruthy()
  })

  it('the strip holds Distance, Gross Weight, Volume only; the All Stops row holds Consolidated Cost, Seed Equipment, Utilization', () => {
    consol()
    const strip = document.querySelector('.stops-kpi-strip')
    for (const l of ['Distance', 'Gross Weight', 'Volume']) expect(within(strip).getByText(l)).toBeTruthy()
    for (const l of ['Prior Cost', 'New Direct Cost', 'Accepted Carrier', 'New Consolidated Cost']) expect(screen.queryByText(l)).toBeNull()
    expect(within(strip).queryAllByText('Prior')).toHaveLength(0)
    for (const l of ['Consolidated Cost', 'Seed Equipment', 'Utilization']) expect(screen.getByText(l)).toBeTruthy()
    expect(screen.getByText(/% weight/)).toBeTruthy()
  })

  it('the merged pickup carries both orders; a move that would put a delivery above its pickup is refused (arrow disabled, LINX-15669)', () => {
    consol()
    edit()
    expect(newStop(0).textContent).toMatch(/A.*B|B.*A/)
    // P[A,B] moved down would sit below D(A) — refused, same rule as order change.
    expect(screen.getAllByRole('button', { name: 'Move stop down' })[0].disabled).toBe(true)
  })

  it('a dragged pickup dropped below its delivery is refused with the LINX-15669 message', () => {
    consol()
    act(() => window.__dragEnd({ active: { id: 'src:111:1' }, over: { id: 'src:222:2' } }))
    expect(screen.getByText('An order must be picked up before it can be delivered.')).toBeTruthy()
  })

  it('Remove is blocked at two orders', () => {
    consol()
    edit()
    const removes = nw().getAllByRole('button', { name: 'Remove' })
    expect(removes.length).toBeGreaterThan(0)
    for (const b of removes) expect(b.disabled).toBe(true)
  })

  it('the routing primary calls onApprove(dto, external, reroutedList) directly - no ConfirmDialog', () => {
    const { onApprove } = consol()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Apply Consolidation' }))
    expect(screen.queryByText('Approve Shipment Change')).toBeNull()
    expect(onApprove).toHaveBeenCalledTimes(1)
    const [dto, external, list] = onApprove.mock.calls[0]
    expect(dto.map((d) => d.sourceSellShipment)).toEqual(['111', '111', '222'])
    expect(external).toEqual([])
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ scac: 'ODFL', status: '' })
    expect(list[0].totalCostAmount).toBeGreaterThan(0)
  })

  it('the View Routing modal has no Prior table', () => {
    consol()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }))
    const modal = screen.getByRole('dialog', { name: 'View Routing' })
    expect(within(modal).getByText('New')).toBeTruthy()
    expect(within(modal).queryByText('Prior')).toBeNull()
  })

  it('actionsRef.removeOrders takes orders out of the consolidation (no stop, not in Pending); payload() reads the latest sandbox', () => {
    const actionsRef = { current: null }
    consol({ actionsRef })
    expect(actionsRef.current.payload().stops.flatMap((d) => d.orderIds).sort()).toEqual(['A', 'A', 'B', 'B'])
    act(() => actionsRef.current.removeOrders(['B']))
    expect(actionsRef.current.payload().stops.flatMap((d) => d.orderIds)).toEqual(['A', 'A'])
    edit()
    expect(screen.queryByRole('button', { name: 'Add order B' })).toBeNull()
  })
})

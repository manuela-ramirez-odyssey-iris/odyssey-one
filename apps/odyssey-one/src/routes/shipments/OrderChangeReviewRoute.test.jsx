// @vitest-environment jsdom
// Task 8 — Review Order Change route shell (LINX-14509…14515). Mocks the
// SERVICE layer (getSellShipmentDetail / resolveOrderChange), not the query
// hooks, so the real useQuery/useMutation wiring runs against a controlled
// fixture — same convention as RoutingGuideTab.test.jsx's saveTenderOption
// mock, which exists precisely so a persist regression can't hide behind a
// hand-rolled hook mock.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderChangeReviewRoute, { landingFor } from './OrderChangeReviewRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(),
  resolveOrderChange: vi.fn().mockResolvedValue(undefined),
}))
import { getSellShipmentDetail, resolveOrderChange } from '../../api/services/shipmentService'

const SELL_SHIPMENT = '25319141'
// The user-facing id (LINX-11591/12490) — distinct from SELL_SHIPMENT on
// purpose, so a test asserting the wrong one fails loudly instead of passing
// by coincidence (the bug this whole fix-round guards against).
const BUY_SHIPMENT = '87654321'

// Minimal-but-real OrderChangeVM shape (shipmentDetail.ts) — only `prior` is
// read by the shell (priorTenderStatus in the resolution payload); the rest
// exists so a future task's shape check against this fixture doesn't need a
// second one built from scratch.
const ORDER_CHANGE_DETAIL = {
  ratingStatus: '--',
  trackingUrl: '',
  orderDetails: [],
  stopsData: { summary: {}, stops: [] },
  productData: { orders: [] },
  routingData: { options: [] },
  droppedCarriers: [],
  orderChange: {
    scenario: 'returned',
    prior: {
      scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
      tenderStatus: 'Accepted', routeRank: 1, rank: 1,
      pickupDateTime: '2026-08-20T14:00:00Z', deliveryDateTime: '2026-08-22T09:00:00Z',
      apCost: 2790,
    },
    newOption: {
      scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'Van',
      tenderStatus: null, routeRank: 1, rank: 1,
      pickupDateTime: '2026-08-21T14:00:00Z', deliveryDateTime: '2026-08-23T09:00:00Z',
      apCost: 2950,
    },
    priorTenderList: [],
    newTenderList: [],
    comparison: [],
    hazmat: [],
    resolution: null,
  },
  costData: { planned: { summary: {}, orders: [] } },
  instructionsData: { orders: [] },
  userDefinedData: { orders: [] },
  documentsData: { documents: [] },
  notesData: { notes: [] },
  historyData: { entries: [] },
}

const NO_ORDER_CHANGE_DETAIL = { ...ORDER_CHANGE_DETAIL, orderChange: null }

// Task 11 — "not-returned" fixture (LINX-14513): the prior carrier did NOT
// come back from re-routing, so `newOption.apCost` is null. Everything else
// mirrors ORDER_CHANGE_DETAIL — same carrier, same prior side — only the
// re-routing outcome differs.
const NOT_RETURNED_DETAIL = {
  ...ORDER_CHANGE_DETAIL,
  orderChange: {
    ...ORDER_CHANGE_DETAIL.orderChange,
    scenario: 'not-returned',
    newOption: { ...ORDER_CHANGE_DETAIL.orderChange.newOption, apCost: null },
  },
}

// Task 11 — renders whatever lands at "/shipments" after a resolution.
// Defaults to the plain marker the existing tests already assert on;
// `shipmentsElement` lets a navigation test swap in a location probe instead
// of mocking useNavigate, per the task brief's preferred idiom.
function renderRoute(sellShipment = SELL_SHIPMENT, { buyShipment, shipmentsElement } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[{
              pathname: `/shipments/order-change/${sellShipment}`,
              state: buyShipment ? { buyShipment } : undefined,
            }]}>
              <Routes>
                <Route path="/shipments/order-change/:sellShipment" element={<OrderChangeReviewRoute />} />
                <Route path="/shipments" element={shipmentsElement ?? <div>shipments list</div>} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

// Task 11 — location probe for the navigation test: renders the exact
// `location.state` the route navigated with, so the assertion is on real
// router state rather than a mocked useNavigate call.
function LocationProbe() {
  const location = useLocation()
  return <div>landed with state: {JSON.stringify(location.state)}</div>
}

afterEach(() => {
  cleanup()
  getSellShipmentDetail.mockReset()
  resolveOrderChange.mockClear()
})

// S135 — every tender-resolution action is now behind a ConfirmDialog, so the
// button click only OPENS the dialog; the mutation fires on its confirm.
// Scoped with `within(dialog)` because two of the confirm labels intentionally
// match the page button that opened them.
function confirmAction(label) {
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }))
}

describe('OrderChangeReviewRoute', () => {
  test('renders the page title with the BUY shipment number when the row menu threaded it through nav state', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })
    expect(await screen.findByText(`Buy Shipment ${BUY_SHIPMENT}`)).toBeTruthy()
    // guards the exact bug this fix-round found: the sell id must never be
    // rendered under the "Buy Shipment" label.
    expect(screen.queryByText(`Buy Shipment ${SELL_SHIPMENT}`)).toBeNull()
  })

  test('degrades to "Shipment {sellShipment}" when nav state has no buy number (refresh / pasted URL)', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute() // no state — same as a hard refresh landing on the deep link
    expect(await screen.findByText(`Shipment ${SELL_SHIPMENT}`)).toBeTruthy()
    expect(screen.queryByText(/Buy Shipment/)).toBeNull()
  })

  test('renders the Cancel tender button', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()
    expect(await screen.findByRole('button', { name: 'Cancel tender' })).toBeTruthy()
  })

  test('Cancel tender calls the mutation with action cancel, cost null, and the prior tender status, then leaves the review screen', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel tender' }))
    confirmAction('Yes')

    await waitFor(() => {
      expect(resolveOrderChange).toHaveBeenCalledWith(SELL_SHIPMENT, {
        action: 'cancel',
        priorTenderStatus: 'Accepted',
        cost: null,
      })
    })
    expect(await screen.findByText('shipments list')).toBeTruthy()
  })

  test('a shipment with orderChange: null renders the empty state instead of crashing', async () => {
    getSellShipmentDetail.mockResolvedValue(NO_ORDER_CHANGE_DETAIL)
    renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })
    expect(await screen.findByText('No order change to review for this shipment.')).toBeTruthy()
    expect(screen.queryByRole('heading')).toBeNull()
  })

  test('renders a loading state while the detail query is in flight', () => {
    getSellShipmentDetail.mockReturnValue(new Promise(() => {})) // never resolves
    renderRoute()
    expect(screen.getByText('Loading order change…')).toBeTruthy()
  })

  test('renders an error state with retry when the detail query fails', async () => {
    getSellShipmentDetail.mockRejectedValue(new Error('boom'))
    renderRoute()
    expect(await screen.findByText('Something went wrong loading this shipment.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  // Task 11 — end-to-end resolution wiring (LINX-14513/14514). These drive
  // the actions card's own DOM (rendered inside the real route, not called
  // as a standalone component like OrderChangeActionsCard.test.jsx does) to
  // prove a click in the card actually reaches the mutation with the cost
  // selection the card computed, not a value re-derived in the test.
  test('Re tender on a returned scenario resolves with the pre-selected New Cost, untouched', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Re tender' }))
    confirmAction('Re tender')

    await waitFor(() => {
      expect(resolveOrderChange).toHaveBeenCalledWith(SELL_SHIPMENT, {
        action: 'retender',
        priorTenderStatus: 'Accepted',
        cost: { choice: 'new', amount: 2950 },
      })
    })
  })

  test('switching to Prior Cost then Bypass Tender resolves with the prior choice — proves the card selection reaches the route', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('radio', { name: 'Prior Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bypass Tender' }))
    confirmAction('Bypass Tender')

    await waitFor(() => {
      expect(resolveOrderChange).toHaveBeenCalledWith(SELL_SHIPMENT, {
        action: 'bypass',
        priorTenderStatus: 'Accepted',
        cost: { choice: 'prior', amount: 2790 },
      })
    })
  })

  test('Re tender on a not-returned scenario defaults to Prior Cost — the disabled New Cost path never emits an unusable selection', async () => {
    getSellShipmentDetail.mockResolvedValue(NOT_RETURNED_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Re tender' }))
    confirmAction('Re tender')

    await waitFor(() => {
      expect(resolveOrderChange).toHaveBeenCalledWith(SELL_SHIPMENT, {
        action: 'retender',
        priorTenderStatus: 'Accepted',
        cost: { choice: 'prior', amount: 2790 },
      })
    })
  })

  test('Cancel lands on the Tender Review tab with the shipment open on its Tender screen', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute(SELL_SHIPMENT, { shipmentsElement: <LocationProbe /> })

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel tender' }))
    confirmAction('Yes')

    expect(
      await screen.findByText(`landed with state: ${JSON.stringify({ panel: 'exceptions', tab: 'tender-review', selectedShipmentId: SELL_SHIPMENT, requestedTab: { key: 'routing' } })}`),
    ).toBeTruthy()
  })

  // Follow-up fix: `finish()` now has an `onError` alongside `onSuccess`
  // (mirrors CreateOrderForm's saveGateError convention) that surfaces a
  // visible Alert so the planner isn't left believing a failed resolution
  // succeeded. Stays on the review page with state intact so they can retry.
  test('a failed resolution shows a visible error and keeps the planner on the review page', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    resolveOrderChange.mockRejectedValueOnce(new Error('boom'))
    renderRoute()

    const cancelButton = await screen.findByRole('button', { name: 'Cancel tender' })
    fireEvent.click(cancelButton)
    confirmAction('Yes')

    expect(await screen.findByText("Couldn't resolve this tender. Please try again.")).toBeTruthy()
    // disabled tracks resolve.isPending — it going back to false is the
    // signal the rejected mutation actually settled, not just that time passed.
    await waitFor(() => expect(cancelButton.disabled).toBe(false))
    expect(screen.queryByText('shipments list')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel tender' })).toBeTruthy()
  })

  test('retrying after a failure clears the stale error before the retry settles, then navigates on success', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    resolveOrderChange.mockRejectedValueOnce(new Error('boom'))
    renderRoute(SELL_SHIPMENT, { shipmentsElement: <LocationProbe /> })

    const cancelButton = await screen.findByRole('button', { name: 'Cancel tender' })
    fireEvent.click(cancelButton)
    confirmAction('Yes')
    expect(await screen.findByText("Couldn't resolve this tender. Please try again.")).toBeTruthy()
    await waitFor(() => expect(cancelButton.disabled).toBe(false))

    // Hold the retry open so we can observe the error clearing BEFORE the
    // second call settles — proves it's cleared on attempt-start, not just
    // incidentally gone because the page navigated away.
    let releaseRetry
    resolveOrderChange.mockImplementationOnce(() => new Promise((res) => { releaseRetry = res }))
    fireEvent.click(cancelButton)
    confirmAction('Yes')

    await waitFor(() => expect(screen.queryByText("Couldn't resolve this tender. Please try again.")).toBeNull())
    expect(screen.queryByText('shipments list')).toBeNull() // retry still in flight, no nav yet

    releaseRetry()
    expect(
      await screen.findByText(`landed with state: ${JSON.stringify({ panel: 'exceptions', tab: 'tender-review', selectedShipmentId: SELL_SHIPMENT, requestedTab: { key: 'routing' } })}`),
    ).toBeTruthy()
  })
})

// S135 — confirmation gate on all three Tender Resolution Actions. The ACs
// specify no dialog, so the copy is ours; what these pin is that NOTHING
// reaches the mutation unconfirmed, and that each message states that
// action's own consequence (Re-Tender messages the carrier, Bypass doesn't).
describe('OrderChangeReviewRoute — action confirmations', () => {
  test('an action opens a dialog and does NOT resolve until it is confirmed', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel tender' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(resolveOrderChange).not.toHaveBeenCalled()
  })

  test('dismissing the dialog abandons the action entirely', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Re tender' }))
    confirmAction('Cancel')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(resolveOrderChange).not.toHaveBeenCalled()
  })

  test('Re-Tender names the carrier, the selected cost and the outbound tender', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Re tender' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Keep Carrier & Re-Tender/)).toBeTruthy()
    expect(within(dialog).getByText(/\$2,950\.00/)).toBeTruthy()
    expect(within(dialog).getByText(/sent to the carrier/)).toBeTruthy()
  })

  test('Bypass says NO communication is sent — the one fact that separates it from Re-Tender', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Bypass Tender' }))
    expect(within(screen.getByRole('dialog')).getByText(/No tender communication will be sent/)).toBeTruthy()
  })

  test('Cancel Tender uses Yes/No — a "Cancel" button here would read as cancelling the tender', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel tender' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(dialog.getByRole('button', { name: 'No' })).toBeTruthy()
    expect(dialog.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(dialog.getByText(/returns to Tender Review/)).toBeTruthy()
  })
})

// S135 — "View Tender" (LINX-14509: view tender information during the
// review, but no tender actions). A modal, so the cost selection already made
// on this screen survives looking it up.
describe('OrderChangeReviewRoute — View Tender', () => {
  test('opens the live tender options in a modal, and nothing resolves', async () => {
    getSellShipmentDetail.mockResolvedValue({
      ...ORDER_CHANGE_DETAIL,
      routingData: { options: [{
        rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'LTL',
        cost: '$1,901.56', status: 'Sent',
        pickupDateTime: '06/03/2026 16:30 CDT', deliveryDateTime: '06/04/2026 16:30 CDT',
      }] },
    })
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'View Tender' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('cell', { name: 'Old Dominion' })).toBeTruthy()
    expect(resolveOrderChange).not.toHaveBeenCalled()
    // Still on the review screen behind the modal.
    expect(screen.getByRole('button', { name: 'Cancel tender' })).toBeTruthy()
  })
})

// S135 — the three actions no longer share one landing. Unit-tested directly
// so the rule is pinned without driving the whole screen three more times.
describe('landingFor', () => {
  test('cancel goes to Tender Review with the shipment open on its Tender screen (LINX-14514)', () => {
    expect(landingFor('cancel', '123')).toEqual({
      panel: 'exceptions',
      tab: 'tender-review',
      selectedShipmentId: '123',
      // 'routing' IS the Tender tab (BottomBar TABS); 'tender' is Tender History.
      requestedTab: { key: 'routing' },
    })
  })

  test('retender and bypass return to the Order Change tab — the review is finished', () => {
    for (const action of ['retender', 'bypass']) {
      expect(landingFor(action, '123')).toEqual({ panel: 'exceptions', tab: 'order-change' })
    }
  })
})

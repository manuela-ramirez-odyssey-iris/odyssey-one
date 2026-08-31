// @vitest-environment jsdom
// Task 8 — Review Order Change route shell (LINX-14509…14515). Mocks the
// SERVICE layer (getSellShipmentDetail / resolveOrderChange), not the query
// hooks, so the real useQuery/useMutation wiring runs against a controlled
// fixture — same convention as RoutingGuideTab.test.jsx's saveTenderOption
// mock, which exists precisely so a persist regression can't hide behind a
// hand-rolled hook mock.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderChangeReviewRoute from './OrderChangeReviewRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(),
  resolveOrderChange: vi.fn().mockResolvedValue(undefined),
}))
import { getSellShipmentDetail, resolveOrderChange } from '../../api/services/shipmentService'

const SELL_SHIPMENT = '25319141'

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

function renderRoute(sellShipment = SELL_SHIPMENT) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[`/shipments/order-change/${sellShipment}`]}>
              <Routes>
                <Route path="/shipments/order-change/:sellShipment" element={<OrderChangeReviewRoute />} />
                <Route path="/shipments" element={<div>shipments list</div>} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  getSellShipmentDetail.mockReset()
  resolveOrderChange.mockClear()
})

describe('OrderChangeReviewRoute', () => {
  test('renders the page title with the shipment number', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()
    expect(await screen.findByText(`Buy Shipment ${SELL_SHIPMENT}`)).toBeTruthy()
  })

  test('renders the Cancel tender button', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()
    expect(await screen.findByRole('button', { name: 'Cancel tender' })).toBeTruthy()
  })

  test('Cancel tender calls the mutation with action cancel, cost null, and the prior tender status, then navigates back to the Order Change tab', async () => {
    getSellShipmentDetail.mockResolvedValue(ORDER_CHANGE_DETAIL)
    renderRoute()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel tender' }))

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
    renderRoute()
    expect(await screen.findByText('No order change to review for this shipment.')).toBeTruthy()
    expect(screen.queryByText(`Buy Shipment ${SELL_SHIPMENT}`)).toBeNull()
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
})

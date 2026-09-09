// @vitest-environment jsdom
// S143 Task 2b — Edit Shipment Stops route shell (LINX-15667…15671). Mocks
// the SERVICE layer, not the query hook — same convention as
// OrderChangeReviewRoute.test.jsx.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderChangeEditStopsRoute from './OrderChangeEditStopsRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(),
  resolveOrderChange: vi.fn(),
}))
import { getSellShipmentDetail, resolveOrderChange } from '../../api/services/shipmentService'

const SELL_SHIPMENT = '25319141'
const BUY_SHIPMENT = '87654321'

// stopsSandbox-shaped stops (EditStopsView.test.jsx's own fixture) — enough
// for the editor to mount and for View Routing / Approve Changes to work.
const stops = [
  { type: 'pickup', stopNumber: 1, orderIds: ['A', 'B'], location: 'X, City', address: '1 St', date: 'June 4, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1', pickupNo: '' },
  { type: 'pickup', stopNumber: 2, orderIds: ['C'], location: 'Y, Town', address: '1 St', date: 'June 4, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1', pickupNo: '' },
  { type: 'delivery', stopNumber: 3, orderIds: ['A', 'B', 'C'], location: 'Z, Ville', address: '1 St', date: 'June 6, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1' },
]
const orderDetails = [
  { orderNumber: 'A', shipFrom: { location: 'X, City' }, shipTo: { location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'B', shipFrom: { location: 'X, City' }, shipTo: { location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'C', shipFrom: { location: 'Y, Town' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1,005 LB', totalVolume: '1 cuft' },
]
// locationChange:false — routable by default, same as EditStopsView.test.jsx's
// `noChange` fixture, so View Routing is enabled without extra setup.
const consolidation = {
  locationChange: false, changedOrderIds: [], stopChanges: {}, orderComparisons: {},
  summaryChanges: {}, costs: { prior: '$1,000.00', newDirect: '$1,100.00', newConsolidated: '$1,050.00' },
}

function makeDetail({ consolidationOverride = consolidation, resolution = null, priorTenderStatus = null } = {}) {
  return {
    stopsData: { summary: { distance: '364.14 mi' }, stops },
    orderDetails,
    // routingData.options intentionally left empty here — the route's
    // tender derivation reads orderChange.prior.tenderStatus (the Direct
    // route's own source), NOT routingData.options.
    routingData: { options: [] },
    orderChange: consolidationOverride ? {
      consolidation: consolidationOverride,
      resolution,
      prior: { tenderStatus: priorTenderStatus },
      newTenderList: [],
      priorTenderList: [],
      droppedCarriers: { prior: [], new: [] },
    } : null,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <div>landed at {location.pathname} with state: {JSON.stringify(location.state)}</div>
}

function renderRoute(sellShipment = SELL_SHIPMENT, { buyShipment, shipmentsElement, reviewElement } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[{
              pathname: `/shipments/order-change/${sellShipment}/stops`,
              state: buyShipment ? { buyShipment } : undefined,
            }]}>
              <Routes>
                <Route path="/shipments/order-change/:sellShipment/stops" element={<OrderChangeEditStopsRoute />} />
                <Route path="/shipments" element={shipmentsElement ?? <LocationProbe />} />
                <Route path="/shipments/order-change/:sellShipment" element={reviewElement ?? <LocationProbe />} />
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
  resolveOrderChange.mockReset()
})

describe('OrderChangeEditStopsRoute', () => {
  test('renders breadcrumb, header and the editor for a consolidated order change', async () => {
    getSellShipmentDetail.mockResolvedValue(makeDetail())
    renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })

    expect(await screen.findByText(`Buy Shipment ${BUY_SHIPMENT}`)).toBeTruthy()
    expect(screen.getByText('Shipment')).toBeTruthy()
    expect(screen.getByText('Review Order Change')).toBeTruthy()
    expect(screen.getAllByText('Edit Shipment Stops').length).toBeGreaterThan(0)
    // The editor itself rendered (View Routing / Approve Changes are its own).
    expect(screen.getByRole('button', { name: 'View Routing' })).toBeTruthy()
  })

  test('shows the empty state when the order change has no consolidation', async () => {
    getSellShipmentDetail.mockResolvedValue(makeDetail({ consolidationOverride: null }))
    renderRoute()
    expect(await screen.findByText('Nothing to edit for this shipment.')).toBeTruthy()
  })

  test('shows the empty state when the consolidation is already resolved', async () => {
    getSellShipmentDetail.mockResolvedValue(makeDetail({ resolution: 'retender' }))
    renderRoute()
    expect(await screen.findByText('Nothing to edit for this shipment.')).toBeTruthy()
  })

  test('Cancel navigates to /shipments with selectedShipmentId and requestedTab stops (LINX-15667)', async () => {
    getSellShipmentDetail.mockResolvedValue(makeDetail())
    renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })
    await screen.findByRole('button', { name: 'View Routing' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    const probe = await screen.findByText(/landed at \/shipments with state/)
    expect(probe.textContent).toContain(`"selectedShipmentId":"${SELL_SHIPMENT}"`)
    expect(probe.textContent).toContain('"key":"stops"')
  })

  test.each(['To Be Tendered', 'Sent', 'Accepted'])(
    'Approve with an active tender (%s) saves stops then navigates back to the review screen (LINX-15671 Scenario A)',
    async (priorTenderStatus) => {
      resolveOrderChange.mockResolvedValue(undefined)
      getSellShipmentDetail.mockResolvedValue(makeDetail({ priorTenderStatus }))
      renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })
      await screen.findByRole('button', { name: 'View Routing' })

      fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
      fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))

      const probe = await screen.findByText(new RegExp(`landed at /shipments/order-change/${SELL_SHIPMENT} with state`))
      expect(probe.textContent).toContain(`"buyShipment":"${BUY_SHIPMENT}"`)
      // No `from` key — the Direct route only special-cases from === 'tender'.
      expect(probe.textContent).not.toContain('"from"')

      expect(resolveOrderChange).toHaveBeenCalledTimes(1)
      const [calledSellShipment, body] = resolveOrderChange.mock.calls[0]
      expect(calledSellShipment).toBe(SELL_SHIPMENT)
      expect(body.action).toBe('save-stops')
      expect(Array.isArray(body.stops)).toBe(true)
      expect(body.stops[0]).toMatchObject({ stopSequence: 1 })
      expect(body.stops[0]).toHaveProperty('sourceStopSequence')
    },
  )

  test('Approve with no active tender saves stops then navigates to /shipments Tender tab, still on the Order Change tab (LINX-15671 Scenario B)', async () => {
    resolveOrderChange.mockResolvedValue(undefined)
    getSellShipmentDetail.mockResolvedValue(makeDetail({ priorTenderStatus: null }))
    renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })
    await screen.findByRole('button', { name: 'View Routing' })

    fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))

    const probe = await screen.findByText(/landed at \/shipments with state/)
    expect(probe.textContent).toContain(`"selectedShipmentId":"${SELL_SHIPMENT}"`)
    expect(probe.textContent).toContain('"key":"routing"')
    expect(probe.textContent).toContain('"panel":"exceptions"')
    expect(probe.textContent).toContain('"tab":"order-change"')
    expect(resolveOrderChange).toHaveBeenCalledTimes(1)
    expect(resolveOrderChange.mock.calls[0][1].action).toBe('save-stops')
  })

  test('Approve shows an error and does not navigate when the save fails', async () => {
    resolveOrderChange.mockRejectedValue(new Error('Network error'))
    getSellShipmentDetail.mockResolvedValue(makeDetail({ priorTenderStatus: 'Sent' }))
    renderRoute(SELL_SHIPMENT, { buyShipment: BUY_SHIPMENT })
    await screen.findByRole('button', { name: 'View Routing' })

    fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))

    expect(await screen.findByText('Network error')).toBeTruthy()
    expect(screen.queryByText(/landed at/)).toBeNull()
  })
})

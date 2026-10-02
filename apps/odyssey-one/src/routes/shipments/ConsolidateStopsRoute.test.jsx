// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ConsolidateStopsRoute from './ConsolidateStopsRoute.jsx'
import { getSellShipmentDetail, saveTenderOption } from '../../api/services/shipmentService'
import { applyConsolidation } from '../../api/services/consolidationService'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

// CNS-19 — manual consolidation on the order-change editor (no Prior).

vi.mock('../../components/detail/order-change/AddOrdersModal', () => ({
  // An order from shipment 77 whose tender is Accepted: the Tendered Shipment Detected trigger.
  default: ({ onAdd }) => (
    <button onClick={() => onAdd([{ orderNumber: 'E', sourceSellShipment: '77', tenderStatus: 'Accepted', ordersInShipment: ['E'], shipDate: '06/04/2026' }])}>mock-add</button>
  ),
}))
vi.mock('../../api/services/consolidationService', () => ({
  applyConsolidation: vi.fn(async ({ sellShipments }) => ({
    row: { id: '27000001', sellShipment: '27000001', odysseyShipmentIdentifier: 'C70000001', category: 'consolidation', orders: sellShipments },
    detail: {},
  })),
}))
vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(),
  saveTenderOption: vi.fn(async () => {}),
}))

const stopOf = (over) => ({
  type: 'pickup', stopNumber: 1, orderIds: ['A'], location: 'X, City', address: '1 St', siteKey: 'S1',
  date: 'June 4, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1', pickupNo: '', ...over,
})
const option = { rank: 1, routeRank: 1, scac: 'ODFL', carrierName: 'ODFL', equipment: 'TL', rate: '$100.00', cost: '$100.00 USD', transit: '1 Days', distance: '100.00 mi', status: null, pickupDateTime: null, deliveryDateTime: null, rateDetails: { baseRate: 100, additionalCharges: [], currency: 'USD', markup: 0, apTotal: 100, arTotal: 100 } }
const detailOf = (order, dropLoc) => ({
  odysseyShipmentIdentifier: `O-${order}`, customerId: 'VALTRIS_01', customerName: 'Valtris',
  stopsData: {
    summary: { headerDistance: '100.00 mi', seedEquipment: 'TL' },
    stops: [stopOf({ orderIds: [order] }), stopOf({ type: 'delivery', stopNumber: 2, orderIds: [order], location: dropLoc, siteKey: `D-${order}`, date: 'June 6, 2026 08:00 CDT' })],
  },
  orderDetails: [{ orderNumber: order, shipFrom: { location: 'X, City' }, shipTo: { location: dropLoc }, grossWeight: '5 LB', totalVolume: '1 cuft' }],
  routingData: { options: [option] },
})
const details = { 111: detailOf('A', 'Z, Ville'), 222: detailOf('B', 'W, Burg'), 333: detailOf('C', 'V, Town'), 77: { ...detailOf('E', 'Z, Ville'), odysseyShipmentIdentifier: 'O-77' } }

// sell ids are numeric on the wire (toDto's src:<sell>:<n> key)
const row = (id, over) => ({ id, sellShipment: id, odysseyShipmentIdentifier: `O-${id}`, customerId: 'VALTRIS_01', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', orders: [{ 111: 'A', 222: 'B', 333: 'C' }[id]], pickupDate: '06/04/2026', ...over })

function Probe() {
  const { pathname, state } = useLocation()
  return <div data-testid="probe">{JSON.stringify({ pathname, state })}</div>
}
const probe = async () => JSON.parse((await screen.findByTestId('probe')).textContent)

function renderRoute(rows, extraState = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments/consolidate/stops', state: { rows, ...extraState } }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/stops" element={<ConsolidateStopsRoute />} />
            <Route path="/shipments/*" element={<Probe />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  // The concurrent-tender roll is a coin flip on the first Apply; pin it off.
  vi.spyOn(Math, 'random').mockReturnValue(0.9)
  vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => details[id])
  vi.mocked(saveTenderOption).mockReset().mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.mocked(applyConsolidation).mockClear(); vi.restoreAllMocks() })

const evaluate = async () => fireEvent.click(await screen.findByRole('button', { name: 'Evaluate' }))
const routingApply = () => fireEvent.click(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: 'Apply Consolidation' }))
const openApplyModalEarly = async () => { await evaluate(); routingApply() }
const modalApply = () => {
  const btns = screen.getAllByRole('button', { name: 'Apply Consolidation' })
  fireEvent.click(btns[btns.length - 1])
}

describe('ConsolidateStopsRoute', () => {
  test('no rows: empty state with Back to Shipments', async () => {
    renderRoute([])
    fireEvent.click(await screen.findByRole('button', { name: 'Back to Shipments' }))
    expect((await probe()).state).toEqual({ consolidateExit: true })
  })

  test('opens Review & Apply Manual Consolidation on the merged stops, with no Prior', async () => {
    renderRoute([row('111'), row('222')])
    expect(await screen.findByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
    expect(screen.getByText('Edit Shipment Stops', { selector: '.order-change__crumbs *' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Prior plan' })).toBeNull()
    // The shared pickup site folded into one stop: 1 pickup + 2 deliveries.
    expect(document.querySelectorAll('[data-stop-key]')).toHaveLength(3)
  })

  test('S11: the summary strip, the selected-shipments table, and no purple outside the ID chips', async () => {
    renderRoute([row('111'), row('222')])
    await screen.findByText('Selected Shipments (2)')
    expect(screen.getByText('Valtris')).toBeTruthy()
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
    const table = await screen.findByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('O-111')).toBeTruthy()
    expect(within(table).getByText('O-222')).toBeTruthy()
    expect(screen.getByText('2 items')).toBeTruthy()
    // Order (S11): summary -> strip -> selected shipments -> All Stops.
    const before = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
    expect(before(screen.getByText('Selected Shipments (2)'), document.querySelector('.stops-kpi-strip'))).toBeTruthy()
    expect(before(document.querySelector('.stops-kpi-strip'), table)).toBeTruthy()
    expect(before(table, screen.getByText('All Stops'))).toBeTruthy()
    // User exception (2026-09-30): the shipment ID chips are purple; nothing else is.
    const purple = [...document.querySelectorAll('[style*="purple"]')]
    expect(purple.length).toBe(2)
    for (const el of purple) expect(el.closest('.consolidation-summary__chips')).toBeTruthy()
    expect(document.querySelector('.stop-badge--changed')).toBeNull()
  })

  test('S11: a tendered source removed in the modal drops out of the table and the chips', async () => {
    renderRoute([row('111'), row('222', { tenderStatus: 'Accepted' }), row('333')])
    await openApplyModalEarly()
    await screen.findByText('Tendered Shipment Detected')
    fireEvent.click(screen.getByRole('button', { name: 'Apply Solution' })) // Remove
    await screen.findByText('Tendered shipment O-222 removed from the consolidation.')
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).queryByText('O-222')).toBeNull()
    expect(within(table).getByText('O-111')).toBeTruthy()
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
  })

  test('Approve -> Apply -> lands on /shipments with the created C and its panel/tab (S8.1)', async () => {
    renderRoute([row('111'), row('222')])
    await evaluate()
    routingApply()
    await screen.findByText('Are you sure you want to apply the proposed consolidation?')
    modalApply()
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    const body = vi.mocked(applyConsolidation).mock.calls[0][0]
    expect(body.sellShipments).toEqual(['111', '222'])
    expect(body.stops.map((s) => s.sourceSellShipment)).toEqual(['111', '111', '222'])
    expect(body.externalOrders).toEqual([])
    expect(body.tenderList[0]).toMatchObject({ scac: 'ODFL', status: '' })
    const { pathname, state } = await probe()
    expect(pathname).toBe('/shipments')
    expect(state).toMatchObject({ consolidateExit: true, panel: 'monitoring', tab: 'consolidation', createdShipment: { odysseyShipmentIdentifier: 'C70000001' } })
  })

  // S6.2/S6.3 — an external order from an Accepted shipment trips the check.
  async function addTenderedExternal() {
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add New Order' }))
    fireEvent.click(screen.getByRole('button', { name: 'mock-add' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add order E' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  }

  test('the routing Apply is disabled while the async tender check runs (no double roll)', async () => {
      vi.mocked(saveTenderOption).mockImplementation(() => new Promise(() => {})) // the simulated concurrent tender never settles
    Math.random.mockReturnValue(0.1)
    renderRoute([row('111'), row('222')])
    await evaluate()
    routingApply()
    await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'View Routing' })).getByRole('button', { name: /Apply|Approving/ }).disabled).toBe(true))
    expect(saveTenderOption).toHaveBeenCalledTimes(1)
  })

  test('an external order from an Accepted shipment opens Tendered Shipment Detected; Remove sends it back and the write omits it', async () => {
    renderRoute([row('111'), row('222')])
    await addTenderedExternal()
    await evaluate()
    routingApply()
    await screen.findByText('Tendered Shipment Detected')
    expect(screen.getByText(/Shipment O-77 has been tendered and cannot be consolidated\./)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Apply Solution' })) // default action: Remove
    await screen.findByText('Tendered shipment O-77 removed from the consolidation.')
    modalApply()
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    const body = vi.mocked(applyConsolidation).mock.calls[0][0]
    expect(body.externalOrders).toEqual([])
    expect(body.stops.flatMap((s) => s.orderIds)).not.toContain('E')
  })

  test('a tendered SOURCE with fewer than two others left offers Discard, which returns to the mode without it', async () => {
    renderRoute([row('111'), row('222', { tenderStatus: 'Accepted' })])
    await evaluate()
    routingApply()
    await screen.findByText('Tendered Shipment Detected')
    expect(screen.getByText(/Consolidation requires at least 2 shipments/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Apply Solution' }))
    const { state } = await probe()
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['111'])
    expect(applyConsolidation).not.toHaveBeenCalled()
  })

  test('a Consolidation row opened from the row menu leaves without re-entering the mode (S1.5)', async () => {
    renderRoute([row('333', { shipmentType: 'Consolidation' })])
    await screen.findByRole('heading', { name: /^Shipment O-C$/ })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect((await probe()).state ?? null).toBeNull()
  })

  test('editing a C: nav header reads Edit Consolidation, no selected-shipments table (user 2026-10-01)', async () => {
    renderRoute([row('333', { shipmentType: 'Consolidation' })])
    await screen.findByRole('heading', { name: /^Shipment O-C$/ })
    expect(screen.getByText('Edit Consolidation')).toBeTruthy()
    expect(screen.queryByText('Manual Consolidation')).toBeNull()
    expect(screen.queryByRole('table', { name: 'Selected shipments to consolidate' })).toBeNull()
  })

  // ── B3/B4 tender flow, ported from the retired Review & Apply page (S6.1) ──
  const three = () => [row('111'), row('222'), row('333')]
  const activeDetail = { ...details[222], routingData: { options: [{ ...option, status: 'Accepted' }] } }
  const openApplyModal = async () => { await evaluate(); routingApply() }

  test('cancel tender runs the Tender tab save path, keeps the rows and returns to confirm', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => (id === '222' ? activeDetail : details[id]))
    renderRoute([row('111'), row('222', { tenderStatus: 'Accepted' }), row('333')])
    await openApplyModal()
    await screen.findByText('Tendered Shipment Detected')
    fireEvent.click(screen.getByText(/Cancel tender on the accepted shipments/))
    fireEvent.click(screen.getByRole('button', { name: 'Apply Solution' }))
    await screen.findByText('Tender cancelled on shipment O-222.')
    expect(saveTenderOption).toHaveBeenCalledWith('222', expect.objectContaining({ status: 'Cancelled' }))
    modalApply()
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].sellShipments).toEqual(['111', '222', '333'])
  })

  test('Nevermind closes the error modal without changing anything', async () => {
    renderRoute([row('111'), row('222', { tenderStatus: 'Accepted' }), row('333')])
    await openApplyModal()
    await screen.findByText('Tendered Shipment Detected')
    fireEvent.click(screen.getByRole('button', { name: 'Nevermind' }))
    expect(screen.queryByText('Tendered Shipment Detected')).toBeNull()
    expect(saveTenderOption).not.toHaveBeenCalled()
    expect(applyConsolidation).not.toHaveBeenCalled()
  })

  test('the first-open 50/50 hit tenders a source under the planner and lands in the error phase', async () => {
    Math.random.mockReturnValue(0.1) // < 0.5: the roll hits; floor(0.1 * 3) = row 0
    renderRoute(three())
    await openApplyModal()
    await screen.findByText('Tendered Shipment Detected')
    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    expect(saveTenderOption).toHaveBeenCalledWith('111', expect.objectContaining({ status: 'Accepted' }))
    expect(screen.getByText(/Shipment O-111 has been tendered/)).toBeTruthy()
  })

  test('confirm within 5s does not re-roll; after 5s it rolls again and can trip the check', async () => {
    renderRoute(three())
    await openApplyModal() // random 0.9: the first-open roll misses
    await screen.findByText('Are you sure you want to apply the proposed consolidation?')
    Math.random.mockReturnValue(0.1)
    modalApply() // <5s in Confirm: no re-roll, the write goes through
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    expect(saveTenderOption).not.toHaveBeenCalled()
    cleanup()

    applyConsolidation.mockClear()
    Math.random.mockReturnValue(0.9)
    renderRoute(three())
    await openApplyModal()
    await screen.findByText('Are you sure you want to apply the proposed consolidation?')
    Math.random.mockReturnValue(0.1)
    const real = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(real + 6000) // >5s in Confirm: re-arms the roll
    modalApply()
    await screen.findByText('Tendered Shipment Detected')
    expect(saveTenderOption).toHaveBeenCalledTimes(1)
    expect(applyConsolidation).not.toHaveBeenCalled()
  })
})

// LINX-15873 — Edit Shipment Stops on any C, from its Stops tab.
describe('ConsolidateStopsRoute — editing a C from its Stops tab', () => {
  const cRow = (over) => row('333', { shipmentType: 'Consolidation', scac: 'ODFL', ...over })
  const acceptedC = { ...details[333], routingData: { options: [{ ...option, status: 'Accepted' }] } }
  const filedAs = (category) => vi.mocked(applyConsolidation).mockResolvedValueOnce({ row: { id: '333', sellShipment: '333', category }, detail: {} })
  const toConfirm = async () => { await screen.findByText('Are you sure you want to apply the proposed consolidation?'); modalApply() }

  test('C2: Cancel goes back to /shipments with the C selected on its Stops tab', async () => {
    renderRoute([cRow()], { from: 'stops' })
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect((await probe()).state).toEqual({ selectedShipmentId: '333', requestedTab: { key: 'stops' } })
  })

  test('C3: an Accepted C asks Active Tender; Yes writes keep and lands on the Tender tab (C4)', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => (id === '333' ? acceptedC : details[id]))
    filedAs('sent')
    renderRoute([cRow({ tenderStatus: 'Accepted' })], { from: 'stops' })
    await evaluate()
    routingApply()
    const dialog = await screen.findByRole('dialog', { name: 'Active Tender' })
    expect(dialog.textContent).toContain('This shipment is tendered to ODFL (Accepted). Keep the tender and send the updated shipment to ODFL?')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, send to ODFL' }))
    // The C is not its own Tendered Shipment Detected.
    await toConfirm()
    expect(screen.queryByText('Tendered Shipment Detected')).toBeNull()
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    expect(vi.mocked(applyConsolidation).mock.calls[0][0]).toMatchObject({ sellShipments: ['333'], tenderDecision: 'keep' })
    expect((await probe()).state).toEqual({ selectedShipmentId: '333', requestedTab: { key: 'routing' }, panel: 'monitoring', tab: 'sent' })
  })

  test('C3: No writes cancel and lands on the Tender tab', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => (id === '333' ? acceptedC : details[id]))
    filedAs('consolidation')
    renderRoute([cRow({ tenderStatus: 'Accepted' })], { from: 'stops' })
    await evaluate()
    routingApply()
    fireEvent.click(await screen.findByRole('button', { name: 'No, choose another carrier' }))
    await toConfirm()
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].tenderDecision).toBe('cancel')
    expect((await probe()).state).toMatchObject({ selectedShipmentId: '333', requestedTab: { key: 'routing' } })
  })

  test('C3: the X dismisses the question without deciding (No would cancel a live tender)', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => (id === '333' ? acceptedC : details[id]))
    renderRoute([cRow({ tenderStatus: 'Accepted' })], { from: 'stops' })
    await evaluate()
    routingApply()
    const dialog = await screen.findByRole('dialog', { name: 'Active Tender' })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Active Tender' })).toBeNull())
    expect(screen.queryByText('Are you sure you want to apply the proposed consolidation?')).toBeNull()
    expect(applyConsolidation).not.toHaveBeenCalled()
  })

  test('C3: the question reads the detail\'s tender options (the server\'s source), not a stale row status; To Be Tendered is not active', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => (id === '333' ? { ...details[333], routingData: { options: [{ ...option, status: 'To Be Tendered' }] } } : details[id]))
    renderRoute([cRow({ tenderStatus: 'Accepted' })], { from: 'stops' })
    await evaluate()
    routingApply()
    await screen.findByText('Are you sure you want to apply the proposed consolidation?')
    expect(screen.queryByRole('dialog', { name: 'Active Tender' })).toBeNull()
  })

  test('an untendered C: no question, tenderDecision null, lands on the Stops tab (C4)', async () => {
    filedAs('consolidation')
    renderRoute([cRow()], { from: 'stops' })
    await evaluate()
    routingApply()
    await toConfirm()
    expect(screen.queryByRole('dialog', { name: 'Active Tender' })).toBeNull()
    await waitFor(() => expect(applyConsolidation).toHaveBeenCalledTimes(1))
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].tenderDecision).toBeNull()
    expect((await probe()).state).toEqual({ selectedShipmentId: '333', requestedTab: { key: 'stops' }, panel: 'monitoring', tab: 'consolidation' })
  })
})

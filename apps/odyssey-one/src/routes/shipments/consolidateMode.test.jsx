// @vitest-environment jsdom
// Consolidate mode (S154) end-to-end through the real ShipmentsRoute + mock
// grid service. Same harness as tabOrderPersistence.test.jsx.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'

beforeEach(() => {
  __clearMockPreferences()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function ReviewProbe() {
  const { state } = useLocation()
  return <div data-testid="review-probe">{JSON.stringify(state?.rows?.map((r) => r.id) ?? null)}</div>
}

function renderRoute(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/review" element={<ReviewProbe />} />
            <Route path="/shipments/*" element={<ShipmentsRoute />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const rowBoxes = () => screen.queryAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Select ') && !c.getAttribute('aria-label').startsWith('Select all'))
const enabledRowBoxes = () => rowBoxes().filter((c) => !c.disabled)

async function enterMode() {
  fireEvent.click(await screen.findByRole('button', { name: 'Consolidate' }))
  await screen.findByRole('heading', { name: 'Shipments Consolidation' })
}

describe('consolidate mode', () => {
  test('entering swaps the chrome: title, buttons, checkboxes, no Export/toggle/actions', async () => {
    renderRoute()
    expect(await screen.findByRole('heading', { name: 'Shipments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    await enterMode()
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Shipment actions' })).toBeNull()
    expect(screen.getByRole('button', { name: '0 Shipments Selected' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    await waitFor(() => expect(rowBoxes().length).toBeGreaterThan(0))
    expect(document.querySelector('.sidebar--hidden')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search in Shipments')).toBeTruthy()
  })

  test('first check locks the customer: badge row, placeholder; unchecking releases', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    const label = enabledRowBoxes()[0].getAttribute('aria-label')
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    expect(await screen.findByText('Selected Customer:')).toBeTruthy()
    expect(screen.getByPlaceholderText(/^Search for /)).toBeTruthy()
    expect(screen.getByRole('button', { name: '1 Shipments Selected' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    await waitFor(() => expect(screen.queryByText('Selected Customer:')).toBeNull())
    expect(screen.getByPlaceholderText('Search in Shipments')).toBeTruthy()
  })

  test('two selected enables the primary; proceeding hands the rows to the review route', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(1))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    await waitFor(() => expect(enabledRowBoxes().filter((c) => !c.checked).length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes().filter((c) => !c.checked)[0])
    const go = await screen.findByRole('button', { name: '2 Shipments Selected' })
    expect(go.disabled).toBe(false)
    fireEvent.click(go)
    const probe = await screen.findByTestId('review-probe')
    expect(JSON.parse(probe.textContent)).toHaveLength(2)
  })

  test('Cancel restores the normal chrome and clears the selection', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('heading', { name: 'Shipments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    expect(screen.queryByText('Selected Customer:')).toBeNull()
    expect(rowBoxes()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Consolidate' }))
    expect(await screen.findByRole('button', { name: '0 Shipments Selected' })).toBeTruthy()
  })

  test('Cancel restores the sort and view mode the planner had before entering', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Switch to widgets view, which the mode hides and forces back to pills.
    const toggle = document.querySelector('.button-toggle')
    const widgets = toggle && within(toggle).getAllByRole('button')[1]
    if (widgets) fireEvent.click(widgets)
    const before = document.querySelector('.button-toggle')?.innerHTML
    await enterMode()
    expect(document.querySelector('.button-toggle')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(document.querySelector('.button-toggle')).toBeTruthy())
    expect(document.querySelector('.button-toggle')?.innerHTML).toBe(before)
  })

  test('the selection survives the first checkbox click without losing mode state', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Widgets view is the "prior" state the snapshot must carry past a
    // checkbox click — a spread bug in handleSelectionChange would drop it.
    const toggle = document.querySelector('.button-toggle')
    const widgets = toggle && within(toggle).getAllByRole('button')[1]
    if (widgets) fireEvent.click(widgets)
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    const toggleAfter = await waitFor(() => {
      const el = document.querySelector('.button-toggle')
      if (!el) throw new Error('toggle not back yet')
      return el
    })
    const widgetsAfter = within(toggleAfter).getAllByRole('button')[1]
    expect(widgetsAfter.getAttribute('aria-pressed')).toBe('true')
  })

  test('location.state.consolidate re-enters the mode with the selection', async () => {
    const rows = [
      { id: 'a', sellShipment: 'a', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
      { id: 'b', sellShipment: 'b', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
    ]
    renderRoute({ consolidate: { rows } })
    expect(await screen.findByRole('heading', { name: 'Shipments Consolidation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '2 Shipments Selected' }).disabled).toBe(false)
    expect(screen.getByText('Selected Customer:')).toBeTruthy()
    expect(screen.getByText('Valtris')).toBeTruthy()
  })
})

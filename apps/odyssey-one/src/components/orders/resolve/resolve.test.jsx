// @vitest-environment jsdom
// LINX-11137 resolve mode: ?resolve=<orderNumber> hydrates the create form as
// the Order Validation Error Resolution view — chrome, seeded field states,
// Alert wiring, and the Save/Purge transition.
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateOrderRoute from '../../../routes/orders/CreateOrderRoute.jsx'
import { CreateOrderModeProvider } from '../../../contexts/CreateOrderModeContext.jsx'
import { EditModeProvider } from '../../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../../contexts/CustomersContext.jsx'
import { __resetOrderWriteState } from '../../../api/services/orderService'

// Seeded row that sits in the Validation Errors tab (Shipment Failed) with
// draftOrderStatus 'Ready' — src/data/orders.json.
const ORDER = 'VAL100000'

function renderResolve(orderNumber = ORDER, state = { errorCount: 5, customer: 'ACME', orderSource: 'Integrated' }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[{ pathname: '/orders/create', search: `?resolve=${orderNumber}`, state }]}>
              <Routes>
                <Route path="/orders/create" element={<CreateOrderRoute />} />
                <Route path="/orders" element={<div>orders list</div>} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => __resetOrderWriteState())
afterEach(cleanup)

describe('resolve mode — chrome', () => {
  test('renders the resolution title, order-number sub-heading, and back link', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order Validation Error Resolution' })).toBeTruthy())
    expect(screen.getByText(`Order Number ${ORDER}`)).toBeTruthy()
    expect(screen.getByText('Back to overview page')).toBeTruthy()
  })

  test('footer shows Cancel / Purge / Save (no Create Order button)', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order Validation Error Resolution' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create Order' })).toBeNull()
  })
})

describe('resolve mode — fields', () => {
  // The seeded errors for VAL100000 land on general.equipment (pick-only
  // ComboBox) + consignor/consignee postal & city. Postal is the only plain
  // typable input among them, so it's the one the flip assertion drives.
  const FLIP_PATH = 'pickupDelivery.consignor.postal'

  async function openShipperAddress() {
    // Collapsed accordion content is aria-hidden, so expand before querying,
    // then reveal the manual-address grid (hydration leaves manualMode false).
    fireEvent.click(screen.getByRole('button', { name: /Pickup and Delivery/ }))
    // Optional: Task 5's hydration fix may leave manualMode already true.
    const manual = screen.queryAllByRole('button', { name: 'Add Location Manually' })[0]
    if (manual) fireEvent.click(manual)
  }

  test('seeded error fields render the category reason; fixing one flips it to Validated', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order Validation Error Resolution' })).toBeTruthy())

    const { getOrderView } = await import('../../../api/services/orderService')
    const values = await getOrderView(ORDER)
    const { deriveValidationErrors } = await import('./validationErrors.js')
    const { errors } = deriveValidationErrors(ORDER, 5, values)
    const missing = errors.find((e) => e.path === FLIP_PATH)
    expect(missing?.reason).toBe('Missing Mandatory')

    await openShipperAddress()
    await waitFor(() => expect(screen.getAllByText(missing.reason).length).toBeGreaterThan(0))

    const input = document.getElementById(`co-${FLIP_PATH.replace(/\./g, '-')}`)
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: '75201' } })
    fireEvent.blur(input)
    const fieldRoot = input.closest('.form-field')
    await waitFor(() => expect(within(fieldRoot).getByText('Validated')).toBeTruthy())
  })
})

describe('resolve mode — alert + accordions', () => {
  test('validation alert lists the open errors with context', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    expect(screen.getByText(/Integrated from ACME/)).toBeTruthy()
    expect(screen.getByText('Validate Errors')).toBeTruthy()
  })

  test('sections with errors show the red error badge', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    expect(screen.getAllByText(/^\d+ Errors?$/).length).toBeGreaterThan(0)
  })

  test('error sections start expanded, error-free sections collapsed', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    // VAL100000 seeds errors in general + pickupDelivery only
    const headers = screen.getAllByRole('button', { name: /General Information|Pickup and Delivery|Product Information|Special Services/ })
    const byName = (re) => headers.find((h) => re.test(h.textContent))
    expect(byName(/General Information/).getAttribute('aria-expanded')).toBe('true')
    expect(byName(/Pickup and Delivery/).getAttribute('aria-expanded')).toBe('true')
    expect(byName(/Product Information/).getAttribute('aria-expanded')).toBe('false')
  })
})

describe('resolve mode — save/purge transition', () => {
  // The row's status is the whole transition: 'Ready For Plan' is outside
  // VALIDATION_ERROR_STATUSES, so the row leaves the Validation Errors tab.
  async function statusOf(orderNumber) {
    const { getOrderList } = await import('../../../api/services/orderService')
    const res = await getOrderList({
      pagination: { pageNumber: 1, pageSize: 50 },
      filters: { orderNumbers: [orderNumber] },
    })
    return res.orders.find((r) => r.orderNumber === orderNumber)?.orderStatus
  }

  test('Purge: confirm modal → status flips to Ready For Plan and navigates back', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    expect(await screen.findByText('Are you sure you want to purge this Order?')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(screen.getByText('orders list')).toBeTruthy())
    expect(await statusOf(ORDER)).toBe('Ready For Plan')
  })

  test('Purge modal Cancel closes without transition', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    expect(await screen.findByText('Are you sure you want to purge this Order?')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Are you sure you want to purge this Order?')).toBeNull())
    expect(screen.queryByText('orders list')).toBeNull()
    expect(await statusOf(ORDER)).toBe('Shipment Failed')
  })

  test('Save is disabled until all errors are resolved', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })
})

describe('resolve mode — direct URL (no history state)', () => {
  test('falls back to the row errorCount instead of 3 (S99 seam closure)', async () => {
    const { getOrderList } = await import('../../../api/services/orderService')
    const res = await getOrderList({
      pagination: { pageNumber: 1, pageSize: 1 },
      filters: { orderNumbers: [ORDER] },
    })
    const rowCount = res.orders[0].errorCount
    // The fixture has to be able to tell the two apart, else the test proves nothing.
    expect(rowCount).not.toBe(3)

    renderResolve(ORDER, null) // direct/refreshed URL — no router state
    await waitFor(() => expect(screen.getByText(`${rowCount} Errors: Validation Required`)).toBeTruthy())
    expect(screen.queryByText(/3 Errors: Validation Required/)).toBeNull()
  })
})

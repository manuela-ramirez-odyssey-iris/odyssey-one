// @vitest-environment jsdom
// LINX-11137 resolve-mode entry: ?resolve=<orderNumber> hydrates the create
// form as the Order Validation Error Resolution view (chrome swap only —
// alert/field states land in later tasks).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Location Manually' })[0])
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
    await waitFor(() => expect(screen.getAllByText('Validated').length).toBeGreaterThan(0))
  })

  test('form body carries the co-resolve lock class', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order Validation Error Resolution' })).toBeTruthy())
    expect(document.querySelector('.co-resolve')).toBeTruthy()
  })
})

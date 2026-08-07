// @vitest-environment jsdom
// Task 5 (orders-fix-round, 2026-08-07): Edit Order breadcrumb must read
// "Orders › Edit order <number>" (falling back to "-" for a number-less/
// pending draftKey, same pattern as View Order). Create Order and Resolve
// mode are regression guards — they must NOT gain a number.
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateOrderRoute from '../../../routes/orders/CreateOrderRoute.jsx'
import { CreateOrderModeProvider } from '../../../contexts/CreateOrderModeContext.jsx'
import { EditModeProvider } from '../../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../../contexts/CustomersContext.jsx'
import { __resetOrderWriteState } from '../../../api/services/orderService'
import ordersFixture from '../../../data/orders.json'

const rows = Array.isArray(ordersFixture) ? ordersFixture : (ordersFixture.orders ?? [])
const NUMBERED_ORDER = rows.find((r) => r.orderNumber)?.orderNumber
const PENDING_ROW = rows.find((r) => !r.orderNumber)

if (!NUMBERED_ORDER) throw new Error('No numbered seeded order — regenerate the fixtures.')
if (!PENDING_ROW) throw new Error('No number-less seeded order — regenerate the fixtures.')

function renderCreate(search = '', state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[{ pathname: '/orders/create', search, state }]}>
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

// The action word ("Edit order" / "Order Validation Error Resolution") is
// also echoed in the PageHeader title, so every assertion is scoped to the
// breadcrumb <nav> to avoid ambiguous getByText matches.
function crumbs() {
  return within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
}

describe('create-flow breadcrumb', () => {
  test('Edit Order: Orders › Edit order <number>', async () => {
    renderCreate(`?draft=${NUMBERED_ORDER}`)
    await waitFor(() => expect(crumbs().getByText(`Edit order ${NUMBERED_ORDER}`)).toBeTruthy())
    expect(crumbs().getByText('Orders')).toBeTruthy()
  })

  test('Edit Order with a pending (number-less) draftKey omits the number', async () => {
    renderCreate(`?draft=pending-${PENDING_ROW.orderId}`)
    await waitFor(() => expect(crumbs().getByText('Edit order')).toBeTruthy())
    expect(crumbs().queryByText('Edit order -')).toBeNull()
  })

  test('Create Order (regression guard): stays "Create new order", no number appended', async () => {
    renderCreate()
    await waitFor(() => expect(crumbs().getByText('Create new order')).toBeTruthy())
    expect(crumbs().queryByText(/Create new order .+/)).toBeNull()
  })

  test('Resolve mode (regression guard): stays "Order Validation Error Resolution"', async () => {
    renderCreate(`?resolve=${NUMBERED_ORDER}`, { errorCount: 1, customer: 'ACME', orderSource: 'Integrated' })
    await waitFor(() => expect(crumbs().getByText('Order Validation Error Resolution')).toBeTruthy())
  })
})

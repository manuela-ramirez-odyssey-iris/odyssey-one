// @vitest-environment jsdom
// Task 5 (orders-fix-round, 2026-08-07): View Order breadcrumb must read
// "Orders › View order <number>", falling back to "-" for number-less
// (pending) orders — same pattern OrderSummaryRoute already uses for the
// order-number strip (OrderSummaryRoute.jsx:32).
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderSummaryRoute from './OrderSummaryRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import ordersFixture from '../../data/orders.json'

const rows = Array.isArray(ordersFixture) ? ordersFixture : (ordersFixture.orders ?? [])
const NUMBERED_ORDER = rows.find((r) => r.orderNumber)?.orderNumber
const PENDING_ROW = rows.find((r) => !r.orderNumber)

if (!NUMBERED_ORDER) throw new Error('No numbered seeded order — regenerate the fixtures.')
if (!PENDING_ROW) throw new Error('No number-less seeded order — regenerate the fixtures.')

function renderSummary(orderId) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[`/orders/${orderId}`]}>
              <Routes>
                <Route path="/orders/:orderId" element={<OrderSummaryRoute />} />
                <Route path="/orders" element={<div>orders list</div>} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('View Order breadcrumb', () => {
  test('renders Orders › View order <number>, number segment marked current', async () => {
    renderSummary(NUMBERED_ORDER)
    await waitFor(() => expect(screen.getByText(`View order ${NUMBERED_ORDER}`)).toBeTruthy())
    expect(screen.getByText('Orders')).toBeTruthy()
    expect(screen.getByText(`View order ${NUMBERED_ORDER}`).getAttribute('aria-current')).toBe('page')
  })

  test('number-less pending order omits the number entirely', async () => {
    renderSummary(`pending-${PENDING_ROW.orderId}`)
    await waitFor(() => expect(screen.getByText('View order')).toBeTruthy())
    // guard the reason for this: a bare "-" reads as a missing value
    expect(screen.queryByText('View order -')).toBeNull()
  })
})

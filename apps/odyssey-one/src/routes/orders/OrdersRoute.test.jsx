// @vitest-environment jsdom
// S113 Task 3 (Fix A): the All tab used to default to `order_number DESC` — a
// lexicographic sort on a TEXT column where letter-prefixed order numbers
// ("VLT-91234") sort above every 13-digit zero-padded number the server mints
// for a blank order number, burying a freshly created order ~page 60. The
// user decision: All defaults to newest-first (created_at DESC); Order Number
// stays available as a user-selectable sort column.
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrdersRoute from './OrdersRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import * as orderService from '../../api/services/orderService'

function renderOrders() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={['/orders']}>
              <Routes>
                <Route path="/orders" element={<OrdersRoute />} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('OrdersRoute — All tab default sort (S113 Task 3, Fix A)', () => {
  test('first-load request sorts by created, desc (newest first)', async () => {
    const spy = vi.spyOn(orderService, 'getOrderList')
    renderOrders()
    await waitFor(() => expect(spy).toHaveBeenCalled())
    const [request] = spy.mock.calls[0]
    expect(request.sort).toEqual({ field: 'created', direction: 'desc' })
  })

  test('Order Number remains a user-selectable sort column', async () => {
    const spy = vi.spyOn(orderService, 'getOrderList')
    renderOrders()
    await waitFor(() => expect(spy).toHaveBeenCalled())

    const sortByOrderNumber = await screen.findByRole('button', { name: 'Sort by Order Number' })
    spy.mockClear()
    sortByOrderNumber.click()

    await waitFor(() => expect(spy).toHaveBeenCalled())
    const [request] = spy.mock.calls[spy.mock.calls.length - 1]
    expect(request.sort).toEqual({ field: 'orderNumber', direction: 'asc' })
  })
})

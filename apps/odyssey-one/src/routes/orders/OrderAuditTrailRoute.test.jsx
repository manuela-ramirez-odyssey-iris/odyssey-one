// @vitest-environment jsdom
// apps/odyssey-one/src/routes/orders/OrderAuditTrailRoute.test.jsx
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderAuditTrailRoute from './OrderAuditTrailRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import ordersFixture from '../../data/orders.json'

const rows = Array.isArray(ordersFixture) ? ordersFixture : (ordersFixture.orders ?? [])
const ORDER = rows.find((r) => r.orderNumber && r.orderStatus === 'Planned Shipment')
if (!ORDER) throw new Error('No Planned Shipment seeded order — regenerate the fixtures.')
const SOURCE_LABEL = ORDER.orderSource === 'MANUAL' ? 'Manual' : 'Integrated'

function renderRoute(orderId) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[`/orders/${orderId}/audit-trail`]}>
              <Routes>
                <Route path="/orders/:orderId/audit-trail" element={<OrderAuditTrailRoute />} />
                <Route path="/orders/:orderId" element={<div>view order page</div>} />
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

describe('OrderAuditTrailRoute', () => {
  test('breadcrumb Orders › <n> Audit Trail, header carries the order, table renders newest-first', async () => {
    renderRoute(ORDER.orderNumber)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Audit Trail' })).toBeTruthy())
    expect(screen.getByText('Orders')).toBeTruthy()
    const crumb = screen.getByText(`${ORDER.orderNumber} Audit Trail`)
    expect(crumb).toBeTruthy()
    expect(crumb.getAttribute('aria-current')).toBe('page')
    expect(screen.getByText(new RegExp(`Order ${ORDER.orderNumber} · ${SOURCE_LABEL} · Created`))).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('table', { name: 'Audit trail' })).toBeTruthy())
    // DataTable renders a separate head <table> (no aria-label) and body
    // <table aria-label="Audit trail"> — this query already scopes to body
    // rows, no head row to slice off.
    const table = screen.getByRole('table', { name: 'Audit trail' })
    const cells = within(table).getAllByRole('row').map((tr) => tr.querySelector('td')?.textContent)
    for (let k = 1; k < cells.length; k++) expect(cells[k] <= cells[k - 1]).toBe(true)
  })

  test('the Orders crumb navigates to the orders list; no title-mode close icon', async () => {
    renderRoute(ORDER.orderNumber)
    await waitFor(() => expect(screen.getByText('Orders')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.click(screen.getByText('Orders'))
    await waitFor(() => expect(screen.getByText('orders list')).toBeTruthy())
  })

  test('unknown order → "Order not found" empty state', async () => {
    renderRoute('NOPE')
    await waitFor(() => expect(screen.getByText('Order not found')).toBeTruthy())
  })

  test('a validation-error order (orderStatus null → derives to []) → "No changes recorded yet"', async () => {
    const ve = rows.find((r) => r.orderNumber && r.orderStatus == null)
    if (!ve) throw new Error('No validation-error seeded order — regenerate the fixtures.')
    renderRoute(ve.orderNumber)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Audit Trail' })).toBeTruthy())
    expect(screen.getByText('No changes recorded yet')).toBeTruthy()
  })
})

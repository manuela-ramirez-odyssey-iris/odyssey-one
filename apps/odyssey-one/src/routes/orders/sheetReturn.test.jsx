// @vitest-environment jsdom
// S158 plan Part 1 §4 — OrdersRoute's return-intent re-application. Same
// harness idea as shipments/sheetReturn.test.jsx: a minimal base/layer split
// (App.jsx's own animation/retention machinery is covered by
// App.sheets.test.jsx) with the REAL OrdersRoute, so it genuinely never
// unmounts across a close from Create — a fake sheet page stands in for it
// (Create/View/Audit Trail are covered by their own route tests; what's under
// test here is OrdersRoute picking the return intent back up).
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import OrdersRoute from './OrdersRoute.jsx'
import useSheet from '../useSheet.js'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import * as orderService from '../../api/services/orderService'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

// Set by the test right before it closes the sheet — read at CLICK time, not
// render time, so the real order number (discovered from the live grid) can
// be threaded in without re-rendering the harness.
let nextCreatedOrder = null

// Stands in for the Create flow's confirmation — a real route, exercised by
// its own tests; here only the return trip through closeSheet matters.
function FakeSheet() {
  const { closeSheet } = useSheet()
  return <button onClick={() => closeSheet('/orders', { state: { createdOrder: nextCreatedOrder } })}>close sheet</button>
}

// Minimal stand-in for App.jsx's base/layer split (S158 §1) — see
// shipments/sheetReturn.test.jsx for the same pattern and why it's enough.
function SheetHarness() {
  const location = useLocation()
  const stack = location.state?.sheetStack ?? []
  const base = stack[0] ?? location
  const layers = stack.length ? [...stack.slice(1), location] : []
  const routes = (loc, key) => (
    <Routes key={key} location={loc}>
      <Route path="/orders" element={<OrdersRoute />} />
      <Route path="/orders/create" element={<FakeSheet />} />
    </Routes>
  )
  return (
    <>
      {routes(base, 'base')}
      {layers.map((loc) => routes(loc, loc.key))}
    </>
  )
}

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={['/orders']}>
              <SheetHarness />
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

describe('OrdersRoute — return-intent re-application (S158 plan §4)', () => {
  test('closing a sheet lands on the STILL-MOUNTED list with the tab and highlight intent applied', async () => {
    const spy = vi.spyOn(orderService, 'getOrderList')
    const { container } = renderApp()
    const heading = await screen.findByRole('heading', { name: 'Orders' })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy.mock.calls.at(-1)[0].tab).toBe('created') // default tab

    // A real order number off the live Created-tab grid, so the highlight
    // check below lands on a row that actually exists.
    const firstRow = container.querySelector('tbody tr')
    nextCreatedOrder = within(firstRow).getAllByRole('cell')[0].textContent

    // Move off Created so the return intent below has something to prove.
    fireEvent.click(screen.getByText(/^Draft/))
    await waitFor(() => expect(spy.mock.calls.at(-1)[0].tab).toBe('draft'))

    // Open the Create sheet and close it the way ConfirmationView does —
    // openSheet/closeSheet, OrdersRoute never unmounts in between.
    fireEvent.click(screen.getByRole('button', { name: 'Create Order' }))
    fireEvent.click(await screen.findByRole('button', { name: 'close sheet' }))

    // The Created tab's query is already cached (staleTime, same as the real
    // app) from the very first load, so the return does NOT re-fire
    // getOrderList — the tab intent is asserted on the rendered Tab instead
    // of the network spy.
    await waitFor(() => expect(screen.getByRole('button', { name: /^Created/ }).getAttribute('aria-pressed')).toBe('true'))
    expect(screen.getByRole('heading', { name: 'Orders' })).toBe(heading) // same DOM node — never remounted
    await waitFor(() => expect(container.querySelector('[data-highlight]')).toBeTruthy())
    expect(container.querySelector('[data-highlight]').textContent).toContain(nextCreatedOrder)
  })
})

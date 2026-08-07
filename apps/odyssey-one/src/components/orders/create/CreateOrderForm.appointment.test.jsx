// @vitest-environment jsdom
// Phase 0 (orders-fix-round, 2026-08-07) — FORM-LEVEL reproduction of the
// reported bug: "I checked the Appointment box on an existing order; on
// reopen it wasn't checked." PickupDeliverySection.appointment.test.jsx only
// exercises the section in isolation with a synchronous manual reset() — it
// never covers the interaction between CreateOrderForm's ASYNC hydration
// effect (draftKey → getDraft/getOrderView → reset()) and the section's
// dirtyFields-gated auto-clear effect. This test mounts the REAL
// CreateOrderForm (via CreateOrderRoute, same provider stack as
// breadcrumb.test.jsx) in edit mode, with getDraft/getOrderView mocked to
// resolve asynchronously (a real macrotask gap, not a synchronous return),
// drives the checkbox by hand, and inspects the OUTBOUND payload produced by
// the real mapFormToOrderInterface on the values actually handed to
// updateOrder — i.e. exactly what would have hit the wire.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateOrderRoute from '../../../routes/orders/CreateOrderRoute.jsx'
import { CreateOrderModeProvider } from '../../../contexts/CreateOrderModeContext.jsx'
import { EditModeProvider } from '../../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../../contexts/CustomersContext.jsx'
import { makeDefaultOrderFormValues } from '../../../api/types/orderFormVm'
import { mapFormToOrderInterface } from '../../../api/mappers/mapFormToOrderInterface'

// ── Controllable hydration + update spy ──────────────────────────────────────
// getDraftImpl/getOrderViewImpl are reassigned per-test; updateOrderSpy
// captures every call so the test can run the REAL mapper on the values that
// were actually about to be written.
let getDraftImpl = async () => null
let getOrderViewImpl = async () => null
const updateOrderSpy = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../api/services/orderService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getDraft: (...args) => getDraftImpl(...args),
    getOrderView: (...args) => getOrderViewImpl(...args),
    updateOrder: (...args) => updateOrderSpy(...args),
  }
})

const ORDER_NUMBER = 'VAL-99001'

function baseOrder({ pickupAppointment = false, deliveryAppointment = false } = {}) {
  const v = makeDefaultOrderFormValues()
  v.general.orderNumber = ORDER_NUMBER
  v.general.owningOrganization = 'ACME'
  v.pickupDelivery.pickupAppointment = pickupAppointment
  v.pickupDelivery.latePickup = { date: '08/10/2026', time: '14:00', timezone: 'CDT' }
  v.pickupDelivery.deliveryAppointment = deliveryAppointment
  v.pickupDelivery.lateDelivery = { date: '08/12/2026', time: '09:00', timezone: 'CDT' }
  return v
}

// A deferred promise gives the test control over exactly when hydration
// "arrives" — required for Scenario C (click before the async gap closes).
function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function renderEdit() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={[{ pathname: '/orders/create', search: `?draft=${ORDER_NUMBER}` }]}>
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

function crumbs() {
  return within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
}

async function waitForHydration(dateText) {
  await waitFor(() => expect(crumbs().getByText(`Edit order ${ORDER_NUMBER}`)).toBeTruthy())
  await waitFor(() => expect(screen.getByDisplayValue(dateText)).toBeTruthy())
}

function expandPickupDelivery() {
  const header = screen.getByRole('button', { name: /Pickup and Delivery/ })
  fireEvent.click(header)
}

const apptCheckboxes = () => screen.getAllByRole('checkbox', { name: 'Appointment' })

async function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(updateOrderSpy).toHaveBeenCalledTimes(1))
}

function outboundFlags() {
  const [, values] = updateOrderSpy.mock.calls[0]
  const { manualOrder } = mapFormToOrderInterface(values)
  const flag = (name) => manualOrder.userFieldList.find((f) => f.name === name)?.value
  return { pickup: flag('PICKUP_APPOINTMENT'), delivery: flag('DELIVERY_APPOINTMENT') }
}

beforeEach(() => {
  updateOrderSpy.mockClear()
  getDraftImpl = async () => null // matches the grid-row Edit path (evidence: fallback to getOrderView)
})
afterEach(cleanup)

describe('Phase 0 repro: appointment checkbox across async hydration (form level)', () => {
  test('Scenario A — check after hydration settles, submit → PICKUP_APPOINTMENT=Y', async () => {
    getOrderViewImpl = async () => {
      await new Promise((r) => setTimeout(r, 20)) // real macrotask gap
      return baseOrder({ pickupAppointment: false })
    }
    renderEdit()
    await waitForHydration('08/10/2026')
    expandPickupDelivery()
    fireEvent.click(apptCheckboxes()[0])
    expect(apptCheckboxes()[0].checked).toBe(true)
    await clickSave()
    expect(outboundFlags().pickup).toBe('Y')
  })

  test('Scenario B — vice versa: uncheck after hydration, submit → PICKUP_APPOINTMENT=N', async () => {
    getOrderViewImpl = async () => {
      await new Promise((r) => setTimeout(r, 20))
      return baseOrder({ pickupAppointment: true })
    }
    renderEdit()
    await waitForHydration('08/10/2026')
    expandPickupDelivery()
    expect(apptCheckboxes()[0].checked).toBe(true)
    fireEvent.click(apptCheckboxes()[0])
    expect(apptCheckboxes()[0].checked).toBe(false)
    await clickSave()
    expect(outboundFlags().pickup).toBe('N')
  })

  test('Scenario C — click immediately on mount (disabled, before hydration lands) then hydrate + submit', async () => {
    const gate = deferred()
    getOrderViewImpl = () => gate.promise.then(() => baseOrder({ pickupAppointment: false }))
    renderEdit()
    expandPickupDelivery()
    // Pre-hydration: default values have no latePickup date/time → checkbox
    // is disabled. NOTE: jsdom's fireEvent.click does NOT honor `disabled` the
    // way a real browser does — it still flips the raw DOM `.checked` via the
    // native activation behavior (verified in isolation; a real browser would
    // no-op entirely). So the meaningful assertion isn't the DOM value right
    // after this click — it's whether the click leaked into RHF's controlled
    // state and survives hydration. React re-asserts the controlled `checked`
    // prop on the next render (hydration's reset()), which is what we check.
    const preHydrationBox = apptCheckboxes()[0]
    expect(preHydrationBox.disabled).toBe(true)
    fireEvent.click(preHydrationBox)
    gate.resolve()
    await waitForHydration('08/10/2026')
    expect(apptCheckboxes()[0].checked).toBe(false) // hydrated value (false), untouched by the early click
    await clickSave()
    expect(outboundFlags().pickup).toBe('N')
  })

  test('Scenario D — auto-clear still fires on a genuine user edit to Latest Pickup (ORD-06 intent)', async () => {
    getOrderViewImpl = async () => {
      await new Promise((r) => setTimeout(r, 20))
      return baseOrder({ pickupAppointment: true })
    }
    renderEdit()
    await waitForHydration('08/10/2026')
    expandPickupDelivery()
    expect(apptCheckboxes()[0].checked).toBe(true)
    const dateInput = screen.getByDisplayValue('08/10/2026')
    fireEvent.change(dateInput, { target: { value: '08/15/2026' } })
    fireEvent.blur(dateInput)
    await waitFor(() => expect(apptCheckboxes()[0].checked).toBe(false))
    await clickSave()
    expect(outboundFlags().pickup).toBe('N')
  })

  test('Scenario E (R2-6 itself) — hydrate flag TRUE, edit an unrelated field, submit → flag stays Y', async () => {
    getOrderViewImpl = async () => {
      await new Promise((r) => setTimeout(r, 20))
      return baseOrder({ pickupAppointment: true })
    }
    renderEdit()
    await waitForHydration('08/10/2026')
    expandPickupDelivery()
    expect(apptCheckboxes()[0].checked).toBe(true)
    // Unrelated edit: General Information's Equipment Reference Number field
    // (behind the section's own "Add More Details" expander). General
    // Information starts expanded by default (CreateOrderForm's initial
    // `expanded` state) — no accordion click needed here.
    fireEvent.click(screen.getByRole('button', { name: 'Add More Details' }))
    const refInput = document.getElementById('co-general-equipmentReferenceNumber')
    expect(refInput).toBeTruthy()
    fireEvent.change(refInput, { target: { value: 'EQ-REF-999' } })
    fireEvent.blur(refInput)
    expect(apptCheckboxes()[0].checked).toBe(true) // unrelated edit must not clear it
    await clickSave()
    expect(outboundFlags().pickup).toBe('Y')
  })
})

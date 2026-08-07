// @vitest-environment jsdom
// orders-fix-round Task 4 (2026-08-07) — end-to-end (real DOM) coverage for
// Save for Later in LIVE mode, the branch orderServiceWrite.test.ts cannot
// see (it hard-pins getApiMode to 'mock'). This file stubs VITE_API_MODE and
// mocks the HTTP layer only (global fetch), so CreateOrderForm's real
// saveGateSchema / saveDraft / apiPost / apiPut code all run for real.
//
// GeneralInformationSection is replaced with a minimal stub. Its real
// Customer field is an async, virtualized ComboBox
// (FieldSearchResults.jsx: "the populated list is ALWAYS virtualized via
// @tanstack/react-virtual ... jsdom sees 0 rows" — a documented ceiling, not
// a workaround-able one), so there's no row to click or select in jsdom.
// The stub renders a plain input bound to the SAME RHF field
// (general.owningOrganization) via the SAME useFormContext CreateOrderForm
// provides — everything downstream of that field (passesSaveGate,
// saveDraftMutation, the real orderService.saveDraft, apiPost/apiPut,
// onError handling) is exercised for real, unmocked.
//
// Covers, from the UI down:
//  1) Save for Later with a BLANK Order Number passes the save gate (no gate
//     error, the POST actually fires).
//  2) First live save POSTs to /order-service/v3/manual-order and adopts the
//     server-generated order number (shown in the success notice).
//  3) The SECOND save on the same open form PUTs /order-service/v3/order
//     (does not re-POST) and does not error.
//  4) A real server error message (not the generic string) reaches the user.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'
import CreateOrderForm from './CreateOrderForm.jsx'
import { CreateOrderModeProvider } from '../../../contexts/CreateOrderModeContext.jsx'

vi.mock('./sections/GeneralInformationSection.jsx', () => ({
  default: function GeneralInformationSectionStub() {
    const { register } = useFormContext()
    return <input aria-label="Customer stub" {...register('general.owningOrganization')} />
  },
}))

const SERVER_ORDER_NUMBER = '0000000090001'

function renderCreate() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CreateOrderModeProvider>
        <MemoryRouter initialEntries={['/orders/create']}>
          <CreateOrderForm draftKey={null} resolveKey={null} onSubmitted={() => {}} />
        </MemoryRouter>
      </CreateOrderModeProvider>
    </QueryClientProvider>,
  )
}

function fillCustomer() {
  const input = screen.getByLabelText('Customer stub')
  fireEvent.change(input, { target: { value: 'ERCO_SYS_01' } })
  fireEvent.blur(input)
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}

beforeEach(() => {
  vi.stubEnv('VITE_API_MODE', 'live')
  vi.stubEnv('VITE_API_BASE_URL', '')
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

// Generic safe responder for any request this test doesn't care about
// (e.g. background chrome/queries) — avoids unhandled-rejection noise from
// unrelated live-mode fetches this render tree might also trigger.
function genericOk() {
  return { ok: true, status: 200, json: async () => ({}) }
}

describe('Save for Later — live mode, real DOM (orders-fix-round Task 4)', () => {
  test('blank Order Number: first Save POSTs, adopts the server order number; second Save PUTs, no error', async () => {
    const postBodies = []
    const putBodies = []
    const fetchMock = vi.fn(async (url, init = {}) => {
      const method = init.method ?? 'GET'
      if (typeof url === 'string' && url.endsWith('/order-service/v3/manual-order') && method === 'POST') {
        postBodies.push(JSON.parse(init.body))
        return {
          ok: true, status: 200,
          json: async () => ({
            orderId: 90001,
            success: true,
            message: `Order ${SERVER_ORDER_NUMBER} created successfully`,
            data: { orderNumber: SERVER_ORDER_NUMBER, orderDate: '2026-08-07T00:00:00.000Z', orderDateTimeZoneCode: 'EST', shipmentMode: 'Ground' },
          }),
        }
      }
      if (typeof url === 'string' && url.endsWith('/order-service/v3/order') && method === 'PUT') {
        putBodies.push(JSON.parse(init.body))
        return { ok: true, status: 200, json: async () => ({ success: true, orderNumber: JSON.parse(init.body).orderNumber }) }
      }
      return genericOk()
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCreate()
    fillCustomer() // Owning Organization filled; Order Number left BLANK on purpose

    // No gate error should appear before saving (requirement 1: blank Order
    // Number does not block the gate).
    expect(screen.queryByText(/is required to save this order/)).toBeNull()

    clickSave()
    await waitFor(() => expect(postBodies).toHaveLength(1))
    expect(postBodies[0].manualOrder.orderNumber).toBeUndefined() // truly blank — the normal path (mapper omits it)
    await screen.findByText(`Draft saved (${SERVER_ORDER_NUMBER}). It stays open here and appears on the Orders grid.`)

    clickSave()
    await waitFor(() => expect(putBodies).toHaveLength(1))
    expect(postBodies).toHaveLength(1) // still just the one POST — no re-POST / no 409
    expect(putBodies[0].orderNumber).toBe(SERVER_ORDER_NUMBER)
    await screen.findByText(`Draft saved (${SERVER_ORDER_NUMBER}). It stays open here and appears on the Orders grid.`)
    expect(screen.queryByText("Couldn't save the draft. Please try again.")).toBeNull()
  })

  test('a real server error message reaches the user instead of the generic string', async () => {
    const fetchMock = vi.fn(async (url, init = {}) => {
      const method = init.method ?? 'GET'
      if (typeof url === 'string' && url.endsWith('/order-service/v3/manual-order') && method === 'POST') {
        return { ok: false, status: 400, json: async () => ({ message: 'Unknown customer: ERCO_SYS_01', detail: 'FK violation' }) }
      }
      return genericOk()
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCreate()
    fillCustomer()
    clickSave()

    await screen.findByText('Unknown customer: ERCO_SYS_01')
    expect(screen.queryByText("Couldn't save the draft. Please try again.")).toBeNull()
  })
})

// @vitest-environment jsdom
// LINX-11137 resolve mode: ?resolve=<orderNumber> hydrates the create form as
// the Order Validation Error Resolution view — chrome, seeded field states,
// Alert wiring, and the Save/Purge transition.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateOrderRoute from '../../../routes/orders/CreateOrderRoute.jsx'
import CreateOrderForm from '../create/CreateOrderForm.jsx'
import { CreateOrderModeProvider } from '../../../contexts/CreateOrderModeContext.jsx'
import { EditModeProvider } from '../../../contexts/EditModeContext.jsx'
import { CustomersProvider } from '../../../contexts/CustomersContext.jsx'
import { __resetOrderWriteState } from '../../../api/services/orderService'
import { deriveValidationErrors } from './validationErrors'
import ordersFixture from '../../../data/orders.json'

// The order under test is DERIVED from the fixture, not hardcoded. Any change
// to tools/generate.mjs reshuffles the faker stream and re-rolls every seeded
// value, which used to invalidate a pinned order number on every generator
// edit (re-pinned in S100, S101, and twice on 2026-07-30 before this).
// Criteria = exactly what the assertions below need:
//   errorCount 5 · orderStatus null (ORD-24: VE never entered the lifecycle)
//   · draftOrderStatus Error · interfaceErrorCount 0 (opens straight at Step 2)
//   seeded errors spanning general.* AND consignor.postal (the flip field)
const FLIP_PATH = 'pickupDelivery.consignor.postal'
const ORDER = (() => {
  const rows = Array.isArray(ordersFixture) ? ordersFixture : (ordersFixture.orders ?? [])
  const hit = rows.find((r) => {
    if (r.errorCount !== 5 || r.orderStatus !== null || r.draftOrderStatus !== 'Error'
      || (r.interfaceErrorCount ?? 0) !== 0) return false
    const paths = deriveValidationErrors(r.orderNumber, 5, {}).errors.map((e) => e.path)
    return paths.includes(FLIP_PATH) && paths.some((p) => p.startsWith('general.'))
  })
  if (!hit) throw new Error('No seeded order matches the resolve-test criteria — regenerate the fixtures.')
  return hit.orderNumber
})()

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

// S145: ResolveShell paints the title/sub-heading/back link (CreateOrderForm
// renders Step 2 with hideHeader), so these assertions moved owner without
// moving text. The heading appears BEFORE the order loads — tests that need
// the form on screen wait for the footer, not the title.
describe('resolve mode — chrome', () => {
  test('renders the resolution title, order-number sub-heading, and back link', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order Validation Error Resolution' })).toBeTruthy())
    expect(screen.getByText(`Order Number ${ORDER}`)).toBeTruthy()
    expect(screen.getByText('Back to overview page')).toBeTruthy()
  })

  test('footer shows Cancel / Purge / Save (no Create Order button)', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create Order' })).toBeNull()
  })
})

describe('resolve mode — fields', () => {
  // ORDER is selected so its seeded errors always span general.* plus
  // consignor postal. Postal is a plain typable input, so it's the one the
  // flip assertion drives (FLIP_PATH is module-scope — it also selects ORDER).

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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())

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

  test('non-pool fields are disabled; pool fields stay enabled', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())

    // Order Number is never in the error pool → real disabled prop locks it.
    const orderNumber = document.getElementById('co-general-orderNumber')
    expect(orderNumber).toBeTruthy()
    expect(orderNumber.disabled).toBe(true)

    // Postal (a guaranteed seeded error for ORDER) is in the pool → resolveFieldProps
    // re-enables it (disabled: false spread last).
    await openShipperAddress()
    const postal = document.getElementById(`co-${FLIP_PATH.replace(/\./g, '-')}`)
    await waitFor(() => expect(postal).toBeTruthy())
    expect(postal.disabled).toBe(false)
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
    // The pool only spans general.* + pickupDelivery.*, so Product is error-free
    const headers = screen.getAllByRole('button', { name: /General Information|Pickup and Delivery|Product Information|Special Services/ })
    const byName = (re) => headers.find((h) => re.test(h.textContent))
    expect(byName(/General Information/).getAttribute('aria-expanded')).toBe('true')
    expect(byName(/Pickup and Delivery/).getAttribute('aria-expanded')).toBe('true')
    expect(byName(/Product Information/).getAttribute('aria-expanded')).toBe('false')
  })
})

describe('resolve mode — save/purge transition', () => {
  // ORD-24: the transition is the status flip AND losing the VE marker
  // (draftOrderStatus) in the same write — that marker IS the Validation
  // Errors population predicate now, so the row leaves that tab and lands in
  // Created only because both change together.
  async function statusOf(orderNumber) {
    const { getOrderList } = await import('../../../api/services/orderService')
    const res = await getOrderList({
      pagination: { pageNumber: 1, pageSize: 50 },
      filters: { orderNumbers: [orderNumber] },
    })
    return res.orders.find((r) => r.orderNumber === orderNumber)?.orderStatus
  }

  // S145 / Task 8 ruling: Purge is NO LONGER the same write as Save. It calls
  // purgeOrder, a tombstone that removes the row from every list and count —
  // it does not flip the order to a lifecycle status ('Cancelled' would have
  // been indistinguishable from a genuine cancel a user can Restore from).
  test('Purge: confirm modal → the row is purged out of the list and navigates back', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    expect(await screen.findByText('Are you sure you want to purge this Order?')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(screen.getByText('orders list')).toBeTruthy())
    expect(await statusOf(ORDER)).toBeUndefined() // gone, not restatused
  })

  test('Purge modal Cancel closes without transition', async () => {
    renderResolve()
    await waitFor(() => expect(screen.getByText(/5 Errors: Validation Required/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    expect(await screen.findByText('Are you sure you want to purge this Order?')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Are you sure you want to purge this Order?')).toBeNull())
    expect(screen.queryByText('orders list')).toBeNull()
    // Unchanged: still a VE row (orderStatus null — ORD-24, it never entered
    // the lifecycle) until Purge is actually confirmed.
    expect(await statusOf(ORDER)).toBe(null)
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

// ── S145: embedded as Step 2 of the two-step resolution (LINX-16049) ──
// ResolveShell (Task 10) renders this form with its own chrome hidden and the
// Step 1 picks handed down. Rendered directly here — the shell doesn't exist yet.
function renderEmbedded(props = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <EditModeProvider>
        <CreateOrderModeProvider>
          <CustomersProvider>
            <MemoryRouter initialEntries={['/orders/create']}>
              <Routes>
                <Route path="/orders/create" element={
                  <CreateOrderForm resolveKey={ORDER} resolveMeta={{ errorCount: 5, customer: 'ACME' }} {...props} />
                } />
                <Route path="/orders" element={<div>orders list</div>} />
              </Routes>
            </MemoryRouter>
          </CustomersProvider>
        </CreateOrderModeProvider>
      </EditModeProvider>
    </QueryClientProvider>,
  )
}

describe('resolve mode — embedded in ResolveShell (S145)', () => {
  const PICKED = 'general.shipDirection'

  test('hideHeader suppresses the title + sub-heading, keeps the breadcrumb', async () => {
    renderEmbedded({ hideHeader: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Order Validation Error Resolution' })).toBeNull()
    expect(screen.queryByText(`Order Number ${ORDER}`)).toBeNull()
    expect(screen.queryByText('Back to overview page')).toBeNull()
    // breadcrumb survives — it is the app chrome, not the step's header
    expect(screen.getByText('Order Validation Error Resolution')).toBeTruthy()
  })

  test('a picked path is excluded from the Level 2 seeding and renders locked + Validated', async () => {
    renderEmbedded({ hideHeader: true, pickedPaths: [PICKED] })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())
    const input = document.getElementById('co-general-shipDirection')
    await waitFor(() => expect(input).toBeTruthy())
    const root = input.closest('.form-field') ?? input.parentElement.parentElement
    await waitFor(() => expect(within(root).getByText('Validated')).toBeTruthy())
    expect(input.disabled).toBe(true) // Step 1 decided it — not re-editable here
    // and it is NOT one of the seeded Step 2 errors
    expect(screen.queryByText(/6 Errors: Validation Required/)).toBeNull()
  })

  test('onResolved / onPurged hand control back to the shell instead of navigating', async () => {
    const onPurged = vi.fn()
    renderEmbedded({ hideHeader: true, onPurged })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(onPurged).toHaveBeenCalled())
    expect(screen.queryByText('orders list')).toBeNull()
  })

  // purgeOrder THROWS in live mode (Q-OIF-4). A silent catch left the planner
  // looking at an unchanged screen — the failure must be visible.
  test('a failed purge surfaces an error Alert and stays on the form', async () => {
    const svc = await import('../../../api/services/orderService')
    const spy = vi.spyOn(svc, 'purgeOrder').mockRejectedValue(new Error('Purge is not supported in live mode'))
    try {
      renderEmbedded({ hideHeader: true })
      await waitFor(() => expect(screen.getByRole('button', { name: 'Purge' })).toBeTruthy())
      fireEvent.click(screen.getByRole('button', { name: 'Purge' }))
      fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yes' }))
      expect(await screen.findByText(/Couldn't purge order/)).toBeTruthy()
      expect(screen.getByText(/not supported in live mode/)).toBeTruthy()
      expect(screen.queryByText('orders list')).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })
})

// ── S145 / Task 10: ResolveShell — the whole two-step page ──
// Order picking is DERIVED, never pinned: a generator edit re-rolls every
// seeded id (feedback_seeded_ids_are_load_bearing).
const ALL_ROWS = Array.isArray(ordersFixture) ? ordersFixture : (ordersFixture.orders ?? [])
const findOrder = (pred, what) => {
  const hit = ALL_ROWS.find(pred)
  if (!hit) throw new Error(`No seeded order matches ${what} — regenerate the fixtures.`)
  return hit
}
const isVE = (r) => r.draftOrderStatus === 'Error'
const L1_CONFLICT = findOrder(
  (r) => isVE(r) && r.interfaceErrorClass === 'conflict' && r.interfaceErrorCount === 1 && r.errorCount <= 3,
  'a single-conflict Level 1 order',
)
const L1_UNRESOLVABLE = findOrder((r) => isVE(r) && r.interfaceErrorClass === 'unresolvable', 'an unresolvable Level 1 order')
const L1_DELETE_FLAG = findOrder((r) => isVE(r) && r.interfaceErrorClass === 'delete-flag', 'a delete-flag Level 1 order')
const L1_MIXED = findOrder(
  (r) => isVE(r) && r.interfaceErrorClass === 'mixed' && r.interfaceErrorCount >= 2,
  'a mixed (conflict + structural) Level 1 order',
)
// No Level 1 errors AND exactly one Level 2 error, on a PLAIN TEXT field.
// Both constraints are about reachability in jsdom: the equipment / freight
// term / ship direction ComboBoxes are `typable={false}`, so a fireEvent.change
// on them never reaches RHF (project_jsdom_test_ceilings). Shipper Address 1 is
// a FormField — change + blur commits.
const STEP3_PATH = 'pickupDelivery.consignor.address1'
const NO_L1 = findOrder((r) => {
  if (!isVE(r) || (r.interfaceErrorCount ?? 0) !== 0 || r.errorCount !== 1) return false
  const paths = deriveValidationErrors(r.orderNumber, r.errorCount, {}).errors.map((e) => e.path)
  return paths.length === 1 && paths[0] === STEP3_PATH
}, 'a Level-2-only order whose single error is Shipper Address 1')

const stateFor = (r) => ({
  errorCount: r.errorCount,
  interfaceErrorCount: r.interfaceErrorCount,
  interfaceErrorClass: r.interfaceErrorClass,
  customer: 'ACME',
  orderSource: 'Integrated',
})
const timeline = () => screen.getByRole('list', { name: 'Resolution progress' })
const stepEl = (label) => within(timeline()).getByText(label).closest('.resolve-timeline__step')
// One chip per conflict = the first PillTab in each picker group. Matching on
// the chip's TEXT is not viable: Step1Panel relabels wire codes (freightTerm
// 'P' renders "Pre-Paid"), so the derived option value is not on screen.
const pickEveryConflict = () => {
  for (const group of document.querySelectorAll('.conflict-picker')) {
    fireEvent.click(within(group).getAllByRole('button')[0])
  }
}

describe('two-step resolution shell (LINX-16049 + 11137)', () => {
  test('order with Level 1 errors opens at Step 1; dot 2 is locked and Purge is absent', async () => {
    renderResolve(L1_CONFLICT.orderNumber, stateFor(L1_CONFLICT))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    expect(stepEl('Data errors').className).toContain('resolve-timeline__step--locked')
    expect(within(timeline()).getByText('locked')).toBeTruthy()
    // Purge is a Step 2 action (PO ruling) — Step 1 offers Cancel + Validate only.
    expect(screen.queryByRole('button', { name: 'Purge' })).toBeNull()
    // exactly one page title, even though the form also knows how to render one
    expect(screen.getAllByRole('heading', { name: 'Order Validation Error Resolution' })).toHaveLength(1)
  })

  test('no Level 1 errors → opens at Step 2, dot 1 passed, look-back shows the empty Step 1', async () => {
    renderResolve(NO_L1.orderNumber, stateFor(NO_L1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    expect(within(timeline()).getByText('no errors')).toBeTruthy()
    fireEvent.click(within(timeline()).getByRole('button', { name: /Message errors/ }))
    expect(screen.getByText('No message errors were found for this order.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
  })

  test('unresolvable message-control error keeps Validate disabled', async () => {
    renderResolve(L1_UNRESOLVABLE.orderNumber, stateFor(L1_UNRESOLVABLE))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Message rejected by the integration — contact support.')).toBeTruthy()
  })

  test('pick → Validate and continue → Step 2; the row loses its Level 1 errors; dot 1 re-opens read-only', async () => {
    renderResolve(L1_CONFLICT.orderNumber, stateFor(L1_CONFLICT))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    pickEveryConflict()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    expect(within(timeline()).getByText(/passed/)).toBeTruthy()

    // Step 1 SAVES immediately (Ramesh 2026-09-10 #2) — the row's Level 1 count is cleared.
    const { getOrderList } = await import('../../../api/services/orderService')
    const res = await getOrderList({ pagination: { pageNumber: 1, pageSize: 1 }, filters: { orderNumbers: [L1_CONFLICT.orderNumber] } })
    expect(res.orders[0].interfaceErrorCount).toBe(0)

    // look-back: the pick is shown, validated, and not editable
    fireEvent.click(within(timeline()).getByRole('button', { name: /Message errors/ }))
    expect(screen.getAllByText('Validated').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Validate and continue' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enter another value' })).toBeNull()
  })

  // AMENDMENT (Task 7 review #1): the shell must hand back structuralFixes and
  // deleteFlag too, not just picks. Step1Panel seeds those from LOCAL state at
  // mount and the shell unmounts it on a step change, so a picks-only look-back
  // paints the Structural accordion RED on a step the timeline calls "passed".
  test('look-back keeps the structural fix as well as the picks', async () => {
    renderResolve(L1_MIXED.orderNumber, stateFor(L1_MIXED))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    pickEveryConflict()
    // The structural fault: a timezone select, an extra schedule, or a weight.
    const tz = document.querySelector('.structural-grid select')
    if (tz) fireEvent.change(tz, { target: { value: tz.options[1].value } })
    const trash = document.querySelector('.structural-grid .co-rep__trash')
    if (trash) fireEvent.click(trash)
    const weight = document.querySelector('.structural-grid input[type="text"], .structural-grid input:not([type])')
    if (weight && !tz && !trash) {
      const target = within(document.querySelector('.structural-grid')).getByText(/^\d/)
      fireEvent.change(weight, { target: { value: target.textContent.trim() } })
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())

    fireEvent.click(within(timeline()).getByRole('button', { name: /Message errors/ }))
    // NO red badge on a passed step: every accordion reports completed, not "N Errors".
    expect(screen.queryByText(/^\d+ Errors?$/)).toBeNull()
  })

  // Same amendment, the other half of the state: deleteFlag is Step1Panel's
  // local state too, so the look-back must be told the planner's answer.
  test('look-back keeps the delete-flag answer', async () => {
    renderResolve(L1_DELETE_FLAG.orderNumber, stateFor(L1_DELETE_FLAG))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Validate and continue' })).toBeTruthy())
    expect(screen.getByText('Not answered yet')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /this message creates an order/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Validate and continue' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())

    fireEvent.click(within(timeline()).getByRole('button', { name: /Message errors/ }))
    expect(screen.queryByText('Not answered yet')).toBeNull()
    expect(screen.getByRole('radio', { name: /this message creates an order/ }).checked).toBe(true)
  })

  test('Step 2 Save with everything resolved → Step 3 preview, all three dots on', async () => {
    renderResolve(NO_L1.orderNumber, stateFor(NO_L1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Pickup and Delivery/ }))
    const manual = screen.queryAllByRole('button', { name: 'Add Location Manually' })[0]
    if (manual) fireEvent.click(manual)
    const input = document.getElementById(`co-${STEP3_PATH.replace(/\./g, '-')}`)
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: '123 Main St' } })
    fireEvent.blur(input)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Back to overview' })).toBeTruthy())
    expect(within(timeline()).getByText('ready for planning')).toBeTruthy()
    expect(timeline().querySelectorAll('.step-indicator--on').length).toBe(3)
    // Step 3 is the SUCCESS state straight away — no async-assignment pending alert.
    expect(screen.getByText('Your order was created successfully.')).toBeTruthy()
  })
})

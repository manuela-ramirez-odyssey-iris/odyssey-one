// @vitest-environment jsdom
// Consolidate mode (S154) end-to-end through the real ShipmentsRoute + mock
// grid service. Same harness as tabOrderPersistence.test.jsx.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'
import { shipmentsSearchAdapter } from '../../search/shipments'

beforeEach(() => {
  __clearMockPreferences()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function ReviewProbe() {
  const { state } = useLocation()
  return <div data-testid="review-probe">{JSON.stringify(state?.rows?.map((r) => r.id) ?? null)}</div>
}

function renderRoute(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/review" element={<ReviewProbe />} />
            <Route path="/shipments/*" element={<ShipmentsRoute />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const rowBoxes = () => screen.queryAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Select ') && !c.getAttribute('aria-label').startsWith('Select all'))
const enabledRowBoxes = () => rowBoxes().filter((c) => !c.disabled)

async function enterMode() {
  fireEvent.click(await screen.findByRole('button', { name: 'Consolidate' }))
  await screen.findByRole('heading', { name: 'Shipments Consolidation' })
}

describe('consolidate mode', () => {
  test('entering swaps the chrome: title, buttons, checkboxes, no Export/toggle/actions', async () => {
    renderRoute()
    expect(await screen.findByRole('heading', { name: 'Shipments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    await enterMode()
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Shipment actions' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Consolidate 0 Shipments' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    await waitFor(() => expect(rowBoxes().length).toBeGreaterThan(0))
    expect(document.querySelector('.sidebar--hidden')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search in Shipments')).toBeTruthy()
  })

  test('first check locks the customer: badge row, placeholder; unchecking releases', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    const label = enabledRowBoxes()[0].getAttribute('aria-label')
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    expect(await screen.findByText('Selected Customer:')).toBeTruthy()
    // S154: the lock is now a committed filter CHIP, not just placeholder
    // copy — once it's in the bar, GlobalSearch's own chip-vs-placeholder
    // rule (`chips.length ? '' : placeholder`) hides the placeholder behind
    // it, same as any other committed chip. The chip is the visible signal.
    fireEvent.focus(screen.getByRole('combobox'))
    expect(document.querySelector('.global-search-chip')?.textContent).toContain('Customer ID')
    expect(screen.getByRole('button', { name: 'Consolidate 1 Shipments' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    await waitFor(() => expect(screen.queryByText('Selected Customer:')).toBeNull())
    expect(screen.getByPlaceholderText('Search in Shipments')).toBeTruthy()
  })

  test('two selected enables the primary; proceeding hands the rows to the review route', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(1))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    await waitFor(() => expect(enabledRowBoxes().filter((c) => !c.checked).length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes().filter((c) => !c.checked)[0])
    const go = await screen.findByRole('button', { name: 'Consolidate 2 Shipments' })
    expect(go.disabled).toBe(false)
    fireEvent.click(go)
    const probe = await screen.findByTestId('review-probe')
    expect(JSON.parse(probe.textContent)).toHaveLength(2)
  })

  test('Cancel restores the normal chrome and clears the selection', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('heading', { name: 'Shipments' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    expect(screen.queryByText('Selected Customer:')).toBeNull()
    expect(rowBoxes()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Consolidate' }))
    expect(await screen.findByRole('button', { name: 'Consolidate 0 Shipments' })).toBeTruthy()
  })

  test('Cancel restores the sort and view mode the planner had before entering', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Switch to widgets view, which the mode hides and forces back to pills.
    const toggle = document.querySelector('.button-toggle')
    const widgets = toggle && within(toggle).getAllByRole('button')[1]
    if (widgets) fireEvent.click(widgets)
    const before = document.querySelector('.button-toggle')?.innerHTML
    await enterMode()
    expect(document.querySelector('.button-toggle')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(document.querySelector('.button-toggle')).toBeTruthy())
    expect(document.querySelector('.button-toggle')?.innerHTML).toBe(before)
  })

  test('the selection survives the first checkbox click without losing mode state', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Widgets view is the "prior" state the snapshot must carry past a
    // checkbox click — a spread bug in handleSelectionChange would drop it.
    const toggle = document.querySelector('.button-toggle')
    const widgets = toggle && within(toggle).getAllByRole('button')[1]
    if (widgets) fireEvent.click(widgets)
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    const toggleAfter = await waitFor(() => {
      const el = document.querySelector('.button-toggle')
      if (!el) throw new Error('toggle not back yet')
      return el
    })
    const widgetsAfter = within(toggleAfter).getAllByRole('button')[1]
    expect(widgetsAfter.getAttribute('aria-pressed')).toBe('true')
  })

  test('location.state.consolidate re-enters the mode with the selection', async () => {
    const rows = [
      { id: 'a', sellShipment: 'a', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
      { id: 'b', sellShipment: 'b', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
    ]
    renderRoute({ consolidate: { rows } })
    expect(await screen.findByRole('heading', { name: 'Shipments Consolidation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Consolidate 2 Shipments' }).disabled).toBe(false)
    expect(screen.getByText('Selected Customer:')).toBeTruthy()
    expect(screen.getByText('Valtris')).toBeTruthy()
  })
})

// S154 — the customer lock is now a real, visible filter chip committed
// through the normal criteria pipeline (ShipmentsGlobalSearch's `lockedChip`
// prop), not a private `effectiveCustomerIds` query override. These tests
// drive the REAL search bar the way a planner would: two real customer ids
// (KEMIRA_NA_01, KEMIRA_EU_01 — both already in the navbar Customers
// popover's default selection, so the first-order customer scope doesn't
// zero them out, and both carry enough Direct, non-tendered rows to be
// checkable) typed as a code list resolve, via the adapter's real
// GS-21 "What is it?" suggestion, to ONE committed `customer-id` chip whose
// queryValue is the two-value IN-list ("Customer ID: A, B") — the only way
// this app represents "a customer filter of several customers" today.
describe('consolidate mode — the customer lock is a committed filter chip (S154)', () => {
  const CUSTOMER_A = 'KEMIRA_NA_01'
  const CUSTOMER_B = 'KEMIRA_EU_01'
  const TWO_CUSTOMER_LABEL = `Customer ID: ${CUSTOMER_A}, ${CUSTOMER_B}`

  function suggestionChip(text) {
    return [...document.querySelectorAll('.filter-suggestions__chip')].find((el) => el.textContent === text)
  }

  async function commitTwoCustomerFilter() {
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: `${CUSTOMER_A}, ${CUSTOMER_B}` } })
    const chip = await waitFor(() => {
      const el = suggestionChip(TWO_CUSTOMER_LABEL)
      if (!el) throw new Error('set-type suggestion not up yet')
      return el
    })
    fireEvent.click(chip)
    fireEvent.keyDown(input, { key: 'Enter' })
    // commitQuery() closes the panel — wait for it so the next focus() below
    // reopens a settled bar instead of racing the close.
    await waitFor(() => expect(screen.queryByText('Customers & Parties')).toBeNull())
    // Pre-existing GS-18 quirk, unrelated to S154: the PGI/PGR panel's
    // fallback demo counts (PGIPGR_DEMO_COUNTS) dwarf a real narrowed
    // Exceptions/Monitoring count, so the landing jump lands on PGI/PGR's
    // "Coming soon" placeholder for ANY committed search outside consolidate
    // mode — a route-level commit made here for test setup, not something a
    // planner does mid-consolidate (S154 exempts commits made WHILE in
    // mode). Land back on Exceptions so the table actually renders rows.
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /^Shipment Exceptions/ })))
  }

  // The bar collapses chips behind a "+N" pill until focused (jsdom reports
  // offsetWidth 0 for the overflow measurement) — same note as
  // lockedCustomer.test.jsx.
  function committedChipTexts() {
    fireEvent.focus(screen.getByRole('combobox'))
    return [...document.querySelectorAll('.global-search-chip')].map((el) => el.textContent)
  }

  test('entering the mode with a committed two-customer filter leaves it untouched', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    await commitTwoCustomerFilter()
    expect(committedChipTexts()).toContain(TWO_CUSTOMER_LABEL)
    await enterMode()
    expect(committedChipTexts()).toContain(TWO_CUSTOMER_LABEL)
  })

  test('checking the first row commits a filter of exactly the anchor customer, with no Remove button', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    const label = enabledRowBoxes()[0].getAttribute('aria-label')
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    await screen.findByText('Selected Customer:')
    fireEvent.focus(screen.getByRole('combobox'))
    const chipEls = [...document.querySelectorAll('.global-search-chip')]
    const customerChip = chipEls.find((el) => el.textContent.includes('Customer ID'))
    expect(customerChip).toBeTruthy()
    // Exactly the anchor's customer — no leftover comma-joined IN-list.
    expect(customerChip.textContent).not.toContain(',')
    expect(within(customerChip).queryByRole('button', { name: /^Remove Customer ID/ })).toBeNull()
  })

  test('clearing the selection restores the two-customer filter', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    await commitTwoCustomerFilter()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    const label = enabledRowBoxes()[0].getAttribute('aria-label')
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    await waitFor(() => expect(screen.queryByText('Selected Customer:')).toBeNull())
    await waitFor(() => expect(committedChipTexts()).toContain(TWO_CUSTOMER_LABEL))
  })

  test('Cancel restores the two-customer filter too', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    await commitTwoCustomerFilter()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(committedChipTexts()).toContain(TWO_CUSTOMER_LABEL))
  })

  test('while locked, the suggestion attribute list excludes the customer keys', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    const badge = await screen.findByText('Selected Customer:')
    const anchorLabel = badge.nextSibling.textContent

    // Sanity first: UNFILTERED, this exact text really does surface a
    // customer-attribute suggestion — otherwise the assertion below would
    // trivially pass with nothing to exclude.
    const rawSections = await shipmentsSearchAdapter.getSuggestions(anchorLabel)
    const rawKeys = rawSections.flatMap((s) => s.items.map((it) => it.key))
    expect(rawKeys.some((k) => k === 'customer-id' || k === 'customer-name')).toBe(true)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: anchorLabel } })
    // Past the 120ms debounce: the panel then settles into either a narrowed
    // non-empty section or, when the query ONLY matched a customer field, no
    // suggestions at all — both are correct; what matters is neither ever
    // shows Customer ID/Name.
    await new Promise((resolve) => setTimeout(resolve, 250))
    const texts = [...document.querySelectorAll('.filter-suggestions__chip')].map((el) => el.textContent)
    expect(texts.some((t) => t.startsWith('Customer ID'))).toBe(false)
    expect(texts.some((t) => t.startsWith('Customer Name'))).toBe(false)
  })
})

// @vitest-environment jsdom
// Consolidate mode (S154) end-to-end through the real ShipmentsRoute + mock
// grid service. Same harness as tabOrderPersistence.test.jsx.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import ShipmentTable from '../../components/shipments/ShipmentTable.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'
import { shipmentsSearchAdapter } from '../../search/shipments'
import { matchesChip } from '../../search/shipments/criteria'
import { attrChip } from '../../components/global-search/savedFilters'

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
    expect(screen.getByRole('button', { name: 'Select to Consolidate' }).disabled).toBe(true)
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
    expect(screen.getByRole('button', { name: 'Consolidate 1 Shipment' }).disabled).toBe(true)
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
    expect(await screen.findByRole('button', { name: 'Select to Consolidate' })).toBeTruthy()
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

  test('the primary button label: 0 selected reads "Select to Consolidate", 1 is singular, 2+ pluralizes', async () => {
    renderRoute()
    await enterMode()
    expect(screen.getByRole('button', { name: 'Select to Consolidate' }).disabled).toBe(true)
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(1))
    fireEvent.click(enabledRowBoxes()[0])
    const oneLabel = await screen.findByRole('button', { name: 'Consolidate 1 Shipment' })
    expect(oneLabel.disabled).toBe(true)
    await waitFor(() => expect(enabledRowBoxes().filter((c) => !c.checked).length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes().filter((c) => !c.checked)[0])
    const twoLabel = await screen.findByRole('button', { name: 'Consolidate 2 Shipments' })
    expect(twoLabel.disabled).toBe(false)
  })
})

// S154 — PGI/PGR holds no shipments (its panel renders a "Coming soon"
// placeholder; its tab counts come from PGIPGR_DEMO_COUNTS) so it can never
// offer a consolidation candidate. It's hidden for the DURATION of consolidate
// mode only — the S104 ruling that panel tabs never vanish for a SEARCH still
// stands; this is a distinct page stage, not a filter.
describe('consolidate mode — PGI/PGR is hidden (S154)', () => {
  test('in consolidate mode the PGI/PGR tab is gone; the other two panel tabs remain', async () => {
    renderRoute()
    await enterMode()
    expect(screen.getByRole('button', { name: /^Shipment Exceptions/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Monitoring/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^PGI\/PGR/ })).toBeNull()
  })

  test('leaving the mode brings PGI/PGR back', async () => {
    renderRoute()
    await enterMode()
    expect(screen.queryByRole('button', { name: /^PGI\/PGR/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    expect(screen.getByRole('button', { name: /^PGI\/PGR/ })).toBeTruthy()
  })

  test('entering the mode from the PGI/PGR panel lands the planner on Shipment Exceptions with the table visible', async () => {
    renderRoute({ panel: 'pgipgr' })
    await screen.findByRole('heading', { name: 'Shipments' })
    expect(screen.getByText('Executed Shipment Overview')).toBeTruthy()
    await enterMode()
    expect(screen.queryByText('Executed Shipment Overview')).toBeNull()
    await waitFor(() => expect(rowBoxes().length).toBeGreaterThan(0))
  })

  test('cancelling from that state returns the planner to PGI/PGR', async () => {
    renderRoute({ panel: 'pgipgr' })
    await screen.findByRole('heading', { name: 'Shipments' })
    await enterMode()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    expect(await screen.findByText('Executed Shipment Overview')).toBeTruthy()
    expect(screen.queryAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Select '))).toHaveLength(0)
  })

  // S159 fix — the route-level TableControls toolbar (count + Export) used to
  // render above PgipgrPanel's own action row regardless of panel, giving
  // PGI/PGR two "Export" buttons and two record counters. Figma (2554:58830 /
  // 2561:62292) shows exactly one action row per card.
  test('PGI/PGR shows exactly one action row: one Export button, one record count', async () => {
    renderRoute({ panel: 'pgipgr' })
    await screen.findByText('Executed Shipment Overview')
    expect(screen.getAllByRole('button', { name: 'Export' })).toHaveLength(1)
    expect(screen.getByText(/Records Found$/)).toBeTruthy()
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

  // S154 correctness gap (code review): `customer-id` has no `exact` flag in
  // progression.js, so an ordinary attrChip('customer-id', …) matches by
  // SUBSTRING (criteria-core.js matchesChip). ShipmentsRoute's lockedChip
  // forces `exact: true` on the CHIP itself — the scope parameter it
  // replaced (`customerIds`) was exact everywhere, and a substring lock would
  // silently admit a second customer whose id merely contains the anchor's.
  test('the lock chip matches the anchor customer exactly, not a customer whose id merely contains it', () => {
    const lockedChip = { ...attrChip('customer-id', 'CUST_1'), exact: true, locked: true }
    expect(matchesChip({ customerId: 'CUST_1' }, lockedChip)).toBe(true)
    expect(matchesChip({ customerId: 'CUST_10' }, lockedChip)).toBe(false)
  })

  // S155 §1.1 — the lock is committed BY THE HOST, so the bar's "a chip was
  // just committed → show the glimpse" heuristic must not fire on it. Checking
  // a row is a table gesture; nothing should drop over the page.
  test('locking the customer does not open the results glimpse', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    expect(document.querySelector('.shipments-results-panel')).toBeNull()
  })

  // S155 §1.2 — Clear all while locked also throws away the selection, so it
  // asks first.
  test('clearing the bar while locked confirms, then empties the selection', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    fireEvent.click(enabledRowBoxes()[0])
    await screen.findByText('Selected Customer:')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(await screen.findByText('Clear Customer Selection')).toBeTruthy()
    expect(screen.getByText(/1 selected shipment /)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Clear' }))
    await waitFor(() => expect(screen.queryByText('Selected Customer:')).toBeNull())
    expect(screen.getByRole('button', { name: 'Select to Consolidate' })).toBeTruthy()
    expect(committedChipTexts().some((t) => t.includes('Customer ID'))).toBe(false)
  })

  // S155 §1.3 — the header checkbox with no anchor used to check every
  // eligible row on the page ACROSS customers; the first one locked the
  // customer, the table narrowed, and the rest stayed selected but invisible
  // (the count outran what was on screen). Now the batch is narrowed to the
  // first eligible row's customer before anything is stored.
  test('select-all with no anchor selects only the first eligible row\'s customer', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(1))
    // Page 1 of the seed carries eligible rows for a dozen-odd customers, so
    // "all of them" and "the anchor's" are very different numbers — the count
    // in the primary button is where the surplus showed.
    const eligibleOnPage = enabledRowBoxes().length
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' }))
    await screen.findByText('Selected Customer:')
    const selected = Number(screen.getByRole('button', { name: /Consolidate|Select to Consolidate/ }).textContent.match(/\d+/)?.[0] ?? 1)
    expect(selected).toBeLessThan(eligibleOnPage)
  })

  test('with no selection, the mode explains what to select', async () => {
    renderRoute()
    await enterMode()
    expect(screen.getByText('Select to consolidate. Only direct shipments are consolidatable')).toBeTruthy()
    expect(screen.queryByText('Selected Customer:')).toBeNull()
  })
})

// Part 3 (S158, user 2026-09-23): selected shipments float to the top of page 1
// as they're checked, ordered by the active sort, so the selection is always
// in view. The moved row gets the same highlight pulse `created` uses.
describe('consolidate mode — selection floats to the top (Part 3, S158)', () => {
  // Checkboxes occupy the FIRST cell in select mode — the identifier lives in
  // the title cell (S148: same class ShipmentTable puts on that column).
  const rowIds = () => [...document.querySelectorAll('tbody tr')]
    .map((tr) => tr.querySelector('.odyssey-table__cell--title')?.textContent?.trim())

  test('checking a row floats it to the top with a highlight; unchecking returns it to its sorted place', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(2))
    const before = rowIds()
    // Check a row that ISN'T already first — it should float above everything,
    // including rows the default sort would otherwise keep ahead of it.
    const box = enabledRowBoxes()[2]
    const label = box.getAttribute('aria-label')
    const id = box.closest('tr').querySelector('.odyssey-table__cell--title').textContent.trim()
    fireEvent.click(box)
    await waitFor(() => expect(rowIds()[0]).toBe(id))
    expect(document.querySelectorAll('tbody tr')[0].getAttribute('data-highlight')).toBe('true')
    // Unchecking releases the float — the row returns to its normal sorted
    // place (the page reverts to what it was before the float).
    fireEvent.click(screen.getByRole('checkbox', { name: label }))
    await waitFor(() => expect(rowIds()).toEqual(before))
  })

  test('two selections stack at the top in the active (default) sort order, never duplicated below', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(3))
    const first = enabledRowBoxes()[3]
    const firstId = first.closest('tr').querySelector('.odyssey-table__cell--title').textContent.trim()
    fireEvent.click(first)
    await screen.findByText('Selected Customer:')
    await waitFor(() => expect(enabledRowBoxes().filter((c) => !c.checked).length).toBeGreaterThan(0))
    const second = enabledRowBoxes().filter((c) => !c.checked)[0]
    const secondId = second.closest('tr').querySelector('.odyssey-table__cell--title').textContent.trim()
    fireEvent.click(second)
    await waitFor(() => {
      const top = rowIds().slice(0, 2)
      expect(top).toEqual([...top].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
      expect(top).toContain(firstId)
      expect(top).toContain(secondId)
    })
    // Never duplicated further down the page (the server-exclusion path).
    expect(rowIds().filter((id) => id === firstId)).toHaveLength(1)
    expect(rowIds().filter((id) => id === secondId)).toHaveLength(1)
  })
})

// Part 6 (S158, user 2026-09-23): PGI/PGR is widget-only, no rows to open a
// detail bar against — BottomBar (which hosts ShipmentsBar) must not mount
// there at all, not even collapsed.
describe('PGI/PGR has no ShipmentsBar (Part 6, S158)', () => {
  test('the bar is absent on the PGI/PGR panel and reappears on the others', async () => {
    renderRoute({ panel: 'exceptions' })
    await screen.findByRole('heading', { name: 'Shipments' })
    expect(document.querySelector('.shipments-bar__strip')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^PGI\/PGR/ }))
    await waitFor(() => expect(screen.getByText('Executed Shipment Overview')).toBeTruthy())
    expect(document.querySelector('.shipments-bar__strip')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Shipment Exceptions/ }))
    await waitFor(() => expect(document.querySelector('.shipments-bar__strip')).toBeTruthy())
  })

  test('switching to PGI/PGR with a shipment open closes the bar', async () => {
    renderRoute({ panel: 'exceptions' })
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0))
    fireEvent.click(document.querySelectorAll('tbody tr')[0].querySelector('td'))
    await waitFor(() => expect(document.querySelector('.shipments-bar__strip')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /^PGI\/PGR/ }))
    await waitFor(() => expect(document.querySelector('.shipments-bar__strip')).toBeNull())
  })
})

// S155 (user, 2026-09-20: "C shipments can appear only in non consol mode") —
// consolidate mode LISTS only Direct shipments. Structural to the mode like
// hiding PGI/PGR, and deliberately not a visible chip (contrast the CNS-10
// customer lock, which is one). Ineligible rows used to stay listed behind a
// disabled checkbox.
describe('consolidate mode — only Direct shipments are listed (S155)', () => {
  // The Odyssey Shipment Identifier is `C…` for Consolidation and `O…` for
  // Direct (generate.mjs) — the cheapest true read of the listed shipment type.
  const odysseyIds = () => [...document.querySelectorAll('tbody td')]
    .map((td) => td.textContent.trim())
    .filter((t) => /^[CO]\d+$/.test(t))
  const itemCount = () => Number(screen.getByText(/^\d+ items$/).textContent.match(/\d+/)[0])

  test('a Consolidation row is listed normally but never in the mode, and the count drops with it', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Default sort is odysseyShipmentIdentifier ASC and "C…" < "O…", so page 1
    // of the normal list is where the Consolidation rows live.
    await waitFor(() => expect(odysseyIds().some((id) => id.startsWith('C'))).toBe(true))
    const before = itemCount()
    await enterMode()
    await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(0))
    expect(odysseyIds().length).toBeGreaterThan(0)
    expect(odysseyIds().some((id) => id.startsWith('C'))).toBe(false)
    expect(itemCount()).toBeLessThan(before)
  })

  test('re-entering from the review screen lists only Direct rows too', async () => {
    // The old shipmentType sort reseed only ran in enterConsolidate, so this
    // path (location.state.consolidate) surfaced Consolidation rows.
    const rows = [
      { id: 'a', sellShipment: 'a', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
      { id: 'b', sellShipment: 'b', customerId: 'VALTRIS_01', customerName: 'Valtris', shipmentType: 'Direct', tenderStatus: '', orders: [], pickupNumbers: [], poNumbers: [] },
    ]
    renderRoute({ consolidate: { rows } })
    await screen.findByRole('heading', { name: 'Shipments Consolidation' })
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0))
    expect(odysseyIds().some((id) => id.startsWith('C'))).toBe(false)
  })
})

// S155 — editing an existing consolidation starts from the row's actions
// menu. The seeded C row is not LISTED in the mode (above) and eligibility
// would refuse its checkbox; it lives in the selection, the header count and
// the review screen only.
describe('consolidate mode — Edit on a Consolidation row (S155)', () => {
  test('the Edit action enters the mode with that shipment selected and the customer locked', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Shipment actions' }).length).toBeGreaterThan(0))
    // Page 1, default sort: "C…" sorts before "O…", so the first row is a
    // Consolidation one.
    const firstRow = document.querySelectorAll('tbody tr')[0]
    expect([...firstRow.querySelectorAll('td')].some((td) => /^C\d+$/.test(td.textContent.trim()))).toBe(true)
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Shipment actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(await screen.findByRole('heading', { name: 'Shipments Consolidation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Consolidate 1 Shipment' })).toBeTruthy()
    expect(screen.getByText('Selected Customer:')).toBeTruthy()
  })
})

// S155 §1.3 (table half) — unchecking the header clears the WHOLE selection,
// including rows that are not on this page. Driven at the table level: the
// route can't easily be pushed into "selected rows off the current page"
// without a second page of seeded data.
describe('ShipmentTable — header uncheck clears off-page selections (S155)', () => {
  const row = (i, over = {}) => ({
    id: `s${i}`, sellShipment: `s${i}`, buyShipment: `b${i}`, odysseyShipmentIdentifier: `O${i}`,
    orders: [], pickupNumbers: [], poNumbers: [], customerId: 'VALTRIS_01', shipmentType: 'Direct',
    tenderStatus: '', shipmentStatus: '', category: 'consolidation', grossWeight: '100', ...over,
  })

  test('the header reports every selected row, not just the page\'s', () => {
    const pageRows = [row(1), row(2)]
    const offPage = row(9)
    const onSelectionChange = vi.fn()
    render(
      <MemoryRouter>
        <ShipmentTable
          shipments={pageRows}
          onRowSelect={vi.fn()}
          selectedId={null}
          onToggleColumnPanel={vi.fn()}
          visibleColumns={['odysseyShipmentIdentifier', 'customerId']}
          sorting={[]}
          onSortingChange={vi.fn()}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          totalCount={3}
          selectable
          selection={new Map([['s1', pageRows[0]], ['s2', pageRows[1]], ['s9', offPage]])}
          onSelectionChange={onSelectionChange}
          eligibility={() => null}
        />
      </MemoryRouter>,
    )
    const header = screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' })
    expect(header.checked).toBe(true)
    fireEvent.click(header)
    const [rows, checked] = onSelectionChange.mock.calls.at(-1)
    expect(checked).toBe(false)
    expect(rows.map((r) => r.id)).toEqual(['s1', 's2', 's9'])
  })
})

// S155 §4.2 — arriving from Apply's "View Shipment" pins the created row to
// the top of page 1 (the default sort is by identifier, so a new C7… id would
// otherwise land pages away) and asks DataTable to highlight it.
describe('created-shipment pin (S155 §4.2)', () => {
  test('state.createdShipment renders first', async () => {
    const created = {
      id: 'C70000001', sellShipment: 'C70000001', buyShipment: 'b1', odysseyShipmentIdentifier: 'C70000001',
      orders: [], pickupNumbers: [], poNumbers: [], customerId: 'VALTRIS_01', customerName: 'Valtris',
      shipmentType: 'Consolidated', tenderStatus: '', shipmentStatus: '', category: 'consolidation', grossWeight: '100',
    }
    renderRoute({ createdShipment: created })
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(1))
    const first = document.querySelectorAll('tbody tr')[0]
    expect(first.textContent).toContain('C70000001')
    expect(first.getAttribute('data-highlight')).toBe('true')
  })
})

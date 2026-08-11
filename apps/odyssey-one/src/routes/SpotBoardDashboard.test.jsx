// @vitest-environment jsdom
// SpotBoard Dashboard — cross-shipment monitoring board (wireframe Screen 6).
// board.js is built by another agent in parallel; per the brief we mock it here
// against the documented contract (listAllQuotes/boardKpis/filterRows) and the
// component imports it normally at runtime.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import SpotBoardDashboard from './SpotBoardDashboard.jsx'
import { EditModeProvider } from '../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../contexts/CreateOrderModeContext.jsx'
import { CustomersProvider } from '../contexts/CustomersContext.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'

const NOW = new Date('2026-08-07T12:00:00Z').getTime()

// ── Fixtures — one row per status in the six-value vocabulary + one demo row.
// `org` is a component-local extension of BoardRow (the brief's schema doesn't
// list it, but the canon filter set requires "My org / site" — read defensively).
const ROWS = [
  { quoteId: 'Q-1001', shipmentId: 'SH-5001', load: 'L-9001', client: 'Acme Corp', org: 'Dallas Site', lane: 'Dallas, TX → Chicago, IL', equipment: 'Dry Van', respondedCount: 2, invitedCount: 4, leadingBid: 1250, status: 'Open', closeAt: NOW + 30 * 60000, createdAt: NOW - 60 * 60000, demo: false, carriers: [
    { scac: 'KNGT', name: 'Knight Transportation', responseTime: '7 min', responseUser: 'dispatch@kngt.com', quotedCost: 1250, awarded: false },
    { scac: 'JBHT', name: 'J.B. Hunt', responseTime: '14 min', responseUser: '--', quotedCost: 'Declined', awarded: false },
    { scac: 'WERN', name: 'Werner Enterprises', responseTime: '--', responseUser: '--', quotedCost: null, awarded: false },
    { scac: 'SWFT', name: 'Swift Transportation', responseTime: '--', responseUser: '--', quotedCost: null, awarded: false },
  ] },
  { quoteId: 'Q-1002', shipmentId: 'SH-5002', load: 'L-9002', client: 'Acme Corp', org: 'Dallas Site', lane: 'Miami, FL → Atlanta, GA', equipment: 'Reefer', respondedCount: 3, invitedCount: 3, leadingBid: 980, status: 'Closing soon', closeAt: NOW + 10 * 60000, createdAt: NOW - 90 * 60000, demo: false },
  { quoteId: 'Q-1003', shipmentId: 'SH-5003', load: 'L-9003', client: 'Globex', org: 'Chicago Site', lane: 'LA, CA → Phoenix, AZ', equipment: 'Flatbed', respondedCount: 4, invitedCount: 4, leadingBid: 2100, status: 'In review', closeAt: NOW - 5 * 60000, createdAt: NOW - 120 * 60000, demo: false },
  { quoteId: 'Q-1004', shipmentId: 'SH-5004', load: 'L-9004', client: 'Globex', org: 'Chicago Site', lane: 'Denver, CO → SLC, UT', equipment: 'Dry Van', respondedCount: 3, invitedCount: 5, leadingBid: 1500, status: 'Awarded', closeAt: NOW - 60 * 60000, createdAt: NOW - 180 * 60000, demo: false },
  { quoteId: 'Q-1005', shipmentId: 'SH-5005', load: 'L-9005', client: 'Initech', org: 'Dallas Site', lane: 'Houston, TX → Dallas, TX', equipment: 'Dry Van', respondedCount: 0, invitedCount: 3, leadingBid: null, status: 'Unawarded', closeAt: NOW - 30 * 60000, createdAt: NOW - 240 * 60000, demo: false },
  { quoteId: 'Q-1006', shipmentId: 'SH-5006', load: 'L-9006', client: 'Initech', org: 'Chicago Site', lane: 'Seattle, WA → Portland, OR', equipment: 'Reefer', respondedCount: 1, invitedCount: 4, leadingBid: null, status: 'Invalidated', closeAt: NOW - 15 * 60000, createdAt: NOW - 300 * 60000, demo: false },
  { quoteId: 'Q-DEMO', shipmentId: 'SH-DEMO', load: 'L-DEMO', client: 'Demo Client', org: 'Dallas Site', lane: 'New York, NY → Boston, MA', equipment: 'Dry Van', respondedCount: 2, invitedCount: 4, leadingBid: 800, status: 'Open', closeAt: NOW + 45 * 60000, createdAt: NOW - 20 * 60000, demo: true },
]

function boardKpisImpl(rows, now) {
  const sameDay = (t) => new Date(t).toDateString() === new Date(now).toDateString()
  return {
    all: rows.length,
    invalidated: rows.filter((r) => r.status === 'Invalidated').length,
    openBids: rows.filter((r) => r.status === 'Open' || r.status === 'Closing soon').length,
    closingSoon: rows.filter((r) => r.status === 'Closing soon').length,
    awaitingReview: rows.filter((r) => r.status === 'In review').length,
    unawardedToday: rows.filter((r) => (r.status === 'Unawarded' || r.status === 'Invalidated') && sameDay(r.closeAt)).length,
    awardedToday: rows.filter((r) => r.status === 'Awarded' && sameDay(r.closeAt)).length,
  }
}

function filterRowsImpl(rows, { client, status, org, search } = {}) {
  return rows.filter((r) => {
    if (client && r.client !== client) return false
    if (status && r.status !== status) return false
    if (org && r.org !== org) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.quoteId.toLowerCase().includes(q) && !r.load.toLowerCase().includes(q)) return false
    }
    return true
  })
}

const listAllQuotes = vi.fn(() => ROWS)
const boardKpis = vi.fn(boardKpisImpl)
const filterRows = vi.fn(filterRowsImpl)

vi.mock('../spotboard/board', () => ({
  listAllQuotes: (...args) => listAllQuotes(...args),
  boardKpis: (...args) => boardKpis(...args),
  filterRows: (...args) => filterRows(...args),
}))

// The drill-in verifies the shipment still exists before navigating.
const getSellShipmentDetail = vi.fn(async () => ({}))
const clearQuote = vi.fn()
vi.mock('../api/services/shipmentService', () => ({
  getSellShipmentDetail: (...args) => getSellShipmentDetail(...args),
}))
vi.mock('../spotboard/spotStore', () => ({
  clearQuote: (...args) => clearQuote(...args),
}))

afterEach(() => {
  cleanup()
  listAllQuotes.mockClear()
  boardKpis.mockClear()
  filterRows.mockClear()
  listAllQuotes.mockImplementation(() => ROWS)
  boardKpis.mockImplementation(boardKpisImpl)
  filterRows.mockImplementation(filterRowsImpl)
  getSellShipmentDetail.mockReset()
  getSellShipmentDetail.mockResolvedValue({})
  clearQuote.mockReset()
  vi.useRealTimers()
})

// Probe route standing in for '/shipments' — records the navigate() state so
// the row-action drill-in can be asserted without depending on ShipmentsRoute.
function ShipmentsProbe() {
  const location = useLocation()
  return <div data-testid="shipments-probe">{JSON.stringify(location.state)}</div>
}

function renderDashboard(initialEntries = ['/spotboard']) {
  return render(
    <EditModeProvider>
      <CreateOrderModeProvider>
        <CustomersProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/spotboard" element={<SpotBoardDashboard />} />
              <Route path="/shipments" element={<ShipmentsProbe />} />
            </Routes>
          </MemoryRouter>
        </CustomersProvider>
      </CreateOrderModeProvider>
    </EditModeProvider>,
  )
}

describe('SpotBoardDashboard', () => {
  test('renders with header "SpotBoard Dashboard"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()
    expect(screen.getByRole('heading', { name: 'SpotBoard Dashboard' })).toBeTruthy()
  })

  test('renders the seven category tiles, in canon order, with counts from boardKpis', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { container } = renderDashboard()

    const expected = boardKpisImpl(ROWS, NOW)
    // Tiles are the shared WidgetMini metric card (same component the
    // Shipments category row uses), not this board's own div any more.
    // Seven, not five: All and Invalidated were added when the row took over
    // from the Status dropdown.
    const tiles = container.querySelectorAll('.widget-mini')
    expect(tiles.length).toBe(7)

    // Short labels on the cards — the long names live in the section heading.
    const labels = Array.from(tiles).map((t) => t.querySelector('.widget-mini__label').textContent)
    expect(labels).toEqual([
      'All',
      'Open',
      'Closing',
      'Review',
      'Unawarded',
      'Awarded',
      'Invalidated',
    ])

    // WidgetMini's value COUNTS UP from 0 over 900ms, so the final number is
    // only on screen once the sweep has run — asserting it on first paint
    // would read every tile as '0'.
    act(() => { vi.advanceTimersByTime(1000) })

    const values = Array.from(tiles).map((t) => t.querySelector('.widget-mini__value').textContent)
    expect(values).toEqual([
      String(expected.all),
      String(expected.openBids),
      String(expected.closingSoon),
      String(expected.awaitingReview),
      String(expected.unawardedToday),
      String(expected.awardedToday),
      String(expected.invalidated),
    ])
  })

  test('table renders the ten canon columns in document order', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent.trim())
    expect(headers).toEqual([
      'Quote ID',
      'Load',
      'Client',
      'Lane',
      'Equip',
      'Resp. / Invited',
      'Leading Bid',
      'Status',
      'Time',
      'Action',
    ])
  })

  // SPB-30 — the legacy cross-bid screen is one row per CARRIER grouped by
  // quote. Collapsed, the board is a quote index; the per-carrier comparison
  // it exists for only appears on expand, so that is what this pins.
  test('a quote row expands to its carriers, with Declined passed through as a value', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    // Collapsed by default — no carrier is on screen.
    expect(screen.queryByText('Knight Transportation')).toBeFalsy()

    fireEvent.click(screen.getByRole('button', { name: /Q-1001/ }))

    expect(screen.getByText('Knight Transportation')).toBeTruthy()
    expect(screen.getByText('J.B. Hunt')).toBeTruthy()
    // Legacy renders the literal string in the cost column, not a dash.
    expect(screen.getByText('Declined')).toBeTruthy()
    // A priced bid formats as currency — and appears TWICE: once as the
    // quote's Leading Bid and once as the carrier row it comes from. That
    // agreement is the point of the grain change, so it is asserted, not
    // worked around.
    expect(screen.getAllByText('$1,250')).toHaveLength(2)

    const carrierHeaders = screen.getAllByRole('columnheader').map((h) => h.textContent.trim())
    expect(carrierHeaders).toContain('SCAC')
    expect(carrierHeaders).toContain('Quoted Cost')
    expect(carrierHeaders).toContain('Awarded')
  })

  // WidgetMini is a filter card, not a static counter — each tile applies the
  // filter that reproduces its own count. The "…today" tiles must send `today`
  // as well as `status`, or the tile's number and its result set disagree.
  test('clicking a KPI tile applies the filter that reproduces its own count', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { container } = renderDashboard()

    const tiles = container.querySelectorAll('.widget-mini')
    const awarded = tiles[5]
    expect(awarded.querySelector('.widget-mini__label').textContent).toBe('Awarded')

    fireEvent.click(awarded)

    const args = filterRows.mock.calls.at(-1)[1]
    expect(args.status).toBe('Awarded')
    expect(args.today).toBe(true)
    expect(awarded.getAttribute('aria-pressed')).toBe('true')

    // The section heading carries the long name of whatever is selected —
    // that is where the definition dropped from the card label went.
    expect(screen.getByText('Awarded Today')).toBeTruthy()

    // 'All' is how you get back to the whole board; it sends no status at all.
    fireEvent.click(tiles[0])
    const cleared = filterRows.mock.calls.at(-1)[1]
    expect(cleared.status).toBeUndefined()
    expect(cleared.today).toBeUndefined()
    expect(screen.getByText('All Quotes')).toBeTruthy()
  })

  // REMOVED (2026-08-11, user ruling): the Client dropdown is gone. The board
  // no longer filters by client at all — "My org / site" is the only
  // customer-scoping control, and it matches on the same field.
  test('there is no Client filter', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    expect(screen.queryByTestId('spotboard-filter-client')).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'All clients' })).toBeFalsy()
    // No client key reaches the data layer either.
    expect(filterRows.mock.calls.at(-1)[1].client).toBeUndefined()
  })

  // Status and Org filters both start selected on the literal option "All"
  // (canon: "Status (All, Open, ...)" / "My org / site (All + names)") — the
  // Dropdown trigger's accessible name is 1:1 with the selected option's
  // label, so both buttons read "All" and collide on name. Scope by the
  // filter's own testid instead of fighting for a unique accessible name.
  // The Status dropdown was removed — the category row is the only status
  // control now, so this asserts the same narrowing through the tile.
  test('the category row replaces the Status dropdown entirely', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    expect(screen.queryByTestId('spotboard-filter-status')).toBeFalsy()

    fireEvent.click(screen.getByRole('button', { name: /Awarded/ }))

    expect(screen.getByText('Q-1004')).toBeTruthy()
    expect(screen.queryByText('Q-1001')).toBeFalsy()
  })

  // Pills and widgets are two renderings of ONE selection — switching mode
  // must not reset which category is active.
  test('the mode toggle swaps pills for widgets and keeps the selection', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { container } = renderDashboard()

    expect(container.querySelectorAll('.widget-mini')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: /Awarded/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Show categories as pill tabs' }))

    expect(container.querySelectorAll('.widget-mini')).toHaveLength(0)
    expect(screen.getByText('Awarded Today')).toBeTruthy()
    expect(screen.getByText('Q-1004')).toBeTruthy()
    expect(screen.queryByText('Q-1001')).toBeFalsy()
  })

  test('My org / site filter narrows rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    fireEvent.click(within(screen.getByTestId('spotboard-filter-org')).getByRole('button'))
    fireEvent.click(within(screen.getByRole('menu')).getByText('Chicago Site'))

    expect(screen.getByText('Q-1003')).toBeTruthy()
    expect(screen.queryByText('Q-1001')).toBeFalsy()
  })

  test('Search filter (Quote ID / Load) narrows rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    const search = screen.getByRole('textbox', { name: /search/i })
    fireEvent.change(search, { target: { value: 'L-9003' } })

    expect(screen.getByText('Q-1003')).toBeTruthy()
    expect(screen.queryByText('Q-1001')).toBeFalsy()
  })

  test('row action label is Open for an Open quote, and navigates to the shipment\'s SpotBoard tab', async () => {
    vi.setSystemTime(NOW)
    renderDashboard()

    const row = screen.getByText('Q-1001').closest('tr')
    const btn = within(row).getByRole('button', { name: 'Open' })
    fireEvent.click(btn)

    // The drill-in first confirms the shipment still exists, so navigation
    // lands a microtask later.
    const probe = await screen.findByTestId('shipments-probe')
    const state = JSON.parse(probe.textContent)
    expect(state.selectedShipmentId).toBe('SH-5001')
    expect(state.requestedTab).toEqual({ key: 'spot' })
  })

  // localStorage outlives the database: a reseed regenerates every shipment,
  // so a saved quote can point at an id with nothing behind it. Navigating
  // there can only ever error, so the board proves it and self-heals.
  test('a row whose shipment is gone clears the quote instead of navigating', async () => {
    vi.setSystemTime(NOW)
    const notFound = Object.assign(new Error('No shipment: SH-5001'), { status: 404 })
    getSellShipmentDetail.mockRejectedValueOnce(notFound)

    renderDashboard()

    const row = screen.getByText('Q-1001').closest('tr')
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }))

    expect(await screen.findByText(/no longer in the dataset/i)).toBeTruthy()
    expect(clearQuote).toHaveBeenCalledWith('SH-5001')
    // It must NOT navigate into a tab that can only error.
    expect(screen.queryByTestId('shipments-probe')).toBeFalsy()
  })

  // A blip must never delete a user's quote — only a proven 404 does.
  test('a non-404 failure navigates anyway and clears nothing', async () => {
    vi.setSystemTime(NOW)
    getSellShipmentDetail.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))

    renderDashboard()

    const row = screen.getByText('Q-1001').closest('tr')
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }))

    expect(await screen.findByTestId('shipments-probe')).toBeTruthy()
    expect(clearQuote).not.toHaveBeenCalled()
  })

  test('row action label is Review for In review, View for Awarded, Re-quote for Unawarded', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    expect(within(screen.getByText('Q-1003').closest('tr')).getByRole('button', { name: 'Review' })).toBeTruthy()
    expect(within(screen.getByText('Q-1004').closest('tr')).getByRole('button', { name: 'View' })).toBeTruthy()
    expect(within(screen.getByText('Q-1005').closest('tr')).getByRole('button', { name: 'Re-quote' })).toBeTruthy()
  })

  test('a demo row is marked distinctly, real rows are not', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    const demoRow = screen.getByText('Q-DEMO').closest('tr')
    expect(within(demoRow).getByText('Demo')).toBeTruthy()

    const realRow = screen.getByText('Q-1001').closest('tr')
    expect(within(realRow).queryByText('Demo')).toBeFalsy()
  })

  test('empty state renders when no rows match', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    const search = screen.getByRole('textbox', { name: /search/i })
    fireEvent.change(search, { target: { value: 'no-such-quote-anywhere' } })

    expect(screen.queryByRole('table')).toBeFalsy()
    expect(screen.getByText(/no quotes/i)).toBeTruthy()
  })

  test('empty state renders when the board has zero rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    listAllQuotes.mockImplementation(() => [])
    renderDashboard()

    expect(screen.queryByRole('table')).toBeFalsy()
    expect(screen.getByText(/no quotes/i)).toBeTruthy()
  })
})

describe('Sidebar — SpotBoard entry', () => {
  test('links to /spotboard', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>,
    )
    const link = screen.getByTitle('SpotBoard')
    expect(link.getAttribute('href')).toBe('/spotboard')
  })
})

// @vitest-environment jsdom
// SpotBoard Dashboard — cross-shipment monitoring board (wireframe Screen 6).
// board.js is built by another agent in parallel; per the brief we mock it here
// against the documented contract (listAllQuotes/boardKpis/filterRows) and the
// component imports it normally at runtime.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
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
  { quoteId: 'Q-1001', shipmentId: 'SH-5001', load: 'L-9001', client: 'Acme Corp', org: 'Dallas Site', lane: 'Dallas, TX → Chicago, IL', equipment: 'Dry Van', respondedCount: 2, invitedCount: 4, leadingBid: 1250, status: 'Open', closeAt: NOW + 30 * 60000, createdAt: NOW - 60 * 60000, demo: false },
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

afterEach(() => {
  cleanup()
  listAllQuotes.mockClear()
  boardKpis.mockClear()
  filterRows.mockClear()
  listAllQuotes.mockImplementation(() => ROWS)
  boardKpis.mockImplementation(boardKpisImpl)
  filterRows.mockImplementation(filterRowsImpl)
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

  test('renders five KPI tiles, in canon order, with counts from boardKpis', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { container } = renderDashboard()

    const expected = boardKpisImpl(ROWS, NOW)
    const tiles = container.querySelectorAll('.spotboard-kpi')
    expect(tiles.length).toBe(5)

    const labels = Array.from(tiles).map((t) => t.querySelector('.spotboard-kpi__label').textContent)
    expect(labels).toEqual([
      'Open bids',
      'Closing < 15 min',
      'Awaiting review',
      'Unawarded / expired today',
      'Awarded today',
    ])

    const values = Array.from(tiles).map((t) => t.querySelector('.spotboard-kpi__value').textContent)
    expect(values).toEqual([
      String(expected.openBids),
      String(expected.closingSoon),
      String(expected.awaitingReview),
      String(expected.unawardedToday),
      String(expected.awardedToday),
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

  test('Client filter narrows rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'All clients' }))
    fireEvent.click(within(screen.getByRole('menu')).getByText('Acme Corp'))

    expect(screen.getByText('Q-1001')).toBeTruthy()
    expect(screen.getByText('Q-1002')).toBeTruthy()
    expect(screen.queryByText('Q-1003')).toBeFalsy()
  })

  // Status and Org filters both start selected on the literal option "All"
  // (canon: "Status (All, Open, ...)" / "My org / site (All + names)") — the
  // Dropdown trigger's accessible name is 1:1 with the selected option's
  // label, so both buttons read "All" and collide on name. Scope by the
  // filter's own testid instead of fighting for a unique accessible name.
  test('Status filter narrows rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    fireEvent.click(within(screen.getByTestId('spotboard-filter-status')).getByRole('button'))
    fireEvent.click(within(screen.getByRole('menu')).getByText('Awarded'))

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

  test('row action label is Open for an Open quote, and navigates to the shipment\'s SpotBoard tab', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderDashboard()

    const row = screen.getByText('Q-1001').closest('tr')
    const btn = within(row).getByRole('button', { name: 'Open' })
    fireEvent.click(btn)

    const probe = screen.getByTestId('shipments-probe')
    const state = JSON.parse(probe.textContent)
    expect(state.selectedShipmentId).toBe('SH-5001')
    expect(state.requestedTab).toEqual({ key: 'spot' })
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

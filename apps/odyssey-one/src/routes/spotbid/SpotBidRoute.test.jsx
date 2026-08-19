// @vitest-environment jsdom
// SpotBidRoute — /spotbid list. carrierQuotes.js (Phase 1) is real here except
// `listQuotes`, wrapped in a vi.fn so the empty-state test can override it for
// one render; every other export (statusFor, submitBid, fuelFor, …) runs for
// real — this route is thin plumbing over that module, so the coverage that
// matters is "does the route wire the store correctly", not re-deriving the
// store's own math.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import SpotBidRoute from './SpotBidRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { listQuotes, submitBid, resetAllBids, fuelFor } from '../../spotbid/carrierQuotes'

vi.mock('../../spotbid/carrierQuotes', async () => {
  const actual = await vi.importActual('../../spotbid/carrierQuotes')
  return { ...actual, listQuotes: vi.fn(actual.listQuotes) }
})

const NOW = new Date('2026-08-17T12:00:00Z').getTime()

function DetailProbe() {
  const { quoteId } = useParams()
  return <div data-testid="detail-probe">{quoteId}</div>
}

function renderRoute(initialEntries = ['/spotbid']) {
  return render(
    <EditModeProvider>
      <CreateOrderModeProvider>
        <CustomersProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/spotbid" element={<SpotBidRoute />} />
              <Route path="/spotbid/:quoteId" element={<DetailProbe />} />
            </Routes>
          </MemoryRouter>
        </CustomersProvider>
      </CreateOrderModeProvider>
    </EditModeProvider>,
  )
}

beforeEach(() => {
  resetAllBids()
})

afterEach(() => {
  cleanup()
  listQuotes.mockClear()
  vi.useRealTimers()
})

describe('SpotBidRoute', () => {
  test('renders header "SpotBid" and both PillTabs', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()
    expect(screen.getByRole('heading', { name: 'SpotBid' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quote Requests' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quote History' })).toBeTruthy()
  })

  // The 7 open fixtures in carrierQuotes.js are seeded with remaining windows
  // of ~5, 30, 80, 220, 160, 35, 50 minutes (source comments) — soonest-first
  // is 222610, 222617, 222645, 222652, 222624, 222638, 222631.
  test('Requests tab shows open quotes sorted soonest-closing first', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()

    const ids = screen.getAllByRole('cell', { name: /^222\d{3}$/ }).map((c) => c.textContent.trim())
    expect(ids).toEqual(['222610', '222617', '222645', '222652', '222624', '222638', '222631'])
    // Closed fixtures never show up on Requests.
    expect(screen.queryByText('222659')).toBeFalsy()
  })

  test('History tab shows closed quotes with status badges, Requests tab is inactive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: 'Quote History' }))

    expect(within(screen.getByText('222659').closest('tr')).getByText('Expired')).toBeTruthy()
    expect(within(screen.getByText('222666').closest('tr')).getByText('Awarded')).toBeTruthy()
    expect(within(screen.getByText('222673').closest('tr')).getByText('Cancelled')).toBeTruthy()
    // Open quotes never show up on History.
    expect(screen.queryByText('222610')).toBeFalsy()
  })

  test('status filter narrows History to the selected status', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()
    fireEvent.click(screen.getByRole('button', { name: 'Quote History' }))

    const filter = screen.getByTestId('spotbid-status-filter')
    expect(within(filter).getByRole('button', { name: 'All' })).toBeTruthy()
    fireEvent.click(within(filter).getByRole('button', { name: 'Awarded' }))

    expect(screen.getByText('222666')).toBeTruthy()
    expect(screen.getByText('222687')).toBeTruthy()
    expect(screen.queryByText('222659')).toBeFalsy() // Expired
    expect(screen.queryByText('222673')).toBeFalsy() // Cancelled
  })

  test('status filter pills cover All / Expired / Awarded / Cancelled', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()
    fireEvent.click(screen.getByRole('button', { name: 'Quote History' }))

    const filter = screen.getByTestId('spotbid-status-filter')
    for (const label of ['All', 'Expired', 'Awarded', 'Cancelled']) {
      expect(within(filter).getByRole('button', { name: label })).toBeTruthy()
    }

    fireEvent.click(within(filter).getByRole('button', { name: 'Expired' }))
    expect(screen.getByText('222659')).toBeTruthy()
    expect(screen.queryByText('222666')).toBeFalsy() // Awarded

    fireEvent.click(within(filter).getByRole('button', { name: 'All' }))
    expect(screen.getByText('222659')).toBeTruthy()
    expect(screen.getByText('222666')).toBeTruthy()
  })

  test('row click navigates to /spotbid/:quoteId', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()

    fireEvent.click(screen.getByText('222610'))

    expect(screen.getByTestId('detail-probe').textContent).toBe('222610')
  })

  test('Your Quote shows the submitted total after submitBid', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    renderRoute()

    const row = screen.getByText('222610').closest('tr')
    // Column order: quoteId, shipper, equipment, shipFrom, shipTo, stopOffs,
    // hazmat, pickup, deliver, quoteOpened, quoteCloses, yourQuote, best, remaining.
    const cellsBefore = within(row).getAllByRole('cell')
    expect(cellsBefore[11].textContent).toBe('–')

    act(() => {
      submitBid('222610', { linehaul: 1000, currency: 'USD', chargeAmounts: {} }, NOW)
    })

    const fuel = fuelFor({ fuelRatePerMile: 0.68, distanceMi: 325 })
    const total = (1000 + fuel).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const cellsAfter = within(row).getAllByRole('cell')
    expect(cellsAfter[11].textContent).toBe(`$${total}`)
  })

  test('empty state renders when there are no quotes at all', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    listQuotes.mockReturnValueOnce([])
    renderRoute()

    expect(screen.queryByRole('table')).toBeFalsy()
    expect(screen.getByText('No open quote requests')).toBeTruthy()
  })
})

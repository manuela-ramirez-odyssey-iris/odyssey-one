// @vitest-environment jsdom
// SpotBid Detail — /spotbid/:quoteId (plan §"Screens" screen 2, Phase 3).
// carrierQuotes.js windows are OFFSETS from Date.now() at read time (see its
// header comment), so the seeded fixtures used below are deterministically
// Open/Expired/Awarded regardless of when this test runs — no fake timers
// needed (jsdom ceiling: no layout/timer assertions here either).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SpotBidDetailRoute from './SpotBidDetailRoute.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { resetAllBids } from '../../spotbid/carrierQuotes.js'

function renderDetail(quoteId) {
  return render(
    <EditModeProvider>
      <CreateOrderModeProvider>
        <CustomersProvider>
          <MemoryRouter initialEntries={[`/spotbid/${quoteId}`]}>
            <Routes>
              <Route path="/spotbid/:quoteId" element={<SpotBidDetailRoute />} />
            </Routes>
          </MemoryRouter>
        </CustomersProvider>
      </CreateOrderModeProvider>
    </EditModeProvider>,
  )
}

beforeEach(() => resetAllBids())
afterEach(cleanup)

describe('SpotBidDetailRoute', () => {
  test('renders the load summary with full street addresses', () => {
    renderDetail('222610')
    // Ship From (Chattanooga, TN) and Ship To (Lexington, SC) — full street,
    // not just city (detail-only, per plan — the list view is city-only).
    expect(screen.getByText('4820 Riverside Industrial Pkwy')).toBeTruthy()
    expect(screen.getByText('Chattanooga, TN 37406')).toBeTruthy()
    expect(screen.getByText('115 Old Cherokee Rd')).toBeTruthy()
    expect(screen.getByText('Lexington, SC 29072')).toBeTruthy()
    expect(screen.getByText('325 mi')).toBeTruthy()
    expect(screen.getByText('25,500 lb')).toBeTruthy() // 25000 + 500, summed from items
    expect(screen.getByText('Yes')).toBeTruthy() // Hazmat badge
  })

  test('items table renders with hazmat cells, "–" for non-hazmat rows', () => {
    renderDetail('222610')
    expect(screen.getByText('Bulk Chemical Tote')).toBeTruthy()
    expect(screen.getByText('UN3082')).toBeTruthy()
    expect(screen.getByText('III')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View' })).toBeTruthy()
    expect(screen.getByText('Packaging Overrun')).toBeTruthy()
    expect(screen.getAllByText('–').length).toBeGreaterThan(0)
  })

  test('submit flow: linehaul + a charge produce the correct total (incl. computed fuel)', () => {
    renderDetail('222610') // fuelRatePerMile 0.68 × 325mi = $221.00
    fireEvent.change(screen.getByLabelText('Linehaul'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Haz-Mat'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(screen.getByText('Your Quote')).toBeTruthy()
    // 1000 linehaul + 221 fuel + 50 charge = 1271
    expect(screen.getByText('$1,271.00')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Update Bid' })).toBeTruthy()
  })

  test('decline shows an Alert, and re-bid reopens the form', () => {
    renderDetail('222617')
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

    expect(screen.getByText(/declined this quote request/i)).toBeTruthy()
    expect(screen.queryByLabelText('Linehaul')).toBeFalsy()

    fireEvent.click(screen.getByRole('button', { name: 'Submit a bid' }))
    expect(screen.getByLabelText('Linehaul')).toBeTruthy()
  })

  test('Update Bid reopens the form prefilled with the submitted values', () => {
    renderDetail('222624')
    fireEvent.change(screen.getByLabelText('Linehaul'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    fireEvent.click(screen.getByRole('button', { name: 'Update Bid' }))
    expect(screen.getByLabelText('Linehaul').value).toBe('500')
  })

  test('a closed quote shows a status Alert and no editable entry card', () => {
    renderDetail('222659') // seeded closedOutcome: Expired, ~440 min in the past
    expect(screen.getByText(/expired/i)).toBeTruthy()
    expect(screen.queryByLabelText('Linehaul')).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeFalsy()
  })

  test('an unknown quote id shows an EmptyState with a link back to /spotbid', () => {
    renderDetail('999999')
    expect(screen.getByText(/quote not found/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /back to spotbid/i })).toBeTruthy()
  })
})

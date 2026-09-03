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
    renderDetail('222610') // fuelRatePerMile 0.68 × 325mi = $221.00; not in the seeded no-distance slice
    fireEvent.change(screen.getByLabelText('Linehaul'), { target: { value: '1000' } })
    // Additional charges (SPB-72) are collapsed by default — open the disclosure first.
    fireEvent.click(screen.getByRole('button', { name: 'Additional charges (5 available)' }))
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

  // SPB-66 (Kathleen, 2026-08-24): ONE currency per bid, chosen by the
  // PLANNER in Quote Setup — the carrier only sees it, never picks it.
  test('the Linehaul currency shows the quote\'s currency and is not a button', () => {
    renderDetail('222610') // carrierQuotes.js seeds currency: 'USD'
    expect(screen.getByText('USD')).toBeTruthy()
    // FieldSelect renders `locked` as a plain <span>, not a <button> — no
    // clickable currency toggle exists for the carrier.
    expect(screen.queryByRole('button', { name: 'USD' })).toBeFalsy()
    expect(screen.queryByRole('button', { name: 'CAD' })).toBeFalsy()
  })

  test('a submitted bid carries the quote\'s currency, not a carrier-chosen one', () => {
    renderDetail('222610')
    fireEvent.change(screen.getByLabelText('Linehaul'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    // "Your Quote" summary's Currency TitleSubtitle field.
    expect(screen.getByText('USD')).toBeTruthy()
  })

  test('an unknown quote id shows an EmptyState with a link back to /spotbid', () => {
    renderDetail('999999')
    expect(screen.getByText(/quote not found/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /back to spotbid/i })).toBeTruthy()
  })

  // SPB-72: 90% of carriers add no accessorials — collapsed behind a
  // disclosure by default, no free-text "add other charge" affordance.
  test('additional charges are collapsed by default and offer only the configured list', () => {
    renderDetail('222610')
    const disclosure = screen.getByRole('button', { name: 'Additional charges (5 available)' })
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: /^add /i })).toBeFalsy()
    expect(screen.queryByPlaceholderText(/charge name|other charge/i)).toBeFalsy()

    fireEvent.click(disclosure)
    expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText('Haz-Mat')).toBeTruthy()
  })

  // SPB-71: perMile schedule + no distance on the shipment → uncalculable,
  // rendered read-only, and does NOT block submission. Quote 222617 falls in
  // the seeded no-distance slice (fuelSchedule.js seededDistanceMiles).
  test('fuel uncalculable state renders read-only and does not block submission', () => {
    renderDetail('222617')
    expect(screen.getByDisplayValue(/could not be calculated/i)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Linehaul'), { target: { value: '900' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Your Quote')).toBeTruthy()
    // Submission is not blocked, and the uncalculable note still shows in the
    // read-only summary. fuelFor()/totalFor() (carrierQuotes.js) route
    // through the same computeFuel/seededDistanceMiles path as the page, so
    // an uncalculable fuel schedule contributes 0 to the stored total (fuel
    // assumed folded into the base rate, SPB-71) — 900 linehaul + 0 fuel.
    expect(screen.getAllByText('$900.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/could not be calculated/i).length).toBeGreaterThan(0)
  })
})

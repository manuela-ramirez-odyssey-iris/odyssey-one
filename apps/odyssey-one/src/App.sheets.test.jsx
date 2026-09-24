// @vitest-environment jsdom
// S158, docs/superpowers/plans/2026-09-23-slide-over-routes.md Part 1 — the
// sheet-stack MECHANISM in App.jsx: base/layer rendering + exit retention.
// Every real route is mocked out here (Home/Login/Orders/Shipments/etc all
// carry heavy, unrelated dependencies) so this exercises App.jsx's own logic
// against two lightweight fake pages wired through the REAL useSheet.js +
// SheetLayer.jsx — the pieces actually under test. ShipmentsRoute's and
// OrdersRoute's own return-intent behavior are covered separately
// (routes/shipments/sheetReturn.test.jsx, routes/orders/sheetReturn.test.jsx).
import { describe, test, expect, vi, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import useSheet from './routes/useSheet.js'

vi.mock('./devmode/DevMode.jsx', () => ({ default: () => null }))
vi.mock('./routes/Login.jsx', () => ({ default: () => null }))
vi.mock('./routes/Home.jsx', () => ({ default: () => null }))
vi.mock('./routes/Carriers.jsx', () => ({ default: () => <div>Carriers</div> }))
vi.mock('./routes/Tracking.jsx', () => ({ default: () => <div>Tracking</div> }))
vi.mock('./routes/Users.jsx', () => ({ default: () => <div>Users</div> }))
vi.mock('./routes/Partners.jsx', () => ({ default: () => <div>Partners</div> }))
vi.mock('./routes/ButtonDemo.jsx', () => ({ default: () => <div>ButtonDemo</div> }))
vi.mock('./routes/design-system/DesignSystem.jsx', () => ({ default: () => <div>DesignSystem</div> }))
vi.mock('./routes/spot-emails/SpotEmailsRoute.jsx', () => ({ default: () => <div>SpotEmails</div> }))
vi.mock('./routes/tender-emails/TenderEmailsRoute.jsx', () => ({ default: () => <div>TenderEmails</div> }))
vi.mock('./routes/spotbid/SpotBidRoute.jsx', () => ({ default: () => <div>SpotBid</div> }))
vi.mock('./routes/spotbid/SpotBidDetailRoute.jsx', () => ({ default: () => <div>SpotBidDetail</div> }))
vi.mock('./routes/orders/OrdersRoute.jsx', () => ({ default: () => <div>OrdersList</div> }))
vi.mock('./routes/orders/CreateOrderRoute.jsx', () => ({ default: () => <div>CreateOrder</div> }))
vi.mock('./routes/orders/OrderSummaryRoute.jsx', () => ({ default: () => <div>OrderSummary</div> }))
vi.mock('./routes/orders/OrderAuditTrailRoute.jsx', () => ({ default: () => <div>OrderAudit</div> }))
vi.mock('./routes/shipments/OrderChangeReviewRoute.jsx', () => ({ default: () => <div>OrderChangeReview</div> }))
vi.mock('./routes/shipments/OrderChangeEditStopsRoute.jsx', () => ({ default: () => <div>OrderChangeStops</div> }))

// The two fake pages under test — real useSheet/useNavigate wiring, minimal
// content. `shipments-input` is what proves the base DOM node survives a
// sheet opening over it (same node, not a fresh one React remounted).
function FakeShipments() {
  const { openSheet } = useSheet()
  return (
    <div>
      <input data-testid="shipments-input" />
      <button onClick={() => openSheet('/shipments/consolidate/review', { state: { rows: [] } })}>open review</button>
    </div>
  )
}
function FakeConsolidationReview() {
  const { closeSheet } = useSheet()
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => closeSheet('/shipments')}>close review</button>
      {/* Simulates the browser Back button — a POP through the same history
          stack, not a useSheet call (nothing the user does calls useSheet
          for Back either). */}
      <button onClick={() => navigate(-1)}>browser back</button>
    </>
  )
}
vi.mock('./routes/shipments/ShipmentsRoute.jsx', () => ({ default: () => <FakeShipments /> }))
vi.mock('./routes/shipments/ConsolidationReviewRoute.jsx', () => ({ default: () => <FakeConsolidationReview /> }))

afterEach(() => { cleanup(); vi.useRealTimers() })

function renderApp(initialEntries = ['/shipments']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App — sheet stack (S158 Part 1)', () => {
  test('opening a sheet keeps the SAME base DOM node — not remounted', () => {
    renderApp()
    const inputBefore = screen.getByTestId('shipments-input')
    fireEvent.click(screen.getByRole('button', { name: 'open review' }))
    expect(screen.getByRole('button', { name: 'close review' })).toBeTruthy()
    expect(screen.getByTestId('shipments-input')).toBe(inputBefore)
  })

  test('closing keeps the sheet mounted ~300ms with the leaving class, then drops it', async () => {
    vi.useFakeTimers()
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'open review' }))
    fireEvent.click(screen.getByRole('button', { name: 'close review' }))
    // The base underneath is live IMMEDIATELY — closing navigates first.
    expect(screen.getByTestId('shipments-input')).toBeTruthy()
    expect(document.querySelector('.sheet-layer--leaving')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'close review' })).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(300) })
    expect(screen.queryByRole('button', { name: 'close review' })).toBeNull()
    expect(document.querySelector('.sheet-layer')).toBeNull()
  })

  test('browser back (history POP) applies the same exit retention', async () => {
    vi.useFakeTimers()
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'open review' }))
    fireEvent.click(screen.getByRole('button', { name: 'browser back' }))
    expect(document.querySelector('.sheet-layer--leaving')).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(300) })
    expect(document.querySelector('.sheet-layer')).toBeNull()
    expect(screen.getByTestId('shipments-input')).toBeTruthy()
  })

  test('reduced motion: the leaving layer drops immediately, no hold', () => {
    const original = window.matchMedia
    window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} })
    try {
      renderApp()
      fireEvent.click(screen.getByRole('button', { name: 'open review' }))
      fireEvent.click(screen.getByRole('button', { name: 'close review' }))
      expect(document.querySelector('.sheet-layer')).toBeNull()
    } finally {
      window.matchMedia = original
    }
  })

  test('direct URL load renders a sheet route as the base — full page, no layer', () => {
    renderApp(['/shipments/consolidate/review'])
    expect(screen.getByRole('button', { name: 'close review' })).toBeTruthy()
    expect(document.querySelector('.sheet-layer')).toBeNull()
  })

  test('closeSheet with no matching layer in the stack falls back to a plain navigate', () => {
    // No stack at all (direct URL) — closeSheet('/shipments') can't find a
    // match, so it's a plain navigate: /shipments becomes the new base.
    renderApp(['/shipments/consolidate/review'])
    fireEvent.click(screen.getByRole('button', { name: 'close review' }))
    expect(screen.getByTestId('shipments-input')).toBeTruthy()
    expect(document.querySelector('.sheet-layer')).toBeNull()
  })
})

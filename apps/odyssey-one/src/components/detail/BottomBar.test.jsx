// @vitest-environment jsdom
// Fix A, B, C (2026-08-10). BottomBar is exercised directly with controlled
// props (it's driven entirely by ShipmentsRoute's query state, no context
// needed) — ShipmentsBar (@odyssey/ui) is rendered for real; only the lazy
// tab panes are mocked (OrderTab/ProductTab aren't on the other-agents'
// owned-files list for this session) so tests aren't coupled to their real
// data shapes.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'

afterEach(cleanup)

const orderTabMock = vi.fn((props) => (
  <div data-testid="order-pane">{props.data?.orderNumber ?? 'no-order-data'}</div>
))
const productTabMock = vi.fn(() => <div data-testid="product-pane">product</div>)

vi.mock('./OrderTab', () => ({ default: (props) => orderTabMock(props) }))
vi.mock('./ProductTab', () => ({ default: (props) => productTabMock(props) }))
// Not under test here and not worth giving real data shapes to — StopsTab /
// RoutingGuideTab / etc. are owned by other agents this session and never
// reached by these scenarios (default tab is 'order'; the one tab switch
// below goes to 'product').

import BottomBar from './BottomBar.jsx'

afterEach(() => {
  orderTabMock.mockClear()
  orderTabMock.mockImplementation((props) => (
    <div data-testid="order-pane">{props.data?.orderNumber ?? 'no-order-data'}</div>
  ))
  productTabMock.mockClear()
  productTabMock.mockImplementation(() => <div data-testid="product-pane">product</div>)
})

const baseProps = {
  selectedShipmentId: 'SH1',
  shipment: { buyShipment: 'BUY-1' },
  onClose: vi.fn(),
  onRetryDetails: vi.fn(),
}

describe('Fix A / user ruling 2026-08-14 — short headline + brief reason, never the raw server message', () => {
  test('a raw server message is never rendered — only the mapped brief reason', () => {
    render(
      <BottomBar
        {...baseProps}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={{ name: 'ApiError', message: 'Order number already exists: ORD-9', status: 409 }}
      />,
    )
    expect(screen.queryByText('Order number already exists: ORD-9')).toBeFalsy()
    // default tab is 'order' (no requestedTab) — short headline from TABS label
    expect(screen.getByText("Couldn't load orders.")).toBeTruthy()
    // 409 isn't a mapped status — falls to the generic brief-reason fallback
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
  })

  test('falls back to the generic brief reason when the error has no message (e.g. a raw network failure)', () => {
    render(
      <BottomBar
        {...baseProps}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={undefined}
      />,
    )
    expect(screen.getByText("Couldn't load orders.")).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
  })
})

describe('Fix E / user ruling 2026-08-14 — per-tab short headline + brief reason (was: mandated long copy, LINX-12069/72/76/110/114)', () => {
  test('Stops tab error shows its short mandated headline', async () => {
    render(
      <BottomBar
        {...baseProps}
        requestedTab={{ key: 'stops' }}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={undefined}
      />,
    )
    expect(await screen.findByText("Couldn't load stops.")).toBeTruthy()
  })

  test('Cost tab error shows its short mandated headline ("cost details", not "cost allocation")', async () => {
    render(
      <BottomBar
        {...baseProps}
        requestedTab={{ key: 'cost' }}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={undefined}
      />,
    )
    expect(await screen.findByText("Couldn't load cost details.")).toBeTruthy()
  })

  test('a tab with no mandated copy (Tender / routing) derives its headline from the TABS label', async () => {
    render(
      <BottomBar
        {...baseProps}
        requestedTab={{ key: 'routing' }}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={undefined}
      />,
    )
    expect(await screen.findByText("Couldn't load tender.")).toBeTruthy()
  })

  // Tests: "add coverage for ... a mandated tab rendering both lines" —
  // headline (line 1, TAB_ERROR_COPY) + brief reason (line 2, getErrorDetail),
  // never the raw server string.
  test('a mandated tab (Stops) renders both the headline and the brief-reason line, never the raw server message', async () => {
    render(
      <BottomBar
        {...baseProps}
        requestedTab={{ key: 'stops' }}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={{ name: 'ApiError', message: 'stops-service: upstream 503', status: 503 }}
      />,
    )
    expect(await screen.findByText("Couldn't load stops.")).toBeTruthy()
    expect(screen.getByText('The service is temporarily unavailable.')).toBeTruthy()
    expect(screen.queryByText('stops-service: upstream 503')).toBeFalsy()
  })
})

describe('Interim error visual (2026-08-10) — Reload control', () => {
  test('renders a "Reload" button (renamed from "Retry") wired to onRetryDetails', () => {
    const onRetryDetails = vi.fn()
    render(
      <BottomBar
        {...baseProps}
        onRetryDetails={onRetryDetails}
        shipmentDetails={null}
        detailsLoading={false}
        detailsError
        error={undefined}
      />,
    )
    const reloadButton = screen.getByRole('button', { name: 'Reload' })
    expect(reloadButton).toBeTruthy()
    fireEvent.click(reloadButton)
    expect(onRetryDetails).toHaveBeenCalledTimes(1)
  })
})

describe('Fix B — visible staleness instead of silently showing the wrong shipment', () => {
  test('a placeholder (previous shipment\'s data, held by react-query while the new one fetches) still renders — but flagged stale, not "as though current"', async () => {
    const { container } = render(
      <BottomBar
        {...baseProps}
        selectedShipmentId="SH2"
        shipment={{ buyShipment: 'BUY-2' }}
        shipmentDetails={{ orderDetails: [{ orderNumber: 'ORD-A' }] }} // SH1's data, held as placeholder
        detailsLoading={false}
        detailsStale
        detailsError={false}
      />,
    )
    // Header already shows the NEW id (this was always correct, never the bug).
    expect(screen.getByText('BUY-2')).toBeTruthy()
    // Pane still shows the OLD data — no height/layout jump (DEC-61's benefit
    // kept). React.lazy's first resolution is async even with the module
    // mocked, so this is the Suspense fallback for one tick — findByTestId.
    expect((await screen.findByTestId('order-pane')).textContent).toBe('ORD-A')
    // ...but it must be VISIBLY marked stale now (the user's ruling), not silent.
    expect(container.querySelector('[data-stale="true"]')).toBeTruthy()
  })

  test('a genuinely-empty first open shows the plain loader, not a dim overlay of nothing', () => {
    const { container } = render(
      <BottomBar
        {...baseProps}
        shipmentDetails={null}
        detailsLoading
        detailsStale={false}
        detailsError={false}
      />,
    )
    expect(screen.queryByTestId('order-pane')).toBeFalsy()
    expect(container.querySelector('[data-stale="true"]')).toBeFalsy()
    // 2026-08-10 spinner unification: TabLoader now renders the normalized
    // @odyssey/ui Spinner (role="status") instead of a hand-rolled
    // Loader2/.animate-spin — same signal, shared implementation with
    // DataTable's loading state.
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy()
    // 2026-08-10 (user: "put the spinner in the vertical middle of the
    // slot"): TabLoader now centers via the `.tab-loader` CSS class
    // (position:absolute;inset:0 against .shipments-bar__content, which is
    // unconditionally position:relative) instead of an inline height:100%
    // that only resolved on this one call site. jsdom has no layout engine —
    // this only asserts the class landed, NOT that the spinner is actually
    // centered. Real vertical centering is unverified here and still owed a
    // look in a real browser.
    expect(screen.getByRole('status', { name: 'Loading' }).closest('.tab-loader')).toBeTruthy()
  })
})

describe('Fix C — a pane crash degrades only that pane', () => {
  test('bar chrome (strip + tabs) survives a render throw inside the active pane', () => {
    orderTabMock.mockImplementation(() => { throw new Error('boom: OrderTab pane crashed') })
    render(
      <BottomBar
        {...baseProps}
        shipmentDetails={{ orderDetails: [{ orderNumber: 'ORD-A' }] }}
        detailsLoading={false}
        detailsError={false}
      />,
    )
    // The strip/tablist (bar chrome) is unrelated JSX, outside the boundary —
    // it must still be there even though the pane threw.
    expect(screen.getByRole('tablist')).toBeTruthy()
    expect(screen.getByText('BUY-1')).toBeTruthy()
    expect(screen.queryByTestId('order-pane')).toBeFalsy()
  })

  test('switching tabs clears the error state', async () => {
    orderTabMock.mockImplementation(() => { throw new Error('boom') })
    render(
      <BottomBar
        {...baseProps}
        shipmentDetails={{ orderDetails: [{ orderNumber: 'ORD-A' }] }}
        detailsLoading={false}
        detailsError={false}
      />,
    )
    const tablist = screen.getByRole('tablist')
    expect(within(tablist).getByRole('tab', { name: 'Product' })).toBeTruthy()

    fireEvent.click(within(tablist).getByRole('tab', { name: 'Product' }))

    await waitFor(() => expect(screen.getByTestId('product-pane')).toBeTruthy())
  })

  test('switching shipment clears the error state', async () => {
    orderTabMock.mockImplementation(() => { throw new Error('boom') })
    const { rerender } = render(
      <BottomBar
        {...baseProps}
        selectedShipmentId="SH1"
        shipment={{ buyShipment: 'BUY-1' }}
        shipmentDetails={{ orderDetails: [{ orderNumber: 'ORD-A' }] }}
        detailsLoading={false}
        detailsError={false}
      />,
    )
    expect(screen.getByRole('tablist')).toBeTruthy() // pane crashed, bar alive

    orderTabMock.mockImplementation((props) => (
      <div data-testid="order-pane">{props.data?.orderNumber}</div>
    ))
    rerender(
      <BottomBar
        {...baseProps}
        selectedShipmentId="SH2"
        shipment={{ buyShipment: 'BUY-2' }}
        shipmentDetails={{ orderDetails: [{ orderNumber: 'ORD-B' }] }}
        detailsLoading={false}
        detailsError={false}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('order-pane').textContent).toBe('ORD-B'))
  })
})

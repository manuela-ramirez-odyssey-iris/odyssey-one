// @vitest-environment jsdom
// S159 — Executed Shipment Details is a SHEET (docs/superpowers/plans/
// 2026-09-23-slide-over-routes.md), same harness idea as sheetReturn.test.jsx:
// a minimal base/layer split standing in for App.jsx, with the REAL
// ShipmentsRoute + ExecutedShipmentDetailsRoute so the PGI/PGR list genuinely
// never unmounts behind the sheet.
//
// Two modes (2026-09-24 Figma pass, x38TOJGsNryYl3LsKhCtSc): EDIT opens from
// the Post PGI/PGR Errors card (default tab), READ-ONLY from any of the
// other three — see openEditShipment / openViewShipment below.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import ExecutedShipmentDetailsRoute from './ExecutedShipmentDetailsRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'

beforeEach(() => {
  __clearMockPreferences()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

// Same base/layer split as sheetReturn.test.jsx — proves ShipmentsRoute stays
// the SAME mounted instance across the round trip, without the full App.jsx.
function SheetHarness() {
  const location = useLocation()
  const stack = location.state?.sheetStack ?? []
  const base = stack[0] ?? location
  const layers = stack.length ? [...stack.slice(1), location] : []
  const routes = (loc, key) => (
    <Routes key={key} location={loc}>
      <Route path="/shipments/executed/:id" element={<ExecutedShipmentDetailsRoute />} />
      <Route path="/shipments/*" element={<ShipmentsRoute />} />
    </Routes>
  )
  return (
    <>
      {routes(base, 'base')}
      {layers.map((loc) => routes(loc, loc.key))}
    </>
  )
}

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state: { panel: 'pgipgr' } }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <SheetHarness />
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Post PGI/PGR Errors is the default selected card — its Shipment ID links
// open EDIT mode.
async function openEditShipment() {
  await screen.findByText('Executed Shipment Overview')
  const link = await screen.findByRole('button', { name: '879087901' })
  fireEvent.click(link)
  await screen.findByRole('heading', { name: 'Executed Shipment: 1811' })
}

// All Sell Shipments / Rating Errors / Not Responsible rows open READ-ONLY —
// switch off the default card first (user ruling: rows from those three open
// view mode).
async function openViewShipment() {
  await screen.findByText('Executed Shipment Overview')
  fireEvent.click(screen.getByText('All Sell Shipments', { selector: '.widget__title' }))
  const link = await screen.findByRole('button', { name: '879087901' })
  fireEvent.click(link)
  await screen.findByRole('heading', { name: 'Shipment Details' })
}

// Each test mounts the REAL ShipmentsRoute (heavy tree) as the sheet base —
// slower than average under a full-suite parallel run; a generous per-test
// timeout avoids flaking on CPU contention rather than a real regression.
describe('ExecutedShipmentDetailsRoute — sheet policy (S159)', { timeout: 15000 }, () => {
  test('opens as a sheet: the PGI/PGR list stays mounted underneath', async () => {
    renderApp()
    // Distinguishing marker on the base ShipmentsRoute instance — proves it's
    // the SAME node, not a remount, once the sheet is open.
    const overview = await screen.findByText('Executed Shipment Overview')
    await openEditShipment()
    // The base page's node is still in the document (a sibling layer, not a
    // replacement) — not asserting visibility, since App.jsx's real CSS/inert
    // handling isn't part of this harness.
    expect(document.body.contains(overview)).toBe(true)
    expect(screen.getByText('1 Error: Validation Required')).toBeTruthy()
  })

  test('breadcrumb "Shipments" closes the sheet back to the live list', async () => {
    renderApp()
    await openEditShipment()
    fireEvent.click(screen.getByRole('button', { name: 'Shipments' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Executed Shipment: 1811' })).toBeNull())
    expect(screen.getByText('Executed Shipment Overview')).toBeTruthy()
  })

  test('Cancel closes the sheet back to the live list', async () => {
    renderApp()
    await openEditShipment()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Executed Shipment: 1811' })).toBeNull())
    expect(screen.getByText('Executed Shipment Overview')).toBeTruthy()
  })

  test('Mark as shipped closes the sheet back to the live list', async () => {
    renderApp()
    await openEditShipment()
    fireEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Executed Shipment: 1811' })).toBeNull())
    expect(screen.getByText('Executed Shipment Overview')).toBeTruthy()
  })

  test('an erroring dropdown field shows its message', async () => {
    renderApp()
    await openEditShipment()
    expect(screen.getAllByText('No matching shipment found').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Enter an option').length).toBeGreaterThan(0)
  })

  test('fields are editable, local state only', async () => {
    renderApp()
    await openEditShipment()
    const input = screen.getByLabelText('MBoL #')
    fireEvent.change(input, { target: { value: 'EDITED-123' } })
    expect(input.value).toBe('EDITED-123')
  })

  test('Expand All / Collapse All flips every section', async () => {
    renderApp()
    await openEditShipment()
    const toggle = screen.getByRole('button', { name: 'Collapse All' }) // starts expanded
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Expand All' })).toBeTruthy()
  })

  test('READ-ONLY: All Sell Shipments row opens the view-mode sheet, no inputs, no footer', async () => {
    renderApp()
    await openViewShipment()
    // No FormField anywhere — every field is label/value text.
    expect(screen.queryByLabelText('MBoL #')).toBeNull()
    // No StepperButtonsFooter (Cancel / Mark as shipped are edit-only).
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mark as shipped' })).toBeNull()
  })

  test('READ-ONLY: success alert replaces the EDIT error alert', async () => {
    renderApp()
    await openViewShipment()
    expect(screen.getByText('Validation passed — no errors found.')).toBeTruthy()
    expect(screen.queryByText('1 Error: Validation Required')).toBeNull()
  })

  test('READ-ONLY: Pickup/Delivery columns are "Shipper details" / "Consignee details" with the mock\'s shipper values', async () => {
    renderApp()
    await openViewShipment()
    expect(screen.getByText('Shipper details')).toBeTruthy()
    expect(screen.getByText('Consignee details')).toBeTruthy()
    expect(screen.getByText('KRM1234')).toBeTruthy()
    expect(screen.getByText('KRM Engineering')).toBeTruthy()
    expect(screen.getByText('123 Warehouse St')).toBeTruthy()
    expect(screen.getByText('Muscoda')).toBeTruthy()
  })

  test('READ-ONLY: Line section renders as "Packaging"', async () => {
    renderApp()
    await openViewShipment()
    // Both the renamed section AND its "Packaging" sub-accordion read
    // "Packaging" — two matches, not zero, is the assertion.
    expect(screen.getAllByText('Packaging').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('Line section')).toBeNull()
  })

  test('EDIT: Line section General shows the 2026-09-24 field set', async () => {
    renderApp()
    await openEditShipment()
    expect(screen.getByLabelText('External Line Identifier')).toBeTruthy()
    expect(screen.getByLabelText('Third Party Ref #')).toBeTruthy()
    expect(screen.getByLabelText('Third Party Line Ref #')).toBeTruthy()
    expect(screen.getByLabelText('Harmonized Code')).toBeTruthy()
  })

  test('Cancel/close from READ-ONLY still slides back to the live list', async () => {
    renderApp()
    await openViewShipment()
    fireEvent.click(screen.getByRole('button', { name: 'Shipments' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Shipment Details' })).toBeNull())
    expect(screen.getByText('Executed Shipment Overview')).toBeTruthy()
  })
})

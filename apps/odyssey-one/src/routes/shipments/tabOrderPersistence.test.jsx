// @vitest-environment jsdom
// Fix D (LINX-11786, 2026-08-10) integration coverage. `mergeTabOrder`'s pure
// merge logic is pinned separately in ../../components/detail/mergeTabOrder.test.js;
// this file exercises the ACTUAL wiring in ShipmentsRoute.jsx end-to-end
// through the real useUserPreference → preferenceService mock store, so a
// round-trip claim isn't just "the reducer looks right" but "the app really
// persists it." Mounts the full route (AppShell chrome + Navbar + GlobalSearch
// all need real providers — same requirement noted in vitest.setup.js's
// ResizeObserver polyfill comment).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { getPreference, __clearMockPreferences } from '../../api/services/preferenceService'
import { DEFAULT_TAB_ORDER } from '../../components/detail/BottomBar.jsx'

// Real shipments.json rows, scoped to a customer in CustomersContext's default
// selection (Valtris / Kemira NA — see CustomersContext.jsx) so the picked row
// is reachable without touching the Customers picker:
//   sellShipment 25319141 → VALTRIS_01, panel 'exceptions'
//   sellShipment 25888777 → KEMIRA_NA_01, panel 'monitoring'
const EXCEPTIONS_SHIPMENT_ID = '25319141'
const MONITORING_SHIPMENT_ID = '25888777'

beforeEach(() => {
  __clearMockPreferences()
  // getSellShipmentDetail (mock mode) fetches `/details/{id}.json` directly —
  // not exercised by this fix (the Tab Arrangement button only needs
  // `selectedShipmentId` truthy, not a resolved detail), stubbed so it fails
  // fast and quietly instead of jsdom attempting a real network call.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderRoute(qc, { selectedShipmentId } = {}) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state: selectedShipmentId ? { selectedShipmentId } : undefined }]}>
        <CustomersProvider>
          <EditModeProvider>
            <CreateOrderModeProvider>
              <ShipmentsRoute />
            </CreateOrderModeProvider>
          </EditModeProvider>
        </CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openTabArrangement() {
  fireEvent.click(await screen.findByRole('button', { name: 'Tab arrangement' }))
  // RightPanel is ALWAYS mounted (open/closed just toggles `aria-hidden` on
  // its dock wrapper) so `findByText('Shipment tabs')` would resolve even
  // while closed — findByRole('region', ...) is the one that actually
  // respects aria-hidden, so it only resolves once genuinely open.
  return screen.findByRole('region', { name: 'Shipment tabs' })
}

// MenuRowCheckbox (packages/ui) renders its label as a plain sibling <span>,
// not associated via <label>/aria-labelledby, so `getByRole('checkbox', {
// name })` can't find it by accessible name — locate the row by its visible
// label text instead and pull the checkbox out of that row. Scoped to the
// RightPanel (aria-label="Shipment tabs") because the SAME tab labels
// ('SpotBid', 'Notes'...) also appear, disabled, in the ShipmentsBar tab
// strip behind the panel.
function checkboxForLabel(text) {
  const panel = screen.getByRole('region', { name: 'Shipment tabs' })
  const row = within(panel).getByText(text).closest('.menu-row-checkbox')
  return within(row).getByRole('checkbox')
}

describe('Fix D — tab order persists per panel through the preference layer', () => {
  test('unchecking a tab, saving, and reloading round-trips through the preference store', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderRoute(qc, { selectedShipmentId: EXCEPTIONS_SHIPMENT_ID })

    await openTabArrangement()
    // Uncheck Documents — a plain checkbox toggle (no drag needed to prove
    // the order/composition round-trips).
    fireEvent.click(checkboxForLabel('Documents'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    // Save is fire-and-forget (useUserPreference.save doesn't await) — wait
    // for the mock store to actually receive it before asserting.
    await waitFor(async () => {
      const pref = await getPreference('shipments.tabOrder')
      expect(pref?.exceptions).toBeTruthy()
    })
    // Stored shape is `{ order, knownKeys }`, not a bare array (see
    // mergeTabOrder's comment — `knownKeys` is what disambiguates "the user
    // hid this tab" from "this tab didn't exist at save time" on reload).
    const saved = await getPreference('shipments.tabOrder')
    expect(saved.exceptions.order).not.toContain('documents')
    expect(saved.exceptions.order[0]).toBe('order') // pin survives the save path too

    // Simulate a reload: fresh React tree AND a fresh QueryClient (the real
    // "next session" case — same backing mockStore, nothing client-cached).
    // Re-select the same shipment (selection itself is route-state, not part
    // of this fix — only the SAVED TAB ORDER needs to survive the reload) so
    // the Tab Arrangement button is enabled again.
    cleanup()
    const qc2 = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderRoute(qc2, { selectedShipmentId: EXCEPTIONS_SHIPMENT_ID })
    await openTabArrangement()
    expect(checkboxForLabel('Documents').checked).toBe(false)
  })

  test('Exceptions and Monitoring keep separate orders', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderRoute(qc, { selectedShipmentId: EXCEPTIONS_SHIPMENT_ID })

    // Modify Exceptions' order only.
    await openTabArrangement()
    fireEvent.click(checkboxForLabel('Notes'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const pref = await getPreference('shipments.tabOrder')
      expect(pref?.exceptions?.order).not.toContain('notes')
    })
    // Close the (now-clean) panel before switching panels — TabArrangementPanel
    // only re-syncs its draft from `tabOrder` on an isOpen false→true edge, so
    // leaving it open across the panel switch would show stale (Exceptions')
    // checkbox state instead of Monitoring's.
    fireEvent.click(screen.getByRole('button', { name: 'Tab arrangement' }))

    // Switch to Monitoring (the shipment stays selected — BottomBar's
    // selection is independent of which top panel is active) and reopen.
    fireEvent.click(screen.getByText('Monitoring'))
    await openTabArrangement()
    expect(checkboxForLabel('Notes').checked).toBe(true)

    const saved = await getPreference('shipments.tabOrder')
    expect(saved.monitoring).toBeFalsy() // Monitoring was never saved — no cross-contamination
  })

  test('a stored order missing a newly-added tab (SpotBoard) still shows that tab on load', async () => {
    // Seed the preference store directly with a STALE order (predates 'spot'),
    // simulating a save made before SpotBoard shipped — the merge-on-hydrate
    // path (mergeTabOrder) is what must recover it, not this test recreating it.
    const stale = DEFAULT_TAB_ORDER.filter((k) => k !== 'spot')
    const { putPreference } = await import('../../api/services/preferenceService')
    await putPreference('shipments.tabOrder', { exceptions: stale })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderRoute(qc, { selectedShipmentId: EXCEPTIONS_SHIPMENT_ID })
    await openTabArrangement()
    expect(checkboxForLabel('SpotBid').checked).toBe(true)
  })
})

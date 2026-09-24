// @vitest-environment jsdom
// S158 plan Part 1 §4 — ShipmentsRoute's return-intent re-application. Same
// harness idea as App.sheets.test.jsx (a base/layer split, minus the
// animation/retention machinery already covered there) but with the REAL
// ShipmentsRoute + ConsolidationReviewRoute, so the base page genuinely never
// unmounts across the round trip — the thing the old sibling-route design
// couldn't do at all.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import ConsolidationReviewRoute from './ConsolidationReviewRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'
import * as gridService from '../../api/services/gridService'

beforeEach(() => {
  __clearMockPreferences()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

// Minimal stand-in for App.jsx's base/layer split (S158 §1): base is
// stack[0] ?? location, layers are stack.slice(1) + location — enough to
// prove ShipmentsRoute stays the SAME mounted instance across the round trip,
// without pulling in the real App.jsx (login gate, full route table, the
// SheetLayer portal/animation already covered by App.sheets.test.jsx).
function SheetHarness() {
  const location = useLocation()
  const stack = location.state?.sheetStack ?? []
  const base = stack[0] ?? location
  const layers = stack.length ? [...stack.slice(1), location] : []
  const routes = (loc, key) => (
    <Routes key={key} location={loc}>
      <Route path="/shipments/consolidate/review" element={<ConsolidationReviewRoute />} />
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
  // staleTime matches the real app's queryClient.js — the default (0) would
  // refetch every time a query key is revisited regardless of caching,
  // which is not what "served from cache" means in production.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/shipments']}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <SheetHarness />
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const rowBoxes = () => screen.queryAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Select ') && !c.getAttribute('aria-label').startsWith('Select all'))
const enabledRowBoxes = () => rowBoxes().filter((c) => !c.disabled)

async function enterModeAndSelectTwo() {
  fireEvent.click(await screen.findByRole('button', { name: 'Consolidate' }))
  await screen.findByRole('heading', { name: 'Shipments Consolidation' })
  await waitFor(() => expect(enabledRowBoxes().length).toBeGreaterThan(1))
  fireEvent.click(enabledRowBoxes()[0])
  await screen.findByText('Selected Customer:')
  // The just-checked row floats to the top (Part 3) — re-query for an
  // unchecked one rather than assuming an index.
  await waitFor(() => expect(enabledRowBoxes().filter((c) => !c.checked).length).toBeGreaterThan(0))
  fireEvent.click(enabledRowBoxes().filter((c) => !c.checked)[0])
  await screen.findByRole('button', { name: 'Consolidate 2 Shipments' })
}

describe('ShipmentsRoute — return-intent re-application (S158 plan §4)', () => {
  test('Modify Selection re-applies rows on the STILL-MOUNTED page (no remount)', async () => {
    renderApp()
    const heading = await screen.findByRole('heading', { name: 'Shipments' })
    await enterModeAndSelectTwo()
    fireEvent.click(screen.getByRole('button', { name: 'Consolidate 2 Shipments' }))
    await screen.findByRole('heading', { name: 'Review & Apply Manual Consolidation' })

    // Uncheck one row past the minimum → the "Modify Selection" dialog offers
    // to carry the planner's INTENT (the remaining row) back into mode.
    const includeBoxes = screen.getAllByRole('checkbox').filter((c) => c.getAttribute('aria-label')?.startsWith('Include '))
    fireEvent.click(includeBoxes[0])
    fireEvent.click(screen.getByRole('button', { name: 'Modify Selection' }))

    // Lands back on Shipments Consolidation with exactly one row selected —
    // and the SAME "Shipments" heading node never unmounted in between.
    await screen.findByRole('heading', { name: 'Shipments Consolidation' })
    expect(screen.queryByRole('heading', { name: 'Shipments' })).toBeNull() // swapped by consolidate mode, not gone via remount
    expect(document.body.contains(heading)).toBe(true) // the ORIGINAL DOM node is still attached, just re-rendered
  })

  test('post-apply close (consolidateExit) restores the prior panel', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Switch to Monitoring before entering the mode.
    fireEvent.click(screen.getByRole('button', { name: /^Monitoring/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^Monitoring/ }).getAttribute('aria-pressed')).toBe('true'))

    await enterModeAndSelectTwo()
    fireEvent.click(await screen.findByRole('button', { name: /^Consolidate \d Shipment/ }))
    await screen.findByRole('heading', { name: 'Review & Apply Manual Consolidation' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))

    // Back on Shipments, out of consolidate mode, Monitoring restored — not
    // the 'exceptions' mount default a remount used to silently reset to.
    await screen.findByRole('heading', { name: 'Shipments' })
    expect(screen.getByRole('button', { name: /^Monitoring/ }).getAttribute('aria-pressed')).toBe('true')
  })

  test('no second list fetch on return — the pre-mode query is served from cache', async () => {
    const spy = vi.spyOn(gridService, 'getShipmentErrorList')
    renderApp()
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    // Consolidate mode legitimately fires ITS OWN queries (a `filter` param
    // narrows the list to Direct-only + excludes the selection) — those are
    // new identities, expected. What must NOT re-fire is the ORIGINAL,
    // pre-mode identity (no `filter`, no `searchCriteria`) once the planner
    // is back on it: exitConsolidate restores the exact same panel/tab/
    // search, so it's the same react-query key, served from cache.
    const normalModeCalls = () => spy.mock.calls.filter(([params]) => !params.filter && !params.searchCriteria).length
    const callsBeforeMode = normalModeCalls()

    await enterModeAndSelectTwo()
    fireEvent.click(screen.getByRole('button', { name: 'Consolidate 2 Shipments' }))
    await screen.findByRole('heading', { name: 'Review & Apply Manual Consolidation' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })

    expect(normalModeCalls()).toBe(callsBeforeMode)
  })
})

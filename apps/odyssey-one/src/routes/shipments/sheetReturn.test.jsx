// @vitest-environment jsdom
// S158 plan Part 1 §4 — ShipmentsRoute's return-intent re-application. Same
// harness idea as App.sheets.test.jsx (a base/layer split, minus the
// animation/retention machinery already covered there) but with the REAL
// ShipmentsRoute + ConsolidateStopsRoute, so the base page genuinely never
// unmounts across the round trip — the thing the old sibling-route design
// couldn't do at all.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import useSheet from '../useSheet'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import ConsolidateStopsRoute from './ConsolidateStopsRoute.jsx'
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

// Stands in for a successful Apply: the exact state ConsolidateStopsRoute returns with (S8.1).
const CREATED = {
  id: 'C70000001', sellShipment: 'C70000001', buyShipment: 'b1', odysseyShipmentIdentifier: 'C70000001',
  orders: [], pickupNumbers: [], poNumbers: [], customerId: 'VALTRIS_01', customerName: 'Valtris',
  shipmentType: 'Consolidation', tenderStatus: '', shipmentStatus: '', category: 'consolidation', grossWeight: '100',
}
function OpenFake() {
  const { openSheet } = useSheet()
  return <button onClick={() => openSheet('/shipments/fake-applied')}>open fake sheet</button>
}
function FakeApplied() {
  const { closeSheet } = useSheet()
  return <button onClick={() => closeSheet('/shipments', { state: { consolidateExit: true, createdShipment: CREATED, panel: 'monitoring', tab: 'consolidation' } })}>fake apply</button>
}

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
      <Route path="/shipments/consolidate/stops" element={<ConsolidateStopsRoute />} />
      <Route path="/shipments/fake-applied" element={<FakeApplied />} />
      <Route path="/shipments/*" element={<ShipmentsRoute />} />
    </Routes>
  )
  return (
    <>
      <OpenFake />
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

// CNS-19 — the mode's CTA opens the stops editor; its first crumb (through the
// editor's dirty check) returns to the mode with the selection kept.
const backToMode = async () => {
  await screen.findByRole('navigation', { name: 'Breadcrumb' })
  fireEvent.click(screen.getByText('Shipments Consolidation', { selector: '.order-change__crumbs *' }))
}

describe('ShipmentsRoute — return-intent re-application (S158 plan §4)', () => {
  test('the editor\'s first crumb re-applies rows on the STILL-MOUNTED page (no remount)', async () => {
    renderApp()
    const heading = await screen.findByRole('heading', { name: 'Shipments' })
    await enterModeAndSelectTwo()
    fireEvent.click(screen.getByRole('button', { name: 'Consolidate 2 Shipments' }))
    await backToMode()

    // Lands back on Shipments Consolidation with both rows still selected —
    // and the SAME "Shipments" heading node never unmounted in between.
    await screen.findByRole('heading', { name: 'Shipments Consolidation' })
    expect(screen.getByRole('button', { name: 'Consolidate 2 Shipments' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Shipments' })).toBeNull() // swapped by consolidate mode, not gone via remount
    expect(document.body.contains(heading)).toBe(true) // the ORIGINAL DOM node is still attached, just re-rendered
  })

  test('exiting the mode after the editor round trip still restores the prior panel', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Shipments' })
    // Switch to Monitoring before entering the mode.
    fireEvent.click(screen.getByRole('button', { name: /^Monitoring/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^Monitoring/ }).getAttribute('aria-pressed')).toBe('true'))

    await enterModeAndSelectTwo()
    fireEvent.click(await screen.findByRole('button', { name: /^Consolidate \d Shipment/ }))
    await backToMode()
    await screen.findByRole('heading', { name: 'Shipments Consolidation' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

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
    await backToMode()
    await screen.findByRole('heading', { name: 'Shipments Consolidation' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })

    expect(normalModeCalls()).toBe(callsBeforeMode)
  })

  // S8.1 - the return-intent lands on the tab the C was filed under and the S155
  // pin survives the mode exit (it used to be cleared by the same render's listParams change).
  test('a successful Apply returns to Monitoring > Consolidation with the created C pinned and highlighted', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Shipments' })
    await enterModeAndSelectTwo()
    fireEvent.click(screen.getByRole('button', { name: 'open fake sheet' }))
    fireEvent.click(await screen.findByRole('button', { name: 'fake apply' }))

    await screen.findByRole('heading', { name: 'Shipments' })
    expect(screen.getByRole('button', { name: /^Monitoring/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^Consolidation/ }).getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(document.querySelectorAll('tbody tr')[0]?.textContent).toContain('C70000001'))
    await act(async () => { await Promise.resolve() }) // flush the exit's pending effects (lock-release recommit): the pin must survive them
    const first = document.querySelectorAll('tbody tr')[0]
    expect(first.textContent).toContain('C70000001')
    expect(first.getAttribute('data-highlight')).toBe('true')
    expect(document.querySelector('[data-landing]')).toBeTruthy()
  })
})

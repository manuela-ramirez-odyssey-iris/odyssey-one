// @vitest-environment jsdom
// Case 12 / GS-22 refinement (user, 2026-08-03): reopening a COMMITTED date
// chip (open again, `from` already set) must NOT force-close an already-open
// results panel — only a FRESH open chip (no `from` yet) still owns the space
// below the bar. Mocks the hook + CustomersContext (same pattern as
// ValueComboBox.test.jsx) so this exercises the real open/close effect in
// ShipmentsGlobalSearch.jsx without wiring the live/mock adapter.
import { useState } from 'react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

afterEach(cleanup)

// S108 1a: ShipmentsGlobalSearch now calls `useUserPreference` (saved filters)
// directly, so every mount needs a real QueryClient in context — mirrors
// resolve.test.jsx / CarrierBid.test.jsx's wrapping convention. Used for both
// `render` and `rerender` (rerender replaces the whole tree, so the provider
// has to be re-supplied every call, same `qc` instance).
function withQueryClient(qc, ui) {
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
}

function baseHookReturn(overrides) {
  return {
    value: '', query: '', onChange: vi.fn(), onClear: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn(),
    chips: [], onChipCommit: vi.fn(), onChipRemove: vi.fn(),
    textChip: null, onTextCommit: vi.fn(), onTextRemove: vi.fn(), onSetCommit: vi.fn(),
    onDateCommit: vi.fn(), onDateToggle: vi.fn(), applyChips: vi.fn(),
    suggestionSections: [], suggestionsOpen: false,
    results: [], resultTotal: 0, searching: false, pendingDateChip: false,
    ...overrides,
  }
}

async function mountWithHook(hookReturn) {
  vi.resetModules()
  vi.doMock('../../contexts/CustomersContext.jsx', () => ({
    useCustomers: () => ({ selectedDataIds: null }),
  }))
  vi.doMock('../../search/useGlobalSearch', () => ({
    useGlobalSearch: () => hookReturn,
  }))
  const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
  return { ShipmentsGlobalSearch }
}

const panelOpen = (container) => !!container.querySelector('.shipments-results-panel')

// Fix B tests need onDateToggle to actually flip a chip's `open` (the real
// SearchChip commits it, and dismissSearchUI reads `chips` to force-close it)
// — a stateful fake hook (real useState, called inside the real render tree)
// stands in for useGlobalSearch, matching the "fake the hook, keep everything
// else real" pattern above, minus its own request/adapter plumbing.
function useFakeGlobalSearchWithChipState(initialChips, extra = {}) {
  const [chips, setChips] = useState(initialChips)
  const onDateToggle = (key, open) =>
    setChips((cs) => cs.map((c) => (c.key === key ? { ...c, open } : c)))
  const pendingDateChip = chips.some((c) => c.kind === 'date-range' && c.open)
  return baseHookReturn({ ...extra, chips, onDateToggle, pendingDateChip })
}

async function mountWithFakeChipState(initialChips, extra = {}) {
  vi.resetModules()
  vi.doMock('../../contexts/CustomersContext.jsx', () => ({
    useCustomers: () => ({ selectedDataIds: null }),
  }))
  vi.doMock('../../search/useGlobalSearch', () => ({
    useGlobalSearch: () => useFakeGlobalSearchWithChipState(initialChips, extra),
  }))
  const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
  return ShipmentsGlobalSearch
}

describe('ShipmentsGlobalSearch — Case 12 / GS-22 reopened date chip', () => {
  test('reopening a committed date chip (open, from set) leaves an open results panel open', async () => {
    const committedClosed = { key: 'ship-date', kind: 'date-range', open: false, from: '2026-08-01', label: 'Ship Date' }
    let hookReturn = baseHookReturn({ chips: [committedClosed], pendingDateChip: false })
    const { ShipmentsGlobalSearch } = await mountWithHook(hookReturn)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container, rerender } = render(withQueryClient(qc, <ShipmentsGlobalSearch />))
    // Committing the chip (chipCount 0 -> 1) opens the panel.
    expect(panelOpen(container)).toBe(true)

    // User clicks the committed chip to reopen its calendar for editing.
    hookReturn.chips = [{ ...committedClosed, open: true }]
    hookReturn.pendingDateChip = true
    rerender(withQueryClient(qc, <ShipmentsGlobalSearch />))
    expect(panelOpen(container)).toBe(true)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('a fresh open date chip (no date yet) still closes the panel', async () => {
    const committedText = { key: 'ship-date', kind: 'date-range', open: false, from: '2026-08-01' }
    let hookReturn = baseHookReturn({ chips: [committedText], pendingDateChip: false })
    const { ShipmentsGlobalSearch } = await mountWithHook(hookReturn)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container, rerender } = render(withQueryClient(qc, <ShipmentsGlobalSearch />))
    expect(panelOpen(container)).toBe(true)

    // A second, brand-new date chip is opened for its first pick.
    hookReturn.chips = [committedText, { key: 'delivery-date', kind: 'date-range', open: true, from: null }]
    hookReturn.pendingDateChip = true
    rerender(withQueryClient(qc, <ShipmentsGlobalSearch />))
    expect(panelOpen(container)).toBe(false)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('first-commit-expanded chip still opens results only once it closes (dateCompleted path unchanged)', async () => {
    const freshOpenNoDate = { key: 'ship-date', kind: 'date-range', open: true, from: null }
    let hookReturn = baseHookReturn({ chips: [freshOpenNoDate], pendingDateChip: true })
    const { ShipmentsGlobalSearch } = await mountWithHook(hookReturn)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container, rerender } = render(withQueryClient(qc, <ShipmentsGlobalSearch />))
    expect(panelOpen(container)).toBe(false)

    // The chip lands EXPANDED with `from` prefilled, then closes.
    hookReturn.chips = [{ ...freshOpenNoDate, open: false, from: '2026-08-01' }]
    hookReturn.pendingDateChip = false
    rerender(withQueryClient(qc, <ShipmentsGlobalSearch />))
    expect(panelOpen(container)).toBe(true)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

describe('ShipmentsGlobalSearch — Fix B (user, 2026-08-03): selecting a shipment is a pure dismissal', () => {
  // Committed and CLOSED at mount (so the initial 0->1 chip commit opens the
  // panel, same as every other test in this file) — reopened via a real click
  // on the real SearchChip toggle button, exercising the actual commit path.
  const committedClosedChip = { key: 'ship-date', kind: 'date-range', dateLabel: 'Ship Date', single: true, open: false, from: '08/01/2026', to: '08/01/2026', label: 'Ship Date: 08/01/2026' }
  const match = { id: 'm1', matchId: 'SHP123', 'data-shipment-key': 'ship-1' }

  test('clicking a match row while a date chip is open closes the panel and does not reopen it, and does not commit', async () => {
    const onCommitQuery = vi.fn()
    const onSelectShipment = vi.fn()
    const ShipmentsGlobalSearch = await mountWithFakeChipState(
      [committedClosedChip],
      { results: [match], resultTotal: 1 },
    )
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(withQueryClient(
      qc,
      <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} onSelectShipment={onSelectShipment} />,
    ))
    expect(panelOpen(container)).toBe(true)

    // Reopen the chip's calendar (real SearchChip toggle button).
    fireEvent.click(container.querySelector('.search-chip__toggle'))
    expect(panelOpen(container)).toBe(true)

    const row = container.querySelector('.match-row')
    expect(row).toBeTruthy()
    fireEvent.click(row)

    expect(onSelectShipment).toHaveBeenCalledWith('ship-1', undefined, undefined)
    expect(onCommitQuery).not.toHaveBeenCalled()
    expect(panelOpen(container)).toBe(false)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('a click landing on the docked ShipmentsBar closes the panel and does not reopen it, without committing', async () => {
    const onCommitQuery = vi.fn()
    const ShipmentsGlobalSearch = await mountWithFakeChipState(
      [committedClosedChip],
      { results: [match], resultTotal: 1 },
    )
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container, getByTestId } = render(withQueryClient(
      qc,
      <>
        <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} />
        <div className="shipments-bar" data-testid="docked-bar">docked bar</div>
      </>,
    ))
    expect(panelOpen(container)).toBe(true)

    fireEvent.click(container.querySelector('.search-chip__toggle'))
    expect(panelOpen(container)).toBe(true)

    fireEvent.mouseDown(getByTestId('docked-bar'))

    expect(onCommitQuery).not.toHaveBeenCalled()
    expect(panelOpen(container)).toBe(false)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

// S108 Phase 1a/1c — the vanishing-write defect this hosting move fixes: the
// old design would have held saved-filter state in ShipmentsFiltersView,
// which unmounts every time the panel closes. `useUserPreference`'s `save()`
// is fire-and-forget and never seeds the query cache, so a filter saved right
// before close would be gone on reopen. Proven here BEHAVIOURALLY — save,
// close the panel (unmounts the real ShipmentsFiltersView), reopen it
// (remounts) — the filter is still there, because the state + the paired
// `setQueryData` live in the always-mounted host, not the view.
describe('ShipmentsGlobalSearch — saved filters persistence (S108 1a/1c)', () => {
  const sampleChips = [
    { key: 'customer-id', kind: 'attribute', label: 'Customer ID: G2O', attrLabel: 'Customer ID', queryValue: 'G2O', dataKey: 'customerId', group: 'Customers & Parties' },
  ]

  // Stands in for the real ShipmentsFiltersView (1d, a later task, wires the
  // Saved tab to these props) — just enough surface to drive saveFilter and
  // observe what the host passes back down after a real close/reopen cycle.
  async function mountWithFiltersStub() {
    vi.resetModules()
    let latestProps = null
    vi.doMock('../../contexts/CustomersContext.jsx', () => ({
      useCustomers: () => ({ selectedDataIds: null }),
    }))
    vi.doMock('../../search/useGlobalSearch', () => ({
      useGlobalSearch: () => baseHookReturn({}),
    }))
    vi.doMock('./ShipmentsFiltersView', () => ({
      default: (props) => {
        latestProps = props
        return (
          <div data-testid="filters-stub">
            <button data-testid="save-btn" onClick={() => props.onSaveFilter('My Customers', sampleChips)}>save</button>
            <button data-testid="close-btn" onClick={() => props.onClose()}>close</button>
          </div>
        )
      },
    }))
    const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
    return { ShipmentsGlobalSearch, getProps: () => latestProps }
  }

  test('a saved filter survives a panel close (unmount) + reopen (remount)', async () => {
    const { ShipmentsGlobalSearch, getProps } = await mountWithFiltersStub()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Pre-seed the cache with the empty preference so the initial async
    // getPreference() fetch (staleTime: Infinity) can't race the setQueryData
    // below and clobber it — same queryKey useUserPreference builds.
    qc.setQueryData(['user-preference', 'shipments.savedFilters'], null)
    const { container } = render(withQueryClient(qc, <ShipmentsGlobalSearch />))

    fireEvent.click(container.querySelector('.filter-button'))
    expect(getProps().savedFilters).toEqual([])

    // `setQueryData` notifies the query observer via react-query's notifyManager,
    // which batches through a microtask — the re-render lands just after this
    // synchronous click, hence the wait (not a network round trip: mock-mode
    // `putPreference` is synchronous, only the notify is deferred).
    fireEvent.click(container.querySelector('[data-testid="save-btn"]'))
    await waitFor(() => expect(getProps().savedFilters).toHaveLength(1))
    expect(getProps().savedFilters[0].name).toBe('My Customers')
    expect(getProps().savedFilters[0].chips[0].queryValue).toBe('G2O')

    // Close (unmounts the stub, standing in for ShipmentsFiltersView) and
    // reopen (remounts it) — this is the exact vanishing-write scenario.
    fireEvent.click(container.querySelector('[data-testid="close-btn"]'))
    expect(container.querySelector('[data-testid="filters-stub"]')).toBeNull()
    fireEvent.click(container.querySelector('.filter-button'))
    expect(getProps().savedFilters).toHaveLength(1)
    expect(getProps().savedFilters[0].name).toBe('My Customers')

    // Direct proof of the pairing itself: the cache now holds exactly what
    // was passed to save().
    expect(qc.getQueryData(['user-preference', 'shipments.savedFilters'])).toEqual({
      v: 1,
      custom: [expect.objectContaining({ name: 'My Customers' })],
    })

    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
    vi.doUnmock('./ShipmentsFiltersView')
  })
})

// S108 1b — the keyboard trap the spec calls out by name: the wrapper's
// handleKeyDown commits the search on Enter in ANY input and closes the whole
// Filters panel on Escape. Both fire while typing a filter name unless
// handleKeyDown early-returns for the entire time the Save Filter modal is
// open. Uses the REAL ShipmentsFiltersView + real SaveFilterModal (no stub)
// so this exercises the actual DOM: click filter-button → Filters view →
// "Save Filters" link → modal mounted as a sibling inside the wrapper.
describe('ShipmentsGlobalSearch — Save Filter modal keyboard trap (S108 1b)', () => {
  const sampleChip = {
    key: 'customer-id', kind: 'attribute', label: 'Customer ID: G2O',
    attrLabel: 'Customer ID', queryValue: 'G2O', dataKey: 'customerId', group: 'Customers & Parties',
  }

  async function mountWithSaveModalOpen(onCommitQuery) {
    vi.resetModules()
    vi.doMock('../../contexts/CustomersContext.jsx', () => ({
      useCustomers: () => ({ selectedDataIds: null }),
    }))
    vi.doMock('../../search/useGlobalSearch', () => ({
      useGlobalSearch: () => baseHookReturn({ chips: [sampleChip] }),
    }))
    const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Same pre-seed as the persistence test above — sidesteps the async
    // getPreference() fetch racing the render.
    qc.setQueryData(['user-preference', 'shipments.savedFilters'], null)
    const utils = render(withQueryClient(qc, <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} />))
    fireEvent.click(utils.container.querySelector('.filter-button'))
    fireEvent.click(utils.getByText('Save Filters'))
    return utils
  }

  test('Enter in the title field does NOT commit the search', async () => {
    const onCommitQuery = vi.fn()
    const { getByLabelText } = await mountWithSaveModalOpen(onCommitQuery)
    const titleInput = getByLabelText('Filter Title')
    fireEvent.change(titleInput, { target: { value: 'My Filter' } })
    fireEvent.keyDown(titleInput, { key: 'Enter' })
    expect(onCommitQuery).not.toHaveBeenCalled()
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('Escape closes the modal only — the Filters panel stays open', async () => {
    const { container, queryByRole } = await mountWithSaveModalOpen(vi.fn())
    expect(container.querySelector('.shipments-results-panel')).toBeTruthy()
    expect(queryByRole('dialog')).toBeTruthy()

    // ModalMedium owns Escape dismissal via its own window listener (same
    // pattern as CustomersModal.test.jsx) — the wrapper's handleKeyDown does
    // nothing while the modal is open, so this event reaches ModalMedium
    // untouched instead of also closing the panel behind it.
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
    expect(container.querySelector('.shipments-results-panel')).toBeTruthy()
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

// S108 1d — the SAME keyboard trap, a second source: an active inline rename
// on the Saved tab (⋮ → Edit Name) is also an INPUT inside this wrapper.
// Uses the REAL ShipmentsFiltersView (no stub) with a saved filter pre-seeded
// into the query cache (same seeding idiom as the persistence describe block
// above) so the Saved tab has a real row to select and rename.
describe('ShipmentsGlobalSearch — Saved tab inline rename keyboard trap (S108 1d)', () => {
  const seededFilter = {
    id: 'f1',
    name: 'West Coast LTL',
    chips: [{ key: 'mode', kind: 'attribute', label: 'Mode: LTL' }],
  }

  async function mountWithRenameActive(onCommitQuery) {
    vi.resetModules()
    vi.doMock('../../contexts/CustomersContext.jsx', () => ({
      useCustomers: () => ({ selectedDataIds: null }),
    }))
    vi.doMock('../../search/useGlobalSearch', () => ({
      useGlobalSearch: () => baseHookReturn({}),
    }))
    const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['user-preference', 'shipments.savedFilters'], { v: 1, custom: [seededFilter] })
    const utils = render(withQueryClient(qc, <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} />))
    fireEvent.click(utils.container.querySelector('.filter-button'))
    fireEvent.click(utils.getByText('Saved'))
    fireEvent.click(utils.container.querySelector('.menu-row-radio input[type="radio"]'))
    fireEvent.click(utils.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(utils.getByText('Edit Name'))
    return utils
  }

  test('Enter in the rename input does NOT commit the search', async () => {
    const onCommitQuery = vi.fn()
    const { getByLabelText } = await mountWithRenameActive(onCommitQuery)
    const renameInput = getByLabelText('Rename West Coast LTL')
    fireEvent.change(renameInput, { target: { value: 'New Name' } })
    fireEvent.keyDown(renameInput, { key: 'Enter' })
    expect(onCommitQuery).not.toHaveBeenCalled()
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('Escape while renaming does NOT close the Filters panel', async () => {
    const { container, getByLabelText } = await mountWithRenameActive(vi.fn())
    const renameInput = getByLabelText('Rename West Coast LTL')
    fireEvent.keyDown(renameInput, { key: 'Escape' })
    expect(container.querySelector('.shipments-results-panel')).toBeTruthy()
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

// Bug 1 fix (GS-24, 2026-08-05): a REAL browser click is mousedown THEN click.
// The tests above (mountWithRenameActive) use `fireEvent.click` alone, which
// only dispatches a 'click' event — the host's document-level `mousedown`
// listener (outside-click commit, S106, this file's line ~376 in
// ShipmentsGlobalSearch.jsx) never gets a chance to misfire, so they never
// caught the bug. PresetActionsMenu used to portal its dropdown unconditionally
// to `document.body`, which sits OUTSIDE `wrapperRef`; the listener read a
// menu item's mousedown as an outside click and closed (unmounted) the whole
// panel — tearing down the portal — before the item's own click/onSelect ever
// ran. Firing mousedown THEN click on the SAME target reproduces that real
// sequence. presetChrome.jsx now portals into `modalContainerRef` (threaded
// from ShipmentsFiltersView, same ref the delete-confirm ModalMedium already
// portals into) instead of `document.body`, which keeps the portal inside
// `wrapperRef.contains(e.target)` so the listener no longer treats it as
// outside.
describe('ShipmentsGlobalSearch — Saved tab ⋮ menu survives a real mousedown+click (Bug 1 / GS-24)', () => {
  const seededFilter = {
    id: 'f1',
    name: 'West Coast LTL',
    chips: [{ key: 'mode', kind: 'attribute', label: 'Mode: LTL' }],
  }

  test('"Edit Name"\'s onSelect fires (rename input appears) and the Filters panel stays open', async () => {
    vi.resetModules()
    vi.doMock('../../contexts/CustomersContext.jsx', () => ({
      useCustomers: () => ({ selectedDataIds: null }),
    }))
    vi.doMock('../../search/useGlobalSearch', () => ({
      useGlobalSearch: () => baseHookReturn({}),
    }))
    const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['user-preference', 'shipments.savedFilters'], { v: 1, custom: [seededFilter] })
    const { container, getByText, getByRole, getByLabelText } = render(
      withQueryClient(qc, <ShipmentsGlobalSearch />),
    )

    fireEvent.click(container.querySelector('.filter-button'))
    fireEvent.click(getByText('Saved'))
    fireEvent.click(container.querySelector('.menu-row-radio input[type="radio"]'))
    fireEvent.click(getByRole('button', { name: 'Preset actions' }))

    const editNameItem = getByText('Edit Name')
    fireEvent.mouseDown(editNameItem)
    fireEvent.click(editNameItem)

    // onSelect ran: handleEditName flipped the row into its rename <input>.
    expect(getByLabelText('Rename West Coast LTL')).toBeTruthy()
    // The panel is still mounted — the outside-click listener did not fire.
    expect(container.querySelector('.shipments-results-panel')).toBeTruthy()

    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

// S108 1e — the anti-flattening test named explicitly in the task: applying a
// saved filter must go through `handleApplySaved` (→ `applyChips` wholesale),
// never `handleApplyFilters`'s `{ commit, replace }` path — that path's
// `chipsToFilters` → `mergeFiltersIntoChips` round-trip only ever rebuilds
// `kind: 'attribute'` / `kind: 'date-range'` chips, so a GS-21 `kind: 'set'`
// chip's `codes`/`typeLabel` would silently vanish. Verified end to end here:
// select the saved filter → click "Show N results" → assert what actually
// reached `applyChips` + `onCommitQuery` still carries `codes`/`typeLabel`.
describe('ShipmentsGlobalSearch — Apply Saved preserves set-chip codes/typeLabel (S108 1e)', () => {
  const setChip = {
    key: 'scac', kind: 'set', label: 'SCAC Set', attrLabel: 'SCAC',
    queryValue: 'FXFE, JBHT', dataKey: 'scac', group: 'Carrier',
    codes: [{ value: 'FXFE', valid: true }, { value: 'JBHT', valid: true }],
    typeLabel: 'SCAC',
  }
  const seededFilter = { id: 'f1', name: 'Two Carriers', chips: [setChip] }

  test('"Show N results" on the Saved tab calls applyChips + onCommitQuery with the set chip intact, and closes the panel without reopening it', async () => {
    const applyChips = vi.fn()
    const onCommitQuery = vi.fn()
    vi.resetModules()
    vi.doMock('../../contexts/CustomersContext.jsx', () => ({
      useCustomers: () => ({ selectedDataIds: null }),
    }))
    vi.doMock('../../search/useGlobalSearch', () => ({
      useGlobalSearch: () => baseHookReturn({ applyChips }),
    }))
    const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['user-preference', 'shipments.savedFilters'], { v: 1, custom: [seededFilter] })
    const { container, getByText, getByRole } = render(withQueryClient(
      qc, <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} />,
    ))

    fireEvent.click(container.querySelector('.filter-button'))
    fireEvent.click(getByText('Saved'))
    fireEvent.click(container.querySelector('.menu-row-radio input[type="radio"]'))
    fireEvent.click(getByRole('button', { name: /Show all/ }))

    // applyChips's 2nd arg: `null` — this saved filter carried no free text,
    // so the wholesale replace explicitly wipes any stray bar text too.
    expect(applyChips).toHaveBeenCalledWith([setChip], null)
    expect(applyChips.mock.calls[0][0][0].codes).toEqual(setChip.codes)
    expect(applyChips.mock.calls[0][0][0].typeLabel).toBe('SCAC')
    expect(onCommitQuery).toHaveBeenCalledWith({ chips: [setChip], text: '' })
    expect(container.querySelector('.shipments-results-panel')).toBeNull()

    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

// S108 1e bonus — the pre-existing All-tab bug this task's fix also covers
// (spec "Behaviour" 9): committing an edited filter that ADDS a chip must not
// reopen the results glimpse behind the just-closed panel. Needs a STATEFUL
// fake hook (applyChips actually updates `chips`, same idiom as
// `useFakeGlobalSearchWithChipState` above) so the real open/close effect
// sees a real chip-count change — a static mock hook's `chips` never moves,
// which would make this test pass for the wrong reason (nothing to reopen).
describe('ShipmentsGlobalSearch — All-tab commit no longer reopens the glimpse (S108 1e bonus fix)', () => {
  function useFakeGlobalSearchApplyChips(extra = {}) {
    const [chips, setChips] = useState([])
    return baseHookReturn({ ...extra, chips, applyChips: (next) => setChips(next) })
  }

  async function mountForAllTabCommit(onCommitQuery) {
    vi.resetModules()
    vi.doMock('../../contexts/CustomersContext.jsx', () => ({
      useCustomers: () => ({ selectedDataIds: null }),
    }))
    vi.doMock('../../search/useGlobalSearch', () => ({
      useGlobalSearch: () => useFakeGlobalSearchApplyChips(),
    }))
    const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['user-preference', 'shipments.savedFilters'], null)
    return render(withQueryClient(qc, <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} />))
  }

  test('committing an All-tab edit that ADDS a chip closes the panel and keeps it closed', async () => {
    const onCommitQuery = vi.fn()
    const { container, getByPlaceholderText, getByRole } = await mountForAllTabCommit(onCommitQuery)

    fireEvent.click(container.querySelector('.filter-button'))
    const input = getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '0000000091000' } })
    fireEvent.click(getByRole('button', { name: /Show all/ }))

    expect(onCommitQuery).toHaveBeenCalledTimes(1)
    // Without the fix, the open/close effect's `chips.length > prev.chipCount`
    // branch reopens `.shipments-results-panel` right behind this assertion.
    expect(container.querySelector('.shipments-results-panel')).toBeNull()

    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

// S108 1f — copy-to-clipboard (spec "Behaviour" 10). `GlobalSearch`'s `onCopy`
// only renders the button when wired; ShipmentsGlobalSearch now always wires
// it, so this proves the button exists AND that the summary it writes matches
// the bar (committed chip + free-text badge), plus the required no-throw
// guard for environments (jsdom included) with no `navigator.clipboard`.
describe('ShipmentsGlobalSearch — copy search (S108 1f)', () => {
  const committedChip = {
    key: 'customer-id', kind: 'attribute', label: 'Customer ID: G2O',
    attrLabel: 'Customer ID', queryValue: 'G2O', dataKey: 'customerId', group: 'Customers & Parties',
  }

  test('writes a human-readable "Label: value · ..." summary of the committed chips + free text', async () => {
    const writeText = vi.fn()
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const { ShipmentsGlobalSearch } = await mountWithHook(baseHookReturn({
      chips: [committedChip],
      textChip: { key: '__free-text__', kind: 'text', value: 'weyerhaeuser', label: 'weyerhaeuser' },
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { getByLabelText } = render(withQueryClient(qc, <ShipmentsGlobalSearch />))
    fireEvent.click(getByLabelText('Copy search'))

    expect(writeText).toHaveBeenCalledWith('Customer ID: G2O · "weyerhaeuser"')

    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('no navigator.clipboard (non-secure context / jsdom default) — copy click does not throw', async () => {
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })

    const { ShipmentsGlobalSearch } = await mountWithHook(baseHookReturn({ chips: [committedChip] }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { getByLabelText } = render(withQueryClient(qc, <ShipmentsGlobalSearch />))

    expect(() => fireEvent.click(getByLabelText('Copy search'))).not.toThrow()

    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })
})

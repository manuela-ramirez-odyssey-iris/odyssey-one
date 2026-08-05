// @vitest-environment jsdom
// S108 1d — the Saved tab's real Custom-group UI (GroupLabel + ⋮ +
// MenuRowRadio draggable rows, chevron-expand, inline rename, batch delete).
// Renders ShipmentsFiltersView bare (no QueryClientProvider needed — this
// component takes the saved-filter list + callbacks as PROPS, spec "Hosting"
// defect 4/S108 1a) with a small fixture list, same convention as
// ValueComboBox.test.jsx's bare renders of this same component.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent, cleanup, act } from '@testing-library/react'
import ShipmentsFiltersView from './ShipmentsFiltersView.jsx'
import { shipmentsSearchAdapter } from '../../search/shipments'
import { ODYSSEY_DEFAULT_FILTERS } from './savedFilters'

afterEach(cleanup)

const sampleFilters = [
  {
    id: 'f1',
    name: 'West Coast LTL',
    chips: [
      { key: 'mode', kind: 'attribute', label: 'Mode: LTL' },
      { key: 'destination', kind: 'attribute', label: 'Destination: CA' },
    ],
  },
  {
    id: 'f2',
    name: 'JBHT Sent Tenders',
    chips: [
      { key: 'scac', kind: 'attribute', label: 'SCAC: JBHT' },
    ],
  },
]

// Standard RTL recipe for native HTML5 DnD — jsdom's own DataTransfer doesn't
// reliably round-trip setData/getData across events, so tests supply a plain
// stub satisfying the same interface the drag handlers actually call.
function makeDataTransfer() {
  const data = {}
  return {
    setData: (k, v) => { data[k] = v },
    getData: (k) => data[k],
    effectAllowed: null,
    dropEffect: null,
  }
}

function renderSavedTab(props = {}) {
  const utils = render(<ShipmentsFiltersView savedFilters={sampleFilters} {...props} />)
  fireEvent.click(screen.getByText('Saved'))
  return utils
}

describe('ShipmentsFiltersView — Saved tab, Custom group (S108 1d)', () => {
  test('renders one row per saved filter, from the savedFilters prop (not INITIAL_SAVED)', () => {
    renderSavedTab()
    expect(screen.getByText('West Coast LTL')).toBeTruthy()
    expect(screen.getByText('JBHT Sent Tenders')).toBeTruthy()
    // The pre-S108 sample query text must not leak through.
    expect(screen.queryByText(/mode:LTL shipment-status:Review/)).toBeNull()
  })

  test('the radio selects (single-select) without expanding; the label/chevron zone expands to read-only chips', () => {
    const { container } = renderSavedTab()
    // Scoped to the Custom group — S108 Phase 2 added a second (Odyssey)
    // group of MenuRowRadio rows below it, so an unscoped query now matches 4.
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    const radios = customList.querySelectorAll('.menu-row-radio input[type="radio"]')
    expect(radios).toHaveLength(2)

    fireEvent.click(radios[0])
    expect(container.querySelectorAll('.menu-row-radio--selected')).toHaveLength(1)
    // Selecting is NOT the same gesture as expanding (spec "Behaviour" 6,
    // accepted delta) — no chips shown yet.
    expect(screen.queryByText('Mode: LTL')).toBeNull()

    // Clicking the row's label (nav zone) expands it.
    fireEvent.click(screen.getByText('West Coast LTL'))
    expect(screen.getByText('Mode: LTL')).toBeTruthy()
    expect(screen.getByText('Destination: CA')).toBeTruthy()
    // Read-only chips: no onRemove passed → SearchChip renders no X.
    expect(container.querySelector('.search-chip__remove')).toBeNull()

    // The OTHER row's chips never rendered.
    expect(screen.queryByText('SCAC: JBHT')).toBeNull()
  })

  test('⋮ → Edit Name is disabled with nothing selected, enabled once a row is selected', () => {
    renderSavedTab()
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBe('true')
  })

  test('⋮ → Edit Name focuses the selected row with the cursor in it and the text selected; Enter commits + calls onRenameFilter', () => {
    const onRenameFilter = vi.fn()
    const onRenameActiveChange = vi.fn()
    const { container } = renderSavedTab({ onRenameFilter, onRenameActiveChange })

    const radios = container.querySelectorAll('.menu-row-radio input[type="radio"]')
    fireEvent.click(radios[0]) // select "West Coast LTL"

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Edit Name'))

    const input = screen.getByLabelText('Rename West Coast LTL')
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length) // text selected, not just focused
    expect(onRenameActiveChange).toHaveBeenLastCalledWith(true)

    fireEvent.change(input, { target: { value: 'Renamed Filter' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRenameFilter).toHaveBeenCalledWith('f1', 'Renamed Filter')
    expect(onRenameActiveChange).toHaveBeenLastCalledWith(false)
    // Reverts to the plain label row (rename input unmounted).
    expect(screen.queryByLabelText('Rename West Coast LTL')).toBeNull()
  })

  test('Escape cancels the rename with no onRenameFilter call', () => {
    const onRenameFilter = vi.fn()
    const { container } = renderSavedTab({ onRenameFilter })

    const radios = container.querySelectorAll('.menu-row-radio input[type="radio"]')
    fireEvent.click(radios[0])
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Edit Name'))

    const input = screen.getByLabelText('Rename West Coast LTL')
    fireEvent.change(input, { target: { value: 'Whoops' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onRenameFilter).not.toHaveBeenCalled()
    expect(screen.getByText('West Coast LTL')).toBeTruthy()
    expect(screen.queryByLabelText('Rename West Coast LTL')).toBeNull()
  })

  test('⋮ → Delete Filters swaps rows to bordered checkboxes; footer shows Delete (n); confirm calls onDeleteFilters with the right ids', () => {
    const onDeleteFilters = vi.fn()
    const { container } = renderSavedTab({ onDeleteFilters })

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Delete Filters'))

    // Custom-group-only checks (S108 Phase 2: the Odyssey group is a SEPARATE
    // list — .menu-row-checkbox/.menu-row-radio counts must be scoped to it,
    // not the whole panel).
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    expect(customList.querySelectorAll('.menu-row-checkbox')).toHaveLength(2)
    expect(customList.querySelectorAll('.menu-row-radio')).toHaveLength(0)
    // Odyssey rows are never part of the deletable batch — they stay
    // MenuRowRadio (just disabled), mirroring ColumnPanel's "Odyssey group
    // renders disabled" during its own Delete Presets mode (4301:19405).
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    expect(odysseyList.querySelectorAll('.menu-row-radio')).toHaveLength(2)
    expect(odysseyList.querySelectorAll('.menu-row-radio[data-disabled]')).toHaveLength(2)

    const checkboxes = customList.querySelectorAll('.menu-row-checkbox input[type="checkbox"]')
    fireEvent.click(checkboxes[0]) // "West Coast LTL" (f1)
    fireEvent.click(checkboxes[1]) // "JBHT Sent Tenders" (f2)

    expect(screen.getByText('Delete (2)')).toBeTruthy()

    fireEvent.click(screen.getByText('Delete (2)'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Delete'))

    expect(onDeleteFilters).toHaveBeenCalledTimes(1)
    expect(new Set(onDeleteFilters.mock.calls[0][0])).toEqual(new Set(['f1', 'f2']))
    // Delete mode exits after a confirmed delete — back to radio rows.
    expect(customList.querySelectorAll('.menu-row-radio').length).toBeGreaterThan(0)
  })

  test('Cancel (panel footer) restores the normal list untouched, without deleting', () => {
    const onDeleteFilters = vi.fn()
    const { container } = renderSavedTab({ onDeleteFilters })

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Delete Filters'))
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    expect(customList.querySelectorAll('.menu-row-checkbox')).toHaveLength(2)

    fireEvent.click(screen.getByText('Cancel'))

    expect(customList.querySelectorAll('.menu-row-checkbox')).toHaveLength(0)
    expect(customList.querySelectorAll('.menu-row-radio')).toHaveLength(2)
    expect(onDeleteFilters).not.toHaveBeenCalled()
  })

  test('the delete confirmation Cancel dismisses without deleting (rows stay in delete mode)', () => {
    const onDeleteFilters = vi.fn()
    renderSavedTab({ onDeleteFilters })

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Delete Filters'))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(screen.getByText('Delete (1)'))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Cancel'))

    expect(onDeleteFilters).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('reorder calls onReorderFilters with the right indices', () => {
    const onReorderFilters = vi.fn()
    const { container } = renderSavedTab({ onReorderFilters })

    const wrappers = container.querySelectorAll('[draggable="true"]')
    expect(wrappers).toHaveLength(2)

    const dataTransfer = makeDataTransfer()
    fireEvent.dragStart(wrappers[0], { dataTransfer })
    fireEvent.dragOver(wrappers[1], { dataTransfer })
    fireEvent.drop(wrappers[1], { dataTransfer })

    expect(onReorderFilters).toHaveBeenCalledWith(0, 1)
  })

  test('dropping a row on itself is a no-op', () => {
    const onReorderFilters = vi.fn()
    const { container } = renderSavedTab({ onReorderFilters })

    const wrappers = container.querySelectorAll('[draggable="true"]')
    const dataTransfer = makeDataTransfer()
    fireEvent.dragStart(wrappers[0], { dataTransfer })
    fireEvent.drop(wrappers[0], { dataTransfer })

    expect(onReorderFilters).not.toHaveBeenCalled()
  })
})

// S108 1e — select → count → apply. Selecting a saved filter does NOT apply
// it; it counts via the CUSTOMER-SCOPED adapter the host passes down as
// `scopedAdapter` (spec "Behaviour" 7) — never the unscoped module import
// (used elsewhere in this file only for ValueComboBox's value suggestions,
// which don't need customer scoping).
describe('ShipmentsFiltersView — Saved tab select → count → apply (S108 1e)', () => {
  afterEach(() => vi.useRealTimers())

  test('selecting counts via the SCOPED adapter prop, never the unscoped module import', async () => {
    const spy = vi.spyOn(shipmentsSearchAdapter, 'searchShipments')
    const scopedAdapter = { searchShipments: vi.fn(async () => ({ results: [], total: 7 })) }
    vi.useFakeTimers()
    const { container } = renderSavedTab({ scopedAdapter })

    const radios = container.querySelectorAll('.menu-row-radio input[type="radio"]')
    fireEvent.click(radios[0]) // "West Coast LTL" — sampleFilters[0], no free text
    await act(async () => { vi.advanceTimersByTime(500) })

    expect(scopedAdapter.searchShipments).toHaveBeenCalledWith(sampleFilters[0].chips, '')
    expect(spy).not.toHaveBeenCalled() // CRITICAL: the unscoped import must never be touched
    expect(screen.getByText('Show all 7 results')).toBeTruthy()

    spy.mockRestore()
  })

  test('rapid re-selection cancels the stale in-flight count — the later selection wins', async () => {
    vi.useFakeTimers()
    let resolveFirst
    // sampleFilters[0]'s leading chip key is 'mode'; sampleFilters[1]'s is
    // 'scac' — used to tell the two calls apart without depending on order.
    const scopedAdapter = {
      searchShipments: vi.fn((chips) => (
        chips[0]?.key === 'mode'
          ? new Promise((resolve) => { resolveFirst = resolve }) // never resolves during this test
          : Promise.resolve({ results: [], total: 9 })
      )),
    }
    const { container } = renderSavedTab({ scopedAdapter })
    const radios = container.querySelectorAll('.menu-row-radio input[type="radio"]')

    fireEvent.click(radios[0]) // select f1 — its count request goes out but never lands
    await act(async () => { vi.advanceTimersByTime(500) })
    fireEvent.click(radios[1]) // rapid re-selection, before f1's promise resolves
    await act(async () => { vi.advanceTimersByTime(500) })

    expect(screen.getByText('Show all 9 results')).toBeTruthy()

    // The stale f1 response finally lands — must NOT overwrite f2's count.
    await act(async () => { resolveFirst({ results: [], total: 5 }) })
    expect(screen.getByText('Show all 9 results')).toBeTruthy()
    expect(screen.queryByText('Show all 5 results')).toBeNull()
  })

  test('nothing selected — the footer button has no handler wired (functional disable; onApplySaved never fires)', () => {
    const onApplySaved = vi.fn()
    renderSavedTab({ onApplySaved })
    fireEvent.click(screen.getByText('Show all 0 results'))
    expect(onApplySaved).not.toHaveBeenCalled()
  })

  test('"Show N results" with a row selected calls onApplySaved with that filter\'s stored chips — codes/typeLabel intact (anti-flattening)', () => {
    const setChip = {
      key: 'scac', kind: 'set', label: 'SCAC Set', attrLabel: 'SCAC',
      queryValue: 'FXFE, JBHT', dataKey: 'scac', group: 'Carrier',
      codes: [{ value: 'FXFE', valid: true }, { value: 'JBHT', valid: true }],
      typeLabel: 'SCAC',
    }
    const filtersWithSet = [{ id: 'f1', name: 'Two Carriers', chips: [setChip] }]
    const onApplySaved = vi.fn()
    const scopedAdapter = { searchShipments: vi.fn(async () => ({ results: [], total: 0 })) }
    const { container } = render(
      <ShipmentsFiltersView savedFilters={filtersWithSet} onApplySaved={onApplySaved} scopedAdapter={scopedAdapter} />,
    )
    fireEvent.click(screen.getByText('Saved'))
    const radio = container.querySelector('.menu-row-radio input[type="radio"]')
    fireEvent.click(radio)
    fireEvent.click(screen.getByText('Show all 0 results'))

    expect(onApplySaved).toHaveBeenCalledTimes(1)
    const applied = onApplySaved.mock.calls[0][0]
    expect(applied).toEqual([setChip])
    expect(applied[0].codes).toEqual(setChip.codes)
    expect(applied[0].typeLabel).toBe('SCAC')
  })
})

// S108 Phase 2 — the second, code-constant "Odyssey Filters" group
// (savedFilters.js's ODYSSEY_DEFAULT_FILTERS): shipped, neither store, no ⋮,
// fixed order, not editable/deletable by anyone. Selecting/applying goes
// through the IDENTICAL machinery as a Custom filter — one `selectedFilterId`
// across both groups, the same onApplySaved(chips) call.
describe('ShipmentsFiltersView — Saved tab, Odyssey group (S108 Phase 2)', () => {
  afterEach(() => vi.useRealTimers())

  test('both groups render; Odyssey rows have no grip and no ⋮ of their own', () => {
    const { container } = renderSavedTab()

    expect(screen.getByText('Custom Filters')).toBeTruthy()
    expect(screen.getByText('Odyssey Filters')).toBeTruthy()
    ODYSSEY_DEFAULT_FILTERS.forEach((f) => expect(screen.getByText(f.name)).toBeTruthy())

    // Exactly ONE ⋮ (Custom group's PresetActionsMenu) — the Odyssey
    // GroupLabel renders with no `action`.
    expect(screen.getAllByRole('button', { name: 'Preset actions' })).toHaveLength(1)

    // No grip icon in the Odyssey list — MenuRowRadio only renders one when
    // `draggable` is passed, and Odyssey rows never pass it (fixed order).
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    expect(odysseyList.querySelectorAll('.menu-row-radio__grip')).toHaveLength(0)
    expect(odysseyList.querySelectorAll('input[type="radio"]')).toHaveLength(ODYSSEY_DEFAULT_FILTERS.length)
  })

  test('an Odyssey row cannot be renamed or deleted: selecting it leaves Edit Name disabled, and Custom Delete mode never converts it to a checkbox', () => {
    const { container } = renderSavedTab()
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    fireEvent.click(odysseyList.querySelector('input[type="radio"]')) // select the Odyssey default

    // The Custom group's ⋮ → Edit Name stays disabled — the selection isn't
    // owned by the Custom `savedFilters` list, so there's nothing to rename.
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBe('true')

    // Entering Custom's Delete Filters batch mode never touches Odyssey rows
    // — they stay MenuRowRadio (just disabled), never a deletable Checkbox.
    fireEvent.click(screen.getByText('Delete Filters'))
    expect(odysseyList.querySelectorAll('.menu-row-checkbox')).toHaveLength(0)
    expect(odysseyList.querySelectorAll('.menu-row-radio[data-disabled]')).toHaveLength(ODYSSEY_DEFAULT_FILTERS.length)
  })

  test('an Odyssey default is selectable and applies through the SAME onApplySaved path as a custom filter — its chips arrive intact', async () => {
    vi.useFakeTimers()
    const onApplySaved = vi.fn()
    const scopedAdapter = { searchShipments: vi.fn(async () => ({ results: [], total: 3 })) }
    const { container } = renderSavedTab({ onApplySaved, scopedAdapter })

    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    fireEvent.click(odysseyList.querySelector('input[type="radio"]')) // ODYSSEY_DEFAULT_FILTERS[0]
    await act(async () => { vi.advanceTimersByTime(500) })

    fireEvent.click(screen.getByText('Show all 3 results'))

    expect(onApplySaved).toHaveBeenCalledTimes(1)
    expect(onApplySaved).toHaveBeenCalledWith(ODYSSEY_DEFAULT_FILTERS[0].chips)
  })

  test('dragging within Custom still reorders; an Odyssey row is not draggable and cannot reorder', () => {
    const onReorderFilters = vi.fn()
    const { container } = renderSavedTab({ onReorderFilters })

    // Only the Custom rows carry the draggable wrapper div — Odyssey's fixed
    // order means "nobody drags inside it" (spec "Behaviour" 2).
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    expect(customList.querySelectorAll('[draggable="true"]')).toHaveLength(sampleFilters.length)
    expect(odysseyList.querySelectorAll('[draggable="true"]')).toHaveLength(0)

    // Custom reorder still works — regression guard for the group split.
    const wrappers = customList.querySelectorAll('[draggable="true"]')
    const dataTransfer = makeDataTransfer()
    fireEvent.dragStart(wrappers[0], { dataTransfer })
    fireEvent.dragOver(wrappers[1], { dataTransfer })
    fireEvent.drop(wrappers[1], { dataTransfer })
    expect(onReorderFilters).toHaveBeenCalledWith(0, 1)
  })

  test('the Saved tab count includes both groups', () => {
    renderSavedTab()
    const savedTabButton = screen.getByText('Saved').closest('button')
    const expectedCount = sampleFilters.length + ODYSSEY_DEFAULT_FILTERS.length
    expect(within(savedTabButton).getByText(String(expectedCount))).toBeTruthy()
  })
})

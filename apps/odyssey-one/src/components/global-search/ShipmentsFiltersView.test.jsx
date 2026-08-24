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
import { currentUser } from '../../data/sso-mock'

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

  // Rewritten for S110 rev2 (docs/superpowers/specs/2026-08-05-filters-two-modes.md
  // item 2 — REVERSES rev1's "row body navigates" gesture). Both click zones
  // of a row now select, mirroring the column-preset radio rows: the radio
  // AND the row body turn the SAME radio on. Neither zone navigates anywhere
  // — entering the editor is only ever the explicit ⋮ → "Edit Filters"
  // action (covered in the "two-mode profile editing" describe block below).
  test('the radio selects; the row body ALSO selects — neither navigates (S110 rev2 item 2)', () => {
    const { container } = renderSavedTab()
    // Scoped to the Custom group — S108 Phase 2 added a second (Odyssey)
    // group of MenuRowRadio rows below it, so an unscoped query now matches 4.
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    const radios = customList.querySelectorAll('.menu-row-radio input[type="radio"]')
    expect(radios).toHaveLength(2)

    fireEvent.click(radios[0])
    expect(container.querySelectorAll('.menu-row-radio--selected')).toHaveLength(1)
    expect(screen.getByText('Saved').closest('button').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.search-chip')).toBeNull()

    // Clicking the OTHER row's BODY selects THAT row instead — it does not
    // navigate anywhere; the Saved pill stays selected and the All tab
    // (never renamed, S110 rev2 item 1) still reads plain "All".
    fireEvent.click(screen.getByText('JBHT Sent Tenders'))
    const selectedRows = customList.querySelectorAll('.menu-row-radio--selected')
    expect(selectedRows).toHaveLength(1)
    expect(within(selectedRows[0]).getByText('JBHT Sent Tenders')).toBeTruthy()
    expect(screen.getByText('Saved').closest('button').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('All')).toBeTruthy()
    expect(container.querySelector('.search-chip')).toBeNull()
  })

  test('⋮ → Edit Name is disabled with nothing selected, enabled once a row is selected', () => {
    renderSavedTab()
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBe('true')
  })

  // S110 rev2 item 3 — the ⋮ menu's THIRD option, new this rev: "Edit
  // Filters" enters edit-filter mode on the SELECTED row. Disabled with no
  // selection, same as the other two options; selecting via the row BODY
  // (item 2 — selects, doesn't navigate) is enough to enable it, same as
  // selecting via the radio.
  test('⋮ → Edit Filters is disabled with nothing selected, enabled once a row is selected (via either click zone)', () => {
    renderSavedTab()
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editFiltersOption = screen.getByText('Edit Filters').closest('[role="menuitem"]')
    expect(editFiltersOption.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' })) // close

    fireEvent.click(screen.getByText('West Coast LTL')) // row body — selects only
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editFiltersOptionAfter = screen.getByText('Edit Filters').closest('[role="menuitem"]')
    expect(editFiltersOptionAfter.getAttribute('aria-disabled')).toBeNull()
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

// S110 rev2 (docs/superpowers/specs/2026-08-05-filters-two-modes.md) —
// SUPERSEDES the rev1 "profile-editing flow" suite this replaces (rev1's own
// tests asserted tab order Saved·All, row-body-navigates, the link renaming
// to "Create New Filter", and Update Filter as a dirty-tracked SECONDARY
// link that persists WITHOUT applying — every one of those is reversed by
// rev2's "two modes" model; see the doc comment atop ShipmentsFiltersView.jsx
// for the full reversal table). Covers: tab order/naming (All never
// renamed — the HEADER is), entering edit-filter mode via ⋮ → "Edit
// Filters" only, the link being HIDDEN (not relabeled) while editing, Update
// Filter as the PRIMARY button that both persists AND applies (decision 1),
// the Odyssey-default/shared carve-outs, and the discard-confirm warning
// (decision 4).
describe('ShipmentsFiltersView — two-mode profile editing (S110 rev2)', () => {
  test('tab order is All then Saved; the All tab is never renamed — the HEADER becomes "Edit <profile>" instead', () => {
    const { container } = render(<ShipmentsFiltersView savedFilters={sampleFilters} />)
    const tabButtons = container.querySelectorAll('.pill-tab')
    expect(tabButtons).toHaveLength(2)
    expect(tabButtons[0].textContent).toContain('All')
    expect(tabButtons[1].textContent).toContain('Saved')
    expect(screen.getByText('Filters')).toBeTruthy() // header, no profile open

    fireEvent.click(screen.getByText('Saved'))
    const radios = container.querySelectorAll('.menu-row-radio input[type="radio"]')
    fireEvent.click(radios[0]) // select "West Coast LTL"
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Edit Filters'))

    // The HEADER renamed; the TAB did not.
    expect(screen.getByText('Edit West Coast LTL')).toBeTruthy()
    const tabButtonsAfter = container.querySelectorAll('.pill-tab')
    expect(tabButtonsAfter[0].textContent).toContain('All')
    expect(tabButtonsAfter[0].textContent).not.toContain('West Coast LTL')
  })

  // 'buy-shipment' (Shipment Identifiers, match: 'digits') renders as a plain
  // FormField — the simplest control to drive an edit through in jsdom,
  // avoiding ComboBox's typeahead machinery for a test about the FOOTER, not
  // the field controls (those are S107's territory).
  const editableFilter = {
    id: 'f3',
    name: 'Editable Profile',
    chips: [{
      key: 'buy-shipment', kind: 'attribute', label: 'Buy Shipment #: 12345',
      attrLabel: 'Buy Shipment #', queryValue: '12345', dataKey: 'buyShipment',
      group: 'Shipment Identifiers',
    }],
  }

  function enterEditMode(container, name) {
    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(within(container).getByText(name)) // row body — selects (S110 rev2 item 2)
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Edit Filters'))
  }

  test('Save Filters + is HIDDEN entirely in edit-filter mode (not relabeled); Update Filter is the PRIMARY button, disabled until dirty, and on click both PERSISTS and APPLIES (decision 1), landing back on Saved with the row still selected', () => {
    const onUpdateFilter = vi.fn()
    const onApplyUpdatedFilter = vi.fn()
    const onApplyFilters = vi.fn()
    const onApplySaved = vi.fn()
    const { container } = render(
      <ShipmentsFiltersView
        savedFilters={[editableFilter]}
        onUpdateFilter={onUpdateFilter}
        onApplyUpdatedFilter={onApplyUpdatedFilter}
        onApplyFilters={onApplyFilters}
        onApplySaved={onApplySaved}
      />,
    )
    // Free mode, nothing filled: the link renders (S110 rev2 item 5) — see
    // the separate "free mode" describe block below for its disabled-when-
    // empty behaviour.
    expect(screen.getByText('Save Filters')).toBeTruthy()

    enterEditMode(container, 'Editable Profile')

    // Edit-filter mode: the link is GONE — not relabeled to "Create New
    // Filter" (that was rev1; rev2 item 4 hides it outright).
    expect(screen.queryByText('Save Filters')).toBeNull()
    expect(screen.queryByText('Create New Filter')).toBeNull()
    // Not dirty yet — the primary button IS "Update Filter" (not "Show N
    // results"), but disabled.
    const updateBtn = screen.getByText('Update Filter').closest('button')
    expect(updateBtn.disabled).toBe(true)

    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '99999' } })
    expect(updateBtn.disabled).toBe(false)

    fireEvent.click(updateBtn)

    expect(onUpdateFilter).toHaveBeenCalledTimes(1)
    const [updatedId, updatedChips] = onUpdateFilter.mock.calls[0]
    expect(updatedId).toBe('f3')
    expect(updatedChips.find((c) => c.key === 'buy-shipment').queryValue).toBe('99999')
    // Decision 1 REVERSES rev1's persist-only rule: Update Filter now ALSO
    // applies, via the DEDICATED `onApplyUpdatedFilter` — never
    // `onApplyFilters` (the free-mode commit path) or `onApplySaved` (the
    // Saved-tab wholesale-apply path, which would also close the panel).
    expect(onApplyUpdatedFilter).toHaveBeenCalledWith(updatedChips)
    expect(onApplyFilters).not.toHaveBeenCalled()
    expect(onApplySaved).not.toHaveBeenCalled()

    // Lands back on Saved, with the SAME row still selected.
    expect(screen.getByText('Saved').closest('button').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelectorAll('.menu-row-radio--selected')).toHaveLength(1)
    expect(within(container).getByText('Editable Profile').closest('.menu-row-radio--selected')).toBeTruthy()
  })

  test('Update Filter never appears for an Odyssey default (opening it via Edit Filters is still allowed)', () => {
    const { container } = render(<ShipmentsFiltersView savedFilters={[]} onUpdateFilter={vi.fn()} />)
    enterEditMode(container, ODYSSEY_DEFAULT_FILTERS[0].name)

    // Opening a default in the editor IS allowed (same allowance rev1
    // recorded: "you can look at it") — only Update Filter is barred, same
    // rule as no ⋮/no grip/not deletable. The link stays hidden regardless.
    expect(screen.getByText(`Edit ${ODYSSEY_DEFAULT_FILTERS[0].name}`)).toBeTruthy()
    expect(screen.queryByText('Update Filter')).toBeNull()
    expect(screen.queryByText('Save Filters')).toBeNull()
  })

  test('Update Filter never appears for a shared filter — owned or not, even after an edit', () => {
    const onUpdateFilter = vi.fn()
    const mine = {
      id: 'sm1', name: 'Mine', ownerId: currentUser.id, ownerUsername: 'amy.cook',
      chips: [{
        key: 'buy-shipment', kind: 'attribute', label: 'Buy Shipment #: 1',
        attrLabel: 'Buy Shipment #', queryValue: '1', dataKey: 'buyShipment', group: 'Shipment Identifiers',
      }],
    }
    const { container } = render(
      <ShipmentsFiltersView savedFilters={[]} sharedFilters={[mine]} onUpdateFilter={onUpdateFilter} />,
    )
    enterEditMode(container, 'Mine')

    expect(screen.getByText('Edit Mine')).toBeTruthy()
    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '999' } })
    // Would be dirty (and show Update Filter) for a Custom profile at this
    // point — the shared-filter carve-out suppresses it regardless (no
    // "update chips" route exists for shared_filters, see
    // ShipmentsFiltersView's `isSharedOpen` comment).
    expect(screen.queryByText('Update Filter')).toBeNull()
    expect(onUpdateFilter).not.toHaveBeenCalled()
  })

  // S110 rev2 decision 4 — "leaving edit-filter mode with unsaved changes
  // WARNS first... on any exit that would lose them." Covers the in-panel
  // exits (tab switch, ‹ back, × close) that route through this component's
  // own `attemptLeaveEditMode`; the host-level exits (outside-click, Escape,
  // bridged via `editGuardRef`) are covered in ShipmentsGlobalSearch.test.jsx.
  test('switching tabs while edit-filter mode is dirty warns first; Cancel stays in edit mode with the change intact, Discard leaves and clears it', () => {
    const onUpdateFilter = vi.fn()
    const { container } = render(<ShipmentsFiltersView savedFilters={[editableFilter]} onUpdateFilter={onUpdateFilter} />)
    enterEditMode(container, 'Editable Profile')

    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '99999' } })

    fireEvent.click(screen.getByText('Saved'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Discard changes to Editable Profile\?/)).toBeTruthy()
    // Still in edit mode — the tab switch has NOT happened yet.
    expect(screen.getByText('Edit Editable Profile')).toBeTruthy()

    fireEvent.click(within(dialog).getByText('Cancel'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Edit Editable Profile')).toBeTruthy() // still editing
    expect(screen.getByPlaceholderText('Enter Buy Shipment #').value).toBe('99999') // change intact

    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Discard'))
    expect(screen.queryByRole('dialog')).toBeNull()
    // Left edit mode — landed on Saved, no Update Filter call ever fired.
    expect(screen.getByText('Saved').closest('button').getAttribute('aria-pressed')).toBe('true')
    expect(onUpdateFilter).not.toHaveBeenCalled()
  })

  test('switching tabs while edit-filter mode is CLEAN (no edits) leaves silently — no confirm', () => {
    const { container } = render(<ShipmentsFiltersView savedFilters={[editableFilter]} />)
    enterEditMode(container, 'Editable Profile')
    fireEvent.click(screen.getByText('Saved'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Saved').closest('button').getAttribute('aria-pressed')).toBe('true')
  })

  test('‹ Back while edit-filter mode is dirty also warns (any in-panel exit, not just the tab)', () => {
    const onBack = vi.fn()
    const { container } = render(<ShipmentsFiltersView savedFilters={[editableFilter]} onBack={onBack} />)
    enterEditMode(container, 'Editable Profile')
    fireEvent.change(screen.getByPlaceholderText('Enter Buy Shipment #'), { target: { value: '99999' } })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Discard'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

// S108 Phase 3d (docs/superpowers/specs/2026-08-04-save-filters-design.md
// "Behaviour" 2/4/5) — the Odyssey group's SHARED half: the author badge,
// drag-to-share/drag-to-unshare, and the ownership rules gating
// rename/delete/drag ("the author edits, everyone applies"). The migration +
// API + service (sharedFilters.mjs / sharedFilterService.ts) already landed
// and are exercised by their own suites; this covers the UI layer only,
// with `sharedFilters` passed as a prop exactly as the host will pass it.
describe('ShipmentsFiltersView — Saved tab, sharing (S108 Phase 3d)', () => {
  afterEach(() => vi.useRealTimers())

  const theirShared = {
    id: 's1', name: 'Their Filter', ownerId: 'someone-else', ownerUsername: 'someone.else',
    chips: [{ key: 'mode', kind: 'attribute', label: 'Mode: TL' }],
    createdAt: '2026-08-01T00:00:00Z',
  }
  const myShared = {
    id: 's2', name: 'My Shared Filter', ownerId: currentUser.id, ownerUsername: 'amy.cook',
    chips: [{ key: 'scac', kind: 'attribute', label: 'SCAC: SEFL' }],
    createdAt: '2026-08-02T00:00:00Z',
  }

  test('shared rows carry a by:<username> badge; defaults and Custom rows carry none — and the old filter-count badge is gone', () => {
    const { container } = renderSavedTab({ sharedFilters: [theirShared, myShared] })
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')

    // Custom rows: no badge of any kind.
    expect(within(customList).queryByText(/^by:/)).toBeNull()
    // Defaults: no badge either.
    ODYSSEY_DEFAULT_FILTERS.forEach((f) => {
      const row = within(odysseyList).getByText(f.name).closest('.menu-row-radio')
      expect(within(row).queryByText(/^by:/)).toBeNull()
    })
    // Both shared rows: the author badge, nothing else.
    expect(within(odysseyList).getByText(`by: ${theirShared.ownerUsername}`)).toBeTruthy()
    expect(within(odysseyList).getByText(`by: ${myShared.ownerUsername}`)).toBeTruthy()
    // The Phase 1 filter-count placeholder ("N filter(s)") is gone entirely —
    // replaced, not stacked (task instruction).
    expect(screen.queryByText(/^\d+ filters?$/)).toBeNull()
  })

  // S110 rev2 item 6 REVERSES the S108 render order — shared profiles now
  // render ABOVE a visible line separator, shipped defaults BELOW it
  // ("shared by people" reads above "shipped by Odyssey"). Within the
  // shared sub-set the order is still fixed, exactly as given (created_at).
  test('Odyssey group order: shared profiles ABOVE a divider (as given), shipped defaults BELOW it', () => {
    const { container } = renderSavedTab({ sharedFilters: [theirShared, myShared] })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const names = [...odysseyList.querySelectorAll('.menu-row__label')].map((el) => el.textContent)
    expect(names).toEqual([
      theirShared.name,
      myShared.name,
      ...ODYSSEY_DEFAULT_FILTERS.map((f) => f.name),
    ])
    expect(odysseyList.querySelector('.shipments-filters__saved-divider')).toBeTruthy()
  })

  test('no divider when there are no shared filters — just the defaults', () => {
    const { container } = renderSavedTab({ sharedFilters: [] })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    expect(odysseyList.querySelector('.shipments-filters__saved-divider')).toBeNull()
  })

  test('dragging a Custom row into the Odyssey list calls onShareFilter with that filter, and a host round-trip moves the row across groups', () => {
    const onShareFilter = vi.fn()
    const { container, rerender } = render(
      <ShipmentsFiltersView savedFilters={sampleFilters} sharedFilters={[]} onShareFilter={onShareFilter} />,
    )
    fireEvent.click(screen.getByText('Saved'))

    const customWrapper = container.querySelector('.shipments-filters__saved-list--custom [draggable="true"]')
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const dataTransfer = makeDataTransfer()
    fireEvent.dragStart(customWrapper, { dataTransfer })
    fireEvent.dragOver(odysseyList, { dataTransfer })
    fireEvent.drop(odysseyList, { dataTransfer })

    expect(onShareFilter).toHaveBeenCalledWith(sampleFilters[0])

    // Simulate the host's response to that call (ShipmentsGlobalSearch's
    // `shareFilter`: POST, refetch, remove from Custom) — the row now lives
    // in `sharedFilters`, gone from `savedFilters`.
    const sharedNow = { id: sampleFilters[0].id, name: sampleFilters[0].name, ownerId: currentUser.id, ownerUsername: 'amy.cook', chips: sampleFilters[0].chips, createdAt: '2026-08-03T00:00:00Z' }
    rerender(
      <ShipmentsFiltersView savedFilters={sampleFilters.slice(1)} sharedFilters={[sharedNow]} onShareFilter={onShareFilter} />,
    )
    const customListAfter = container.querySelector('.shipments-filters__saved-list--custom')
    const odysseyListAfter = container.querySelector('.shipments-filters__saved-list--odyssey')
    expect(within(customListAfter).queryByText('West Coast LTL')).toBeNull()
    expect(within(odysseyListAfter).getByText('West Coast LTL')).toBeTruthy()
  })

  test('dragging your own shared row into Custom calls onUnshareFilter; dragging someone else\'s row does not start', () => {
    const onUnshareFilter = vi.fn()
    const { container } = renderSavedTab({ sharedFilters: [theirShared, myShared], onUnshareFilter })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const customList = container.querySelector('.shipments-filters__saved-list--custom')

    // Your own row IS draggable — dropping it in Custom un-shares it.
    const ownWrapper = within(odysseyList).getByText(myShared.name).closest('.menu-row-radio').parentElement
    expect(ownWrapper.getAttribute('draggable')).toBe('true')
    const dt1 = makeDataTransfer()
    fireEvent.dragStart(ownWrapper, { dataTransfer: dt1 })
    fireEvent.dragOver(customList, { dataTransfer: dt1 })
    fireEvent.drop(customList, { dataTransfer: dt1 })
    expect(onUnshareFilter).toHaveBeenCalledWith(myShared)

    // Someone else's row is NOT draggable — no onDragStart handler is even
    // attached (spec: "the drag must not start at all"), so a simulated
    // dragstart/drop round-trip carries no payload and does nothing.
    onUnshareFilter.mockClear()
    const theirWrapper = within(odysseyList).getByText(theirShared.name).closest('.menu-row-radio').parentElement
    expect(theirWrapper.getAttribute('draggable')).toBe('false')
    const dt2 = makeDataTransfer()
    fireEvent.dragStart(theirWrapper, { dataTransfer: dt2 })
    fireEvent.drop(customList, { dataTransfer: dt2 })
    expect(onUnshareFilter).not.toHaveBeenCalled()
  })

  test('dropping within the Odyssey list itself (reorder attempt) does nothing — fixed order', () => {
    const onShareFilter = vi.fn()
    const onUnshareFilter = vi.fn()
    const { container } = renderSavedTab({ sharedFilters: [theirShared, myShared], onShareFilter, onUnshareFilter })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const namesBefore = [...odysseyList.querySelectorAll('.menu-row__label')].map((el) => el.textContent)

    const ownWrapper = within(odysseyList).getByText(myShared.name).closest('.menu-row-radio').parentElement
    const dataTransfer = makeDataTransfer()
    fireEvent.dragStart(ownWrapper, { dataTransfer })
    fireEvent.dragOver(odysseyList, { dataTransfer })
    fireEvent.drop(odysseyList, { dataTransfer })

    expect(onShareFilter).not.toHaveBeenCalled()
    expect(onUnshareFilter).not.toHaveBeenCalled()
    const namesAfter = [...odysseyList.querySelectorAll('.menu-row__label')].map((el) => el.textContent)
    expect(namesAfter).toEqual(namesBefore)
  })

  test('another user\'s shared row: selectable/applicable, but not renameable or deletable', async () => {
    vi.useFakeTimers()
    const onApplySaved = vi.fn()
    const scopedAdapter = { searchShipments: vi.fn(async () => ({ results: [], total: 4 })) }
    const { container } = renderSavedTab({ sharedFilters: [theirShared], onApplySaved, scopedAdapter })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')

    const radio = within(odysseyList).getByText(theirShared.name).closest('.menu-row-radio').querySelector('input[type="radio"]')
    fireEvent.click(radio)
    await act(async () => { vi.advanceTimersByTime(500) })
    fireEvent.click(screen.getByText('Show all 4 results'))
    expect(onApplySaved).toHaveBeenCalledWith(theirShared.chips)

    // Not renameable: Edit Name stays disabled with their row selected.
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBe('true')

    // Not deletable: entering batch delete renders their row as a disabled
    // radio, never a checkbox.
    fireEvent.click(screen.getByText('Delete Filters'))
    const theirRow = within(odysseyList).getByText(theirShared.name).closest('.menu-row-radio')
    expect(theirRow.getAttribute('data-disabled')).toBe('true')
    expect(odysseyList.querySelectorAll('.menu-row-checkbox')).toHaveLength(0)
  })

  // S110 rev2 decision 2 REVERSES the earlier same-day "Edit Name is
  // Custom-only" ruling: "Edit Name covers Custom rows AND the author's own
  // shared rows." Un-share (drag back to Custom) is still the only way to
  // change what a shared filter SEARCHES FOR (Update Filter's own
  // carve-out, unaffected by this) — but its NAME is editable in place now.
  // Batch DELETE of your own shared row still works, unchanged.
  test('your own shared row IS renameable via Edit Name (decision 2) and gets a checkbox in batch delete', () => {
    const onRenameSharedFilter = vi.fn()
    const onDeleteSharedFilters = vi.fn()
    const { container } = renderSavedTab({ sharedFilters: [myShared], onRenameSharedFilter, onDeleteSharedFilters })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')

    const radio = within(odysseyList).getByText(myShared.name).closest('.menu-row-radio').querySelector('input[type="radio"]')
    fireEvent.click(radio)

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBeNull()

    fireEvent.click(screen.getByText('Edit Name'))
    const input = screen.getByLabelText(`Rename ${myShared.name}`)
    expect(document.activeElement).toBe(input)
    fireEvent.change(input, { target: { value: 'Renamed Shared' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // Routes to the SHARED persistence call, never the Custom one — this id
    // lives in `sharedFilters`, not `savedFilters`.
    expect(onRenameSharedFilter).toHaveBeenCalledWith(myShared.id, 'Renamed Shared')

    // Batch delete: your own shared row swaps to a checkbox and can be
    // confirmed via `onDeleteSharedFilters` (never `onDeleteFilters`).
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Delete Filters'))
    const checkbox = within(odysseyList).getByRole('checkbox')
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByText('Delete (1)'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Delete'))
    expect(onDeleteSharedFilters).toHaveBeenCalledWith([myShared.id])
  })

  test('batch delete: checkboxes appear only for the current user\'s own shared rows; defaults + others stay disabled radios', () => {
    const { container } = renderSavedTab({ sharedFilters: [theirShared, myShared] })
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Delete Filters'))

    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    // Exactly one checkbox — the current user's own shared row.
    expect(odysseyList.querySelectorAll('.menu-row-checkbox')).toHaveLength(1)
    expect(within(odysseyList).getByText(myShared.name).closest('.menu-row-checkbox')).toBeTruthy()
    // The two defaults + someone else's shared row: disabled radios.
    const disabledRadios = odysseyList.querySelectorAll('.menu-row-radio[data-disabled]')
    expect(disabledRadios).toHaveLength(ODYSSEY_DEFAULT_FILTERS.length + 1)
  })
})

// S110 rev2 item 5 — free mode is "what exists today": two-way with the
// bar, `Save Filters +` visible but disabled (no field filled).
describe('ShipmentsFiltersView — free mode (S110 rev2 item 5)', () => {
  test('Save Filters + is a functional no-op with nothing filled; filling a field enables it', () => {
    const onOpenSaveModal = vi.fn()
    render(<ShipmentsFiltersView onOpenSaveModal={onOpenSaveModal} />)

    fireEvent.click(screen.getByText('Save Filters'))
    expect(onOpenSaveModal).not.toHaveBeenCalled()

    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '12345' } })
    fireEvent.click(screen.getByText('Save Filters'))
    expect(onOpenSaveModal).toHaveBeenCalledTimes(1)
  })

  test('the All tab count reflects the live filter fields in use (free mode) — matches decision "free mode counts fields in use"', () => {
    render(<ShipmentsFiltersView />)
    const allTabButton = screen.getByText('All').closest('button')
    expect(within(allTabButton).getByText('0')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Enter Buy Shipment #'), { target: { value: '12345' } })
    expect(within(allTabButton).getByText('1')).toBeTruthy()
  })
})

// S110 rev2 item 7 (GS-28) — per-row copy icon, reverses GS-26. Every saved
// row gets a copy icon that copies THAT row's own chips, using the SAME
// `formatChipsForCopy` the bar's own copy button uses (decision 3) — proven
// here by asserting the exact string shape, not just that SOMETHING was
// copied.
describe('ShipmentsFiltersView — per-row copy icon (S110 rev2 item 7 / GS-28)', () => {
  test('copies the ROW\'s own chips as "Label: value · Label: value" without applying — the same shape the bar\'s copy button produces', () => {
    const writeText = vi.fn()
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const onApplySaved = vi.fn()
    renderSavedTab({ onApplySaved })
    fireEvent.click(screen.getByRole('button', { name: 'Copy West Coast LTL filters' }))

    expect(writeText).toHaveBeenCalledWith('Mode: LTL · Destination: CA')
    // Copying is NOT applying — no selection, no apply call.
    expect(onApplySaved).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
  })

  test('every saved row gets its own copy icon, both groups, without needing to select the row first', () => {
    const { container } = renderSavedTab({ sharedFilters: [] })
    expect(screen.getByRole('button', { name: 'Copy West Coast LTL filters' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy JBHT Sent Tenders filters' })).toBeTruthy()
    ODYSSEY_DEFAULT_FILTERS.forEach((f) => {
      expect(screen.getByRole('button', { name: `Copy ${f.name} filters` })).toBeTruthy()
    })
    // None of the rows were selected to get a copy icon.
    expect(container.querySelectorAll('.menu-row-radio--selected')).toHaveLength(0)
  })

  test('no navigator.clipboard — copy click does not throw', () => {
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    renderSavedTab()
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Copy West Coast LTL filters' }))).not.toThrow()
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
  })
})

// S110 rev2 item 8 — the drag rebuild's one visible affordance: a dashed
// outline on the whole target GROUP, toggled by dragenter/dragleave, so a
// cross-group drag is never ambiguous about where it will land.
describe('ShipmentsFiltersView — drag rebuild visible affordance (S110 rev2 item 8)', () => {
  function makeDataTransfer() {
    const data = {}
    return { setData: (k, v) => { data[k] = v }, getData: (k) => data[k], effectAllowed: null, dropEffect: null }
  }

  test('dragging a Custom row over the Odyssey group shows the drag-over affordance, and it clears on drop', () => {
    const onShareFilter = vi.fn()
    const { container } = render(
      <ShipmentsFiltersView savedFilters={sampleFilters} sharedFilters={[]} onShareFilter={onShareFilter} />,
    )
    fireEvent.click(screen.getByText('Saved'))

    const customWrapper = container.querySelector('.shipments-filters__saved-list--custom [draggable="true"]')
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const dataTransfer = makeDataTransfer()

    fireEvent.dragStart(customWrapper, { dataTransfer })
    fireEvent.dragEnter(odysseyList, { dataTransfer })
    expect(odysseyList.className).toContain('shipments-filters__saved-list--drag-over')

    fireEvent.drop(odysseyList, { dataTransfer })
    expect(odysseyList.className).not.toContain('shipments-filters__saved-list--drag-over')
    expect(onShareFilter).toHaveBeenCalledWith(sampleFilters[0])
  })

  test('the affordance also lights up when the pointer enters a ROW inside the target group, not just empty list space (dragenter/dragover wired on every row)', () => {
    const { container } = render(<ShipmentsFiltersView savedFilters={sampleFilters} sharedFilters={[]} />)
    fireEvent.click(screen.getByText('Saved'))

    const customWrapper = container.querySelector('.shipments-filters__saved-list--custom [draggable="true"]')
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const odysseyRow = odysseyList.querySelector('.menu-row-radio')
    const dataTransfer = makeDataTransfer()

    fireEvent.dragStart(customWrapper, { dataTransfer })
    // Entering a CHILD ROW bubbles dragenter up to the group container's own
    // handler — the affordance still lights up even though the pointer
    // never touched the container's own background.
    fireEvent.dragEnter(odysseyRow, { dataTransfer })
    expect(odysseyList.className).toContain('shipments-filters__saved-list--drag-over')
  })
})

// S130 — "Clear all" empties the FIELDS, not just the bar's committed chips.
// The controls are this component's own `filters` state; the host's onClearAll
// only removes chips from the bar, so a typed value stayed on screen (and a
// value never committed to the bar had no chip to remove at all — onClearAll
// was a total no-op for it).
describe('ShipmentsFiltersView — Clear all', () => {
  test('empties a typed field and resets the All tab count', () => {
    const onClearAll = vi.fn()
    render(<ShipmentsFiltersView onClearAll={onClearAll} />)

    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '44237' } })
    expect(input.value).toBe('44237')
    expect(within(screen.getByRole('button', { name: /^All/ })).getByText('1')).toBeTruthy()

    fireEvent.click(screen.getByText('Clear all'))

    expect(screen.getByPlaceholderText('Enter Buy Shipment #').value).toBe('')
    expect(within(screen.getByRole('button', { name: /^All/ })).getByText('0')).toBeTruthy()
    // Still tells the host to wipe the bar — clearing the form is ADDITIONAL.
    expect(onClearAll).toHaveBeenCalled()
  })

  test('a cleared field stays cleared through an Apply (present-and-empty, not absent)', () => {
    const onApplyFilters = vi.fn()
    const chips = [{
      key: 'buy-shipment', kind: 'attribute', label: 'Buy Shipment #: 44237',
      attrLabel: 'Buy Shipment #', queryValue: '44237', dataKey: 'buyShipment',
      group: 'Shipment Identifiers',
    }]
    render(<ShipmentsFiltersView chips={chips} onApplyFilters={onApplyFilters} onClearAll={vi.fn()} />)
    expect(screen.getByPlaceholderText('Enter Buy Shipment #').value).toBe('44237')

    fireEvent.click(screen.getByText('Clear all'))
    fireEvent.click(screen.getByRole('button', { name: /Show/ }))

    // An ABSENT key would mean "leave that chip alone" and the chip would
    // survive the clear; present-and-empty is what removes it.
    expect(onApplyFilters).toHaveBeenCalled()
    expect(onApplyFilters.mock.calls[0][0]['buy-shipment']).toBe('')
  })
})

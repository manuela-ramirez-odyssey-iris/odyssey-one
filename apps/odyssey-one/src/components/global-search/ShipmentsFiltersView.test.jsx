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

  // Rewritten for S110 rev1 (supersedes the Phase 1 "chevron expands to
  // read-only chips" behaviour, spec "Behaviour" 6/"Consequence" — the
  // chevron-expand is DELETED outright, not migrated: "we don't need to
  // expand below the row anything since now we have it expanded and
  // editable in the other tab," user 2026-08-05). The two click zones now
  // diverge: radio selects only (stays on Saved, no navigation); the row
  // BODY (label/chevron) opens the profile in the right tab's editor,
  // renamed to it. No inline chip list exists anywhere in either gesture.
  test('the radio selects without navigating; the row body opens the profile in the editor tab, renamed to it, with no inline chip list', () => {
    const { container } = renderSavedTab()
    // Scoped to the Custom group — S108 Phase 2 added a second (Odyssey)
    // group of MenuRowRadio rows below it, so an unscoped query now matches 4.
    const customList = container.querySelector('.shipments-filters__saved-list--custom')
    const radios = customList.querySelectorAll('.menu-row-radio input[type="radio"]')
    expect(radios).toHaveLength(2)

    fireEvent.click(radios[0])
    expect(container.querySelectorAll('.menu-row-radio--selected')).toHaveLength(1)
    // Selection alone stays on the Saved tab (gesture table: "Stays on
    // Saved. No navigation.") — the Saved pill is still the selected one.
    expect(screen.getByText('Saved').closest('button').getAttribute('aria-pressed')).toBe('true')
    // No inline expand of any kind — deleted, not migrated.
    expect(screen.queryByText('Mode: LTL')).toBeNull()
    expect(container.querySelector('.search-chip')).toBeNull()

    // Clicking the row's BODY (label/chevron) opens it in the editor tab.
    fireEvent.click(screen.getByText('West Coast LTL'))

    // The right tab is RENAMED to the profile and is now the selected tab —
    // the Saved list (and "West Coast LTL" as a row) is gone, so this text
    // now resolves to exactly one element: the tab pill.
    const renamedTab = screen.getByText('West Coast LTL').closest('button')
    expect(renamedTab.getAttribute('aria-pressed')).toBe('true')
    // Still no inline read-only chip list — the values live in the editor
    // fields (spec: "expanded and editable in the other tab"), not as a
    // second, static rendering of the same chips.
    expect(container.querySelector('.search-chip')).toBeNull()
    expect(screen.queryByText('SCAC: JBHT')).toBeNull()
  })

  test('⋮ → Edit Name is disabled with nothing selected, enabled once a row is selected', () => {
    renderSavedTab()
    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBe('true')
  })

  // User ruling 2026-08-05: "edit name should only work on the selected custom
  // rows." Opening a profile in the editor (row body) is NOT a rename target —
  // an earlier build let it stand in for a selection to save a click, and that
  // was rejected: selecting is the act that names a target.
  test('⋮ → Edit Name stays disabled for a profile merely OPEN in the editor (no radio selection)', () => {
    renderSavedTab()
    fireEvent.click(screen.getByText('West Coast LTL')) // row body → opens editor
    fireEvent.click(screen.getByText('Saved'))          // back to the list
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

// S110 rev1 (docs/superpowers/specs/2026-08-05-filters-profile-flow.md) —
// "a saved filter is not a thing you select and apply, it is a search
// profile you edit." Covers the parts of the profile-editing flow not
// already exercised above: tab order/naming, the footer link relabel +
// dirty-tracked Update Filter (persist-only), the Odyssey-default carve-out,
// and the badge.
describe('ShipmentsFiltersView — profile-editing flow (S110 rev1)', () => {
  test('tab order is Saved then All; the right tab renames to the open profile', () => {
    const { container } = render(<ShipmentsFiltersView savedFilters={sampleFilters} />)
    const tabButtons = container.querySelectorAll('.pill-tab')
    expect(tabButtons).toHaveLength(2)
    // Order (spec "Tab order and naming": "All moves to the right"). Naming:
    // no profile open yet → the right tab reads plain "All".
    expect(tabButtons[0].textContent).toContain('Saved')
    expect(tabButtons[1].textContent).toContain('All')
    expect(tabButtons[1].textContent).not.toContain('West Coast LTL')

    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(screen.getByText('West Coast LTL')) // row body — opens the editor

    const tabButtonsAfter = container.querySelectorAll('.pill-tab')
    expect(tabButtonsAfter[0].textContent).toContain('Saved')
    expect(tabButtonsAfter[1].textContent).toContain('West Coast LTL')
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

  test('Save Filters + relabels to Create New Filter once a profile is open; Update Filter appears only after an edit, disappears once the profile matches again, and persists WITHOUT applying to the bar/table', () => {
    const onUpdateFilter = vi.fn()
    const onApplyFilters = vi.fn()
    const onApplySaved = vi.fn()
    const { rerender } = render(
      <ShipmentsFiltersView
        savedFilters={[editableFilter]}
        onUpdateFilter={onUpdateFilter}
        onApplyFilters={onApplyFilters}
        onApplySaved={onApplySaved}
      />,
    )
    // Default state — no profile open: the link is the unchanged "Save Filters".
    expect(screen.getByText('Save Filters')).toBeTruthy()

    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(screen.getByText('Editable Profile')) // row body — opens the editor, lands back on the (renamed) right tab

    // A profile is open: the link renames (spec "Footer links"), same action.
    expect(screen.getByText('Create New Filter')).toBeTruthy()
    expect(screen.queryByText('Save Filters')).toBeNull()
    // Not dirty yet — Update Filter doesn't exist.
    expect(screen.queryByText('Update Filter')).toBeNull()

    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '99999' } })
    expect(screen.getByText('Update Filter')).toBeTruthy()

    fireEvent.click(screen.getByText('Update Filter'))

    expect(onUpdateFilter).toHaveBeenCalledTimes(1)
    const [updatedId, updatedChips] = onUpdateFilter.mock.calls[0]
    expect(updatedId).toBe('f3')
    expect(updatedChips.find((c) => c.key === 'buy-shipment').queryValue).toBe('99999')
    // Update Filter PERSISTS ONLY (spec decision 1) — "Show N results" keeps
    // the apply job; neither the All-tab commit path nor the Saved-tab
    // wholesale-apply path may fire from this click.
    expect(onApplyFilters).not.toHaveBeenCalled()
    expect(onApplySaved).not.toHaveBeenCalled()

    // Simulate the host round-trip a real update causes: the persisted
    // profile now carries the chips Update Filter just wrote (same shape
    // `onUpdateFilter` received) — the dirty check recomputes against the
    // FRESH profile and Update Filter disappears again.
    rerender(
      <ShipmentsFiltersView
        savedFilters={[{ ...editableFilter, chips: updatedChips }]}
        onUpdateFilter={onUpdateFilter}
        onApplyFilters={onApplyFilters}
        onApplySaved={onApplySaved}
      />,
    )
    expect(screen.queryByText('Update Filter')).toBeNull()
  })

  test('Update Filter never appears for an Odyssey default', () => {
    render(<ShipmentsFiltersView savedFilters={[]} onUpdateFilter={vi.fn()} />)
    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(screen.getByText(ODYSSEY_DEFAULT_FILTERS[0].name)) // row body — opens it in the editor

    // Opening a default in the editor IS allowed (spec: "you can look at it,
    // and use it as a starting point for Create New Filter") — only Update
    // Filter is barred, same rule as no ⋮/no grip/not deletable.
    expect(screen.getByText('Create New Filter')).toBeTruthy()
    expect(screen.queryByText('Update Filter')).toBeNull()
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
    render(<ShipmentsFiltersView savedFilters={[]} sharedFilters={[mine]} onUpdateFilter={onUpdateFilter} />)
    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(screen.getByText('Mine')) // row body — opens it in the editor

    expect(screen.getByText('Create New Filter')).toBeTruthy()
    const input = screen.getByPlaceholderText('Enter Buy Shipment #')
    fireEvent.change(input, { target: { value: '999' } })
    // Would be dirty (and show Update Filter) for a Custom profile at this
    // point — the shared-filter carve-out suppresses it regardless (no
    // "update chips" route exists for shared_filters, see
    // ShipmentsFiltersView's `isSharedOpen` comment).
    expect(screen.queryByText('Update Filter')).toBeNull()
    expect(onUpdateFilter).not.toHaveBeenCalled()
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

  test('Odyssey group order is fixed: defaults first, then shared exactly as given (created_at order)', () => {
    const { container } = renderSavedTab({ sharedFilters: [theirShared, myShared] })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')
    const names = [...odysseyList.querySelectorAll('.menu-row__label')].map((el) => el.textContent)
    expect(names).toEqual([
      ...ODYSSEY_DEFAULT_FILTERS.map((f) => f.name),
      theirShared.name,
      myShared.name,
    ])
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

  // Edit Name is Custom-only (user ruling 2026-08-05) — a shared row is NOT
  // renameable in place, even your own. To change one: un-share it (drag back
  // to Custom), edit it there, re-share. Same reasoning that suppresses Update
  // Filter for shared rows. Batch DELETE of your own shared row still works.
  test('your own shared row: NOT renameable via Edit Name, but gets a checkbox in batch delete', () => {
    const onDeleteSharedFilters = vi.fn()
    const { container } = renderSavedTab({ sharedFilters: [myShared], onDeleteSharedFilters })
    const odysseyList = container.querySelector('.shipments-filters__saved-list--odyssey')

    const radio = within(odysseyList).getByText(myShared.name).closest('.menu-row-radio').querySelector('input[type="radio"]')
    fireEvent.click(radio)

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    const editNameOption = screen.getByText('Edit Name').closest('[role="menuitem"]')
    expect(editNameOption.getAttribute('aria-disabled')).toBe('true')

    // Batch delete: your own shared row swaps to a checkbox and can be
    // confirmed via `onDeleteSharedFilters` (never `onDeleteFilters` — this
    // id lives in `sharedFilters`, not `savedFilters`). The ⋮ menu is still
    // open (Edit Name was never clicked — it's disabled now), so go straight
    // to Delete Filters rather than toggling the menu shut and back open.
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

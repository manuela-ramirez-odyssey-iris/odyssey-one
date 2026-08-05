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
    const radios = container.querySelectorAll('.menu-row-radio input[type="radio"]')
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

    expect(container.querySelectorAll('.menu-row-checkbox')).toHaveLength(2)
    expect(container.querySelectorAll('.menu-row-radio')).toHaveLength(0)

    const checkboxes = container.querySelectorAll('.menu-row-checkbox input[type="checkbox"]')
    fireEvent.click(checkboxes[0]) // "West Coast LTL" (f1)
    fireEvent.click(checkboxes[1]) // "JBHT Sent Tenders" (f2)

    expect(screen.getByText('Delete (2)')).toBeTruthy()

    fireEvent.click(screen.getByText('Delete (2)'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Delete'))

    expect(onDeleteFilters).toHaveBeenCalledTimes(1)
    expect(new Set(onDeleteFilters.mock.calls[0][0])).toEqual(new Set(['f1', 'f2']))
    // Delete mode exits after a confirmed delete — back to radio rows.
    expect(container.querySelectorAll('.menu-row-radio').length).toBeGreaterThan(0)
  })

  test('Cancel (panel footer) restores the normal list untouched, without deleting', () => {
    const onDeleteFilters = vi.fn()
    const { container } = renderSavedTab({ onDeleteFilters })

    fireEvent.click(screen.getByRole('button', { name: 'Preset actions' }))
    fireEvent.click(screen.getByText('Delete Filters'))
    expect(container.querySelectorAll('.menu-row-checkbox')).toHaveLength(2)

    fireEvent.click(screen.getByText('Cancel'))

    expect(container.querySelectorAll('.menu-row-checkbox')).toHaveLength(0)
    expect(container.querySelectorAll('.menu-row-radio')).toHaveLength(2)
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

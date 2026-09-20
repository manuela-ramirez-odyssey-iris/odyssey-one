// @vitest-environment jsdom
// S154 Task 2 — the Shipments search bar accepts a host-enforced LOCKED chip
// (consolidate mode's customer filter) and the Filters panel must respect it:
// visible but uneditable, immune to Clear/Clear all, never dropped by a
// merge/write-back path. Modelled on ShipmentsGlobalSearch.test.jsx's own
// harness (fake stateful hook + QueryClientProvider) — reuses its
// `useFakeGlobalSearchWithChipState` idea, but the fake here mirrors the REAL
// setLockedChip/onChipRemove semantics Task 1 built into useGlobalSearch.js,
// so this file proves ShipmentsGlobalSearch's own wiring, not just a mock's
// say-so. Per Task 1's own note: the bar collapses chips behind a "+N" pill
// until focused (jsdom reports offsetWidth 0) — fireEvent.focus() the
// combobox before asserting on chips.
import { useState } from 'react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

afterEach(cleanup)

function withQueryClient(qc, ui) {
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
}

function baseHookReturn(overrides) {
  return {
    value: '', query: '', onChange: vi.fn(), onClear: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn(),
    chips: [], onChipCommit: vi.fn(), onChipRemove: vi.fn(), setLockedChip: vi.fn(),
    textChip: null, onTextCommit: vi.fn(), onTextRemove: vi.fn(), onSetCommit: vi.fn(),
    onDateCommit: vi.fn(), onDateToggle: vi.fn(), applyChips: vi.fn(),
    suggestionSections: [], suggestionsOpen: false,
    results: [], resultTotal: 0, searching: false, pendingDateChip: false,
    ...overrides,
  }
}

// A stateful fake mirroring the REAL useGlobalSearch's locked-chip semantics
// (Task 1, useGlobalSearch.js): setLockedChip adds/replaces/clears the ONE
// locked chip in place; onChipRemove no-ops on a locked chip. Real useState so
// ShipmentsGlobalSearch's own effect (setLockedChip, then reading `chips`
// back on the next render) exercises real React re-render timing.
function useFakeGlobalSearchWithLock(initialChips = [], extra = {}) {
  const [chips, setChips] = useState(initialChips)
  const setLockedChip = (chip) => {
    setChips((cs) => {
      const rest = cs.filter((c) => !c.locked)
      return chip ? [...rest, { ...chip, locked: true }] : rest
    })
  }
  const onChipRemove = (key) => {
    setChips((cs) => (cs.find((c) => c.key === key)?.locked ? cs : cs.filter((c) => c.key !== key)))
  }
  return baseHookReturn({ ...extra, chips, setLockedChip, onChipRemove })
}

async function mountWithLock(initialChips = [], extra = {}) {
  vi.resetModules()
  vi.doMock('../../contexts/CustomersContext.jsx', () => ({
    useCustomers: () => ({ selectedDataIds: null }),
  }))
  vi.doMock('../../search/useGlobalSearch', () => ({
    useGlobalSearch: () => useFakeGlobalSearchWithLock(initialChips, extra),
  }))
  const { default: ShipmentsGlobalSearch } = await import('./ShipmentsGlobalSearch.jsx')
  return ShipmentsGlobalSearch
}

function unmockHook() {
  vi.doUnmock('../../contexts/CustomersContext.jsx')
  vi.doUnmock('../../search/useGlobalSearch')
}

const newQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const plainChip = {
  key: 'origin', kind: 'attribute', label: 'Origin: Houston',
  attrLabel: 'Origin', queryValue: 'Houston', dataKey: 'origin', group: 'Route & Geography',
}
const customerLock = {
  key: 'customer-id', kind: 'attribute', label: 'Customer ID: G2O',
  attrLabel: 'Customer ID', queryValue: 'G2O', dataKey: 'customerId', group: 'Customers & Parties',
}
const customerLockReplacement = {
  key: 'customer-id', kind: 'attribute', label: 'Customer ID: KEMIRA_NA_01',
  attrLabel: 'Customer ID', queryValue: 'KEMIRA_NA_01', dataKey: 'customerId', group: 'Customers & Parties',
}

describe('ShipmentsGlobalSearch — lockedChip prop', () => {
  test('a chip with the locked label is in the bar and has no Remove button', async () => {
    const ShipmentsGlobalSearch = await mountWithLock([])
    const { container, queryByRole } = render(withQueryClient(
      newQc(), <ShipmentsGlobalSearch lockedChip={customerLock} />,
    ))
    fireEvent.focus(container.querySelector('[role="combobox"]'))
    expect(container.querySelector('.global-search-chip')?.textContent).toContain('Customer ID: G2O')
    expect(queryByRole('button', { name: /^Remove Customer ID/ })).toBeNull()
    unmockHook()
  })

  test('onCommitQuery fires with criteria containing the locked chip (so the table filters)', async () => {
    const onCommitQuery = vi.fn()
    const ShipmentsGlobalSearch = await mountWithLock([])
    render(withQueryClient(
      newQc(), <ShipmentsGlobalSearch lockedChip={customerLock} onCommitQuery={onCommitQuery} />,
    ))
    await waitFor(() => expect(onCommitQuery).toHaveBeenCalled())
    const criteria = onCommitQuery.mock.calls[0][0]
    expect(criteria.chips.some((c) => c.key === 'customer-id' && c.queryValue === 'G2O')).toBe(true)
    unmockHook()
  })

  test('changing the lockedChip prop REPLACES the chip rather than adding a second, and re-commits', async () => {
    const onCommitQuery = vi.fn()
    const ShipmentsGlobalSearch = await mountWithLock([])
    const qc = newQc()
    const { container, rerender } = render(withQueryClient(
      qc, <ShipmentsGlobalSearch lockedChip={customerLock} onCommitQuery={onCommitQuery} />,
    ))
    await waitFor(() => expect(onCommitQuery).toHaveBeenCalledTimes(1))

    rerender(withQueryClient(
      qc, <ShipmentsGlobalSearch lockedChip={customerLockReplacement} onCommitQuery={onCommitQuery} />,
    ))
    await waitFor(() => expect(onCommitQuery).toHaveBeenCalledTimes(2))

    fireEvent.focus(container.querySelector('[role="combobox"]'))
    const customerChips = [...container.querySelectorAll('.global-search-chip')]
      .filter((el) => el.textContent.includes('Customer ID'))
    expect(customerChips).toHaveLength(1)
    expect(customerChips[0].textContent).toContain('Customer ID: KEMIRA_NA_01')

    const lastCriteria = onCommitQuery.mock.calls[1][0]
    expect(lastCriteria.chips.filter((c) => c.key === 'customer-id')).toHaveLength(1)
    expect(lastCriteria.chips.find((c) => c.key === 'customer-id').queryValue).toBe('KEMIRA_NA_01')
    unmockHook()
  })

  test('setting lockedChip back to null removes it, re-commits, and leaves the other committed chip untouched', async () => {
    const onCommitQuery = vi.fn()
    const ShipmentsGlobalSearch = await mountWithLock([plainChip])
    const qc = newQc()
    const { container, rerender } = render(withQueryClient(
      qc, <ShipmentsGlobalSearch lockedChip={customerLock} onCommitQuery={onCommitQuery} />,
    ))
    await waitFor(() => expect(onCommitQuery).toHaveBeenCalledTimes(1))

    rerender(withQueryClient(
      qc, <ShipmentsGlobalSearch lockedChip={null} onCommitQuery={onCommitQuery} />,
    ))
    await waitFor(() => expect(onCommitQuery).toHaveBeenCalledTimes(2))

    fireEvent.focus(container.querySelector('[role="combobox"]'))
    const chipTexts = [...container.querySelectorAll('.global-search-chip')].map((el) => el.textContent)
    expect(chipTexts.some((t) => t.includes('Origin: Houston'))).toBe(true)
    expect(chipTexts.some((t) => t.includes('Customer ID'))).toBe(false)

    const lastCriteria = onCommitQuery.mock.calls[1][0]
    expect(lastCriteria.chips.map((c) => c.key)).toEqual(['origin'])
    unmockHook()
  })
})

describe('ShipmentsGlobalSearch — Filters panel respects the locked chip', () => {
  const modeChip = {
    key: 'mode', kind: 'attribute', label: 'Mode: LTL',
    attrLabel: 'Mode', queryValue: 'LTL', dataKey: 'mode', group: 'Transport & Equipment',
  }

  test('the locked attribute\'s control renders disabled with its value visible, and Clear all cannot drop it', async () => {
    // Only the planner's own chip is seeded — the locked one arrives via the
    // `lockedChip` prop effect (same as every other test in this file), so
    // the fake hook's `setLockedChip` never has to reconcile against an
    // already-present un-flagged copy of the same key.
    const ShipmentsGlobalSearch = await mountWithLock([modeChip])
    const { container } = render(withQueryClient(
      newQc(), <ShipmentsGlobalSearch lockedChip={customerLock} onCommitQuery={vi.fn()} />,
    ))
    fireEvent.click(container.querySelector('.filter-button'))

    const customerInput = screen.getByPlaceholderText('Select Customer ID')
    expect(customerInput.disabled).toBe(true)
    expect(customerInput.value).toBe('G2O')

    // Scoped to the Mode field specifically — 'LTL' is ALSO a value in the
    // neighbouring Equipment Code enum (same "Transport & Equipment"
    // section), so an unscoped query is ambiguous.
    const modeField = [...container.querySelectorAll('.shipments-filters__field')]
      .find((el) => within(el).queryByText('Mode'))
    const ltlButton = within(modeField).getByText('LTL').closest('button')
    expect(ltlButton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByText('Clear all'))

    // The locked field is untouched — still disabled, still showing its value.
    expect(screen.getByPlaceholderText('Select Customer ID').disabled).toBe(true)
    expect(screen.getByPlaceholderText('Select Customer ID').value).toBe('G2O')
    // The UNLOCKED field genuinely cleared.
    expect(within(modeField).getByText('LTL').closest('button').getAttribute('aria-pressed')).toBe('false')

    // The committed chip survived the clear too — close the panel, reopen the
    // bar, and check it's still there and still unremovable.
    fireEvent.click(container.querySelector('.filter-button')) // close
    fireEvent.focus(container.querySelector('[role="combobox"]'))
    expect(container.querySelector('.global-search-chip')?.textContent).toContain('Customer ID: G2O')
    expect(screen.queryByRole('button', { name: /^Remove Customer ID/ })).toBeNull()
    unmockHook()
  })
})

// @vitest-environment jsdom
// Case 12 / GS-22 refinement (user, 2026-08-03): reopening a COMMITTED date
// chip (open again, `from` already set) must NOT force-close an already-open
// results panel — only a FRESH open chip (no `from` yet) still owns the space
// below the bar. Mocks the hook + CustomersContext (same pattern as
// ValueComboBox.test.jsx) so this exercises the real open/close effect in
// ShipmentsGlobalSearch.jsx without wiring the live/mock adapter.
import { useState } from 'react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'

afterEach(cleanup)

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
    const { container, rerender } = render(<ShipmentsGlobalSearch />)
    // Committing the chip (chipCount 0 -> 1) opens the panel.
    expect(panelOpen(container)).toBe(true)

    // User clicks the committed chip to reopen its calendar for editing.
    hookReturn.chips = [{ ...committedClosed, open: true }]
    hookReturn.pendingDateChip = true
    rerender(<ShipmentsGlobalSearch />)
    expect(panelOpen(container)).toBe(true)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('a fresh open date chip (no date yet) still closes the panel', async () => {
    const committedText = { key: 'ship-date', kind: 'date-range', open: false, from: '2026-08-01' }
    let hookReturn = baseHookReturn({ chips: [committedText], pendingDateChip: false })
    const { ShipmentsGlobalSearch } = await mountWithHook(hookReturn)
    const { container, rerender } = render(<ShipmentsGlobalSearch />)
    expect(panelOpen(container)).toBe(true)

    // A second, brand-new date chip is opened for its first pick.
    hookReturn.chips = [committedText, { key: 'delivery-date', kind: 'date-range', open: true, from: null }]
    hookReturn.pendingDateChip = true
    rerender(<ShipmentsGlobalSearch />)
    expect(panelOpen(container)).toBe(false)
    vi.doUnmock('../../contexts/CustomersContext.jsx')
    vi.doUnmock('../../search/useGlobalSearch')
  })

  test('first-commit-expanded chip still opens results only once it closes (dateCompleted path unchanged)', async () => {
    const freshOpenNoDate = { key: 'ship-date', kind: 'date-range', open: true, from: null }
    let hookReturn = baseHookReturn({ chips: [freshOpenNoDate], pendingDateChip: true })
    const { ShipmentsGlobalSearch } = await mountWithHook(hookReturn)
    const { container, rerender } = render(<ShipmentsGlobalSearch />)
    expect(panelOpen(container)).toBe(false)

    // The chip lands EXPANDED with `from` prefilled, then closes.
    hookReturn.chips = [{ ...freshOpenNoDate, open: false, from: '2026-08-01' }]
    hookReturn.pendingDateChip = false
    rerender(<ShipmentsGlobalSearch />)
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
    const { container } = render(
      <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} onSelectShipment={onSelectShipment} />,
    )
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
    const { container, getByTestId } = render(
      <>
        <ShipmentsGlobalSearch onCommitQuery={onCommitQuery} />
        <div className="shipments-bar" data-testid="docked-bar">docked bar</div>
      </>,
    )
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

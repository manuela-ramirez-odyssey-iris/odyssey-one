// @vitest-environment jsdom
// A locked chip (consolidate mode's customer filter) must be unremovable by
// every route the bar offers: the X, Backspace, and the removal callback.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, renderHook, act } from '@testing-library/react'
import { GlobalSearch } from '@odyssey/ui'
import { useGlobalSearch } from './useGlobalSearch'

afterEach(cleanup)

const plain = { key: 'origin', label: 'Origin: Houston', kind: 'attribute' }
const locked = { key: 'customer-id', label: 'Customer ID: VALTRIS_01', kind: 'attribute', locked: true }

describe('GlobalSearch — locked chips', () => {
  test('a normal chip offers a remove button; a locked chip does not', () => {
    render(<GlobalSearch value="" chips={[plain, locked]} onChange={() => {}} onChipRemove={() => {}} />)
    // Collapsed-bar chip visibility is width-measured (ResizeObserver), which
    // jsdom reports as 0 — focusing expands the bar so every chip renders,
    // same as a real narrow viewport would hide them behind "+N" otherwise.
    fireEvent.focus(screen.getByRole('combobox'))
    expect(screen.getByRole('button', { name: 'Remove Origin: Houston' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Remove Customer ID/ })).toBeNull()
    // The chip itself still renders — it is a visible filter, just not a removable one.
    expect(screen.getByText('Customer ID: VALTRIS_01')).toBeTruthy()
  })

  test('Backspace on an empty input removes the last UNLOCKED chip, never a locked one', () => {
    const onChipRemove = vi.fn()
    render(<GlobalSearch value="" chips={[plain, locked]} onChange={() => {}} onChipRemove={onChipRemove} />)
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Backspace' })
    expect(onChipRemove).toHaveBeenCalledWith('origin')
  })

  test('Backspace with a locked chip in the MIDDLE removes the LAST unlocked chip, not the first', () => {
    const unlockedA = { key: 'origin', label: 'Origin: Houston', kind: 'attribute' }
    const unlockedB = { key: 'scac', label: 'SCAC: SEFL', kind: 'attribute' }
    const onChipRemove = vi.fn()
    render(<GlobalSearch value="" chips={[unlockedA, locked, unlockedB]} onChange={() => {}} onChipRemove={onChipRemove} />)
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Backspace' })
    expect(onChipRemove).toHaveBeenCalledWith('scac')
  })

  test('Backspace does nothing when every chip is locked', () => {
    const onChipRemove = vi.fn()
    render(<GlobalSearch value="" chips={[locked]} onChange={() => {}} onChipRemove={onChipRemove} />)
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Backspace' })
    expect(onChipRemove).not.toHaveBeenCalled()
  })
})

describe('useGlobalSearch — locked chips', () => {
  test('onChipRemove refuses a locked chip and removes an unlocked one', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [plain, locked] }))
    act(() => result.current.onChipRemove('customer-id'))
    expect(result.current.chips.map((c) => c.key)).toEqual(['origin', 'customer-id'])
    act(() => result.current.onChipRemove('origin'))
    expect(result.current.chips.map((c) => c.key)).toEqual(['customer-id'])
  })

  test('setLockedChip adds, replaces and clears the locked chip without disturbing others', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [plain] }))
    act(() => result.current.setLockedChip(locked))
    expect(result.current.chips.map((c) => c.key)).toEqual(['origin', 'customer-id'])
    expect(result.current.chips.find((c) => c.key === 'customer-id').locked).toBe(true)
    act(() => result.current.setLockedChip({ key: 'customer-id', label: 'Customer ID: KEMIRA_NA_01', queryValue: 'KEMIRA_NA_01', kind: 'attribute' }))
    expect(result.current.chips.filter((c) => c.key === 'customer-id')).toHaveLength(1)
    expect(result.current.chips.find((c) => c.key === 'customer-id').label).toBe('Customer ID: KEMIRA_NA_01')
    act(() => result.current.setLockedChip(null))
    expect(result.current.chips.map((c) => c.key)).toEqual(['origin'])
  })

  test('onClear keeps the locked chip and drops everything else', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [plain, locked] }))
    act(() => result.current.onClear())
    expect(result.current.chips.map((c) => c.key)).toEqual(['customer-id'])
    expect(result.current.chips[0].locked).toBe(true)
  })

  test('applyChips preserves the locked chip and never duplicates its key', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [locked] }))
    act(() => result.current.applyChips([{ key: 'scac', label: 'SCAC: SEFL', kind: 'attribute' }]))
    expect(result.current.chips.map((c) => c.key).sort()).toEqual(['customer-id', 'scac'])
    // An applied set that carries the locked key must not displace or duplicate it.
    act(() => result.current.applyChips([{ key: 'customer-id', label: 'Customer ID: OTHER', kind: 'attribute' }]))
    const customerChips = result.current.chips.filter((c) => c.key === 'customer-id')
    expect(customerChips).toHaveLength(1)
    expect(customerChips[0].locked).toBe(true)
    expect(customerChips[0].label).toBe('Customer ID: VALTRIS_01')
  })

  test('committing a chip on the locked key is ignored — the lock is not a suggestion', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [locked] }))
    act(() => result.current.onChipCommit({ key: 'customer-id', label: 'Customer ID', attrLabel: 'Customer ID', queryValue: 'OTHER_CUST', dataKey: 'customerId', kind: 'attribute' }))
    const customerChips = result.current.chips.filter((c) => c.key === 'customer-id')
    expect(customerChips).toHaveLength(1)
    expect(customerChips[0].locked).toBe(true)
    expect(customerChips[0].label).toBe('Customer ID: VALTRIS_01')
  })

  test('committing a chip on a DIFFERENT key still works normally', () => {
    const { result } = renderHook(() => useGlobalSearch(null, { initialChips: [locked] }))
    act(() => result.current.onChipCommit({ key: 'scac', label: 'SCAC', attrLabel: 'SCAC', queryValue: 'SEFL', dataKey: 'scac', kind: 'attribute' }))
    expect(result.current.chips.map((c) => c.key).sort()).toEqual(['customer-id', 'scac'])
  })
})

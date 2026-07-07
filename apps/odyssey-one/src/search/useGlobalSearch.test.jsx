// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGlobalSearch } from './useGlobalSearch'

// Hook-level regression guard for the S80 GlobalSearch behavior additions:
//   Req 1 — emptying the input clears the glimpse IMMEDIATELY (no debounce lag).
//   Req 2 — free-text commits become a query badge (textChip) in the bar.
// Runs in jsdom (renderHook needs a DOM); the adapter is a stub — this file
// tests the ORCHESTRATION, composed-criteria.test.js covers the real adapter.

const makeAdapter = () => ({
  getInitial: vi.fn(async () => []),
  getSuggestions: vi.fn(async () => []),
  searchShipments: vi.fn(async (chips, q) =>
    (chips?.length || q)
      ? { results: [{ id: `match:${q}` }], total: 1 }
      : { results: [], total: 0 }),
})

const CHIP = { key: 'customer-name', dataKey: 'customerName', queryValue: 'geon' }

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const flushDebounce = () => act(async () => { vi.advanceTimersByTime(200) })

describe('S80 req 1 — emptying the input clears the glimpse immediately', () => {
  test('typing populates results after the debounce; emptying clears them with NO debounce wait', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))

    await act(async () => result.current.onChange('geon'))
    await flushDebounce()
    expect(result.current.query).toBe('geon')
    expect(result.current.results).toHaveLength(1)
    expect(result.current.resultTotal).toBe(1)

    // Backspace-to-empty: results must be gone immediately — the debounce is
    // deliberately NOT advanced here.
    await act(async () => result.current.onChange(''))
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.resultTotal).toBe(0)
  })

  test('with committed chips, emptying the text immediately falls back to the chips-only glimpse', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))

    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onChange('extra'))
    await flushDebounce()
    expect(adapter.searchShipments).toHaveBeenLastCalledWith([CHIP], 'extra')

    adapter.searchShipments.mockClear()
    await act(async () => result.current.onChange(''))
    // No timer advance — the chips-only search re-ran immediately.
    expect(adapter.searchShipments).toHaveBeenLastCalledWith([CHIP], '')
    expect(result.current.results).toHaveLength(1)
  })
})

describe('S80 req 2 — free-text commit becomes a query badge (textChip)', () => {
  test('onTextCommit turns the typed text into the text chip and clears the input', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))

    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())

    expect(result.current.value).toBe('')
    expect(result.current.textChip).toEqual({
      key: '__free-text__', label: 'geon', value: 'geon', kind: 'text',
    })
  })

  test('onTextCommit is a no-op on an empty/whitespace input', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))
    await act(async () => result.current.onTextCommit())
    expect(result.current.textChip).toBeNull()
    await act(async () => result.current.onChange('   '))
    await act(async () => result.current.onTextCommit())
    expect(result.current.textChip).toBeNull()
  })

  test('the glimpse keeps searching on the committed term while the input is empty', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))

    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())
    await flushDebounce()
    expect(adapter.searchShipments).toHaveBeenLastCalledWith([], 'geon')
    expect(result.current.results).toHaveLength(1)
  })

  test('typed text previews the REPLACEMENT: it wins over the committed term, and recommitting replaces the badge', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))

    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())
    await act(async () => result.current.onChange('erco'))
    await flushDebounce()
    expect(adapter.searchShipments).toHaveBeenLastCalledWith([], 'erco')

    await act(async () => result.current.onTextCommit())
    expect(result.current.textChip.value).toBe('erco') // single term — replaced, not appended
  })

  test('onTextRemove drops the badge; onClear wipes it along with chips and text', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() => useGlobalSearch(adapter))

    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())
    await act(async () => result.current.onTextRemove())
    expect(result.current.textChip).toBeNull()

    await act(async () => result.current.onChange('erco'))
    await act(async () => result.current.onTextCommit())
    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onClear())
    expect(result.current.textChip).toBeNull()
    expect(result.current.chips).toEqual([])
    expect(result.current.value).toBe('')
    expect(result.current.results).toEqual([])
  })
})

describe('S81 fix 6 — removing the LAST committed item is the explicit full clear', () => {
  const CHIP_B = { key: 'scac', dataKey: 'scac', queryValue: 'JBHT' }

  test('removing the only chip fires onLastRemoved and wipes any in-progress input', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onChange('half-typed'))
    await act(async () => result.current.onChipRemove(CHIP.key))

    expect(onLastRemoved).toHaveBeenCalledTimes(1)
    expect(result.current.chips).toEqual([])
    expect(result.current.value).toBe('') // input cleared like the X button
    expect(result.current.query).toBe('')
  })

  test('removing a chip while OTHERS remain does NOT fire (no recommit)', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onChipCommit(CHIP_B))
    await act(async () => result.current.onChipRemove(CHIP.key))

    expect(onLastRemoved).not.toHaveBeenCalled()
    expect(result.current.chips).toEqual([CHIP_B])
  })

  test('removing the text badge with no chips fires; the badge counts as the last item', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())
    await act(async () => result.current.onTextRemove())

    expect(onLastRemoved).toHaveBeenCalledTimes(1)
    expect(result.current.textChip).toBeNull()
  })

  test('removing the last chip while the text badge remains does NOT fire — removing the badge after does', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())
    await act(async () => result.current.onChipCommit(CHIP))

    await act(async () => result.current.onChipRemove(CHIP.key))
    expect(onLastRemoved).not.toHaveBeenCalled() // badge still in the bar

    await act(async () => result.current.onTextRemove())
    expect(onLastRemoved).toHaveBeenCalledTimes(1)
  })

  test('removing the text badge while chips remain does NOT fire', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onChange('geon'))
    await act(async () => result.current.onTextCommit())
    await act(async () => result.current.onTextRemove())

    expect(onLastRemoved).not.toHaveBeenCalled()
    expect(result.current.chips).toEqual([CHIP])
  })

  test('batched remove-each (Filters "Clear all" path) fires exactly once, on the emptying call', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onChipCommit(CHIP_B))
    // Same-event batch — mirrors ShipmentsFiltersView's chips.forEach(onChipRemove).
    await act(async () => {
      [CHIP, CHIP_B].forEach((c) => result.current.onChipRemove(c.key))
    })

    expect(onLastRemoved).toHaveBeenCalledTimes(1)
    expect(result.current.chips).toEqual([])
  })

  test('the bar keeps working after a last-removal clear (mirrors stay in sync)', async () => {
    const adapter = makeAdapter()
    const onLastRemoved = vi.fn()
    const { result } = renderHook(() => useGlobalSearch(adapter, { onLastRemoved }))

    await act(async () => result.current.onChipCommit(CHIP))
    await act(async () => result.current.onChipRemove(CHIP.key))
    expect(onLastRemoved).toHaveBeenCalledTimes(1)

    await act(async () => result.current.onChipCommit(CHIP_B))
    expect(result.current.chips).toEqual([CHIP_B])
    await act(async () => result.current.onChipRemove(CHIP_B.key))
    expect(onLastRemoved).toHaveBeenCalledTimes(2)
  })
})

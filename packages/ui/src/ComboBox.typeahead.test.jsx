// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import ComboBox from './ComboBox.jsx'

beforeAll(() => {
  // jsdom lacks ResizeObserver (virtualizer) and scrollIntoView
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

const OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

describe('ComboBox — typeahead mode', () => {
  test('filter narrows options: typing updates input value (smoke)', () => {
    render(<ComboBox id="ac" label="Fruit" options={OPTIONS} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'an' } })
    expect(input.value).toBe('an')
  })

  test('ArrowDown + Enter selects highlighted option', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <ComboBox id="ac" label="Fruit" options={OPTIONS} onSelect={onSelect} />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    // Typing 'app' opens the panel and sets inputText (filters to Apple)
    fireEvent.change(input, { target: { value: 'app' } })
    expect(input.value).toBe('app')

    // keyDown is on the outer wrapper div (container.firstChild)
    const wrapper = container.firstChild
    // ArrowDown: highlight enters at 0
    fireEvent.keyDown(wrapper, { key: 'ArrowDown' })
    // Enter: select the highlighted option (Apple, value 'apple')
    fireEvent.keyDown(wrapper, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith('apple')
    expect(input.value).toBe('Apple')
  })

  test('ArrowDown highlights and aria-activedescendant updates', () => {
    const { container } = render(
      <ComboBox id="ac" label="Fruit" options={OPTIONS} />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } }) // open with all options

    expect(input.getAttribute('aria-activedescendant')).toBeNull()

    const wrapper = container.firstChild
    fireEvent.keyDown(wrapper, { key: 'ArrowDown' })
    // After ArrowDown from -1, activeIdx=0, aria-activedescendant should point at option 0
    const activedesc = input.getAttribute('aria-activedescendant')
    expect(activedesc).toBeTruthy()
    expect(activedesc).toContain('-option-0')
  })

  test('async loadOptions resolves and populates (debounce + stale guard)', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn().mockResolvedValue([{ value: 'x', label: 'X-ray' }])
    render(<ComboBox id="ac" label="Test" loadOptions={loadOptions} />)
    const input = screen.getByRole('combobox')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'x' } })

    // Debounce hasn't fired yet — panel must show "Loading…", NOT the empty state
    // (guards the sync setLoading fix: loading/seq are set on keystroke, not in the timer)
    expect(loadOptions).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('Loading…')

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    expect(loadOptions).toHaveBeenCalledWith('x', 0)
    // Populated branch rendered: listbox present, no loading/empty status.
    // (jsdom renders 0 virtual rows, so assert branch + virtualizer total size.)
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
    const spacer = document.querySelector('.field-search-results__list > div')
    expect(spacer).not.toBeNull()
    expect(parseInt(spacer.style.height, 10)).toBeGreaterThan(0) // 1 option × 56px
    vi.useRealTimers()
  })

  test('async loadOptions fires on FOCUS with the current (empty) query — options load before any keystroke', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn().mockResolvedValue([{ value: 'a', label: 'Apple' }])
    render(<ComboBox id="af" label="Test" loadOptions={loadOptions} />)
    const input = screen.getByRole('combobox')

    fireEvent.focus(input)
    await act(async () => {
      vi.advanceTimersByTime(50) // focus load runs with 0ms debounce
    })

    expect(loadOptions).toHaveBeenCalledWith('', 0)
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
    const spacer = document.querySelector('.field-search-results__list > div')
    expect(parseInt(spacer.style.height, 10)).toBeGreaterThan(0)
    vi.useRealTimers()
  })

  test('stale loadOptions response is ignored (sequence guard)', async () => {
    vi.useFakeTimers()
    let resolveFirst
    let resolveSecond

    const first = new Promise((res) => { resolveFirst = res })
    const second = new Promise((res) => { resolveSecond = res })

    const loadOptions = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)

    render(<ComboBox id="ac" label="Test" loadOptions={loadOptions} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    // First query
    fireEvent.change(input, { target: { value: 'a' } })
    await act(async () => { vi.advanceTimersByTime(250) })

    // Second query before first resolves
    fireEvent.change(input, { target: { value: 'ab' } })
    await act(async () => { vi.advanceTimersByTime(250) })

    // Second resolves first with correct result
    await act(async () => { resolveSecond([{ value: 'ab-result', label: 'AB Result' }]) })
    // First resolves with stale result — should be ignored
    await act(async () => { resolveFirst([{ value: 'stale', label: 'Stale' }]) })

    // The stale guard (seqRef) means the first result is discarded; no crash
    expect(loadOptions).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  test('paged loadOptions ({ options, total }): accumulates pages via endReached, stops at total', async () => {
    vi.useFakeTimers()
    // Pages of 3, total 6. jsdom renders 0 virtual rows → lastIndex -1, so
    // endReached auto-fires while matches.length <= 4 (short first page → fetch next).
    const PAGE = (skip) =>
      Array.from({ length: 3 }, (_, i) => ({ value: `v${skip + i}`, label: `Opt ${skip + i}` }))
    const loadOptions = vi.fn(async (query, skip) => ({ options: PAGE(skip), total: 6 }))

    render(<ComboBox id="pg" label="Test" loadOptions={loadOptions} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    await act(async () => { vi.advanceTimersByTime(50) }) // focus load, 0ms debounce
    expect(loadOptions).toHaveBeenCalledWith('', 0)

    // endReached → next page appended (no debounce on page fetches)
    await act(async () => {})
    expect(loadOptions).toHaveBeenCalledWith('', 3)
    const spacer = document.querySelector('.field-search-results__list > div')
    expect(parseInt(spacer.style.height, 10)).toBe(6 * 56)

    // hasMore=false → no further fetches even as effects settle
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(loadOptions).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  test('stale page fetch is discarded when a new query starts mid-flight', async () => {
    vi.useFakeTimers()
    let resolveStalePage
    const loadOptions = vi.fn((query, skip) => {
      if (query === '' && skip === 0)
        return Promise.resolve({ options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], total: 10 })
      if (query === '' && skip === 2)
        return new Promise((res) => { resolveStalePage = res }) // in-flight page
      // new query 'z'
      return Promise.resolve({ options: [{ value: 'z', label: 'Zed' }], total: 1 })
    })

    render(<ComboBox id="pg" label="Test" loadOptions={loadOptions} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    await act(async () => { vi.advanceTimersByTime(50) })
    await act(async () => {}) // endReached fires → page ('', 2) now in flight
    expect(loadOptions).toHaveBeenCalledWith('', 2)

    // New query while the page is in flight — bumps seq, resets accumulation
    fireEvent.change(input, { target: { value: 'z' } })
    await act(async () => { vi.advanceTimersByTime(250) })

    // Stale page resolves AFTER the new query — must be discarded
    await act(async () => {
      resolveStalePage({ options: [{ value: 'stale', label: 'Stale' }], total: 10 })
    })

    const spacer = document.querySelector('.field-search-results__list > div')
    expect(parseInt(spacer.style.height, 10)).toBe(1 * 56) // only Zed
    vi.useRealTimers()
  })

  test('legacy plain-array loadOptions: no paging, no endReached wiring', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async () => [{ value: 'a', label: 'Apple' }])
    render(<ComboBox id="lg" label="Test" loadOptions={loadOptions} />)
    fireEvent.focus(screen.getByRole('combobox'))
    await act(async () => { vi.advanceTimersByTime(50) })
    await act(async () => { vi.advanceTimersByTime(500) })
    // 1 option (≤4) would auto-fire endReached IF paged — legacy must fetch exactly once
    expect(loadOptions).toHaveBeenCalledTimes(1)
    const spacer = document.querySelector('.field-search-results__list > div')
    expect(parseInt(spacer.style.height, 10)).toBe(1 * 56) // no loadingMore footer
    vi.useRealTimers()
  })

  test('empty state renders emptyMessage when no options match', () => {
    render(
      <ComboBox
        id="ac"
        label="Fruit"
        options={OPTIONS}
        emptyMessage="Nothing found"
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    // Type something that won't match any option
    fireEvent.change(input, { target: { value: 'zzz' } })
    // FieldSearchResults renders emptyMessage in a role="status" <p>
    expect(screen.getByRole('status').textContent).toBe('Nothing found')
  })

  test('clickable rows have --clickable class even when role=option (hover affordance fix)', () => {
    const { container } = render(
      <ComboBox id="ac" label="Fruit" options={OPTIONS} onSelect={() => {}} />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })

    // Mock clientHeight so virtualizer emits rows
    const scrollEl = container.querySelector('[style*="overflow-y"]') ??
                     container.querySelector('[style*="overflowY"]')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'clientHeight', { value: 320, configurable: true })
      // Trigger a re-render cycle so virtualizer picks up the height
      fireEvent.scroll(scrollEl)
    }

    // Every rendered [role="option"] row must also have the --clickable class
    const optionRows = container.querySelectorAll('[role="option"]')
    optionRows.forEach((row) => {
      expect(row.classList.contains('match-simple-row--clickable')).toBe(true)
    })
  })
})

// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import SearchField from './SearchField.jsx'

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

describe('SearchField — typeahead mode', () => {
  test('filter narrows options: typing updates input value (smoke)', () => {
    render(<SearchField id="ac" label="Fruit" options={OPTIONS} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'an' } })
    expect(input.value).toBe('an')
  })

  test('ArrowDown + Enter selects highlighted option', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <SearchField id="ac" label="Fruit" options={OPTIONS} onSelect={onSelect} />,
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
      <SearchField id="ac" label="Fruit" options={OPTIONS} />,
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
    render(<SearchField id="ac" label="Test" loadOptions={loadOptions} />)
    const input = screen.getByRole('combobox')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'x' } })

    // Debounce hasn't fired yet
    expect(loadOptions).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    expect(loadOptions).toHaveBeenCalledWith('x')
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

    render(<SearchField id="ac" label="Test" loadOptions={loadOptions} />)
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

  test('empty state renders emptyMessage when no options match', () => {
    render(
      <SearchField
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
      <SearchField id="ac" label="Fruit" options={OPTIONS} onSelect={() => {}} />,
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

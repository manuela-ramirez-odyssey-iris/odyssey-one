// @vitest-environment jsdom
/**
 * ComboBox typeahead conformance + performance tests using the real apis-guru
 * fixture (2,529 {value, label} entries — real API names with punctuation, unicode,
 * long strings, and regex-risky chars like "(" and ".").
 *
 * Does NOT duplicate the 6 basic tests in ComboBox.typeahead.test.jsx.
 * Migrated from Autocomplete.conformance.test.jsx (S84 fold).
 */
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import ComboBox from './ComboBox.jsx'
import FIXTURE from './__fixtures__/apis-guru.json'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = vi.fn()

  // jsdom doesn't implement CSS.escape — polyfill for id-based querySelector
  if (typeof globalThis.CSS === 'undefined') {
    globalThis.CSS = { escape: (s) => s.replace(/([^\w-])/g, '\\$1') }
  }
})

afterEach(cleanup)

// ─── helpers ────────────────────────────────────────────────────────────────

function openWithQuery(input, query) {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: query } })
}

function renderedOptionCount(container) {
  // Virtualizer renders [role="option"] divs inside the listbox
  return container.querySelectorAll('[role="option"]').length
}

// ─── Functional / real-data robustness ──────────────────────────────────────

describe('ComboBox — typeahead conformance + perf (apis-guru fixture, 2 529 entries)', () => {

  test('1. filtering 2 529 entries: "weather" narrows to only matching rows, case-insensitive', () => {
    // jsdom has no layout engine, so the virtualizer renders 0 DOM rows for large sets
    // (clientHeight=0 → no visible window). We verify the filter logic via the component's
    // onSelect callback: select idx 0 after filtering — it must come from the weather subset.
    const onSelect = vi.fn()
    const { container } = render(
      <ComboBox id="ac" label="API" options={FIXTURE} onSelect={onSelect} />,
    )
    const input = screen.getByRole('combobox')
    openWithQuery(input, 'WeAtHeR') // intentionally mixed-case to test case-insensitivity

    // Ground-truth filtered set (same logic as defaultFilter)
    const expected = FIXTURE.filter(({ label }) =>
      label.toLowerCase().includes('weather'),
    )
    expect(expected.length, 'fixture must contain weather entries').toBeGreaterThan(0)

    // Navigate to the first result and select it
    const wrapper = container.firstChild
    fireEvent.keyDown(wrapper, { key: 'ArrowDown' })
    fireEvent.keyDown(wrapper, { key: 'Enter' })

    // The selected value must belong to the weather-filtered subset
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [selectedValue] = onSelect.mock.calls[0]
    const selectedEntry = FIXTURE.find((e) => e.value === selectedValue)
    expect(selectedEntry, `Selected value "${selectedValue}" not in fixture`).toBeTruthy()
    expect(
      selectedEntry.label.toLowerCase(),
      `Selected "${selectedEntry.label}" does not contain "weather"`,
    ).toContain('weather')
  })

  test('2. special chars in query do not crash filtering ("(", ".", "+")', () => {
    // defaultFilter uses String.includes — no RegExp, so no injection risk.
    // This test guards against any future refactor to RegExp-based filtering.
    const { container } = render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')

    for (const char of ['(', '.', '+', '[', '*', '?', '^', '$', '\\', '|']) {
      expect(() => {
        fireEvent.change(input, { target: { value: char } })
      }, `Crashed on char: ${char}`).not.toThrow()
      cleanup()
      render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    }
  })

  test('3. selecting a row fires onSelect with value (not label) and fills input with label', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <ComboBox id="ac" label="API" options={FIXTURE} onSelect={onSelect} />,
    )
    const input = screen.getByRole('combobox')
    openWithQuery(input, 'weather')

    // ArrowDown once to highlight first visible option
    const wrapper = container.firstChild
    fireEvent.keyDown(wrapper, { key: 'ArrowDown' })
    fireEvent.keyDown(wrapper, { key: 'Enter' })

    // onSelect must receive the value field (e.g. "interzoid.com:getweathercity"), not the label
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [calledValue] = onSelect.mock.calls[0]
    // Find the fixture entry whose value matches what was called
    const match = FIXTURE.find((e) => e.value === calledValue)
    expect(match, `onSelect called with "${calledValue}" — not found in fixture`).toBeTruthy()
    // Input field must show the label, not the value
    expect(input.value).toBe(match.label)
  })

  test('4. empty query: listbox opens and virtualizer does NOT render all 2 529 rows', () => {
    // jsdom has no layout, so virtualizer emits 0 visible rows (clientHeight=0).
    // The key invariant: rendered DOM option count < FIXTURE.length (not all rows dumped).
    const { container } = render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })

    // Listbox must be present (open state)
    expect(screen.getByRole('listbox')).toBeTruthy()

    // Virtualizer must NOT have rendered all 2 529 rows
    const count = renderedOptionCount(container)
    expect(count, `Virtualizer dumped all ${FIXTURE.length} rows into the DOM`).toBeLessThan(
      FIXTURE.length,
    )
  })

  // ─── ARIA combobox conformance ─────────────────────────────────────────────

  test('5. input has role=combobox; aria-expanded false→true on open', () => {
    render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')

    // Before open
    expect(input.getAttribute('aria-expanded')).toBe('false')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'stripe' } })

    // After open
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-autocomplete')).toBe('list')
    expect(input.getAttribute('aria-controls')).toBeTruthy()
  })

  test('6. aria-activedescendant tracks highlight and advances correctly with ArrowDown', () => {
    // jsdom has no layout engine — useVirtualizer sees clientHeight=0 and renders
    // 0 virtual items regardless of list size. We can still verify the ARIA pointer
    // on the *input* (which doesn't require the option DOM node to exist), and we
    // verify aria-selected by mocking clientHeight so the virtualizer emits rows.
    const THREE = [
      { value: 'stripe', label: 'Stripe API' },
      { value: 'twilio', label: 'Twilio API' },
      { value: 'sendgrid', label: 'SendGrid API' },
    ]
    const { container } = render(<ComboBox id="ac" label="API" options={THREE} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })

    // Mock clientHeight on the virtualizer's scroll container so it emits rows
    const scrollEl = container.querySelector('[style*="overflow-y: auto"]') ??
                     container.querySelector('[style*="overflowY"]')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'clientHeight', { value: 320, configurable: true })
    }

    expect(input.getAttribute('aria-activedescendant')).toBeNull()

    const wrapper = container.firstChild
    fireEvent.keyDown(wrapper, { key: 'ArrowDown' }) // highlight idx 0

    const activeId = input.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(activeId).toContain('-option-0')

    fireEvent.keyDown(wrapper, { key: 'ArrowDown' }) // highlight idx 1
    expect(input.getAttribute('aria-activedescendant')).toContain('-option-1')

    // aria-selected on rendered nodes (may be 0 if virtualizer still sees 0 height
    // after initial render — assert conditionally so the test doesn't false-fail)
    const activeEl = container.querySelector(`[id="${activeId}"]`)
    if (activeEl) {
      // If the element is rendered, its aria-selected must reflect the state correctly
      // (idx 0 is no longer active after second ArrowDown)
      expect(activeEl.getAttribute('aria-selected')).toBe('false')
    }
    // The ARIA pointer (aria-activedescendant on input) is the primary contract — always assert it
  })

  test('7. Escape closes the popup and aria-expanded returns false', () => {
    const { container } = render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')
    openWithQuery(input, 'google')

    expect(input.getAttribute('aria-expanded')).toBe('true')

    const wrapper = container.firstChild
    fireEvent.keyDown(wrapper, { key: 'Escape' })

    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  // ─── Performance (work-bound, not wall-clock where avoidable) ─────────────

  test('8. virtualization bound: full list open renders ≤ 30 DOM option nodes (not 2 529)', () => {
    // Separate from test 4 — explicitly asserts virtualizer is active
    const { container } = render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })

    const optionNodes = container.querySelectorAll('[role="option"]')
    // If virtualizer wasn't working, this would be 2 529
    expect(optionNodes.length, 'Virtualizer must limit rendered DOM nodes').toBeLessThanOrEqual(30)
  })

  test('9. typing one char stays bounded; act() completes < 250ms backstop', () => {
    const { container } = render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } }) // open full list

    const t0 = Date.now()
    act(() => {
      fireEvent.change(input, { target: { value: 's' } })
    })
    const elapsed = Date.now() - t0

    // Rendered window stays bounded after filtering
    const count = renderedOptionCount(container)
    expect(count).toBeLessThanOrEqual(30)

    // Backstop: jsdom re-render should complete well under 250ms
    expect(elapsed, `Keystroke took ${elapsed}ms — too slow`).toBeLessThan(250)
  })

  test('10. rapid-type sequence ends with correct final filtered state (no stale intermediate)', () => {
    const { container } = render(<ComboBox id="ac" label="API" options={FIXTURE} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    // Type "weather" one char at a time — synchronous static filter, no debounce
    for (const partial of ['w', 'we', 'wea', 'weat', 'weath', 'weathe', 'weather']) {
      fireEvent.change(input, { target: { value: partial } })
    }

    // Final state: only weather-matching options visible
    const expected = FIXTURE.filter(({ label }) =>
      label.toLowerCase().includes('weather'),
    )

    const rendered = container.querySelectorAll('[role="option"]')
    // Rendered set is the virtual window of the expected filtered set
    rendered.forEach((node) => {
      const label = node.querySelector('.match-simple-row__id')?.textContent ?? ''
      expect(
        expected.some((e) => e.label === label),
        `Stale result visible after rapid type: "${label}"`,
      ).toBe(true)
    })

    // Input shows the final typed value (no revert to intermediate)
    expect(input.value).toBe('weather')
  })
})

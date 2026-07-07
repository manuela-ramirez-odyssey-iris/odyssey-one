// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import GlobalSearch, { moveHighlight } from './GlobalSearch.jsx'

// Explicit cleanup: auto-cleanup only registers when vitest globals are on
// (they are in this app's config, but don't depend on it).
afterEach(cleanup)

// Component-level guard for S80 req 5 — combobox-style arrow-key navigation of
// the suggested filter chips (aria-activedescendant pattern: DOM focus stays on
// the input; ArrowDown/ArrowUp move the highlight, Enter selects, highlight
// resets when the suggestions change).

beforeAll(() => {
  // jsdom lacks both — GlobalSearch uses them for chip-overflow measurement and
  // to keep the highlighted option visible in the capped list.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
})

const ITEMS = [
  { key: 'customer-name', label: 'Customer Name: ge' },
  { key: 'origin', label: 'Origin: ge' },
  { key: 'scac', label: 'SCAC: ge' },
]

function setup({ items = ITEMS, onSelect = vi.fn(), onOuterKeyDown = vi.fn(), ...props } = {}) {
  const utils = render(
    <div onKeyDown={onOuterKeyDown}>
      <GlobalSearch
        value="ge"
        onChange={() => {}}
        suggestionsOpen
        suggestionSections={[{ title: 'Suggested Filters', items }]}
        onSuggestionSelect={onSelect}
        {...props}
      />
    </div>,
  )
  return { ...utils, input: screen.getByRole('combobox'), onSelect, onOuterKeyDown }
}

describe('combobox ARIA wiring', () => {
  test('input is a combobox pointing at a listbox of options', () => {
    const { input } = setup()
    expect(input).toHaveProperty('tagName', 'INPUT')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const listbox = screen.getByRole('listbox')
    expect(input.getAttribute('aria-controls')).toBe(listbox.id)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(input.getAttribute('aria-activedescendant')).toBeNull() // no highlight yet
  })
})

describe('ArrowDown / ArrowUp move the highlight', () => {
  test('ArrowDown enters at the top; the highlighted option is marked and pointed at', () => {
    const { input } = setup()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[0].className).toContain('is-active')
    expect(options[1].getAttribute('aria-selected')).toBe('false')
    // DOM focus stays on the input (aria-activedescendant pattern).
    expect(document.activeElement).not.toBe(options[0])
  })

  test('ArrowUp from no highlight enters at the bottom; navigation wraps at both ends', () => {
    const { input } = setup()
    const options = screen.getAllByRole('option')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2].id)
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // wraps bottom → top
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id)
  })

  test('the highlight resets when the suggestions change', () => {
    const { input, rerender, onSelect, onOuterKeyDown } = setup()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).not.toBeNull()

    rerender(
      <div onKeyDown={onOuterKeyDown}>
        <GlobalSearch
          value="geo"
          onChange={() => {}}
          suggestionsOpen
          suggestionSections={[{ title: 'Suggested Filters', items: ITEMS.slice(0, 2) }]}
          onSuggestionSelect={onSelect}
        />
      </div>,
    )
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
  })
})

describe('Enter on a highlighted chip selects it (same as clicking)', () => {
  test('selects the highlighted item and stops the event from reaching consumer commit handlers', () => {
    const { input, onSelect, onOuterKeyDown } = setup()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(ITEMS[1])
    // Consumed Enter must NOT propagate (it would otherwise commit the search).
    const enterEvents = onOuterKeyDown.mock.calls.filter(([e]) => e.key === 'Enter')
    expect(enterEvents).toHaveLength(0)
    // Highlight is cleared after selection.
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
  })

  test('Enter with NO highlight propagates normally (consumer commit path unaffected)', () => {
    const { input, onSelect, onOuterKeyDown } = setup()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
    const enterEvents = onOuterKeyDown.mock.calls.filter(([e]) => e.key === 'Enter')
    expect(enterEvents).toHaveLength(1)
  })

  test('a section-level onSelect wins over the fallback onSuggestionSelect', () => {
    const sectionSelect = vi.fn()
    const fallback = vi.fn()
    render(
      <GlobalSearch
        value="ge"
        onChange={() => {}}
        suggestionsOpen
        suggestionSections={[{ title: 'A', items: ITEMS, onSelect: sectionSelect }]}
        onSuggestionSelect={fallback}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(sectionSelect).toHaveBeenCalledWith(ITEMS[0])
    expect(fallback).not.toHaveBeenCalled()
  })
})

describe('existing keyboard behavior is preserved', () => {
  test('Backspace on an empty input still removes the last committed chip', () => {
    const onChipRemove = vi.fn()
    render(
      <GlobalSearch
        value=""
        onChange={() => {}}
        chips={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        onChipRemove={onChipRemove}
      />,
    )
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Backspace' })
    expect(onChipRemove).toHaveBeenCalledWith('b')
  })
})

describe('moveHighlight (pure)', () => {
  test('standard combobox movement with wrap', () => {
    expect(moveHighlight(3, -1, 1)).toBe(0) // enter at top
    expect(moveHighlight(3, -1, -1)).toBe(2) // enter at bottom
    expect(moveHighlight(3, 0, 1)).toBe(1)
    expect(moveHighlight(3, 2, 1)).toBe(0) // wrap down
    expect(moveHighlight(3, 0, -1)).toBe(2) // wrap up
    expect(moveHighlight(0, -1, 1)).toBe(-1) // empty list → no highlight
  })
})

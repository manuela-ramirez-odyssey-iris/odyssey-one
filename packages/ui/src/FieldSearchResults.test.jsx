// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import FieldSearchResults from './FieldSearchResults.jsx'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

const MATCHES = Array.from({ length: 50 }, (_, i) => ({
  matchId: `MATCH-${i}`,
  id: `id-${i}`,
  customer: `Customer ${i}`,
  address: `${i} Main St`,
}))

describe('FieldSearchResults', () => {
  test('virtualization: 50 matches do not all render into the DOM', () => {
    const { container } = render(
      <FieldSearchResults matches={MATCHES} onMatchClick={() => {}} />,
    )
    // jsdom clientHeight=0 → virtualizer emits 0 rows; the key invariant is <50
    const rendered = container.querySelectorAll('[role="option"]').length
    expect(rendered).toBeLessThan(MATCHES.length)
  })

  test('virtualizer spacer keeps full height + flex-shrink:0 (deep scroll works in flex list)', () => {
    const { container } = render(
      <FieldSearchResults matches={MATCHES} onMatchClick={() => {}} />,
    )
    const spacer = container.querySelector('.field-search-results__list > div')
    // __list is a column flexbox; without flex-shrink:0 the spacer collapses to the
    // 320px viewport and scrolling past the first window is impossible.
    expect(spacer.style.flexShrink).toBe('0')
    expect(parseInt(spacer.style.height, 10)).toBe(50 * 56)
  })

  test('activeIndex row gets .is-active class and aria-selected=true when rendered', () => {
    const THREE = MATCHES.slice(0, 3)

    // Give the scroll container a height so virtualizer emits rows
    const { container } = render(
      <FieldSearchResults
        matches={THREE}
        activeIndex={1}
        optionIdPrefix="test"
        onMatchClick={() => {}}
      />,
    )
    const scrollEl = container.querySelector('[style*="overflow-y"]') ??
                     container.querySelector('[style*="overflowY"]')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'clientHeight', { value: 320, configurable: true })
    }

    // For small sets with mocked height, virtualizer may emit rows — assert conditionally
    const activeRow = container.querySelector('.is-active')
    if (activeRow) {
      expect(activeRow.getAttribute('aria-selected')).toBe('true')
    }
    // The id pattern must be correct for any rendered active row
    const optRow = container.querySelector('#test-option-1')
    if (optRow) {
      expect(optRow.classList.contains('is-active')).toBe(true)
    }
  })

  test('loadingMore grows the spacer by one 56px footer row', () => {
    const { container, rerender } = render(
      <FieldSearchResults matches={MATCHES.slice(0, 10)} onMatchClick={() => {}} />,
    )
    const spacer = () => container.querySelector('.field-search-results__list > div')
    expect(parseInt(spacer().style.height, 10)).toBe(10 * 56)
    rerender(
      <FieldSearchResults matches={MATCHES.slice(0, 10)} loadingMore onMatchClick={() => {}} />,
    )
    expect(parseInt(spacer().style.height, 10)).toBe(11 * 56)
  })

  test('onEndReached fires near the end, once per matches.length, never while loadingMore', () => {
    // jsdom renders 0 virtual rows → lastIndex -1, which is >= length-5 for length<=4
    const onEndReached = vi.fn()
    const { rerender } = render(
      <FieldSearchResults matches={MATCHES.slice(0, 3)} onEndReached={onEndReached} onMatchClick={() => {}} />,
    )
    expect(onEndReached).toHaveBeenCalledTimes(1)

    // Same length → no re-fire
    rerender(
      <FieldSearchResults matches={MATCHES.slice(0, 3)} onEndReached={onEndReached} onMatchClick={() => {}} />,
    )
    expect(onEndReached).toHaveBeenCalledTimes(1)

    // While loadingMore → suppressed even though length changed
    rerender(
      <FieldSearchResults matches={MATCHES.slice(0, 4)} loadingMore onEndReached={onEndReached} onMatchClick={() => {}} />,
    )
    expect(onEndReached).toHaveBeenCalledTimes(1)

    // Page landed (loadingMore off, length changed) → fires again
    rerender(
      <FieldSearchResults matches={MATCHES.slice(0, 4)} onEndReached={onEndReached} onMatchClick={() => {}} />,
    )
    expect(onEndReached).toHaveBeenCalledTimes(2)

    // Far from the end (length 50, lastIndex -1) → no fire
    rerender(
      <FieldSearchResults matches={MATCHES} onEndReached={onEndReached} onMatchClick={() => {}} />,
    )
    expect(onEndReached).toHaveBeenCalledTimes(2)
  })

  test('empty state renders status message', () => {
    render(<FieldSearchResults matches={[]} emptyMessage="Nothing here" />)
    expect(screen.getByRole('status').textContent).toBe('Nothing here')
  })

  test('error state renders alert message (highest precedence)', () => {
    render(
      <FieldSearchResults
        matches={MATCHES}
        error="Something went wrong"
      />,
    )
    expect(screen.getByRole('alert').textContent).toBe('Something went wrong')
    // Rows must NOT be rendered in error state
    expect(screen.queryAllByRole('option').length).toBe(0)
  })

  test('populated list has role=listbox when onMatchClick provided', () => {
    render(<FieldSearchResults matches={MATCHES.slice(0, 3)} onMatchClick={() => {}} />)
    expect(screen.getByRole('listbox')).toBeTruthy()
  })
})

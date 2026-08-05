// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import GlobalSearch from './GlobalSearch.jsx'

afterEach(cleanup)

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
})

// The copy button copies the APPLIED query (bar text + committed chips). It is
// a general bar affordance, deliberately not a per-row action. Figma
// `Copy Search Icon` on set `658:18`, before `Clear Search Icon`.

describe('GlobalSearch copy button', () => {
  test('absent when the consumer does not wire onCopy (no dead control)', () => {
    render(<GlobalSearch value="ge" onChange={() => {}} />)
    expect(screen.queryByLabelText('Copy search')).toBeNull()
  })

  test('renders before the clear button when onCopy is wired', () => {
    const { container } = render(
      <GlobalSearch value="ge" onChange={() => {}} onCopy={() => {}} />,
    )
    const copy = container.querySelector('.global-search-copy')
    const clear = container.querySelector('.global-search-clear')
    expect(copy).toBeTruthy()
    // DOCUMENT_POSITION_FOLLOWING = clear comes after copy
    expect(copy.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('disabled with nothing to copy — empty value and no chips', () => {
    render(<GlobalSearch value="" onChange={() => {}} onCopy={() => {}} />)
    expect(screen.getByLabelText('Copy search').disabled).toBe(true)
  })

  test('enabled on committed chips alone, with no typed text', () => {
    render(
      <GlobalSearch
        value=""
        onChange={() => {}}
        onCopy={() => {}}
        chips={[{ key: 'scac', label: 'SCAC: ODFL' }]}
      />,
    )
    expect(screen.getByLabelText('Copy search').disabled).toBe(false)
  })

  test('clicking fires onCopy and swaps to a Copied confirmation that expires', () => {
    vi.useFakeTimers()
    const onCopy = vi.fn()
    render(<GlobalSearch value="ge" onChange={() => {}} onCopy={onCopy} />)

    fireEvent.click(screen.getByLabelText('Copy search'))
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Copied')).toBeTruthy()

    act(() => { vi.advanceTimersByTime(1500) })
    expect(screen.getByLabelText('Copy search')).toBeTruthy()
    vi.useRealTimers()
  })
})

// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Countdown, { countdownTone } from './Countdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Countdown', () => {
  test('renders MM:SS remaining', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)
    expect(screen.getByText('20:00')).toBeTruthy()
  })

  // `.countdown--urgent` (red) means expired OR inside the last 10% of the
  // window; with no window known the fallback edge is 10 minutes.
  test('ticks down each second and stays blue while above the 10-minute fallback edge', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)

    act(() => vi.advanceTimersByTime(9 * 60000))
    expect(screen.getByText('11:00')).toBeTruthy()
    expect(screen.getByText('11:00').closest('.countdown--urgent')).toBeFalsy()
  })

  test('turns red once under the 10-minute fallback edge while still live', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)
    act(() => vi.advanceTimersByTime(11 * 60000))
    expect(screen.getByText('09:00').closest('.countdown--urgent')).toBeTruthy()
  })

  test('goes red (countdown--urgent) only once expired', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 5000} zeroWhenExpired />)
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('00:00')).toBeTruthy()
    expect(screen.getByText('00:00').closest('.countdown--urgent')).toBeTruthy()
  })

  test('over an hour remaining renders MM:SS without wrapping (e.g. 90:00)', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 90 * 60000} />)
    expect(screen.getByText('90:00')).toBeTruthy()
  })

  test('renders Closed and fires onExpire exactly once at/after closeAt; stops ticking', () => {
    const now = Date.now()
    const onExpire = vi.fn()
    render(<Countdown closeAt={now + 5000} onExpire={onExpire} />)

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('Closed')).toBeTruthy()
    expect(onExpire).toHaveBeenCalledTimes(1)

    // Further tick advances must not re-fire onExpire or throw from a cleared interval.
    act(() => vi.advanceTimersByTime(5000))
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Closed')).toBeTruthy()
  })

  test('clears the interval on unmount', () => {
    const now = Date.now()
    const clearSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = render(<Countdown closeAt={now + 20 * 60000} />)
    unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  test('mounting already-expired does not throw and fires onExpire once', () => {
    const onExpire = vi.fn()
    expect(() => {
      render(<Countdown closeAt={Date.now() - 60000} onExpire={onExpire} />)
    }).not.toThrow()
    expect(screen.getByText('Closed')).toBeTruthy()
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  test('a new inline onExpire identity on re-render after expiry does not re-fire it', () => {
    const now = Date.now()
    const onExpire = vi.fn()
    const { rerender } = render(<Countdown closeAt={now + 5000} onExpire={onExpire} />)

    act(() => vi.advanceTimersByTime(5000))
    expect(onExpire).toHaveBeenCalledTimes(1)

    rerender(<Countdown closeAt={now + 5000} onExpire={() => onExpire()} />)
    rerender(<Countdown closeAt={now + 5000} onExpire={() => onExpire()} />)
    rerender(<Countdown closeAt={now + 5000} onExpire={() => onExpire()} />)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})

// SpotBid countdown colour (designer, 2026-09-07): two tones. Blue while more
// than 10% of the bidding window remains; red at or under 10% and once
// expired. Amber dropped. One rule for every countdown surface.
describe('countdownTone', () => {
  const WINDOW = 60 * 60000 // 1h

  test('blue above 10% of the window, red at and under it', () => {
    expect(countdownTone(WINDOW, WINDOW)).toBe('blue')          // 100%
    expect(countdownTone(WINDOW * 0.5, WINDOW)).toBe('blue')    // 50%
    expect(countdownTone(WINDOW * 0.11, WINDOW)).toBe('blue')   // just above the 10% edge
    expect(countdownTone(WINDOW * 0.10, WINDOW)).toBe('red')    // exactly at 10%
    expect(countdownTone(WINDOW * 0.01, WINDOW)).toBe('red')    // near zero
  })

  test('expired is red regardless of window', () => {
    expect(countdownTone(0, WINDOW)).toBe('red')    // exactly 0%
    expect(countdownTone(-5000, WINDOW)).toBe('red')
    expect(countdownTone(0, 0)).toBe('red')
  })

  // Without a window there is no percentage — the fallback keeps a
  // time-based split, but red stays reserved for actual expiry.
  test('falls back to absolute bands when no window is known', () => {
    expect(countdownTone(45 * 60000, 0)).toBe('blue')
    expect(countdownTone(11 * 60000, 0)).toBe('blue')   // just above the 10-min edge
    expect(countdownTone(10 * 60000, 0)).toBe('red')    // exactly at the 10-min edge
    expect(countdownTone(5 * 60000, 0)).toBe('red')
    expect(countdownTone(0, 0)).toBe('red')
  })
})

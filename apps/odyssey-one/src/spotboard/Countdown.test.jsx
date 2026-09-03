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

  // `.countdown--urgent` is red-only now — red means expired/closed, never a
  // live countdown, so ticking down while still live must never turn it red.
  test('ticks down each second and stays non-red while live (countdown--urgent absent)', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)

    act(() => vi.advanceTimersByTime(11 * 60000))
    expect(screen.getByText('09:00')).toBeTruthy()
    expect(screen.getByText('09:00').closest('.countdown--urgent')).toBeFalsy()
  })

  test('not red above 10 minutes remaining', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)
    expect(screen.getByText('20:00').closest('.countdown--urgent')).toBeFalsy()
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

// SpotBid countdown color ramp (designer amendment, 2026-09-03): red is
// reserved EXCLUSIVELY for a closed/expired quote. Above 40% of the bidding
// window remaining is blue, (0%, 40%] is amber. One ramp for every countdown
// surface — strip badge, Live Bids sub-tab dot, award dialog header, and the
// carrier bid page's own H/M/S title.
describe('countdownTone', () => {
  const WINDOW = 60 * 60000 // 1h

  test('ramps blue → amber across the window, never red while live (100–40 / 40–0)', () => {
    expect(countdownTone(WINDOW, WINDOW)).toBe('blue')          // 100%
    expect(countdownTone(WINDOW * 0.5, WINDOW)).toBe('blue')    // 50%
    expect(countdownTone(WINDOW * 0.41, WINDOW)).toBe('blue')   // just above the 40% edge
    expect(countdownTone(WINDOW * 0.40, WINDOW)).toBe('amber')  // exactly at 40%
    expect(countdownTone(WINDOW * 0.39, WINDOW)).toBe('amber')  // just below 40%
    expect(countdownTone(WINDOW * 0.01, WINDOW)).toBe('amber')  // near zero, still live
  })

  test('expired is red regardless of window', () => {
    expect(countdownTone(0, WINDOW)).toBe('red')    // exactly 0%
    expect(countdownTone(-5000, WINDOW)).toBe('red')
    expect(countdownTone(0, 0)).toBe('red')
  })

  // Without a window there is no percentage — the fallback keeps a
  // time-based split, but red stays reserved for actual expiry.
  test('falls back to absolute bands when no window is known, red only at expiry', () => {
    expect(countdownTone(45 * 60000, 0)).toBe('blue')
    expect(countdownTone(11 * 60000, 0)).toBe('blue')   // just above the 10-min edge
    expect(countdownTone(10 * 60000, 0)).toBe('amber')  // exactly at the 10-min edge
    expect(countdownTone(5 * 60000, 0)).toBe('amber')
    expect(countdownTone(1000, 0)).toBe('amber')
    expect(countdownTone(0, 0)).toBe('red')
  })
})

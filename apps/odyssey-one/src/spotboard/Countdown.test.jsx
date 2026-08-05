// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Countdown from './Countdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Countdown', () => {
  test('renders MM:SS remaining', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)
    expect(screen.getByText('20:00')).toBeTruthy()
  })

  test('ticks down each second and adds countdown--urgent under 15 minutes', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)

    act(() => vi.advanceTimersByTime(6 * 60000))
    expect(screen.getByText('14:00')).toBeTruthy()
    expect(screen.getByText('14:00').closest('.countdown--urgent')).toBeTruthy()
  })

  test('not urgent above 15 minutes remaining', () => {
    const now = Date.now()
    render(<Countdown closeAt={now + 20 * 60000} />)
    expect(screen.getByText('20:00').closest('.countdown--urgent')).toBeFalsy()
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

// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { showToast } from './toast'
import ToastHost from '../components/layout/ToastHost'

afterEach(cleanup)

describe('toast store', () => {
  test('showToast displays the message via ToastHost, then auto-dismisses', () => {
    vi.useFakeTimers()
    render(<ToastHost />)
    expect(screen.queryByRole('status')).toBeNull()

    act(() => showToast('Saved.', { durationMs: 1000 }))
    expect(screen.getByText('Saved.')).toBeTruthy()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Saved.')).toBeNull()
    vi.useRealTimers()
  })
})

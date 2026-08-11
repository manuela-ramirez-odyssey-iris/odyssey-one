// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ErrorState from './ErrorState.jsx'

afterEach(cleanup)

describe('ErrorState', () => {
  test('renders the message and an alert role', () => {
    render(<ErrorState message="Couldn't load shipments." />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText("Couldn't load shipments.")).toBeTruthy()
  })

  test('omits the detail line when not provided', () => {
    render(<ErrorState message="Broke." />)
    expect(screen.queryByText(/upstream/i)).toBeFalsy()
  })

  test('renders the detail line when provided', () => {
    render(<ErrorState message="Broke." detail="upstream 503" />)
    expect(screen.getByText('upstream 503')).toBeTruthy()
  })

  test('omits the action when not provided', () => {
    render(<ErrorState message="Broke." />)
    expect(screen.queryByRole('button')).toBeFalsy()
  })

  test('renders the action and wires its handler', () => {
    const onRetry = vi.fn()
    render(
      <ErrorState
        message="Broke."
        action={<button type="button" onClick={onRetry}>Retry</button>}
      />,
    )
    const button = screen.getByRole('button', { name: 'Retry' })
    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

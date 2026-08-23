// @vitest-environment jsdom
//
// App wiring (Task 5, requirement 5): DevMode is the one-line addition
// App.jsx makes so the toggle cluster + overlay + detail modal render on
// every route. DevOverlay/DevDetailModal are mocked here so this stays a
// unit test of the WIRING (state flows from onInspect → DevDetailModal's
// name prop), not a re-test of either component's own behavior — that's
// DevOverlay.test.jsx / DevDetailModal.test.jsx's job.
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DevMode from './DevMode.jsx'
import { _resetForTests } from './useDevMode.js'

vi.mock('./DevOverlay.jsx', () => ({
  default: ({ onInspect }) => (
    <button type="button" onClick={() => onInspect('Badge')}>
      simulate chip click
    </button>
  ),
}))

vi.mock('./DevDetailModal.jsx', () => ({
  default: ({ name, onClose }) =>
    name ? (
      <div role="dialog">
        {name}
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
  _resetForTests()
})

afterEach(() => cleanup())

it('renders the toggle once everActivated is seeded in localStorage', () => {
  localStorage.setItem(
    'odyssey-devmode',
    JSON.stringify({ enabled: false, mode: 'hover', framework: 'react', everActivated: true, corner: 'br' })
  )
  render(<DevMode />)
  expect(screen.getByRole('button', { name: /enable dev mode/i })).toBeTruthy()
})

it('does not render the toggle when never activated', () => {
  render(<DevMode />)
  expect(screen.queryByRole('button', { name: /dev mode/i })).toBeNull()
})

describe('chip click → modal wiring', () => {
  it('DevOverlay.onInspect(name) opens DevDetailModal with that name; onClose clears it', () => {
    render(<DevMode />)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByText('simulate chip click'))
    expect(screen.getByRole('dialog').textContent).toContain('Badge')

    fireEvent.click(screen.getByText('close'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

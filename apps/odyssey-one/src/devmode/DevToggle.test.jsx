// @vitest-environment jsdom
//
// jsdom has no layout engine, so drag/corner assertions are driven off
// clientX/clientY against a stubbed window.innerWidth/innerHeight, not real
// element geometry — see nearestCorner()'s own comment. Real on-screen
// placement is Task 6 browser QA.
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import DevToggle, { nearestCorner } from './DevToggle.jsx'
import { setEnabled, setMode, setFramework, setCorner, getState, _resetForTests } from './useDevMode.js'

// This jsdom doesn't implement a real PointerEvent constructor — dom-testing-
// library's fireEvent.pointerDown/Move/Up falls back to a bare Event with no
// clientX/clientY. MouseEvent IS fully implemented (clientX/clientY come
// through its init dict), and React's pointer* handlers match by event TYPE
// STRING, not constructor, so dispatching a MouseEvent typed 'pointerdown'
// etc. is what actually exercises the component's coordinate math here.
function firePointer(type, target, { clientX, clientY, pointerId = 1 } = {}) {
  const event = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  fireEvent(target, event)
}

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
  _resetForTests()
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 })
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 })
})

afterEach(() => {
  cleanup()
})

describe('nearestCorner', () => {
  it('picks the corner matching which quadrant the point falls in', () => {
    expect(nearestCorner(10, 10, 1000, 800)).toBe('tl')
    expect(nearestCorner(990, 10, 1000, 800)).toBe('tr')
    expect(nearestCorner(10, 790, 1000, 800)).toBe('bl')
    expect(nearestCorner(990, 790, 1000, 800)).toBe('br')
  })
})

describe('DevToggle — visibility', () => {
  it('renders nothing when dev mode has never been activated', () => {
    const { container } = render(<DevToggle />)
    expect(container.querySelector('.devmode-toggle-cluster')).toBeNull()
  })

  it('renders once everActivated is true, even while disabled', () => {
    setEnabled(true)
    setEnabled(false) // everActivated latches true, enabled goes back to false
    render(<DevToggle />)
    expect(screen.getByRole('button', { name: /enable dev mode/i })).toBeTruthy()
  })
})

describe('DevToggle — click toggles enabled', () => {
  it('a plain click (pointerdown+up, no movement) flips enabled', () => {
    setEnabled(true)
    setEnabled(false)
    render(<DevToggle />)
    const button = screen.getByRole('button', { name: /enable dev mode/i })

    firePointer('pointerdown', button, { clientX: 100, clientY: 100 })
    firePointer('pointerup', button, { clientX: 100, clientY: 100 })

    expect(getState().enabled).toBe(true)
  })
})

describe('DevToggle — menu', () => {
  function openMenu() {
    setEnabled(true)
    setEnabled(false)
    render(<DevToggle />)
    fireEvent.click(screen.getByRole('button', { name: /dev mode options/i }))
  }

  it('opens the flyout with Mode/Framework groups and marks the current selection', () => {
    setMode('hover')
    setFramework('react')
    openMenu()

    expect(screen.getByRole('menu')).toBeTruthy()
    const hoverOption = screen.getByRole('menuitemradio', { name: /hover/i })
    const allOption = screen.getByRole('menuitemradio', { name: /^all$/i })
    expect(hoverOption.getAttribute('aria-checked')).toBe('true')
    expect(allOption.getAttribute('aria-checked')).toBe('false')
  })

  it('clicking Mode/Framework options calls the store', () => {
    openMenu()

    fireEvent.click(screen.getByRole('menuitemradio', { name: /^all$/i }))
    expect(getState().mode).toBe('all')

    fireEvent.click(screen.getByRole('menuitemradio', { name: /angular/i }))
    expect(getState().framework).toBe('angular')
  })

  it('closes on Escape', () => {
    openMenu()
    expect(screen.getByRole('menu')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('closes on outside click', () => {
    openMenu()
    expect(screen.getByRole('menu')).toBeTruthy()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('DevToggle — drag vs click', () => {
  it('a drag crossing toward a different corner calls setCorner with the nearest corner, and does not toggle enabled', () => {
    setEnabled(true)
    setEnabled(false)
    setCorner('br')
    render(<DevToggle />)
    const button = screen.getByRole('button', { name: /enable dev mode/i })

    // Start near the br corner, drag up-left across the midpoint toward tl.
    firePointer('pointerdown', button, { clientX: 980, clientY: 780 })
    firePointer('pointermove', button, { clientX: 500, clientY: 400 })
    firePointer('pointerup', button, { clientX: 10, clientY: 10 })

    expect(getState().corner).toBe('tl')
    expect(getState().enabled).toBe(false)
  })

  it('small jitter under the drag threshold is treated as a click: enabled toggles, corner unchanged', () => {
    setEnabled(true)
    setEnabled(false)
    setCorner('br')
    render(<DevToggle />)
    const button = screen.getByRole('button', { name: /enable dev mode/i })

    firePointer('pointerdown', button, { clientX: 500, clientY: 500 })
    firePointer('pointermove', button, { clientX: 502, clientY: 501 })
    firePointer('pointerup', button, { clientX: 502, clientY: 501 })

    expect(getState().corner).toBe('br')
    expect(getState().enabled).toBe(true)
  })
})

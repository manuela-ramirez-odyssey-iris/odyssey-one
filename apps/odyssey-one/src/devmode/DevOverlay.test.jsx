// @vitest-environment jsdom
//
// jsdom has no layout engine: every getBoundingClientRect() is 0x0, so
// nothing here can assert real screen positions. These tests cover LOGIC —
// which chip renders for which input, listener attach/detach, click wiring.
// Real-viewport behavior (actual outline/chip placement) is Task 6 browser QA.
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { Badge, EntityChip, IconButton } from '@odyssey/ui'
import DevOverlay from './DevOverlay.jsx'
import { preloadComponentInfo } from './componentInfo.js'
import { setEnabled, setMode, setFramework, _resetForTests } from './useDevMode.js'

// DevOverlay fire-and-forgets preloadComponentInfo() on activation (per spec —
// tests aren't meant to await it either). Resolve it here, once, up front:
// otherwise the dynamic import of every demo file races the test file's own
// teardown and jsdom gets torn down mid-import (EnvironmentTeardownError).
// componentInfo.js memoizes the load, so this doesn't change what the
// component under test actually does.
beforeAll(() => preloadComponentInfo())

// App-local (non-ui) wrapper — proves the all-mode walk still finds a real
// ui component nested inside ordinary app markup.
function LocalWrapper({ children }) {
  return <div className="local-wrapper">{children}</div>
}

let rootEl

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
  _resetForTests()
  rootEl = document.createElement('div')
  rootEl.id = 'root'
  document.body.appendChild(rootEl)
  // Run rAF synchronously so "flush rAF" is just "the callback already ran".
  vi.stubGlobal('requestAnimationFrame', (cb) => {
    cb()
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  cleanup()
  rootEl.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DevOverlay — disabled', () => {
  it('renders nothing and attaches no document-level listeners', () => {
    setEnabled(false)
    const addSpy = vi.spyOn(document, 'addEventListener')
    const { container } = render(<DevOverlay onInspect={() => {}} />, { container: rootEl })

    expect(container.querySelector('.devmode-overlay')).toBeNull()
    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(addSpy).not.toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything())
  })
})

describe('DevOverlay — hover mode', () => {
  it('shows exactly one chip naming the hovered ui component', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const { container } = render(
      <>
        <Badge variant="blue">Hi</Badge>
        <DevOverlay onInspect={() => {}} />
      </>,
      { container: rootEl }
    )
    const badgeNode = screen.getByText('Hi')
    document.elementFromPoint = vi.fn(() => badgeNode)

    fireEvent.pointerMove(document, { clientX: 10, clientY: 10 })

    const chips = container.querySelectorAll('.devmode-chip')
    expect(chips.length).toBe(1)
    expect(chips[0].textContent).toContain('Badge')
  })

  it('switching framework to angular shows the Angular chip; an unported component shows "not ported"', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const { container } = render(
      <>
        <Badge variant="blue">Hi</Badge>
        <DevOverlay onInspect={() => {}} />
      </>,
      { container: rootEl }
    )
    const badgeNode = screen.getByText('Hi')
    document.elementFromPoint = vi.fn(() => badgeNode)
    fireEvent.pointerMove(document, { clientX: 1, clientY: 1 })

    act(() => setFramework('angular'))

    const chip = container.querySelector('.devmode-chip')
    expect(chip.textContent).toContain('odyssey-badge')
  })

  it('an unported real ui component shows "not ported" under the angular framework', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('angular')
    // IconButton is a real @odyssey/ui export with no entry in angular-map.json.
    const { container } = render(
      <>
        <IconButton icon={<span>i</span>} ariaLabel="info" />
        <DevOverlay onInspect={() => {}} />
      </>,
      { container: rootEl }
    )
    const iconButtonNode = container.querySelector('.icon-button')
    document.elementFromPoint = vi.fn(() => iconButtonNode)

    fireEvent.pointerMove(document, { clientX: 1, clientY: 1 })

    const chip = container.querySelector('.devmode-chip')
    expect(chip.textContent).toContain('not ported')
    expect(chip.className).toContain('devmode-chip--muted')
  })
})

describe('DevOverlay — all mode', () => {
  it('renders one chip per outermost ui component and none for a component nested inside another ui component', () => {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    render(
      <>
        <Badge variant="blue">One</Badge>
        <Badge variant="green">Two</Badge>
        <LocalWrapper>
          <EntityChip name="Test" count={1} />
        </LocalWrapper>
        <DevOverlay onInspect={() => {}} />
      </>,
      { container: rootEl }
    )

    const chips = rootEl.querySelectorAll('.devmode-chip')
    expect(chips.length).toBe(3)
    const texts = Array.from(chips).map((c) => c.textContent)
    expect(texts.some((t) => t.includes('IconButton'))).toBe(false)
    expect(texts.filter((t) => t.includes('Badge')).length).toBe(2)
    expect(texts.some((t) => t.includes('EntityChip'))).toBe(true)
  })
})

describe('DevOverlay — chip interaction', () => {
  it('clicking a chip calls onInspect with the component name; overlay is pointer-events none, chip is pointer-events auto', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const onInspect = vi.fn()
    const { container } = render(
      <>
        <Badge variant="blue">Hi</Badge>
        <DevOverlay onInspect={onInspect} />
      </>,
      { container: rootEl }
    )
    const badgeNode = screen.getByText('Hi')
    document.elementFromPoint = vi.fn(() => badgeNode)
    fireEvent.pointerMove(document, { clientX: 10, clientY: 10 })

    const overlay = container.querySelector('.devmode-overlay')
    const chip = container.querySelector('.devmode-chip')
    expect(overlay.style.pointerEvents).toBe('none')
    expect(chip.style.pointerEvents).toBe('auto')

    fireEvent.click(chip)
    expect(onInspect).toHaveBeenCalledWith('Badge')
  })
})

describe('DevOverlay — cleanup', () => {
  it('unmounting removes the scroll/resize listeners added in all mode', () => {
    setEnabled(true)
    setMode('all')
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')
    const removeWinSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<DevOverlay onInspect={() => {}} />, { container: rootEl })

    unmount()

    expect(removeDocSpy).toHaveBeenCalledWith('scroll', expect.any(Function), expect.objectContaining({ capture: true }))
    expect(removeWinSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('unmounting removes the pointermove listener added in hover mode', () => {
    setEnabled(true)
    setMode('hover')
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = render(<DevOverlay onInspect={() => {}} />, { container: rootEl })

    unmount()

    expect(removeDocSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
  })

  it('disabling (without unmounting) also removes listeners', () => {
    setEnabled(true)
    setMode('hover')
    const { rerender } = render(<DevOverlay onInspect={() => {}} />, { container: rootEl })
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')

    act(() => setEnabled(false))
    rerender(<DevOverlay onInspect={() => {}} />)

    expect(removeDocSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
  })
})

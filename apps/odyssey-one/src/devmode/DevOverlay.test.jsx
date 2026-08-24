// @vitest-environment jsdom
//
// jsdom has no layout engine: every getBoundingClientRect() is 0x0, so
// nothing here can assert real screen positions. These tests cover LOGIC —
// which chip renders for which input, listener attach/detach, click wiring.
// Real-viewport behavior (actual outline/chip placement) is Task 6 browser QA.
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { Badge, EntityChip, FormField, IconButton } from '@odyssey/ui'
import DevOverlay, { visibleMatches } from './DevOverlay.jsx'
import { preloadComponentInfo } from './componentInfo.js'
import { setEnabled, setMode, setFramework, setNesting, _resetForTests } from './useDevMode.js'

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
let rafQueue

// Queue-and-flush rAF stub. A synchronous "call cb immediately" stub is
// wrong here: `raf = requestAnimationFrame(cb)` runs cb (which sets
// `raf = null`) BEFORE the outer assignment lands `raf = <id>` — so `raf`
// ends up truthy again right after, and the throttle guard (`if (raf !=
// null) return`) latches shut for the rest of the test, silently dropping
// every later event. Queuing defers the callback until the test explicitly
// flushes, matching real (async) rAF ordering.
function flushRaf() {
  const queued = rafQueue
  rafQueue = []
  queued.forEach((cb) => cb())
}

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
  _resetForTests()
  rootEl = document.createElement('div')
  rootEl.id = 'root'
  document.body.appendChild(rootEl)
  rafQueue = []
  vi.stubGlobal('requestAnimationFrame', (cb) => {
    rafQueue.push(cb)
    return rafQueue.length
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
    act(() => flushRaf())

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
    act(() => flushRaf())

    act(() => setFramework('angular'))

    const chip = container.querySelector('.devmode-chip')
    expect(chip.textContent).toContain('odyssey-badge')
  })

  it('a devmode-owned element under the pointer keeps the current highlight (does not chip devmode chrome, e.g. the detail modal)', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const { container } = render(
      <>
        <Badge variant="blue">Hi</Badge>
        <div data-devmode="true">
          <EntityChip name="Chrome" count={1} />
        </div>
        <DevOverlay onInspect={() => {}} />
      </>,
      { container: rootEl }
    )
    const badgeNode = screen.getByText('Hi')
    const chromeWrapper = container.querySelector('[data-devmode]')

    document.elementFromPoint = vi.fn(() => badgeNode)
    fireEvent.pointerMove(document, { clientX: 10, clientY: 10 })
    act(() => flushRaf())
    expect(container.querySelector('.devmode-chip').textContent).toContain('Badge')

    // Pointer moves onto devmode-owned chrome — highlight must NOT switch to
    // EntityChip (or disappear); it stays pinned on the last real match.
    document.elementFromPoint = vi.fn(() => chromeWrapper)
    fireEvent.pointerMove(document, { clientX: 20, clientY: 20 })
    act(() => flushRaf())

    const chips = container.querySelectorAll('.devmode-chip')
    expect(chips.length).toBe(1)
    expect(chips[0].textContent).toContain('Badge')
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
    act(() => flushRaf())

    const chip = container.querySelector('.devmode-chip')
    expect(chip.textContent).toContain('not ported')
    expect(chip.className).toContain('devmode-chip--muted')
  })
})

describe('DevOverlay — hover mode, nested components', () => {
  // FormField renders a real FieldSelect for `trailingSelect` — both are
  // @odyssey/ui exports, so hovering the trailing control is a genuine
  // 2-deep chain.
  function renderNested(onInspect = () => {}) {
    const result = render(
      <>
        <FormField label="Currency" value="" onChange={() => {}} trailingSelect={{ label: 'USD', onClick: () => {} }} />
        <DevOverlay onInspect={onInspect} />
      </>,
      { container: rootEl }
    )
    const target = screen.getByRole('button', { name: 'USD' })
    document.elementFromPoint = vi.fn(() => target)
    fireEvent.pointerMove(document, { clientX: 5, clientY: 5 })
    act(() => flushRaf())
    return result
  }

  // REWRITTEN (was: "labels the INNERMOST component and renders its ancestor
  // path"). The ancestor breadcrumb moved into the detail modal's Hierarchy
  // section — the chip is back to leaf-only, so the crumb assertion it made
  // is now the opposite of the contract.
  it('labels ONLY the innermost component — no ancestor text in the chip', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const { container } = renderNested()

    const chips = container.querySelectorAll('.devmode-chip')
    expect(chips.length).toBe(1)
    expect(chips[0].textContent).toContain('FieldSelect')
    expect(chips[0].textContent).not.toContain('FormField')
    expect(chips[0].querySelector('.devmode-chip__crumb')).toBeNull()
  })

  it('outlines the whole chain — leaf solid, ancestors dashed/dimmed', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const { container } = renderNested()

    const outlines = container.querySelectorAll('.devmode-outline')
    expect(outlines.length).toBe(2)
    expect(container.querySelectorAll('.devmode-outline--nested').length).toBe(1)
  })

  // REMOVED: "clicking a breadcrumb segment inspects the ANCESTOR, not the
  // leaf" and the whole `breadcrumbSegments` describe (2 cases: the verbatim
  // cap and the ellipsis). Both asserted the breadcrumb contract that the
  // modal's Hierarchy section replaces — the helper no longer exists, and
  // ancestor re-targeting is covered in DevDetailModal.test.jsx instead.

  // REWRITTEN (was: "ancestors keep their REACT names while the leaf renders
  // the Angular selector"). Only the leaf renders at all now, so the
  // React-name-for-ancestors rule has no chip to apply to; what's left worth
  // asserting is that the leaf still follows the selected framework.
  it('the leaf renders the Angular selector under the angular framework', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('angular')
    const { container } = renderNested()

    const chip = container.querySelector('.devmode-chip')
    expect(chip.textContent).toContain('odyssey-field-select')
    expect(chip.textContent).not.toContain('odyssey-form-field')
  })
})

describe('DevOverlay — all mode', () => {
  // REWRITTEN (was: "renders one chip per outermost ui component and none for
  // a component nested inside another ui component"). That assertion encoded
  // the outermost-only contract this change replaces — nesting is now a
  // user-visible option, defaulting to 'all', so the old behavior is asserted
  // below under nesting='outermost' instead.
  function renderTree() {
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
    return Array.from(rootEl.querySelectorAll('.devmode-chip')).map((c) => c.textContent)
  }

  it("nesting='all' chips a nested ui child (EntityChip's IconButton) as well as its parent", () => {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    setNesting('all')

    const texts = renderTree()

    expect(texts.filter((t) => t.includes('Badge')).length).toBe(2)
    expect(texts.some((t) => t.includes('EntityChip'))).toBe(true)
    expect(texts.some((t) => t.includes('IconButton'))).toBe(true)
  })

  it("nesting='outermost' chips only the parent, not its nested ui child", () => {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    setNesting('outermost')

    const texts = renderTree()

    expect(texts.length).toBe(3)
    expect(texts.some((t) => t.includes('IconButton'))).toBe(false)
    expect(texts.some((t) => t.includes('EntityChip'))).toBe(true)
  })

  it('skips a devmode-owned subtree (e.g. the detail modal) even when it contains a real ui component', () => {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    render(
      <>
        <Badge variant="blue">One</Badge>
        <div data-devmode="true">
          <EntityChip name="Chrome" count={1} />
        </div>
        <DevOverlay onInspect={() => {}} />
      </>,
      { container: rootEl }
    )

    const chips = rootEl.querySelectorAll('.devmode-chip')
    expect(chips.length).toBe(1)
    expect(chips[0].textContent).toContain('Badge')
    expect(Array.from(chips).some((c) => c.textContent.includes('EntityChip'))).toBe(false)
  })

  // Route change with no scroll fired in between: allHighlights is stale,
  // still holding a {name, element} pair whose element is no longer in the
  // document. Rendering it anyway would getBoundingClientRect() a detached
  // node (all zeros) — a chip pinned at the viewport corner forever.
  it('drops a chip once its element is detached from the document, even without a new walk', () => {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    // build(showBadge) returns a FRESH element tree each call (DevOverlay
    // stays mounted in the same position, so its state survives — this is
    // not a remount). Toggling showBadge off makes React unmount Badge the
    // normal way (a real route change unmounting the previous route's
    // components), which is what actually detaches the node — no manual
    // DOM surgery that would fight React's own bookkeeping on cleanup.
    const build = (showBadge) => (
      <>
        {showBadge && <Badge variant="blue">One</Badge>}
        <DevOverlay onInspect={() => {}} />
      </>
    )
    const { rerender } = render(build(true), { container: rootEl })
    expect(rootEl.querySelectorAll('.devmode-chip').length).toBe(1)

    // No scroll/resize fired — allHighlights still holds the (now-detached)
    // Badge element from the original walk. Unmounting Badge and re-reading
    // `.isConnected` both happen in ONE React commit, so the FIRST rerender
    // still renders the stale chip (DevOverlay's render phase runs before
    // Badge's removal actually commits to the DOM — same-pass ordering, a
    // real React subtlety, not a filter bug). A second, later render pass —
    // exactly what "some other re-render happens after the route change"
    // looks like in production — is where the filter actually bites.
    act(() => rerender(build(false)))
    act(() => rerender(build(false)))

    expect(rootEl.querySelectorAll('.devmode-chip').length).toBe(0)
  })
})

describe('visibleMatches', () => {
  // Synthetic match list — the filter is pure and never touches the DOM, so
  // plain strings stand in for elements (Set membership is identity either way).
  const a = { name: 'A', element: 'elA', depth: 0, parent: null }
  const b = { name: 'B', element: 'elB', depth: 1, parent: a }
  const c = { name: 'C', element: 'elC', depth: 2, parent: b }
  const d = { name: 'D', element: 'elD', depth: 0, parent: null }
  const matches = [a, b, c, d]
  const names = (list) => list.map((m) => m.name)

  it("'outermost' yields only depth 0", () => {
    expect(names(visibleMatches(matches, 'outermost', new Set()))).toEqual(['A', 'D'])
  })

  it("'all' yields everything, expanded set irrelevant", () => {
    expect(names(visibleMatches(matches, 'all', new Set()))).toEqual(['A', 'B', 'C', 'D'])
  })

  it("'progressive' with nothing expanded yields only depth 0", () => {
    expect(names(visibleMatches(matches, 'progressive', new Set()))).toEqual(['A', 'D'])
  })

  it("'progressive' reveals exactly the direct children of an expanded entry", () => {
    expect(names(visibleMatches(matches, 'progressive', new Set(['elA'])))).toEqual(['A', 'B', 'D'])
  })

  it("'progressive' hides a grandchild whose intermediate parent is collapsed", () => {
    // B expanded but A is not: C must stay hidden — the chain is broken above it.
    expect(names(visibleMatches(matches, 'progressive', new Set(['elB'])))).toEqual(['A', 'D'])
    // Both expanded: the whole branch shows.
    expect(names(visibleMatches(matches, 'progressive', new Set(['elA', 'elB'])))).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('DevOverlay — all mode, progressive nesting', () => {
  // FormField renders a real FieldSelect per select edge — two edges means
  // two DIRECT ui children, so the expander must read "+2" and reveal exactly
  // two chips.
  function renderProgressive(onInspect = () => {}) {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    setNesting('progressive')
    return render(
      <>
        <FormField
          label="Amount"
          value=""
          onChange={() => {}}
          leadingSelect={{ label: 'USD', onClick: () => {} }}
          trailingSelect={{ label: 'per lb', onClick: () => {} }}
        />
        <Badge variant="blue">Leaf</Badge>
        <DevOverlay onInspect={onInspect} />
      </>,
      { container: rootEl }
    )
  }

  const chipTexts = () => Array.from(rootEl.querySelectorAll('.devmode-chip')).map((c) => c.textContent)

  it('starts collapsed: only the outermost components are chipped', () => {
    renderProgressive()
    const texts = chipTexts()
    expect(texts.filter((t) => t.includes('FormField')).length).toBe(1)
    expect(texts.filter((t) => t.includes('Badge')).length).toBe(1)
    expect(texts.some((t) => t.includes('FieldSelect'))).toBe(false)
  })

  it('a chip with nested ui children carries an expander counting its DIRECT children', () => {
    renderProgressive()
    const expanders = rootEl.querySelectorAll('.devmode-chip__expander')
    expect(expanders.length).toBe(1)
    expect(expanders[0].textContent).toBe('+2')
    expect(expanders[0].getAttribute('aria-expanded')).toBe('false')
  })

  it('a component with no nested ui children has no expander', () => {
    renderProgressive()
    const badgeChip = Array.from(rootEl.querySelectorAll('.devmode-chip')).find((c) => c.textContent.includes('Badge'))
    expect(badgeChip.querySelector('.devmode-chip__expander')).toBeNull()
  })

  it('clicking the expander reveals exactly the direct children; clicking again collapses them', () => {
    renderProgressive()

    fireEvent.click(rootEl.querySelector('.devmode-chip__expander'))
    expect(chipTexts().filter((t) => t.includes('FieldSelect')).length).toBe(2)
    expect(rootEl.querySelector('.devmode-chip__expander').getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(rootEl.querySelector('.devmode-chip__expander'))
    expect(chipTexts().some((t) => t.includes('FieldSelect'))).toBe(false)
  })

  it('expander clicks never open the modal, while the chip body still does', () => {
    const onInspect = vi.fn()
    renderProgressive(onInspect)

    fireEvent.click(rootEl.querySelector('.devmode-chip__expander'))
    expect(onInspect).not.toHaveBeenCalled()

    const formFieldChip = Array.from(rootEl.querySelectorAll('.devmode-chip')).find((c) =>
      c.textContent.includes('FormField')
    )
    fireEvent.click(formFieldChip)
    expect(onInspect.mock.calls[0][0]).toBe('FormField')
  })

  it("no expanders in 'all' or 'outermost' nesting — there is nothing left to reveal", () => {
    renderProgressive()
    act(() => setNesting('all'))
    expect(rootEl.querySelectorAll('.devmode-chip__expander').length).toBe(0)
    expect(chipTexts().filter((t) => t.includes('FieldSelect')).length).toBe(2)

    act(() => setNesting('outermost'))
    expect(rootEl.querySelectorAll('.devmode-chip__expander').length).toBe(0)
    expect(chipTexts().some((t) => t.includes('FieldSelect'))).toBe(false)
  })
})

describe('DevOverlay — chip interaction', () => {
  it('clicking a chip calls onInspect with the component name AND its element; overlay is pointer-events none, chip is pointer-events auto', () => {
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
    act(() => flushRaf())

    const overlay = container.querySelector('.devmode-overlay')
    const chip = container.querySelector('.devmode-chip')
    expect(overlay.style.pointerEvents).toBe('none')
    expect(chip.style.pointerEvents).toBe('auto')

    fireEvent.click(chip)
    // The element is what lets the modal re-walk THIS instance (ancestry +
    // live props) rather than only knowing the component type.
    const [calledName, calledElement] = onInspect.mock.calls[0]
    expect(calledName).toBe('Badge')
    expect(calledElement instanceof HTMLElement).toBe(true)
    expect(calledElement.contains(badgeNode)).toBe(true)
  })
})

describe('DevOverlay — suppressed (detail modal open)', () => {
  // The detail modal must never sit under this overlay's chips/outlines
  // (z-index 999999 vs the product modal's ~9000) — while it's open, the
  // overlay renders nothing at all, and restores whatever mode was active
  // once it closes.
  it('all mode: chips present → suppressed hides them → un-suppressing restores them', () => {
    setEnabled(true)
    setMode('all')
    setFramework('react')
    const { container, rerender } = render(
      <>
        <Badge variant="blue">One</Badge>
        <DevOverlay onInspect={() => {}} suppressed={false} />
      </>,
      { container: rootEl }
    )
    expect(container.querySelectorAll('.devmode-chip').length).toBe(1)

    rerender(
      <>
        <Badge variant="blue">One</Badge>
        <DevOverlay onInspect={() => {}} suppressed />
      </>
    )
    expect(container.querySelector('.devmode-overlay')).toBeNull()
    expect(container.querySelectorAll('.devmode-chip').length).toBe(0)

    rerender(
      <>
        <Badge variant="blue">One</Badge>
        <DevOverlay onInspect={() => {}} suppressed={false} />
      </>
    )
    act(() => flushRaf())
    expect(container.querySelectorAll('.devmode-chip').length).toBe(1)
  })

  it('hover mode: suppressing detaches the pointermove listener; un-suppressing reattaches it', () => {
    setEnabled(true)
    setMode('hover')
    setFramework('react')
    const removeDocSpy = vi.spyOn(document, 'removeEventListener')
    const addDocSpy = vi.spyOn(document, 'addEventListener')
    const { rerender } = render(<DevOverlay onInspect={() => {}} suppressed={false} />, { container: rootEl })

    rerender(<DevOverlay onInspect={() => {}} suppressed />)
    expect(removeDocSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))

    addDocSpy.mockClear()
    rerender(<DevOverlay onInspect={() => {}} suppressed={false} />)
    expect(addDocSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
  })

  it('renders nothing at all while suppressed, regardless of mode', () => {
    setEnabled(true)
    setMode('hover')
    const { container } = render(<DevOverlay onInspect={() => {}} suppressed />, { container: rootEl })
    expect(container.querySelector('.devmode-overlay')).toBeNull()
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

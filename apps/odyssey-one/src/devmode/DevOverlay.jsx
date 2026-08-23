// Dev-mode overlay: draws outlines + name chips over @odyssey/ui components,
// either on hover (mode: 'hover') or for every component on screen at once
// (mode: 'all'). Renders nothing when dev mode is disabled.
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDevMode } from './useDevMode.js'
import { findUiComponent } from './inspect.js'
import { getComponentInfoSync, preloadComponentInfo } from './componentInfo.js'
import './devmode.css'

// { text, muted, normalizing }
function chipContent(name, framework) {
  const info = getComponentInfoSync(name)
  if (framework === 'angular') {
    if (info.ported) {
      return {
        text: `${info.angular.selector} · ${info.angular.version}`,
        muted: false,
        normalizing: Boolean(info.angular.normalizing),
      }
    }
    return { text: `${name} · not ported`, muted: true, normalizing: false }
  }
  // react — tier/version omitted until the demo index has loaded.
  if (info.react) {
    return {
      text: `${name} · ${info.react.tier} · ${info.react.version}`,
      muted: false,
      normalizing: Boolean(info.react.normalizing),
    }
  }
  return { text: name, muted: false, normalizing: false }
}

// jsdom has no layout engine — every getBoundingClientRect() is 0×0, so a
// naive "skip zero-size elements" predicate would skip everything and the
// all-mode walk would find nothing. Real browsers always give document.body
// a nonzero rect once painted. Use that as the honest signal: only start
// skipping zero-size elements once we can tell zero-size is real, not an
// artifact of no layout at all.
function hasRealLayout() {
  const r = document.body.getBoundingClientRect()
  return r.width > 0 || r.height > 0
}

// Depth-first walk from #root. For each element, ask findUiComponent(el) —
// if it resolves to a match rooted AT el, that's an outermost ui component:
// record it and don't descend (skips inner ui components nested inside it,
// e.g. EntityChip's internal IconButton). Otherwise keep walking children.
function walkAll(overlayEl) {
  const root = document.getElementById('root')
  if (!root) return []
  const skipZeroSize = hasRealLayout()
  const found = []

  function visit(el) {
    if (overlayEl && overlayEl.contains(el)) return
    if (skipZeroSize) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
    }
    const match = findUiComponent(el)
    if (match && match.element === el) {
      found.push({ name: match.name, element: el })
      return
    }
    for (const child of el.children) visit(child)
  }

  visit(root)
  return found
}

function rectOf(el) {
  return el.getBoundingClientRect()
}

// ponytail: only clamps the top-left corner on-screen (min 0) — clamping the
// bottom-right against the chip's OWN size would need a measured ref/layout
// pass, more machinery than a dev tool needs. Add if chips are seen hanging
// off-screen in Task 6 browser QA.
function clampToViewport(left, top) {
  return { left: Math.max(0, left), top: Math.max(0, top) }
}

function DevOverlayItem({ item, framework, onInspect }) {
  const rect = rectOf(item.element)
  const { left, top } = clampToViewport(rect.left, rect.top)
  const { text, muted, normalizing } = chipContent(item.name, framework)

  return (
    <>
      <div
        className="devmode-outline"
        style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, pointerEvents: 'none' }}
      />
      <div
        className={muted ? 'devmode-chip devmode-chip--muted' : 'devmode-chip'}
        style={{ position: 'fixed', left, top, pointerEvents: 'auto', cursor: 'pointer' }}
        onClick={() => onInspect(item.name)}
        title={normalizing ? 'NORMALIZING' : undefined}
      >
        {normalizing && <span className="devmode-chip__dot" aria-hidden="true" />}
        {text}
      </div>
    </>
  )
}

export default function DevOverlay({ onInspect = () => {} }) {
  const { enabled, mode, framework } = useDevMode()
  const overlayRef = useRef(null)
  const [hoverHighlight, setHoverHighlight] = useState(null) // { name, element } | null
  const [allHighlights, setAllHighlights] = useState([]) // [{ name, element }]

  // Kick off the DSM demo-index load once, on activation — fire-and-forget.
  useEffect(() => {
    if (enabled) preloadComponentInfo()
  }, [enabled])

  const processPointerMove = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y)
    if (!el) return
    // Guard: the point resolved inside the overlay's own DOM (e.g. the chip
    // itself) — keep the current highlight so mousing onto the chip doesn't
    // flicker it away.
    if (overlayRef.current && overlayRef.current.contains(el)) return
    const match = findUiComponent(el)
    if (!match || !match.element) {
      setHoverHighlight(null)
      return
    }
    setHoverHighlight({ name: match.name, element: match.element })
  }, [])

  // Hover mode: rAF-throttled pointermove over the whole document. State
  // clears in the CLEANUP (not the effect body) — setState directly in an
  // effect body triggers cascading-render lint/perf warnings; clearing on
  // teardown (mode/enabled change or unmount) is the supported pattern and
  // has the same observable effect (stale highlight never renders once the
  // listener that would refresh it is gone).
  useEffect(() => {
    if (!enabled || mode !== 'hover') return
    let pending = null
    let raf = null
    const onPointerMove = (e) => {
      pending = { x: e.clientX, y: e.clientY }
      if (raf != null) return
      raf = requestAnimationFrame(() => {
        raf = null
        if (pending) processPointerMove(pending.x, pending.y)
      })
    }
    document.addEventListener('pointermove', onPointerMove)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      if (raf != null) cancelAnimationFrame(raf)
      setHoverHighlight(null)
    }
  }, [enabled, mode, processPointerMove])

  // All mode: walk on activation, and on throttled scroll/resize.
  useEffect(() => {
    if (!enabled || mode !== 'all') return
    const relayout = () => setAllHighlights(walkAll(overlayRef.current))
    relayout()

    let raf = null
    const throttled = () => {
      if (raf != null) return
      raf = requestAnimationFrame(() => {
        raf = null
        relayout()
      })
    }
    document.addEventListener('scroll', throttled, { capture: true, passive: true })
    window.addEventListener('resize', throttled)
    return () => {
      document.removeEventListener('scroll', throttled, { capture: true })
      window.removeEventListener('resize', throttled)
      if (raf != null) cancelAnimationFrame(raf)
      setAllHighlights([])
    }
  }, [enabled, mode])

  if (!enabled) return null

  const items = mode === 'hover' ? (hoverHighlight ? [hoverHighlight] : []) : allHighlights

  return (
    <div ref={overlayRef} className="devmode-overlay" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {items.map((item, i) => (
        <DevOverlayItem key={`${item.name}-${i}`} item={item} framework={framework} onInspect={onInspect} />
      ))}
    </div>
  )
}

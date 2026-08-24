// Dev-mode overlay: draws outlines + name chips over @odyssey/ui components,
// either on hover (mode: 'hover') or for every component on screen at once
// (mode: 'all'). Renders nothing when dev mode is disabled.
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDevMode } from './useDevMode.js'
import { findUiComponentChain } from './inspect.js'
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

// Depth-first walk from #root. For each element, ask findUiComponentChain(el)
// and record every chain entry rooted AT el (a chain entry's `element` is the
// component's first host element, so "rooted at el" == that component starts
// here). `depth` is the entry's index in the chain, i.e. how many ui
// components enclose it.
//
// nesting === 'outermost': only the chain head counts, and the subtree is
// skipped on a match (the old behavior — EntityChip's internal IconButton
// stays hidden). nesting === 'all': keep descending after a match, so
// components composed into a parent's slots get labeled too.
//
// ponytail: 'all' visits every element under #root instead of pruning at each
// match, so the walk is O(elements) with a fiber walk per element. Fine for a
// dev tool on a normal page; if a huge table ever makes this stutter, the
// upgrade path is to memoize per-element chain results between relayouts.
function walkAll(overlayEl, nesting) {
  const root = document.getElementById('root')
  if (!root) return []
  const skipZeroSize = hasRealLayout()
  const found = []

  function visit(el) {
    if (overlayEl && overlayEl.contains(el)) return
    // Skip devmode-owned chrome (toggle cluster, detail modal) and its whole
    // subtree — see the data-devmode guard in the hover path below for why.
    if (el.closest('[data-devmode]')) return
    if (skipZeroSize) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
    }
    const chain = findUiComponentChain(el)
    if (nesting === 'outermost') {
      if (chain[0] && chain[0].element === el) {
        found.push({ name: chain[0].name, element: el, depth: 0 })
        return
      }
    } else {
      chain.forEach((entry, depth) => {
        if (entry.element === el) found.push({ name: entry.name, element: el, depth })
      })
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

// Vertical offset per nesting level in all mode, so a parent and its nested
// child don't stack their chips on the same corner.
const CHIP_STAGGER_PX = 14
const CHIP_HEIGHT_PX = 18

function DevOutline({ element, nested }) {
  const rect = rectOf(element)
  return (
    <div
      className={nested ? 'devmode-outline devmode-outline--nested' : 'devmode-outline'}
      style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, pointerEvents: 'none' }}
    />
  )
}

function DevOverlayItem({ item, framework, onInspect }) {
  const rect = rectOf(item.element)
  const depth = item.depth || 0
  // Clamp the stagger so a deep chain doesn't walk its chips off the bottom
  // of the component they belong to.
  const offset = Math.min(depth * CHIP_STAGGER_PX, Math.max(rect.height - CHIP_HEIGHT_PX, 0))
  const { left, top } = clampToViewport(rect.left, rect.top + offset)
  const { text, muted, normalizing } = chipContent(item.name, framework)
  const classes = ['devmode-chip']
  if (muted) classes.push('devmode-chip--muted')
  if (depth > 0) classes.push('devmode-chip--nested')

  return (
    <>
      <DevOutline element={item.element} nested={depth > 0} />
      {/* onInspect gets the ELEMENT alongside the name so the modal can
          re-walk THIS instance's fibers (ancestry + live props) instead of
          only knowing which component type was clicked. */}
      <div
        className={classes.join(' ')}
        style={{ position: 'fixed', left, top, pointerEvents: 'auto', cursor: 'pointer' }}
        onClick={() => onInspect(item.name, item.element)}
        title={normalizing ? 'NORMALIZING' : undefined}
      >
        {normalizing && <span className="devmode-chip__dot" aria-hidden="true" />}
        {text}
      </div>
    </>
  )
}

export default function DevOverlay({ onInspect = () => {}, suppressed = false }) {
  const { enabled, mode, framework, nesting } = useDevMode()
  const overlayRef = useRef(null)
  const [hoverChain, setHoverChain] = useState([]) // [{ name, element }] outer→inner
  const [allHighlights, setAllHighlights] = useState([]) // [{ name, element, depth }]

  // Kick off the DSM demo-index load once, on activation — fire-and-forget.
  // On a static screen (no scroll/resize/pointermove after this resolves)
  // nothing would otherwise re-render the already-found chips, so they'd be
  // stuck showing bare names forever instead of picking up tier/version once
  // the index lands. Nudge all-mode by re-setting the same array (new
  // reference, same elements — no re-walk needed, chipContent() just re-reads
  // the now-populated index on the next render). Hover mode doesn't need the
  // same nudge: its highlight is already re-set on every pointermove, so it
  // self-heals the next time the mouse moves.
  useEffect(() => {
    if (!enabled || suppressed) return
    preloadComponentInfo()
      .then(() => setAllHighlights((prev) => prev.slice()))
      .catch(() => {})
  }, [enabled, suppressed])

  const processPointerMove = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y)
    if (!el) return
    // Guard: the point resolved inside the overlay's own DOM (e.g. the chip
    // itself) — keep the current highlight so mousing onto the chip doesn't
    // flicker it away. Same treatment for any devmode-owned chrome (toggle
    // cluster, detail modal): findUiComponent walks the FIBER tree, which
    // still links a portaled modal (rendered to document.body, outside
    // #root) back up through DevDetailModal/DevMode/App — so without this,
    // hovering the modal's own ModalMedium chrome would resolve to a real
    // match and chip itself.
    if (overlayRef.current && overlayRef.current.contains(el)) return
    if (el.closest('[data-devmode]')) return
    // Entries without a host element (portal / childless fiber — see
    // firstHostElement) can't be outlined or positioned, so they drop out of
    // the chain entirely; the deepest LOCATABLE component becomes the leaf.
    setHoverChain(findUiComponentChain(el).filter((entry) => entry.element))
  }, [])

  // Hover mode: rAF-throttled pointermove over the whole document. State
  // clears in the CLEANUP (not the effect body) — setState directly in an
  // effect body triggers cascading-render lint/perf warnings; clearing on
  // teardown (mode/enabled change or unmount) is the supported pattern and
  // has the same observable effect (stale highlight never renders once the
  // listener that would refresh it is gone).
  useEffect(() => {
    if (!enabled || mode !== 'hover' || suppressed) return
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
      setHoverChain([])
    }
  }, [enabled, mode, suppressed, processPointerMove])

  // All mode: walk on activation, and on throttled scroll/resize.
  // ponytail: no route-change listener — a client-side nav with no scroll
  // leaves the overlay empty (stale chips already get filtered out above,
  // so this is "blank until the next scroll," not "wrong") until the walk
  // re-runs. Upgrade path if that's annoying in practice: a router
  // location listener, or just re-walk on click (cheap, no new listener
  // class to clean up).
  useEffect(() => {
    if (!enabled || mode !== 'all' || suppressed) return
    const relayout = () => setAllHighlights(walkAll(overlayRef.current, nesting))
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
  }, [enabled, mode, nesting, suppressed])

  // The detail modal (DevDetailModal, z-index ~9000-ish product stacking)
  // must never sit UNDER this overlay's chips/outlines (z-index 999999) —
  // suppress rendering entirely while it's open. Listeners above already
  // detach via the `suppressed` dependency, so nothing keeps running
  // underneath either.
  if (!enabled || suppressed) return null

  // Filter detached elements at render time, not just at walk/hover time: a
  // route change fires neither scroll nor pointermove, so a stale
  // {name, element} can sit in state pointing at a node React already
  // unmounted. getBoundingClientRect() on a detached node is all zeros —
  // without this filter that's a chip pinned at the viewport corner forever.
  // Covers hover mode's transient case too (element removed mid-hover).
  // Hover mode: the LEAF (innermost) component is the only one LABELED — one
  // chip, name/tier/version, nothing else. Its ancestors keep dashed outlines
  // (spatial context is what hover is good at); the ancestor NAMES, and how
  // each one relates to its parent, moved into the detail modal, which has
  // room for them. Clicking the chip opens that modal for the leaf.
  const liveChain = hoverChain.filter((entry) => entry.element.isConnected)
  const leaf = liveChain[liveChain.length - 1]
  const items =
    mode === 'hover'
      ? leaf
        ? [{ ...leaf, depth: 0 }]
        : []
      : allHighlights.filter((item) => item.element.isConnected)
  const ancestorOutlines = mode === 'hover' ? liveChain.slice(0, -1) : []

  return (
    <div ref={overlayRef} className="devmode-overlay" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {ancestorOutlines.map((entry, i) => (
        <DevOutline key={`anc-${entry.name}-${i}`} element={entry.element} nested />
      ))}
      {items.map((item, i) => (
        <DevOverlayItem key={`${item.name}-${i}`} item={item} framework={framework} onInspect={onInspect} />
      ))}
    </div>
  )
}

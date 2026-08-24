// Dev-mode overlay: draws outlines + name chips over @odyssey/ui components,
// either on hover (mode: 'hover') or for the components on screen (mode:
// 'all', how deep set by `nesting` — top level only, drill in one level at a
// time via the chip expanders, or all levels at once). Renders nothing when
// dev mode is disabled.
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

// Depth-first walk from #root, building the FULL match list once:
//   { name, element, depth, parent, childCount }
// For each element, ask findUiComponentChain(el) and record every chain entry
// rooted AT el (a chain entry's `element` is the component's first host
// element, so "rooted at el" == that component starts here). `parent` is the
// nearest enclosing MATCH (maintained as an ancestor stack during the walk),
// `depth` is how many matches enclose it, `childCount` is how many DIRECT ui
// children it has — the number the progressive expander shows, so "+4" means
// "four chips will appear", not a count the user can't map to anything.
//
// Nesting is NOT applied here: the walk is mode-agnostic and visibleMatches()
// (pure, below) decides what actually renders. One walk, three views.
//
// ponytail: two known ceilings.
//   1. the walk visits every element under #root instead of pruning at each
//      match (which 'outermost' used to do), so it's O(elements) with a fiber
//      walk per element in every mode. Fine for a dev tool on a normal page;
//      if a huge table ever makes this stutter, memoize per-element chain
//      results between relayouts.
//   2. `parent` is DOM nesting, not fiber nesting — a portaled child is
//      chained to whatever DOM ancestor it lands under, not to the component
//      that rendered it. That's the right answer for this UI anyway (the
//      expander means "reveal the chips inside this chip's box").
function collectMatches(overlayEl) {
  const root = document.getElementById('root')
  if (!root) return []
  const skipZeroSize = hasRealLayout()
  const found = []

  function visit(el, parent) {
    if (overlayEl && overlayEl.contains(el)) return
    // Skip devmode-owned chrome (toggle cluster, detail modal) and its whole
    // subtree — see the data-devmode guard in the hover path below for why.
    if (el.closest('[data-devmode]')) return
    if (skipZeroSize) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
    }
    let innermost = parent
    for (const entry of findUiComponentChain(el)) {
      if (entry.element !== el) continue
      // Chain order is outer→inner, so successive entries rooted at the SAME
      // element nest into each other.
      const match = { name: entry.name, element: el, depth: innermost ? innermost.depth + 1 : 0, parent: innermost, childCount: 0 }
      found.push(match)
      innermost = match
    }
    for (const child of el.children) visit(child, innermost)
  }

  visit(root, null)
  for (const match of found) if (match.parent) match.parent.childCount += 1
  return found
}

// Which matches render, per nesting mode. Pure — no DOM, no store — so it's
// testable directly against a synthetic match list.
// `expanded` is a Set of ELEMENTS (see DevOverlay's state comment).
// Exporting a non-component costs this dev-only file its fast refresh; a
// separate module just to host one pure filter isn't worth the file.
// eslint-disable-next-line react-refresh/only-export-components
export function visibleMatches(matches, nesting, expanded) {
  if (nesting === 'all') return matches
  if (nesting !== 'progressive') return matches.filter((m) => m.depth === 0)
  // progressive: visible iff every ancestor match is expanded — so collapsing
  // a branch takes its whole subtree with it, not just its direct children.
  return matches.filter((m) => {
    for (let p = m.parent; p; p = p.parent) if (!expanded.has(p.element)) return false
    return true
  })
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

function DevOverlayItem({ item, framework, onInspect, expandable = false, isExpanded = false, onToggleExpand }) {
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
        {/* Its own button, and it stopPropagation()s: expanding a branch must
            never open the detail modal, while the chip body still does. */}
        {expandable && (
          <button
            type="button"
            className="devmode-chip__expander"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(item.element)
            }}
          >
            {isExpanded ? '−' : `+${item.childCount}`}
          </button>
        )}
      </div>
    </>
  )
}

export default function DevOverlay({ onInspect = () => {}, suppressed = false }) {
  const { enabled, mode, framework, nesting } = useDevMode()
  const overlayRef = useRef(null)
  const [hoverChain, setHoverChain] = useState([]) // [{ name, element }] outer→inner
  const [allMatches, setAllMatches] = useState([]) // [{ name, element, depth, parent, childCount }]
  // Which branches are drilled into, in 'progressive' nesting. Transient UI
  // state on purpose (not persisted, not in the store): it's about what you're
  // looking at right now, and a stored set of DOM elements is meaningless on
  // the next page anyway. Keyed by the ELEMENT rather than the match object —
  // matches are rebuilt from scratch on every relayout, so match identity
  // doesn't survive a scroll, while the element does.
  // ponytail: an element hosting two nested matches (a ui component whose root
  // host element IS its child's) expands both at once. Rare enough to accept;
  // the fix would be a composite key, which then needs its own stable id.
  const [expanded, setExpanded] = useState(() => new Set())

  const toggleExpand = useCallback((element) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(element)) next.add(element)
      return next
    })
  }, [])

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
      .then(() => setAllMatches((prev) => prev.slice()))
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
  //
  // `nesting` is deliberately NOT a dependency: the walk is mode-agnostic now
  // and switching nesting only re-runs the pure filter on the next render —
  // no re-walk, and expansion state survives a trip through 'all' and back.
  useEffect(() => {
    if (!enabled || mode !== 'all' || suppressed) return
    const relayout = () => {
      setAllMatches(collectMatches(overlayRef.current))
      // Drop expanded entries whose element left the DOM, so a long session
      // of route changes can't accumulate detached nodes in the Set. Same
      // `prev` back when nothing changed — no pointless re-render.
      setExpanded((prev) => {
        const live = new Set([...prev].filter((el) => el.isConnected))
        return live.size === prev.size ? prev : live
      })
    }
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
      setAllMatches([])
    }
  }, [enabled, mode, suppressed])

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
      : visibleMatches(allMatches, nesting, expanded).filter((item) => item.element.isConnected)
  const ancestorOutlines = mode === 'hover' ? liveChain.slice(0, -1) : []
  // Expanders only make sense in 'progressive' — the other two modes already
  // show everything they're ever going to show.
  const showExpanders = mode === 'all' && nesting === 'progressive'

  return (
    <div ref={overlayRef} className="devmode-overlay" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {ancestorOutlines.map((entry, i) => (
        <DevOutline key={`anc-${entry.name}-${i}`} element={entry.element} nested />
      ))}
      {items.map((item, i) => (
        <DevOverlayItem
          key={`${item.name}-${i}`}
          item={item}
          framework={framework}
          onInspect={onInspect}
          expandable={showExpanders && item.childCount > 0}
          isExpanded={expanded.has(item.element)}
          onToggleExpand={toggleExpand}
        />
      ))}
    </div>
  )
}

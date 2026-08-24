// Dev-mode fiber inspector — DOM node → outermost @odyssey/ui component name.
//
// ponytail: React-19 fiber-key walk (`__reactFiber$<id>`) via internal DOM
// properties. This is a deliberate prototype-only hack — tagging every
// component with data-* attributes was rejected (it would demote ~40
// components in the design system back to un-normalized). If React renames
// the `__reactFiber$` prefix in a future major, update FIBER_KEY_RE.
import * as UI from '@odyssey/ui'

const FIBER_KEY_RE = /^__reactFiber\$/

// Reverse map component reference → export name. Matching must key off the
// actual exported reference, not a name STRING: vite's prod build minifies
// function names (no keepNames), so `fiber.type.name` is empty on the
// deployed bundle — and even unminified, a same-named local component would
// spoof a string match. `fiber.type` is reference-equal to the namespace
// export because the workspace package bundles once. `Map.get` on a
// non-function `fiber.type` (e.g. a host string like 'div') is safely
// `undefined`, so no separate typeof guard is needed in the hot path.
//
// Module namespace objects (`import * as UI`) enumerate their keys
// ALPHABETICALLY (ECMA-262 module namespace exotic object [[OwnPropertyKeys]]
// sorts exported names) — NOT in source declaration order. So "keep the
// first entry per reference" would silently pick whichever alias sorts
// first alphabetically, not the canonical name (it only looked
// order-dependent-correct before because 'ComboBox' < 'SearchField').
// packages/ui/src/index.js has one alias line today (`SearchField` re-exports
// ComboBox.jsx's default, commented "former name — prefer ComboBox") — list
// it here and skip it explicitly. Add to this set whenever index.js adds
// another alias. gen-angular-names.mjs hardcodes the same set — keep in sync.
const DEPRECATED_ALIASES = new Set(['SearchField'])

const uiTypeToName = new Map()
for (const [name, comp] of Object.entries(UI)) {
  if (DEPRECATED_ALIASES.has(name)) continue
  if (!uiTypeToName.has(comp)) uiTypeToName.set(comp, name)
}

// Derived from the real package exports — never hand-typed, so it can't drift.
export const uiNameSet = new Set(uiTypeToName.values())

export function isUiComponentName(name) {
  return uiNameSet.has(name)
}

// Best-effort display name for an element's `type`, for rendering a prop
// value as `<Name/>`. @odyssey/ui components resolve by identity (survives
// minification); anything else falls back to the function name, which the
// prod build DOES mangle — hence the generic last resort.
export function elementTypeName(type) {
  if (typeof type === 'string') return type
  return uiTypeToName.get(type) || type?.displayName || type?.name || 'Component'
}

function getFiberKey(node) {
  return Object.keys(node).find((k) => FIBER_KEY_RE.test(k))
}

// Walk up parentElement for nodes without their own fiber key (portaled/odd
// nodes, e.g. a raw text node's host isn't queried directly by callers, but
// SVG children etc. can lack it in edge cases). Stops at document.body.
function getFiber(domNode) {
  let node = domNode
  while (node) {
    const key = getFiberKey(node)
    if (key) return node[key]
    if (node === document.body) return null
    node = node.parentElement
  }
  return null
}

// No forwardRef/memo components exist in packages/ui/src as of this writing
// (grep confirms) — every export's fiber.type is the plain function itself,
// so identity matching against uiTypeToName needs no object-type unwrapping.
// Add it here (map over .render / .type) if a forwardRef/memo component ever ships.

// First host (DOM) fiber at or below `fiber`, following only the child chain
// (first-rendered-element order), per spec.
// ponytail: doesn't follow portals (a child rendered via createPortal has no
// fiber `.child` link back into this tree) or a childless fiber — both fall
// through to `null`. Callers (Task 4) must null-check `element`.
function firstHostElement(fiber) {
  let f = fiber
  while (f) {
    if (f.stateNode instanceof Element) return f.stateNode
    f = f.child
  }
  return null
}

// Every @odyssey/ui FIBER enclosing `domNode`, OUTERMOST → INNERMOST. The
// return-chain walk visits ancestors innermost-first, so it's reversed once
// at the end. Fibers are never handed to React state by callers — React swaps
// `current`/`alternate` on every re-render, so a held fiber goes stale; re-walk
// from the DOM element instead.
function uiFiberChain(domNode) {
  const startFiber = getFiber(domNode)
  if (!startFiber) return []

  const chain = []
  for (let fiber = startFiber; fiber; fiber = fiber.return) {
    if (uiTypeToName.has(fiber.type)) chain.push(fiber)
  }
  return chain.reverse()
}

// Every @odyssey/ui component enclosing `domNode`, ordered OUTERMOST →
// INNERMOST: [{ name, element }].
// `element` may be null (portal / childless fiber — see firstHostElement) —
// callers must null-check, same contract as findUiComponent has always had.
export function findUiComponentChain(domNode) {
  return uiFiberChain(domNode).map((fiber) => ({
    name: uiTypeToName.get(fiber.type),
    element: firstHostElement(fiber),
  }))
}

export function findUiComponent(domNode) {
  return findUiComponentChain(domNode)[0] ?? null
}

// ── Parent → child relation: 'slot' | 'internal' | 'unknown' ────────────────
//
// Production-safe by construction: it reads only `memoizedProps` / `type`,
// never `_debugOwner` (which React strips from prod builds). The signal is
// props IDENTITY — an element passed INTO a component sits somewhere in that
// component's props, and the fiber React later builds from that element keeps
// the very same `props` object by reference. So: collect every element
// reachable in the parent's props, and look for one whose `type` matches the
// child's fiber and whose `props` IS the child's `memoizedProps`.
//
// Empirically verified (2026-08-23, React 19.2, jsdom) against real
// @odyssey/ui pairs: FormField→FieldSelect and EntityChip→IconButton report
// 'internal'; Button-in-PageHeader-children, Badge-in-Accordion-children and
// Button-in-ModalMedium-`footer` report 'slot'; all six agree with
// `_debugOwner` where dev builds expose it.
//
// ponytail: two known ceilings, both accepted rather than guessed around.
//   1. cloneElement() in an intermediate wrapper rebuilds props, so identity
//      breaks while the TYPE still matches → reported 'unknown' (verified).
//   2. an element created inside a render-prop callback the consumer passed in
//      is genuinely absent from the parent's props at commit time → reported
//      'internal', which is right by this definition (the parent's own render
//      created it) but may read as surprising. Upgrade path if it ever
//      matters: also scan function-valued props' *results*, which means
//      calling consumer code during inspection — not worth it for a dev tool.
const MAX_PROP_DEPTH = 12
const MAX_PROP_ELEMENTS = 500

// Duck-typed rather than compared against Symbol.for('react.element'): React
// renamed that symbol to 'react.transitional.element' in 19, and a dev tool
// shouldn't break on the next rename.
export function isReactElement(value) {
  return typeof value?.$$typeof === 'symbol' && value.props != null && 'type' in value
}

function collectElements(value, out, depth = 0) {
  if (depth > MAX_PROP_DEPTH || out.length >= MAX_PROP_ELEMENTS) return
  if (Array.isArray(value)) {
    for (const item of value) collectElements(item, out, depth + 1)
    return
  }
  if (!isReactElement(value)) return
  out.push(value)
  // Recurse through the element's OWN props too: a slot-passed subtree can
  // carry the match several levels down (`<div><Button/></div>` as children).
  for (const item of Object.values(value.props)) collectElements(item, out, depth + 1)
}

function relationBetween(parentFiber, childFiber) {
  const elements = []
  for (const value of Object.values(parentFiber.memoizedProps ?? {})) collectElements(value, elements)

  let typeMatched = false
  for (const el of elements) {
    if (el.type !== childFiber.type) continue
    if (el.props === childFiber.memoizedProps) return 'slot'
    typeMatched = true
  }
  // Type matched but identity didn't: something re-created the props between
  // the slot and the fiber (cloneElement). Honest answer is "can't tell".
  return typeMatched ? 'unknown' : 'internal'
}

// The full @odyssey/ui ancestry of `domNode`, OUTERMOST → INNERMOST:
//   [{ name, element, props, relation }]
// `relation` describes how the entry got into its PARENT entry (null on the
// outermost entry, which has no parent in this chain). `props` is the live
// resolved props of that specific instance — a SNAPSHOT, read at call time.
//
// Call this on modal open, never on the hover path: it walks the parents'
// whole props trees, and hover runs once per animation frame.
export function describeChain(domNode) {
  const fibers = uiFiberChain(domNode)
  return fibers.map((fiber, i) => ({
    name: uiTypeToName.get(fiber.type),
    element: firstHostElement(fiber),
    props: fiber.memoizedProps ?? null,
    relation: i === 0 ? null : safeRelation(fibers[i - 1], fiber),
  }))
}

// Props can hold anything a caller dreamed up (getters that throw, exotic
// proxies). A dev overlay must never take the app down with it.
function safeRelation(parentFiber, childFiber) {
  try {
    return relationBetween(parentFiber, childFiber)
  } catch {
    return 'unknown'
  }
}

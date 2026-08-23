// Dev-mode fiber inspector — DOM node → outermost @odyssey/ui component name.
//
// ponytail: React-18 fiber-key walk (`__reactFiber$<id>`) via internal DOM
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

// Every @odyssey/ui component enclosing `domNode`, ordered OUTERMOST →
// INNERMOST: [{ name, element }]. The return-chain walk visits ancestors
// innermost-first, so the collected list is reversed once at the end.
// `element` may be null (portal / childless fiber — see firstHostElement) —
// callers must null-check, same contract as findUiComponent has always had.
export function findUiComponentChain(domNode) {
  const startFiber = getFiber(domNode)
  if (!startFiber) return []

  const chain = []
  for (let fiber = startFiber; fiber; fiber = fiber.return) {
    if (uiTypeToName.has(fiber.type)) {
      chain.push({ name: uiTypeToName.get(fiber.type), element: firstHostElement(fiber) })
    }
  }
  return chain.reverse()
}

export function findUiComponent(domNode) {
  return findUiComponentChain(domNode)[0] ?? null
}

// Dev-mode fiber inspector — DOM node → outermost @odyssey/ui component name.
//
// ponytail: React-18 fiber-key walk (`__reactFiber$<id>`) via internal DOM
// properties. This is a deliberate prototype-only hack — tagging every
// component with data-* attributes was rejected (it would demote ~40
// components in the design system back to un-normalized). If React renames
// the `__reactFiber$` prefix in a future major, update FIBER_KEY_RE.
import * as UI from '@odyssey/ui'

const FIBER_KEY_RE = /^__reactFiber\$/

// Derived from the real package exports — never hand-typed, so it can't drift.
export const uiNameSet = new Set(Object.keys(UI))

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
// (grep confirms) — every export's fiber.type is a plain function, so name
// resolution is just displayName ?? name. Add object-type unwrapping here if
// a forwardRef/memo component ever ships.
function componentName(type) {
  return typeof type === 'function' ? (type.displayName ?? type.name) : null
}

// First host (DOM) fiber at or below `fiber`, following only the child chain
// (first-rendered-element order), per spec.
function firstHostElement(fiber) {
  let f = fiber
  while (f) {
    if (f.stateNode instanceof Element) return f.stateNode
    f = f.child
  }
  return null
}

export function findUiComponent(domNode) {
  const startFiber = getFiber(domNode)
  if (!startFiber) return null

  let match = null
  for (let fiber = startFiber; fiber; fiber = fiber.return) {
    if (isUiComponentName(componentName(fiber.type))) match = fiber
  }
  if (!match) return null

  return { name: componentName(match.type), element: firstHostElement(match) }
}

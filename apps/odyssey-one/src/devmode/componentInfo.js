// Dev-mode component metadata: merges the React DSM demo meta with the
// statically-generated Angular port map (tiny JSON, cheap to import eagerly).
//
// componentInfo.js does NOT import the demo files itself at module scope —
// `import.meta.glob(...)` without `eager: true` only builds a
// { path: () => import(...) } map at module-eval time (no chunk load); the
// actual dynamic import() calls happen on first getComponentInfo() /
// preloadComponentInfo() call. Note DesignSystem.jsx currently imports these
// SAME demo files eagerly (it's statically imported from App.jsx), so this
// doesn't shrink today's bundle — it just avoids componentInfo.js ADDING its
// own eager dependency, and becomes real savings if the DSM route ever goes
// lazy.
import angularMap from './angular-map.json'

const demoLoaders = import.meta.glob('../routes/design-system/demos/*.demo.jsx')

// null value ⇒ Task 7 (publish Angular DSM) hasn't landed yet; dsmUrl()
// returns null for 'angular' until this is filled in.
export const ANGULAR_DSM_URL = null

let indexPromise = null
let resolvedIndex = null // set once loadDemoIndex() resolves; powers the sync read path

function loadDemoIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all(Object.values(demoLoaders).map((load) => load()))
      .then((modules) => {
        const index = new Map()
        for (const mod of modules) {
          if (mod?.meta?.name) index.set(mod.meta.name, mod)
        }
        resolvedIndex = index
        return index
      })
      .catch((e) => {
        // Don't poison every future call with one bad import (e.g. a stale
        // chunk reference across a redeploy) — let the next call retry.
        indexPromise = null
        throw e
      })
  }
  return indexPromise
}

// Kicks off the lazy demo-index load without waiting on it — call this early
// (e.g. when dev mode is enabled) so getComponentInfoSync() has data by the
// time the overlay actually needs it. Returns the same promise as the first
// getComponentInfo() call would await, for callers that do want to await it.
export function preloadComponentInfo() {
  return loadDemoIndex()
}

function buildReactInfo(demo) {
  return demo
    ? {
        tier: demo.meta.tier,
        version: demo.meta.version,
        normalizing: demo.meta.normalizing ?? false,
        props: demo.props || [],
        // No demo carries a standalone "description" field (checked both
        // collectDemos.js's entry shape and every demo module) — omitted
        // rather than invented.
      }
    : null
}

function buildAngularInfo(name) {
  const angularEntry = angularMap[name] || null
  return angularEntry
    ? { selector: angularEntry.selector, version: angularEntry.version, normalizing: angularEntry.normalizing }
    : null
}

// { name, react: {...}|null, angular: {...}|null, ported: boolean }
export async function getComponentInfo(name) {
  const index = await loadDemoIndex()
  return { name, react: buildReactInfo(index.get(name)), angular: buildAngularInfo(name), ported: Boolean(angularMap[name]) }
}

// Sync counterpart for the overlay (Task 4): angular side + ported always
// resolve immediately (static JSON); react side is null until the demo index
// has actually loaded — call preloadComponentInfo() to kick that off, or just
// let a prior getComponentInfo() call have warmed it.
export function getComponentInfoSync(name) {
  return { name, react: resolvedIndex ? buildReactInfo(resolvedIndex.get(name)) : null, angular: buildAngularInfo(name), ported: Boolean(angularMap[name]) }
}

// DesignSystem.jsx deep-links a component via `#comp-<Name>` on /design-system
// (see its hashchange effect). Mirror that scheme here.
export function dsmUrl(name, framework) {
  if (framework === 'react') return `/design-system#comp-${encodeURIComponent(name)}`
  if (framework === 'angular') return ANGULAR_DSM_URL ? `${ANGULAR_DSM_URL}#comp-${encodeURIComponent(name)}` : null
  return null
}

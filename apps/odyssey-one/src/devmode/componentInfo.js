// Dev-mode component metadata: merges the React DSM demo meta (lazy — only
// loaded once dev mode actually asks) with the statically-generated Angular
// port map (tiny JSON, cheap to import eagerly).
//
// React demo files are NOT imported eagerly here — dev mode is opt-in and
// this ~80-file chunk must not land in the normal-user bundle. `import.meta
// .glob` without `eager: true` only builds a { path: () => import(...) } map
// at module-eval time (no chunk load); the actual dynamic import() calls
// happen on first getComponentInfo() call and are cached after that.
import angularMap from './angular-map.json'

const demoLoaders = import.meta.glob('../routes/design-system/demos/*.demo.jsx')

// null value ⇒ Task 7 (publish Angular DSM) hasn't landed yet; dsmUrl()
// returns null for 'angular' until this is filled in.
export const ANGULAR_DSM_URL = null

let indexPromise = null

function loadDemoIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all(Object.values(demoLoaders).map((load) => load())).then((modules) => {
      const index = new Map()
      for (const mod of modules) {
        if (mod?.meta?.name) index.set(mod.meta.name, mod)
      }
      return index
    })
  }
  return indexPromise
}

// { name, react: {...}|null, angular: {...}|null, ported: boolean }
export async function getComponentInfo(name) {
  const index = await loadDemoIndex()
  const demo = index.get(name)

  const react = demo
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

  const angularEntry = angularMap[name] || null
  const angular = angularEntry
    ? { selector: angularEntry.selector, version: angularEntry.version, normalizing: angularEntry.normalizing }
    : null

  return { name, react, angular, ported: angular !== null }
}

// DesignSystem.jsx deep-links a component via `#comp-<Name>` on /design-system
// (see its hashchange effect). Mirror that scheme here.
export function dsmUrl(name, framework) {
  if (framework === 'react') return `/design-system#comp-${encodeURIComponent(name)}`
  if (framework === 'angular') return ANGULAR_DSM_URL ? `${ANGULAR_DSM_URL}#comp-${encodeURIComponent(name)}` : null
  return null
}

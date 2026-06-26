// Pure helper for the design-system explorer. Takes the object returned by
// import.meta.glob('./demos/*.demo.jsx', { eager: true }) — a map of
// file path → module ({ meta, props?, tokens?, default }) — and returns the
// three tiers in canonical order, each with its demos sorted by name.
//
// Kept pure (no import.meta, no React) so it unit-tests in the node Vitest env.

export const TIERS = [
  { key: 'atom', label: 'Atoms' },
  { key: 'molecule', label: 'Molecules' },
  { key: 'organism', label: 'Organisms' },
]

const TIER_KEYS = new Set(TIERS.map((t) => t.key))

// Shared shape used by both the tier buckets and the Normalize panel.
function toEntry(mod) {
  return {
    meta: mod.meta,
    props: mod.props || [],
    tokens: mod.tokens || [],
    Component: mod.default,
  }
}

// A normalizing demo still carries a real tier (so it can return to it on
// approval) — validate it the same way, just don't require a valid tier when
// none is present yet.
function assertValidMeta(path, meta) {
  if (!meta || !meta.name) {
    throw new Error(`Demo ${path} is missing a meta.name export`)
  }
  if (!TIER_KEYS.has(meta.tier)) {
    throw new Error(
      `Demo ${path} has invalid meta.tier "${meta.tier}" (expected atom|molecule|organism)`
    )
  }
}

export function groupDemosByTier(modules) {
  const buckets = new Map(TIERS.map((t) => [t.key, []]))

  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod && mod.meta
    assertValidMeta(path, meta)
    // In-progress components live only in the Normalize panel — keep them out of
    // their tier bucket until the flag is removed (post-approval).
    if (meta.normalizing === true) continue
    buckets.get(meta.tier).push(toEntry(mod))
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => a.meta.name.localeCompare(b.meta.name))
  }

  return TIERS.map((t) => ({ ...t, demos: buckets.get(t.key) }))
}

export const DOMAINS = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'Home' },
  { key: 'orders', label: 'Orders' },
  { key: 'shipments', label: 'Shipments' },
  { key: 'carriers', label: 'Carriers' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'users', label: 'Users' },
  { key: 'global-search', label: 'Global Search' },
  { key: 'shared', label: 'Shared' },
]

// True if the component should show under the active domain. 'all' shows everything.
export function inDomain(usage, domain, name) {
  return domain === 'all' || (usage[domain]?.includes(name) ?? false)
}

export function filterDemosByDomain(demos, usage, domain) {
  if (domain === 'all') return demos
  return demos.filter((d) => inDomain(usage, domain, d.meta.name))
}

export function filterTiersByDomain(tiers, usage, domain) {
  if (domain === 'all') return tiers
  return tiers.map((t) => ({ ...t, demos: filterDemosByDomain(t.demos, usage, domain) }))
}

// Returns the demos currently flagged meta.normalizing === true, name-sorted,
// in the same entry shape as a tier's demos.
export function collectNormalizing(modules) {
  const out = []

  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod && mod.meta
    assertValidMeta(path, meta)
    if (meta.normalizing === true) out.push(toEntry(mod))
  }

  out.sort((a, b) => a.meta.name.localeCompare(b.meta.name))
  return out
}

// ── Versioning ──────────────────────────────────────────────────────────────
// Each demo meta may carry version: "x.y.z" — the @oneodyssey/ui release it was
// created or last changed in. "Latest" = the semver-max across all demos.

function parseVersion(v) {
  return String(v).split('.').map((n) => parseInt(n, 10) || 0)
}

function cmpVersion(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0)
  }
  return 0
}

// Highest version across a flat demo list, or null if none carry one.
export function latestVersion(demos) {
  let max = null
  for (const d of demos) {
    const v = d.meta && d.meta.version
    if (!v) continue
    if (max === null || cmpVersion(v, max) > 0) max = v
  }
  return max
}

// Keep only demos whose version === latest. No-op when latest is falsy.
export function filterTiersByLatest(tiers, latest) {
  if (!latest) return tiers
  return tiers.map((t) => ({ ...t, demos: t.demos.filter((d) => d.meta.version === latest) }))
}

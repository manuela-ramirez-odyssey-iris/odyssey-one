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

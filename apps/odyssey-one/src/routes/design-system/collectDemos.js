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

export function groupDemosByTier(modules) {
  const buckets = new Map(TIERS.map((t) => [t.key, []]))

  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod && mod.meta
    if (!meta || !meta.name) {
      throw new Error(`Demo ${path} is missing a meta.name export`)
    }
    if (!TIER_KEYS.has(meta.tier)) {
      throw new Error(
        `Demo ${path} has invalid meta.tier "${meta.tier}" (expected atom|molecule|organism)`
      )
    }
    buckets.get(meta.tier).push({
      meta,
      props: mod.props || [],
      tokens: mod.tokens || [],
      Component: mod.default,
    })
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => a.meta.name.localeCompare(b.meta.name))
  }

  return TIERS.map((t) => ({ ...t, demos: buckets.get(t.key) }))
}

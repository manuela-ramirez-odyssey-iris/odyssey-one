import { describe, it, expect, test } from 'vitest'
import { TIERS, groupDemosByTier, collectNormalizing, DOMAINS, filterTiersByDomain, filterDemosByDomain, allVersions, filterTiersByVersion, filterTiersBySearch, filterDemosBySearch } from './collectDemos.js'

// Minimal fake of the import.meta.glob({ eager: true }) result:
// { '<path>': { meta, props?, tokens?, default } }
function fakeModule(name, tier, extra = {}) {
  return { meta: { name, tier }, default: () => null, ...extra }
}

describe('groupDemosByTier', () => {
  it('returns all three tiers in canonical order, even when empty', () => {
    const result = groupDemosByTier({})
    expect(result.map((t) => t.key)).toEqual(['atom', 'molecule', 'organism'])
    expect(result.every((t) => t.demos.length === 0)).toBe(true)
  })

  it('buckets demos into their tier', () => {
    const result = groupDemosByTier({
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
      './demos/FormField.demo.jsx': fakeModule('FormField', 'molecule'),
      './demos/Navbar.demo.jsx': fakeModule('Navbar', 'organism'),
    })
    expect(result.find((t) => t.key === 'atom').demos.map((d) => d.meta.name)).toEqual(['Button'])
    expect(result.find((t) => t.key === 'molecule').demos.map((d) => d.meta.name)).toEqual(['FormField'])
    expect(result.find((t) => t.key === 'organism').demos.map((d) => d.meta.name)).toEqual(['Navbar'])
  })

  it('sorts demos alphabetically by name within a tier', () => {
    const result = groupDemosByTier({
      './demos/Radio.demo.jsx': fakeModule('Radio', 'atom'),
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
      './demos/Checkbox.demo.jsx': fakeModule('Checkbox', 'atom'),
    })
    expect(result.find((t) => t.key === 'atom').demos.map((d) => d.meta.name)).toEqual([
      'Button', 'Checkbox', 'Radio',
    ])
  })

  it('defaults missing props/tokens to empty arrays and carries the Component', () => {
    const cmp = () => null
    const result = groupDemosByTier({
      './demos/Button.demo.jsx': { meta: { name: 'Button', tier: 'atom' }, default: cmp },
    })
    const demo = result.find((t) => t.key === 'atom').demos[0]
    expect(demo.props).toEqual([])
    expect(demo.tokens).toEqual([])
    expect(demo.Component).toBe(cmp)
  })

  it('throws on an invalid tier', () => {
    expect(() =>
      groupDemosByTier({ './demos/X.demo.jsx': fakeModule('X', 'gizmo') })
    ).toThrow(/invalid meta\.tier/)
  })

  it('throws when meta.name is missing', () => {
    expect(() =>
      groupDemosByTier({ './demos/X.demo.jsx': { meta: { tier: 'atom' }, default: () => null } })
    ).toThrow(/missing a meta\.name/)
  })

  it('excludes a normalizing demo from its tier bucket', () => {
    const result = groupDemosByTier({
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
      './demos/Badge.demo.jsx': fakeModule('Badge', 'atom', { meta: { name: 'Badge', tier: 'atom', normalizing: true } }),
    })
    expect(result.find((t) => t.key === 'atom').demos.map((d) => d.meta.name)).toEqual(['Button'])
  })

  it('exposes the tier labels', () => {
    expect(TIERS).toEqual([
      { key: 'atom', label: 'Atoms' },
      { key: 'molecule', label: 'Molecules' },
      { key: 'organism', label: 'Organisms' },
    ])
  })
})

describe('collectNormalizing', () => {
  it('returns demos flagged normalizing, in the tier-entry shape', () => {
    const cmp = () => null
    const result = collectNormalizing({
      './demos/Badge.demo.jsx': {
        meta: { name: 'Badge', tier: 'atom', normalizing: true },
        default: cmp,
      },
    })
    expect(result).toHaveLength(1)
    expect(result[0].meta.name).toBe('Badge')
    expect(result[0].props).toEqual([])
    expect(result[0].tokens).toEqual([])
    expect(result[0].Component).toBe(cmp)
  })

  it('does not return a normal (non-normalizing) demo', () => {
    const result = collectNormalizing({
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
    })
    expect(result).toEqual([])
  })

  it('sorts normalizing demos alphabetically by name', () => {
    const result = collectNormalizing({
      './demos/Radio.demo.jsx': { meta: { name: 'Radio', tier: 'atom', normalizing: true }, default: () => null },
      './demos/Badge.demo.jsx': { meta: { name: 'Badge', tier: 'molecule', normalizing: true }, default: () => null },
    })
    expect(result.map((d) => d.meta.name)).toEqual(['Badge', 'Radio'])
  })

  it('returns an empty array when nothing is in progress', () => {
    expect(collectNormalizing({
      './demos/Button.demo.jsx': fakeModule('Button', 'atom'),
      './demos/FormField.demo.jsx': fakeModule('FormField', 'molecule'),
    })).toEqual([])
  })

  it('still validates meta on normalizing demos', () => {
    expect(() =>
      collectNormalizing({ './demos/X.demo.jsx': { meta: { tier: 'atom', normalizing: true }, default: () => null } })
    ).toThrow(/missing a meta\.name/)
  })
})

const usage = { orders: ['Button', 'EmptyState'], shipments: ['PageHeader'] }
const tiers = [
  { key: 'atom', label: 'Atoms', demos: [
    { meta: { name: 'Button' } }, { meta: { name: 'Badge' } }, { meta: { name: 'EmptyState' } },
  ] },
]

test('DOMAINS lists All first then the domains incl. Shared', () => {
  expect(DOMAINS[0]).toEqual({ key: 'all', label: 'All' })
  expect(DOMAINS.map((d) => d.key)).toEqual(
    ['all', 'home', 'orders', 'shipments', 'carriers', 'tracking', 'users', 'global-search', 'shared'])
})

test('filterTiersByDomain: all returns every demo', () => {
  const out = filterTiersByDomain(tiers, usage, 'all')
  expect(out[0].demos.map((d) => d.meta.name)).toEqual(['Button', 'Badge', 'EmptyState'])
})

test('filterTiersByDomain: orders keeps only orders demos', () => {
  const out = filterTiersByDomain(tiers, usage, 'orders')
  expect(out[0].demos.map((d) => d.meta.name)).toEqual(['Button', 'EmptyState'])
})

test('filterDemosByDomain: unknown domain → empty', () => {
  expect(filterDemosByDomain(tiers[0].demos, usage, 'carriers')).toEqual([])
})

describe('allVersions', () => {
  it('returns distinct versions, semver-sorted descending (newest first)', () => {
    expect(allVersions([
      { meta: { name: 'A', version: '0.2.0' } },
      { meta: { name: 'B', version: '0.3.0' } },
      { meta: { name: 'C', version: '0.1.0' } },
      { meta: { name: 'D', version: '0.2.0' } },
    ])).toEqual(['0.3.0', '0.2.0', '0.1.0'])
  })

  it('ignores demos without a version (staging/normalizing)', () => {
    expect(allVersions([
      { meta: { name: 'A', version: '0.2.0' } },
      { meta: { name: 'B' } },
    ])).toEqual(['0.2.0'])
  })

  it('returns an empty list when no demo has a version', () => {
    expect(allVersions([{ meta: { name: 'A' } }])).toEqual([])
  })

  it('sorts numerically, not lexically (0.10.0 > 0.9.0)', () => {
    expect(allVersions([
      { meta: { name: 'A', version: '0.9.0' } },
      { meta: { name: 'B', version: '0.10.0' } },
    ])).toEqual(['0.10.0', '0.9.0'])
  })

  it('collects createdVersion over version (creation release, not last-modified)', () => {
    expect(allVersions([
      // Modified in 0.5.0 but created in 0.2.0 → the dropdown lists 0.2.0
      { meta: { name: 'A', version: '0.5.0', createdVersion: '0.2.0' } },
      // No createdVersion (pre-backfill meta) → falls back to version
      { meta: { name: 'B', version: '0.3.0' } },
    ])).toEqual(['0.3.0', '0.2.0'])
  })
})

describe('filterTiersByVersion', () => {
  const tiered = [
    { key: 'atom', label: 'Atoms', demos: [
      { meta: { name: 'New', version: '0.3.0' } },
      { meta: { name: 'Old', version: '0.2.0' } },
      // Created in 0.2.0, last modified in 0.3.0 — filters as a 0.2.0 component
      { meta: { name: 'Veteran', version: '0.3.0', createdVersion: '0.2.0' } },
      { meta: { name: 'Unstamped' } },
    ] },
  ]
  it('keeps only demos created in the selected version', () => {
    const out = filterTiersByVersion(tiered, '0.3.0')
    expect(out[0].demos.map((d) => d.meta.name)).toEqual(['New'])
  })
  it('resolves createdVersion over version (last-modified stamp is ignored)', () => {
    const out = filterTiersByVersion(tiered, '0.2.0')
    expect(out[0].demos.map((d) => d.meta.name)).toEqual(['Old', 'Veteran'])
  })
  it('drops unstamped demos when a version is selected', () => {
    const out = filterTiersByVersion(tiered, '0.2.0')
    expect(out[0].demos.map((d) => d.meta.name)).not.toContain('Unstamped')
  })
  it("returns tiers unchanged for 'all' (the dropdown default)", () => {
    expect(filterTiersByVersion(tiered, 'all')).toBe(tiered)
  })
  it('returns tiers unchanged for a falsy version', () => {
    expect(filterTiersByVersion(tiered, null)).toBe(tiered)
  })
})

describe('filterDemosBySearch / filterTiersBySearch', () => {
  const searchTiers = [
    { key: 'atom', label: 'Atoms', demos: [
      { meta: { name: 'Button' } }, { meta: { name: 'Badge' } },
    ] },
    { key: 'molecule', label: 'Molecules', demos: [
      { meta: { name: 'FormField' } }, { meta: { name: 'ButtonToggle' } },
    ] },
    { key: 'organism', label: 'Organisms', demos: [
      { meta: { name: 'Navbar' } },
    ] },
  ]

  it('returns the input unchanged for a blank query (no-op, like the other filters)', () => {
    expect(filterTiersBySearch(searchTiers, '')).toBe(searchTiers)
    expect(filterTiersBySearch(searchTiers, '   ')).toBe(searchTiers)
    const demos = searchTiers[0].demos
    expect(filterDemosBySearch(demos, '')).toBe(demos)
  })

  it('narrows each tier IN PLACE, keeping the tier structure + order', () => {
    const result = filterTiersBySearch(searchTiers, 'bad')
    expect(result.map((t) => t.key)).toEqual(['atom', 'molecule', 'organism'])
    expect(result.map((t) => t.demos.map((d) => d.meta.name))).toEqual([
      ['Badge'], [], [],
    ])
  })

  it('matches case-insensitively on substrings', () => {
    const result = filterTiersBySearch(searchTiers, 'BUTTON')
    expect(result[0].demos.map((d) => d.meta.name)).toEqual(['Button'])
    expect(result[1].demos.map((d) => d.meta.name)).toEqual(['ButtonToggle'])
  })

  it('empties every tier when nothing matches', () => {
    const result = filterTiersBySearch(searchTiers, 'zzz')
    expect(result.every((t) => t.demos.length === 0)).toBe(true)
  })

  it('filterDemosBySearch matches a flat demo list (the Normalizing tier)', () => {
    const normalizing = [{ meta: { name: 'BadgeGroup' } }, { meta: { name: 'Navbar' } }]
    expect(filterDemosBySearch(normalizing, 'badge').map((d) => d.meta.name)).toEqual(['BadgeGroup'])
  })
})

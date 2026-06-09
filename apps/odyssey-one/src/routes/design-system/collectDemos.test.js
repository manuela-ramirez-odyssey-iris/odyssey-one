import { describe, it, expect } from 'vitest'
import { TIERS, groupDemosByTier } from './collectDemos.js'

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

  it('exposes the tier labels', () => {
    expect(TIERS).toEqual([
      { key: 'atom', label: 'Atoms' },
      { key: 'molecule', label: 'Molecules' },
      { key: 'organism', label: 'Organisms' },
    ])
  })
})

// GroupTable pure helpers — node env (no DOM), vitest globals.
import { alignClass, isGroupExpanded, groupHeaderValue } from './GroupTable.jsx'

describe('alignClass', () => {
  it('maps right/center to the modifier classes', () => {
    expect(alignClass('right')).toBe('odyssey-group-table__cell--right')
    expect(alignClass('center')).toBe('odyssey-group-table__cell--center')
  })

  it('defaults to left (empty string) for undefined or "left"', () => {
    expect(alignClass(undefined)).toBe('')
    expect(alignClass('left')).toBe('')
  })
})

describe('isGroupExpanded', () => {
  it('falls back to defaultExpanded when the group has no override', () => {
    expect(isGroupExpanded({}, true, 'g1')).toBe(true)
    expect(isGroupExpanded({}, false, 'g1')).toBe(false)
  })

  it('a per-group override wins over the default', () => {
    expect(isGroupExpanded({ g1: false }, true, 'g1')).toBe(false)
    expect(isGroupExpanded({ g1: true }, false, 'g1')).toBe(true)
  })

  it('other groups are unaffected by an override', () => {
    expect(isGroupExpanded({ g1: false }, true, 'g2')).toBe(true)
  })
})

describe('groupHeaderValue', () => {
  it('returns the value from group.values when present', () => {
    const group = { id: 'g1', label: 'G1', rows: [], values: { ap: '$1,240.00', ar: '$1,350.00' } }
    expect(groupHeaderValue(group, 'ap')).toBe('$1,240.00')
    expect(groupHeaderValue(group, 'ar')).toBe('$1,350.00')
  })

  it('returns empty string for a key absent from group.values', () => {
    const group = { id: 'g1', label: 'G1', rows: [], values: { ap: '$1,240.00' } }
    expect(groupHeaderValue(group, 'diff')).toBe('')
  })

  it('returns empty string when group.values is not provided (label-only header style)', () => {
    const group = { id: 'g1', label: 'G1', rows: [] }
    expect(groupHeaderValue(group, 'ap')).toBe('')
  })

  it('returns empty string when group.values is explicitly undefined', () => {
    const group = { id: 'g1', label: 'G1', rows: [], values: undefined }
    expect(groupHeaderValue(group, 'ap')).toBe('')
  })

  it('passes through non-string values (nodes, numbers) unchanged', () => {
    const node = { type: 'span' }  // mock React node
    const group = { id: 'g1', label: 'G1', rows: [], values: { diff: node } }
    expect(groupHeaderValue(group, 'diff')).toBe(node)
  })
})

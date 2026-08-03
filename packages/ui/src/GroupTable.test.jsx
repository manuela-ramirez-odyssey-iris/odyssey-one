// GroupTable pure helpers — node env (no DOM), vitest globals.
import { alignClass, isGroupExpanded, groupHeaderValue, totalColumnCount, actionToneClass, ACTION_TONES } from './GroupTable.jsx'

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

describe('totalColumnCount', () => {
  const cols = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]

  it('is just the column count when there is no pinned action column', () => {
    expect(totalColumnCount(cols, false)).toBe(3)
  })

  it('counts the pinned action column — the nested table must span it too', () => {
    expect(totalColumnCount(cols, true)).toBe(4)
  })

  it('defaults to no columns and no action column', () => {
    expect(totalColumnCount()).toBe(0)
  })
})

describe('actionToneClass', () => {
  it('maps every shipped tone to its modifier class', () => {
    expect(ACTION_TONES).toEqual(['danger', 'warning', 'success', 'info'])
    for (const tone of ACTION_TONES) {
      expect(actionToneClass(tone)).toBe(`odyssey-group-table__cell--tone-${tone}`)
    }
  })

  it('returns no class when the group carries no tone', () => {
    expect(actionToneClass(undefined)).toBe('')
    expect(actionToneClass(null)).toBe('')
  })

  it('degrades an unknown tone to neutral rather than a class with no styles', () => {
    expect(actionToneClass('chartreuse')).toBe('')
    expect(actionToneClass('DANGER')).toBe('')
  })
})

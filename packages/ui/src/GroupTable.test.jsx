// GroupTable pure helpers — node env (no DOM), vitest globals.
import { alignClass, isGroupExpanded } from './GroupTable.jsx'

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

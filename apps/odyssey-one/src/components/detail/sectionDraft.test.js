import { describe, expect, it } from 'vitest'
import { isDirty, startEdit } from './sectionDraft'

describe('startEdit', () => {
  it('captures draft and baseline as separate objects', () => {
    const edit = startEdit('general', { mode: 'LTL' })
    expect(edit.section).toBe('general')
    expect(edit.draft).toEqual({ mode: 'LTL' })
    expect(edit.baseline).toEqual({ mode: 'LTL' })
    // Mutating the draft must not reach the baseline, or dirty is always false.
    edit.draft.mode = 'TL'
    expect(edit.baseline.mode).toBe('LTL')
  })
})

describe('isDirty', () => {
  it('is false for an untouched draft', () => {
    expect(isDirty(startEdit('general', { mode: 'LTL', volume: '200 cuft' }))).toBe(false)
  })

  it('is true once any value differs', () => {
    const edit = startEdit('general', { mode: 'LTL' })
    expect(isDirty({ ...edit, draft: { mode: 'TL' } })).toBe(true)
  })

  it('is false when a value is edited and then edited back', () => {
    const edit = startEdit('general', { mode: 'LTL' })
    expect(isDirty({ ...edit, draft: { mode: 'TL' } })).toBe(true)
    expect(isDirty({ ...edit, draft: { mode: 'LTL' } })).toBe(false)
  })

  it('is true when a reference row is added', () => {
    const edit = startEdit('references', { L1: [{ id: 'a', type: 'PO Number', value: 'x' }] })
    expect(isDirty({ ...edit, draft: { L1: [{ id: 'a', type: 'PO Number', value: 'x' }, { id: 'b', type: '', value: '' }] } })).toBe(true)
  })

  it('is false for a null edit', () => {
    expect(isDirty(null)).toBe(false)
  })
})

import { describe, test, expect } from 'vitest'
import { narrowSuggestionSections } from './adapter-core'

const sections = [
  { title: 'What is it?', items: [
    { key: 'origin', kind: 'attribute', label: 'Origin' },
    { key: 'scac', kind: 'attribute', label: 'SCAC' },
  ] },
  { title: 'Filter by date', items: [{ key: 'date-pickup', kind: 'date', label: 'Pickup Date' }] },
  { title: 'Only excluded', items: [{ key: 'seal', kind: 'attribute', label: 'Seal Number' }] },
]

describe('narrowSuggestionSections', () => {
  test('no allow-list → sections untouched (same reference)', () => {
    expect(narrowSuggestionSections(sections, null)).toBe(sections)
    expect(narrowSuggestionSections(sections, undefined)).toBe(sections)
  })
  test('keeps allowed attribute items, keeps non-attribute items, drops emptied sections', () => {
    const out = narrowSuggestionSections(sections, ['origin'])
    expect(out).toEqual([
      { title: 'What is it?', items: [{ key: 'origin', kind: 'attribute', label: 'Origin' }] },
      { title: 'Filter by date', items: [{ key: 'date-pickup', kind: 'date', label: 'Pickup Date' }] },
    ])
  })
})

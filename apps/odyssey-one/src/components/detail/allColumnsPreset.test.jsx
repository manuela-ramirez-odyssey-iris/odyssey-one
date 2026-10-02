// @vitest-environment jsdom
// The "All Columns" Odyssey preset exists so Jana can demo the grid with every
// column on. Its whole value is being EXHAUSTIVE, and that is exactly the
// property a hand-maintained list loses first — the same drift that put three
// columns out of reach in 2026-08-05 (see lateAddedColumns.test.jsx). These
// tests fail the moment the preset stops covering the catalog, so a column
// appended to ALL_COLUMNS can never quietly go missing from the demo view.
import { describe, test, expect } from 'vitest'
import { ALL_COLUMNS, STANDARD_COLUMNS, PRESETS } from './ColumnPanel.jsx'

const allColumnsPreset = PRESETS.odyssey.find((p) => p.id === 'all-columns')

describe('All Columns preset', () => {
  test('ships in the Odyssey (read-only) group, not the user-editable one', () => {
    expect(allColumnsPreset).toBeTruthy()
    expect(PRESETS.custom.map((p) => p.id)).not.toContain('all-columns')
  })

  // Every column the picker offers outside consolidate mode — the
  // consolidationOnly ones (S165, Ramesh #4/#5) are blank there by design.
  test('contains every column id in the catalog', () => {
    expect(allColumnsPreset.columns).toEqual(ALL_COLUMNS.filter((c) => !c.consolidationOnly).map((c) => c.key))
    expect(allColumnsPreset.columns).toEqual(STANDARD_COLUMNS.map((c) => c.key))
  })

  test('lists no column twice and none the catalog does not define', () => {
    const catalog = new Set(ALL_COLUMNS.map((c) => c.key))
    expect(new Set(allColumnsPreset.columns).size).toBe(allColumnsPreset.columns.length)
    for (const key of allColumnsPreset.columns) expect(catalog.has(key)).toBe(true)
  })
})

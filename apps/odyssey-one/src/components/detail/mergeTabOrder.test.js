// @vitest-environment jsdom
// Fix D (LINX-11786, 2026-08-10). `mergeTabOrder` is the merge layer between a
// STORED tab-order preference and the live TABS list — same shape/intent as
// ColumnPanel.jsx's `mergeLateAddedColumns` (see lateAddedColumns.test.jsx).
// A stored order can predate a tab shipped later (SpotBoard/S104) or
// reference one since removed, and must never be able to un-pin Orders
// (TabArrangementPanel.jsx's PINNED_KEY, DEC-42).
import { describe, test, expect } from 'vitest'
import { mergeTabOrder, DEFAULT_TAB_ORDER, TABS } from './BottomBar.jsx'

describe('mergeTabOrder', () => {
  test('no stored preference falls back to the full default order', () => {
    expect(mergeTabOrder(undefined)).toEqual(DEFAULT_TAB_ORDER)
    expect(mergeTabOrder(null)).toEqual(DEFAULT_TAB_ORDER)
    expect(mergeTabOrder([])).toEqual(DEFAULT_TAB_ORDER)
  })

  test('a stored order missing a newly-added tab still yields that tab (appended)', () => {
    // Simulates a save from before 'spot' (SpotBoard) existed.
    const stale = DEFAULT_TAB_ORDER.filter((k) => k !== 'spot')
    const merged = mergeTabOrder(stale)
    expect(merged).toContain('spot')
    // Everything the user DID arrange is preserved in their chosen relative order.
    expect(merged.filter((k) => k !== 'spot')).toEqual(stale)
  })

  test('an unknown/removed tab key is dropped, not carried forward', () => {
    const stale = ['order', 'product', 'stops', 'a-retired-tab', 'cost', 'instructions', 'documents', 'notes', 'history', 'tender', 'routing', 'spot']
    const merged = mergeTabOrder(stale)
    expect(merged).not.toContain('a-retired-tab')
    for (const k of TABS.map((t) => t.key)) expect(merged).toContain(k)
  })

  test('Orders is forced first even if the stored order tries to move or drop it', () => {
    const movedLast = [...DEFAULT_TAB_ORDER.filter((k) => k !== 'order'), 'order']
    expect(mergeTabOrder(movedLast)[0]).toBe('order')

    const dropped = DEFAULT_TAB_ORDER.filter((k) => k !== 'order')
    expect(mergeTabOrder(dropped)[0]).toBe('order')
  })

  test('a well-formed, up-to-date stored order round-trips unchanged', () => {
    const reordered = ['order', 'spot', 'product', 'stops', 'routing', 'cost', 'instructions', 'documents', 'notes', 'history', 'tender']
    expect(mergeTabOrder(reordered)).toEqual(reordered)
  })

  // A tab absent from the stored order is ambiguous by itself: it could be
  // one the user deliberately UNCHECKED (TabArrangementPanel's pre-existing
  // hide feature — "hidden = absent" per BottomBar's own comment) or one that
  // didn't exist when the order was saved (SpotBoard/S104). Both look
  // identical as a bare array. The richer `{ order, knownKeys }` shape
  // disambiguates via `knownKeys` — a snapshot of DEFAULT_TAB_ORDER taken at
  // save time. (Found by this session's own integration test: an earlier
  // plain-array-only implementation silently un-hid every tab the user had
  // ever turned off, on every reload.)
  describe('the { order, knownKeys } shape disambiguates "hidden on purpose" from "new"', () => {
    test('a tab known at save time but absent from order stays hidden', () => {
      const order = DEFAULT_TAB_ORDER.filter((k) => k !== 'documents')
      const merged = mergeTabOrder({ order, knownKeys: DEFAULT_TAB_ORDER })
      expect(merged).not.toContain('documents')
    })

    test('a tab NOT known at save time (shipped later) still gets appended', () => {
      const knownAtSave = DEFAULT_TAB_ORDER.filter((k) => k !== 'spot') // pre-SpotBoard epoch
      const order = knownAtSave // never seen, so also absent from the saved order
      const merged = mergeTabOrder({ order, knownKeys: knownAtSave })
      expect(merged).toContain('spot')
    })

    test('a bare legacy array (no knownKeys) treats every absence as "new" — back-compat', () => {
      const legacy = DEFAULT_TAB_ORDER.filter((k) => k !== 'documents')
      // No way to tell hidden-on-purpose from new without knownKeys, so the
      // original (pre-this-shape) behaviour applies: it reappears.
      expect(mergeTabOrder(legacy)).toContain('documents')
    })
  })
})

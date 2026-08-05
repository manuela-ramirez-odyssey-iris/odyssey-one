// S108 Phase 1c — persistence shape. The whole reason a saved filter stores
// CHIP OBJECTS (not flattened `filters` conditions, GS-10 superseded) is that
// a GS-21 set chip (`codes`/`typeLabel`) and a GS-22 date-range chip carry
// metadata a plain condition can't express — round-tripping them intact is
// the point of the feature.
import { describe, test, expect } from 'vitest'
import { stripChip, toStored, hydrate, newFilter, splitFreeText } from './savedFilters'

// Real attribute keys from SHIPMENTS_PROGRESSION (progression.js) — 'customer-id'
// (letters, GS-21-eligible) and 'pickup-date' (date, GS-22-eligible).
const setChip = {
  key: 'customer-id',
  label: 'Customer ID Set',
  attrLabel: 'Customer ID',
  queryValue: 'G2O, JBHT',
  dataKey: 'customerId',
  group: 'Customers & Parties',
  kind: 'set',
  codes: [{ value: 'G2O', valid: true }, { value: 'JBHT', valid: true }],
  typeLabel: 'Customer ID',
}

const dateRangeChip = {
  key: 'date-range-pickup-date',
  attrLabel: 'Pickup Date',
  dataKey: 'pickupDate',
  group: 'Schedule & Appointments',
  kind: 'date-range',
  single: false,
  from: '4/1/2026',
  to: '4/15/2026',
  label: 'Pickup Date Range: 4/1/2026-4/15/2026',
  open: false,
  monthHint: null,
}

const freeTextChip = { key: '__free-text__', label: '"JBHT12345"', value: 'JBHT12345', kind: 'text' }

describe('stripChip', () => {
  test('drops open and monthHint, keeps everything else', () => {
    const stripped = stripChip({ ...dateRangeChip, open: true, monthHint: '2026-04' })
    expect(stripped).not.toHaveProperty('open')
    expect(stripped).not.toHaveProperty('monthHint')
    expect(stripped).toEqual({
      key: 'date-range-pickup-date',
      attrLabel: 'Pickup Date',
      dataKey: 'pickupDate',
      group: 'Schedule & Appointments',
      kind: 'date-range',
      single: false,
      from: '4/1/2026',
      to: '4/15/2026',
      label: 'Pickup Date Range: 4/1/2026-4/15/2026',
    })
  })
})

describe('toStored', () => {
  test('strips every chip and drops invalid ones', () => {
    const invalidDate = { ...dateRangeChip, key: 'date-range-delivery-date', invalid: true, open: false }
    const out = toStored([{ ...setChip }, { ...dateRangeChip, open: true }, invalidDate])
    expect(out).toHaveLength(2)
    expect(out.some((c) => c.invalid)).toBe(false)
    expect(out.every((c) => !('open' in c) && !('monthHint' in c))).toBe(true)
  })
})

describe('round-trip through newFilter + hydrate', () => {
  test('a GS-21 set chip survives with codes/typeLabel intact', () => {
    const filter = newFilter('My Customers', [setChip])
    expect(filter.id).toBeTruthy()
    const { custom } = hydrate({ v: 1, custom: [filter] })
    expect(custom).toHaveLength(1)
    expect(custom[0].chips).toEqual([stripChip(setChip)])
    expect(custom[0].chips[0].codes).toEqual(setChip.codes)
    expect(custom[0].chips[0].typeLabel).toBe('Customer ID')
  })

  test('a GS-22 date-range chip survives with from/to intact', () => {
    const filter = newFilter('April Pickups', [dateRangeChip])
    const { custom } = hydrate({ v: 1, custom: [filter] })
    expect(custom[0].chips).toEqual([stripChip(dateRangeChip)])
    expect(custom[0].chips[0].from).toBe('4/1/2026')
    expect(custom[0].chips[0].to).toBe('4/15/2026')
  })

  test('array position is the order — no position field added', () => {
    const filter = newFilter('Mixed', [setChip, dateRangeChip])
    expect(filter).not.toHaveProperty('position')
    expect(filter.chips.map((c) => c.key)).toEqual([setChip.key, dateRangeChip.key])
  })
})

describe('hydrate', () => {
  test('garbage input returns an empty custom list', () => {
    expect(hydrate(null)).toEqual({ v: 1, custom: [] })
    expect(hydrate(undefined)).toEqual({ v: 1, custom: [] })
    expect(hydrate('garbage')).toEqual({ v: 1, custom: [] })
    expect(hydrate(42)).toEqual({ v: 1, custom: [] })
    expect(hydrate({})).toEqual({ v: 1, custom: [] })
  })

  test('drops a chip whose attribute no longer exists in SHIPMENTS_PROGRESSION', () => {
    const staleChip = { key: 'no-longer-an-attr', kind: 'attribute', label: 'Gone: x', queryValue: 'x' }
    const filter = { id: 'f1', name: 'Stale', chips: [staleChip, setChip] }
    const { custom } = hydrate({ v: 1, custom: [filter] })
    expect(custom[0].chips.map((c) => c.key)).toEqual([setChip.key])
  })

  test('drops a stale date-range chip by its underlying attr key, keeps a valid one', () => {
    const staleDate = { ...dateRangeChip, key: 'date-range-no-longer-an-attr' }
    const filter = { id: 'f2', name: 'Dates', chips: [staleDate, dateRangeChip] }
    const { custom } = hydrate({ v: 1, custom: [filter] })
    expect(custom[0].chips).toHaveLength(1)
    expect(custom[0].chips[0].key).toBe(dateRangeChip.key)
  })

  test('a free-text chip (no attribute) is never dropped', () => {
    const filter = { id: 'f3', name: 'Free text', chips: [freeTextChip] }
    const { custom } = hydrate({ v: 1, custom: [filter] })
    expect(custom[0].chips).toEqual([freeTextChip])
  })
})

// S108 1e — the split both the counting (searchShipments) and applying
// (applyChips) consumers need: a stored chip list's free-text/set badge must
// go where the CONSUMER keeps free text, never into a `chips` array matched
// chip-by-chip (it carries no `dataKey`, so `matchesChip` would reject it on
// every row).
describe('splitFreeText', () => {
  test('pulls the __free-text__ entry out, leaving the real chips untouched', () => {
    const { chips, freeText } = splitFreeText([setChip, freeTextChip])
    expect(chips).toEqual([setChip])
    expect(freeText).toEqual(freeTextChip)
  })

  test('no free-text entry — chips pass through, freeText is null', () => {
    const { chips, freeText } = splitFreeText([setChip, dateRangeChip])
    expect(chips).toEqual([setChip, dateRangeChip])
    expect(freeText).toBeNull()
  })
})

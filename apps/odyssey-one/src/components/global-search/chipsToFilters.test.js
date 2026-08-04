import { describe, test, expect } from 'vitest'
import { chipsToFilters, mergeFiltersIntoChips, queryStringToFilters } from './ShipmentsFiltersView'

// Filters pre-fill from committed chips — incl. date chips (Case 12), which
// carry from/to instead of queryValue. S107: single chips fill `<key>` (one
// ISO day), range chips fill `<key>-range` ("from|to" ISO).
describe('chipsToFilters', () => {
  test('value chips land by key; range date chips fill the range control', () => {
    const f = chipsToFilters([
      { key: 'scac', queryValue: 'FXFE' },
      { key: 'date-range-pickup-date', kind: 'date-range', from: '04/03/2026', to: '04/09/2026' },
    ])
    expect(f.scac).toBe('FXFE')
    expect(f['pickup-date-range']).toBe('2026-04-03|2026-04-09')
  })

  test('a single-date chip fills the single control; open-ended range keeps its empty end', () => {
    const single = chipsToFilters([{ key: 'date-pickup-date', kind: 'date-range', single: true, from: '04/03/2026', to: null }])
    expect(single['pickup-date']).toBe('2026-04-03')
    const open = chipsToFilters([{ key: 'date-range-delivery-date', kind: 'date-range', from: '05/01/2026', to: null }])
    expect(open['delivery-date-range']).toBe('2026-05-01|')
  })

  test('a boundless (or invalid) date chip fills nothing', () => {
    expect(chipsToFilters([{ key: 'date-pickup-date', kind: 'date-range', invalid: true, from: null, to: null }])).toEqual({})
  })

  test('a multi-value enum chip round-trips its comma list', () => {
    expect(chipsToFilters([{ key: 'mode', queryValue: 'TL,LTL' }])).toEqual({ mode: 'TL,LTL' })
  })
})

describe('mergeFiltersIntoChips — the outbound direction', () => {
  test('new values become chips; a `-range` value becomes a range chip', () => {
    const next = mergeFiltersIntoChips([], { scac: 'FXFE', 'pickup-date-range': '2026-04-01|2026-04-15' })
    const scac = next.find((c) => c.key === 'scac')
    const date = next.find((c) => c.kind === 'date-range')
    expect(scac.queryValue).toBe('FXFE')
    expect(scac.label).toBe('SCAC: FXFE')
    expect(date.key).toBe('date-range-pickup-date')
    expect(date.single).toBe(false)
    expect(date.dataKey).toBe('pickupDate')
    expect(date.from).toBe('04/01/2026')
    expect(date.to).toBe('04/15/2026')
    expect(date.open).toBe(false)
    expect(date.label).toBe('Pickup Date Range: 04/01/2026-04/15/2026')
  })

  test('a plain date key becomes a SINGLE date chip', () => {
    const next = mergeFiltersIntoChips([], { 'pickup-date': '2026-04-03' })
    expect(next).toHaveLength(1)
    const chip = next[0]
    expect(chip.key).toBe('date-pickup-date')
    expect(chip.single).toBe(true)
    expect(chip.from).toBe('04/03/2026')
    expect(chip.to).toBe(null)
    expect(chip.label).toBe('Pickup Date: 04/03/2026')
  })

  test('single and range controls of the same attribute own SEPARATE chips', () => {
    const next = mergeFiltersIntoChips([], {
      'pickup-date': '2026-04-03',
      'pickup-date-range': '2026-05-01|2026-05-09',
    })
    expect(next.map((c) => c.key).sort()).toEqual(['date-pickup-date', 'date-range-pickup-date'])
  })

  test('an emptied value removes its chip; an unchanged value keeps the ORIGINAL chip object', () => {
    const original = { key: 'scac', queryValue: 'FXFE', kind: 'attribute' }
    const dateChip = { key: 'date-pickup-date', kind: 'date-range', single: true, from: '04/03/2026', to: null }
    const next = mergeFiltersIntoChips([original, dateChip], { scac: '', 'pickup-date': '2026-04-03' })
    expect(next.find((c) => c.key === 'scac')).toBeUndefined()
    expect(next[0]).toBe(dateChip) // identity preserved — single-date chip survives a no-op round-trip
  })

  test('a multi-select enum value becomes ONE comma-list chip (GS-12 IN-list)', () => {
    const next = mergeFiltersIntoChips([], { mode: 'TL,LTL' })
    expect(next).toHaveLength(1)
    expect(next[0].queryValue).toBe('TL,LTL')
    expect(next[0].label).toBe('Mode: TL,LTL')
  })

  test('untouched attributes keep their chips (filters only own present keys)', () => {
    const keep = { key: 'pro', queryValue: '442376', kind: 'set', codes: [] }
    const next = mergeFiltersIntoChips([keep], { scac: 'JBHT' })
    expect(next).toContain(keep)
  })

  test('a `-range` suffix on a non-date attribute is ignored', () => {
    expect(mergeFiltersIntoChips([], { 'scac-range': 'FXFE' })).toEqual([])
  })
})

describe('queryStringToFilters — saved profiles', () => {
  test('parses key:value tokens, date + range keys included; unknown keys drop', () => {
    const f = queryStringToFilters('scac:FXFE pickup-date:2026-04-03 pickup-date-range:2026-04-01|2026-04-15 scac-range:x bogus:x')
    expect(f).toEqual({
      scac: 'FXFE',
      'pickup-date': '2026-04-03',
      'pickup-date-range': '2026-04-01|2026-04-15',
    })
  })
})

import { describe, test, expect } from 'vitest'
import { chipsToFilters, mergeFiltersIntoChips, queryStringToFilters } from './ShipmentsFiltersView'

// Filters pre-fill from committed chips — incl. date chips (Case 12), which
// carry from/to instead of queryValue and land as "from|to" ISO pairs.
describe('chipsToFilters', () => {
  test('value chips land by key; date chips fill the date-range control', () => {
    const f = chipsToFilters([
      { key: 'scac', queryValue: 'FXFE' },
      { key: 'date-range-pickup-date', kind: 'date-range', from: '4/3/2026', to: '4/9/2026' },
    ])
    expect(f.scac).toBe('FXFE')
    expect(f['pickup-date']).toBe('2026-04-03|2026-04-09')
  })

  test('a single-date chip fills both ends with its one day; open-ended to stays empty', () => {
    const single = chipsToFilters([{ key: 'date-pickup-date', kind: 'date-range', single: true, from: '4/3/2026', to: '4/3/2026' }])
    expect(single['pickup-date']).toBe('2026-04-03|2026-04-03')
    const open = chipsToFilters([{ key: 'date-range-delivery-date', kind: 'date-range', from: '5/1/2026', to: null }])
    expect(open['delivery-date']).toBe('2026-05-01|')
  })

  test('a boundless (or invalid) date chip fills nothing', () => {
    expect(chipsToFilters([{ key: 'date-pickup-date', kind: 'date-range', invalid: true, from: null, to: null }])).toEqual({})
  })
})

describe('mergeFiltersIntoChips — the outbound direction', () => {
  test('new values become chips; date values become date-range chips', () => {
    const next = mergeFiltersIntoChips([], { scac: 'FXFE', 'pickup-date': '2026-04-01|2026-04-15' })
    const scac = next.find((c) => c.key === 'scac')
    const date = next.find((c) => c.kind === 'date-range')
    expect(scac.queryValue).toBe('FXFE')
    expect(scac.label).toBe('SCAC: FXFE')
    expect(date.dataKey).toBe('pickupDate')
    expect(date.from).toBe('4/1/2026')
    expect(date.to).toBe('4/15/2026')
    expect(date.open).toBe(false)
  })

  test('an emptied value removes its chip; an unchanged value keeps the ORIGINAL chip object', () => {
    const original = { key: 'scac', queryValue: 'FXFE', kind: 'attribute' }
    const dateChip = { key: 'date-pickup-date', kind: 'date-range', single: true, from: '4/3/2026', to: '4/3/2026' }
    const next = mergeFiltersIntoChips([original, dateChip], { scac: '', 'pickup-date': '2026-04-03|2026-04-03' })
    expect(next.find((c) => c.key === 'scac')).toBeUndefined()
    expect(next[0]).toBe(dateChip) // identity preserved — single-date chip survives a no-op round-trip
  })

  test('untouched attributes keep their chips (filters only own present keys)', () => {
    const keep = { key: 'pro', queryValue: '442376', kind: 'set', codes: [] }
    const next = mergeFiltersIntoChips([keep], { scac: 'JBHT' })
    expect(next).toContain(keep)
  })
})

describe('queryStringToFilters — saved profiles', () => {
  test('parses key:value tokens, dates included; unknown keys drop', () => {
    const f = queryStringToFilters('scac:FXFE pickup-date:2026-04-01|2026-04-15 bogus:x')
    expect(f).toEqual({ scac: 'FXFE', 'pickup-date': '2026-04-01|2026-04-15' })
  })
})

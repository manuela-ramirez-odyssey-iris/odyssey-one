import { describe, expect, it, vi } from 'vitest'

// registry.js reads the API mode at import time and pulls orders.json for its
// suggestion index; neither matters here, but both must not run.
vi.mock('../../api/config', () => ({ getApiMode: () => 'mock' }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => [] }))

import {
  activeFilterCount,
  emptyState,
  filterChips,
  hasFilters,
  parseErrorCount,
  parseLocationValue,
  splitTextValues,
  toRequestFilters,
} from './toRequest'
import { ORDERS_FILTER_ATTRS, attrsForTab } from './registry'

describe('per-tab field sets (LINX-10285 note: All tab only)', () => {
  const keys = (tab) => attrsForTab(tab).map((a) => a.key)

  it('All carries the 10285 set including both date ranges', () => {
    expect(keys('all')).toEqual([
      'orderNumber', 'orderStatus', 'customer', 'origin', 'destination',
      'latestPickup', 'latestDelivery',
    ])
  })

  it('Draft carries the 11663 set', () => {
    expect(keys('draft')).toEqual([
      'orderNumber', 'customer', 'createdDate', 'lastEditDate', 'createdBy', 'lastEditedBy',
    ])
  })

  it('Validation Errors carries the 11659 set', () => {
    expect(keys('validation-errors')).toEqual([
      'orderNumber', 'customer', 'draftOrderStatus', 'errorCount',
    ])
  })

  it("VE status binds to draftOrderStatuses, never the lifecycle orderStatuses", () => {
    const ve = attrsForTab('validation-errors').find((a) => a.key === 'draftOrderStatus')
    expect(ve.param).toBe('draftOrderStatuses')
    expect(ve.values).toEqual(['Ready', 'Complete', 'Purge'])
  })
})

describe('toRequestFilters', () => {
  it('omits empty values entirely rather than sending []', () => {
    expect(toRequestFilters('all', emptyState('all'))).toEqual({})
    expect(hasFilters('all', emptyState('all'))).toBe(false)
  })

  it('maps combobox + enum selections to their LLD arrays', () => {
    expect(toRequestFilters('all', {
      orderStatus: ['Draft'],
      customer: ['BASF_CHM_01', 'ERCO_SYS_01'],
    })).toEqual({
      orderStatuses: ['Draft'],
      customers: ['BASF_CHM_01', 'ERCO_SYS_01'],
    })
  })

  // Order Number is a TEXT field (user ruling 2026-08-20), not a picker.
  it('splits a typed Order Number into an IN-list', () => {
    expect(toRequestFilters('all', { orderNumber: 'AAA1' })).toEqual({ orderNumbers: ['AAA1'] })
    expect(toRequestFilters('all', { orderNumber: '091000, 091001' }))
      .toEqual({ orderNumbers: ['091000', '091001'] })
    // Whitespace is NOT a separator — a value may contain spaces.
    expect(toRequestFilters('all', { orderNumber: 'ORD 1, ORD 2' }))
      .toEqual({ orderNumbers: ['ORD 1', 'ORD 2'] })
    expect(toRequestFilters('all', { orderNumber: '   ' })).toEqual({})
  })

  it('sends location triples AND the LLD mirror arrays, de-duplicated', () => {
    const out = toRequestFilters('all', {
      origin: ['Miami|Florida|US', 'Milan|Lombardy|Italy', 'Orlando|Florida|US'],
    })
    expect(out.originLocations).toEqual([
      { city: 'Miami', state: 'Florida', country: 'US' },
      { city: 'Milan', state: 'Lombardy', country: 'Italy' },
      { city: 'Orlando', state: 'Florida', country: 'US' },
    ])
    expect(out.originCities).toEqual(['Miami', 'Milan', 'Orlando'])
    expect(out.originStates).toEqual(['Florida', 'Lombardy'])
    expect(out.originCountries).toEqual(['US', 'Italy'])
  })

  it('sends either date bound alone', () => {
    expect(toRequestFilters('all', { latestPickup: { from: '2026-06-01', to: '' } }))
      .toEqual({ latestPickupDateFrom: '2026-06-01' })
    expect(toRequestFilters('all', { latestPickup: { from: '', to: '2026-06-30' } }))
      .toEqual({ latestPickupDateTo: '2026-06-30' })
  })

  it('maps the Draft-tab extensions', () => {
    expect(toRequestFilters('draft', {
      createdDate: { from: '2026-01-01', to: '2026-01-31' },
      lastEditDate: { from: '', to: '2026-02-01' },
      createdBy: ['amy.cook'],
      lastEditedBy: ['ben.planner'],
    })).toEqual({
      createdDateFrom: '2026-01-01',
      createdDateTo: '2026-01-31',
      lastEditDateTo: '2026-02-01',
      createdBy: ['amy.cook'],
      lastEditedBy: ['ben.planner'],
    })
  })

  it('emits the error-count comparator only when BOTH halves are valid', () => {
    const f = (errorCount) => toRequestFilters('validation-errors', { errorCount })
    expect(f({ op: 'lt', value: '10' })).toEqual({ errorCountOperator: 'lt', errorCountValue: 10 })
    expect(f({ op: '', value: '10' })).toEqual({})   // operator missing
    expect(f({ op: 'lt', value: '' })).toEqual({})   // value missing
    expect(f({ op: 'lt', value: '0' })).toEqual({})  // AC: >= 1
    expect(f({ op: 'lt', value: '1.5' })).toEqual({}) // AC: no decimals
  })

  it('ignores state left over from another tab', () => {
    // `orderStatus` is an All-tab field; carrying it into Draft must not filter.
    expect(toRequestFilters('draft', { orderStatus: ['Cancelled'], customer: ['X'] }))
      .toEqual({ customers: ['X'] })
  })
})

describe('parseErrorCount (LINX-11659: whole number, >= 1, no decimals)', () => {
  it.each([['1', 1], ['10', 10], ['007', 7]])('accepts %s', (text, n) => {
    expect(parseErrorCount(text)).toBe(n)
  })
  it.each(['0', '-1', '1.5', '', ' ', 'abc', '1e3'])('rejects %j', (text) => {
    expect(parseErrorCount(text)).toBeNull()
  })
})

describe('activeFilterCount', () => {
  it('counts filled FIELDS, not emitted params', () => {
    // origin emits 4 params and the range emits 2 — both are one field each.
    expect(activeFilterCount('all', {
      origin: ['Miami|Florida|US'],
      latestPickup: { from: '2026-06-01', to: '2026-06-30' },
      customer: [],
    })).toBe(2)
  })

  it('does not count a half-filled comparator', () => {
    expect(activeFilterCount('validation-errors', { errorCount: { op: 'lt', value: '' } })).toBe(0)
    expect(activeFilterCount('validation-errors', { errorCount: { op: 'lt', value: '3' } })).toBe(1)
  })
})

describe('parseLocationValue', () => {
  it('round-trips a triple and tolerates missing parts', () => {
    expect(parseLocationValue('Miami|Florida|US')).toEqual({ city: 'Miami', state: 'Florida', country: 'US' })
    expect(parseLocationValue('Birmingham||UK')).toEqual({ city: 'Birmingham', state: '', country: 'UK' })
  })
})

describe('control types (user ruling, 2026-08-20)', () => {
  const control = (key) => ORDERS_FILTER_ATTRS.find((a) => a.key === key).control

  it('Order Number is a text input, not a picker', () => {
    expect(control('orderNumber')).toBe('text')
  })

  it('Customer / Origin / Destination are lazy pickers', () => {
    expect(control('customer')).toBe('combobox')
    expect(control('origin')).toBe('location')
    expect(control('destination')).toBe('location')
  })

  it('the user fields follow Customer', () => {
    expect(control('createdBy')).toBe('combobox')
    expect(control('lastEditedBy')).toBe('combobox')
  })

  it('emptyState gives a text field a string, not an array', () => {
    expect(emptyState('all').orderNumber).toBe('')
    expect(emptyState('all').customer).toEqual([])
  })
})

describe('splitTextValues', () => {
  it('splits on commas only, trims, drops blanks', () => {
    expect(splitTextValues('a, b ,,c')).toEqual(['a', 'b', 'c'])
    expect(splitTextValues('one two')).toEqual(['one two'])
    expect(splitTextValues('')).toEqual([])
    expect(splitTextValues(null)).toEqual([])
  })
})

// S130 — the applied filters, as the bar's chips. This is what makes the bar
// and the panel two views of ONE state (user ruling: "the searchbar is wired to
// the filters panel too like in shipments").
describe('filterChips (S130 bar wiring)', () => {
  it('gives one chip per FILLED field, labelled "<Field>: <value>"', () => {
    const chips = filterChips('all', {
      ...emptyState('all'),
      orderNumber: 'AAA1',
      customer: ['BASF_CHM_01'],
    })
    expect(chips).toEqual([
      { key: 'orderNumber', label: 'Order Number: AAA1' },
      { key: 'customer', label: 'Customer: BASF_CHM_01' },
    ])
  })

  it('an untouched state produces none', () => {
    expect(filterChips('all', emptyState('all'))).toEqual([])
  })

  it('a location reads as its display label, never the pipe-joined value', () => {
    const [chip] = filterChips('all', { ...emptyState('all'), origin: ['Chicago|IL|US'] })
    expect(chip.label).toBe('Origin City, State, Country: Chicago, IL, US')
  })

  it('a date range is ONE chip, and an open-ended bound still reads as a range', () => {
    const both = filterChips('all', {
      ...emptyState('all'), latestPickup: { from: '2026-04-03', to: '2026-04-09' },
    })
    expect(both).toEqual([{ key: 'latestPickup', label: 'Latest Pickup Date: 4/3/2026 – 4/9/2026' }])
    const fromOnly = filterChips('all', { ...emptyState('all'), latestPickup: { from: '2026-04-03', to: '' } })
    expect(fromOnly[0].label).toBe('Latest Pickup Date: 4/3/2026 –')
  })

  it('multiple enum values share one chip', () => {
    const [chip] = filterChips('all', { ...emptyState('all'), orderStatus: ['Draft', 'Submitted'] })
    expect(chip.label).toBe('Order Status: Draft, Submitted')
  })

  it('a half-filled comparator shows NO chip — it emits no filter either', () => {
    const state = { ...emptyState('validation-errors'), errorCount: { op: 'gt', value: '' } }
    expect(filterChips('validation-errors', state)).toEqual([])
    expect(toRequestFilters('validation-errors', state)).toEqual({})
    const filled = { ...emptyState('validation-errors'), errorCount: { op: 'gt', value: '5' } }
    expect(filterChips('validation-errors', filled)[0].label).toBe('Error Count: Greater Than 5')
  })

  it('counts the same fields activeFilterCount does', () => {
    const state = {
      ...emptyState('all'),
      customer: ['BASF_CHM_01'],
      origin: ['Chicago|IL|US'],
      latestPickup: { from: '2026-04-03', to: '' },
    }
    expect(filterChips('all', state)).toHaveLength(activeFilterCount('all', state))
  })
})

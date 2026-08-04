import { describe, test, expect } from 'vitest'
import { parseSearchDate, matchesChip } from './criteria'
import { shipmentsSearchAdapter as adapter } from './adapter'

// Case 12 (GS-22) — date / date-range chips: parsing, range matching, and the
// date suggestion surfaces (empty focused bar + date-like typing).

describe('parseSearchDate', () => {
  test('parses M/D/YYYY in any padding, ignores time/zone suffix', () => {
    expect(parseSearchDate('2/6/2026')).toEqual(new Date(2026, 1, 6))
    expect(parseSearchDate('05/08/2026 06:30 CDT')).toEqual(new Date(2026, 4, 8))
  })

  test('rejects partials and garbage', () => {
    for (const bad of ['2/6', '2/', '2026-02-06', 'abc', '', null, '13/45/2026']) {
      expect(parseSearchDate(bad)).toBeNull()
    }
  })
})

describe('matchesChip — date-range kind', () => {
  const row = { pickupDate: '05/08/2026 06:30 CDT' }
  const chip = (from, to) => ({ kind: 'date-range', dataKey: 'pickupDate', from, to })

  test('inclusive between bounds', () => {
    expect(matchesChip(row, chip('5/1/2026', '5/31/2026'))).toBe(true)
    expect(matchesChip(row, chip('5/8/2026', '5/8/2026'))).toBe(true) // single date = one-day range
    expect(matchesChip(row, chip('5/9/2026', '5/31/2026'))).toBe(false)
  })

  test('a missing bound leaves that side open', () => {
    expect(matchesChip(row, chip('5/1/2026', null))).toBe(true)
    expect(matchesChip(row, chip(null, '5/1/2026'))).toBe(false)
  })

  test('no bounds picked yet → no narrowing; unparseable row date → no match', () => {
    expect(matchesChip(row, chip(null, null))).toBe(true)
    expect(matchesChip({ pickupDate: null }, chip('5/1/2026', '5/31/2026'))).toBe(false)
  })
})

describe('date suggestions', () => {
  test('EMPTY focused bar → "Type or Filter by date" with date + Range twins (partial GS-14 supersede)', async () => {
    const sections = await adapter.getInitial([])
    const dates = sections.find((s) => s.title === 'Type or Filter by date')
    expect(dates).toBeTruthy()
    const labels = dates.items.map((i) => i.label)
    expect(labels).toContain('Pickup Date')
    expect(labels).toContain('Pickup Date Range')
    expect(labels).toContain('Delivery Date Range')
  })

  test('a slashed date-like query leads with the date section; the partial pre-fills like other criteria', async () => {
    const year = new Date().getFullYear()

    // Month only ("12/") → masked label + calendar month hint, no from yet.
    const monthOnly = await adapter.getSuggestions('12/')
    expect(monthOnly[0].title).toBe('Filter by date')
    const single = monthOnly[0].items.find((i) => i.kind === 'date' && /Pickup Date/.test(i.label))
    const rangeItem = monthOnly[0].items.find((i) => i.kind === 'date-range-suggest' && /Pickup/.test(i.label))
    expect(single.label).toBe('Pickup Date: 12/../....')
    expect(rangeItem.label).toBe('Pickup Date Range: 12/../.... - ../../....')
    expect(single.from).toBeNull()
    expect(single.monthHint).toEqual({ y: year, m: 12 })

    // Month + day ("2/3") → year defaults to CURRENT, from pre-filled — padded
    // MM/DD/YYYY canon (S107 addendum): a complete typed date is a chip bound,
    // not the "12/../...." mask, so it commits padded like every other date.
    const partial = await adapter.getSuggestions('2/3')
    expect(partial[0].items[0].from).toBe(`02/03/${year}`)
    expect(partial[0].items[0].label).toContain('2/3/....') // the MASK stays unpadded — an input affordance, not a display value

    // A complete date carries verbatim (padded).
    const complete = await adapter.getSuggestions('2/3/2026')
    expect(complete[0].items.every((i) => i.from === '02/03/2026')).toBe(true)

    // First segment > 12 can't be a month → DAY in the current month.
    const dayFirst = await adapter.getSuggestions('25/')
    const now = new Date()
    expect(dayFirst[0].items[0].from).toBe(`${String(now.getMonth() + 1).padStart(2, '0')}/25/${year}`)
  })

  test('an impossible date reads "Invalid Date" and carries the invalid flag', async () => {
    for (const bad of ['40/', '12/40', '2/30/2026']) {
      const sections = await adapter.getSuggestions(bad)
      const item = sections[0].items[0]
      expect(item.label).toBe('Pickup Date: Invalid Date')
      expect(item.invalid).toBe(true)
      expect(item.from).toBeNull()
      expect(item.monthHint).toBeNull()
    }
    const rangeItem = (await adapter.getSuggestions('40/'))[0].items[1]
    expect(rangeItem.label).toBe('Pickup Date Range: Invalid Date')
  })

  test('bare digits stay code-typing — dates never hijack a pro/shipment number', async () => {
    const sections = await adapter.getSuggestions('4423')
    expect(sections.find((s) => s.title === 'Filter by date')).toBeUndefined()
  })
})

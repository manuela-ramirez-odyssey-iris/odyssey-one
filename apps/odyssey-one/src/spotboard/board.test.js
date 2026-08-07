// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest'
import { listAllQuotes, boardKpis, filterRows } from './board.js'

const NOW = 1_700_000_000_000 // fixed reference instant for all tests

function seedRealQuote(shipmentId, overrides = {}) {
  const quote = {
    quoteId: `q-${shipmentId}`,
    shipmentId,
    listId: 'tl-se',
    listName: 'TL Southeast Overflow',
    durationMin: 120,
    openAt: NOW - 60 * 60_000,
    closeAt: NOW + 60 * 60_000,
    status: 'open',
    awardType: null,
    awardedScac: null,
    carriers: [
      { scac: 'ODFL', name: 'Old Dominion', equipment: 'Van', incl: true, bid: { total: 2100, status: 'bid' } },
      { scac: 'SAIA', name: 'Saia', equipment: 'Van', incl: true },
      { scac: 'XPOL', name: 'XPO', equipment: 'Van', incl: false },
    ],
    flexiblePickup: false,
    ...overrides,
  }
  localStorage.setItem(`spotboard:${shipmentId}`, JSON.stringify(quote))
  return quote
}

beforeEach(() => {
  localStorage.clear()
})

describe('listAllQuotes — real quote key scan', () => {
  it('returns rows for multiple real quotes stored under spotboard:*', () => {
    seedRealQuote('SHP-1')
    seedRealQuote('SHP-2', { status: 'closed', closeAt: NOW - 1000 })
    const rows = listAllQuotes({ now: NOW })
    const real = rows.filter((r) => !r.demo)
    expect(real.map((r) => r.shipmentId).sort()).toEqual(['SHP-1', 'SHP-2'])
    expect(real.every((r) => r.demo === false)).toBe(true)
  })

  it('skips a corrupt JSON entry without throwing, and still returns the good ones', () => {
    seedRealQuote('SHP-1')
    localStorage.setItem('spotboard:SHP-BAD', '{not json')
    expect(() => listAllQuotes({ now: NOW })).not.toThrow()
    const rows = listAllQuotes({ now: NOW })
    expect(rows.some((r) => r.shipmentId === 'SHP-BAD')).toBe(false)
    expect(rows.some((r) => r.shipmentId === 'SHP-1')).toBe(true)
  })

  it('skips a malformed-but-valid-JSON entry (missing required fields)', () => {
    localStorage.setItem('spotboard:SHP-EMPTY', JSON.stringify({ foo: 'bar' }))
    expect(() => listAllQuotes({ now: NOW })).not.toThrow()
    const rows = listAllQuotes({ now: NOW })
    expect(rows.some((r) => r.shipmentId === 'SHP-EMPTY')).toBe(false)
  })

  it('skips an entry with a valid status but no shipmentId', () => {
    localStorage.setItem('spotboard:SHP-NOID', JSON.stringify({ status: 'open', carriers: [] }))
    const rows = listAllQuotes({ now: NOW })
    expect(rows.every((r) => typeof r.shipmentId === 'string' && r.shipmentId.length > 0)).toBe(true)
  })

  it('ignores keys that are not spotboard:* quotes', () => {
    localStorage.setItem('some-other-app:key', JSON.stringify({ shipmentId: 'X', status: 'open' }))
    expect(() => listAllQuotes({ now: NOW })).not.toThrow()
    const rows = listAllQuotes({ now: NOW })
    expect(rows.some((r) => r.shipmentId === 'X')).toBe(false)
  })
})

describe('listAllQuotes — absent localStorage', () => {
  it('does not throw when localStorage is unavailable (SSR-like)', () => {
    const original = globalThis.localStorage
    // simulate an environment where the localStorage global doesn't exist
    // (accessing it throws, mirroring a locked-down/private-mode browser).
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: localStorage blocked')
      },
    })
    try {
      expect(() => listAllQuotes({ now: NOW })).not.toThrow()
      const rows = listAllQuotes({ now: NOW })
      // demo rows still render — only the real-quote layer is guarded
      expect(rows.every((r) => r.demo)).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: original,
      })
    }
  })
})

describe('listAllQuotes — real shadows demo', () => {
  it('a real quote for a demo shipmentId replaces the demo row, and is not marked demo', () => {
    const before = listAllQuotes({ now: NOW })
    const demoShipmentIds = before.filter((r) => r.demo).map((r) => r.shipmentId)
    expect(demoShipmentIds.length).toBeGreaterThan(0)
    const target = demoShipmentIds[0]

    seedRealQuote(target, { status: 'awarded', awardedScac: 'ODFL', closeAt: NOW - 1000 })
    const after = listAllQuotes({ now: NOW })
    const rowsForTarget = after.filter((r) => r.shipmentId === target)

    expect(rowsForTarget).toHaveLength(1)
    expect(rowsForTarget[0].demo).toBe(false)
    expect(rowsForTarget[0].status).toBe('Awarded')
  })
})

describe('Closing soon — presentational derivation', () => {
  it('flips purely from now crossing the 15-minute threshold, with no stored-state change', () => {
    const closeAt = NOW + 20 * 60_000
    seedRealQuote('SHP-FLIP', { openAt: NOW - 100 * 60_000, closeAt, status: 'open' })

    const farOut = listAllQuotes({ now: closeAt - 20 * 60_000 }) // 20 min out
    const rowFar = farOut.find((r) => r.shipmentId === 'SHP-FLIP')
    expect(rowFar.status).toBe('Open')
    expect(rowFar.closeAt).toBe(closeAt) // stored value unchanged

    const closeIn = listAllQuotes({ now: closeAt - 5 * 60_000 }) // 5 min out
    const rowClose = closeIn.find((r) => r.shipmentId === 'SHP-FLIP')
    expect(rowClose.status).toBe('Closing soon')
    expect(rowClose.closeAt).toBe(closeAt) // same stored closeAt, no mutation
  })
})

describe('boardKpis', () => {
  it('matches a hand-built fixture', () => {
    const rows = [
      { status: 'Open', closeAt: NOW },
      { status: 'Open', closeAt: NOW },
      { status: 'Closing soon', closeAt: NOW },
      { status: 'In review', closeAt: NOW - 60_000 },
      { status: 'In review', closeAt: NOW - 60_000 },
      { status: 'In review', closeAt: NOW - 60_000 },
      { status: 'Unawarded', closeAt: NOW - 60_000 }, // today
      { status: 'Unawarded', closeAt: NOW - 400 * 24 * 60 * 60_000 }, // not today
      { status: 'Awarded', closeAt: NOW - 60_000 }, // today
      { status: 'Invalidated', closeAt: NOW - 60_000 },
    ]
    expect(boardKpis(rows, NOW)).toEqual({
      openBids: 2,
      closingSoon: 1,
      awaitingReview: 3,
      unawardedToday: 1,
      awardedToday: 1,
    })
  })
})

describe('filterRows', () => {
  const rows = [
    { shipmentId: 'A', client: 'Acme Foods', status: 'Open', lane: 'Dallas, TX → Memphis, TN', load: 'L-1' },
    { shipmentId: 'B', client: 'Acme Foods', status: 'Awarded', lane: 'Reno, NV → Boise, ID', load: 'L-2' },
    { shipmentId: 'C', client: 'Beta Corp', status: 'Open', lane: 'Tampa, FL → Atlanta, GA', load: 'L-3' },
  ]

  it('filters by client alone', () => {
    expect(filterRows(rows, { client: 'Acme Foods' }).map((r) => r.shipmentId)).toEqual(['A', 'B'])
  })

  it('filters by status alone', () => {
    expect(filterRows(rows, { status: 'Open' }).map((r) => r.shipmentId)).toEqual(['A', 'C'])
  })

  it('filters by org alone (matches client until a dedicated org field exists)', () => {
    expect(filterRows(rows, { org: 'Beta Corp' }).map((r) => r.shipmentId)).toEqual(['C'])
  })

  it('filters by search alone, case-insensitively, across lane/load/client/shipmentId', () => {
    expect(filterRows(rows, { search: 'memphis' }).map((r) => r.shipmentId)).toEqual(['A'])
    expect(filterRows(rows, { search: 'l-3' }).map((r) => r.shipmentId)).toEqual(['C'])
  })

  it('combines filters with AND semantics', () => {
    expect(filterRows(rows, { client: 'Acme Foods', status: 'Open' }).map((r) => r.shipmentId)).toEqual(['A'])
  })

  it('returns all rows when no filters are given', () => {
    expect(filterRows(rows, {})).toHaveLength(3)
    expect(filterRows(rows)).toHaveLength(3)
  })
})

describe('demo rows — internal consistency', () => {
  it('every demo row obeys the status invariants', () => {
    const rows = listAllQuotes({ now: NOW }).filter((r) => r.demo)
    expect(rows.length).toBeGreaterThan(0)

    for (const row of rows) {
      if (row.status === 'Unawarded') {
        expect(row.leadingBid).toBeNull()
      }
      if (row.status === 'Invalidated') {
        expect(row.leadingBid).toBeNull()
      }
      if (row.status === 'Awarded') {
        expect(row.leadingBid).not.toBeNull()
        expect(typeof row.leadingBid).toBe('number')
        expect(Number.isNaN(row.leadingBid)).toBe(false)
        expect(row.closeAt).toBeLessThan(NOW)
      }
      if (row.status === 'Closing soon') {
        expect(row.closeAt - NOW).toBeLessThan(15 * 60_000)
      }
      expect(row.respondedCount).toBeLessThanOrEqual(row.invitedCount)
      expect(row.demo).toBe(true)
    }
  })

  it('covers every status in the vocabulary across the demo set', () => {
    const rows = listAllQuotes({ now: NOW }).filter((r) => r.demo)
    const statuses = new Set(rows.map((r) => r.status))
    for (const s of ['Open', 'In review', 'Awarded', 'Unawarded', 'Invalidated']) {
      expect(statuses.has(s)).toBe(true)
    }
  })
})

describe('determinism', () => {
  it('two calls with identical input produce identical rows', () => {
    seedRealQuote('SHP-DET')
    const first = listAllQuotes({ now: NOW })
    const second = listAllQuotes({ now: NOW })
    expect(second).toEqual(first)
  })
})

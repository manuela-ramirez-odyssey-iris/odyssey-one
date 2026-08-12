// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest'
import { listAllQuotes, boardKpis, filterRows, demoFixtureShipmentIds } from './board.js'

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
      all: 10,
      openBids: 2,
      closingSoon: 1,
      awaitingReview: 3,
      unawardedToday: 1,
      awardedToday: 1,
      // No same-day constraint — only the two "today" tiles have one.
      invalidated: 1,
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

  // The field's label reads "Search (Quote ID / Load)" but quoteId was never
  // in the haystack — searching a quote ID matched nothing at all.
  it('searches quoteId, which the field label has always promised', () => {
    const withIds = rows.map((r, i) => ({ ...r, quoteId: `Q-100${i}` }))
    expect(filterRows(withIds, { search: 'q-1001' }).map((r) => r.shipmentId)).toEqual(['B'])
  })

  describe('intervalDays (legacy "Interval")', () => {
    const day = 24 * 60 * 60_000
    const dated = [
      { shipmentId: 'NEW', createdAt: NOW - 2 * day },
      { shipmentId: 'OLD', createdAt: NOW - 20 * day },
      { shipmentId: 'UNDATED', createdAt: null },
    ]

    it('keeps only rows opened inside the window', () => {
      expect(filterRows(dated, { intervalDays: 7, now: NOW }).map((r) => r.shipmentId))
        .toEqual(['NEW', 'UNDATED'])
    })

    it('keeps a row with no createdAt — an unknown open date is not an old one', () => {
      expect(filterRows(dated, { intervalDays: 1, now: NOW }).map((r) => r.shipmentId))
        .toEqual(['UNDATED'])
    })

    it('applies no window when the filter is unset', () => {
      expect(filterRows(dated, { now: NOW })).toHaveLength(3)
    })
  })

  // The two "…today" KPI tiles filter with this, and their COUNTS come from
  // boardKpis' own same-day test. If the two ever diverge, a tile shows one
  // number and produces a different number of rows when clicked.
  describe('today', () => {
    const day = 24 * 60 * 60_000
    const rowsToday = [
      { shipmentId: 'TODAY', closeAt: NOW - 60_000 },
      { shipmentId: 'YESTERDAY', closeAt: NOW - day },
    ]

    it('keeps only rows that closed on the same calendar day', () => {
      expect(filterRows(rowsToday, { today: true, now: NOW }).map((r) => r.shipmentId))
        .toEqual(['TODAY'])
    })

    it('agrees with boardKpis, which is the number printed on the tile', () => {
      const rows = [
        { shipmentId: 'A', status: 'Awarded', closeAt: NOW - 60_000 },
        { shipmentId: 'B', status: 'Awarded', closeAt: NOW - day },
        { shipmentId: 'C', status: 'Open', closeAt: NOW - 60_000 },
      ]
      const tileCount = boardKpis(rows, NOW).awardedToday
      const clicked = filterRows(rows, { status: 'Awarded', today: true, now: NOW })
      expect(clicked).toHaveLength(tileCount)
    })
  })
})

// The row action navigates to /shipments with this id; an id that is not a
// real seeded shipment 404s ("No shipment: …") on every click, which is
// exactly what the invented 'DEMO-7000N' ids used to do.
describe('retired demo ids in localStorage', () => {
  it('produces no row for a quote saved against an invented shipment id', () => {
    // Anyone who opened an RFQ before the fixtures were re-anchored still has
    // this key; the row it used to produce 404s on every action, forever.
    seedRealQuote('DEMO-70001', { status: 'open' })
    const rows = listAllQuotes({ now: NOW })
    expect(rows.some((r) => r.shipmentId === 'DEMO-70001')).toBe(false)
  })

  it('still returns rows for quotes on real shipment ids', () => {
    seedRealQuote('25631418', { status: 'open' })
    const rows = listAllQuotes({ now: NOW })
    expect(rows.some((r) => r.shipmentId === '25631418' && !r.demo)).toBe(true)
  })
})

describe('demo fixtures point at real shipments', () => {
  it('every demo shipmentId has the seeded 8-digit sellShipment shape', () => {
    expect(demoFixtureShipmentIds.length).toBeGreaterThan(0)
    for (const id of demoFixtureShipmentIds) {
      expect(id).toMatch(/^\d{8}$/)
    }
  })
})

describe('real quotes — per-carrier rows (SPB-30)', () => {
  it('emits one carrier row per INVITED carrier, excluding the un-included', () => {
    seedRealQuote('SHP-C1')
    const row = listAllQuotes({ now: NOW }).find((r) => r.shipmentId === 'SHP-C1')
    // XPOL is incl:false — invited only.
    expect(row.carriers.map((c) => c.scac)).toEqual(['ODFL', 'SAIA'])
  })

  it('renders a declined carrier as the literal legacy value, not a dash', () => {
    seedRealQuote('SHP-C2', {
      carriers: [
        { scac: 'ODFL', name: 'Old Dominion', incl: true, bid: { status: 'declined', respondedAt: NOW - 30 * 60_000 } },
      ],
    })
    const row = listAllQuotes({ now: NOW }).find((r) => r.shipmentId === 'SHP-C2')
    expect(row.carriers[0].quotedCost).toBe('Declined')
    // A decline IS a response — legacy stamps its elapsed time too.
    expect(row.carriers[0].responseTime).toBe('30 min')
    // …but carries no responder name, and none is invented.
    expect(row.carriers[0].responseUser).toBe('--')
  })

  it('marks the awarded carrier and only that carrier', () => {
    seedRealQuote('SHP-C3', { status: 'awarded', awardedScac: 'SAIA' })
    const row = listAllQuotes({ now: NOW }).find((r) => r.shipmentId === 'SHP-C3')
    expect(row.carriers.filter((c) => c.awarded).map((c) => c.scac)).toEqual(['SAIA'])
  })

  it('carries the real responder identity when the bid has one', () => {
    seedRealQuote('SHP-C4', {
      carriers: [
        { scac: 'ODFL', name: 'Old Dominion', incl: true, bid: { total: 1500, status: 'bid', respondedAt: NOW, submittedBy: 'Old Dominion' } },
      ],
    })
    const row = listAllQuotes({ now: NOW }).find((r) => r.shipmentId === 'SHP-C4')
    expect(row.carriers[0].responseUser).toBe('Old Dominion')
    expect(row.carriers[0].quotedCost).toBe(1500)
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

  // The carrier rows are DERIVED from each fixture's aggregates rather than
  // hand-written, so the thing worth pinning is that the derivation and the
  // aggregate can never disagree — an outer "Leading Bid" that isn't the
  // minimum of the rows underneath it is the exact incoherence this guards.
  it('every demo row carries carriers that agree with its own aggregates', () => {
    const rows = listAllQuotes({ now: NOW }).filter((r) => r.demo)
    expect(rows.length).toBeGreaterThan(0)

    for (const row of rows) {
      expect(row.carriers).toHaveLength(row.invitedCount)

      const responded = row.carriers.filter((c) => c.quotedCost !== null)
      expect(responded).toHaveLength(row.respondedCount)

      const amounts = row.carriers
        .map((c) => c.quotedCost)
        .filter((v) => typeof v === 'number')

      if (row.leadingBid == null) {
        // No leading bid means nobody priced it — any responder declined.
        expect(amounts).toHaveLength(0)
        for (const c of responded) expect(c.quotedCost).toBe('Declined')
      } else {
        expect(Math.min(...amounts)).toBe(row.leadingBid)
      }

      // At most one carrier is awarded, and only on an Awarded quote.
      const awarded = row.carriers.filter((c) => c.awarded)
      expect(awarded.length).toBeLessThanOrEqual(1)
      if (row.status !== 'Awarded') expect(awarded).toHaveLength(0)
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

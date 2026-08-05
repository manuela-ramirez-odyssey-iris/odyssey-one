// @vitest-environment jsdom
// End-to-end SpotBoard auction: drives the real store + award + tolerance
// modules through every state transition, draft -> open -> closed -> awarded
// -> Tender handoff. Not a render test — pure logic, jsdom only for
// localStorage (spotStore is localStorage-backed).
import { beforeEach, describe, it, expect } from 'vitest'
import { saveDraft, sendRFQ, submitBid, closeQuote, lowestBid, award } from './spotStore.js'
import { buildSpotRateOption } from './award.js'
import { applyMarkup, benchmark, evaluateTolerance } from './tolerance.js'

const SHIPMENT_ID = '0000000091105'

const CARRIERS = [
  { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '2026-08-10 08:00', plannedDelivery: '2026-08-11 17:00', flags: [] },
  { scac: 'SAIA', name: 'Saia', email: 'ops@saia.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
  { scac: 'XPOL', name: 'XPO', email: 'ops@xpol.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
]

const draftInput = {
  listId: 'tl-se',
  listName: 'TL Southeast Overflow',
  durationMin: 120,
  carriers: CARRIERS,
}

const NOW = 1_700_000_000_000
const DURATION_MS = 120 * 60_000

beforeEach(() => {
  localStorage.clear()
})

describe('SpotBoard auction end-to-end', () => {
  it('drives draft -> open -> bids -> closed -> awarded -> Tender handoff', () => {
    // 1. saveDraft -> draft
    const draft = saveDraft(SHIPMENT_ID, draftInput)
    expect(draft.status).toBe('draft')

    // 2. sendRFQ -> open, closeAt derived from durationMin
    const opened = sendRFQ(SHIPMENT_ID, NOW)
    expect(opened.status).toBe('open')
    expect(opened.closeAt).toBe(opened.openAt + draftInput.durationMin * 60_000)
    expect(opened.closeAt).toBe(NOW + DURATION_MS)

    // 3. submitBid for two carriers
    submitBid(SHIPMENT_ID, 'ODFL', { linehaul: 2000, fuel: 200, accessorials: [], total: 2200, status: 'bid' }, NOW + 1000)
    const afterBids = submitBid(SHIPMENT_ID, 'XPOL', { linehaul: 1700, fuel: 150, accessorials: [], total: 1850, status: 'bid' }, NOW + 2000)
    expect(afterBids.carriers.find((c) => c.scac === 'ODFL').bid).toMatchObject({ total: 2200 })
    expect(afterBids.carriers.find((c) => c.scac === 'XPOL').bid).toMatchObject({ total: 1850 })

    // 8. regression guard: a bid submitted after closeAt is a no-op
    const lateAttempt = submitBid(SHIPMENT_ID, 'SAIA', { linehaul: 1, fuel: 0, accessorials: [], total: 1, status: 'bid' }, opened.closeAt + 1)
    expect(lateAttempt.carriers.find((c) => c.scac === 'SAIA').bid).toBeUndefined()

    // 4. closeQuote -> closed; silent carrier (SAIA) has no bid key at all
    const closed = closeQuote(SHIPMENT_ID, NOW + DURATION_MS + 1)
    expect(closed.status).toBe('closed')
    const silent = closed.carriers.find((c) => c.scac === 'SAIA')
    expect('bid' in silent).toBe(false)

    // 5. lowestBid picks the lower total
    const winner = lowestBid(closed)
    expect(winner.scac).toBe('XPOL')
    expect(winner.bid.total).toBe(1850)

    // 6. award -> awarded, awardedScac set
    const awarded = award(SHIPMENT_ID, winner.scac, 'manual')
    expect(awarded.status).toBe('awarded')
    expect(awarded.awardedScac).toBe('XPOL')

    // 7. buildSpotRateOption -> Spot row, markup applied, rank = existingMax + 1
    const existingOptions = [
      { rank: 1, cost: '$2,500.00 USD' },
      { rank: 2, cost: '$2,650.00 USD' },
    ]
    const markup = { type: 'pct', value: 10 }
    const option = buildSpotRateOption(winner, awarded, existingOptions, markup)

    expect(option.routeGroup).toBe('Spot')
    expect(option.spotRate).toBe(true)
    expect(option.rank).toBe(3)
    expect(option.routeRank).toBe(3)
    expect(option.scac).toBe('XPOL')

    // markup applied: (1700 + 150) * 1.10 = 2035.00
    const { total: expectedTotal } = applyMarkup(
      { linehaul: 1700, fuel: 150, accessorials: [] },
      markup,
    )
    expect(expectedTotal).toBe(2035)
    expect(option.cost).toBe('$2,035.00 USD')
    expect(option.rateDetails.apTotal).toBe(2035)
    expect(option.rateDetails.markup).toBeGreaterThan(0)
  })

  // 9. regression guard: benchmark never returns NaN on empty input
  it('benchmark([], {}) returns 0, never NaN', () => {
    const result = benchmark([], {})
    expect(result).toBe(0)
    expect(Number.isNaN(result)).toBe(false)
  })

  it('tolerance evaluation is consistent with the benchmark feeding it (sanity wiring check)', () => {
    const existingOptions = [{ cost: '$2,500.00 USD' }, { cost: '$2,650.00 USD' }]
    const bench = benchmark(existingOptions, {})
    expect(bench).toBe(2650)
    const evalResult = evaluateTolerance({ lowestBid: 1850, benchmark: bench, tolerancePct: 5, monetaryCap: null, totalCap: null, manualReview: false })
    expect(evalResult.withinTolerance).toBe(true)
    expect(evalResult.reason).toBe('within')
  })
})

import { beforeEach, describe, it, expect } from 'vitest'
import {
  listQuotes,
  fuelFor,
  statusFor,
  getBid,
  submitBid,
  declineBid,
  totalFor,
  yourQuoteFor,
  bestFor,
  subscribe,
  resetAllBids,
  CHARGE_NAMES,
} from './carrierQuotes.js'

const NOW = 1_700_000_000_000 // fixed reference instant for all tests

beforeEach(() => {
  resetAllBids()
})

describe('listQuotes — coherence', () => {
  const quotes = listQuotes(NOW)

  it('returns ~12 quotes', () => {
    expect(quotes.length).toBe(12)
  })

  it('weightLb always equals the sum of item weights', () => {
    for (const q of quotes) {
      const sum = q.items.reduce((s, i) => s + i.weightLb, 0)
      expect(q.weightLb).toBe(sum)
    }
  })

  it('fuelFor equals rate × distance, rounded to cents', () => {
    for (const q of quotes) {
      expect(fuelFor(q)).toBeCloseTo(q.fuelRatePerMile * q.distanceMi, 2)
    }
  })

  it('closesAt - openedAt equals durationMin in ms', () => {
    for (const q of quotes) {
      expect(q.closesAt - q.openedAt).toBe(q.durationMin * 60_000)
    }
  })

  it('hazmat quotes carry hazmat fields on at least one item; non-hazmat quotes carry none', () => {
    for (const q of quotes) {
      if (q.hazmat) {
        expect(q.items.some((i) => i.hazmatCode != null)).toBe(true)
      } else {
        expect(q.items.every((i) => i.hazmatCode == null)).toBe(true)
      }
    }
  })

  it('deliverDate is on/after pickupDate', () => {
    for (const q of quotes) {
      expect(new Date(q.deliverDate).getTime()).toBeGreaterThanOrEqual(new Date(q.pickupDate).getTime())
    }
  })

  it('charges is the fixed five-item list', () => {
    for (const q of quotes) {
      expect(q.charges).toEqual(CHARGE_NAMES)
    }
  })
})

describe('statusFor — windows', () => {
  const quotes = listQuotes(NOW)

  it('seeds ~7 open and ~5 closed quotes at the fixed instant', () => {
    const open = quotes.filter((q) => statusFor(q, getBid(q.quoteId), NOW) === 'Open')
    const closed = quotes.filter((q) => statusFor(q, getBid(q.quoteId), NOW) !== 'Open')
    expect(open.length).toBe(7)
    expect(closed.length).toBe(5)
  })

  it('closed quotes resolve to a mix of Expired / Awarded / Cancelled', () => {
    const closedStatuses = quotes
      .map((q) => statusFor(q, getBid(q.quoteId), NOW))
      .filter((s) => s !== 'Open')
    expect(new Set(closedStatuses)).toEqual(new Set(['Expired', 'Awarded', 'Cancelled']))
  })

  it('an open quote flips Open -> Expired once `now` passes closesAt, with no award/cancel seed', () => {
    const q = quotes.find((quote) => statusFor(quote, getBid(quote.quoteId), NOW) === 'Open')
    expect(q.closedOutcome).toBeNull()
    expect(statusFor(q, getBid(q.quoteId), q.closesAt + 1)).toBe('Expired')
  })
})

describe('bid store', () => {
  const quotes = listQuotes(NOW)
  const quote = quotes.find((q) => q.quoteId === '222610') // hazmat quote, fuel = 221

  it('submitBid sets state submitted and computes the right total', () => {
    const bid = submitBid(quote.quoteId, { linehaul: 1000, currency: 'USD', chargeAmounts: { 'Haz-Mat': 50, Tolls: 20 } }, NOW)
    expect(bid.state).toBe('submitted')
    expect(getBid(quote.quoteId)).toEqual(bid)
    expect(totalFor(quote, bid)).toBeCloseTo(1000 + fuelFor(quote) + 70, 2)
    expect(yourQuoteFor(quote, bid)).toBeCloseTo(totalFor(quote, bid), 2)
  })

  it('decline then submit moves the state out of Declined (PRD Feature 3)', () => {
    declineBid(quote.quoteId, NOW)
    expect(getBid(quote.quoteId).state).toBe('declined')
    expect(yourQuoteFor(quote, getBid(quote.quoteId))).toBe('Declined')

    const bid = submitBid(quote.quoteId, { linehaul: 900, currency: 'USD', chargeAmounts: {} }, NOW + 1000)
    expect(bid.state).toBe('submitted')
  })

  it('resubmitting while open updates the bid', () => {
    submitBid(quote.quoteId, { linehaul: 1000, currency: 'USD', chargeAmounts: {} }, NOW)
    const updated = submitBid(quote.quoteId, { linehaul: 1200, currency: 'USD', chargeAmounts: {} }, NOW + 500)
    expect(updated.linehaul).toBe(1200)
    expect(updated.submittedAt).toBe(NOW + 500)
  })

  it('rejects linehaul <= 0 as a no-op', () => {
    const before = getBid(quote.quoteId)
    const attempt = submitBid(quote.quoteId, { linehaul: 0, currency: 'USD', chargeAmounts: {} }, NOW)
    expect(attempt).toEqual(before)
    expect(getBid(quote.quoteId).state).toBe('none')
  })

  it('bestFor returns the seeded best pre-bid, and the bid total once it undercuts the seed', () => {
    expect(quote.bestSeed).toBe(1450.0)
    expect(bestFor(quote, NOW)).toBe(1450.0)

    submitBid(quote.quoteId, { linehaul: 1000, currency: 'USD', chargeAmounts: {} }, NOW) // total ~1221, undercuts 1450
    expect(bestFor(quote, NOW)).toBeCloseTo(totalFor(quote, getBid(quote.quoteId)), 2)
  })

  it('bestFor keeps the seeded value when the bid does not undercut it', () => {
    submitBid(quote.quoteId, { linehaul: 5000, currency: 'USD', chargeAmounts: {} }, NOW) // total far above 1450
    expect(bestFor(quote, NOW)).toBe(1450.0)
  })
})

describe('subscribe', () => {
  const quotes = listQuotes(NOW)
  const quote = quotes[0]

  it('fires on submit and decline, and stops after unsubscribe', () => {
    const calls = []
    const unsubscribe = subscribe(quote.quoteId, (bid) => calls.push(bid.state))

    submitBid(quote.quoteId, { linehaul: 100, currency: 'USD', chargeAmounts: {} }, NOW)
    declineBid(quote.quoteId, NOW)
    expect(calls).toEqual(['submitted', 'declined'])

    unsubscribe()
    submitBid(quote.quoteId, { linehaul: 200, currency: 'USD', chargeAmounts: {} }, NOW)
    expect(calls).toEqual(['submitted', 'declined'])
  })
})

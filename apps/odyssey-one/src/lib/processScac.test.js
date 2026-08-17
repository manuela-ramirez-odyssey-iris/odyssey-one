import { describe, it, expect } from 'vitest'
import { isDuplicate, planProcessScac, droppedCarrierToOption, nextRank, simulatedRoutingDates } from './processScac'

const dropped = {
  scac: 'JBHT', carrierName: 'J.B. HUNT', equipment: 'LTL',
  dropCode: '1', reason: 'No Rates',
  routeRank: '--', rpcId: '--', pickup: '--', delivery: '--',
}
const tender = [
  { rank: 1, scac: 'TAXA', equipment: 'LTL' },
  { rank: 2, scac: 'RLCA', equipment: 'TL' },
]

describe('isDuplicate — LINX-13954 Duplicate Carrier Validation', () => {
  it('matches on SCAC *and* Equipment together, not either alone', () => {
    expect(isDuplicate({ ...dropped, scac: 'TAXA', equipment: 'LTL' }, tender)).toBe(true)
    expect(isDuplicate({ ...dropped, scac: 'TAXA', equipment: 'TL' }, tender)).toBe(false)
    expect(isDuplicate({ ...dropped, scac: 'JBHT', equipment: 'LTL' }, tender)).toBe(false)
  })

  it('is case-insensitive — a SCAC is a code, not free text', () => {
    expect(isDuplicate({ ...dropped, scac: 'taxa', equipment: 'ltl' }, tender)).toBe(true)
  })

  it('is false against an empty tender list', () => {
    expect(isDuplicate(dropped, [])).toBe(false)
  })
})

describe('planProcessScac — the ordered steps for one carrier', () => {
  it('stops at the duplicate dialog and never copies', () => {
    expect(planProcessScac({ ...dropped, scac: 'TAXA', equipment: 'LTL' }, tender))
      .toEqual(['duplicate'])
  })

  it('routes cleanly for No Rates: copy, then the success message', () => {
    expect(planProcessScac(dropped, tender)).toEqual(['copy', 'success'])
  })

  it('routes cleanly for Prohibited Carrier — no special case (Jana Q4)', () => {
    expect(planProcessScac({ ...dropped, dropCode: '2' }, tender)).toEqual(['copy', 'success'])
  })

  it('takes the failure branch for Missing Transit Time, in the AC order', () => {
    expect(planProcessScac({ ...dropped, dropCode: '23' }, tender))
      .toEqual(['manual-dates', 'rating-failed', 'copy'])
  })

  it('checks duplicates BEFORE routing, whatever the drop code', () => {
    expect(planProcessScac({ ...dropped, scac: 'TAXA', equipment: 'LTL', dropCode: '23' }, tender))
      .toEqual(['duplicate'])
  })

  it('treats the drop code as a string or a number — it crosses JSON either way', () => {
    expect(planProcessScac({ ...dropped, dropCode: 23 }, tender)[0]).toBe('manual-dates')
  })
})

describe('nextRank — append only', () => {
  it('is one past the highest existing rank', () => {
    expect(nextRank(tender)).toBe(3)
  })

  it('is 1 for an empty list', () => {
    expect(nextRank([])).toBe(1)
  })

  it('uses the MAX, not the length — ranks can have gaps', () => {
    expect(nextRank([{ rank: 4 }, { rank: 9 }])).toBe(10)
  })
})

describe('droppedCarrierToOption — the copy', () => {
  it('carries identity, equipment, route rank and RPC-ID across', () => {
    const o = droppedCarrierToOption(dropped, { rank: 3 })
    expect(o.rank).toBe(3)
    expect(o.scac).toBe('JBHT')
    expect(o.carrierName).toBe('J.B. HUNT')
    expect(o.equipment).toBe('LTL')
    expect(o.routeRank).toBe('--')
    expect(o.routeGroup).toBe('--')
  })

  it('lands untendered with no rate — nothing rated this carrier', () => {
    const o = droppedCarrierToOption(dropped, { rank: 3 })
    expect(o.status).toBeNull()
    expect(o.rate).toBe('--')
    expect(o.cost).toBe('--')
    expect(o.rateDetails.baseRate).toBe(0)
    expect(o.quoteFlag).toBeUndefined()
  })

  it('takes the user-entered dates when the manual dialog supplied them', () => {
    const o = droppedCarrierToOption({ ...dropped, dropCode: '23' }, {
      rank: 3,
      dates: { pickupDateTime: '09/01/2026 08:00 CST', deliveryDateTime: '09/03/2026 16:00 CST' },
    })
    expect(o.pickupDateTime).toBe('09/01/2026 08:00 CST')
    expect(o.deliveryDateTime).toBe('09/03/2026 16:00 CST')
  })

  it('falls back to the dropped row own dates when routing supplied them', () => {
    const o = droppedCarrierToOption(
      { ...dropped, pickup: '08/20/2025 14:00 CST, Wed', delivery: '08/22/2025 09:00 PST, Fri' },
      { rank: 3 },
    )
    expect(o.pickupDateTime).toBe('08/20/2025 14:00 CST, Wed')
  })
})

describe('simulatedRoutingDates — routing success means dates came back', () => {
  it('takes the lane pickup/delivery window from an existing option', () => {
    // The AC defines Routing Success as "(Pickup and Delivery date available)",
    // so a carrier announced as "Routing completed successfully." must not land
    // with empty dates. Copied from the lane rather than invented — every option
    // on the shipment shares an origin/destination pair.
    expect(simulatedRoutingDates([
      { rank: 1, pickupDateTime: null, deliveryDateTime: null },
      { rank: 2, pickupDateTime: '02/23/2026 12:30 PST', deliveryDateTime: '02/28/2026 12:30 CST' },
    ])).toEqual({
      pickupDateTime: '02/23/2026 12:30 PST',
      deliveryDateTime: '02/28/2026 12:30 CST',
    })
  })

  it('returns null when there is nothing to copy from, rather than inventing a date', () => {
    expect(simulatedRoutingDates([])).toBeNull()
    expect(simulatedRoutingDates([{ rank: 1, pickupDateTime: '02/23/2026 12:30 PST' }])).toBeNull()
  })
})

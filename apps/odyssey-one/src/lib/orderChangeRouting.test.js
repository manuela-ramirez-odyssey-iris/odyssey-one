import { describe, it, expect } from 'vitest'
import { applyStopDates, rerouteOrderChange, rerouteTenderList, stopDateToDisplay } from './orderChangeRouting.js'
import { totalMiles } from '../utils/legMiles.js'

const opt = (rank, baseRate) => ({
  rank, scac: `S${rank}`, status: rank === 1 ? 'Sent' : '',
  pickupDateTime: '01/01/2026 08:00 CST', deliveryDateTime: '01/02/2026 08:00 CST',
  pickupTZ: 'America/Chicago', deliveryTZ: 'America/Chicago',
  rateAmount: baseRate, totalCostAmount: baseRate + 30,
  rateDetails: { baseRate, markup: 10, additionalCharges: [{ amount: 20 }, { amount: 10 }], apTotal: baseRate + 30, arTotal: baseRate + 40 },
})
const stops = [
  { type: 'pickup', date: 'March 4, 2026 10:00 PST', lat: 47.61, lng: -122.33, timeZone: 'America/Los_Angeles' },
  { type: 'pickup', date: 'March 5, 2026 09:00 MST', lat: 39.74, lng: -104.99, timeZone: 'America/Denver' },
  { type: 'delivery', date: 'March 6, 2026 11:00 CST', lat: 41.88, lng: -87.63, timeZone: 'America/Chicago' },
  { type: 'delivery', date: 'March 7, 2026 12:00 EST', lat: 40.71, lng: -74.01, timeZone: 'America/New_York' },
]

describe('orderChangeRouting', () => {
  it('stopDateToDisplay: long → short, short passes through', () => {
    expect(stopDateToDisplay('March 4, 2026 10:00 PST')).toBe('03/04/2026 10:00 PST')
    expect(stopDateToDisplay('03/04/2026 10:00 PST')).toBe('03/04/2026 10:00 PST')
  })

  it('dates + zones come from the FIRST pickup and the LAST delivery', () => {
    const [o] = applyStopDates([opt(1, 100)], stops)
    expect(o.pickupDateTime).toBe('03/04/2026 10:00 PST')
    expect(o.deliveryDateTime).toBe('03/07/2026 12:00 EST')
    expect(o.pickupTZ).toBe('America/Los_Angeles')
    expect(o.deliveryTZ).toBe('America/New_York')
  })

  it('an undated / zoneless stop leaves the option its own values', () => {
    const [o] = applyStopDates([opt(1, 100)], [{ type: 'pickup', date: '--' }, { type: 'delivery', date: '' }])
    expect(o.pickupDateTime).toBe('01/01/2026 08:00 CST')
    expect(o.deliveryTZ).toBe('America/Chicago')
  })

  it('factor is 1 on a null baseline — costs unchanged, dates still applied', () => {
    const [o] = rerouteTenderList([opt(1, 100)], stops, null)
    expect(o.rateDetails.baseRate).toBe(100)
    expect(o.totalCostAmount).toBe(130)
    expect(o.pickupDateTime).toBe('03/04/2026 10:00 PST')
  })

  it('scales the base rate by miles / baseline; charges, ranks, carriers and statuses stay', () => {
    const miles = totalMiles(stops)
    const out = rerouteTenderList([opt(1, 100), opt(2, 200)], stops, miles / 2) // factor 2
    expect(out.map((o) => [o.rank, o.scac, o.status])).toEqual([[1, 'S1', 'Sent'], [2, 'S2', '']])
    expect(out[0].rateDetails.baseRate).toBe(200)
    expect(out[0].rateAmount).toBe(200)
    expect(out[0].totalCostAmount).toBe(230)
    expect(out[0].rateDetails.apTotal).toBe(230)
    expect(out[0].rateDetails.arTotal).toBe(240)
    expect(out[0].rateDetails.additionalCharges).toEqual([{ amount: 20 }, { amount: 10 }])
    expect(out[1].totalCostAmount).toBe(430)
  })

  it('an empty list stays empty', () => {
    expect(rerouteTenderList([], stops, 100)).toEqual([])
    expect(rerouteTenderList(undefined, stops, 100)).toEqual([])
  })

  // B1 (S164) — the Prior | New panel and the compare rows read newOption /
  // comparison, not the list.
  const oc = (newOption) => ({
    newTenderList: [opt(1, 100), opt(2, 200)],
    newOption,
    comparison: [
      { field: 'Pickup Date/Time', prior: '03/04/2026 10:00 PST', new: '01/09/2026 08:00 CST', changed: true },
      { field: 'Delivery Date', prior: '01/02/2026 08:00 CST', new: '01/10/2026 08:00 CST', changed: true },
      { field: 'Gross Weight', prior: '1 LB', new: '2 LB', changed: true },
    ],
  })

  it('rerouteOrderChange re-dates newOption + the comparison and apCost follows the re-scaled list', () => {
    const miles = totalMiles(stops)
    const out = rerouteOrderChange(oc({ scac: 'S2', rank: 2, pickupDateTime: '01/09/2026 08:00 CST', deliveryDateTime: '01/10/2026 08:00 CST', apCost: 1 }), stops, miles / 2)
    expect(out.newOption.pickupDateTime).toBe('03/04/2026 10:00 PST')
    expect(out.newOption.deliveryDateTime).toBe('03/07/2026 12:00 EST')
    expect(out.newOption.apCost).toBe(430)
    expect(out.newTenderList[1].totalCostAmount).toBe(430)
    expect(out.comparison.map((r) => r.new)).toEqual(['03/04/2026 10:00 PST', '03/07/2026 12:00 EST', '2 LB'])
    // prior === new after the re-date → no longer a difference; untouched rows stay.
    expect(out.comparison.map((r) => r.changed)).toEqual([false, true, true])
  })

  it('a carrier routing did not return keeps apCost null', () => {
    const out = rerouteOrderChange(oc({ scac: 'GONE', rank: 3, pickupDateTime: 'x', deliveryDateTime: 'y', apCost: null }), stops, 100)
    expect(out.newOption.apCost).toBeNull()
  })
})

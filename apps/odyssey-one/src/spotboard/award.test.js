import { describe, it, expect } from 'vitest'
import { buildSpotRateOption } from './award.js'

const winningCarrier = {
  scac: 'ODFL',
  name: 'Old Dominion Freight Line',
  equipment: 'Van',
  plannedPickup: '01/07/2026 09:00 CST',
  plannedDelivery: '01/08/2026 09:00 CST',
  bid: {
    linehaul: 2400,
    fuel: 140,
    accessorials: [{ code: 'SOC', amount: 100 }],
    total: 2640,
    status: 'bid',
    submittedBy: 'carrier-ops@odfl.example.com',
  },
}

const quote = { quoteId: 'q-1', shipmentId: '0000000091105' }
const markup = { type: 'flat', value: 150 }

describe('buildSpotRateOption', () => {
  it('ranks one past the existing max', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [{ rank: 1 }, { rank: 3 }], markup)
    expect(option.rank).toBe(4)
    expect(option.routeRank).toBe(4)
  })

  it('ranks 1 when there are no existing options', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [], markup)
    expect(option.rank).toBe(1)
  })

  it('marks the option as a spot award', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [], markup)
    expect(option.routeGroup).toBe('Spot')
    expect(option.rateSource).toBe('Spot')
    expect(option.status).toBe('Sent')
    expect(option.spotRate).toBe(true)
  })

  it('carries the winning carrier identity', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [], markup)
    expect(option.scac).toBe('ODFL')
    expect(option.carrierName).toBe('Old Dominion Freight Line')
    expect(option.transportingCarrier).toBe('Old Dominion Freight Line')
  })

  it('cost/AP reflects applyMarkup(...).total — linehaul + fuel + accessorials + markup', () => {
    // subtotal = 2400 + 140 + 100 = 2640; flat markup 150 → total 2790
    const option = buildSpotRateOption(winningCarrier, quote, [], markup)
    expect(option.cost).toBe('$2,790.00 USD')
    expect(option.rateDetails.apTotal).toBe(2790)
  })

  it('rate mirrors the add-path convention: formatted base (linehaul) rate, no USD suffix', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [], markup)
    expect(option.rate).toBe('$2,400.00')
  })

  it('rateDetails.additionalCharges + baseRate reconstruct the markup total', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [], markup)
    const sum = option.rateDetails.additionalCharges.reduce((s, c) => s + c.amount, 0)
    expect(option.rateDetails.baseRate + sum).toBe(2790)
    expect(option.rateDetails.additionalCharges.some((c) => c.code === 'QMU')).toBe(true)
  })

  it('applies a pct markup the same way tolerance.applyMarkup does', () => {
    const option = buildSpotRateOption(winningCarrier, quote, [], { type: 'pct', value: 10 })
    // subtotal 2640 * 1.10 = 2904
    expect(option.rateDetails.apTotal).toBe(2904)
  })
})

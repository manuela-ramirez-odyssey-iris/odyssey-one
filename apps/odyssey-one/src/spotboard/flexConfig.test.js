import { describe, it, expect } from 'vitest'
import { getFlexConfig } from './flexConfig'

describe('getFlexConfig (SPB-69/73 seeded OCM flex profile)', () => {
  it('is deterministic per shipmentId', () => {
    expect(getFlexConfig('S001')).toEqual(getFlexConfig('S001'))
  })

  it('returns nulls for a missing shipmentId', () => {
    expect(getFlexConfig(null)).toEqual({ pickupDays: null, deliveryDays: null })
    expect(getFlexConfig('')).toEqual({ pickupDays: null, deliveryDays: null })
  })

  it('covers all four combinations across a shipment population', () => {
    const combos = new Set()
    for (let i = 0; i < 200; i++) {
      const { pickupDays, deliveryDays } = getFlexConfig(`SHP${i}`)
      combos.add(`${pickupDays != null}-${deliveryDays != null}`)
    }
    expect(combos).toEqual(new Set(['false-false', 'true-false', 'false-true', 'true-true']))
  })
})

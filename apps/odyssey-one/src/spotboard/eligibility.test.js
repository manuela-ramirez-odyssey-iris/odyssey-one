import { describe, it, expect } from 'vitest'
import { isSpotEligible, eligibilityReason } from './eligibility'

describe('isSpotEligible', () => {
  it('is false when an option is Accepted', () => {
    expect(isSpotEligible({ options: [{ status: 'Accepted' }] })).toBe(false)
  })

  it('is false when an option is Sent', () => {
    expect(isSpotEligible({ options: [{ status: 'Sent' }] })).toBe(false)
  })

  it('is true when options are only Declined/Cancelled', () => {
    expect(isSpotEligible({ options: [{ status: 'Declined' }, { status: 'Cancelled' }] })).toBe(true)
  })

  it('is true for an empty options list', () => {
    expect(isSpotEligible({ options: [] })).toBe(true)
  })

  it('treats null/undefined routingData as eligible', () => {
    expect(isSpotEligible(null)).toBe(true)
    expect(isSpotEligible(undefined)).toBe(true)
  })
})

describe('eligibilityReason', () => {
  it('names the blocking status and carrier when an option is Accepted', () => {
    const reason = eligibilityReason({ options: [{ status: 'Accepted', scac: 'ODFL', carrierName: 'Old Dominion Freight Line' }] })
    expect(reason).toContain('Accepted')
    expect(reason).toContain('Old Dominion Freight Line')
  })

  it('names the blocking status and carrier when an option is Sent', () => {
    const reason = eligibilityReason({ options: [{ status: 'Sent', scac: 'FXFE', carrierName: 'FedEx Freight' }] })
    expect(reason).toContain('Sent')
    expect(reason).toContain('FedEx Freight')
  })

  it('returns empty string when eligible', () => {
    expect(eligibilityReason({ options: [{ status: 'Declined' }] })).toBe('')
    expect(eligibilityReason(null)).toBe('')
  })
})

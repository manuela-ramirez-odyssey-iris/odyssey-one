import { describe, test, expect } from 'vitest'
import { consolidationEligibility, CONSOLIDATION_ATTRIBUTE_KEYS } from './eligibility'

const direct = (over = {}) => ({
  id: '1', shipmentType: 'Direct', tenderStatus: '', customerId: 'VALTRIS_01', ...over,
})

describe('consolidationEligibility', () => {
  test('a direct, untendered shipment is eligible (null reason)', () => {
    expect(consolidationEligibility(direct())).toBeNull()
  })
  test('Declined / Cancelled tenders do not block', () => {
    expect(consolidationEligibility(direct({ tenderStatus: 'Declined' }))).toBeNull()
    expect(consolidationEligibility(direct({ tenderStatus: 'Cancelled' }))).toBeNull()
  })
  test('a consolidated shipment is never a from-scratch candidate', () => {
    expect(consolidationEligibility(direct({ shipmentType: 'Consolidation' }))).toMatch(/direct/i)
    expect(consolidationEligibility(direct({ shipmentType: null }))).toMatch(/direct/i)
  })
  test('an active tender blocks (Sent / Accepted)', () => {
    expect(consolidationEligibility(direct({ tenderStatus: 'Sent' }))).toMatch(/tender/i)
    expect(consolidationEligibility(direct({ tenderStatus: 'Accepted' }))).toMatch(/tender/i)
  })
  test('another customer than the anchor blocks; no anchor means no customer check', () => {
    expect(consolidationEligibility(direct({ customerId: 'KEMIRA_NA_01' }), 'VALTRIS_01')).toMatch(/KEMIRA_NA_01|customer/i)
    expect(consolidationEligibility(direct({ customerId: 'KEMIRA_NA_01' }), null)).toBeNull()
  })
  test('order of checks: type before tender before customer', () => {
    expect(consolidationEligibility(direct({ shipmentType: 'Consolidation', tenderStatus: 'Sent' }), 'X')).toMatch(/direct/i)
  })
})

describe('CONSOLIDATION_ATTRIBUTE_KEYS', () => {
  test('is the consolidation-relevant subset of the shipments progression', () => {
    expect(CONSOLIDATION_ATTRIBUTE_KEYS).toEqual([
      'odyssey-shipment', 'order', 'customer-id', 'customer-name', 'origin', 'destination',
      'pickup-date', 'delivery-date', 'equipment-code', 'mode', 'shipment-type', 'gross-weight',
    ])
  })
})

describe('consolidationEditReason (S155)', () => {
  it('a tendered consolidation is not editable; an untendered one is; a Direct row is not applicable', async () => {
    const { consolidationEditReason } = await import('./eligibility')
    expect(consolidationEditReason({ shipmentType: 'Consolidation', tenderStatus: 'Accepted' })).toMatch(/Tendered/)
    expect(consolidationEditReason({ shipmentType: 'Consolidation', tenderStatus: '' })).toBeNull()
    expect(consolidationEditReason({ shipmentType: 'Direct', tenderStatus: '' })).toMatch(/consolidated/)
  })
})

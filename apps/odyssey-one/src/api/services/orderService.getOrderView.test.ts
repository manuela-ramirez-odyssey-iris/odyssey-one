import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

const SEEDED = [
  {
    orderNumber: 'AAA100001',
    orderSource: 'INTEGRATED',
    customer: 'ERCO_SYS_01',
    shipDirection: 'Outbound',
    freightTerms: 'Pre-Paid',
    equipment: 'VAN',
    consignor: {
      locationId: 'EW-TX-001', city: 'Houston', state: 'TX', country: 'US',
      earliestPickupDateTime: '2026-06-10T08:00:00.000Z',
      latestPickupDateTime: '2026-06-10T16:00:00.000Z',
    },
    consignee: {
      locationId: 'GT-LA-002', city: 'Bastrop', state: 'LA', country: 'US',
      earliestDeliveryDateTime: '2026-06-12T08:00:00.000Z',
      latestDeliveryDateTime: '2026-06-12T16:00:00.000Z',
    },
    grossWeight: { value: 4300, uom: 'lbs' },
    volume: { value: 730, uom: 'cbf' },
    commodity: 'Plastic',
    orderStatus: 'Ready For Plan',
  },
]

vi.mock('../../data/orders', () => ({ getAllOrders: () => SEEDED, getOrderEnrichment: () => null }))

import { createOrder, getDraft, getOrderView, saveDraft, __resetOrderWriteState } from './orderService'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

describe('orderService.getOrderView (mock)', () => {
  beforeEach(() => __resetOrderWriteState())

  it('returns null for an unknown order number', async () => {
    expect(await getOrderView('NOPE-404')).toBeNull()
  })

  it('resolves a seeded order to a lean form VM', async () => {
    const vm = await getOrderView('AAA100001')
    expect(vm).not.toBeNull()
    expect(vm!.general.owningOrganization).toBe('ERCO_SYS_01')
    expect(vm!.general.freightTerm).toBe('Pre-Paid')
    expect(vm!.general.shipDirection).toBe('Outbound')
    expect(vm!.pickupDelivery.consignor.city).toBe('Houston')
    expect(vm!.pickupDelivery.consignee.city).toBe('Bastrop')
    expect(vm!.pickupDelivery.earlyPickup.date).toBe('06/10/2026')
    // commodity promoted to a single product line
    expect(vm!.products.map(p => p.description)).toEqual(['Plastic'])
    // lean source carries no org display name
    expect(vm!.general.owningOrganizationName).toBe('')
  })

  it('resolves a created order via its overlay row (lean)', async () => {
    const { manualOrder } = mapFormToOrderInterface(orderFormValuesSample)
    await createOrder({ manualOrder })
    const vm = await getOrderView('ORD-1001')
    expect(vm).not.toBeNull()
    expect(vm!.general.owningOrganization).toBe('ERCO_SYS_01')
    expect(vm!.pickupDelivery.consignor.city).toBe('Houston')
    expect(vm!.general.owningOrganizationName).toBe('') // overlay row is lean
  })

  it('resolves a DRAFT to the FULL retained form values (not the lean overlay row)', async () => {
    await saveDraft(orderFormValuesSample)
    const vm = await getOrderView('ORD-1001')
    expect(vm).not.toBeNull()
    // full-fidelity fields that the lean overlay row cannot carry:
    expect(vm!.general.owningOrganizationName).toBe('ERCO Systems Inc')
    expect(vm!.specialServices).toEqual([{ code: 'LFT', description: 'Lift gate' }])
    expect(vm!.products).toHaveLength(2)
  })

  // The CreateOrderForm draft-reopen fallback contract (grid Edit action):
  // getDraft only knows session drafts, so a seeded row must miss there but
  // still hydrate through getOrderView.
  it('resolves a seeded order that getDraft cannot (the Edit fallback)', async () => {
    expect(await getDraft('AAA100001')).toBeNull()
    const vm = await getOrderView('AAA100001')
    expect(vm).not.toBeNull()
    expect(vm!.general.orderNumber).toBe('AAA100001')
  })

  it('returns a defensive copy of draft values (caller mutation does not leak)', async () => {
    await saveDraft(orderFormValuesSample)
    const vm = await getOrderView('ORD-1001')
    vm!.general.orderNumber = 'MUTATED'
    const again = await getOrderView('ORD-1001')
    expect(again!.general.orderNumber).toBe('ORD-1001')
  })
})

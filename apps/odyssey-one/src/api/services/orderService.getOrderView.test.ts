import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

const SEEDED = [
  {
    orderNumber: 'AAA100001',
    orderSource: 'INTEGRATED',
    customer: 'ERCO_SYS_01',
    shipDirection: 'O',
    freightTerms: 'P',
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

import { createOrder, getDraft, getOrderList, getOrderView, saveDraft, updateOrder, __resetOrderWriteState } from './orderService'
import { getApiMode } from '../config'
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
    expect(vm!.general.freightTerm).toBe('P')
    expect(vm!.general.shipDirection).toBe('O')
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

  // Live has no session-draft store: getDraft must MISS (null), not throw —
  // a rejection here broke the hydration chain and left every live Edit Order
  // form blank (S102).
  it('returns null in live mode instead of throwing', async () => {
    vi.mocked(getApiMode).mockReturnValueOnce('live')
    await expect(getDraft('AAA100001')).resolves.toBeNull()
  })

  // Edit Order (LINX-10248): updateOrder rewrites in place — the row keeps its
  // number and status, and a reopen hydrates the edited values.
  it('updates a seeded order in place, keeping its status', async () => {
    const edited = structuredClone(orderFormValuesSample)
    edited.general.orderNumber = 'AAA100001'
    edited.products[0].description = 'Edited Commodity'
    await updateOrder('AAA100001', edited)
    const vm = await getOrderView('AAA100001')
    expect(vm!.products[0].description).toBe('Edited Commodity')
    const { orders } = await getOrderList({ pagination: { pageNumber: 1, pageSize: 50 } })
    const row = orders.find(o => o.orderNumber === 'AAA100001')
    expect(row?.orderStatus).toBe('Ready For Plan') // status untouched by the edit
    expect(row?.commodity).toBe('Edited Commodity')
    expect(orders.filter(o => o.orderNumber === 'AAA100001')).toHaveLength(1) // no duplicate row
  })

  it('returns a defensive copy of draft values (caller mutation does not leak)', async () => {
    await saveDraft(orderFormValuesSample)
    const vm = await getOrderView('ORD-1001')
    vm!.general.orderNumber = 'MUTATED'
    const again = await getOrderView('ORD-1001')
    expect(again!.general.orderNumber).toBe('ORD-1001')
  })
})

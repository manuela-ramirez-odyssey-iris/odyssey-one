import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => [], getOrderEnrichment: () => null }))

import { createOrder, updateOrder, saveDraft, getDraft, getOrderList, getAuditTrail, __resetOrderWriteState } from './orderService'
import { getAllShipments, getOverlayShipmentDetail, __resetShipmentWriteState } from '../../data'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)
const page = () => ({ pagination: { pageNumber: 1, pageSize: 20 } })

beforeEach(() => { __resetOrderWriteState(); __resetShipmentWriteState() })

describe('orderService.createOrder (mock)', () => {
  it('returns the LINX-9340 envelope with orderNumber = orderId when blank (LINX-9742)', async () => {
    const v = sample()
    v.general.orderNumber = ''
    const res = await createOrder(mapFormToOrderInterface(v))
    expect(res.success).toBe(true)
    expect(res.orderId).toBeTruthy()
    expect(res.data!.orderNumber).toBe(String(res.orderId).padStart(13, '0'))
    expect(res.message).toContain(res.data!.orderNumber)
    expect(res.data!.shipmentMode).toBe('Ground') // Q28 open; mock constant
  })

  it('respects a provided order number', async () => {
    const res = await createOrder(mapFormToOrderInterface(sample()))
    expect(res.data!.orderNumber).toBe('ORD-1001')
  })

  it('appends a Planned Shipment row the Summary grid can see', async () => {
    await createOrder(mapFormToOrderInterface(sample()))
    const list = await getOrderList(page())
    const row = list.orders.find(o => o.orderNumber === 'ORD-1001')
    expect(row).toBeDefined()
    expect(row!.orderStatus).toBe('Planned Shipment') // S150: the shipment exists, so the order is planned (Dave 2026-09-17)
    expect(row!.orderSource).toBe('MANUAL')
    expect(row!.customer).toBe('ERCO_SYS_01')
    expect(row!.consignor.locationId).toBe('EW-TX-001')
    expect(row!.grossWeight).toEqual({ value: 4300, uom: 'lb' })
  })

  it('creates ONE direct shipment holding the order, parked in Monitoring › Consolidation', async () => {
    const res = await createOrder(mapFormToOrderInterface(sample()))
    const ship = getAllShipments()[0]
    expect(ship.orders).toEqual(['ORD-1001'])
    expect(ship.shipmentType).toBe('Direct')
    expect(ship.odysseyShipmentIdentifier).toMatch(/^O6\d{7}$/)
    expect(ship.panel).toBe('monitoring')
    expect(ship.category).toBe('consolidation')
    expect(ship.tenderStatus).toBe('')
    expect(ship.customerName).toBe('ERCO Systems Inc')
    expect(res.data!.odysseyShipmentIdentifier).toBe(ship.odysseyShipmentIdentifier)
    expect(res.data!.sellShipment).toBe(ship.sellShipment)
    expect(getOverlayShipmentDetail(ship.sellShipment)!.orderList[0].orderId).toBe('ORD-1001')
  })

  it('an order with Consolidatable unchecked parks its shipment on Hold', async () => {
    const v = sample(); v.general.consolidatable = false
    await createOrder(mapFormToOrderInterface(v))
    expect(getAllShipments()[0].category).toBe('hold')
  })

  it('a draft save creates no shipment', async () => {
    const before = getAllShipments().length
    await saveDraft(sample())
    expect(getAllShipments().length).toBe(before)
  })

  // Finding 1 (S147): the created row must carry an anchor createdAt/createdBy
  // — getAuditTrail reads overlayRows first, so a missing anchor is what
  // produced "undefined@odyssey.local" + NaN timestamps on every audit-trail
  // page for a session-created order.
  it('stamps createdAt/createdBy so a freshly created order has a well-formed audit trail', async () => {
    const res = await createOrder(mapFormToOrderInterface(sample()))
    const page = await getAuditTrail({ orderNumber: res.data!.orderNumber, pageNumber: 1, pageSize: 25, sortDirection: 'asc' })
    expect(page.order).toBeTruthy()
    expect(page.order!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    expect(page.order!.createdBy).toBeTruthy()
    expect(page.rows[0].changeCategory).toBe('Order Creation')
  })
})

describe('orderService.updateOrder (mock)', () => {
  // Finding 1 (S147): manualOrderToListRow (the overlay row builder) drops
  // createdAt/createdBy/createdTimeZoneCode; updateOrder rebuilds the row via
  // that same builder on every save, so an edit was silently erasing the
  // order's original creation anchor.
  it('preserves the pre-existing createdAt/createdBy/createdTimeZoneCode across a save', async () => {
    const created = await createOrder(mapFormToOrderInterface(sample()))
    const orderNumber = created.data!.orderNumber
    const before = await getAuditTrail({ orderNumber, pageNumber: 1, pageSize: 25, sortDirection: 'asc' })

    await updateOrder(orderNumber, sample())

    const after = await getAuditTrail({ orderNumber, pageNumber: 1, pageSize: 25, sortDirection: 'asc' })
    expect(after.order!.createdAt).toBe(before.order!.createdAt)
    expect(after.order!.createdBy).toBe(before.order!.createdBy)
    expect(after.order!.createdTimeZoneCode).toBe(before.order!.createdTimeZoneCode)
  })
})

describe('orderService.saveDraft / getDraft (mock)', () => {
  it('upserts a Draft row and round-trips the form values', async () => {
    const saved = await saveDraft(sample())
    expect(saved.draftId).toBeTruthy()
    expect(saved.orderNumber).toBe('ORD-1001')

    const list = await getOrderList(page())
    const row = list.orders.find(o => o.orderNumber === 'ORD-1001')
    expect(row!.orderStatus).toBe('Draft')

    const draft = await getDraft(saved.draftId)
    expect(draft!.values).toEqual(sample())
  })

  it('resolves a draft by order number too (the ?draft=<orderNumber> path)', async () => {
    await saveDraft(sample())
    const draft = await getDraft('ORD-1001')
    expect(draft).not.toBeNull()
    expect(draft!.values.general.owningOrganization).toBe('ERCO_SYS_01')
  })

  it('re-saving with the same draftId updates in place — no duplicate rows', async () => {
    const first = await saveDraft(sample())
    const v = sample()
    v.general.orderNumber = 'ORD-1001-EDITED'
    const second = await saveDraft(v, first.draftId)
    expect(second.draftId).toBe(first.draftId)

    const list = await getOrderList(page())
    expect(list.orders.filter(o => o.orderStatus === 'Draft')).toHaveLength(1)
    expect(list.orders[0].orderNumber).toBe('ORD-1001-EDITED')

    const draft = await getDraft(first.draftId)
    expect(draft!.values.general.orderNumber).toBe('ORD-1001-EDITED')
  })

  it('returns null for an unknown draft key', async () => {
    expect(await getDraft('nope')).toBeNull()
  })
})

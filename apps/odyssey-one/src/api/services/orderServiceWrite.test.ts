import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => [], getOrderEnrichment: () => null }))

import { createOrder, saveDraft, getDraft, getOrderList, __resetOrderWriteState } from './orderService'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const sample = () => structuredClone(orderFormValuesSample)
const page = () => ({ pagination: { pageNumber: 1, pageSize: 20 } })

beforeEach(() => __resetOrderWriteState())

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

  it('appends a Ready For Plan row the Summary grid can see', async () => {
    await createOrder(mapFormToOrderInterface(sample()))
    const list = await getOrderList(page())
    const row = list.orders.find(o => o.orderNumber === 'ORD-1001')
    expect(row).toBeDefined()
    expect(row!.orderStatus).toBe('Ready For Plan')
    expect(row!.orderSource).toBe('MANUAL')
    expect(row!.customer).toBe('ERCO_SYS_01')
    expect(row!.consignor.locationId).toBe('EW-TX-001')
    expect(row!.grossWeight).toEqual({ value: 4300, uom: 'lb' })
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

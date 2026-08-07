// orders-fix-round Task 4 (2026-08-07): the existing saveDraft coverage in
// orderServiceWrite.test.ts is hard-pinned to `mock` mode via a top-level
// vi.mock('../config', ...) — it structurally cannot see live-mode bugs. This
// file mocks the HTTP layer (../client), NOT the mode, and drives saveDraft
// through the ACTUAL live branch, per the plan's explicit instruction.
//
// Bug being fixed: saveDraft's live branch always POSTed to
// /order-service/v3/manual-order, ignoring the draftId argument. The server
// INSERT has no ON CONFLICT, so a second Save for Later on the same open form
// hit orders_number_unique and 409'd. Fix: adopt the server-returned order
// number after the first save (draftId becomes that number), then PUT
// /order-service/v3/order on every subsequent save — mirroring the working
// saveEditInPlace → updateOrder path.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'live') }))

const apiPost = vi.fn()
const apiPut = vi.fn()
vi.mock('../client', () => ({ apiPost: (...args: unknown[]) => apiPost(...args), apiPut: (...args: unknown[]) => apiPut(...args) }))

import { saveDraft } from './orderService'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const blankOrderNumberSample = () => {
  const v = structuredClone(orderFormValuesSample)
  v.general.orderNumber = '' // the normal Save-for-Later path (2026-08-07 decision D)
  return v
}

const SERVER_ORDER_NUMBER = '0000000090001' // 13-digit zero-padded, server-generated (LINX-9742)

beforeEach(() => {
  apiPost.mockReset()
  apiPut.mockReset()
})

describe('saveDraft — live branch (mocks ../client, real getApiMode()==="live")', () => {
  it('first save (no draftId, blank Order Number) POSTs and adopts the server-generated order number', async () => {
    apiPost.mockResolvedValue({
      orderId: 90001,
      success: true,
      message: `Order ${SERVER_ORDER_NUMBER} created successfully`,
      data: { orderNumber: SERVER_ORDER_NUMBER, orderDate: '2026-08-07T00:00:00.000Z', orderDateTimeZoneCode: 'EST', shipmentMode: 'Ground' },
    })

    const result = await saveDraft(blankOrderNumberSample())

    expect(apiPost).toHaveBeenCalledTimes(1)
    expect(apiPost).toHaveBeenCalledWith('/order-service/v3/manual-order', expect.objectContaining({ userId: expect.anything() }))
    expect(apiPut).not.toHaveBeenCalled()
    // The whole point: draftId is no longer '' (the blank form field) — it's
    // the number the server actually minted, so the NEXT saveDraft call can
    // target it.
    expect(result.draftId).toBe(SERVER_ORDER_NUMBER)
    expect(result.orderNumber).toBe(SERVER_ORDER_NUMBER)
  })

  it('the first POST carries orderStatusCode DRAFT (draft: true was passed to the mapper)', async () => {
    apiPost.mockResolvedValue({
      orderId: 90001, success: true, message: 'ok',
      data: { orderNumber: SERVER_ORDER_NUMBER, orderDate: '2026-08-07T00:00:00.000Z', orderDateTimeZoneCode: 'EST', shipmentMode: 'Ground' },
    })

    await saveDraft(blankOrderNumberSample())

    const [, body] = apiPost.mock.calls[0]
    expect(body.manualOrder.orderStatus.orderStatusCode).toBe('DRAFT')
  })

  it('SECOND save on the same form (draftId = the adopted number) PUTs, not POSTs, and does not error', async () => {
    apiPost.mockResolvedValue({
      orderId: 90001, success: true, message: 'ok',
      data: { orderNumber: SERVER_ORDER_NUMBER, orderDate: '2026-08-07T00:00:00.000Z', orderDateTimeZoneCode: 'EST', shipmentMode: 'Ground' },
    })
    const first = await saveDraft(blankOrderNumberSample())

    apiPut.mockResolvedValue({ success: true, orderNumber: SERVER_ORDER_NUMBER })
    const second = await saveDraft(blankOrderNumberSample(), first.draftId)

    expect(apiPost).toHaveBeenCalledTimes(1) // still just the first call — no re-POST
    expect(apiPut).toHaveBeenCalledTimes(1)
    expect(apiPut).toHaveBeenCalledWith(
      '/order-service/v3/order',
      expect.objectContaining({ orderNumber: SERVER_ORDER_NUMBER }),
    )
    expect(second.draftId).toBe(SERVER_ORDER_NUMBER)
    expect(second.orderNumber).toBe(SERVER_ORDER_NUMBER)
  })

  it('the PUT (second+ save) also carries orderStatusCode DRAFT', async () => {
    apiPost.mockResolvedValue({
      orderId: 90001, success: true, message: 'ok',
      data: { orderNumber: SERVER_ORDER_NUMBER, orderDate: '2026-08-07T00:00:00.000Z', orderDateTimeZoneCode: 'EST', shipmentMode: 'Ground' },
    })
    const first = await saveDraft(blankOrderNumberSample())
    apiPut.mockResolvedValue({ success: true, orderNumber: SERVER_ORDER_NUMBER })

    await saveDraft(blankOrderNumberSample(), first.draftId)

    const [, body] = apiPut.mock.calls[0]
    expect(body.manualOrder.orderStatus.orderStatusCode).toBe('DRAFT')
  })
})

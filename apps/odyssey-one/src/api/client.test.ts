import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet, apiPost, apiPut, ApiError } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('apiGet', () => {
  it('sends Content-Type + x-correlation-id, returns parsed JSON on 200', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_API_TOKEN', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'X1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const data = await apiGet<{ id: string }>('/shipment-service/v1/sell-shipment-out/X1')

    expect(data).toEqual({ id: 'X1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/shipment-service/v1/sell-shipment-out/X1')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(typeof init.headers['x-correlation-id']).toBe('string')
    expect(init.headers['x-correlation-id'].length).toBeGreaterThan(0)
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('adds a Bearer token when one is configured', async () => {
    vi.stubEnv('VITE_API_TOKEN', 'tok-9')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await apiGet('/x')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-9')
  })

  it('throws ApiError with status + correlationId on non-OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    const err = (await apiGet('/missing').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(typeof err.correlationId).toBe('string')
    expect(err.correlationId.length).toBeGreaterThan(0)
  })

  // orders-fix-round Task 4: api/index.js's catch-all replies { message, detail }
  // on every non-2xx — a 409's real reason ("Order number already exists: ...")
  // was being discarded in favor of the generic "Request failed (status): path",
  // which is how that 409 stayed invisible to the user. Every apiXxx call must
  // surface body.message when the server sent one.
  it('surfaces the server body.message on non-OK instead of the generic string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Order number already exists: 0000000090001', detail: 'pg 23505' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const err = (await apiGet('/order-service/v3/manual-order').catch((e) => e)) as ApiError
    expect(err.message).toBe('Order number already exists: 0000000090001')
    expect(err.status).toBe(409)
  })

  it('falls back to the generic message when the error body has no message field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    const err = (await apiGet('/x').catch((e) => e)) as ApiError
    expect(err.message).toBe('Request failed (500): /x')
  })
})

describe('apiPost / apiPut error surfacing', () => {
  it('apiPost surfaces the server body.message on non-OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Unknown customer: (none)' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const err = (await apiPost('/order-service/v3/manual-order', {}).catch((e) => e)) as ApiError
    expect(err.message).toBe('Unknown customer: (none)')
  })

  it('apiPut surfaces the server body.message on non-OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'No order: ORD-9' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const err = (await apiPut('/order-service/v3/order', {}).catch((e) => e)) as ApiError
    expect(err.message).toBe('No order: ORD-9')
  })
})

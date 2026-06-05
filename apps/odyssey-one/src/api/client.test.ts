import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet, ApiError } from './client'

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
})

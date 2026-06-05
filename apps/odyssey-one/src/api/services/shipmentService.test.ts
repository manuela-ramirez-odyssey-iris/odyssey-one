import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSellShipmentDetail } from './shipmentService'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('getSellShipmentDetail', () => {
  it('mock mode reads the local /details/{id}.json file', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '777' }) })
    vi.stubGlobal('fetch', fetchMock)

    const data = await getSellShipmentDetail('777')

    expect(data).toEqual({ id: '777' })
    expect(fetchMock.mock.calls[0][0]).toBe('/details/777.json')
  })

  it('live mode calls the real sell-shipment-out endpoint with headers', async () => {
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ shipmentId: '777' }) })
    vi.stubGlobal('fetch', fetchMock)

    const data = await getSellShipmentDetail('777')

    expect(data).toEqual({ shipmentId: '777' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/shipment-service/v1/sell-shipment-out/777')
    expect(init.headers['x-correlation-id']).toBeTruthy()
  })
})

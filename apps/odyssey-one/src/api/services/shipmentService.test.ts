import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSellShipmentDetail } from './shipmentService'
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'

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

  it('live mode calls sell-shipment-out with headers and maps the response', async () => {
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => sellShipmentOutSample })
    vi.stubGlobal('fetch', fetchMock)

    const data = (await getSellShipmentDetail('25690001')) as { orderDetails: { orderNumber: string }[] }

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/shipment-service/v1/sell-shipment-out/25690001')
    expect(init.headers['x-correlation-id']).toBeTruthy()
    expect(data.orderDetails).toHaveLength(2)
    expect(data.orderDetails[0].orderNumber).toBe('SO-660001')
  })

  it('mock mode throws when the detail file is missing', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
    await expect(getSellShipmentDetail('999')).rejects.toThrow('Failed to load details for 999')
  })

  it('live-sim mode returns the fixture mapped to the view-model', async () => {
    vi.stubEnv('VITE_API_MODE', 'live-sim')
    const data = (await getSellShipmentDetail('anything')) as { orderDetails: { orderNumber: string }[] }
    expect(data.orderDetails).toHaveLength(sellShipmentOutSample.orderList.length)
    expect(data.orderDetails[0].orderNumber).toBe('SO-660001')
  })
})

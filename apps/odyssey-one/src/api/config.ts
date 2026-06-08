// Runtime config for the API layer. `mock` reads local generated SellShipmentOut
// detail files and runs them through the mapper (default, no API access needed);
// `live` calls the real shipment-service and maps the response.
// Functions (not constants) so values are read at call time — testable via vi.stubEnv.
export type ApiMode = 'mock' | 'live'

export function getApiMode(): ApiMode {
  const m = import.meta.env.VITE_API_MODE
  if (m === 'live') return 'live'
  return 'mock'
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

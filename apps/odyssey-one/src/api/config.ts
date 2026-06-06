// Runtime config for the API layer. `mock` reads local generated detail files;
// `live` calls the real shipment-service; `live-sim` renders a bundled
// SellShipmentOut fixture through the mapper (visible proof without real access).
// Functions (not constants) so values are read at call time — testable via vi.stubEnv.
export type ApiMode = 'mock' | 'live' | 'live-sim'

export function getApiMode(): ApiMode {
  const m = import.meta.env.VITE_API_MODE
  if (m === 'live') return 'live'
  if (m === 'live-sim') return 'live-sim'
  return 'mock'
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

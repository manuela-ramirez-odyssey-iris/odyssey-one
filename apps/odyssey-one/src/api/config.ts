// Runtime config for the API layer. `mock` reads local generated detail files;
// `live` calls the real shipment-service. Switching modes is a single env flip.
// Functions (not constants) so values are read at call time — testable via vi.stubEnv.
export type ApiMode = 'mock' | 'live'

export function getApiMode(): ApiMode {
  return import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock'
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiMode, getApiBaseUrl } from './config'
import { getAuthToken } from './auth'

afterEach(() => vi.unstubAllEnvs())

describe('api config', () => {
  it('defaults to mock mode when unset', () => {
    vi.stubEnv('VITE_API_MODE', '')
    expect(getApiMode()).toBe('mock')
  })

  it('reads live mode from env', () => {
    vi.stubEnv('VITE_API_MODE', 'live')
    expect(getApiMode()).toBe('live')
  })

  it('returns empty base url when unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBe('')
  })

  it('returns the configured token, or null when unset', () => {
    vi.stubEnv('VITE_API_TOKEN', 'dev-token-123')
    expect(getAuthToken()).toBe('dev-token-123')
    vi.stubEnv('VITE_API_TOKEN', '')
    expect(getAuthToken()).toBeNull()
  })
})

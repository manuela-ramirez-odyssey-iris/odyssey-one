import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiMode, getApiBaseUrl } from './config'

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

  it('reads live-sim mode from env', () => {
    vi.stubEnv('VITE_API_MODE', 'live-sim')
    expect(getApiMode()).toBe('live-sim')
  })

  it('returns empty base url when unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBe('')
  })

  it('returns the configured base url', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    expect(getApiBaseUrl()).toBe('https://api.example.com')
  })
})

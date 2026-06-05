import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthToken } from './auth'

afterEach(() => vi.unstubAllEnvs())

describe('getAuthToken', () => {
  it('returns the configured token', () => {
    vi.stubEnv('VITE_API_TOKEN', 'dev-token-123')
    expect(getAuthToken()).toBe('dev-token-123')
  })
  it('returns null when unset', () => {
    vi.stubEnv('VITE_API_TOKEN', '')
    expect(getAuthToken()).toBeNull()
  })
})

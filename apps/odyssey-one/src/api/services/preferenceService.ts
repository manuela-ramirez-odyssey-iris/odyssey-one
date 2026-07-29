import { getApiMode } from '../config'
import { apiGet, apiPut } from '../client'
import { currentUser } from '../../data/sso-mock'

// Per-user UI preferences (user_preferences table via /user-service/v1/preference).
// live: GET/PUT the API, sending the mock-SSO current user id (server defaults
// 'guest'). mock: in-memory map — no localStorage, so tests stay deterministic
// and mock mode behaves like today's route-lifespan state.
// ponytail: identity = sso-mock currentUser.id until real SSO lands.

const mockStore = new Map<string, unknown>()

export async function getPreference<T>(key: string): Promise<T | null> {
  if (getApiMode() === 'live') {
    const res = await apiGet<{ key: string; value: T | null }>(
      `/user-service/v1/preference?key=${encodeURIComponent(key)}&userId=${encodeURIComponent(currentUser.id)}`,
    )
    return res.value
  }
  return (mockStore.get(key) as T | undefined) ?? null
}

export async function putPreference<T>(key: string, value: T): Promise<void> {
  if (getApiMode() === 'live') {
    await apiPut<{ success: boolean }>('/user-service/v1/preference', { key, value, userId: currentUser.id })
    return
  }
  mockStore.set(key, value)
}

// test-only: reset the mock store between specs
export function __clearMockPreferences() {
  mockStore.clear()
}

import { describe, it, expect, beforeEach } from 'vitest'
import { getPreference, putPreference, __clearMockPreferences } from './preferenceService'

// Default mode is mock (no VITE_API_MODE): in-memory passthrough, no network,
// no localStorage — round-trips within a session, empty at start.
describe('preferenceService (mock mode)', () => {
  beforeEach(() => __clearMockPreferences())

  it('returns null for an unset key', async () => {
    expect(await getPreference('shipments.columnPresets')).toBeNull()
  })

  it('round-trips a saved value', async () => {
    const value = { activePresetId: 'default-exceptions', presetColumns: { 'default-exceptions': ['a', 'b'] } }
    await putPreference('shipments.columnPresets', value)
    expect(await getPreference('shipments.columnPresets')).toEqual(value)
  })
})

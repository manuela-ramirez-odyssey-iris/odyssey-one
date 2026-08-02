// The /api-prefix defect class, client side (S105). apiPost prepends
// VITE_API_BASE_URL (=/api), so adapter paths must NOT carry /api themselves —
// '/api/v1/search' became /api/api/v1/search on the wire and 404'd in prod,
// degrading the live preview to "No matching results found". Caught only by
// browser verification against the deployed site; this test pins the class.
import { test, expect, vi, beforeEach } from 'vitest'

const calls = []
vi.mock('../../api/client', () => ({
  apiPost: vi.fn(async (path, body) => {
    calls.push(path)
    return { results: [], total: 0, attributes: [] }
  }),
}))

import { makeLiveAdapter } from './liveAdapter'
import { shipmentsSearchAdapter as mockAdapter } from './adapter'

beforeEach(() => { calls.length = 0 })

test('live adapter request paths are /api-base-relative (never /api/... themselves)', async () => {
  const live = makeLiveAdapter(mockAdapter)
  await live.searchShipments([], '447978')
  await live.getSuggestions('447978')
  expect(calls.length).toBeGreaterThan(0)
  for (const path of calls) {
    expect(path.startsWith('/api/'), `"${path}" double-prefixes the /api base`).toBe(false)
    expect(path.startsWith('/v1/')).toBe(true)
  }
})

// @vitest-environment jsdom
// Write-through-to-DB behavior (live mode only) — mock-mode paths stay
// covered by draftStore.test.js, untouched by this file.
import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { listDrafts, saveDraftSnapshot, hydrateDrafts } from './draftStore.js'

const SHIPMENT_ID = 'S1'

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_API_MODE', 'live')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('hydrateDrafts: a null DB response clears the local list', async () => {
  localStorage.setItem(`spotboard:drafts:${SHIPMENT_ID}`, JSON.stringify([{ id: 'd1', savedAt: 1 }]))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ value: null }) }))

  const result = await hydrateDrafts(SHIPMENT_ID)

  expect(result).toEqual([])
  expect(listDrafts(SHIPMENT_ID)).toEqual([])
})

it('hydrateDrafts: a non-null DB response overwrites the local list', async () => {
  const dbDrafts = [{ id: 'd2', savedAt: 2, payload: { listId: 'x' } }]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ value: dbDrafts }) }))

  const result = await hydrateDrafts(SHIPMENT_ID)

  expect(result).toEqual(dbDrafts)
  expect(listDrafts(SHIPMENT_ID)).toEqual(dbDrafts)
})

it('saveDraftSnapshot fires a fire-and-forget PUT of the whole drafts list', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  vi.stubGlobal('fetch', fetchMock)

  saveDraftSnapshot(SHIPMENT_ID, { listId: 'a' }, 1000)
  await Promise.resolve()
  await Promise.resolve()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, opts] = fetchMock.mock.calls[0]
  expect(url).toContain(`/spot-service/v1/spot/${SHIPMENT_ID}`)
  expect(opts.method).toBe('PUT')
  expect(JSON.parse(opts.body)).toMatchObject({ kind: 'drafts' })
})

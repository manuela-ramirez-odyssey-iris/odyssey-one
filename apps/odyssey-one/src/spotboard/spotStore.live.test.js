// @vitest-environment jsdom
// Write-through-to-DB behavior (live mode only) — spotStore.js's mock-mode
// paths are already covered by spotStore.test.js and stay untouched by this
// file. fetch is stubbed rather than hitting the network.
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { getQuote, saveDraft, clearQuote, hydrateQuote } from './spotStore.js'

const SHIPMENT_ID = '25690001'

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_API_MODE', 'live')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('hydrateQuote (DB authoritative)', () => {
  it('a null DB response clears the local cache', async () => {
    localStorage.setItem(`spotboard:${SHIPMENT_ID}`, JSON.stringify({ shipmentId: SHIPMENT_ID, status: 'draft' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ value: null }) }))

    const result = await hydrateQuote(SHIPMENT_ID)

    expect(result).toBeNull()
    expect(getQuote(SHIPMENT_ID)).toBeNull()
  })

  it('a non-null DB response overwrites the local cache, without re-PUTting (no echo loop)', async () => {
    const dbQuote = { shipmentId: SHIPMENT_ID, status: 'open', quoteId: 'q1' }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ value: dbQuote }) })
    vi.stubGlobal('fetch', fetchMock)

    const result = await hydrateQuote(SHIPMENT_ID)

    expect(result).toEqual(dbQuote)
    expect(getQuote(SHIPMENT_ID)).toEqual(dbQuote)
    expect(fetchMock).toHaveBeenCalledTimes(1) // GET only — a PUT here would mean the echo guard failed
  })
})

describe('write-through', () => {
  it('a mutator (saveDraft) fires a fire-and-forget PUT of the whole quote blob', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    saveDraft(SHIPMENT_ID, { listId: 'a', listName: 'TL', durationMin: 30, carriers: [] })
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain(`/spot-service/v1/spot/${SHIPMENT_ID}`)
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toMatchObject({ kind: 'quote' })
  })

  it('clearQuote fires a fire-and-forget DELETE', async () => {
    saveDraft(SHIPMENT_ID, { listId: 'a', listName: 'TL', durationMin: 30, carriers: [] })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    clearQuote(SHIPMENT_ID)
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain(`/spot-service/v1/spot/${SHIPMENT_ID}`)
    expect(opts.method).toBe('DELETE')
  })
})

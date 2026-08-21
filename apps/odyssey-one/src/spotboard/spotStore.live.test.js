// @vitest-environment jsdom
// Write-through-to-DB behavior (live mode only) — spotStore.js's mock-mode
// paths are already covered by spotStore.test.js and stay untouched by this
// file. fetch is stubbed rather than hitting the network.
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { getQuote, saveDraft, sendRFQ, clearQuote, hydrateQuote } from './spotStore.js'

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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    // saveDraft's own write must land (and its PUT fire) before we start
    // counting — same-key writes are now serialized (defect 1 fix), so
    // clearQuote's DELETE would otherwise be queued behind it and this
    // assertion would see the PUT, not the DELETE.
    saveDraft(SHIPMENT_ID, { listId: 'a', listName: 'TL', durationMin: 30, carriers: [] })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fetchMock.mockClear()

    clearQuote(SHIPMENT_ID)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain(`/spot-service/v1/spot/${SHIPMENT_ID}`)
    expect(opts.method).toBe('DELETE')
  })

  // Defect 1 (CRITICAL): saveDraft then sendRFQ (SpotBoardTab.handleSendRFQ's
  // exact sequence) each fire a fire-and-forget PUT of the same row
  // (shipmentId, kind='quote'). Unserialized, the two requests can resolve
  // out of order and the LAST ONE TO RESOLVE wins on the server regardless
  // of which was sent first — reproduced 2/5 runs as a DB row stuck at
  // status:'draft' while the local/UI state had already moved to 'open'.
  // Fix: spotApi.js chains same-key writes so the second fetch never even
  // STARTS until the first one settles — proven here by holding the first
  // fetch open and asserting the second call hasn't fired yet.
  it('two rapid writes to the same (shipmentId, kind) are serialized — the second PUT fetch starts only after the first resolves', async () => {
    let resolveFirst
    const firstPending = new Promise((resolve) => { resolveFirst = resolve })
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => firstPending)
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({ success: true }) }))
    vi.stubGlobal('fetch', fetchMock)

    saveDraft(SHIPMENT_ID, { listId: 'a', listName: 'TL', durationMin: 30, carriers: [] })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1)) // first PUT in flight

    sendRFQ(SHIPMENT_ID, Date.now())
    // Give the second write every chance to fire (real macrotask, not just a
    // couple of microtask ticks) while the first is still unresolved — this
    // is the assertion that actually catches the race: unserialized, apiPut
    // calls fetch() synchronously up front, so it would already be 2 here.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveFirst({ ok: true, json: async () => ({ success: true }) })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2)) // now the second (sendRFQ) PUT fires
  })
})

// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import {
  getQuote,
  saveDraft,
  sendRFQ,
  submitBid,
  declineBid,
  closeQuote,
  award,
  clearQuote,
  lowestBid,
  subscribe,
} from './spotStore.js'
import { decodeToken } from './token.js'

const SHIPMENT_ID = '0000000091105'

const CARRIERS = [
  { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
  { scac: 'SAIA', name: 'Saia', email: 'ops@saia.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
  { scac: 'XPOL', name: 'XPO', email: 'ops@xpol.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
]

const draftInput = {
  listId: 'tl-se',
  listName: 'TL Southeast Overflow',
  durationMin: 120,
  carriers: CARRIERS,
}

beforeEach(() => {
  localStorage.clear()
})

describe('getQuote', () => {
  it('returns null when no quote is stored', () => {
    expect(getQuote(SHIPMENT_ID)).toBeNull()
  })

  it('returns null on corrupt JSON, never throws', () => {
    localStorage.setItem(`spotboard:${SHIPMENT_ID}`, '{not json')
    expect(() => getQuote(SHIPMENT_ID)).not.toThrow()
    expect(getQuote(SHIPMENT_ID)).toBeNull()
  })
})

describe('saveDraft', () => {
  it('round-trips through getQuote as a draft', () => {
    const saved = saveDraft(SHIPMENT_ID, draftInput)
    expect(saved.status).toBe('draft')
    expect(saved.shipmentId).toBe(SHIPMENT_ID)
    expect(saved.listId).toBe('tl-se')
    expect(saved.carriers).toHaveLength(3)
    expect(getQuote(SHIPMENT_ID)).toEqual(saved)
  })

  it('assigns a quoteId', () => {
    const saved = saveDraft(SHIPMENT_ID, draftInput)
    expect(typeof saved.quoteId).toBe('string')
    expect(saved.quoteId.length).toBeGreaterThan(0)
  })

  it('round-trips flexiblePickup through getQuote, defaulting to false when absent', () => {
    const saved = saveDraft(SHIPMENT_ID, { ...draftInput, flexiblePickup: true })
    expect(saved.flexiblePickup).toBe(true)
    expect(getQuote(SHIPMENT_ID).flexiblePickup).toBe(true)

    localStorage.clear()
    const savedNoFlag = saveDraft(SHIPMENT_ID, draftInput)
    expect(savedNoFlag.flexiblePickup).toBe(false)
  })

  it('is a no-op once the quote is open', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const opened = sendRFQ(SHIPMENT_ID, Date.now())
    const attempt = saveDraft(SHIPMENT_ID, { ...draftInput, listName: 'Changed' })
    expect(attempt).toEqual(opened)
  })
})

describe('sendRFQ', () => {
  it('moves draft -> open and sets openAt/closeAt from durationMin', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const now = 1_700_000_000_000
    const quote = sendRFQ(SHIPMENT_ID, now)
    expect(quote.status).toBe('open')
    expect(quote.openAt).toBe(now)
    expect(quote.closeAt).toBe(now + 120 * 60_000)
  })

  it('is a no-op when there is no draft to send', () => {
    expect(sendRFQ(SHIPMENT_ID, Date.now())).toBeNull()
  })

  it('is a no-op when already open', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const opened = sendRFQ(SHIPMENT_ID, 1000)
    const again = sendRFQ(SHIPMENT_ID, 5000)
    expect(again).toEqual(opened)
  })

  it('mints a distinct token per carrier row, each decoding back to that carrier scac', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const opened = sendRFQ(SHIPMENT_ID, Date.now())

    const tokens = opened.carriers.map((c) => c.token)
    expect(tokens.every((t) => typeof t === 'string' && t.length > 0)).toBe(true)
    expect(new Set(tokens).size).toBe(tokens.length)

    for (const carrier of opened.carriers) {
      expect(decodeToken(carrier.token)).toEqual({ shipmentId: SHIPMENT_ID, scac: carrier.scac })
    }
  })

  it('tokens are stable — re-reading the quote never re-mints', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    sendRFQ(SHIPMENT_ID, Date.now())

    const first = getQuote(SHIPMENT_ID).carriers.map((c) => c.token)
    const second = getQuote(SHIPMENT_ID).carriers.map((c) => c.token)
    expect(second).toEqual(first)
  })
})

describe('submitBid', () => {
  const now = 1_700_000_000_000
  const durationMs = 120 * 60_000

  function openQuote() {
    saveDraft(SHIPMENT_ID, draftInput)
    return sendRFQ(SHIPMENT_ID, now)
  }

  it('writes a bid onto the matching carrier while open and before closeAt', () => {
    openQuote()
    const bid = { linehaul: 2000, fuel: 200, accessorials: [], total: 2200, status: 'bid', submittedBy: 'dispatch@odfl.com' }
    const quote = submitBid(SHIPMENT_ID, 'ODFL', bid, now + 1000)
    const carrier = quote.carriers.find((c) => c.scac === 'ODFL')
    expect(carrier.bid).toMatchObject({ total: 2200, status: 'bid' })
    expect(carrier.bid.respondedAt).toBe(now + 1000)
  })

  it('is a no-op when status is not open', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const draft = getQuote(SHIPMENT_ID)
    const bid = { linehaul: 2000, fuel: 200, accessorials: [], total: 2200, status: 'bid' }
    const attempt = submitBid(SHIPMENT_ID, 'ODFL', bid, now)
    expect(attempt).toEqual(draft)
  })

  it('is a no-op when now > closeAt', () => {
    const opened = openQuote()
    const bid = { linehaul: 2000, fuel: 200, accessorials: [], total: 2200, status: 'bid' }
    const attempt = submitBid(SHIPMENT_ID, 'ODFL', bid, now + durationMs + 1)
    expect(attempt).toEqual(opened)
  })
})

describe('declineBid', () => {
  const now = 1_700_000_000_000

  it('marks the carrier bid as declined while open', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    sendRFQ(SHIPMENT_ID, now)
    const quote = declineBid(SHIPMENT_ID, 'SAIA', now + 500)
    const carrier = quote.carriers.find((c) => c.scac === 'SAIA')
    expect(carrier.bid).toMatchObject({ status: 'declined' })
    expect(carrier.bid.respondedAt).toBe(now + 500)
  })
})

describe('closeQuote', () => {
  const now = 1_700_000_000_000
  const durationMs = 120 * 60_000

  it('moves open -> closed and leaves silent carriers with no bid field at all', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    sendRFQ(SHIPMENT_ID, now)
    submitBid(SHIPMENT_ID, 'ODFL', { linehaul: 2000, fuel: 200, accessorials: [], total: 2200, status: 'bid' }, now + 100)
    // SAIA and XPOL never respond
    const quote = closeQuote(SHIPMENT_ID, now + durationMs + 1)
    expect(quote.status).toBe('closed')
    const silent = quote.carriers.find((c) => c.scac === 'SAIA')
    expect(silent.bid).toBeUndefined()
    expect('bid' in silent).toBe(false)
  })

  it('is a no-op unless status is open', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const draft = getQuote(SHIPMENT_ID)
    const attempt = closeQuote(SHIPMENT_ID, now)
    expect(attempt).toEqual(draft)
  })
})

describe('lowestBid', () => {
  it('returns null when no carrier has bid', () => {
    const quote = { carriers: CARRIERS }
    expect(lowestBid(quote)).toBeNull()
  })

  it('picks the minimum total among bidding carriers, ignoring declines and silents', () => {
    const quote = {
      carriers: [
        { scac: 'ODFL', bid: { total: 2200, status: 'bid' } },
        { scac: 'SAIA', bid: { status: 'declined' } },
        { scac: 'XPOL', bid: { total: 1950, status: 'bid' } },
        { scac: 'RDWY' }, // silent, no bid
      ],
    }
    expect(lowestBid(quote).scac).toBe('XPOL')
  })
})

describe('award', () => {
  const now = 1_700_000_000_000
  const durationMs = 120 * 60_000

  it('moves closed -> awarded and sets awardedScac/awardType', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    sendRFQ(SHIPMENT_ID, now)
    submitBid(SHIPMENT_ID, 'XPOL', { linehaul: 1900, fuel: 50, accessorials: [], total: 1950, status: 'bid' }, now + 100)
    closeQuote(SHIPMENT_ID, now + durationMs + 1)
    const quote = award(SHIPMENT_ID, 'XPOL', 'manual')
    expect(quote.status).toBe('awarded')
    expect(quote.awardedScac).toBe('XPOL')
    expect(quote.awardType).toBe('manual')
  })

  it('is a no-op unless status is closed', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const draft = getQuote(SHIPMENT_ID)
    const attempt = award(SHIPMENT_ID, 'XPOL', 'manual')
    expect(attempt).toEqual(draft)
  })
})

describe('clearQuote', () => {
  it('removes the stored quote', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    clearQuote(SHIPMENT_ID)
    expect(getQuote(SHIPMENT_ID)).toBeNull()
  })
})

describe('subscribe', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls back with the re-read quote on a window storage event', () => {
    saveDraft(SHIPMENT_ID, draftInput)
    const cb = vi.fn()
    const unsubscribe = subscribe(SHIPMENT_ID, cb)

    window.dispatchEvent(new Event('storage'))

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(getQuote(SHIPMENT_ID))

    unsubscribe()
    window.dispatchEvent(new Event('storage'))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('guards for a non-browser environment instead of throwing', () => {
    const originalWindow = globalThis.window
    // simulate no-window environment
    globalThis.window = undefined
    let unsubscribe
    expect(() => {
      unsubscribe = subscribe(SHIPMENT_ID, () => {})
    }).not.toThrow()
    expect(() => unsubscribe()).not.toThrow()
    globalThis.window = originalWindow
  })
})

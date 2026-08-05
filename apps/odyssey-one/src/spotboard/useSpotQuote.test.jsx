// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpotQuote } from './useSpotQuote.js'

const SHIPMENT_ID = '0000000091105'

const CARRIERS = [
  { scac: 'ODFL', name: 'Old Dominion', email: 'ops@odfl.example.com', equipment: 'Van', incl: true, plannedPickup: '', plannedDelivery: '', flags: [] },
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

describe('useSpotQuote', () => {
  it('seeds quote null when nothing stored, then saveDraft sets status draft', () => {
    const { result } = renderHook(() => useSpotQuote(SHIPMENT_ID))
    expect(result.current.quote).toBeNull()

    act(() => {
      result.current.saveDraft(draftInput)
    })

    expect(result.current.quote.status).toBe('draft')
    expect(result.current.quote.shipmentId).toBe(SHIPMENT_ID)
  })

  it('re-reads when a storage event fires (cross-tab sync)', () => {
    const { result } = renderHook(() => useSpotQuote(SHIPMENT_ID))

    act(() => {
      result.current.saveDraft(draftInput)
    })
    const quoteId = result.current.quote.quoteId

    // Simulate another tab writing directly to localStorage, then firing the
    // storage event the real browser would dispatch.
    const updated = { ...result.current.quote, status: 'open', openAt: 1000, closeAt: 8200000 }
    act(() => {
      localStorage.setItem(`spotboard:${SHIPMENT_ID}`, JSON.stringify(updated))
      window.dispatchEvent(new Event('storage'))
    })

    expect(result.current.quote.status).toBe('open')
    expect(result.current.quote.quoteId).toBe(quoteId)
  })

  it('clearQuote sets quote to null even though the store returns void', () => {
    const { result } = renderHook(() => useSpotQuote(SHIPMENT_ID))

    act(() => {
      result.current.saveDraft(draftInput)
    })
    expect(result.current.quote).not.toBeNull()

    act(() => {
      result.current.clearQuote()
    })

    expect(result.current.quote).toBeNull()
  })
})

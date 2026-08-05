import { useState, useEffect, useCallback } from 'react'
import * as spotStore from './spotStore.js'

// useSpotQuote — thin React wrapper around spotStore. Holds `quote` in state,
// seeded per shipmentId and kept in sync via spotStore.subscribe (cross-tab
// `storage` events). Every mutator is pre-bound to shipmentId and pushes the
// store's return value into state; clearQuote is the one mutator that
// returns void, so it's special-cased to null the state directly.
export function useSpotQuote(shipmentId) {
  const [quote, setQuote] = useState(() => spotStore.getQuote(shipmentId))

  useEffect(() => {
    setQuote(spotStore.getQuote(shipmentId))
    return spotStore.subscribe(shipmentId, setQuote)
  }, [shipmentId])

  const saveDraft = useCallback(
    (input) => setQuote(spotStore.saveDraft(shipmentId, input)),
    [shipmentId],
  )
  const sendRFQ = useCallback(
    (nowMs) => setQuote(spotStore.sendRFQ(shipmentId, nowMs)),
    [shipmentId],
  )
  const submitBid = useCallback(
    (scac, bid, nowMs) => setQuote(spotStore.submitBid(shipmentId, scac, bid, nowMs)),
    [shipmentId],
  )
  const declineBid = useCallback(
    (scac, nowMs) => setQuote(spotStore.declineBid(shipmentId, scac, nowMs)),
    [shipmentId],
  )
  const closeQuote = useCallback(
    (nowMs) => setQuote(spotStore.closeQuote(shipmentId, nowMs)),
    [shipmentId],
  )
  const award = useCallback(
    (scac, awardType) => setQuote(spotStore.award(shipmentId, scac, awardType)),
    [shipmentId],
  )
  const clearQuote = useCallback(() => {
    spotStore.clearQuote(shipmentId)
    setQuote(null)
  }, [shipmentId])

  return { quote, saveDraft, sendRFQ, submitBid, declineBid, closeQuote, award, clearQuote }
}

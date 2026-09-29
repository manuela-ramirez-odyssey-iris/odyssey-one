import { useResolveOrderChange } from '../../api/queries/useResolveOrderChange'
import useSheet from '../useSheet'

// LINX-15671 Scenario A/B — where an order-change approval lands depends on
// whether a tender is already active at the moment it fires:
//  - Scenario A (a tender is already active): land back on the Direct
//    decision screen so the planner can resolve the pending tender against
//    the (possibly just-finalized) stops plan.
//  - Scenario B (no active tender yet): nothing to re-solicit — the approval
//    IS the final decision, so land on the Tender tab once it persists.
//
// Extracted from OrderChangeEditStopsRoute.handleApprove (S160 T2) so
// StopsTab's Approve Plan (T3) shares the exact same branch rather than
// reimplementing it. The two screens differ in what (if anything) Scenario B
// persists — Edit Shipment Stops always calls save-stops FIRST regardless of
// scenario (the stop edits need saving either way) and only asks this hook
// where to land afterwards (`afterApprove`); StopsTab's Approve Plan has
// nothing of its own to persist in Scenario A, so it never calls the server
// at all there (`approvePlan` gates the mutate itself).
export const ACTIVE_TENDER_STATUSES = ['To Be Tendered', 'Sent', 'Accepted']
export const isActiveTender = (status) => ACTIVE_TENDER_STATUSES.includes(status)

// D1 (S164) — "no active tender" for the review card: null/''/Declined/
// Cancelled/To Be Tendered (R2: a routing list nobody tendered isn't a tender
// to keep). Deliberately NOT ACTIVE_TENDER_STATUSES, which still gates the
// Scenario A/B edit-stops branch (DEC-209 governs entry, not the outcome).
export const hasActivePriorTender = (status) => status === 'Sent' || status === 'Accepted'

export function useApproveOrderChange({ sellShipment, buyShipment, odysseyShipmentIdentifier }) {
  const { openSheet, closeSheet } = useSheet()
  const resolve = useResolveOrderChange()

  // openSheet + replace (not closeSheet): the Direct review is a SIBLING
  // sheet at the same depth, not the base underneath this one — replace
  // swaps this layer for it so closing IT still lands on /shipments, not
  // back on whichever screen opened it (S158 plan §3).
  // E3 — from:'stops' so the review's X returns to the shipment just edited.
  const openDirectReview = () => openSheet(
    `/shipments/order-change/${sellShipment}`,
    { state: { buyShipment, odysseyShipmentIdentifier, from: 'stops' }, replace: true },
  )
  // Scenario B re-files the row to Exceptions › Tender Review (SCENARIO_B,
  // api/_lib/shipments.mjs), so land THERE — the Order Change tab no longer
  // holds it.
  const closeToTenderTab = () => closeSheet('/shipments', {
    state: { selectedShipmentId: sellShipment, requestedTab: { key: 'routing' }, panel: 'exceptions', tab: 'tender-review' },
  })

  // Edit Shipment Stops: the save-stops mutate() already ran (unconditionally,
  // both scenarios) — call this from its onSuccess to decide where it lands.
  function afterApprove(tenderStatus) {
    if (isActiveTender(tenderStatus)) openDirectReview()
    else closeToTenderTab()
  }

  // StopsTab's Approve Plan (T3): Scenario A makes no server call at all —
  // the stops are unchanged, there's nothing to persist.
  function approvePlan(tenderStatus, { onError } = {}) {
    if (isActiveTender(tenderStatus)) { openDirectReview(); return }
    resolve.mutate(
      { sellShipment, action: 'approve-plan', priorTenderStatus: tenderStatus, cost: null, priorScac: null },
      { onSuccess: closeToTenderTab, onError },
    )
  }

  return { afterApprove, approvePlan, resolve }
}

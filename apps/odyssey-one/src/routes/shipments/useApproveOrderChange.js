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

export function useApproveOrderChange({ sellShipment, buyShipment, odysseyShipmentIdentifier }) {
  const { openSheet, closeSheet } = useSheet()
  const resolve = useResolveOrderChange()

  // openSheet + replace (not closeSheet): the Direct review is a SIBLING
  // sheet at the same depth, not the base underneath this one — replace
  // swaps this layer for it so closing IT still lands on /shipments, not
  // back on whichever screen opened it (S158 plan §3).
  const openDirectReview = () => openSheet(
    `/shipments/order-change/${sellShipment}`,
    { state: { buyShipment, odysseyShipmentIdentifier }, replace: true },
  )
  const closeToTenderTab = () => closeSheet('/shipments', {
    state: { selectedShipmentId: sellShipment, requestedTab: { key: 'routing' }, panel: 'exceptions', tab: 'order-change' },
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

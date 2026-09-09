import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveOrderChange } from '../services/shipmentService'
import type { SellShipmentStop } from '../types/sellShipmentOut'

export interface ResolveOrderChangeInput {
  sellShipment: string
  action: 'retender' | 'bypass' | 'cancel' | 'save-stops'
  priorTenderStatus: string | null
  cost: { choice: 'prior' | 'new' | 'quote'; amount: number } | null
  // S137 — the carrier whose tender row gets the selected cost written onto
  // it (resolveOrderChange, retender/bypass only). Identifies the row by
  // scac, not rank: rank is unstable across a re-route.
  priorScac: string | null
  // S143 Task 3 — save-stops only: the finalized stop rows off Edit Shipment
  // Stops' Approve Changes (stopsSandbox.js toDto). Only a subset of
  // SellShipmentStop — the sandbox can't produce region/postal/timezone/
  // totals — plus sourceStopSequence, which the server needs to pull those
  // from detail.shipmentStopList (api/_lib/shipments.mjs mergeStops).
  stops?: Array<Partial<SellShipmentStop> & { stopSequence: number; stopType: string; sourceStopSequence: number | null }>
  // LINX-15872 — orders pulled in via Add New Order that landed on a stop;
  // the server revalidates each source shipment and moves the order record
  // in, all inside the same save-stops transaction (api/_lib/shipments.mjs).
  externalOrders?: Array<{ orderNumber: string; sourceSellShipment: string }>
}

// LINX-14509…14515 — planner's Tender Resolution Action off the Review Order
// Change screen. `sellShipment` rides in the single mutate() variable (a
// mutationFn only takes one argument) and is peeled off before hitting the
// service, which takes it as a separate path param — same split
// saveTenderOption/saveShipmentOverrides already use.
//
// Resolving moves the row OUT of the order-change exceptions category
// (into monitoring for retender/bypass, back into tender-review for cancel —
// api/_lib/shipments.mjs resolveOrderChange) and stamps a new
// orderChange.resolution onto the shipment's own detail. All three caches
// that could show stale data invalidate together: the shipment's own detail
// query (exact key), plus the list and category-counts queries by KEY PREFIX
// — react-query v5 invalidateQueries does a "starts-with" match by default,
// so this hits every cached ['shipment-error-list', params]/
// ['shipment-category-counts', panel, ...] variant regardless of which
// panel/filters/search produced it, without needing to reconstruct those
// params here. Same convention as useCancelOrder/useSubmitDraftOrder
// (list + counts together), plus the one extra key this feature adds
// (the shipment's own detail).
export function useResolveOrderChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sellShipment, action, priorTenderStatus, cost, priorScac, stops, externalOrders }: ResolveOrderChangeInput) =>
      resolveOrderChange(sellShipment, { action, priorTenderStatus, cost, priorScac, stops, externalOrders }),
    onSuccess: () => {
      // Prefix, not the exact key: a 15872 move also changes SOURCE
      // shipments' cached detail (their orderList/stops), not just this one.
      queryClient.invalidateQueries({ queryKey: ['shipment', 'detail'] })
      queryClient.invalidateQueries({ queryKey: ['shipment-error-list'] })
      queryClient.invalidateQueries({ queryKey: ['shipment-category-counts'] })
    },
  })
}

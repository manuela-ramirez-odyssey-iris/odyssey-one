import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveOrderChange } from '../services/shipmentService'

export interface ResolveOrderChangeInput {
  sellShipment: string
  action: 'retender' | 'bypass' | 'cancel'
  priorTenderStatus: string | null
  cost: { choice: 'prior' | 'new' | 'quote'; amount: number } | null
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
    mutationFn: ({ sellShipment, action, priorTenderStatus, cost }: ResolveOrderChangeInput) =>
      resolveOrderChange(sellShipment, { action, priorTenderStatus, cost }),
    onSuccess: (_data, { sellShipment }) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', 'detail', sellShipment] })
      queryClient.invalidateQueries({ queryKey: ['shipment-error-list'] })
      queryClient.invalidateQueries({ queryKey: ['shipment-category-counts'] })
    },
  })
}

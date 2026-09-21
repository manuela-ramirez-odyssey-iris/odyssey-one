import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyConsolidation } from '../services/consolidationService'
import { shipmentDetailQueryKey } from './useShipmentDetail'

/**
 * Apply Manual Consolidation (LINX-15787). The mutation creates one `C…`
 * shipment and destroys its sources, so everything that counted or listed
 * those sources is stale: the grid, the tab badges, the orders that moved with
 * the loads, and each removed shipment's own detail cache.
 */
export function useApplyConsolidation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applyConsolidation,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-error-list'] })
      queryClient.invalidateQueries({ queryKey: ['shipment-category-counts'] })
      // The loads moved, so the orders now point at the new shipment.
      queryClient.invalidateQueries({ queryKey: ['order-list'] })
      queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] })
      // Removed, not changed — a stale detail would render a shipment that no
      // longer exists. (The reused-C case is invalidated too, and correctly:
      // its detail was rewritten.)
      for (const id of variables.sellShipments) {
        queryClient.invalidateQueries({ queryKey: shipmentDetailQueryKey(id) })
      }
    },
  })
}

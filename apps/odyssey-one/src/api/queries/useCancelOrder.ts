import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelOrder } from '../services/orderService'

// LINX-10258 soft delete: status → 'Cancelled'. Row moves tabs (e.g. out of
// Draft) — invalidate list + tab counts together, same as useSubmitDraftOrder.
export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderNumber: string) => cancelOrder(orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-list'] })
      queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] })
    },
  })
}

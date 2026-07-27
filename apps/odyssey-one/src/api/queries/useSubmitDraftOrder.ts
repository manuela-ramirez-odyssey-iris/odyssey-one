import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitDraftOrder } from '../services/orderService'

// LINX-11663: Draft → 'Ready For Plan'. Row moves tabs (Draft → All) — both
// the list and the tab counts need a refetch, unlike useSaveDraft/useCreateOrder
// (draft counts weren't wired to those flows yet).
export function useSubmitDraftOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderNumber: string) => submitDraftOrder(orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-list'] })
      queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] })
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveDraft } from '../services/orderService'
import type { OrderFormValues } from '../types/orderFormVm'

export interface SaveDraftInput {
  values: OrderFormValues
  draftId?: string | null // pass the previous id to upsert the same draft
}

export function useSaveDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ values, draftId }: SaveDraftInput) => saveDraft(values, draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-list'] }) // Draft row appears in the grid
    },
  })
}

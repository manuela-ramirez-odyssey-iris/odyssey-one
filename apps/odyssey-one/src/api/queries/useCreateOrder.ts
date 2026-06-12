import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrder } from '../services/orderService'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import type { OrderFormValues } from '../types/orderFormVm'

// Mapping lives in the hook (Shipments/S52 precedent): the component hands
// over raw form values, the seam owns the wire shape.
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: OrderFormValues) => createOrder(mapFormToOrderInterface(values)),
    onSuccess: () => {
      // The new Ready For Plan row must surface on the Summary grid
      queryClient.invalidateQueries({ queryKey: ['order-list'] })
    },
  })
}

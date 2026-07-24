import { useQuery } from '@tanstack/react-query'
import { getOrderView } from '../services/orderService'

// View Order detail. The service already returns the mapped form-VM shape (or
// null), so the query layer does no mapping. Our backend resolves by
// orderNumber alone (the Q30 customerId gate applied to the real order-service
// contract) — customerId stays only as an optional refetch key for org switches.
export function useOrderView(orderNumber: string, customerId?: string) {
  return useQuery({
    queryKey: ['order-view', orderNumber, customerId],
    queryFn: () => getOrderView(orderNumber, customerId),
    enabled: !!orderNumber,
  })
}

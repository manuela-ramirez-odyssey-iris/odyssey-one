import { useQuery } from '@tanstack/react-query'
import { getApiMode } from '../config'
import { getOrderView } from '../services/orderService'

// View Order detail. The service already returns the mapped form-VM shape (or
// null), so the query layer does no mapping. In live mode the query also gates
// on customerId so it never fires an invalid /order/view body (Q30); mock needs
// only the orderNumber. queryKey includes customerId so org switches refetch.
export function useOrderView(orderNumber: string, customerId?: string) {
  return useQuery({
    queryKey: ['order-view', orderNumber, customerId],
    queryFn: () => getOrderView(orderNumber, customerId),
    enabled: !!orderNumber && (getApiMode() === 'mock' || !!customerId),
  })
}

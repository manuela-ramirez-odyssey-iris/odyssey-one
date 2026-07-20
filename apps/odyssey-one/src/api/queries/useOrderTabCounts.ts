import { useQuery } from '@tanstack/react-query'
import { getOrderTabCounts } from '../services/orderService'

// Counts for the Orders main tabs (All / Draft / Validation Errors), keyed by
// the navbar customer scope like useOrderList.
export function useOrderTabCounts(customerIds?: string[]) {
  return useQuery({
    queryKey: ['order-tab-counts', customerIds],
    queryFn: () => getOrderTabCounts(customerIds),
  })
}

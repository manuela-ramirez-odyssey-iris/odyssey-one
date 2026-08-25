import { useQuery } from '@tanstack/react-query'
import { getOrderTabCounts } from '../services/orderService'
import type { OrderListRequest } from '../types/orderList'

// Counts for the Orders main tabs (All / Draft / Validation Errors), keyed by
// the navbar customer scope AND the criteria (S131) — the badges track what the
// grid is filtered by, so the query identity has to include the filters or the
// cache would serve the unfiltered counts forever.
export function useOrderTabCounts(
  customerIds?: string[],
  filters?: OrderListRequest['filters'],
) {
  return useQuery({
    queryKey: ['order-tab-counts', customerIds, filters],
    queryFn: () => getOrderTabCounts(customerIds, filters),
  })
}

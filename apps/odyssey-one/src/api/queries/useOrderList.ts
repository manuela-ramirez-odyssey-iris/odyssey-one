import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getOrderList } from '../services/orderService'
import { mapOrderListRow } from '../mappers/mapOrderListRow'
import type { OrderListRequest } from '../types/orderList'

// `customerIds` = the navbar customer scope (CustomersContext.selectedDataIds)
// — same first-order semantics as the Shipments grid: undefined unscoped,
// [] honestly empty. Part of the query key so selection changes refetch.
export function useOrderList(request: OrderListRequest, customerIds?: string[]) {
  return useQuery({
    queryKey: ['order-list', request, customerIds],
    queryFn: async () => {
      const res = await getOrderList(request, customerIds)
      return {
        rows: res.orders.map(mapOrderListRow),
        totalCount: res.pagination.totalCount,
        pageNumber: res.pagination.pageNumber,
        pageSize: res.pagination.pageSize,
      }
    },
    placeholderData: keepPreviousData, // smooth paging — previous page stays visible while fetching
  })
}

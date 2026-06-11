import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getOrderList } from '../services/orderService'
import { mapOrderListRow } from '../mappers/mapOrderListRow'
import type { OrderListRequest } from '../types/orderList'

export function useOrderList(request: OrderListRequest) {
  return useQuery({
    queryKey: ['order-list', request],
    queryFn: async () => {
      const res = await getOrderList(request)
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

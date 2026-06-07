import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getShipmentErrorList } from '../services/gridService'
import type { ShipmentErrorListParams } from '../types/shipmentErrorList'
import { mapShipmentErrorRow } from '../mappers/mapShipmentErrorRow'

export function useShipmentErrorList(params: ShipmentErrorListParams) {
  return useQuery({
    queryKey: ['shipment-error-list', params],
    queryFn: async () => {
      const res = await getShipmentErrorList(params)
      return { ...res, rows: res.rows.map(mapShipmentErrorRow) }
    },
    placeholderData: keepPreviousData, // smooth paging — keep previous page visible while fetching
  })
}

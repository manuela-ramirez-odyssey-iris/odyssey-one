import { useQuery } from '@tanstack/react-query'
import { getSellShipmentDetail } from '../services/shipmentService'

// Server-state for one shipment's detail. Replaces the manual fetch + detailsCache
// in ShipmentsRoute. Plan 2 adds `select: mapSellShipmentOutToDetail` to map the
// real SellShipmentOut shape onto the view-model.
export function useShipmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['shipment', 'detail', id],
    queryFn: () => getSellShipmentDetail(id as string),
    enabled: !!id,
  })
}

import { useQuery } from '@tanstack/react-query'
import { getSellShipmentDetail } from '../services/shipmentService'

// Server-state for one shipment's detail. Replaces the manual fetch + detailsCache
// in ShipmentsRoute. Both mock and live modes return a mapped ShipmentDetailVM
// (mock loads the generated SellShipmentOut JSON; live calls the real endpoint).
export function useShipmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['shipment', 'detail', id],
    queryFn: () => getSellShipmentDetail(id as string),
    enabled: !!id,
  })
}

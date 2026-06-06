import { useQuery } from '@tanstack/react-query'
import { getSellShipmentDetail } from '../services/shipmentService'

// Server-state for one shipment's detail. Replaces the manual fetch + detailsCache
// in ShipmentsRoute. The shape returned is the detail view-model; in live/live-sim
// modes the service maps SellShipmentOut → view-model (see shipmentService).
export function useShipmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['shipment', 'detail', id],
    queryFn: () => getSellShipmentDetail(id as string),
    enabled: !!id,
  })
}

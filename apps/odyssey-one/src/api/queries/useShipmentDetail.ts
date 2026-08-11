import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getSellShipmentDetail } from '../services/shipmentService'

// Server-state for one shipment's detail. Replaces the manual fetch + detailsCache
// in ShipmentsRoute. Both mock and live modes return a mapped ShipmentDetailVM
// (mock loads the generated SellShipmentOut JSON; live calls the real endpoint).
export function useShipmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['shipment', 'detail', id],
    queryFn: () => getSellShipmentDetail(id as string),
    enabled: !!id,
    // Fix B (2026-08-10, user ruling / DEC-61): while a NEWLY selected
    // shipment's detail is fetching, keep serving the PREVIOUSLY selected
    // shipment's data instead of dropping to undefined — this is what used to
    // be BottomBar's hand-rolled `lastDetailsRef`. react-query v5's API for
    // this is `placeholderData: keepPreviousData` (installed version is
    // ^5.101.0 per package.json; v4 would instead use `keepPreviousData:
    // true`). The consumer reads `isPlaceholderData` to know the visible data
    // is stale and show the dim + spinner overlay the ref-based version had
    // no way to signal.
    placeholderData: keepPreviousData,
  })
}

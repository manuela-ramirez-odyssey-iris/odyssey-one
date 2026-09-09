import { useQuery } from '@tanstack/react-query'
import { getCandidateOrders } from '../services/shipmentService'

// LINX-15870 — Search & Add Orders candidate list, scoped to the shipment's customer.
export function useCandidateOrders(sellShipment: string, customerId: string, excludeOrderIds: string[]) {
  return useQuery({
    queryKey: ['shipment', 'candidate-orders', sellShipment, [...excludeOrderIds].sort().join(',')],
    queryFn: () => getCandidateOrders(sellShipment, customerId, excludeOrderIds),
    staleTime: 60 * 1000,
  })
}

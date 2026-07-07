// Flat display view-model the Orders grid renders. Produced by mapOrderListRow.
export interface OrderRowVM {
  id: string          // orderNumber — row key (and future detail-link key);
                      // "pending-<orderId>" for number-less async rows
  idLabel: string     // displayed ID; = orderNumber, or '-' while the async
                      // creation is still processing (no number assigned yet)
  pending: boolean    // true = orderNumber not assigned yet (async create in flight)
  customer: string
  origin: string      // "RGC-STL-001: St Louis, MO"
  destination: string
  weight: string      // "4300 lbs"
  volume: string      // "730 cbf"
  commodity: string
  equipment: string
  earlyPickup: string // "06/15/2026 08:00" (from consignor.earliestPickupDateTime)
  status: string      // display label, not shown in the lean column set
}

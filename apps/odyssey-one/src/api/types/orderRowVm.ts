// Flat display view-model the Orders grid renders. Produced by mapOrderListRow.
export interface OrderRowVM {
  id: string          // orderNumber — row key (and future detail-link key)
  idLabel: string     // displayed ID; = orderNumber (LLD row has no orderId — see LINX-11013)
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

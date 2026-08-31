// The view-model ShipmentTable renders. Field names match what the table's column
// accessors already read; `id` is the detail-fetch key (= sellShipment).
export interface ShipmentRowVM {
  id: string                    // = sellShipment
  buyShipment: string
  sellShipment: string
  orders: string[]
  pro: string
  customerId: string
  customerName: string
  consignor: string
  consignee: string
  origin: string
  destination: string
  pickupDate: string
  deliveryDate: string
  mode: string
  equipmentCode: string
  scac: string
  tenderStatus: string
  shipmentStatus: string
  // Not a table column — read by the Review Order Change row-action gate
  // (LINX-14509), not rendered as a cell.
  category: string
  validationMessage: string | null
  grossWeight: string
  loadCount: string
  orderCount: string
  apFreightCost: string
  // Array columns — the table joins them for display; [] renders as an em dash.
  pickupNumbers: string[]
  poNumbers: string[]
  // LINX-11597 / LINX-12902 classification (migration 006).
  shipmentType: string | null
  planningType: string | null
  // Multi-leg linkage (migration 007) — null on a normal single-leg shipment.
  legType: string | null
  shipmentSequenceLeg: number | null
  nextShipmentId: string | null
}

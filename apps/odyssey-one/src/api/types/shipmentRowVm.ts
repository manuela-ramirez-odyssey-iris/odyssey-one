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
  validationMessage: string | null
  grossWeight: string
  loadCount: string
  orderCount: string
  apFreightCost: string
}

import type { ShipmentErrorRow } from '../types/shipmentErrorList'
import type { ShipmentRowVM } from '../types/shipmentRowVm'

// Provisional row DTO → table view-model. This is the single place to reconcile
// real field names when the live Swagger lands. `id` = sellShipment (the contract
// key used by GET /sell-shipment-out/{id}).
export function mapShipmentErrorRow(row: ShipmentErrorRow): ShipmentRowVM {
  const s = (v: string | undefined) => v ?? ''
  return {
    id: row.sellShipment,
    buyShipment: s(row.buyShipment),
    sellShipment: s(row.sellShipment),
    orders: row.orders ?? [],
    pro: s(row.pro),
    customerId: s(row.customerId),
    customerName: s(row.customerName),
    consignor: s(row.consignor),
    consignee: s(row.consignee),
    origin: s(row.origin),
    destination: s(row.destination),
    pickupDate: s(row.pickupDate),
    deliveryDate: s(row.deliveryDate),
    mode: s(row.mode),
    equipmentCode: s(row.equipmentCode),
    scac: s(row.scac),
    tenderStatus: s(row.tenderStatus),
    shipmentStatus: s(row.shipmentStatus),
    validationMessage: row.validationMessage ?? null,
    grossWeight: s(row.grossWeight),
    loadCount: s(row.loadCount),
    orderCount: s(row.orderCount),
    apFreightCost: s(row.apFreightCost),
  }
}

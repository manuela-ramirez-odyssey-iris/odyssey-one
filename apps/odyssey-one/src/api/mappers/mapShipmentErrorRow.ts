import type { ShipmentErrorRow } from '../types/shipmentErrorList'
import type { ShipmentRowVM } from '../types/shipmentRowVm'

// Provisional row DTO → table view-model. This is the single place to reconcile
// real field names when the live Swagger lands. `id` = sellShipment (the contract
// key used by GET /sell-shipment-out/{id}).
//
// ⚠ THIS MAPPER IS A WHITELIST — it builds a NEW object, so any field not named
// below is silently DROPPED between the API and the table, no matter how correct
// the column definition, the API projection and the database are. That is
// exactly how Pickup # spent months in the column picker rendering only "—",
// and how Shipment Type / Planning Type arrived empty on the day they shipped.
// ADD EVERY NEW COLUMN HERE. It happened a third time in S148 —
// odysseyShipmentIdentifier was correct in the DB, the SELECT list, the column
// picker, the search registry and five components, and blank everywhere because
// of this one object literal. `mapShipmentErrorRow.test.ts` now pins this against
// ALL_COLUMNS (not just LATE_ADDED_COLUMNS, which is what let S148 through).
export function mapShipmentErrorRow(row: ShipmentErrorRow): ShipmentRowVM {
  const s = (v: string | undefined) => v ?? ''
  return {
    id: row.sellShipment,
    odysseyShipmentIdentifier: s(row.odysseyShipmentIdentifier),
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
    category: s(row.category),
    validationMessage: row.validationMessage ?? null,
    grossWeight: s(row.grossWeight),
    loadCount: s(row.loadCount),
    orderCount: s(row.orderCount),
    apFreightCost: s(row.apFreightCost),
    pickupNumbers: row.pickupNumbers ?? [],
    poNumbers: row.poNumbers ?? [],
    shipmentType: row.shipmentType ?? null,
    planningType: row.planningType ?? null,
    legType: row.legType ?? null,
    shipmentSequenceLeg: row.shipmentSequenceLeg ?? null,
    nextShipmentId: row.nextShipmentId ?? null,
  }
}

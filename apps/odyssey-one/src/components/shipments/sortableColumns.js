/**
 * Shipments grid columns whose header sorts (LINX-15893 BR I, user 2026-10-01).
 *
 * Plain .js (not ShipmentTable.jsx) because the api tests import it too:
 * api/_lib/sortableColumns.test.mjs asserts buildListQuery's SORT_MAP has an
 * entry for every key here. That matters because buildListQuery sends an
 * unknown sortBy to pickup_ts — a header that looked sorted but wasn't would
 * be a lie. Every ALL_COLUMNS key NOT listed here gets `enableSorting: false`:
 * arrays (orders, pickupNumbers, poNumbers), detail-fed columns the list DTO
 * doesn't carry (proBookingNumber, distance, stops, hazardous, …), the message,
 * and grossWeight — its overrides value is a unit-bearing string from the
 * Details modal's MeasureField ("12,345 LB" / KG), so there is no one scalar
 * to order by.
 */
export const SORTABLE_KEYS = [
  'odysseyShipmentIdentifier', 'buyShipment', 'sellShipment',
  'customerId', 'customerName', 'consignor', 'consignee',
  'origin', 'destination', 'pickupDate', 'deliveryDate',
  'mode', 'equipmentCode', 'scac', 'tenderStatus', 'shipmentStatus',
  'shipmentType', 'planningType', 'legType',
  'orderCount', 'loadCount', 'apFreightCost',
]

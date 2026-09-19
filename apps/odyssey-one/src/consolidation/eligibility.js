// Who can join a from-scratch manual consolidation. Provisional (user,
// 2026-09-19: "we need to discuss this in the future but do your suggestion"):
//   1. direct shipments only  — Dave Schultz 2026-09-17 00:37:46 / 00:42:08
//   2. no active tender       — Dave 00:08:17 / 00:15:38 ("cancel that tender first")
//   3. one customer           — Ramesh 2026-09-15 00:05:00; LINX-15762/15786 BR
// Exceptions are irrelevant (Dave 00:09:06); Hold is fine. Ramesh's pool gates
// (Allow Optimization, OCM 97–101, status = Consolidation) are backend pool
// membership and are NOT applied to the checkbox. Spec §2.
const ACTIVE_TENDER = new Set(['Sent', 'Accepted'])

/** @returns {string|null} null = eligible; otherwise the reason shown in the checkbox tooltip */
export function consolidationEligibility(row, anchorCustomerId = null) {
  if (row.shipmentType !== 'Direct') return 'Only direct shipments can be consolidated from scratch'
  if (ACTIVE_TENDER.has(row.tenderStatus)) return 'Tendered — cancel the tender first'
  if (anchorCustomerId && row.customerId !== anchorCustomerId) return `Different customer than ${anchorCustomerId}`
  return null
}

// The GlobalSearch attributes offered while in consolidate mode (spec §3.5).
// Keys are SHIPMENTS_PROGRESSION attribute keys; the filter is applied at the
// adapter (narrowSuggestionSections), so progression.js and the Cognizant
// progression sheets are untouched.
export const CONSOLIDATION_ATTRIBUTE_KEYS = [
  'odyssey-shipment', 'order', 'customer-id', 'customer-name', 'origin', 'destination',
  'pickup-date', 'delivery-date', 'equipment-code', 'mode', 'shipment-type', 'gross-weight',
]

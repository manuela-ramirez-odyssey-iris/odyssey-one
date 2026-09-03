// OCM date-flexibility config (SPB-69/73): flexibility is configured PER
// DIRECTION with separate day counts (e.g. pickup 3, delivery 5). Where a
// direction is not configured, its checkbox is not shown at all — the
// planner cannot add it.
//
// ponytail: seeded stand-in for the OCM flex profile (SPB-69/73); resolves
// up the consignor hierarchy in TMS (SPB-76)
export function getFlexConfig(shipmentId) {
  if (!shipmentId) return { pickupDays: null, deliveryDays: null }
  const h = [...String(shipmentId)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const mode = h % 4 // 0 none, 1 pickup only, 2 delivery only, 3 both
  return {
    pickupDays: mode === 1 || mode === 3 ? 1 + (h % 5) : null, // 1-5 days
    deliveryDays: mode === 2 || mode === 3 ? 1 + ((h >> 2) % 5) : null,
  }
}

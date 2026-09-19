// The proposed consolidation, derived from the selected grid rows (+ their
// details when loaded). Pure: the review screen renders this, tests pin it.
// Stop sequence rule (Dave 2026-09-17 00:33:20 / 00:35:06): the system
// proposes an order, the planner re-sequences later — V1 proposes every
// pickup in selection order, then every delivery in selection order.
import { capacityFor, utilizationPct } from './equipmentCapacity'

// "12,500" / "1,375 cuft" / "--" / null → number | null
export function parseMeasure(s) {
  if (s == null || s === '' || s === '--') return null
  const n = Number(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && String(s).match(/\d/) ? n : null
}

export function buildProposal(rows = [], details = []) {
  const anchor = rows[0]
  const stop = (r, i, type) => ({
    key: `${type}-${r.sellShipment ?? i}`,
    label: `${type === 'pickup' ? 'P' : 'D'}${i + 1}`,
    type,
    location: (type === 'pickup' ? r.origin : r.destination) || '--',
    date: (type === 'pickup' ? r.pickupDate : r.deliveryDate) || '--',
    sellShipment: r.sellShipment,
  })
  const pickups = rows.map((r, i) => stop(r, i, 'pickup'))
  const deliveries = rows.map((r, i) => stop(r, i, 'delivery'))

  const weightLb = rows.reduce((sum, r) => sum + (parseMeasure(r.grossWeight) ?? 0), 0)

  // Volume and hazmat live on the detail (stopsData.summary.volume,
  // orderDetails[].hazmat 'Yes'/'No'); the grid row has neither. Until every
  // detail is here both are null → the strip shows '--'. A shipment without
  // volume keeps the whole volume null (LINX-15787 BR 3–4: missing volume
  // never blocks, utilization is shown only when the data is sufficient).
  const complete = rows.length > 0 && details.length === rows.length && details.every(Boolean)
  const volumes = complete ? details.map((d) => parseMeasure(d?.stopsData?.summary?.volume)) : []
  const volumeCuft = complete && volumes.every((v) => v != null) ? volumes.reduce((a, b) => a + b, 0) : null
  const hazmat = complete
    ? details.some((d) => (d?.orderDetails ?? []).some((o) => o.hazmat === 'Yes'))
    : null

  const equipmentCode = anchor?.equipmentCode || ''
  const cap = capacityFor(equipmentCode)

  return {
    customerId: anchor?.customerId ?? '',
    customerName: anchor?.customerName ?? '',
    identifiers: rows.map((r) => r.odysseyShipmentIdentifier || r.buyShipment || r.sellShipment),
    equipmentCode,
    stops: [...pickups, ...deliveries],
    pickupCount: pickups.length,
    deliveryCount: deliveries.length,
    weightLb,
    volumeCuft,
    weightUtilization: rows.length ? utilizationPct(weightLb, cap.weightLb) : null,
    volumeUtilization: utilizationPct(volumeCuft, cap.volumeCuft),
    hazmat,
  }
}

import { getApiMode } from '../config'
import { apiPost } from '../client'
import { currentUser } from '../../data/sso-mock'
import { mapShipmentErrorRow } from '../mappers/mapShipmentErrorRow'
import { getRawSellShipmentOut } from './shipmentService'
import { clearShipmentSearchIndex } from '../../search/shipments/searchIndex'
import { addShipment, getAllShipments, removeShipments } from '../../data'
import { buildConsolidatedShipment } from '../../../api/_lib/consolidateShipments.mjs'
import type { ShipmentErrorRow } from '../types/shipmentErrorList'
import type { ShipmentRowVM } from '../types/shipmentRowVm'
import type { SellShipmentOut } from '../types/sellShipmentOut'

/**
 * Apply a manual consolidation (LINX-15787, S155 §3): N source shipments
 * become ONE `C…` shipment holding all their loads, and the emptied shells go
 * away (CNS-01 / DEC-156). Both runtimes drive the SAME pure builder
 * (api/_lib/consolidateShipments.mjs) — live via
 * POST /shipment-service/v1/consolidation, mock via the shipments overlay —
 * so the created row is identical either way.
 */
export interface ApplyConsolidationResult {
  row: ShipmentRowVM
  detail: SellShipmentOut
}

// Mock-only consolidation counter, the sibling of orderService's `createSeq`.
// Live derives its seq from a COUNT over the 27xxxxxx band.
let consolidateSeq = 0

/** Test hook — resets the mock consolidation counter. */
export function __resetConsolidationSeq(): void {
  consolidateSeq = 0
}

export async function applyConsolidation(
  { sellShipments }: { sellShipments: string[] },
): Promise<ApplyConsolidationResult> {
  if (getApiMode() === 'live') {
    // userId: same identity pattern as createOrder/preferenceService.
    const res = await apiPost<{ data: { row: ShipmentErrorRow; detail: SellShipmentOut } }>(
      '/shipment-service/v1/consolidation', { sellShipments, userId: currentUser.id },
    )
    return { row: mapShipmentErrorRow(res.data.row), detail: res.data.detail }
  }

  // Re-read the sources from the store rather than trusting the review
  // screen's rows: the grid row VM is a WHITELIST (mapShipmentErrorRow) and
  // drops `load`, which the builder joins. Same reason the live handler
  // SELECTs instead of taking the client's copy.
  const byId = new Map(getAllShipments().map((r: ShipmentErrorRow) => [r.sellShipment, r]))
  const missing = sellShipments.filter((id) => !byId.has(id))
  if (missing.length) throw new Error(`Unknown shipment(s): ${missing.join(', ')}`)
  const sources = await Promise.all(sellShipments.map(async (id) => ({
    row: byId.get(id) as ShipmentErrorRow,
    detail: await getRawSellShipmentOut(id),
  })))

  consolidateSeq += 1
  // The builder is plain JS shared with the live handler; its JSDoc types are
  // deliberately loose (`object`), so the shapes are named here.
  const built = buildConsolidatedShipment({ sources, seq: consolidateSeq, now: new Date() }) as {
    row: ShipmentErrorRow
    detail: SellShipmentOut
    removedSellShipments: string[]
  }
  // Remove BEFORE add: a reused C… id is both a source and the result, and
  // `addShipment` un-tombstones what it registers (same net effect as the live
  // DELETE-then-INSERT on that PK).
  removeShipments(built.removedSellShipments)
  addShipment(built.row, built.detail)
  // The mock search index is a memoized projection of the whole corpus — a row
  // added AND rows removed both invalidate it (orderService does the same).
  clearShipmentSearchIndex()
  // ponytail: the mock's order rows carry no shipment link to repoint (the
  // live half UPDATEs orders.shipment_sell_id) — manualOrderToListRow has no
  // such field, so there is nothing here to keep truthful. Add it here the day
  // an order row starts showing its shipment.
  return { row: mapShipmentErrorRow(built.row), detail: built.detail }
}

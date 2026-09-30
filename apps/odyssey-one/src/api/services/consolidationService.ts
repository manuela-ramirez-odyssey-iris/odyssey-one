import { getApiMode } from '../config'
import { apiPost } from '../client'
import { currentUser } from '../../data/sso-mock'
import { mapShipmentErrorRow } from '../mappers/mapShipmentErrorRow'
import { getRawSellShipmentOut } from './shipmentService'
import { clearShipmentSearchIndex } from '../../search/shipments/searchIndex'
import { addShipment, getAllShipments, removeShipments } from '../../data'
import { buildConsolidatedShipment, checkConsolidation } from '../../../api/_lib/consolidateShipments.mjs'
import { buildSplitShipment, computeListAggregates, dormancyEvent, pickExternalOrders, removeOrdersFromSource, rowFromStops } from '../../../api/_lib/shipments.mjs'
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
/**
 * S7.1 body. `stops` is the editor's StopDto[] (stopsSandbox toDto): a stop
 * built from a source stop names it by (sourceSellShipment, sourceStopSequence),
 * a created one has both null. `tenderList` is the evaluated carrier options
 * (DTO-shaped like `detail.shippingOptionList`).
 */
export interface ApplyConsolidationBody {
  sellShipments: string[]
  stops: Array<Record<string, unknown>>
  externalOrders: Array<{ orderNumber: string; sourceSellShipment: string }>
  tenderList: Array<Record<string, unknown>>
}

export interface ApplyConsolidationResult {
  row: ShipmentRowVM
  detail: SellShipmentOut
}

// Mock-only consolidation counter, the sibling of orderService's `createSeq`.
// Live derives its seq from a COUNT over the 27xxxxxx band.
let consolidateSeq = 0
let splitSeq = 0

/** Test hook — resets the mock consolidation counter. */
export function __resetConsolidationSeq(): void {
  consolidateSeq = 0
  splitSeq = 0
}

export async function applyConsolidation(
  { sellShipments, stops, externalOrders = [], tenderList = [] }: ApplyConsolidationBody,
): Promise<ApplyConsolidationResult> {
  if (getApiMode() === 'live') {
    // userId: same identity pattern as createOrder/preferenceService.
    const res = await apiPost<{ data: { row: ShipmentErrorRow; detail: SellShipmentOut } }>(
      '/shipment-service/v1/consolidation',
      { sellShipments, stops, externalOrders, tenderList, userId: currentUser.id },
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
  // Same as the live handler: an order the planner "pulled" from a SELECTED
  // source is already in its roster.
  const pulled = externalOrders.filter((e) => !sellShipments.includes(e.sourceSellShipment))
  // The SAME guards as the live handler (S7.2) — one function, both runtimes.
  checkConsolidation({ sources, stops, externalOrders: pulled })

  // The external records come off their source's blob through the SAME pure
  // LINX-15872 check live runs (pickExternalOrders). Mock rows carry the
  // store's category / tenderStatus; live also reads the tenders table.
  const externalSources = new Map<string, { row: ShipmentErrorRow; detail: SellShipmentOut }>()
  for (const { sourceSellShipment } of pulled) {
    const row = byId.get(sourceSellShipment) as ShipmentErrorRow | undefined
    if (row && !externalSources.has(sourceSellShipment)) {
      externalSources.set(sourceSellShipment, { row, detail: await getRawSellShipmentOut(sourceSellShipment) })
    }
  }
  const { records: externals } = pickExternalOrders(
    [...externalSources].map(([sellShipment, { row, detail }]) => ({
      sellShipment, category: row.category, tenderStatus: row.tenderStatus, activeTender: false, detail,
    })),
    pulled,
  ) as { records: Array<Record<string, unknown>> }

  consolidateSeq += 1
  const now = new Date()
  // The builder is plain JS shared with the live handler; its JSDoc types are
  // deliberately loose (`object`), so the shapes are named here.
  const built = buildConsolidatedShipment({
    sources, stops, externals, externalOrders: pulled, tenderList,
    externalSources: [...externalSources].map(([sellShipment, { row, detail }]) => ({ sellShipment, row, detail })), seq: consolidateSeq, now,
  }) as {
    row: ShipmentErrorRow
    detail: SellShipmentOut
    removedSellShipments: string[]
    splitOrders: { source: { row: ShipmentErrorRow; detail: SellShipmentOut }; orderRec: Record<string, unknown>; sourceHidden: boolean }[]
  }
  // Remove BEFORE add: a reused C… id is both a source and the result, and
  // `addShipment` un-tombstones what it registers (same net effect as the live
  // DELETE-then-INSERT on that PK).
  // S164 §2 — a tombstoned source keeps its blob readable (the lineage tree
  // previews it) and gains the dormancy event. addShipment un-tombstones, so
  // the overlay write goes first and the tombstone after. ponytail: a source
  // the id-reuse keeps is the result, never dormant; externals emptied by a
  // pull get no event (live writeSourceUpdates doesn't append one either).
  for (const src of sources) {
    const id = src.row.sellShipment
    if (!built.removedSellShipments.includes(id) || id === built.row.sellShipment) continue
    const held = (src.detail.orderList ?? []).map((o) => String(o.orderNumber ?? o.orderId))
    addShipment(src.row, {
      ...src.detail,
      historyList: [...(src.detail.historyList ?? []), dormancyEvent(held, built.row.odysseyShipmentIdentifier, now)],
    })
  }
  removeShipments(built.removedSellShipments)
  addShipment(built.row, built.detail)
  // C3 — orders a C source lost become Directs of their own. ponytail: the
  // mock has no orders.id to key idsFor on; a counter stands in, minting
  // sell 34000001+ / O68000001+ / buy 908000001+ (orders.id 8,000,001+). The
  // ceiling is a real orders.id reaching 8,000,000 — seeded ids are in the
  // thousands, so widen the offset if that ever changes.
  for (const { source, orderRec, sourceHidden } of built.splitOrders) {
    splitSeq += 1
    const split = buildSplitShipment({ source, orderRec, orderSerialId: 8_000_000 + splitSeq, sourceHidden }) as unknown as {
      row: ShipmentErrorRow; detail: SellShipmentOut
    }
    addShipment(split.row, split.detail)
  }
  // LINX-15872 "Source Shipment Update": pulled orders leave their source. An
  // emptied source is hidden here (live leaves an order_count '0' shell that
  // every list filters out — same visible result).
  for (const [id, src] of externalSources) {
    const moved = pulled.filter((e) => e.sourceSellShipment === id).map((e) => e.orderNumber)
    const next = removeOrdersFromSource(src.detail, moved) as { orderList: Array<Record<string, unknown>>; stops: SellShipmentOut['shipmentStopList'] }
    if (next.orderList.length === 0) { removeShipments([id]); continue }
    // The list columns follow the remaining roster and stops, recomputed the
    // way live does (buildSaveStopsQuery: aggregates + rowFromStops).
    const agg = computeListAggregates(next.orderList) as Record<string, unknown>
    const lane = (rowFromStops(next.stops) ?? {}) as Record<string, unknown>
    delete lane.pickupTs
    delete lane.deliveryTs
    addShipment(
      {
        ...src.row, ...lane,
        orders: next.orderList.map((o) => String(o.orderNumber ?? o.orderId)),
        orderCount: String(next.orderList.length),
        grossWeight: agg.grossWeight, loadCount: agg.loadCount,
        poNumbers: agg.poNumbers, pickupNumbers: agg.pickupNumbers, shipmentType: agg.shipmentType,
      } as ShipmentErrorRow,
      { ...src.detail, orderList: next.orderList, shipmentStopList: next.stops, shipmentType: agg.shipmentType } as unknown as SellShipmentOut,
    )
  }
  // The mock search index is a memoized projection of the whole corpus — a row
  // added AND rows removed both invalidate it (orderService does the same).
  clearShipmentSearchIndex()
  // ponytail: the mock's order rows carry no shipment link to repoint (the
  // live half UPDATEs orders.shipment_sell_id) — manualOrderToListRow has no
  // such field, so there is nothing here to keep truthful. Add it here the day
  // an order row starts showing its shipment.
  return { row: mapShipmentErrorRow(built.row), detail: built.detail }
}

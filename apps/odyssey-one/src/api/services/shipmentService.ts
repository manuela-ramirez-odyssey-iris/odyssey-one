import { getApiMode } from '../config'
import { apiGet, apiPatch, apiPut } from '../client'
import { mapSellShipmentOutToDetail } from '../mappers/mapSellShipmentOutToDetail'
import type { SellShipmentOut, SellShipmentStop } from '../types/sellShipmentOut'
import type { ShipmentDetailVM } from '../types/shipmentDetail'
import { buildCandidateRows } from '../../../api/_lib/candidateOrders.mjs'
import { getAllShipments } from '../../data'
import { getAllOrders } from '../../data/orders'

export async function getSellShipmentDetail(id: string): Promise<ShipmentDetailVM> {
  const mode = getApiMode()

  if (mode === 'live') {
    const dto = await apiGet<SellShipmentOut>(`/shipment-service/v1/sell-shipment-out/${id}`)
    return mapSellShipmentOutToDetail(dto)
  }

  // mock: load the generated SellShipmentOut DTO file and run it through the mapper
  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  const dto = (await res.json()) as SellShipmentOut
  return mapSellShipmentOutToDetail(dto)
}

/**
 * Persist ONE quote / tender option (Add Quote, Edit Quote, or a tender-status
 * action) against the shipment's `tenders` rows. Live writes; mock is a no-op —
 * the Tender tab's local state already reflects the change and there's nothing
 * durable behind the generated JSON files.
 */
export async function saveTenderOption(
  sellShipment: string,
  option: Record<string, unknown>,
): Promise<void> {
  if (getApiMode() !== 'live') return
  await apiPut(`/shipment-service/v1/sell-shipment-out/${sellShipment}/tender`, { option })
}

/**
 * Persist shipment-STAGE field edits (Mode, Gross Weight, Volume, and
 * per-order reference rows) from the Shipment Details modal. Whole-object
 * replace — send the complete override set, not a delta.
 *
 * Equipment is deliberately NOT handled here: it belongs to the routing option
 * and goes through saveTenderOption, so General Information's save makes two
 * calls on purpose.
 *
 * Live writes; mock is a no-op, same contract as saveTenderOption.
 */
export async function saveShipmentOverrides(
  sellShipment: string,
  overrides: Record<string, unknown>,
): Promise<void> {
  if (getApiMode() !== 'live') return
  await apiPatch(`/shipment-service/v1/sell-shipment-out/${sellShipment}/overrides`, { overrides })
}

/**
 * LINX-14509…14515 — Tender Resolution Action off the Review Order Change
 * screen (retender/bypass/cancel). Records the planner's decision into
 * detail.orderChange.resolution and re-files the shipment's tender status /
 * panel / category (api/_lib/shipments.mjs resolveOrderChange).
 * `sellShipment` rides the URL path, not the body — same split as
 * saveTenderOption/saveShipmentOverrides above.
 *
 * S137: `priorScac` identifies the carrier whose tender row gets the
 * selected cost written onto it (retender/bypass only — see the handler).
 * Cancel and a null cost both legitimately send priorScac as null.
 *
 * Live writes; mock is a no-op, same contract as its two siblings above.
 */
export async function resolveOrderChange(
  sellShipment: string,
  body: {
    action: string
    priorTenderStatus: string | null
    cost: { choice: string; amount: number } | null
    priorScac: string | null
    // S143 Task 3 — save-stops only; see ResolveOrderChangeInput's comment.
    stops?: Array<Partial<SellShipmentStop> & { stopSequence: number; stopType: string; sourceStopSequence: number | null }>
  },
): Promise<void> {
  if (getApiMode() !== 'live') return
  await apiPatch(`/shipment-service/v1/sell-shipment-out/${sellShipment}/order-change`, body)
}

export interface CandidateOrderRow {
  orderNumber: string; sourceSellShipment: string; customer: string; origin: string; destination: string
  weight: string; volume: string; buyShipment: string; shipmentStatus: string; tenderStatus: string
  shipmentType: string; ordersInShipment: string[]; shipDate: string; deliveryDate: string; blocked: boolean
}

/**
 * LINX-15870 — candidates for Search & Add Orders: every order of another
 * shipment of the SAME customer, minus the ones already on this shipment.
 * Mock runs the shared builder over the two local datasets; live asks the
 * endpoint, which runs the identical builder server-side over one SQL join.
 */
export async function getCandidateOrders(
  sellShipment: string,
  customerId: string,
  excludeOrderIds: string[],
): Promise<CandidateOrderRow[]> {
  if (getApiMode() !== 'live') {
    return buildCandidateRows({ shipments: getAllShipments(), orders: getAllOrders(), customerId, sellShipment, excludeOrderIds })
  }
  const qs = excludeOrderIds.length ? `?exclude=${encodeURIComponent(excludeOrderIds.join(','))}` : ''
  return apiGet(`/shipment-service/v1/sell-shipment-out/${sellShipment}/candidate-orders${qs}`)
}

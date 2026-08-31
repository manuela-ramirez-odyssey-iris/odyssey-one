import { getApiMode } from '../config'
import { apiGet, apiPatch, apiPut } from '../client'
import { mapSellShipmentOutToDetail } from '../mappers/mapSellShipmentOutToDetail'
import type { SellShipmentOut } from '../types/sellShipmentOut'
import type { ShipmentDetailVM } from '../types/shipmentDetail'

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
 * Live writes; mock is a no-op, same contract as its two siblings above.
 */
export async function resolveOrderChange(
  sellShipment: string,
  body: {
    action: string
    priorTenderStatus: string | null
    cost: { choice: string; amount: number } | null
  },
): Promise<void> {
  if (getApiMode() !== 'live') return
  await apiPatch(`/shipment-service/v1/sell-shipment-out/${sellShipment}/order-change`, body)
}

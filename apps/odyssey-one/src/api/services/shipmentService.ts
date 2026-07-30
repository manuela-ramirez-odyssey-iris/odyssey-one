import { getApiMode } from '../config'
import { apiGet, apiPut } from '../client'
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

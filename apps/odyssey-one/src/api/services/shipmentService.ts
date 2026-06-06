import { getApiMode } from '../config'
import { apiGet } from '../client'
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

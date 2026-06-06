import { getApiMode } from '../config'
import { apiGet } from '../client'
import { mapSellShipmentOutToDetail } from '../mappers/mapSellShipmentOutToDetail'
import { sellShipmentOutSample } from '../fixtures/sellShipmentOut.sample'
import type { SellShipmentOut } from '../types/sellShipmentOut'
import type { ShipmentDetailVM } from '../types/shipmentDetail'

// mock returns the raw view-model JSON file (unknown until Plan 2b regenerates
// it to SellShipmentOut); live + live-sim return a mapped view-model.
export type ShipmentDetailResult = ShipmentDetailVM | unknown

export async function getSellShipmentDetail(id: string): Promise<ShipmentDetailResult> {
  const mode = getApiMode()

  if (mode === 'live') {
    const dto = await apiGet<SellShipmentOut>(`/shipment-service/v1/sell-shipment-out/${id}`)
    return mapSellShipmentOutToDetail(dto)
  }

  if (mode === 'live-sim') {
    // Visible proof: render the bundled SellShipmentOut fixture through the mapper.
    // (id is ignored — single fixture stands in for the real endpoint.)
    return mapSellShipmentOutToDetail(sellShipmentOutSample)
  }

  // mock: the locally generated detail file (served from public/details)
  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  return res.json()
}

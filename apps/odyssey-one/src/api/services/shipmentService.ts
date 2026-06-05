import { getApiMode } from '../config'
import { apiGet } from '../client'

// Plan 1: the detail object is returned AS-IS (current generated shape).
// Plan 2 replaces this with a typed SellShipmentOut DTO + mapper.
export type ShipmentDetailRaw = unknown

export async function getSellShipmentDetail(id: string): Promise<ShipmentDetailRaw> {
  if (getApiMode() === 'live') {
    return apiGet<ShipmentDetailRaw>(`/shipment-service/v1/sell-shipment-out/${id}`)
  }
  // mock: the locally generated detail file (served from public/details)
  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  return res.json()
}

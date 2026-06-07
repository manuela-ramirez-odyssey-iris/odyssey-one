import { getApiMode } from '../config'
import { apiGet } from '../client'
import { getAllShipments } from '../../data'
import type { ShipmentErrorRow, CategoryCount } from '../types/shipmentErrorList'

interface CategoryCountParams {
  panel: string
}

export async function getCategoryCounts(params: CategoryCountParams): Promise<CategoryCount[]> {
  if (getApiMode() === 'live') {
    // Real: GET /shipment-service/v1/shipment/error/category/count → { errorOverview, total }
    const res = await apiGet<{ errorOverview: CategoryCount[] }>(
      `/shipment-service/v1/shipment/error/category/count?panel=${encodeURIComponent(params.panel)}`,
    )
    return res.errorOverview ?? []
  }
  // mock: group the panel's rows by category
  const rows = (getAllShipments() as ShipmentErrorRow[]).filter(r => r.panel === params.panel)
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  return [...counts].map(([category, count]) => ({ category, count }))
}

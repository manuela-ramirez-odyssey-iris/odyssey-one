// spotApi.js — thin transport for spot-service (spot_state table). live mode
// only: mock mode is a no-op so spotStore/draftStore's write-through never
// touches the network under vitest (VITE_API_MODE stays 'mock' there).
// fetchSpotState distinguishes "didn't check" (mock, returns undefined) from
// "checked, nothing stored" (live, returns null) — callers use that to decide
// whether a null result should clear the local cache.
import { getApiMode } from '../api/config'
import { apiGet, apiPut, apiDelete } from '../api/client'

const BASE = '/spot-service/v1/spot'

export async function fetchSpotState(shipmentId, kind) {
  if (getApiMode() !== 'live') return undefined
  const res = await apiGet(`${BASE}/${encodeURIComponent(shipmentId)}?kind=${kind}`)
  return res.value
}

export async function putSpotState(shipmentId, kind, value) {
  if (getApiMode() !== 'live') return
  await apiPut(`${BASE}/${encodeURIComponent(shipmentId)}`, { kind, value })
}

export async function deleteSpotState(shipmentId, kind) {
  if (getApiMode() !== 'live') return
  await apiDelete(`${BASE}/${encodeURIComponent(shipmentId)}?kind=${kind}`, {})
}

// spotApi.js — thin transport for spot-service (spot_state table). live mode
// only: mock mode is a no-op so spotStore/draftStore's write-through never
// touches the network under vitest (VITE_API_MODE stays 'mock' there).
// fetchSpotState distinguishes "didn't check" (mock, returns undefined) from
// "checked, nothing stored" (live, returns null) — callers use that to decide
// whether a null result should clear the local cache.
import { getApiMode } from '../api/config'
import { apiGet, apiPut, apiDelete } from '../api/client'

const BASE = '/spot-service/v1/spot'

// Per-(shipmentId, kind) write queue. saveDraft/sendRFQ/etc each fire a
// fire-and-forget PUT (spotStore.write, draftStore.write); two of those in
// quick succession race on the network and can land at the DB out of order,
// so the LAST ONE TO RESOLVE wins regardless of which was sent first —
// reproduced as an RFQ stuck at status:'draft' forever. Chaining each new
// write onto the tail of the previous one for the same key guarantees the
// fetch calls fire in the same order they were issued (the second fetch is
// not even constructed until the first settles) — callers still don't await
// anything, so this stays fire-and-forget from their perspective.
// ponytail: process-lifetime Map, never pruned — fine, the key space is one
// entry per (shipment, kind) a live session ever touches, not unbounded.
const writeChains = new Map()
const chainKeyFor = (shipmentId, kind) => `${shipmentId}:${kind}`

function enqueueWrite(shipmentId, kind, task) {
  const key = chainKeyFor(shipmentId, kind)
  const prev = writeChains.get(key) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(task)
  writeChains.set(key, next)
  return next
}

export async function fetchSpotState(shipmentId, kind) {
  if (getApiMode() !== 'live') return undefined
  const res = await apiGet(`${BASE}/${encodeURIComponent(shipmentId)}?kind=${kind}`)
  return res.value
}

export async function putSpotState(shipmentId, kind, value) {
  if (getApiMode() !== 'live') return
  await enqueueWrite(shipmentId, kind, () => apiPut(`${BASE}/${encodeURIComponent(shipmentId)}`, { kind, value }))
}

export async function deleteSpotState(shipmentId, kind) {
  if (getApiMode() !== 'live') return
  await enqueueWrite(shipmentId, kind, () => apiDelete(`${BASE}/${encodeURIComponent(shipmentId)}?kind=${kind}`, {}))
}

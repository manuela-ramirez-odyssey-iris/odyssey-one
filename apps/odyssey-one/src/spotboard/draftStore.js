// Named-snapshot store for SpotBid draft plans — separate from spotStore's
// single live quote: a snapshot is a restorable copy of the Setup payload,
// identified by savedAt (no user naming in v1).
//
// Write-through to spot-service (kind='drafts', value = the whole list) —
// same last-write-wins fire-and-forget scheme as spotStore.js; see that
// file's header for the full rationale.
import { getApiMode } from '../api/config'
import { fetchSpotState, putSpotState } from './spotApi.js'

const KIND = 'drafts'
const key = (shipmentId) => `spotboard:drafts:${shipmentId}`

function read(shipmentId) {
  try { return JSON.parse(localStorage.getItem(key(shipmentId))) ?? [] } catch { return [] }
}

// Local-only write — no PUT. Used by hydrateDrafts so a DB->local sync never
// echoes straight back to the DB.
function writeLocal(shipmentId, drafts) {
  localStorage.setItem(key(shipmentId), JSON.stringify(drafts))
  return drafts
}

function write(shipmentId, drafts) {
  writeLocal(shipmentId, drafts)
  putSpotState(shipmentId, KIND, drafts).catch(() => {})
  return drafts
}

export function listDrafts(shipmentId) {
  return read(shipmentId).sort((a, b) => b.savedAt - a.savedAt)
}

export function saveDraftSnapshot(shipmentId, payload, nowMs) {
  const draft = { id: crypto.randomUUID(), savedAt: nowMs, payload }
  write(shipmentId, [...read(shipmentId), draft])
  return draft
}

export function removeDraft(shipmentId, id) {
  write(shipmentId, read(shipmentId).filter((d) => d.id !== id))
}

// One-shot hydrate for SpotBoardTab's mount effect — DB is authoritative:
// null clears the local list, non-null overwrites it. No-op in mock mode.
export async function hydrateDrafts(shipmentId) {
  if (getApiMode() !== 'live') return listDrafts(shipmentId)
  const value = await fetchSpotState(shipmentId, KIND)
  if (value === undefined) return listDrafts(shipmentId)
  if (value === null) { localStorage.removeItem(key(shipmentId)); return [] }
  writeLocal(shipmentId, value)
  return listDrafts(shipmentId)
}

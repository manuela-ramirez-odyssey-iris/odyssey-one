// Named-snapshot store for SpotBid draft plans — separate from spotStore's
// single live quote: a snapshot is a restorable copy of the Setup payload,
// identified by savedAt (no user naming in v1).
const key = (shipmentId) => `spotboard:drafts:${shipmentId}`

function read(shipmentId) {
  try { return JSON.parse(localStorage.getItem(key(shipmentId))) ?? [] } catch { return [] }
}

export function listDrafts(shipmentId) {
  return read(shipmentId).sort((a, b) => b.savedAt - a.savedAt)
}

export function saveDraftSnapshot(shipmentId, payload, nowMs) {
  const draft = { id: crypto.randomUUID(), savedAt: nowMs, payload }
  localStorage.setItem(key(shipmentId), JSON.stringify([...read(shipmentId), draft]))
  return draft
}

export function removeDraft(shipmentId, id) {
  localStorage.setItem(key(shipmentId), JSON.stringify(read(shipmentId).filter((d) => d.id !== id)))
}

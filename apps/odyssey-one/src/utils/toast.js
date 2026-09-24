import { useSyncExternalStore } from 'react'

// Minimal app-wide toast store (S159, PGI/PGR restyle). No toast mechanism
// existed anywhere in the app (grepped) — this is the smallest thing that
// works: one active toast at a time, auto-dismiss, module-singleton state so
// it survives a navigate() away from whatever screen triggered it (e.g.
// Executed Shipment Details "Mark as shipped" → back to the PGI/PGR list).
// Mirrors utils/notifications.js's useSyncExternalStore pattern.
// ponytail: single active toast, no queue — add a queue if two can ever fire
// back to back.
let toast = null
const listeners = new Set()

export function showToast(message, { durationMs = 3000 } = {}) {
  toast = { id: Date.now(), message }
  listeners.forEach((l) => l())
  setTimeout(() => {
    toast = null
    listeners.forEach((l) => l())
  }, durationMs)
}

export function useToast() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => toast,
  )
}

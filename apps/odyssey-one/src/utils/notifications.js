import { useSyncExternalStore } from 'react'

// Minimal navbar-bell counter (S98 confirmation async flip). Seeded with the
// demo count the Navbar previously hardcoded.
// ponytail: module singleton, no payloads — becomes a real notification store
// when a notification center exists.
let count = 6
const listeners = new Set()

export function pushNotification() {
  count += 1
  listeners.forEach((l) => l())
}

export function useNotificationCount() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => count,
  )
}

// Dev-mode overlay state: module-level pub/sub store (same idiom as
// src/utils/notifications.js), read via useSyncExternalStore.
//
// Init precedence on first read: ?dev=<truthy> enables (and sets
// everActivated forever); ?dev=0|false force-disables AND wipes the
// persisted entry; otherwise state comes from localStorage.
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'odyssey-devmode'
const DEFAULTS = { enabled: false, mode: 'hover', framework: 'react', everActivated: false, corner: 'br' }

let state = { ...DEFAULTS }
let initialized = false
const listeners = new Set()

function notify() {
  listeners.forEach((l) => l())
}

// ponytail: try/catch around every localStorage call — private-mode Safari
// throws on read/write/remove; degrade to in-memory only rather than crash.
function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStorage(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // in-memory only
  }
}

function clearStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // in-memory only
  }
}

function isTruthyParam(raw) {
  const v = raw.toLowerCase()
  return v !== '0' && v !== 'false'
}

function ensureInit() {
  if (initialized) return
  initialized = true
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const stored = readStorage()
  if (stored) state = { ...DEFAULTS, ...stored }

  if (params.has('dev')) {
    if (isTruthyParam(params.get('dev') ?? '')) {
      state = { ...state, enabled: true, everActivated: true }
      writeStorage(state)
    } else {
      state = { ...state, enabled: false }
      clearStorage()
    }
  }
}

function update(patch) {
  ensureInit()
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  writeStorage(state)
  notify()
}

export function setEnabled(enabled) {
  update((s) => ({ enabled, everActivated: s.everActivated || enabled }))
}

export function setMode(mode) {
  update({ mode })
}

export function setFramework(framework) {
  update({ framework })
}

export function setCorner(corner) {
  update({ corner })
}

export function getState() {
  ensureInit()
  return state
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  ensureInit()
  return state
}

export function useDevMode() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return { ...snap, setEnabled, setMode, setFramework, setCorner }
}

// Test-only: force the next read to re-evaluate URL/localStorage from
// scratch. Tests clear localStorage + set location.search themselves.
export function _resetForTests() {
  state = { ...DEFAULTS }
  initialized = false
}

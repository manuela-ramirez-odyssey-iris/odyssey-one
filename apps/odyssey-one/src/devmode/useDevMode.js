// Dev-mode overlay state: module-level pub/sub store (same idiom as
// src/utils/notifications.js), read via useSyncExternalStore.
//
// Storage split: `enabled`/`everActivated` (activation) live in
// sessionStorage — a fresh tab with no ?dev param must show nothing, but an
// in-app nav (React Router link, which drops query strings) or a reload of
// THAT tab must not lose activation, hence session- not local-scoped.
// `mode`/`framework`/`corner`/`nesting` (preferences) stay in localStorage,
// same as before.
//
// Init precedence on first read: ?dev=<truthy> enables (and sets
// everActivated) for this tab's session; ?dev=0|false force-disables AND
// wipes the persisted session entry; otherwise activation comes from
// sessionStorage and preferences come from localStorage.
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'odyssey-devmode'
const SESSION_KEY = 'odyssey-devmode-session'
const SESSION_FIELDS = ['enabled', 'everActivated']
// nesting: 'all' labels every ui component including ones nested inside
// another (the common case — components composed into slots); 'outermost'
// is the old behavior (stop at the enclosing component).
const DEFAULTS = { enabled: false, mode: 'hover', framework: 'angular', everActivated: false, corner: 'br', nesting: 'all' }

let state = { ...DEFAULTS }
let initialized = false
const listeners = new Set()

function notify() {
  listeners.forEach((l) => l())
}

// ponytail: try/catch around every storage call — private-mode Safari throws
// on read/write/remove; degrade to in-memory only rather than crash.
function readJSON(store, key) {
  try {
    const raw = store.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJSON(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // in-memory only
  }
}

function removeKey(store, key) {
  try {
    store.removeItem(key)
  } catch {
    // in-memory only
  }
}

function isTruthyParam(raw) {
  const v = raw.toLowerCase()
  return v !== '0' && v !== 'false'
}

// Splits current `state` into its persisted halves and writes each to its
// own store.
function persist() {
  const session = {}
  const prefs = {}
  for (const [key, value] of Object.entries(state)) {
    if (SESSION_FIELDS.includes(key)) session[key] = value
    else prefs[key] = value
  }
  writeJSON(window.localStorage, STORAGE_KEY, prefs)
  writeJSON(window.sessionStorage, SESSION_KEY, session)
}

function ensureInit() {
  if (initialized) return
  initialized = true
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const prefs = readJSON(window.localStorage, STORAGE_KEY)
  const session = readJSON(window.sessionStorage, SESSION_KEY)
  state = { ...DEFAULTS, ...prefs, ...session }

  if (params.has('dev')) {
    if (isTruthyParam(params.get('dev') ?? '')) {
      state = { ...state, enabled: true, everActivated: true }
      writeJSON(window.sessionStorage, SESSION_KEY, { enabled: true, everActivated: true })
    } else {
      state = { ...state, enabled: false, everActivated: false }
      removeKey(window.sessionStorage, SESSION_KEY)
    }
  }
}

function update(patch) {
  ensureInit()
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  persist()
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

export function setNesting(nesting) {
  update({ nesting })
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
  return { ...snap, setEnabled, setMode, setFramework, setCorner, setNesting }
}

// Test-only: force the next read to re-evaluate URL/local+session storage
// from scratch, and wipe both stores so tests start from a clean slate.
export function _resetForTests() {
  state = { ...DEFAULTS }
  initialized = false
  if (typeof window === 'undefined') return
  removeKey(window.localStorage, STORAGE_KEY)
  removeKey(window.sessionStorage, SESSION_KEY)
}

import { getApiMode } from '../config'
import { apiGet, apiPost, apiPatch, apiDelete } from '../client'
import { currentUser } from '../../data/sso-mock'

// Shared saved filters (shared_filters table via /filter-service/v1/shared-filters).
// live: the four REST routes, sending the mock-SSO current user id so the server
// can run its author check. mock: an in-memory Map — no localStorage, so tests
// stay deterministic, exactly like preferenceService.
//
// Unlike preferences, a shared filter is readable by EVERYONE and writable only
// by its author — "the author edits, everyone applies" (spec §Behaviour 5). The
// mock enforces the same rule so the two modes can't drift into different
// behaviour, which is the whole reason a mock equivalent exists.
//
// ponytail: identity = sso-mock currentUser.id until real SSO lands, so the
// author check is spoofable by construction — accident-prevention, not security.
// It becomes real enforcement when userId comes from a verified session.

export type SharedFilter = {
  id: string
  ownerId: string
  ownerUsername: string
  name: string
  chips: unknown[]
  createdAt?: string
}

const BASE = '/filter-service/v1/shared-filters'
const mockStore = new Map<string, SharedFilter>()

// Mirrors `usernameFor` in tools/seed-users.mjs — the server resolves the author
// badge through `users.username`, which is derived that way at seed time. Mock
// mode derives it identically so the badge reads the same in both modes; a
// divergence here would show a different author name depending on API mode.
const usernameFor = (name: string) =>
  String(name).toLowerCase().replace(/\./g, '').trim().split(/\s+/).join('.')

class NotAuthorError extends Error {
  status = 403
  constructor(id: string) {
    super(`Not the author of shared filter ${id}`)
  }
}

/** Newest first — matches the server's ORDER BY created_at DESC. */
export async function listSharedFilters(): Promise<SharedFilter[]> {
  if (getApiMode() === 'live') {
    const res = await apiGet<{ filters: SharedFilter[] }>(BASE)
    return res.filters ?? []
  }
  return [...mockStore.values()].reverse()
}

export async function shareFilter(id: string, name: string, chips: unknown[]): Promise<SharedFilter> {
  if (getApiMode() === 'live') {
    const res = await apiPost<{ filter: SharedFilter }>(BASE, { id, name, chips, userId: currentUser.id })
    return res.filter
  }
  const filter: SharedFilter = {
    id,
    name,
    chips,
    ownerId: currentUser.id,
    ownerUsername: usernameFor(currentUser.name ?? currentUser.id),
  }
  mockStore.set(id, filter)
  return filter
}

export async function renameSharedFilter(id: string, name: string): Promise<SharedFilter> {
  if (getApiMode() === 'live') {
    const res = await apiPatch<{ filter: SharedFilter }>(`${BASE}/${encodeURIComponent(id)}`, {
      name,
      userId: currentUser.id,
    })
    return res.filter
  }
  const existing = mockStore.get(id)
  if (!existing) throw new Error(`Unknown shared filter ${id}`)
  if (existing.ownerId !== currentUser.id) throw new NotAuthorError(id)
  const next = { ...existing, name }
  mockStore.set(id, next)
  return next
}

/** Delete = un-share. Author only, in both modes. */
export async function deleteSharedFilter(id: string): Promise<void> {
  if (getApiMode() === 'live') {
    await apiDelete<{ success: boolean }>(`${BASE}/${encodeURIComponent(id)}`, { userId: currentUser.id })
    return
  }
  const existing = mockStore.get(id)
  if (!existing) return
  if (existing.ownerId !== currentUser.id) throw new NotAuthorError(id)
  mockStore.delete(id)
}

// test-only: reset the mock store between specs (mirrors __clearMockPreferences)
export function __clearMockSharedFilters() {
  mockStore.clear()
}

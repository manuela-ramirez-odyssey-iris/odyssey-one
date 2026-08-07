import { getApiBaseUrl } from './config'
import { getAuthToken } from './auth'

// Normalized error every caller can branch on (status + the trace id we sent).
export class ApiError extends Error {
  status: number
  correlationId: string
  constructor(message: string, status: number, correlationId: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.correlationId = correlationId
  }
}

// x-correlation-id: the request-tracing id every Odyssey service expects.
function newCorrelationId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ?? `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// api/index.js's catch-all returns { message, detail } on every non-2xx
// (message is the real reason for 4xx, 'Internal error' for 500s). Every
// apiXxx call routes through here so a real server message (e.g. a 409's
// "Order number already exists: ...") reaches the caller instead of the
// generic "Request failed (status): path" — that genericness is how a real
// 409 stayed invisible to the user (orders-fix-round Task 4).
async function apiErrorFrom(res: Response, path: string, correlationId: string): Promise<ApiError> {
  let message = `Request failed (${res.status}): ${path}`
  try {
    const body = await res.json()
    if (body && typeof body.message === 'string' && body.message) message = body.message
  } catch {
    // Non-JSON or empty body — keep the generic message.
  }
  return new ApiError(message, res.status, correlationId)
}

export async function apiGet<T>(path: string): Promise<T> {
  const correlationId = newCorrelationId()
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, { headers })
  if (!res.ok) {
    throw await apiErrorFrom(res, path, correlationId)
  }
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const correlationId = newCorrelationId()
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await apiErrorFrom(res, path, correlationId)
  }
  return (await res.json()) as T
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const correlationId = newCorrelationId()
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await apiErrorFrom(res, path, correlationId)
  }
  return (await res.json()) as T
}

// DELETE carries a body — the author check needs the caller's userId, and until
// SSO lands that only travels in the payload (see api/_lib/sharedFilters.mjs).
export async function apiDelete<T>(path: string, body: unknown): Promise<T> {
  const correlationId = newCorrelationId()
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await apiErrorFrom(res, path, correlationId)
  }
  return (await res.json()) as T
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const correlationId = newCorrelationId()
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await apiErrorFrom(res, path, correlationId)
  }
  return (await res.json()) as T
}

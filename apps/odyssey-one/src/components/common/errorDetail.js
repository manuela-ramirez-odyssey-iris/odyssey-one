// getErrorDetail — turns a caught fetch/query error into a BRIEF reason
// string (Figma `Table Container Error` 5065:8602's line 2: a short
// "<Error1> explanation", not a wall of text). User ruling (2026-08-14):
// never render a raw server string here — it can be arbitrarily long (e.g.
// a 409's "Order number already exists: ..."). Only known, short, mapped
// phrases come out of this function.
//
// Branches key off shapes that are REALLY thrown today (see src/api/client.ts):
// - ApiError (client.ts) carries `status` — branch on that for 401/403/5xx.
// - A native `fetch()` failure (offline, DNS, CORS) throws a TypeError
//   ("Failed to fetch" / "NetworkError..." / "fetch failed" depending on
//   engine) — the Fetch API's own contract, not invented.
// - An aborted/timed-out request throws a DOMException named 'AbortError'
//   (AbortController / AbortSignal.timeout()'s standard shape) — client.ts
//   doesn't wire a timeout yet, but this is the real shape if/when it does.
// Anything else (a plain 4xx that isn't 401/403, an unrecognized error,
// nothing at all) falls to the single generic fallback.
const GENERIC = 'Something went wrong. Please try again.'

export function getErrorDetail(error) {
  if (!error) return GENERIC
  if (error.name === 'AbortError') return 'The request timed out.'
  if (error instanceof TypeError) return 'No connection to the server.'
  const status = error.status
  if (status === 401 || status === 403) return "You don't have access to this data."
  if (typeof status === 'number' && status >= 500) return 'The service is temporarily unavailable.'
  return GENERIC
}

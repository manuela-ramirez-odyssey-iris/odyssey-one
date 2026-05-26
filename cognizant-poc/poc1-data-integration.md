# POC 1 — Live Data Integration Plan

**Gate:** 2 (plan only — no code).
**Status:** Pivoted 2026-05-21. Awaiting re-approval before GATE 3.
**Date:** 2026-05-21
**Confidence:** High on endpoint + payload (curl-validated against production). High on auth (captured from a live request). Medium on whether empty `{}` body works — confirm during GATE 3 by stripping the body; fall back to a captured live body if rejected.

> ⚠️ AI-generated. Validate before acting. The endpoint was curl-tested against production on 2026-05-21; re-validate token + cookie within 1 hour of the demo on 2026-05-22.

---

## Pivot summary (read first)

The earlier draft of this plan targeted the Cognizant `linx-odyssey-usermanagement-ui` repo's `users/locked` endpoint. **That is no longer the POC 1 endpoint.** Manuela's access to `dev.linx.odysseylogistics.com` was revoked and re-grant would take days — past the 2026-05-22 meeting.

We pivoted to a different real Odyssey backend Manuela has stable access to: the **odyssey-one.com Tracking platform**. Narrative gets stronger, not weaker:

- Real **production** backend (not a dev tier).
- Multi-status payload — one call powers a richer widget (a 3xChart with central total + 4 status rows + donut), not a 1x metric.
- Counts shift between consecutive calls — concrete proof "this is live, not a snapshot."

**Important scope clarification:** the Cognizant clone is no longer the POC 1 API reference. It remains the **Angular pattern reference for POC 2 (unchanged)**. Everything `VITE_COGNIZANT_*` in earlier drafts is renamed to `VITE_ODYSSEY_TRACKING_*`. POC 1 no longer touches the Cognizant repo at all.

---

## 1. Endpoint chosen

```
POST https://odyssey-one.com/tracking/api/uiapi/loads/statistics
Content-Type: application/json
Authorization: Bearer <JWT>
Cookie: SESSION=<uuid>
```

**Body:** the live dashboard sends a 246-byte JSON body that Safari's preview didn't surface. For the POC, **empty `{}` is the shipped default** — see `useTrackingLoadStatistics.js`. Empty-body verification status: **pending Manuela's first dev-server run** (no JWT available to me to test independently). The runbook (`poc1-runbook.md` §1.3 and §3) documents the self-update path: if `{}` works as expected, no doc change needed; if it fails, capture the live request body verbatim, paste into this section, and replace `body: '{}'` in the hook.

**Why this endpoint:** powers the live Odyssey Tracking dashboard. Returns `totalLoads` plus a `statuses` array of 6 entries — Scheduled P/U Today, EnRoute, Delivered, At Risk, All shipments, No Tracking Data — each with a real-time count.

**Response shape** (captured via curl, validated 2026-05-21):
```json
{
  "pageNumber": 0,
  "pageSize": 0,
  "totalRecords": 0,
  "totalLoads": 0,
  "statuses": [
    { "uuid": "...", "status": "Scheduled P/U Today", "count": 2365, "searchQuery": { /* ... */ } },
    { "uuid": "...", "status": "EnRoute",             "count": 1343,  "searchQuery": { /* ... */ } },
    { "uuid": "...", "status": "Delivered",           "count": 16869, "searchQuery": { /* ... */ } },
    { "uuid": "...", "status": "At Risk",             "count": 65023, "searchQuery": { /* ... */ } },
    { "uuid": "...", "status": "All shipments",       "count": 85241, "searchQuery": { /* ... */ } },
    { "uuid": "...", "status": "No Tracking Data",    "count": 36887, "searchQuery": { /* ... */ } }
  ]
}
```

Note: `totalLoads` is zeroed because we ask for `pageSize: 0` (we only want the counts, not the load list). The real "total" comes from `statuses[?status='All shipments'].count`.

## 2. Widget tile target

`apps/odyssey-one/src/routes/Home.jsx:290` — the **`shipments-exceptions` 3xChart widget**.

Today it's hardcoded with the shipments-exceptions mock data:
- `shipmentsExceptionsRows` at `Home.jsx:144`
- `shipmentsExceptionsSegments` at `Home.jsx:151`

For the demo we **repurpose it by patching its props at runtime** — same widget id, same position in the grid, new data + new title. **Constraints:**
- Do not change the widget id.
- Do not move it to a different section.
- Do not rename `shipmentsExceptionsRows` / `shipmentsExceptionsSegments` (kept as the static fallback — see §7).
- Patch only at the React state layer.

## 3. Data shape mapping

| Widget prop | Source | Value (from validated snapshot) |
|---|---|---|
| `title` | static override | `'Tracking — Load Status'` |
| `value` | `String(statuses.find(s => s.status === 'All shipments').count)` formatted | `'85,241'` (use `count.toLocaleString()`) |
| `label` | static override | `'Total Loads (Last 30 Days)'` |
| `rows[0]` | `statuses.find(s => s.status === 'Scheduled P/U Today').count` | `{ label: 'Scheduled P/U Today', value: '2,365', indicatorColor: 'var(--chart-1)', onClick: handleRow('scheduled-pu') }` |
| `rows[1]` | `statuses.find(s => s.status === 'EnRoute').count` | `{ label: 'EnRoute', value: '1,343', indicatorColor: 'var(--chart-2)', onClick: handleRow('enroute') }` |
| `rows[2]` | `statuses.find(s => s.status === 'Delivered').count` | `{ label: 'Delivered', value: '16,869', indicatorColor: 'var(--chart-3)', onClick: handleRow('delivered') }` |
| `rows[3]` | `statuses.find(s => s.status === 'At Risk').count` | `{ label: 'At Risk', value: '65,023', indicatorColor: 'var(--chart-4)', onClick: handleRow('at-risk') }` |
| `chartSegments` | same 4 statuses (Scheduled / EnRoute / Delivered / At Risk) | `[{ value: 2365, color: 'var(--chart-1)' }, { value: 1343, color: 'var(--chart-2)' }, { value: 16869, color: 'var(--chart-3)' }, { value: 65023, color: 'var(--chart-4)' }]` |
| `chartTotal` | sum of the 4 displayed status counts | `85600` (renders correct donut proportions) |
| `domainIcon` | unchanged | existing `shipmentsIcon` |
| `goToLabel` | static override (optional) | `'Go to Tracking'` |
| `onGoToClick` | unchanged for the demo | existing `handleRow('shipments-exceptions')` (cleanup deferred — not critical for the demo story) |

**Formatting:** rows show raw counts only — no percentages. The original mock used `'99 (26.33%)'` format; for the live demo, plain `'2,365'` via `count.toLocaleString()`. Cleaner, less to break.

**Skipped statuses:** "No Tracking Data" and "All shipments" are not rendered as rows. The former is too operational for a top-level dashboard widget; the latter is redundant with the central metric.

## 4. Curl validation — COMPLETE

Validated **2026-05-21 by Manuela**. HTTP/2 200, JSON body matches the spec in §1. Counts confirmed live: shifted between consecutive calls (2363→2365, 65020→65023, 85235→85241). No need to re-run before GATE 3 — the next validation is the token-recapture step in §5, which happens within 1 hour of the meeting.

## 5. Auth strategy

Auth is **OAuth/OIDC via Keycloak**, realm `oneodyssey`, issuer `https://trapi-prd-serv01.odysseylogistics.com:8443/realms/oneodyssey`. The live dashboard sends both an `Authorization: Bearer <JWT>` header **and** a `Cookie: SESSION=<uuid>` header. Curl validated with both present; we replicate both.

**Token-recapture before demo (HARD RULE):** the JWT has ~10h lifetime per the `exp` claim. Capture a fresh token + SESSION cookie **within 1 hour of the 2026-05-22 meeting**. This is documented as the first checklist item in the GATE 3 README.

**Capture workflow for reviewers:**
1. Open `https://odyssey-one.com/tracking/dashboard` in the browser, log in via SSO.
2. Safari DevTools → Network tab → reload → find any `/api/uiapi/loads/statistics` request.
3. Right-click → "Copy as cURL" → extract the `Authorization: Bearer …` value and the `Cookie: SESSION=…` value.
4. Paste both into `apps/odyssey-one/.env.local`:
   - `VITE_ODYSSEY_TRACKING_TOKEN=<JWT>`
   - `VITE_ODYSSEY_TRACKING_SESSION=<uuid>`

**Hard rule unchanged:** `.env.local.example` ships with `<TOKEN>` and `<SESSION>` placeholders. `.env.local` is gitignored. No real credentials in any committed file, ever.

## 6. CORS / proxy plan

The Vite proxy serves two purposes: (1) makes the call same-origin from the browser's perspective (avoids CORS preflight failures), (2) gives us a single server-side place to inject the JWT and SESSION cookie without baking secrets into client code.

```js
// apps/odyssey-one/vite.config.js — additions only
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/odyssey-tracking-api': {
        target: process.env.VITE_ODYSSEY_TRACKING_API_BASE
          || 'https://odyssey-one.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/odyssey-tracking-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const token = process.env.VITE_ODYSSEY_TRACKING_TOKEN
            const session = process.env.VITE_ODYSSEY_TRACKING_SESSION
            if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`)
            if (session) proxyReq.setHeader('Cookie', `SESSION=${session}`)
            proxyReq.setHeader('Origin', 'https://odyssey-one.com')
          })
        },
      },
    },
  },
  build: { /* unchanged */ },
})
```

`.env.local.example` (committed):
```
# Odyssey Tracking API base — defaults to production
VITE_ODYSSEY_TRACKING_API_BASE=https://odyssey-one.com

# JWT captured from a logged-in /tracking/dashboard session.
# Capture within 1 hour of the demo — ~10h lifetime.
VITE_ODYSSEY_TRACKING_TOKEN=<TOKEN>

# SESSION cookie captured from the same request.
VITE_ODYSSEY_TRACKING_SESSION=<SESSION>
```

Client fetch site:
```js
fetch('/odyssey-tracking-api/tracking/api/uiapi/loads/statistics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',   // confirm empty body works during GATE 3; fall back to captured body if rejected
})
```

No URL or secret exposed in client code.

## 7. Loading + error + fallback

Hard requirement: **the demo must never show broken UI**. State machine:

| State | What user sees | When |
|---|---|---|
| `loading` | The existing `shipmentsExceptionsRows` + `shipmentsExceptionsSegments` mock (current rendered state of the widget) | While the in-flight request hasn't returned |
| `success` | Live values from `statuses` array, formatted per §3 | On HTTP 200 |
| `error` | Mock stays. Log the error to console only — no toast, no banner. | On non-200, network error, missing token, expired JWT, etc. |

Implementation shape (for GATE 3): a `useTrackingLoadStatistics()` hook that initializes `{ value, label, title, rows, chartSegments, chartTotal }` to the mock derived from `shipmentsExceptionsRows` / `shipmentsExceptionsSegments`, then overwrites with live data on fetch success. The widget never knows whether the data is live or mock. Appropriate for a demo widget; would be wrong for production but the goal is "demo never shows a broken state."

## 8. Angular twin widget

**Dropped.** Confirmed 2026-05-21. Out of POC 1 scope entirely. Not mentioned in GATE 3. POC 1 is React-only against production Tracking API; POC 2 carries the Angular-side evidence (Button + design system port).

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| JWT expiry (~10h lifetime) | Medium | High if forgotten | Token-recapture step is the first item in the GATE 3 README pre-demo checklist; mock fallback in §7 catches a forgotten refresh visually so the widget never shows a broken state. |
| CORS preflight on POST with `Authorization` header | Low-medium | High if it happens | Vite proxy makes the request same-origin from the browser's perspective; verify during GATE 3 by checking dev server logs for OPTIONS forwarding. |
| Empty `{}` body rejected by server | Low | Low | Confirm during GATE 3 by stripping the body and watching response. Fall back to a captured live body if rejected (see §1). |
| Production backend transient outage at demo time | Low | Demo falls back to mock; narrative weakened | §7 mock fallback covers UI; talking points can still claim "real backend, just degraded right now." |
| Backend payload schema changes between 2026-05-21 and 2026-05-22 | Very low | Demo breaks | Out of our control; mock fallback covers UI. |
| Token or SESSION accidentally committed | Low if hygiene followed | High (production credential exposure) | `.env.local` in `.gitignore`; only `.env.local.example` with `<TOKEN>` / `<SESSION>` placeholders is committed. Recommend a pre-commit grep for `eyJ` (JWT header signature) as belt-and-suspenders. |

---

## Pre-implementation checklist (must be ✅ before GATE 3)

- [x] ~~Curl test returns HTTP 200~~ — done by Manuela 2026-05-21.
- [x] ~~HttpOnly cookie copy-ability~~ — no longer applicable (auth is JWT + SESSION captured from request headers, not browser cookie store).
- [x] ~~Angular twin scope decision~~ — dropped.
- [x] User has re-approved the pivoted plan (this round). Approved 2026-05-21; GATE 3 implementation complete.

🛑 Stopping per GATE 2 instructions. Awaiting your sign-off on the pivoted plan before GATE 3 fires.

# Shipments Detail — API Pipe (Plan 1 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the Shipments detail panel through a real production data architecture — a typed `src/api/` service layer + TanStack Query — running in mock mode against the existing detail files, one env flip from the live `shipment-service`.

**Architecture:** A new app-local `src/api/` TypeScript layer (config → auth seam → fetch client → shipment service → query hook) sits behind the route. `ShipmentsRoute` stops hand-rolling `fetch` + a cache and instead calls `useShipmentDetail(id)` (TanStack Query). In mock mode the service reads the existing `/details/{id}.json` and returns it unchanged (identity — no shape change yet); in live mode it calls `GET /shipment-service/v1/sell-shipment-out/{id}` with `Bearer` + `x-correlation-id` headers. Components are untouched.

**Tech Stack:** React 19, Vite 8, TanStack Query v5, TypeScript (incremental, `allowJs`), Vitest.

**Scope note — this is Plan 1 of 2.** Plan 1 lands the architecture pipe with NO data-shape change (tabs/data files untouched). **Plan 2** (separate) adds the typed `SellShipmentOut` DTO, regenerates `/details` to that shape via `generate.mjs`, and builds the tab-by-tab mapper that makes live mode render. Spec: `docs/superpowers/specs/2026-06-05-shipments-detail-api-wiring-design.md`.

---

### Task 1: Add dependencies

**Files:**
- Modify: `apps/odyssey-one/package.json` (via npm)

- [ ] **Step 1: Install TanStack Query (runtime) and TypeScript (dev)**

Run (from repo root):
```bash
npm install @tanstack/react-query -w odyssey-one-app
npm install -D typescript -w odyssey-one-app
```

- [ ] **Step 2: Verify they landed**

Run: `node -e "const p=require('./apps/odyssey-one/package.json'); console.log(p.dependencies['@tanstack/react-query'], p.devDependencies.typescript)"`
Expected: two version strings print (not `undefined undefined`).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/package.json package-lock.json
git commit -m "build: add @tanstack/react-query + typescript to odyssey-one"
```

---

### Task 2: TypeScript + Vitest config

**Files:**
- Create: `apps/odyssey-one/tsconfig.json`
- Create: `apps/odyssey-one/src/vite-env.d.ts`
- Modify: `apps/odyssey-one/vite.config.js:50`

- [ ] **Step 1: Create `apps/odyssey-one/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "vite.config.js"]
}
```

- [ ] **Step 2: Create `apps/odyssey-one/src/vite-env.d.ts`** (types the custom env vars)

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 3: Extend the Vitest `include` glob to cover `.ts`/`.tsx`**

In `apps/odyssey-one/vite.config.js`, change line 50 from:
```js
      include: ['src/**/*.test.{js,jsx}'],
```
to:
```js
      include: ['src/**/*.test.{js,jsx,ts,tsx}'],
```

- [ ] **Step 4: Verify existing tests still run under the new glob**

Run: `npm run test -w odyssey-one-app`
Expected: the existing 9 tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/tsconfig.json apps/odyssey-one/src/vite-env.d.ts apps/odyssey-one/vite.config.js
git commit -m "build: TypeScript config + Vitest .ts glob for the api layer"
```

---

### Task 3: Config + auth seam (env readers)

**Files:**
- Create: `apps/odyssey-one/src/api/config.ts`
- Create: `apps/odyssey-one/src/api/auth.ts`
- Test: `apps/odyssey-one/src/api/config.test.ts`

- [ ] **Step 1: Write the failing test** — `apps/odyssey-one/src/api/config.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiMode, getApiBaseUrl } from './config'
import { getAuthToken } from './auth'

afterEach(() => vi.unstubAllEnvs())

describe('api config', () => {
  it('defaults to mock mode when unset', () => {
    vi.stubEnv('VITE_API_MODE', '')
    expect(getApiMode()).toBe('mock')
  })

  it('reads live mode from env', () => {
    vi.stubEnv('VITE_API_MODE', 'live')
    expect(getApiMode()).toBe('live')
  })

  it('returns empty base url when unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBe('')
  })

  it('returns the configured token, or null when unset', () => {
    vi.stubEnv('VITE_API_TOKEN', 'dev-token-123')
    expect(getAuthToken()).toBe('dev-token-123')
    vi.stubEnv('VITE_API_TOKEN', '')
    expect(getAuthToken()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w odyssey-one-app -- config.test`
Expected: FAIL — cannot find module `./config`.

- [ ] **Step 3: Create `apps/odyssey-one/src/api/config.ts`**

```ts
// Runtime config for the API layer. `mock` reads local generated detail files;
// `live` calls the real shipment-service. Switching modes is a single env flip.
// Functions (not constants) so values are read at call time — testable via vi.stubEnv.
export type ApiMode = 'mock' | 'live'

export function getApiMode(): ApiMode {
  return import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock'
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}
```

- [ ] **Step 4: Create `apps/odyssey-one/src/api/auth.ts`**

```ts
// Auth-token seam. Stubbed: returns a dev bearer token from env if present.
// Replaced by MSAL/Entra (acquireTokenSilent) later — callers never change.
export function getAuthToken(): string | null {
  return import.meta.env.VITE_API_TOKEN || null
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w odyssey-one-app -- config.test`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/api/config.ts apps/odyssey-one/src/api/auth.ts apps/odyssey-one/src/api/config.test.ts
git commit -m "feat(api): config mode switch + auth-token seam"
```

---

### Task 4: HTTP client (`apiGet` + `ApiError`)

**Files:**
- Create: `apps/odyssey-one/src/api/client.ts`
- Test: `apps/odyssey-one/src/api/client.test.ts`

- [ ] **Step 1: Write the failing test** — `apps/odyssey-one/src/api/client.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet, ApiError } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('apiGet', () => {
  it('sends Content-Type + x-correlation-id, returns parsed JSON on 200', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_API_TOKEN', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'X1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const data = await apiGet<{ id: string }>('/shipment-service/v1/sell-shipment-out/X1')

    expect(data).toEqual({ id: 'X1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/shipment-service/v1/sell-shipment-out/X1')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(typeof init.headers['x-correlation-id']).toBe('string')
    expect(init.headers['x-correlation-id'].length).toBeGreaterThan(0)
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('adds a Bearer token when one is configured', async () => {
    vi.stubEnv('VITE_API_TOKEN', 'tok-9')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await apiGet('/x')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-9')
  })

  it('throws ApiError with status + correlationId on non-OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiGet('/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
    await expect(apiGet('/missing')).rejects.toBeInstanceOf(ApiError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w odyssey-one-app -- client.test`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Create `apps/odyssey-one/src/api/client.ts`**

```ts
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
    throw new ApiError(`Request failed (${res.status}): ${path}`, res.status, correlationId)
  }
  return (await res.json()) as T
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w odyssey-one-app -- client.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/api/client.ts apps/odyssey-one/src/api/client.test.ts
git commit -m "feat(api): fetch client with Bearer + x-correlation-id + normalized ApiError"
```

---

### Task 5: Shipment service (mock/live switch)

**Files:**
- Create: `apps/odyssey-one/src/api/services/shipmentService.ts`
- Test: `apps/odyssey-one/src/api/services/shipmentService.test.ts`

- [ ] **Step 1: Write the failing test** — `apps/odyssey-one/src/api/services/shipmentService.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSellShipmentDetail } from './shipmentService'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('getSellShipmentDetail', () => {
  it('mock mode reads the local /details/{id}.json file', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '777' }) })
    vi.stubGlobal('fetch', fetchMock)

    const data = await getSellShipmentDetail('777')

    expect(data).toEqual({ id: '777' })
    expect(fetchMock.mock.calls[0][0]).toBe('/details/777.json')
  })

  it('live mode calls the real sell-shipment-out endpoint with headers', async () => {
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ shipmentId: '777' }) })
    vi.stubGlobal('fetch', fetchMock)

    const data = await getSellShipmentDetail('777')

    expect(data).toEqual({ shipmentId: '777' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/shipment-service/v1/sell-shipment-out/777')
    expect(init.headers['x-correlation-id']).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w odyssey-one-app -- shipmentService.test`
Expected: FAIL — cannot find module `./shipmentService`.

- [ ] **Step 3: Create `apps/odyssey-one/src/api/services/shipmentService.ts`**

```ts
import { getApiMode } from '../config'
import { apiGet } from '../client'

// Plan 1: the detail object is returned AS-IS (current generated shape).
// Plan 2 replaces this with a typed SellShipmentOut DTO + mapper.
export type ShipmentDetailRaw = unknown

export async function getSellShipmentDetail(id: string): Promise<ShipmentDetailRaw> {
  if (getApiMode() === 'live') {
    return apiGet<ShipmentDetailRaw>(`/shipment-service/v1/sell-shipment-out/${id}`)
  }
  // mock: the locally generated detail file (served from public/details)
  const res = await fetch(`/details/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load details for ${id}`)
  return res.json()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w odyssey-one-app -- shipmentService.test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/api/services/shipmentService.ts apps/odyssey-one/src/api/services/shipmentService.test.ts
git commit -m "feat(api): shipmentService.getSellShipmentDetail with mock/live switch"
```

---

### Task 6: Query client + `useShipmentDetail` hook + provider

**Files:**
- Create: `apps/odyssey-one/src/api/queryClient.ts`
- Create: `apps/odyssey-one/src/api/queries/useShipmentDetail.ts`
- Modify: `apps/odyssey-one/src/App.jsx:51-71`

- [ ] **Step 1: Create `apps/odyssey-one/src/api/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query'

// Single app-wide client. Replaces the hand-rolled 50-entry detailsCache Map:
// gcTime caps memory, staleTime avoids refetch storms when reopening a shipment.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

- [ ] **Step 2: Create `apps/odyssey-one/src/api/queries/useShipmentDetail.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { getSellShipmentDetail } from '../services/shipmentService'

// Server-state for one shipment's detail. Replaces the manual fetch + detailsCache
// in ShipmentsRoute. Plan 2 adds `select: mapSellShipmentOutToDetail` to map the
// real SellShipmentOut shape onto the view-model.
export function useShipmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['shipment', 'detail', id],
    queryFn: () => getSellShipmentDetail(id as string),
    enabled: !!id,
  })
}
```

- [ ] **Step 3: Wrap the app in `QueryClientProvider`** — in `apps/odyssey-one/src/App.jsx`

Add imports at the top (after the existing imports, around line 11):
```jsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
```

Change the `return (` block (currently `return (\n    <Routes>` … `</Routes>\n  )`) to wrap `<Routes>`:
```jsx
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              {showHome && <Home />}
              {showLogin && <Login onLogin={handleLogin} phase={phase} />}
            </>
          }
        />
        <Route path="/orders" element={<Orders />} />
        <Route path="/carriers" element={<Carriers />} />
        <Route path="/shipments/*" element={<ShipmentsRoute />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/users" element={<Users />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/button-demo" element={<ButtonDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </QueryClientProvider>
  )
```

- [ ] **Step 4: Verify the app still boots (provider mounts, no errors)**

Run: `npm run dev:odyssey-one` (from repo root), open the app, confirm it loads with no console errors. Stop the server.
Expected: app renders normally (no behavior change yet — the hook isn't wired in).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/api/queryClient.ts apps/odyssey-one/src/api/queries/useShipmentDetail.ts apps/odyssey-one/src/App.jsx
git commit -m "feat(api): QueryClient + useShipmentDetail hook + provider at app root"
```

---

### Task 7: Wire `ShipmentsRoute` to the hook

**Files:**
- Modify: `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx:14,57-96`

- [ ] **Step 1: Replace the data import (line 14)**

Change:
```jsx
import { getAllShipments, fetchShipmentDetails, getCachedShipmentDetails, getShipmentsByPanel, getShipmentsByPanelAndCategory, getCategoryCount, SEARCH_ATTRIBUTES } from '../../data'
```
to:
```jsx
import { getAllShipments, getShipmentsByPanel, getShipmentsByPanelAndCategory, getCategoryCount, SEARCH_ATTRIBUTES } from '../../data'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
```

- [ ] **Step 2: Replace the detail state + effect (lines 57-58 and 71-96)**

Remove these two state lines (57-58):
```jsx
  const [shipmentDetails, setShipmentDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
```

Replace the entire `useEffect` block (lines 71-96, the one that calls `getCachedShipmentDetails`/`fetchShipmentDetails`) with the hook + a small effect that preserves the collapse-on-select behavior:
```jsx
  const {
    data: shipmentDetails = null,
    isLoading: detailsLoading,
    isError: detailsError,
    refetch: refetchDetails,
  } = useShipmentDetail(selectedShipmentId)

  // Collapse the metrics strip when a shipment is selected (was a side effect of
  // the old detail-fetch effect).
  useEffect(() => {
    if (selectedShipmentId) setMetricsCollapsed(true)
  }, [selectedShipmentId])
```

- [ ] **Step 3: Verify the detail panel still works through the new path**

Run: `npm run dev:odyssey-one`, open `/shipments`, click a shipment row.
Expected: the bottom detail bar opens and all tabs render exactly as before (data now flows through `useShipmentDetail` → `shipmentService` → `/details/{id}.json`). Reopening the same shipment is instant (TanStack Query cache). No console errors. Stop the server.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test -w odyssey-one-app`
Expected: all tests PASS (existing 9 + new config/client/service tests).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx
git commit -m "feat(shipments): load detail via useShipmentDetail (TanStack Query) instead of manual fetch"
```

---

### Task 8: Detail error state + retry

**Files:**
- Modify: `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx` (pass error props to BottomBar)
- Modify: `apps/odyssey-one/src/components/detail/BottomBar.jsx` (render error branch)

- [ ] **Step 1: Pass error props to BottomBar** — in `ShipmentsRoute.jsx`, find the `<BottomBar ... />` usage and add two props:
```jsx
        detailsError={detailsError}
        onRetryDetails={refetchDetails}
```
(Add alongside the existing `detailsLoading={detailsLoading}` prop.)

- [ ] **Step 2: Render the error branch in `BottomBar.jsx`**

Locate the loading/empty guard (the lines that do `if (detailsLoading && !shipmentDetails) return <spinner>` / `if (!shipmentDetails) return null`). Accept the new props in the component signature (`detailsError`, `onRetryDetails`) and add an error branch BEFORE the loading guard:
```jsx
  if (detailsError) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 'var(--spacing-3)',
          padding: 'var(--spacing-6)', color: 'var(--text-secondary)',
        }}
      >
        <span>Couldn’t load shipment details.</span>
        <button type="button" className="btn-secondary" onClick={onRetryDetails}>
          Retry
        </button>
      </div>
    )
  }
```
(If `.btn-secondary` is not an existing class here, use the same button element/markup the codebase already uses for a secondary action in this file.)

- [ ] **Step 3: Verify the error + retry path**

Temporarily force an error: in `shipmentService.ts` mock branch, change the path to `/details/__nope__.json` to make the fetch 404. Run `npm run dev:odyssey-one`, select a shipment → the error state with a Retry button shows. Revert the path change. Re-select → renders normally.
Expected: error state appears on failure; Retry refetches; normal render after revert. Stop the server.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test -w odyssey-one-app`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx apps/odyssey-one/src/components/detail/BottomBar.jsx
git commit -m "feat(shipments): detail error state + retry"
```

---

### Task 9: Retire the hand-rolled detail loader

**Files:**
- Modify: `apps/odyssey-one/src/data/index.js:40-61` (remove `detailsCache`, `fetchShipmentDetails`, `getCachedShipmentDetails`)

- [ ] **Step 1: Confirm there are no remaining consumers**

Run: `grep -rn "fetchShipmentDetails\|getCachedShipmentDetails\|detailsCache" apps/odyssey-one/src`
Expected: ZERO matches (Task 7 removed the only consumer). If any remain, stop and migrate them to `useShipmentDetail` first.

- [ ] **Step 2: Remove the dead code** — delete the `detailsCache` Map and both exported functions (`fetchShipmentDetails`, `getCachedShipmentDetails`) from `apps/odyssey-one/src/data/index.js` (the block at lines ~40-61). Leave the rest of the file (list accessors, indexes, `SEARCH_ATTRIBUTES`) intact.

- [ ] **Step 3: Verify build + tests + app**

Run: `npm run test -w odyssey-one-app`
Expected: all PASS.
Run: `npm run build:odyssey-one`
Expected: build succeeds (no unresolved imports).

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/data/index.js
git commit -m "refactor(data): retire detailsCache + fetchShipmentDetails (TanStack Query owns detail caching)"
```

---

### Task 10: Document the env switch

**Files:**
- Create or modify: `apps/odyssey-one/.env.example`

- [ ] **Step 1: Add the API-layer env vars** — append to `apps/odyssey-one/.env.example` (create the file if absent):

```bash
# ── Shipments API layer ───────────────────────────────────────────────
# 'mock' = read local generated /details files (default, no access needed).
# 'live' = call the real shipment-service.
VITE_API_MODE=mock
# Live base URL or Vite-proxy path (e.g. /odyssey-api). Empty in mock mode.
VITE_API_BASE_URL=
# Temporary dev bearer token for live mode (replaced by MSAL/Entra later).
VITE_API_TOKEN=
```

- [ ] **Step 2: Commit**

```bash
git add apps/odyssey-one/.env.example
git commit -m "docs: document VITE_API_MODE/BASE_URL/TOKEN env switch"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full test suite green**

Run: `npm run test -w odyssey-one-app`
Expected: existing 9 + config (4) + client (3) + service (2) tests all PASS.

- [ ] **Step 2: Production build green**

Run: `npm run build:odyssey-one`
Expected: succeeds.

- [ ] **Step 3: Manual smoke**

Run: `npm run dev:odyssey-one`, open `/shipments`, select several shipments, switch detail tabs.
Expected: detail loads through the new pipe; reopening is instant (cache); all tabs render unchanged; no console errors.

- [ ] **Step 4: Confirm the live flip is one env change (no code change)**

Read `shipmentService.ts` + `client.ts`: setting `VITE_API_MODE=live` + `VITE_API_TOKEN` routes to `GET /shipment-service/v1/sell-shipment-out/{id}` with `Bearer` + `x-correlation-id`, with zero component edits. (Verified by `shipmentService.test.ts`. Actual live execution waits on env access + Plan 2's mapper to render the real shape.)

---

## What Plan 2 covers (not this plan)
- Typed `SellShipmentOut` DTO (`src/api/types/`).
- `tools/generate.mjs` regenerated to emit `/details/{id}.json` in the `SellShipmentOut` shape (seed 42, synthetic).
- `mapSellShipmentOutToDetail` mapper — tab-by-tab, TDD — converting the DTO to the view-model contract (9 sections, the order-scoped sub-shapes, the pre-formatted strings, RoutingGuideTab's cross-section reads). Wired into `useShipmentDetail` via `select`.
- The mapper is what makes live mode actually render.

# Search Projection Architecture + Round-2 Reseed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire progressive search to Neon via a search-projection table, land the Round-2 Orders fixes, and ship both in ONE user-gated reseed motion.

**Architecture:** A narrow `search_index` projection table (`domain, entity_id, attr, value`) with three purpose-built indexes serves a tiered exact→prefix→contains ranking CTE. The same ordered query feeds the preview (LIMIT 15) and the table, making preview≡table true by construction. A per-domain registry drives projection, normalization and labels so orders/carriers/tracking reuse it. Client swaps behind the existing adapter seam; mock mode survives as the case-discovery environment.

**Tech Stack:** Neon Postgres (pg_trgm), Vercel serverless functions (`api/_lib/*.mjs`), React 19 + TanStack Query, Vitest.

**Source docs:**
- Spec: `docs/superpowers/specs/2026-07-31-progressive-search-architecture-design.md`
- Behavior contract: `vault/20-cross-cutting/global-search/composed-criteria.md` (Cases 1–10) + `decisions/decision-log.md` (GS-01…GS-20)
- Ledger: `vault/10-domains/orders/db-update-ledger.md` Round 2

**User rulings that shape this plan (2026-08-01/02):**
- Full projection architecture now (not the direct-SQL bridge).
- ONE combined motion: all code + generator changes land, then a single reseed.
- Panel tabs are permanent (GS-19); multi-code lists UNION (GS-20).

---

## HALTED — removed from execution scope (user, 2026-08-02)

- **Task 11 (LINX-13893 Product Information columns) — HALTED.** User is asking
  before we implement. Research stands (equipment applicability matrix, 4 cases,
  documented in `research/jira-create-order-sections-2026-07-26.md` §3) plus the
  two unreconciled conflicts (STCC struck-from-base vs live-for-Rail; `TLF` in no
  matrix case). Do not implement until the user rules.
- **Task 12 (Appointment flag placement in View Order) — HALTED.** User needs to
  ask where it goes. **New evidence to ask with:** the Orders LLD carries
  `pickupAppointment` / `pickupAppointmentTimeZoneCode` / `deliveryAppointment` /
  `deliveryAppointmentTimeZoneCode` as **timestamps, not booleans**, and LLD line
  518 maps **Late Pickup = `pickupAppointment`**, Late Delivery =
  `deliveryAppointment`. That matches David Johns' *"that noon becomes the
  appointment"*: checking the box may PROMOTE the window's late bound into a
  committed appointment rather than set a separate flag. Shipments LLD also has a
  distinct `pickupAppointmentDate` (null in the sample). **Open: is Appointment a
  flag at all, or a state of the late-bound datetime?**
  The **Hazardous** half of Task 12 is NOT halted — it can proceed.

## Decisions to confirm before Task 9

- [ ] **D1 — What is the "Odyssey username"?** User: *"Created by & last edited by should be the user name (odyssey username) of the user and not the name (to prevent ambiguity due to multiple users with the same name)."* The `users` table has `id` (`planner-ava`, `u1`), `email` (`amy.cook@odyssey.com`), `name` (`Amy Cook`). **Recommendation: the email local-part** (`amy.cook`) — it is the only field that reads like a corporate username and is unique. **Conflict to flag:** `generate.mjs:1444` cites **LINX-11663** for "plain full names". User direction overrides, but the deviation must be logged in the decision log.
- [ ] **D2 — Appointment: flag vs late-bound datetime.** See HALTED above — the wire evidence suggests it may not be a boolean at all. Superseded by the user's pending question.
- [x] **D3 — Pickup # — RESOLVED (user, 2026-08-02).** *"We just need to make sure
  there's a column for pickup# in shipments and put it as part of the search
  criteria, part of the find the shipment."*
  **Provenance (user's Rovo research + our LLD reading agree):** `pickupNumber` is
  an **Order Header** field — a customer-provided pickup reference (from the
  customer ERP / SAP PGI-PGR flow) that sits beside `poNumber` / `orderNumber` /
  `orderReleaseId`. It is **copied** to the Load and the Order Line ("Pickup
  Number at the Order Line level is a copy of the Pickup Number at the Order
  Header level"), and resolved in LINX Open Questions as belonging at **Planned
  Bill level**. It is therefore **not a shipment-level unique identifier** — which
  is exactly why Jana could not find it in the shipments table.
  **Consequence for the schema:** one shipment consolidates multiple orders, each
  with its own pickup number → the shipment column is an **ARRAY**, same shape as
  `orders text[]`, derived from its orders. Not a scalar.

---

## File Structure

**Created:**
- `packages/db/migrations/003_search_index.sql` — projection table + indexes + pg_trgm
- `apps/odyssey-one/api/_lib/search-registry.mjs` — per-domain attribute registry (server twin of `progression.js`)
- `apps/odyssey-one/api/_lib/search.mjs` — tiered CTE builders + handlers
- `apps/odyssey-one/api/_lib/search.test.mjs` — query-builder unit tests
- `apps/odyssey-one/tools/project-search.mjs` — builds projection rows from the generated dataset
- `apps/odyssey-one/tools/project-search.test.mjs`
- `apps/odyssey-one/src/search/shipments/liveAdapter.js` — live implementation of the adapter contract

**Modified:**
- `apps/odyssey-one/api/_lib/router.mjs` — register 2 routes
- `apps/odyssey-one/api/_lib/shipments.mjs` — `buildListQuery`/`buildCountsQuery` honor criteria
- `apps/odyssey-one/tools/seed.mjs` — insert projection rows
- `apps/odyssey-one/tools/generate.mjs` — Round-2 data items
- `apps/odyssey-one/src/search/shipments/adapter.js` — mode dispatch
- `apps/odyssey-one/src/api/services/gridService.ts` — send criteria in live mode

---

## TRACK A — Search projection architecture

### Task 1: Migration — projection table + indexes

**Files:**
- Create: `packages/db/migrations/003_search_index.sql`
- Test: `packages/db/migrate.test.mjs` (existing — verify it picks up 003)

- [ ] **Step 1: Write the migration**

```sql
-- 003: search_index — the progressive-search projection (S104).
-- One row per (entity, attribute, searchable value). Replaces OR-across-14-columns
-- with one index probe, and makes "which attribute matched" a COLUMN — which is
-- what GS-15 row labelling reads. Multi-domain by construction: orders/carriers/
-- tracking are more rows here, and cross-domain search drops the domain predicate.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE search_index (
  domain     text NOT NULL,
  entity_id  text NOT NULL,   -- shipments: sell_shipment (the selection key)
  attr       text NOT NULL,   -- registry key: 'order' | 'pro' | 'scac' | ...
  value      text NOT NULL,   -- normalized (upper; per-attr rules)
  display    text NOT NULL,   -- original casing for the UI
  PRIMARY KEY (domain, attr, entity_id, value)
);

-- exact + prefix tiers. text_pattern_ops makes LIKE 'X%' index-served
-- regardless of collation; INCLUDE keeps the ranked lookup index-only.
CREATE INDEX si_prefix ON search_index (domain, value text_pattern_ops)
  INCLUDE (attr, entity_id);

-- contains tier. Only earns its write cost for substring match; trigram
-- indexes cannot serve patterns shorter than 3 chars (see search.mjs MIN_TRGM).
CREATE INDEX si_trgm ON search_index USING gin (value gin_trgm_ops);
```

- [ ] **Step 2: Run the migration runner test**

Run: `npm test -w packages/db`
Expected: PASS — `pendingMigrations` sorts `003_search_index.sql` after `002_*`.

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/003_search_index.sql
git commit -m "feat(db): search_index projection table + trgm/prefix indexes (S104)"
```

---

### Task 2: The search registry

**Files:**
- Create: `apps/odyssey-one/api/_lib/search-registry.mjs`
- Test: `apps/odyssey-one/tools/project-search.test.mjs` (Task 3 covers it)

- [ ] **Step 1: Write the registry**

Mirrors `src/search/shipments/progression.js` — `priority` MUST equal that file's flattened index so server and client tie-break identically (GS-15).

```js
// Per-domain search registry (S104). Drives: which fields are projected, how
// each is normalized, which tiers apply, and the label a matched row shows.
// Adding a domain = adding an entry here + a `project` function. Nothing else.

const upper = (v) => String(v).trim().toUpperCase()
// Identifiers users paste with punctuation the DB doesn't store (PRO-123456).
const upperStrip = (v) => upper(v).replace(/[\s\-_/.]/g, '')

export const SHIPMENTS_ATTRS = {
  'buy-shipment':  { label: 'Buy Shipment #',  col: 'buy_shipment',  normalize: upperStrip, trgm: true,  priority: 0 },
  'sell-shipment': { label: 'Sell Shipment #', col: 'sell_shipment', normalize: upperStrip, trgm: true,  priority: 1 },
  'order':         { label: 'Order #',         col: 'orders',        normalize: upperStrip, trgm: true,  priority: 2, array: true },
  'pro':           { label: 'Pro#/Booking #',  col: 'pro',           normalize: upperStrip, trgm: true,  priority: 4 },
  'customer-id':   { label: 'Customer ID',     col: 'customer_id',   normalize: upper,      trgm: true,  priority: 5 },
  'customer-name': { label: 'Customer Name',   col: 'customer_name', normalize: upper,      trgm: true,  priority: 6 },
  'consignor':     { label: 'Consignor',       col: 'consignor',     normalize: upper,      trgm: true,  priority: 7 },
  'consignee':     { label: 'Consignee',       col: 'consignee',     normalize: upper,      trgm: true,  priority: 8 },
  'origin':        { label: 'Origin',          col: 'origin',        normalize: upper,      trgm: true,  priority: 9 },
  'destination':   { label: 'Destination',     col: 'destination',   normalize: upper,      trgm: true,  priority: 10 },
  'equipment':     { label: 'Equipment #',     col: 'equipment',     normalize: upperStrip, trgm: true,  priority: 16 },
  'seal':          { label: 'Seal Number',     col: 'seal',          normalize: upperStrip, trgm: true,  priority: 17 },
  // 4-char code: prefix is always enough, so skip the trigram write cost.
  'scac':          { label: 'SCAC',            col: 'scac',          normalize: upper,      trgm: false, priority: 18 },
  'load':          { label: 'Load #',          col: 'load',          normalize: upperStrip, trgm: true,  priority: 22 },
}

export const REGISTRY = {
  shipments: { attrs: SHIPMENTS_ATTRS, entityKey: 'sellShipment' },
}

/** Registry key → attr priority, for the ORDER BY tiebreaker. */
export function attrPriority(domain, attr) {
  return REGISTRY[domain]?.attrs[attr]?.priority ?? 99
}

/** Projection rows for ONE source row. Skips null/empty; expands array fields. */
export function projectRow(domain, row, entityId) {
  const { attrs } = REGISTRY[domain]
  const out = []
  for (const [attr, cfg] of Object.entries(attrs)) {
    const raw = row[cfg.srcKey ?? cfg.col]
    if (raw == null) continue
    const values = cfg.array ? raw : [raw]
    for (const v of values) {
      const display = String(v).trim()
      if (!display) continue
      out.push({ domain, entity_id: entityId, attr, value: cfg.normalize(display), display })
    }
  }
  return out
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/odyssey-one/api/_lib/search-registry.mjs
git commit -m "feat(search): per-domain attribute registry (S104)"
```

---

### Task 3: Projection builder + tests

**Files:**
- Create: `apps/odyssey-one/tools/project-search.mjs`
- Test: `apps/odyssey-one/tools/project-search.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test, expect } from 'vitest'
import { buildProjection } from './project-search.mjs'

const ROW = {
  sellShipment: '25950714', buyShipment: '43708610', orders: ['0000000091000'],
  pro: '442376', customerId: 'WEYERH_01', customerName: 'Weyerhaeuser Company',
  consignor: 'WESTLAKE CHEMICAL PL', consignee: 'BAYOU CHEMICAL PLANT',
  origin: 'Lake Charles LA US 70601', destination: 'Baton Rouge LA US 70801',
  equipment: '4359', seal: 'S442272', scac: 'FXFE', load: '16587',
}

test('projects one row per searchable value, keyed by sellShipment', () => {
  const rows = buildProjection([ROW])
  expect(rows.every((r) => r.entity_id === '25950714')).toBe(true)
  expect(rows.every((r) => r.domain === 'shipments')).toBe(true)
  const byAttr = Object.fromEntries(rows.map((r) => [r.attr, r]))
  expect(byAttr['order'].value).toBe('0000000091000')
  expect(byAttr['pro'].display).toBe('442376')
  expect(byAttr['customer-name'].value).toBe('WEYERHAEUSER COMPANY') // normalized
  expect(byAttr['customer-name'].display).toBe('Weyerhaeuser Company') // original
})

test('array fields expand to one row per element', () => {
  const rows = buildProjection([{ ...ROW, orders: ['A1', 'A2'] }])
  expect(rows.filter((r) => r.attr === 'order').map((r) => r.value)).toEqual(['A1', 'A2'])
})

test('null and empty values are skipped, never projected as empty strings', () => {
  const rows = buildProjection([{ ...ROW, pro: null, seal: '  ' }])
  expect(rows.some((r) => r.attr === 'pro')).toBe(false)
  expect(rows.some((r) => r.attr === 'seal')).toBe(false)
})

test('separator-bearing identifiers normalize but keep their display form', () => {
  const rows = buildProjection([{ ...ROW, pro: 'PRO-442 376' }])
  const pro = rows.find((r) => r.attr === 'pro')
  expect(pro.value).toBe('PRO442376')     // searchable
  expect(pro.display).toBe('PRO-442 376') // shown
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run tools/project-search.test.mjs`
Expected: FAIL — "Failed to load ./project-search.mjs"

- [ ] **Step 3: Write the implementation**

```js
// Builds search_index rows from the generated shipment dataset (S104).
// Runs inside seed.mjs — the data is generator-owned, so the projection is
// rebuilt wholesale on every reseed rather than trigger-maintained.
import { projectRow } from '../api/_lib/search-registry.mjs'

// Registry cols are snake_case (DB truth); the generated dataset is camelCase.
const SRC_KEY = {
  buy_shipment: 'buyShipment', sell_shipment: 'sellShipment', orders: 'orders',
  pro: 'pro', customer_id: 'customerId', customer_name: 'customerName',
  consignor: 'consignor', consignee: 'consignee', origin: 'origin',
  destination: 'destination', equipment: 'equipment', seal: 'seal',
  scac: 'scac', load: 'load',
}

export function buildProjection(shipments) {
  const out = []
  for (const s of shipments) {
    const src = {}
    for (const [col, key] of Object.entries(SRC_KEY)) src[col] = s[key]
    out.push(...projectRow('shipments', src, s.sellShipment))
  }
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run tools/project-search.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/tools/project-search.mjs apps/odyssey-one/tools/project-search.test.mjs
git commit -m "feat(search): projection builder with normalization + display split"
```

---

### Task 4: Seed the projection

**Files:**
- Modify: `apps/odyssey-one/tools/seed.mjs:118` (after the stops/tenders/events inserts)

- [ ] **Step 1: Add the insert**

```js
  // search_index — the progressive-search projection (S104). Built from the same
  // in-memory dataset, so it can never drift from the rows it indexes.
  const projectionRows = buildProjection(ds.shipments)
  await insertRows(client, 'search_index', ['domain', 'entity_id', 'attr', 'value', 'display'],
    projectionRows.map((r) => [r.domain, r.entity_id, r.attr, r.value, r.display]))
```

Add the import at the top of `seed.mjs`:

```js
import { buildProjection } from './project-search.mjs'
```

- [ ] **Step 2: Add the count to the verification output**

In the `counts` object logged at `seed.mjs:137`, add:

```js
    search_index: (await client.query('SELECT count(*)::int AS n FROM search_index')).rows[0].n,
```

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/tools/seed.mjs
git commit -m "feat(seed): populate search_index projection during reseed"
```

---

### Task 5: The tiered ranking query

**Files:**
- Create: `apps/odyssey-one/api/_lib/search.mjs`
- Test: `apps/odyssey-one/api/_lib/search.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test, expect } from 'vitest'
import { buildSearchQuery, MIN_TRGM } from './search.mjs'

test('exact + prefix tiers only for a short needle (trgm cannot serve <3 chars)', () => {
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['AB'], limit: 15 })
  expect(text).toContain('value = ')
  expect(text).toContain("|| '%'")
  expect(text).not.toContain("'%' ||")  // no contains branch
})

test('all three tiers for a needle at or above the trigram floor', () => {
  expect(MIN_TRGM).toBe(3)
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['ABC'], limit: 15 })
  expect(text).toContain("'%' ||")
})

test('multi-code needles UNION (GS-20), deduped to each entity best tier', () => {
  const { text, values } = buildSearchQuery({ domain: 'shipments', needles: ['A1', 'B2'], limit: 15 })
  expect(values).toContain('A1')
  expect(values).toContain('B2')
  expect(text).toContain('DISTINCT ON (entity_id)')
  expect(text).not.toContain('INTERSECT')  // union, never intersect
})

test('order is TOTAL so LIMIT 15 is provably rows 1-15 of the table (GS-16)', () => {
  const { text } = buildSearchQuery({ domain: 'shipments', needles: ['A1'], limit: 15 })
  expect(text).toMatch(/ORDER BY\s+tier,\s*priority,\s*display,\s*entity_id/)
})

test('customer scope is applied as a subquery, never string-interpolated', () => {
  const { text, values } = buildSearchQuery({
    domain: 'shipments', needles: ['A1'], limit: 15, customerIds: ['VALTRIS_01'],
  })
  expect(text).toContain('customer_id = ANY(')
  expect(values).toContainEqual(['VALTRIS_01'])
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run api/_lib/search.test.mjs`
Expected: FAIL — "Failed to load ./search.mjs"

- [ ] **Step 3: Write the implementation**

```js
// Progressive-search query builders (S104). One ordered query serves BOTH the
// preview (LIMIT 15) and the table, so preview≡table holds by construction
// rather than by two implementations agreeing (GS-16 / Case 6).
import { REGISTRY } from './search-registry.mjs'

/** Trigram indexes cannot extract trigrams below 3 chars — the contains tier
 *  is skipped under this length. This is an architecture rule, not just UX. */
export const MIN_TRGM = 3

/** CASE arm mapping registry keys to their priority — the GS-15 tiebreaker. */
function priorityCase(domain) {
  const attrs = REGISTRY[domain].attrs
  const arms = Object.entries(attrs)
    .map(([k, cfg]) => `WHEN ${quote(k)} THEN ${cfg.priority}`)
    .join(' ')
  return `CASE attr ${arms} ELSE 99 END`
}
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`

/**
 * Ranked hits for N needles. Tiers: 0 exact · 1 prefix · 2 contains, each on its
 * own index. Needles UNION (GS-20) and each entity keeps its BEST tier, so a row
 * matching two codes appears once at its best rank.
 */
export function buildSearchQuery({ domain, needles, limit = 15, customerIds }) {
  const values = []
  const p = (v) => { values.push(v); return `$${values.length}` }
  const dom = p(domain)

  const scope = customerIds
    ? `AND entity_id IN (SELECT sell_shipment FROM shipments WHERE customer_id = ANY(${p(customerIds)}))`
    : ''

  const branches = []
  for (const n of needles) {
    const needle = p(n.toUpperCase())
    branches.push(
      `SELECT entity_id, attr, display, 0 AS tier FROM search_index
        WHERE domain = ${dom} AND value = ${needle} ${scope}`,
      `SELECT entity_id, attr, display, 1 FROM search_index
        WHERE domain = ${dom} AND value LIKE ${needle} || '%' AND value <> ${needle} ${scope}`,
    )
    if (n.length >= MIN_TRGM) {
      branches.push(
        `SELECT entity_id, attr, display, 2 FROM search_index
          WHERE domain = ${dom} AND value LIKE '%' || ${needle} || '%'
            AND value NOT LIKE ${needle} || '%' ${scope}`,
      )
    }
  }

  return {
    text: `WITH hits AS (${branches.join(' UNION ALL ')}),
ranked AS (
  SELECT DISTINCT ON (entity_id) entity_id, attr, display, tier,
         ${priorityCase(domain)} AS priority
  FROM hits ORDER BY entity_id, tier
)
SELECT entity_id, attr, display, tier, priority, count(*) OVER()::int AS __total
FROM ranked
ORDER BY tier, priority, display, entity_id
LIMIT ${p(limit)}`,
    values,
  }
}

/**
 * Suggestion panel: the same hits, grouped by attribute. Under multi-code an
 * attribute is offered ONLY if it matches EVERY code (GS-20 gating rule) —
 * hence the HAVING against the needle count.
 */
export function buildSuggestQuery({ domain, needles, customerIds }) {
  const inner = buildSearchQuery({ domain, needles, limit: 500, customerIds })
  return {
    text: `WITH hits AS (SELECT * FROM (${inner.text}) h)
SELECT attr, min(tier) AS best_tier, count(*)::int AS n,
       (array_agg(display ORDER BY tier))[1:3] AS samples
FROM hits GROUP BY attr
ORDER BY min(tier), n DESC`,
    values: inner.values,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run api/_lib/search.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/api/_lib/search.mjs apps/odyssey-one/api/_lib/search.test.mjs
git commit -m "feat(api): tiered search query builders (exact/prefix/contains, union needles)"
```

---

### Task 6: Search endpoints

**Files:**
- Modify: `apps/odyssey-one/api/_lib/search.mjs` (append handlers)
- Modify: `apps/odyssey-one/api/_lib/router.mjs:9` (register routes)

- [ ] **Step 1: Append the handlers to `search.mjs`**

```js
/** Phrase-first, code-list fallback (GS-20). Decided ONCE per query against the
 *  full index — tokenizing a phrase like "WEYERHAEUSER COMPANY" would union in
 *  every row containing "COMPANY". */
export async function resolveNeedles(db, domain, text, customerIds) {
  const q = String(text || '').trim()
  if (!q) return []
  const tokens = q.split(/[\s,]+/).filter(Boolean)
  if (tokens.length < 2) return [q]
  const probe = buildSearchQuery({ domain, needles: [q], limit: 1, customerIds })
  const { rows } = await db.query(probe)
  return rows.length ? [q] : tokens
}

// POST /api/v1/search — QUERY-shaped (safe, idempotent, deterministic).
// RFC 10008 QUERY is the target verb; Vercel returns 400 for it today, so the
// method is POST and everything else already matches (spec §5).
export async function searchHandler({ body, db }) {
  const { domain = 'shipments', criteria = {}, scope = {}, page = {} } = body ?? {}
  const needles = await resolveNeedles(db, domain, criteria.text, scope.customerIds)
  if (!needles.length) return { results: [], total: 0 }
  const { rows } = await db.query(
    buildSearchQuery({ domain, needles, limit: page.limit ?? 15, customerIds: scope.customerIds }),
  )
  return {
    total: rows[0]?.__total ?? 0,
    results: rows.map(({ __total, ...r }) => r),
  }
}

export async function suggestHandler({ body, db }) {
  const { domain = 'shipments', criteria = {}, scope = {} } = body ?? {}
  const needles = await resolveNeedles(db, domain, criteria.text, scope.customerIds)
  if (!needles.length) return { sections: [] }
  const { rows } = await db.query(buildSuggestQuery({ domain, needles, customerIds: scope.customerIds }))
  // Multi-code gating (GS-20): keep only attributes matching EVERY code.
  const keep = needles.length < 2 ? rows : rows.filter((r) => r.n >= needles.length)
  return { attributes: keep }
}
```

- [ ] **Step 2: Register the routes in `router.mjs`**

Add to the route table alongside the existing entries:

```js
  { name: 'search',        method: 'POST', path: '/api/v1/search',         handler: searchHandler },
  { name: 'searchSuggest', method: 'POST', path: '/api/v1/search/suggest', handler: suggestHandler },
```

With the import:

```js
import { searchHandler, suggestHandler } from './search.mjs'
```

- [ ] **Step 3: Run the router tests**

Run: `cd apps/odyssey-one && npx vitest run api/_lib/router.test.mjs`
Expected: PASS — routes resolve; no regression in existing route matching.

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/api/_lib/search.mjs apps/odyssey-one/api/_lib/router.mjs
git commit -m "feat(api): POST /api/v1/search + /suggest (QUERY-shaped, RFC 10008 target)"
```

---

### Task 7: List + counts honor criteria

**Files:**
- Modify: `apps/odyssey-one/api/_lib/shipments.mjs` — `buildListQuery`, `buildCountsQuery`
- Test: `apps/odyssey-one/api/_lib/shipments.test.mjs`

**This is the gap that produced the user's "keeps showing me all results" report:** `buildListQuery` never read `filter.searchCriteria`, `buildCountsQuery` had no criteria parameter, and `SORT_MAP` had no relevance entry.

- [ ] **Step 1: Write the failing tests**

```js
import { test, expect } from 'vitest'
import { buildListQuery, buildCountsQuery } from './shipments.mjs'

test('searchCriteria reaches the SQL (it was silently dropped before)', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
  })
  expect(text).toContain('search_index')
})

test('relevance sort orders by the ranked CTE, not by a column', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
    sortBy: 'relevance',
  })
  expect(text).toMatch(/ORDER BY\s+r\.tier/)
})

test('an explicit column sort still wins over relevance', () => {
  const { text } = buildListQuery({
    filter: { panel: 'monitoring', searchCriteria: { chips: [], text: '442376' } },
    sortBy: 'customerName', orderBy: 'asc',
  })
  expect(text).toContain('customer_name ASC')
})

test('counts accept criteria so tab badges narrow with the search', () => {
  const { text } = buildCountsQuery({
    panel: 'monitoring', searchCriteria: { chips: [], text: '442376' },
  })
  expect(text).toContain('search_index')
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/odyssey-one && npx vitest run api/_lib/shipments.test.mjs`
Expected: FAIL — 4 failures, `text` contains no `search_index`.

- [ ] **Step 3: Implement — join the ranked CTE**

In `buildListQuery`, after the existing `scope(...)` call, add:

```js
  // Committed search criteria (S104). Rows are restricted to the ranked hit set
  // and — unless a column sort is driving — ordered by it, so "Show all results"
  // lands on exactly the list the preview showed (GS-16).
  let relevanceJoin = ''
  const sc = filter.searchCriteria
  if (sc && (sc.text || '').trim()) {
    values.push(sc.text.trim().toUpperCase())
    const n = `$${values.length}`
    relevanceJoin = `JOIN (
      SELECT DISTINCT ON (entity_id) entity_id, tier FROM (
        SELECT entity_id, 0 AS tier FROM search_index WHERE domain='shipments' AND value = ${n}
        UNION ALL
        SELECT entity_id, 1 FROM search_index WHERE domain='shipments' AND value LIKE ${n} || '%'
        UNION ALL
        SELECT entity_id, 2 FROM search_index WHERE domain='shipments' AND value LIKE '%' || ${n} || '%'
      ) h ORDER BY entity_id, tier
    ) r ON r.entity_id = shipments.sell_shipment`
  }
```

Then use `relevanceJoin` in the FROM clause and, when `sortBy === 'relevance'`, order by `r.tier, shipments.sell_shipment`.

Apply the same join to `buildCountsQuery` when `searchCriteria` is present.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run api/_lib/shipments.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/api/_lib/shipments.mjs apps/odyssey-one/api/_lib/shipments.test.mjs
git commit -m "fix(api): list + counts honor searchCriteria and relevance sort (S104)"
```

---

### Task 8: Client live adapter behind the seam

**Files:**
- Create: `apps/odyssey-one/src/search/shipments/liveAdapter.js`
- Modify: `apps/odyssey-one/src/search/shipments/adapter.js` (mode dispatch only)
- Modify: `apps/odyssey-one/src/api/services/gridService.ts` (send criteria in live mode)

- [ ] **Step 1: Write the live adapter**

It implements the SAME contract (`getInitial`, `getSuggestions`, `searchShipments`) and returns the SAME row shape — including `data-panel` and `data-attr`, which GS-18's landing rule reads.

```js
import { apiPost } from '../../api/client'
import { SHIPMENTS_ATTRIBUTES } from './progression'

const LABEL = Object.fromEntries(SHIPMENTS_ATTRIBUTES.map((a) => [a.key, a.label]))
const label = (attr, display) => {
  const l = LABEL[attr] ?? attr
  return l.endsWith('#') ? `${l}${display}` : `${l} ${display}`
}

export function makeLiveAdapter(base, customerIds) {
  return {
    ...base,
    async searchShipments(chips, query = '', ids = customerIds) {
      const q = (query || '').trim()
      if (!chips?.length && !q) return { results: [], total: 0 }
      const { results, total } = await apiPost('/api/v1/search', {
        domain: 'shipments',
        criteria: { chips: chips ?? [], text: q },
        scope: ids ? { customerIds: ids } : {},
        page: { limit: 15 },
      })
      return {
        total,
        results: results.map((r) => ({
          id: r.entity_id,
          'data-shipment-key': r.entity_id,
          'data-panel': r.panel,
          'data-attr': r.attr,
          matchId: label(r.attr, r.display),
        })),
      }
    },
  }
}
```

- [ ] **Step 2: Dispatch on API mode in `adapter.js`**

```js
import { getApiMode } from '../../api/config'
// Mock stays the CASE-DISCOVERY environment (user ruling, S104) and the
// behavioural reference the live path is tested against — it is not dead code.
export const shipmentsSearchAdapter =
  getApiMode() === 'live' ? makeLiveAdapter(mockAdapter) : mockAdapter
```

- [ ] **Step 3: Send criteria from gridService's live branch**

`gridService.ts` already puts `searchCriteria` in the live POST body; verify it survives (it does — line ~100) and that `sortBy: RELEVANCE_SORT` is passed through unchanged.

- [ ] **Step 4: Run the full suite**

Run: `cd apps/odyssey-one && npx vitest run && npx tsc -p tsconfig.json --noEmit`
Expected: 631+ tests PASS, tsc clean. Mock-mode behavior unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/search/shipments/liveAdapter.js apps/odyssey-one/src/search/shipments/adapter.js
git commit -m "feat(search): live adapter behind the domain seam; mock stays the reference"
```

---

## TRACK B — Round-2 generator items (reseed-bearing)

### Task 9: Created/Last-Edit timezone + username identity (R2-3, R2-4)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:1444` (ORDER_USERS), `:1531-1535`
- Modify: `packages/db/migrations/004_orders_last_edited_by.sql` (create)
- Modify: `apps/odyssey-one/tools/seed.mjs:86` (orders insert)

**BLOCKED ON D1** — confirm the username form before writing this task.

- [ ] **Step 1: Write the migration**

```sql
-- 004: Orders — last_edited_by (S104 R2-4). created_by/last_edited_by store the
-- Odyssey USERNAME, not the display name: multiple users share a display name,
-- which makes the name ambiguous as an identity (user ruling 2026-08-01).
-- Deviates from LINX-11663 ("plain full names") — logged in the orders decision log.
ALTER TABLE orders ADD COLUMN last_edited_by text;
```

- [ ] **Step 2: Replace the ORDER_USERS pool with usernames**

```js
// "Created By" / "Last Edited By" pool — Odyssey USERNAMES (S104, user ruling).
// Display names are ambiguous when two users share one; the username is unique.
// Derived from the seeded users' email local-part.
const ORDER_USERS = ['amy.cook', 'luis.herrera', 'priya.nair', 'tom.becker',
  'sofia.almeida', 'dan.whitfield', 'grace.liu', 'marcus.bell'];
```

- [ ] **Step 3: Add lastEditedBy + zoned timestamps**

At `generate.mjs:1531`, `createdAt`/`lastEditAt` must carry a zone derived the S103 way (`CITY_TIMEZONES` + `tzAbbrev(zone, date)`), NOT a hardcoded suffix — the hardcoded suffix was the exact S102/S103 bug that would have NULLed 2,823 timestamps.

```js
    createdBy: pick(ORDER_USERS),
    lastEditedBy: row.lastEditAt ? pick(ORDER_USERS) : null,
```

- [ ] **Step 4: Add the column to the seed insert**

Add `'last_edited_by'` to the orders column list and `o.lastEditedBy ?? null` to the value tuple.

- [ ] **Step 5: Regenerate + verify**

Run: `cd apps/odyssey-one && node tools/generate.mjs && npx vitest run`
Expected: dataset regenerates; suite PASSES (resolve.test.jsx derives its fixture, so no re-pin).

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/seed.mjs packages/db/migrations/004_orders_last_edited_by.sql
git commit -m "feat(orders): last_edited_by + username identity + zoned created/edit timestamps (R2-3, R2-4)"
```

---

### Task 10: Tracking Link + Pickup # (R2-1, R2-2)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs` (detail blob)
- Modify: `apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx:147`

- [ ] **Step 1: Seed a tracking URL on the detail blob**

The shape is ours to invent — flag it as invented in the decision log. Per the annotated spec the link hangs off the Pro/Booking # value.

```js
    trackingUrl: `https://tracking.oneodyssey.com/t/${pro}`,
```

- [ ] **Step 2: Read it in the modal (replacing the hardcoded null)**

```js
                  { label: 'Tracking Link', value: shipmentDetails.trackingUrl },
```

- [ ] **Step 3: Pickup # — shipment column + search criterion (D3 RESOLVED)**

Migration `005_shipments_pickup_numbers.sql`:

```sql
-- 005: shipments.pickup_numbers (S104 R2-2). Pickup # is an ORDER-header
-- customer reference copied to the load; a shipment consolidating N orders
-- therefore carries N of them — an ARRAY, exactly like shipments.orders.
ALTER TABLE shipments ADD COLUMN pickup_numbers text[] NOT NULL DEFAULT '{}';
```

Generator: **stop `pickupNumber` must stop being a coin flip.** `generate.mjs:566`
currently reads `faker.datatype.boolean() ? \`PU-…\` : null`, so half of all pickup
stops render `--` in the Stops tab even though the field is fully plumbed
(`StopsTab.jsx:57` → `mapSellShipmentOutToDetail.ts:157`). Generate one per ORDER,
carry it to the stop, and roll the shipment's array up from its orders.

Search: add to `progression.js` in the **Shipment Identifiers / "Find the
shipment"** group (user directive), and to the server registry:

```js
      { key: 'pickup-number', label: 'Pickup #', dataKey: 'pickupNumbers', match: 'both' },
```

```js
  'pickup-number': { label: 'Pickup #', col: 'pickup_numbers', normalize: upperStrip, trgm: true, priority: 5, array: true },
```

Add `'pickupNumbers'` to `FREE_TEXT_KEYS` so a pasted pickup number resolves and
labels itself `Pickup #PU-123456` (GS-15). **NOTE:** every priority in the registry
after this insertion shifts by 1 — keep it equal to the flattened `progression.js`
index or server and client tie-break differently.

**Column arrangement (user, 2026-08-02): a shipments column must also be
arrangeable.** Three places, all required — a column added to the table but not to
`ALL_COLUMNS` renders yet cannot be hidden/reordered, which reads as a broken panel:

1. `ShipmentTable.jsx` `COLUMN_CONFIG` (line 60) — the render definition. Array
   value: join with `, ` like `orders`, since a shipment carries N pickup numbers.
2. `ColumnPanel.jsx` `ALL_COLUMNS` (line 12) — makes it appear in the arrangement
   panel. Insert **after `proBookingNumber`** so the panel order mirrors the
   "Find the shipment" progression group.

```js
  { key: 'pickupNumbers', label: 'Pickup #' },
```

3. Decide default visibility: `EXCEPTIONS_DEFAULT_COLUMNS` /
   `MONITORING_DEFAULT_COLUMNS`. **Recommend NOT default-visible** — it is a
   lookup reference, and the S101 preset work means users who want it can save it
   into a preset. Confirm with the user at execution time.

- [ ] **Step 4: Run the modal tests**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail`
Expected: PASS; add an assertion that Tracking Link renders a URL, not `--`.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(shipments): seed tracking URL; orders Pickup # reference (R2-1, R2-2)"
```

---

### Task 10b: Stops-tab appointment time — the hardcoded `CST` (R2-1 corrected)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:559` (pickup), `:602` (delivery)

**This is the hardcode the user remembered — NOT the Tracking Link.** S103
converted stop `scheduledDateTime` to derive its abbreviation per stop city and
per instant (`tzAbbrev(deriveTimezone(city), t)`), fixing "CST in July".
**`appointmentTime` on the very next line was missed** and still emits a literal
` CST`. A Denver stop therefore shows `MDT` for its scheduled time and `CST` for
its appointment **in the same 3×3 field grid** — the inconsistency with shipment
details the user reported.

Second, quieter defect on the same lines: `appointmentTime` is built from
`baseDate` / `deliveryDate`, not from the stop's own sequenced instant, so
**every stop on a multi-stop shipment shows the same appointment hour** — the
identical bug S103 fixed for scheduled times.

- [ ] **Step 1: Write the failing test** in `tools/generate.test.mjs`

```js
test('stop appointmentTime uses the stop own zone and instant, never a literal CST', () => {
  const ds = generate()
  const western = ds.details.values().find((d) =>
    (d.shipmentStopList ?? []).some((s) => /Denver|Phoenix|Seattle|Portland/.test(s.city)))
  const stop = western.shipmentStopList.find((s) => /Denver|Phoenix|Seattle|Portland/.test(s.city))
  // The appointment abbreviation must match the scheduled abbreviation for the SAME stop.
  const schedAbbrev = stop.scheduledDateTime.trim().split(' ').pop()
  expect(stop.appointmentTime.trim().split(' ').pop()).toBe(schedAbbrev)
})

test('each stop of a multi-stop shipment gets its OWN appointment hour', () => {
  const ds = generate()
  const multi = [...ds.details.values()].find((d) => (d.shipmentStopList ?? []).length > 2)
  const hours = multi.shipmentStopList.map((s) => s.appointmentTime.slice(0, 2))
  expect(new Set(hours).size).toBeGreaterThan(1)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run tools/generate.test.mjs`
Expected: FAIL — appointment abbreviation is `CST` while scheduled is `MDT`.

- [ ] **Step 3: Fix both call sites** — derive from the stop's own instant `t`
      and its own zone, exactly like `scheduledDateTime` one line above:

```js
      appointmentTime: (() => {
        const t = new Date(baseDate);
        t.setHours(baseDate.getHours() + s * 3);
        return `${String(t.getHours()).padStart(2, '0')}:00 ${tzAbbrev(deriveTimezone(stopLoc.city) || 'America/Chicago', t)}`;
      })(),
```

(and the delivery mirror at `:602`, using the delivery instant + `dLoc.city`).

- [ ] **Step 4: Run to verify PASS. Step 5: Commit.**

```bash
git commit -am "fix(seed): stop appointmentTime derives its own zone + instant (was literal CST)"
```

---

## TRACK C — Round-2 code-only items (no reseed)

### Task 11: Product Information columns per LINX-13893 (R2-8) — ⛔ HALTED

**Files:**
- Modify: the Product Information section component under `apps/odyssey-one/src/components/orders/create/sections/`

The columns are **equipment-dependent**, not fixed. Implement the matrix as data:

```js
// LINX-13893 equipment applicability matrix ("Lauren's feedback"). The Product
// Information grid renders DIFFERENT columns per equipment family.
const BASE = ['lineNumber', 'hazardous', 'productId', 'productDescription', 'grossWeight', 'volume']
export const PRODUCT_COLUMNS_BY_EQUIPMENT = {
  LTL: [...BASE, 'productClass', 'handlingUnitName', 'handlingUnitDescription', 'handlingUnitCount', 'length', 'width', 'height'],
  LTR: 'LTL', LTH: 'LTL',
  TL:  [...BASE, 'handlingUnitName', 'handlingUnitDescription', 'handlingUnitCount', 'length', 'width', 'height'], // Case 2 = Case 1 minus Product Class
  TLR: 'TL', TLH: 'TL', TT: 'TL',
  LCL: [...BASE, 'productClass', 'harmonizedCode', 'declaredValue', 'declaredValueCurrency', 'manufacturingCountryCode'],
  FCL: 'LCL',
  RR:  [...BASE, 'productClass', 'stccCode'],
}
```

- [ ] **Step 1: Write a failing test** asserting `TL` omits `productClass` while `LTL` includes it, and `RR` includes `stccCode`.
- [ ] **Step 2: Run it — expect FAIL.**
- [ ] **Step 3: Implement the matrix + column gating.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit.**

**Flag to Ramesh (do not silently resolve):** STCC is struck from the base grid (LINX-8121/8131) but live for Rail (13893 Case 4); `TLF` appears in **no** matrix case.

---

### Task 12: Appointment (⛔ HALTED) + Hazardous visibility (R2-7 proceeds)

**Files:**
- Modify: order Edit + View components under `apps/odyssey-one/src/components/orders/`

**Semantics (vault-sourced — David Johns, `0409-jana-david.vtt` 15:12–15:49):** a pickup/delivery date normally expresses an early/late **window** (*"a pickup between noon and 8:00 PM"*); checking Appointment **collapses it to a firm slot** (*"then that noon becomes the appointment"*) and must be **transmitted to the carrier**.

- [ ] **Step 1** — Add the Appointment checkbox to the Edit flow beside pickup/delivery dates (editable in Orders per D2; DEC-36 keeps it display-only in Shipments).
- [ ] **Step 2** — Surface Appointment **and** Hazardous in View Order. Hazardous is derived per LINX-8121: the line checkbox auto-checks on UN Number, and *"if at least 1 product in the order is hazardous, the entire order is considered as hazardous"* — so render both the order-level derived flag and the per-line flag.
- [ ] **Step 3** — Tests for both, then commit.

---

### Task 13: Order creation persists + confirmation (R2-5)

**Files:**
- Modify: `apps/odyssey-one/api/_lib/orders.mjs` (add POST create)
- Modify: order create submit path + confirmation page

Per LINX-9002: order number provided → *"Your order was created successfully."*; not provided → blank field + *"Your order has been submitted successfully. An order number is being assigned and will be available shortly"*, flipping when the number arrives.

- [ ] **Step 1** — Failing test: creating an order inserts a row and returns the created order.
- [ ] **Step 2** — Run, expect FAIL.
- [ ] **Step 3** — Implement `POST /order-service/v3/order` mirroring S102's update-then-insert projection; identity columns written once.
- [ ] **Step 4** — Wire the confirmation page's dual message states.
- [ ] **Step 5** — Run, expect PASS. Commit.

---

## TRACK D — The combined motion (USER-GATED)

### Task 14: Neon branch, reseed, verify

- [ ] **Step 1: Create a Neon dev branch** (user-gated — Neon object creation). Point `DATABASE_URL` at it.
- [ ] **Step 2: Migrate + reseed the branch**

```bash
node --env-file=apps/odyssey-one/.env.local packages/db/migrate.mjs
node --env-file=apps/odyssey-one/.env.local apps/odyssey-one/tools/seed.mjs
```

Expected: ~19–20 min (S103 baseline); counts logged include `search_index`.

- [ ] **Step 3: Live probes** — all must pass before promotion:

```sql
SELECT count(*) FROM search_index;                                    -- > 0
SELECT count(*) FROM search_index WHERE value = '';                   -- 0
SELECT count(DISTINCT attr) FROM search_index;                        -- 14
SELECT count(*) FROM orders WHERE last_edited_by IS NOT NULL;         -- > 0
SELECT count(*) FROM orders WHERE created_by LIKE '% %';              -- 0 (usernames, no spaces)
```

- [ ] **Step 4: Browser-verify search in live mode** (puppeteer, `--no-save`): paste a Pro number → labeled row + correct landing tab; "Show all results" → table order matches the preview; panel tabs all present.
- [ ] **Step 5: Promote** — reseed prod ONLY with explicit user permission for that specific reseed, then deploy.

---

## Self-Review

**Spec coverage:** §3 projection → Tasks 1–4 · §4 tiered ranking → Task 5 · §4a multi-code union → Task 5 (needle UNION) + Task 6 (`resolveNeedles` phrase-first, gating) · §5 endpoints → Task 6 · §6 replica → **deferred, see gap below** · §6a preview-as-index-probe → Task 5 (narrow columns, LIMIT) · §7 registry → Task 2 · §8 escalation → documentation only, no task needed · Ledger 2A → Tasks 9–10 · 2B → Tasks 11–13.

**Known gap accepted:** spec §6's Neon **read replica** (`SEARCH_DATABASE_URL`) is NOT in this plan — it is a Neon console action plus one env var, and it is only meaningful once the search endpoints are live. Add as a follow-up task after Task 14 rather than blocking the motion.

**Type consistency:** `buildProjection` → `{domain, entity_id, attr, value, display}` used identically in Tasks 3/4. `buildSearchQuery({domain, needles, limit, customerIds})` signature identical in Tasks 5/6. `attrPriority` defined in Task 2, consumed via `priorityCase` in Task 5. Registry keys (`'buy-shipment'`, `'order'`, `'pro'`…) match `progression.js` attribute keys exactly, which is what lets `liveAdapter`'s `LABEL` lookup work in Task 8.

**Blocked/halted tasks (2026-08-02):** Task 9 on **D1** (username form) · Task 10
Step 3 on **D3** (Pickup # representation) · Task 11 **HALTED** (LINX-13893) ·
Task 12 Appointment half **HALTED**; Hazardous half proceeds.

**Executable today without any answer:** Tasks 1–8 (the entire search
architecture — Track A), Task 10 Steps 1–2 (Tracking Link, the one verified
reseed-owing hardcode), Task 13 (order creation), and the Hazardous half of
Task 12.

**Hardcode audit (2026-08-02), CORRECTED:** the user's memory was right and mine was
incomplete — the hardcode that mattered was in the **Stops tab data**, not the modal:
`generate.mjs:559`/`:602` emit a literal ` CST` for `appointmentTime` (Task 10b).
Tracking Link (`ShipmentDetailsModal.jsx:147`) is a SECOND, separate one.
A component-level sweep could never have found the stops one — it lives in the
generator, and the component renders it faithfully. **Lesson: audit the DATA path,
not just the render path.** `RoutingGuideTab.jsx:1171-1195`'s `'--'`
values are correct empty-defaults for a newly-added quote; `ShipmentDetailsModal.jsx:136`'s QCP `TODO` is
unwired UI with no data behind it; the modal spec's UDF item was resolved by the S103 reseed
(10,000/10,000 rows carry UDF data).

**Naming note:** hazmat ≡ hazardous. Shipments uses `hazmat`/`hazmatClass`/`hazmatGroup`
(`ProductTab.jsx` — column key `hazmat`, label "Hazardous"); Orders uses the boolean
`hazardous` (`schema.ts:55`). Distinct from equipment code `LTH` = "LTL Hazmat".

# Real Database Slice 1–2 (Neon + API: counts & grids) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed 10k+ fully-relational shipments/orders into Neon Postgres and serve the counts + grid data paths from Vercel Functions mimicking the OdysseyONE contract, so Home widgets, Shipments list, and Orders list run live behind the existing `VITE_API_MODE` flag.

**Architecture:** Same Vercel project. A single catch-all function `apps/odyssey-one/api/[...path].js` routes contract-shaped paths to handlers in `api/_lib/` (underscore dirs are not routed), querying Neon via `pg`. The generator becomes an importable `buildDataset()`; `tools/seed.mjs` scales it to 10k and bulk-inserts. Spec: `docs/superpowers/specs/2026-07-23-real-database-design.md`.

**Tech Stack:** Neon Postgres (Vercel Marketplace), `pg` (node-postgres), Vercel Functions (plain Node, ESM), `node:test` for new unit tests (matches `tools/` convention), existing vitest suite untouched.

**Contract sources (verified 2026-07-23):**
- `GET /shipment-service/v1/shipment/error/category/count?panel=` → `{ errorOverview: [{ category, count }] }` (`gridService.ts:36`)
- `POST /shipment-service/pgi-pgr/v1/error/list` (0-based `pageNumber`) → `{ pageNumber, pageSize, totalCount, rows: ShipmentErrorRow[] }` (`gridService.ts:73`)
- `POST /order-service/v3/order/list` (1-based `pageNumber`) → `{ success, orders, pagination, error }` (`orderService.ts:80`)
- Order tab counts: mock-only today (`orderService.ts:63`) — we define `GET /order-service/v3/order/tab-counts` (contract extension, flagged).

**Known deviations (deliberate, documented):**
1. Live category-counts gains a `customerIds` query param (real LLD lacks it; Home scoping needs it — extension of OUR fake backend, seam comment updated).
2. Live counts ignore `searchCriteria` until the search slice (mock keeps applying them; Home passes only customer scope, so widgets stay correct).
3. Shipments keeps the full `SellShipmentOut` as ONE `detail` JSONB column (slice-3 detail endpoint = one SELECT) instead of the spec's 5 split JSONB columns; stops/tenders/events still get real tables. Spec allows refinement against generator reality.

---

### Task 0: Provision Neon + env plumbing (user-assisted)

**Files:**
- Modify: `apps/odyssey-one/package.json` (add `pg`)
- Create: `.env.local` at `apps/odyssey-one/` (via `vercel env pull`, gitignored)

- [ ] **Step 1: USER ACTION — provision Neon.** In the Vercel dashboard for project `odyssey-one-stage`: Storage → Create Database → Neon (free plan). Accept default env-var injection (`DATABASE_URL`). This is a dashboard step; pause and ask the user to do it.

- [ ] **Step 2: Pull env locally**

Run from repo root:
```bash
npx vercel env pull apps/odyssey-one/.env.local
grep -c "DATABASE_URL" apps/odyssey-one/.env.local
```
Expected: `1` (or more; `POSTGRES_URL` aliases may also appear). `.env.local` is already gitignored — verify with `git check-ignore apps/odyssey-one/.env.local`.

- [ ] **Step 3: Add `pg` dependency**

```bash
cd apps/odyssey-one && npm install pg@^8
```
Expected: `pg` in `dependencies`. (One dep serves seeder, migrator, and functions — Vercel Functions run full Node.)

- [ ] **Step 4: Smoke-test the connection**

```bash
cd apps/odyssey-one && node -e "
import('pg').then(async ({default:pg}) => {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect(); console.log((await c.query('select 1 as ok')).rows); await c.end();
})" --env-file=.env.local
```
Expected: `[ { ok: 1 } ]`

- [ ] **Step 5: Commit (package.json/lock only)**

```bash
git add apps/odyssey-one/package.json package-lock.json
git commit -m "deps: pg for Neon data layer"
```

---

### Task 1: Migration runner + schema

**Files:**
- Create: `packages/db/migrate.mjs`
- Create: `packages/db/migrations/001_schema.sql`
- Test: `packages/db/migrate.test.mjs`

- [ ] **Step 1: Write the failing test** (pure parts: file ordering + idempotence bookkeeping against a stub client)

```js
// packages/db/migrate.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendingMigrations } from './migrate.mjs'

test('pendingMigrations sorts and filters applied', () => {
  const files = ['003_c.sql', '001_a.sql', '002_b.sql', 'README.md']
  const applied = new Set(['001_a.sql'])
  assert.deepEqual(pendingMigrations(files, applied), ['002_b.sql', '003_c.sql'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test packages/db/`
Expected: FAIL (`pendingMigrations` not exported)

- [ ] **Step 3: Implement `migrate.mjs`**

```js
// packages/db/migrate.mjs — tiny migration runner. Usage:
//   node packages/db/migrate.mjs --env-file=apps/odyssey-one/.env.local
//   node packages/db/migrate.mjs --reset   (DROP SCHEMA public CASCADE first — prototype ritual)
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = join(HERE, 'migrations')

export function pendingMigrations(files, applied) {
  return files.filter((f) => f.endsWith('.sql') && !applied.has(f)).sort()
}

export async function migrate(client, dir = MIGRATIONS_DIR) {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
  )
  const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
  for (const f of pendingMigrations(readdirSync(dir), applied)) {
    await client.query('BEGIN')
    try {
      await client.query(readFileSync(join(dir, f), 'utf8'))
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f])
      await client.query('COMMIT')
      console.log(`applied ${f}`)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    }
  }
}

// CLI guard (same pattern as tools/token-check.mjs post-S88)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  if (process.argv.includes('--reset')) {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    console.log('schema reset')
  }
  await migrate(client)
  await client.end()
}
```

- [ ] **Step 4: Write `001_schema.sql`** (full relational web — everything seeds from day one)

```sql
-- 001_schema.sql — C-pragmatic schema (spec 2026-07-23). Text-heavy on purpose:
-- grid contracts expose display strings; *_ts columns exist for filtering/sorting.

CREATE TABLE customers (
  id   text PRIMARY KEY,          -- e.g. 'VALTRIS_01'
  name text NOT NULL
);

CREATE TABLE carriers (
  scac text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE locations (
  id            text PRIMARY KEY, -- deterministic '{initials}-{state}-{seq}'
  facility_name text NOT NULL,
  city  text NOT NULL, state text NOT NULL, zip text NOT NULL, country text NOT NULL DEFAULT 'US'
);

CREATE TABLE shipments (
  sell_shipment  text PRIMARY KEY,
  buy_shipment   text NOT NULL,
  orders         text[] NOT NULL,               -- orderNumber list (contract: rows.orders)
  pro            text, customer_id text NOT NULL REFERENCES customers(id),
  customer_name  text NOT NULL,
  consignor text, consignee text, origin text, destination text,
  pickup_date   text, delivery_date text,        -- display strings 'MM/DD/YYYY HH:MM CST'
  pickup_ts     timestamptz, delivery_ts timestamptz,
  mode text, equipment_code text, equipment text, seal text,
  scac text REFERENCES carriers(scac),
  tender_status text, shipment_status text,
  panel text NOT NULL, category text NOT NULL,
  validation_message text,
  gross_weight text, load text, load_count text, order_count text,
  ap_freight_cost text,
  detail jsonb NOT NULL                          -- full SellShipmentOut (slice-3 endpoint)
);
CREATE INDEX shipments_panel_category ON shipments (panel, category);
CREATE INDEX shipments_customer ON shipments (customer_id);
CREATE INDEX shipments_pickup ON shipments (pickup_ts);
CREATE INDEX shipments_delivery ON shipments (delivery_ts);

CREATE TABLE orders (
  id            serial PRIMARY KEY,
  order_number  text NOT NULL DEFAULT '',        -- '' = pending (I9)
  order_id      integer,                         -- pending rows only
  order_source  text, customer text NOT NULL REFERENCES customers(id),
  ship_direction text, freight_terms text, equipment text,
  consignor jsonb NOT NULL, consignee jsonb NOT NULL,   -- contract nested objects
  gross_weight jsonb, volume jsonb,
  commodity text, order_status text NOT NULL,
  shipment_sell_id text REFERENCES shipments(sell_shipment),  -- null = unshipped/pending
  manual_order jsonb,                            -- I8 enrichment (nullable)
  -- typed filter columns (derived at seed time from the same source objects)
  origin_city text, origin_state text, origin_country text,
  dest_city text, dest_state text, dest_country text,
  earliest_pickup_ts timestamptz, latest_pickup_ts timestamptz,
  earliest_delivery_ts timestamptz, latest_delivery_ts timestamptz
);
CREATE UNIQUE INDEX orders_number_unique ON orders (order_number) WHERE order_number <> '';
CREATE INDEX orders_customer_status ON orders (customer, order_status);

CREATE TABLE stops (
  id serial PRIMARY KEY,
  shipment_sell_id text NOT NULL REFERENCES shipments(sell_shipment) ON DELETE CASCADE,
  sequence integer NOT NULL, stop_type text NOT NULL,     -- 'pickup' | 'delivery'
  location_id text REFERENCES locations(id),
  scheduled_datetime text,
  data jsonb NOT NULL                                     -- full SellShipmentStop object
);
CREATE INDEX stops_shipment ON stops (shipment_sell_id);

CREATE TABLE tenders (
  id serial PRIMARY KEY,
  shipment_sell_id text NOT NULL REFERENCES shipments(sell_shipment) ON DELETE CASCADE,
  scac text, carrier_name text, status text, route_group text,
  rank integer, rate_amount numeric,
  option jsonb NOT NULL                                   -- full shippingOption (~50 fields)
);
CREATE INDEX tenders_shipment ON tenders (shipment_sell_id);

CREATE TABLE events (
  id serial PRIMARY KEY,
  shipment_sell_id text NOT NULL REFERENCES shipments(sell_shipment) ON DELETE CASCADE,
  type text, message text, actor text, occurred_at text,
  data jsonb NOT NULL                                     -- full history entry
);
CREATE INDEX events_shipment ON events (shipment_sell_id);

CREATE TABLE users (
  id text PRIMARY KEY,             -- 'guest', 'planner-ava', ...
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password text,                   -- plain fake creds; NULL for guest (cannot log in)
  role text NOT NULL               -- 'guest' | 'planner' | 'manager' | 'admin'
);

CREATE TABLE user_customer_assignments (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, customer_id)
);

CREATE TABLE user_preferences (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
```

- [ ] **Step 5: Run tests, then apply against Neon**

```bash
node --test packages/db/
node --env-file=apps/odyssey-one/.env.local packages/db/migrate.mjs
```
Expected: test PASS; `applied 001_schema.sql`. Re-run migrate → no output (idempotent).

- [ ] **Step 6: Commit**

```bash
git add packages/db/
git commit -m "db: migration runner + full relational schema (slice 1)"
```

---

### Task 2: Make the generator importable (`buildDataset`)

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs`
- Test: `apps/odyssey-one/tools/generate.test.mjs`

The 1412-line generator currently runs top-to-bottom and writes files. Wrap generation in an exported `buildDataset({ totalShipments })` returning in-memory data; keep the CLI behavior byte-identical (same seed, same defaults, same files).

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/tools/generate.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDataset } from './generate.mjs'

test('buildDataset returns a coherent scaled dataset', () => {
  const ds = buildDataset({ totalShipments: 50 })
  assert.equal(ds.shipments.length, 50)
  assert.equal(ds.details.size, 50)
  // I1: every orderNumber in a shipment's orders[] exists exactly once in orders rows
  const orderNumbers = ds.orders.filter((o) => o.orderNumber !== '').map((o) => o.orderNumber)
  assert.equal(new Set(orderNumbers).size, orderNumbers.length)
  for (const s of ds.shipments) for (const id of s.orders) assert.ok(orderNumbers.includes(id))
  // I2: single customer per shipment, mirrored in detail
  for (const s of ds.shipments) assert.equal(ds.details.get(s.sellShipment).customerId, s.customerId)
  // determinism: same seed → same first shipment id
  const ds2 = buildDataset({ totalShipments: 50 })
  assert.equal(ds2.shipments[0].sellShipment, ds.shipments[0].sellShipment)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/odyssey-one/tools/generate.test.mjs`
Expected: FAIL (`buildDataset` not exported)

- [ ] **Step 3: Refactor `generate.mjs`**

Mechanics (keep every generation function/constant untouched — this is a *wrapping* refactor, not a rewrite):
1. Move `faker.seed(42)` (line ~39) INTO the new function so every call is deterministic.
2. Replace the top-level driver section (the `TOTAL_SHIPMENTS` constant, the generation loops at ~1213–1403, and the array accumulation) with:

```js
export function buildDataset({
  totalShipments = 2200,
  unshippedOrders = Math.round(totalShipments * 0.25),
  pendingOrders = 20,
} = {}) {
  faker.seed(42)
  resetUniqueSellShipments() // wrap the existing used-ids Set in a reset fn so calls don't collide
  const shipments = []            // mainRow per shipment
  const details = new Map()       // sellShipment -> SellShipmentOut detail
  const orders = []               // OrderListRow rows (shipped + unshipped + pending)
  const orderDetails = {}         // orderNumber -> ManualOrder enrichment (I8)
  for (let i = 0; i < totalShipments; i++) {
    const { mainRow, detail, orderRows, enrichments } = generateShipment(i) // existing fn, now returns instead of pushing to globals
    shipments.push(mainRow)
    details.set(mainRow.sellShipment, detail)
    orders.push(...orderRows)
    Object.assign(orderDetails, enrichments)
  }
  for (let n = 0; n < unshippedOrders; n++) orders.push(generateUnshippedOrder(n, false))
  for (let n = 0; n < pendingOrders; n++) orders.push(generateUnshippedOrder(n, true))
  return { shipments, details, orders, orderDetails }
}

// CLI: unchanged behavior — 2200 shipments, same files written.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const ds = buildDataset()
  writeOutputs(ds) // the existing fs.writeFileSync block, extracted verbatim into one fn
  console.log(`Done! Generated ${ds.shipments.length} shipments.`)
}
```
3. Whatever module-level mutable state the loops used (accumulator arrays, the unique-sellShipment `Set`, order-number sequences per customer) must be reset inside `buildDataset` so repeated calls in one process stay deterministic — wrap each in a `resetX()` called at the top.

- [ ] **Step 4: Run tests + regenerate to prove CLI unchanged**

```bash
node --test apps/odyssey-one/tools/generate.test.mjs        # PASS
cd apps/odyssey-one && git stash -- src/data && node tools/generate.mjs
git diff --stat src/data/                                    # expect: no diff (byte-identical regeneration)
```
Expected: test PASS; `git diff` empty (same seed, same order of faker calls ⇒ identical output). If a diff appears, a reset was missed — fix before proceeding.

- [ ] **Step 5: Run the full app suite (generator feeds mock mode)**

Run: `cd apps/odyssey-one && npx vitest run`
Expected: 503 passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
git commit -m "generator: exportable buildDataset(), CLI byte-identical"
```

---

### Task 3: Seeder + seed verification

**Files:**
- Create: `apps/odyssey-one/tools/seed.mjs`
- Create: `apps/odyssey-one/tools/seed-users.mjs` (the 9 accounts, importable by future login slice)
- Create: `apps/odyssey-one/tools/verify-seed.mjs`
- Test: `apps/odyssey-one/tools/seed.test.mjs`

- [ ] **Step 1: Write `seed-users.mjs`** (data module — no test needed)

```js
// apps/odyssey-one/tools/seed-users.mjs — spec "Auth model": guest + 8 mock users.
// Passwords are deliberately fake/shared; guest has NULL password (cannot log in, read-only).
// Customer ids must exist in tools/data-pools.mjs CUSTOMERS.
export const USERS = [
  { id: 'guest',        email: 'guest@odyssey.local',   name: 'Guest',          password: null,      role: 'guest',   customers: [] }, // [] = sees all, writes nothing (API-enforced)
  { id: 'planner-ava',  email: 'ava@odyssey.local',     name: 'Ava Planner',    password: 'odyssey', role: 'planner', customers: ['VALTRIS_01', 'ERCO_01'] },
  { id: 'planner-ben',  email: 'ben@odyssey.local',     name: 'Ben Planner',    password: 'odyssey', role: 'planner', customers: ['ASCEND_01'] },
  { id: 'planner-cara', email: 'cara@odyssey.local',    name: 'Cara Planner',   password: 'odyssey', role: 'planner', customers: ['VALTRIS_01', 'ASCEND_01', 'ERCO_01', 'OLIN_01'] },
  { id: 'planner-dan',  email: 'dan@odyssey.local',     name: 'Dan Planner',    password: 'odyssey', role: 'planner', customers: ['OLIN_01', 'KRATON_01'] },
  { id: 'planner-eve',  email: 'eve@odyssey.local',     name: 'Eve Planner',    password: 'odyssey', role: 'planner', customers: ['KRATON_01'] },
  { id: 'manager-mia',  email: 'mia@odyssey.local',     name: 'Mia Manager',    password: 'odyssey', role: 'manager', customers: ['VALTRIS_01', 'ERCO_01', 'ASCEND_01', 'OLIN_01', 'KRATON_01', 'HUBER_01'] },
  { id: 'manager-noah', email: 'noah@odyssey.local',    name: 'Noah Manager',   password: 'odyssey', role: 'manager', customers: ['HUBER_01', 'SOLVAY_01', 'ARKEMA_01'] },
  { id: 'admin-zoe',    email: 'zoe@odyssey.local',     name: 'Zoe Admin',      password: 'odyssey', role: 'admin',   customers: [] }, // admin: unscoped
]
```
NOTE: replace the customer ids above with 8 real ids from `tools/data-pools.mjs` CUSTOMERS (read the pool; keep a mix of 1/2/4-customer planners). This is the executor's job — the ids in this plan are placeholders in shape only.

- [ ] **Step 2: Write the failing test** (pure helpers: date parsing + batching)

```js
// apps/odyssey-one/tools/seed.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDisplayDate, chunk } from './seed.mjs'

test('parseDisplayDate converts MM/DD/YYYY HH:MM CST to ISO', () => {
  assert.equal(parseDisplayDate('04/18/2026 10:30 CST'), '2026-04-18T10:30:00-06:00')
  assert.equal(parseDisplayDate(null), null)
  assert.equal(parseDisplayDate(''), null)
})

test('chunk splits arrays', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test apps/odyssey-one/tools/seed.test.mjs`
Expected: FAIL (module doesn't exist)

- [ ] **Step 4: Implement `seed.mjs`**

```js
// apps/odyssey-one/tools/seed.mjs — buildDataset(10k) → Neon bulk insert.
// Usage: node --env-file=.env.local tools/seed.mjs [--shipments=10000]
// Ritual: node ../../packages/db/migrate.mjs --reset && node tools/seed.mjs
import pg from 'pg'
import { buildDataset } from './generate.mjs'
import { CUSTOMERS, CARRIERS, LOCATIONS, locationIdFor } from './data-pools.mjs'
import { USERS } from './seed-users.mjs'

export function parseDisplayDate(s) {
  if (!s) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) CST$/.exec(s)
  if (!m) return null
  return `${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:00-06:00` // ponytail: CST fixed offset is fine for fake data
}

export function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// Multi-row parameterized INSERT for one chunk: cols = ['a','b'], rows = [[1,2],...]
async function insertRows(client, table, cols, rows) {
  for (const part of chunk(rows, 200)) {
    const params = []
    const tuples = part.map((row, r) => `(${row.map((_, c) => `$${r * cols.length + c + 1}`).join(',')})`)
    part.forEach((row) => params.push(...row))
    await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${tuples.join(',')}`, params)
  }
}

export async function seed(client, { totalShipments = 10000 } = {}) {
  const ds = buildDataset({ totalShipments })

  await insertRows(client, 'customers', ['id', 'name'], CUSTOMERS.map((c) => [c.id, c.name]))
  await insertRows(client, 'carriers', ['scac', 'name'], CARRIERS.map((c) => [c.scac, c.name]))
  await insertRows(client, 'locations', ['id', 'facility_name', 'city', 'state', 'zip'],
    LOCATIONS.map((l) => [locationIdFor(l), l.facility, l.city, l.state, l.zip]))

  await insertRows(client, 'shipments',
    ['sell_shipment','buy_shipment','orders','pro','customer_id','customer_name','consignor','consignee',
     'origin','destination','pickup_date','delivery_date','pickup_ts','delivery_ts','mode','equipment_code',
     'equipment','seal','scac','tender_status','shipment_status','panel','category','validation_message',
     'gross_weight','load','load_count','order_count','ap_freight_cost','detail'],
    ds.shipments.map((s) => [
      s.sellShipment, s.buyShipment, s.orders, s.pro, s.customerId, s.customerName, s.consignor, s.consignee,
      s.origin, s.destination, s.pickupDate, s.deliveryDate, parseDisplayDate(s.pickupDate), parseDisplayDate(s.deliveryDate),
      s.mode, s.equipmentCode, s.equipment, s.seal, s.scac, s.tenderStatus, s.shipmentStatus, s.panel, s.category,
      s.validationMessage, s.grossWeight, s.load, s.loadCount, s.orderCount, s.apFreightCost,
      JSON.stringify(ds.details.get(s.sellShipment)),
    ]))

  // orders: derive filter columns from the same nested objects that go into JSONB (single source at seed time)
  const shipmentByOrder = new Map()
  for (const s of ds.shipments) for (const o of s.orders) shipmentByOrder.set(o, s.sellShipment)
  await insertRows(client, 'orders',
    ['order_number','order_id','order_source','customer','ship_direction','freight_terms','equipment',
     'consignor','consignee','gross_weight','volume','commodity','order_status','shipment_sell_id','manual_order',
     'origin_city','origin_state','origin_country','dest_city','dest_state','dest_country',
     'earliest_pickup_ts','latest_pickup_ts','earliest_delivery_ts','latest_delivery_ts'],
    ds.orders.map((o) => [
      o.orderNumber, o.orderId ?? null, o.orderSource, o.customer, o.shipDirection, o.freightTerms, o.equipment,
      JSON.stringify(o.consignor), JSON.stringify(o.consignee), JSON.stringify(o.grossWeight), JSON.stringify(o.volume),
      o.commodity, o.orderStatus, shipmentByOrder.get(o.orderNumber) ?? null,
      ds.orderDetails[o.orderNumber] ? JSON.stringify(ds.orderDetails[o.orderNumber]) : null,
      o.consignor.city, o.consignor.state, o.consignor.country, o.consignee.city, o.consignee.state, o.consignee.country,
      o.consignor.earliestPickupDateTime, o.consignor.latestPickupDateTime,
      o.consignee.earliestDeliveryDateTime, o.consignee.latestDeliveryDateTime,
    ]))

  // stops / tenders / events extracted from each detail
  const stopRows = [], tenderRows = [], eventRows = []
  for (const [sellId, d] of ds.details) {
    for (const st of d.shipmentStopList ?? [])
      stopRows.push([sellId, st.stopSequence, st.stopType, null, st.scheduledDateTime, JSON.stringify(st)])
    for (const opt of d.shippingOptionList ?? [])
      tenderRows.push([sellId, opt.scac, opt.carrierName, opt.status, opt.routeGroup, opt.rank, opt.rateAmount, JSON.stringify(opt)])
    for (const ev of d.historyList ?? [])
      eventRows.push([sellId, ev.type ?? null, ev.message ?? null, ev.actor ?? null, ev.date ?? null, JSON.stringify(ev)])
  }
  await insertRows(client, 'stops', ['shipment_sell_id','sequence','stop_type','location_id','scheduled_datetime','data'], stopRows)
  await insertRows(client, 'tenders', ['shipment_sell_id','scac','carrier_name','status','route_group','rank','rate_amount','option'], tenderRows)
  await insertRows(client, 'events', ['shipment_sell_id','type','message','actor','occurred_at','data'], eventRows)

  await insertRows(client, 'users', ['id','email','name','password','role'],
    USERS.map((u) => [u.id, u.email, u.name, u.password, u.role]))
  await insertRows(client, 'user_customer_assignments', ['user_id','customer_id'],
    USERS.flatMap((u) => u.customers.map((c) => [u.id, c])))

  return { shipments: ds.shipments.length, orders: ds.orders.length, stops: stopRows.length, tenders: tenderRows.length, events: eventRows.length }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const totalShipments = Number((process.argv.find((a) => a.startsWith('--shipments=')) ?? '').split('=')[1]) || 10000
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.time('seed')
  const counts = await seed(client, { totalShipments })
  console.timeEnd('seed')
  console.log(counts)
  await client.end()
}
```
NOTE for executor: verify the actual export names in `data-pools.mjs` (`CUSTOMERS`/`CARRIERS`/`LOCATIONS`/`locationIdFor` and their field names, e.g. `l.facility` vs `l.facilityName`) and the exact stop/option/history field names against one generated detail file — adjust the extraction lines to reality. The generator's history entries may use a different date field name (`date`/`timestamp`) — check `generate.mjs` historyList construction (~line 712–847).

- [ ] **Step 5: Run unit tests**

Run: `node --test apps/odyssey-one/tools/seed.test.mjs`
Expected: PASS ×2

- [ ] **Step 6: Write `verify-seed.mjs`** (the 9 invariants as SQL assertions)

```js
// apps/odyssey-one/tools/verify-seed.mjs — post-seed sanity: counts + invariant spot-checks.
// Usage: node --env-file=.env.local tools/verify-seed.mjs
import pg from 'pg'

const CHECKS = [
  ['10k shipments', `SELECT count(*) >= 10000 AS ok FROM shipments`],
  ['I1 order identity: no shipment order missing from orders', `
    SELECT NOT EXISTS (
      SELECT 1 FROM shipments s, unnest(s.orders) AS o(num)
      WHERE NOT EXISTS (SELECT 1 FROM orders ord WHERE ord.order_number = o.num)
    ) AS ok`],
  ['I2 customer coherence: shipped orders match shipment customer', `
    SELECT NOT EXISTS (
      SELECT 1 FROM orders o JOIN shipments s ON s.sell_shipment = o.shipment_sell_id
      WHERE o.customer <> s.customer_id
    ) AS ok`],
  ['I4 date order: pickup <= delivery', `
    SELECT NOT EXISTS (SELECT 1 FROM shipments WHERE pickup_ts > delivery_ts) AS ok`],
  ['I9 pending: no order_number AND never on a shipment', `
    SELECT NOT EXISTS (
      SELECT 1 FROM orders WHERE order_number = '' AND (shipment_sell_id IS NOT NULL OR order_id IS NULL)
    ) AS ok`],
  ['every shipment has stops', `
    SELECT NOT EXISTS (
      SELECT 1 FROM shipments s WHERE NOT EXISTS (SELECT 1 FROM stops st WHERE st.shipment_sell_id = s.sell_shipment)
    ) AS ok`],
  ['every shipment has tenders', `
    SELECT NOT EXISTS (
      SELECT 1 FROM shipments s WHERE NOT EXISTS (SELECT 1 FROM tenders t WHERE t.shipment_sell_id = s.sell_shipment)
    ) AS ok`],
  ['9 users seeded (guest + 8)', `SELECT count(*) = 9 AS ok FROM users`],
  ['guest cannot log in', `SELECT password IS NULL AS ok FROM users WHERE id = 'guest'`],
]

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
let failed = 0
for (const [name, sql] of CHECKS) {
  const { rows: [{ ok }] } = await client.query(sql)
  console.log(`${ok ? '✓' : '✖'} ${name}`)
  if (!ok) failed++
}
await client.end()
process.exit(failed ? 1 : 0)
```

- [ ] **Step 7: Full ritual against Neon**

```bash
node --env-file=apps/odyssey-one/.env.local packages/db/migrate.mjs --reset
cd apps/odyssey-one && node --env-file=.env.local tools/seed.mjs --shipments=10000
node --env-file=.env.local tools/verify-seed.mjs
```
Expected: seed completes (log the `seed:` timing — first latency datapoint), all checks ✓, exit 0. If Neon free-tier size is a concern, `SELECT pg_size_pretty(pg_database_size(current_database()))` — expect roughly 200–350MB.

- [ ] **Step 8: Commit**

```bash
git add apps/odyssey-one/tools/seed.mjs apps/odyssey-one/tools/seed-users.mjs apps/odyssey-one/tools/verify-seed.mjs apps/odyssey-one/tools/seed.test.mjs
git commit -m "seed: 10k relational dataset -> Neon + invariant verification"
```

---

### Task 4: API scaffold — catch-all router, db pool, delay knob

**Files:**
- Create: `apps/odyssey-one/api/[...path].js`
- Create: `apps/odyssey-one/api/_lib/router.mjs`
- Create: `apps/odyssey-one/api/_lib/db.mjs`
- Modify: `apps/odyssey-one/vercel.json` (rewrite must not swallow `/api`)
- Test: `apps/odyssey-one/api/_lib/router.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// apps/odyssey-one/api/_lib/router.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchRoute, ROUTES } from './router.mjs'

test('matches category count route', () => {
  const m = matchRoute('GET', '/shipment-service/v1/shipment/error/category/count')
  assert.ok(m)
  assert.equal(m.name, 'categoryCounts')
})

test('matches error list + order list + tab counts', () => {
  assert.equal(matchRoute('POST', '/shipment-service/pgi-pgr/v1/error/list').name, 'shipmentErrorList')
  assert.equal(matchRoute('POST', '/order-service/v3/order/list').name, 'orderList')
  assert.equal(matchRoute('GET', '/order-service/v3/order/tab-counts').name, 'orderTabCounts')
})

test('unknown route returns null', () => {
  assert.equal(matchRoute('GET', '/nope'), null)
})

test('every route has a handler function', () => {
  for (const r of ROUTES) assert.equal(typeof r.handler, 'function')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/odyssey-one/api/_lib/`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `db.mjs` + `router.mjs` + the catch-all**

```js
// apps/odyssey-one/api/_lib/db.mjs — one pool per function instance (Fluid Compute reuses instances)
import pg from 'pg'

let pool
export function getPool() {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  })
  return pool
}
```

```js
// apps/odyssey-one/api/_lib/router.mjs — path table for the OdysseyONE-shaped endpoints.
import { categoryCounts, shipmentErrorList } from './shipments.mjs'
import { orderList, orderTabCounts } from './orders.mjs'

export const ROUTES = [
  { name: 'categoryCounts',    method: 'GET',  path: '/shipment-service/v1/shipment/error/category/count', handler: categoryCounts },
  { name: 'shipmentErrorList', method: 'POST', path: '/shipment-service/pgi-pgr/v1/error/list',            handler: shipmentErrorList },
  { name: 'orderList',         method: 'POST', path: '/order-service/v3/order/list',                       handler: orderList },
  { name: 'orderTabCounts',    method: 'GET',  path: '/order-service/v3/order/tab-counts',                 handler: orderTabCounts },
]

export function matchRoute(method, pathname) {
  return ROUTES.find((r) => r.method === method && r.path === pathname) ?? null
}
```

```js
// apps/odyssey-one/api/[...path].js — single Vercel Function serving every contract path under /api.
import { matchRoute } from './_lib/router.mjs'
import { getPool } from './_lib/db.mjs'

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x')
  const pathname = url.pathname.replace(/^\/api/, '')
  const route = matchRoute(req.method, pathname)
  if (!route) return res.status(404).json({ message: `No route: ${req.method} ${pathname}` })

  const delay = Number(process.env.SIMULATED_DELAY_MS ?? 0)
  if (delay > 0) await new Promise((r) => setTimeout(r, delay))

  try {
    const result = await route.handler({ query: url.searchParams, body: req.body ?? null, db: getPool() })
    return res.status(200).json(result)
  } catch (e) {
    console.error(route.name, e) // shows in Vercel function logs
    return res.status(500).json({ message: 'Internal error', detail: String(e.message ?? e) })
  }
}
```
(Handlers receive `{ query, body, db }` — pure-ish and unit-testable; `req.body` is auto-parsed JSON on Vercel Node functions.)

- [ ] **Step 4: Fix the SPA rewrite** in `apps/odyssey-one/vercel.json` — replace the `rewrites` line:

```json
"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
```
(Functions are matched before rewrites on Vercel, but the negative lookahead makes the intent explicit and protects `vercel dev` parity.)

- [ ] **Step 5: Run tests** (they will fail on missing `shipments.mjs`/`orders.mjs` imports — create both files exporting stub handlers that throw `new Error('not implemented')` so the router test passes; Tasks 5–7 replace them)

Run: `node --test apps/odyssey-one/api/_lib/`
Expected: PASS ×4

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/api/ apps/odyssey-one/vercel.json
git commit -m "api: catch-all contract router + pool + SIMULATED_DELAY_MS"
```

---

### Task 5: Shipments endpoints — category counts + error list

**Files:**
- Create: `apps/odyssey-one/api/_lib/shipments.mjs` (replaces Task 4 stub)
- Test: `apps/odyssey-one/api/_lib/shipments.test.mjs`

- [ ] **Step 1: Write the failing tests** (SQL builders are pure — test them without a DB)

```js
// apps/odyssey-one/api/_lib/shipments.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCountsQuery, buildListQuery } from './shipments.mjs'

test('counts: panel only', () => {
  const q = buildCountsQuery({ panel: 'exceptions', customerIds: undefined })
  assert.match(q.text, /GROUP BY category/)
  assert.deepEqual(q.values, ['exceptions'])
})

test('counts: customer scope; empty array = impossible filter', () => {
  const scoped = buildCountsQuery({ panel: 'monitoring', customerIds: ['VALTRIS_01'] })
  assert.match(scoped.text, /customer_id = ANY\(\$2\)/)
  const empty = buildCountsQuery({ panel: 'monitoring', customerIds: [] })
  assert.match(empty.text, /FALSE/)
})

test('list: pagination is 0-based, filters compose', () => {
  const q = buildListQuery({
    pageNumber: 2, pageSize: 25,
    filter: { panel: 'exceptions', category: 'date-issues', customerIds: ['VALTRIS_01'],
              dateFilters: { pickupDateFrom: '2026-04-01', pickupDateTo: '2026-04-30' } },
    sortBy: 'pickupDate', orderBy: 'desc',
  })
  assert.match(q.text, /ORDER BY pickup_ts DESC NULLS LAST/)
  assert.match(q.text, /OFFSET \$\d+/)
  assert.ok(q.values.includes(50))          // 2 * 25
  assert.ok(q.values.includes('date-issues'))
})

test('list: category "all" is not filtered; unknown sortBy falls back', () => {
  const q = buildListQuery({ pageNumber: 0, pageSize: 10, filter: { panel: 'exceptions', category: 'all' }, sortBy: 'DROP TABLE', orderBy: 'asc' })
  assert.ok(!q.values.includes('all'))
  assert.match(q.text, /ORDER BY pickup_ts/)   // whitelist fallback, never raw user input
})
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test apps/odyssey-one/api/_lib/shipments.test.mjs`
Expected: FAIL (builders not exported)

- [ ] **Step 3: Implement**

```js
// apps/odyssey-one/api/_lib/shipments.mjs
// Response field names must match ShipmentErrorRow (src/api/types/shipmentErrorList.ts).

const ROW_COLUMNS = `
  buy_shipment AS "buyShipment", sell_shipment AS "sellShipment", orders, pro,
  customer_id AS "customerId", customer_name AS "customerName", consignor, consignee,
  origin, destination, pickup_date AS "pickupDate", delivery_date AS "deliveryDate",
  mode, equipment_code AS "equipmentCode", scac, tender_status AS "tenderStatus",
  shipment_status AS "shipmentStatus", panel, category, validation_message AS "validationMessage",
  gross_weight AS "grossWeight", load_count AS "loadCount", order_count AS "orderCount",
  ap_freight_cost AS "apFreightCost"`

const SORT_MAP = {
  pickupDate: 'pickup_ts', deliveryDate: 'delivery_ts', customerName: 'customer_name',
  sellShipment: 'sell_shipment', buyShipment: 'buy_shipment', scac: 'scac', mode: 'mode',
  tenderStatus: 'tender_status', shipmentStatus: 'shipment_status', category: 'category',
}

// Exact-match/substring filterable dataKeys → columns (FilterPanel + saved queries).
const FIELD_MAP = {
  customerName: 'customer_name', consignor: 'consignor', consignee: 'consignee', origin: 'origin',
  destination: 'destination', mode: 'mode', equipmentCode: 'equipment_code', scac: 'scac',
  tenderStatus: 'tender_status', shipmentStatus: 'shipment_status', pro: 'pro',
  sellShipment: 'sell_shipment', buyShipment: 'buy_shipment',
}

function scope(where, values, customerIds) {
  if (customerIds === undefined) return
  if (customerIds.length === 0) { where.push('FALSE'); return }   // honest empty (S79c decision 10)
  values.push(customerIds)
  where.push(`customer_id = ANY($${values.length})`)
}

export function buildCountsQuery({ panel, customerIds }) {
  const values = [panel]
  const where = ['panel = $1']
  scope(where, values, customerIds)
  return { text: `SELECT category, count(*)::int AS count FROM shipments WHERE ${where.join(' AND ')} GROUP BY category`, values }
}

export function buildListQuery({ pageNumber = 0, pageSize = 50, filter = {}, sortBy, orderBy } = {}) {
  const values = []
  const where = []
  const add = (clause, v) => { values.push(v); where.push(clause.replace('?', `$${values.length}`)) }

  if (filter.panel) add('panel = ?', filter.panel)
  if (filter.category && filter.category !== 'all') add('category = ?', filter.category)
  scope(where, values, filter.customerIds)
  for (const [k, v] of Object.entries(filter.filter ?? {})) if (FIELD_MAP[k]) add(`${FIELD_MAP[k]} = ?`, v)
  for (const [k, v] of Object.entries(filter.searchFilters ?? {})) if (FIELD_MAP[k]) add(`${FIELD_MAP[k]} ILIKE ?`, `%${v}%`)
  if (filter.searchTerm) {
    const col = FIELD_MAP[filter.searchAttributeKey]
    if (col) add(`${col} ILIKE ?`, `%${filter.searchTerm}%`)
    else add(`(sell_shipment ILIKE ? OR customer_name ILIKE ? OR origin ILIKE ? OR destination ILIKE ?)`.replace(/\?/g, () => { values.push(`%${filter.searchTerm}%`); return `$${values.length}` }), undefined) || values.pop() // see NOTE below
  }
  const df = filter.dateFilters ?? {}
  if (df.pickupDateFrom) add('pickup_ts >= ?', df.pickupDateFrom)
  if (df.pickupDateTo) add('pickup_ts < (?::date + 1)', df.pickupDateTo)
  if (df.deliveryDateFrom) add('delivery_ts >= ?', df.deliveryDateFrom)
  if (df.deliveryDateTo) add('delivery_ts < (?::date + 1)', df.deliveryDateTo)

  const sortCol = SORT_MAP[sortBy] ?? 'pickup_ts'
  const dir = orderBy === 'desc' ? 'DESC' : 'ASC'
  values.push(pageSize); const limitP = values.length
  values.push(pageNumber * pageSize); const offsetP = values.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    text: `SELECT ${ROW_COLUMNS}, count(*) OVER()::int AS "__total"
           FROM shipments ${whereSql}
           ORDER BY ${sortCol} ${dir} NULLS LAST
           LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  }
}
```
NOTE (executor): the free-text multi-column branch above is deliberately awkward to express inline — implement it as a small helper `addFreeText(where, values, term)` pushing 4 params and one OR-clause; keep the builders pure and adjust the test if the shape differs. `searchCriteria` chips are OUT of scope until the search slice — ignore the key (deviation 2).

```js
export async function categoryCounts({ query, db }) {
  const panel = query.get('panel') ?? ''
  const customerIds = query.has('customerIds') ? query.get('customerIds').split(',').filter(Boolean) : undefined
  const { rows } = await db.query(buildCountsQuery({ panel, customerIds }))
  return { errorOverview: rows }   // [{ category, count }]
}

export async function shipmentErrorList({ body, db }) {
  const { pageNumber = 0, pageSize = 50 } = body ?? {}
  const { rows } = await db.query(buildListQuery(body ?? {}))
  const totalCount = rows[0]?.__total ?? 0
  return { pageNumber, pageSize, totalCount, rows: rows.map(({ __total, ...r }) => r) }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test apps/odyssey-one/api/_lib/`
Expected: all PASS (router tests still green — stub import replaced by real exports)

- [ ] **Step 5: Live smoke via `vercel dev`**

```bash
npx vercel dev --cwd . &   # from repo root; serves SPA + functions
sleep 8
curl -s 'http://localhost:3000/api/shipment-service/v1/shipment/error/category/count?panel=exceptions' | head -c 400
curl -s -X POST 'http://localhost:3000/api/shipment-service/pgi-pgr/v1/error/list' \
  -H 'content-type: application/json' \
  -d '{"pageNumber":0,"pageSize":5,"filter":{"panel":"exceptions"}}' | head -c 600
```
Expected: counts JSON `{"errorOverview":[{"category":"date-issues","count":...}...]}`; list JSON with 5 rows + realistic `totalCount` (thousands). Kill the dev server after.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/api/_lib/shipments.mjs apps/odyssey-one/api/_lib/shipments.test.mjs
git commit -m "api: shipment category counts + error list endpoints"
```

---

### Task 6: Orders endpoints — list + tab counts

**Files:**
- Create: `apps/odyssey-one/api/_lib/orders.mjs` (replaces Task 4 stub)
- Test: `apps/odyssey-one/api/_lib/orders.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// apps/odyssey-one/api/_lib/orders.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrderListQuery, buildTabCountsQuery } from './orders.mjs'

test('order list: 1-based pagination (page 1 = offset 0)', () => {
  const q = buildOrderListQuery({ pagination: { pageNumber: 1, pageSize: 20 } })
  assert.ok(q.values.includes(0))
  const q3 = buildOrderListQuery({ pagination: { pageNumber: 3, pageSize: 20 } })
  assert.ok(q3.values.includes(40))
})

test('order list: status + customer + origin filters', () => {
  const q = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 10 },
    filters: { customers: ['VALTRIS_01'], orderStatuses: ['Draft'], originCities: ['Phoenix'] },
  })
  assert.match(q.text, /customer = ANY/)
  assert.match(q.text, /order_status = ANY/)
  assert.match(q.text, /origin_city = ANY/)
})

test('tab counts: single grouped query, scoped', () => {
  const q = buildTabCountsQuery({ customerIds: ['VALTRIS_01'] })
  assert.match(q.text, /count\(\*\)/i)
  assert.deepEqual(q.values, [['VALTRIS_01']])
})
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test apps/odyssey-one/api/_lib/orders.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement**

```js
// apps/odyssey-one/api/_lib/orders.mjs
// Response rows must match OrderListRow (src/api/types/orderList.ts): nested consignor/consignee/
// grossWeight/volume come straight from JSONB columns.

const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed'] // mirror of src const (ORD-03)

const ROW_COLUMNS = `
  order_number AS "orderNumber", order_id AS "orderId", order_source AS "orderSource",
  customer, ship_direction AS "shipDirection", freight_terms AS "freightTerms", equipment,
  consignor, consignee, gross_weight AS "grossWeight", volume, commodity, order_status AS "orderStatus"`

const SORT_MAP = {
  orderNumber: 'order_number', customer: 'customer', orderStatus: 'order_status',
  commodity: 'commodity', equipment: 'equipment',
}

const ARRAY_FILTERS = [
  ['customers', 'customer'], ['orderNumbers', 'order_number'], ['orderStatuses', 'order_status'],
  ['originCities', 'origin_city'], ['originStates', 'origin_state'], ['originCountries', 'origin_country'],
  ['destinationCities', 'dest_city'], ['destinationStates', 'dest_state'], ['destinationCountries', 'dest_country'],
]
const DATE_FILTERS = [
  ['earliestPickupDateFrom', 'earliest_pickup_ts', '>='], ['earliestPickupDateTo', 'earliest_pickup_ts', '<'],
  ['latestPickupDateFrom', 'latest_pickup_ts', '>='], ['latestPickupDateTo', 'latest_pickup_ts', '<'],
  ['earliestDeliveryDateFrom', 'earliest_delivery_ts', '>='], ['earliestDeliveryDateTo', 'earliest_delivery_ts', '<'],
  ['latestDeliveryDateFrom', 'latest_delivery_ts', '>='], ['latestDeliveryDateTo', 'latest_delivery_ts', '<'],
]

export function buildOrderListQuery({ pagination = {}, filters = {}, sort } = {}) {
  const values = []
  const where = []
  const add = (clause, v) => { values.push(v); where.push(clause.replace('?', `$${values.length}`)) }

  for (const [key, col] of ARRAY_FILTERS) {
    const v = filters[key]
    if (v === undefined) continue
    if (v.length === 0) { where.push('FALSE'); continue }    // same honest-empty semantics as shipments
    add(`${col} = ANY(?)`, v)
  }
  for (const [key, col, op] of DATE_FILTERS) {
    if (!filters[key]) continue
    add(op === '<' ? `${col} < (?::date + 1)` : `${col} >= ?`, filters[key])
  }

  const pageNumber = pagination.pageNumber ?? 1        // 1-based per LLD (Q29)
  const pageSize = pagination.pageSize ?? 50
  const sortCol = SORT_MAP[sort?.field] ?? 'order_number'
  const dir = sort?.direction === 'desc' ? 'DESC' : 'ASC'
  values.push(pageSize); const limitP = values.length
  values.push((pageNumber - 1) * pageSize); const offsetP = values.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    text: `SELECT ${ROW_COLUMNS}, count(*) OVER()::int AS "__total"
           FROM orders ${whereSql}
           ORDER BY ${sortCol} ${dir} NULLS LAST
           LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  }
}

export function buildTabCountsQuery({ customerIds } = {}) {
  const values = []
  let scopeSql = ''
  if (customerIds !== undefined) {
    if (customerIds.length === 0) scopeSql = 'WHERE FALSE'
    else { values.push(customerIds); scopeSql = `WHERE customer = ANY($${values.length})` }
  }
  return {
    text: `SELECT count(*)::int AS all,
                  count(*) FILTER (WHERE order_status = 'Draft')::int AS draft,
                  count(*) FILTER (WHERE order_status = ANY('{${VALIDATION_ERROR_STATUSES.join(',')}}'))::int AS "validationErrors"
           FROM orders ${scopeSql}`,
    values,
  }
}

export async function orderList({ body, db }) {
  const request = body ?? {}
  const { rows } = await db.query(buildOrderListQuery(request))
  const totalCount = rows[0]?.__total ?? 0
  return {
    success: true,
    orders: rows.map(({ __total, ...r }) => r),
    pagination: {
      pageNumber: request.pagination?.pageNumber ?? 1,
      pageSize: request.pagination?.pageSize ?? 50,
      totalCount,
    },
    error: null,
  }
}

export async function orderTabCounts({ query, db }) {
  const customerIds = query.has('customers') ? query.get('customers').split(',').filter(Boolean) : undefined
  const { rows: [counts] } = await db.query(buildTabCountsQuery({ customerIds }))
  return counts   // { all, draft, validationErrors }
}
```
NOTE (executor): the `FILTER (WHERE order_status = ANY('{...}'))` literal-array interpolation is safe (constant module array, no user input) but if it reads wrong, parameterize it like the others. Confirm `orderId` nullable serialization matches the mock (`orderId` absent vs null — check what `useOrderTabCounts`/list consumers do with it; `null` is fine if the row type is optional).

- [ ] **Step 4: Run tests**

Run: `node --test apps/odyssey-one/api/_lib/`
Expected: all PASS

- [ ] **Step 5: Live smoke via `vercel dev`** (same pattern as Task 5)

```bash
curl -s -X POST 'http://localhost:3000/api/order-service/v3/order/list' -H 'content-type: application/json' \
  -d '{"pagination":{"pageNumber":1,"pageSize":5},"filters":{"orderStatuses":["Draft"]}}' | head -c 500
curl -s 'http://localhost:3000/api/order-service/v3/order/tab-counts' | head -c 200
```
Expected: 5 Draft rows; tab counts JSON with `all` in the ~11k range (10k-scale shipped+unshipped), `draft`/`validationErrors` > 0.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/api/_lib/orders.mjs apps/odyssey-one/api/_lib/orders.test.mjs
git commit -m "api: order list + tab-counts endpoints"
```

---

### Task 7: Seam wiring — live branches catch up

**Files:**
- Modify: `apps/odyssey-one/src/api/services/gridService.ts:36-43` (counts live branch: send customerIds)
- Modify: `apps/odyssey-one/src/api/services/orderService.ts:63-71` (tab counts live branch)
- Create: `apps/odyssey-one/.env.local` additions (VITE vars)
- Test: existing suites + new cases in `gridService.test.ts` / `orderService.test.ts`

- [ ] **Step 1: Write failing tests** (in the existing vitest files, mock `client.get` per current test patterns — read neighboring tests first and mirror their setup)

```ts
// append to apps/odyssey-one/src/api/services/gridService.test.ts
it('live counts pass customerIds as csv query param', async () => {
  vi.stubEnv('VITE_API_MODE', 'live')
  const spy = vi.spyOn(client, 'get').mockResolvedValue({ errorOverview: [] })
  await getCategoryCounts({ panel: 'exceptions', customerIds: ['A_01', 'B_02'] })
  expect(spy).toHaveBeenCalledWith(
    '/shipment-service/v1/shipment/error/category/count?panel=exceptions&customerIds=A_01%2CB_02'
  )
})
```

```ts
// append to apps/odyssey-one/src/api/services/orderService.test.ts
it('live tab counts call the endpoint, scoped', async () => {
  vi.stubEnv('VITE_API_MODE', 'live')
  const spy = vi.spyOn(client, 'get').mockResolvedValue({ all: 9, draft: 2, validationErrors: 1 })
  const counts = await getOrderTabCounts(['A_01'])
  expect(spy).toHaveBeenCalledWith('/order-service/v3/order/tab-counts?customers=A_01')
  expect(counts).toEqual({ all: 9, draft: 2, validationErrors: 1 })
})

it('live tab counts short-circuit empty scope to zeros (no call)', async () => {
  vi.stubEnv('VITE_API_MODE', 'live')
  const spy = vi.spyOn(client, 'get')
  expect(await getOrderTabCounts([])).toEqual({ all: 0, draft: 0, validationErrors: 0 })
  expect(spy).not.toHaveBeenCalled()
})
```
(Adjust import/mocking mechanics to match how the existing tests in those files stub `client` and env — mirror, don't invent.)

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/odyssey-one && npx vitest run src/api/services/gridService.test.ts src/api/services/orderService.test.ts`
Expected: new cases FAIL

- [ ] **Step 3: Implement the two live branches**

`gridService.ts` counts live branch — extend (update the "until the real endpoint grows a filter" comment: OUR backend grew it; searchCriteria still mock-only until the search slice):
```ts
if (getApiMode() === 'live') {
  const params = new URLSearchParams({ panel })
  if (customerIds !== undefined) params.set('customerIds', customerIds.join(','))
  const res = await client.get<{ errorOverview: CategoryCount[] }>(
    `/shipment-service/v1/shipment/error/category/count?${params.toString()}`
  )
  return res.errorOverview
}
```

`orderService.ts` `getOrderTabCounts` — add a live branch above the mock computation:
```ts
if (getApiMode() === 'live') {
  if (customerIds && customerIds.length === 0) return { all: 0, draft: 0, validationErrors: 0 }
  const params = customerIds !== undefined ? `?customers=${encodeURIComponent(customerIds.join(','))}` : ''
  return client.get<OrderTabCounts>(`/order-service/v3/order/tab-counts${params}`)
}
```
(Exact insertion points and existing signatures govern — read the functions first; keep mock branches byte-identical.)

- [ ] **Step 4: Full suite**

Run: `cd apps/odyssey-one && npx vitest run`
Expected: 503 + new cases, 0 failing.

- [ ] **Step 5: Set the local live flag**

Append to `apps/odyssey-one/.env.local` (NOT committed):
```
VITE_API_MODE=live
VITE_API_BASE_URL=/api
```

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/api/services/gridService.ts apps/odyssey-one/src/api/services/orderService.ts \
        apps/odyssey-one/src/api/services/gridService.test.ts apps/odyssey-one/src/api/services/orderService.test.ts
git commit -m "seam: live counts customerIds + live order tab-counts"
```

---

### Task 8: End-to-end verification + deploy

**Files:** none (verification), possibly `vercel` env dashboard values

- [ ] **Step 1: Full local E2E on `vercel dev`**

```bash
npx vercel dev &   # repo root
```
Open http://localhost:3000 and verify via CDP (headless-Chrome, real mouse events — the S89 discipline):
1. Home: widget numbers render (Exceptions/Monitoring/Orders counts) and are non-zero.
2. Shipments route: list populates from the server (Network tab: POST `/api/shipment-service/pgi-pgr/v1/error/list`), tab badges match widget numbers seen on Home.
3. Orders route: All/Draft/Validation Errors chips match Home's Orders widgets; pagination flips pages (row content changes, totalCount stable).
4. Customer scoping: select a customer subset in TrailNav → Home widgets, Shipments badges, Orders chips ALL change consistently.
5. Latency: throttle or set `SIMULATED_DELAY_MS=800` in `.env.local`, reload — loading states visible; remove after.

Expected: numbers agree across Home/routes for the same scope (the S91 rule, now server-backed). Screens NOT in this slice (ShipmentsBar detail panes, global search, create-order) still run on mock — expected mixed mode.

- [ ] **Step 2: Production env vars**

```bash
npx vercel env add VITE_API_MODE production   # value: live
npx vercel env add VITE_API_BASE_URL production   # value: /api
```
(`DATABASE_URL` was injected by the Neon integration already.)

- [ ] **Step 3: Deploy + re-verify**

```bash
npx vercel --prod   # ALWAYS from repo root
```
Repeat Step 1's checks against https://odyssey-one-stage.vercel.app — first real cross-continent latency reading. Note observed timings (curl the counts endpoint 3×, report ms).

- [ ] **Step 4: Wrap-up commit** (any env/doc touch-ups) and report: seed timing, DB size, endpoint latencies (local vs prod), and which screens are now live vs mock.

---

## Self-review notes (done at write time)

- **Spec coverage:** slices 1–2 fully tasked (schema✓ seed✓ counts✓ grid✓ flip✓ guest-user seeding✓ preferences table✓). Slices 3–7 intentionally out (follow-up plans). Latency knob✓ (Task 4). Reset ritual✓ (Task 3 Step 7).
- **Placeholders:** two deliberate executor-verification NOTEs (data-pools export names, seed-users real customer ids) — these are read-the-source checks, not design gaps.
- **Type consistency:** response field aliases in Tasks 5–6 match the Explore-verified contract types; `buildDataset` return shape used consistently in Tasks 2–3.
- **Risk register:** (1) Task 2 refactor is the riskiest step — the byte-identical `git diff` gate catches ordering/state regressions; (2) `pg` over Neon requires SSL — handled in every client/pool construction; (3) Vercel `req.body` parsing + `[...path].js` catch-all behavior verified in Task 5 smoke before anything depends on it.

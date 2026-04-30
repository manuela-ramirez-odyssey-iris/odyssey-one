# Supabase Migration Plan (Deferred)

> **Status:** Brainstorm halted 2026-04-28 (Session 16). Resume after other sidebar domains have initial implementations and clearer cross-domain requirements have surfaced.
>
> This document captures the decisions made during the partial brainstorm so we don't re-debate them on resume. It is **not** a finished spec. Update it as building the other domains surfaces new requirements.

## Why we halted

- **Stakeholder value:** visible domain UIs > invisible DB infra. Building Orders / Carriers / Tracking / Home / User Management first gives stakeholders something to react to.
- **Schema follows reality:** real cross-domain implementation surfaces real requirements. Designing a schema in advance of the consumers risks landing the wrong abstractions.
- **User Management is barely documented.** Building it generates the access-control model rather than guessing it.
- **Other-domain docs need collection.** Orders / Tracking / Home / Carriers documentation exists outside the repo (NotebookLM, vault, etc.) and needs to be ingested into the project before schema work makes sense.

## Resume conditions

We're ready to pick this back up when **all** of these are true:

1. At least 3 other sidebar domains have initial UI implementations (even if data is still mock JSON).
2. Documentation for Orders, Tracking, Home, Carriers, User Management lives in the repo (or in a shared, ingestible source).
3. The "create order in Orders → appears in Shipments" flow has a UX mockup so we know what writes need to support.
4. User Management has a clearer picture of roles (planner, admin, others?) and what each role can see.

## Decisions to carry forward

### Strategy: C-pragmatic schema

Three strategies were considered; the chosen path is **C — pragmatic normalization**.

| Strategy | What it means | Why we picked / rejected |
|---|---|---|
| A — full normalization | Every nested field becomes its own table | Most thorough; heaviest upfront cost; over-engineered for current scope |
| B — JSON-blob schema | Keep everything nested, one big `shipments` table with JSONB everywhere | **Rejected.** Cross-domain operational consistency (e.g., Orders inserts a row that Shipments must display next instant) requires referential integrity. JSONB blobs make that impossible. |
| **C — pragmatic normalization** ✅ | Normalize entities that cross domain boundaries; keep deeply shipment-internal nested data as JSONB on `shipments` | Right balance for cross-domain queries while deferring YAGNI complexity |

### Phasing

| Phase | Scope |
|---|---|
| **1 — read-only migration** | Replace JSON with Supabase reads. Anon key, no auth, no RLS. Other domains can scaffold reads against shared tables. |
| **2 — auth + RLS** | Add `users` + `user_customer_assignments`, Supabase Auth, RLS policies that scope by assigned customers (admins bypass). |
| **3 — writes** | Real mutations. "Create order" inserts an order + shipment + tenders + events; row appears live across domains. |

We agreed Phase 1 is the right first slice when migration resumes. Phases 2 and 3 are separate sessions.

### Schema shape — v0 sketch

10 tables + 5 JSONB columns on `shipments`. **All names and column lists are sketches; refine as domains are built.**

#### Reference tables (multi-domain dictionary data)

| Table | Notes |
|---|---|
| `customers` | id, code, name, created_at |
| `carriers` | id, scac, name, created_at — owned by Carriers domain |
| `locations` | id, city, state, zip, facility_name |

#### Operational tables (the actual flow)

| Table | Notes |
|---|---|
| `users` | id, email, name, role (free-form string; start with `planner` and `admin`) |
| `user_customer_assignments` | M:N junction. No hardcoded "7 customer" cap — flexible. |
| `orders` | id, order_number, status, customer_id (FK), shipment_id (FK, nullable), payment_terms, ship_direction, ap_total, ar_total — owned by Orders |
| `shipments` | id, buy_shipment, sell_shipment, customer_id (FK; primary customer for the common single-customer case), scac (FK), mode, equipment_code, status, panel, category, pickup_date, delivery_date, gross_weight, ap_freight_cost, **+ 5 JSONB cols** |
| `stops` | id, shipment_id (FK), location_id (FK), sequence, type (pickup/delivery), scheduled_at, arrived_at — read by Tracking |
| `tenders` | id, shipment_id (FK), carrier_id (FK), status (Sent/Accepted/Declined/Cancelled), route_group (Primary/Backup/Spot), cost, sequence — read by Carriers |
| `events` | id, shipment_id (FK), type, message, actor, occurred_at — read by Tracking and the History tab; absorbs audit-log + PGI events |

#### JSONB columns on `shipments` (no domain queries inside them yet)

| Column | Shape sketch |
|---|---|
| `cost_data` | `{ ap_breakdown, ar_breakdown, per_order_allocation, ... }` |
| `documents_data` | `{ items: [{ type, url, ... }] }` |
| `instructions_data` | `{ items: [{ type, text }] }` |
| `notes_data` | `{ items: [{ author, text, ts }] }` |
| `product_data` | `{ items: [{ class, weight, ... }] }` |

### Multi-customer shipments

Some LTL consolidation shipments carry orders from 2+ customers. Decision: keep `shipments.customer_id` as a denormalized "primary customer" pointer for the common single-customer case. For the rare multi-customer scenario, the truth lives in `orders.customer_id`. Multi-customer scope queries must join through orders.

### Things explicitly NOT added (YAGNI)

- **`audit_log`** — overlaps with `events`. One event-stream table is enough; "who changed what when" is just an event.
- **`cost_allocation` table** — covered by JSONB `cost_data`. Promote to a real table only when a domain queries inside it.
- **`pgi_messages` table** — Shipments-internal; can live as event types in `events`.
- **Carriers contract details** (rates, capacity, performance) — the `carriers` table stays thin until Carriers UI demands more.

### Account & instance strategy

| Question | Decision |
|---|---|
| Account | **Open.** Personal preferred (matches Vercel pattern, avoids IT alerts) but not finalized. |
| Instances | **User-leaning toward Option 3 (local Supabase via Docker for dev + cloud for prod) — most scalable.** Reconfirm at resume. |

## Open questions (collect answers via building other domains)

These are the things we don't know yet that will shape the migration. Use this list as a checklist when documentation arrives.

### Domains
- **Orders:** entity shape, lifecycle states, what triggers shipment creation, multi-customer handling, line-item structure.
- **Tracking:** is it a separate domain or a view over Shipments + events + stops? What events does it surface that Shipments doesn't?
- **Home:** dashboard scope — KPIs, counts by panel, scoped to the user's customers? Real-time?
- **Carriers:** master data fields, contract structure, tender history view, spot bid integration scope.
- **User Management:** roles beyond planner/admin? Customer-assignment workflow (who assigns whom)? Role permissions matrix?

### From 2026-04-29 grooming with David (see `domain-documentation/domains-overview.md`)
- **Auto-tender is optional, not mandatory** — schema needs a tender-mode field on `orders` or `shipments` (e.g. `auto_tender BOOLEAN`, or a config table per customer/route). Current sketch assumes always-auto.
- **Carriers compliance matrix** needs more columns than the current sketch (`id, scac, name, created_at`). Add at minimum: `equipment_types[]`, `hazmat_certified`, `mode_qualifications[]`. Compliance is **stored reference data**, not a live query.
- **Manager role visibility** — managers see their team's customers, not just their own assigned set. RLS policy needs a team/manager-of relation. Planners cap ~7 customers (soft); managers ~8–12.
- **Tender history is mandatory UX** — never squashed/overwritten. The full history shows on the shipment. The current `tenders` table sketch is correct but should include explicit `created_at` and never-deleted semantics.
- **Customers as a master domain** — confirmed needed by David. Decision pending: dedicated sidebar entry, or surfaced only via Orders / User Management. Either way the `customers` table is correct in the sketch.
- **Tracking is read-only (likely)** — David framed it as a pure consumer. Open: does Tracking write back ack-events to Shipments? Defer until confirmed.
- **Auto-tender carrier-selection algorithm** — undefined (round-robin? cost? compliance-only?). Affects Shipments logic, not the schema directly, but the schema may need a "rationale" or "selected-by" column on `tenders`.
- **Tracking event source** — real-time push (carrier APIs) vs polling vs internal events — undefined. Affects infra (webhooks vs polling jobs), not the schema.

### Cross-domain mechanics
- "Create order → auto-tender → appears in Shipments" — what's the exact UI sequence and timing? Optimistic update? Server round-trip?
- Does Tracking write events back to `events`, or only read?
- Where does the rating engine live (decides tender carrier ranking)? In-app stub or external service mock?

### Infra
- Reconfirm: local Supabase (Docker) for dev + cloud for prod, or revisit?
- Personal vs company Supabase account.
- How does the seeded faker generator (`apps/odyssey-one/tools/generate.mjs`) become a Supabase seeder? Direct inserts or `pg_dump`-style file?
- 10k records — generated once and persisted, or regenerated on every schema reset?

### Auth & access
- Authentication provider — Supabase Auth (email/password initially), or eventual Vercel/Odyssey SSO?
- RLS policy shape — single policy keyed on `auth.uid()` joining through `user_customer_assignments`, or per-table policies?
- Admin bypass mechanism — JWT claim, role check, or separate policy?

## When we resume

1. Re-read this file.
2. Re-read the (by then existing) docs for the other domains.
3. Audit the open-questions list — strike anything answered, add anything new.
4. Brainstorm Phase 1 scope only (read-only migration), produce a real spec at `docs/superpowers/specs/<date>-supabase-phase-1-design.md`.
5. Write an implementation plan via the `writing-plans` skill.
6. Execute Phase 1.

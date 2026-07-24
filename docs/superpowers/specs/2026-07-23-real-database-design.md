# Real Database + API Layer — Design

> **Date:** 2026-07-23 · **Status:** Approved (brainstorm with user)
> Supersedes the vendor choice in `docs/supabase-migration-plan.md` (Supabase → Neon; the C-pragmatic schema and phasing carry forward). The prototype graduates from local JSON to a server-backed data path so we can seed 10k+ rows, exercise real read/write latency, and keep shaping the schema.

## Goals

- Move the generated dataset out of `public/details/` JSONs into a real Postgres, 10k+ shipments with full relational integrity.
- Put our own API layer in front (shapes mimicking OdysseyONE's real contracts), never the DB in the browser.
- Real network latency visible in the existing TanStack Query loading states.
- Keep the data cheap to reshape: reproducible seed, drop-and-reseed ritual, no migration anxiety.
- Emulate login/user-management with seeded fake accounts later — **no SSO, no IT dependency** (user decision 2026-07-23).

## Non-goals (slice 1)

- No login enforcement (accounts seeded, unchecked), no RLS, no Supabase, no OIDC.
- No writes beyond the single first write slice.
- No ORM, no framework — SQL files + plain `pg`/Neon driver.

## Architecture

Same Vercel project (`odyssey-one-stage`), three pieces:

| Piece | Where | Notes |
|---|---|---|
| SPA | `apps/odyssey-one/` (unchanged Vite build) | Talks only to `/api` |
| API | `apps/odyssey-one/api/` Vercel Functions (file-based routes, plain Node) | Endpoint shapes mimic OdysseyONE contracts (grid, SellShipmentOut, order views, lookups) — what the S41-42 `live` services/mappers already expect |
| DB | Neon Postgres (Vercel Marketplace) | `DATABASE_URL` auto-injected; serverless HTTP driver; free tier suffices |

**Why Neon, not Supabase:** with our own API layer, Supabase's differentiators (PostgREST browser access, Auth/RLS) go unused; Neon is the most Vercel-native plain Postgres, with DB branching for schema experiments. The schema is vendor-free either way.

Local dev: `vercel dev` runs SPA + functions against real Neon.

## Schema

The parked plan's **C-pragmatic normalization** applied as numbered SQL files in `packages/db/migrations/` (`001_*.sql`, applied by a tiny script):

- Reference: `customers`, `carriers`, `locations`
- Operational: `users`, `user_customer_assignments`, `orders`, `shipments`, `stops`, `tenders`, `events`
- 5 JSONB columns on `shipments`: `cost_data`, `documents_data`, `instructions_data`, `notes_data`, `product_data`
- **`user_preferences`** (`user_id` FK, `key` text, `value` JSONB, `updated_at`; PK `(user_id, key)`) — one generic table absorbs per-user UI state as flows emerge (column arrangements, search profiles, home widget layout, selected customers, …). New preference kind = new `key`, no migration.

Column lists start from the plan-doc sketch and are refined against what the unified generator actually produces. **Data is NOT domain-siloed** — orders↔shipments↔tenders↔stops↔events are one relational web (S80 invariants preserved).

## Seeding

- The existing seeded generator (`tools/generate.mjs`, seed 42) remains the single source of truth for data shape.
- New `tools/seed.mjs`: runs the same generation logic scaled 2,200 → 10k+ shipments (+ related orders/tenders/stops/events/reference rows) and bulk-inserts into Neon. Also seeds the 9 accounts (guest + 8 mock users — see Auth model).
- **Reset ritual:** drop schema → apply migrations → reseed. Reproducibility makes schema reshaping free while prototyping.

## Cutover — by data path, not by screen

`VITE_API_MODE=live` + `VITE_API_BASE_URL=/api` activates the existing seam. Because Home widgets, route badges, and lists share the same hooks (S91), flipping a path flips every consumer at once — numbers stay consistent everywhere by construction.

| # | Path | Endpoint(s) | Flips together |
|---|---|---|---|
| 1 | Schema + full relational seed | — | (prerequisite) |
| 2 | Counts + grid | aggregate counts (`GROUP BY` panel/category/status, customer-scoped); paged/filtered grid | Home widgets + Shipments list/badges + Orders list/chips |
| 3 | Detail | SellShipmentOut detail | ShipmentsBar, order summary |
| 4 | Search | `/api/search?q=` — SQL `ILIKE` first, pg_trgm if slow | GlobalSearch (client value-index retires; debounce + stale-discard patterns already exist) |
| 5 | Customers/lookup | customers master + user assignments | TrailNav customer selection |
| 6 | First write | one mutation (e.g. shipment note) | write-latency UX |
| 7 | Fake login | `/api/login` (checks seeded accounts, returns token); API scopes queries via `user_customer_assignments` | login + user-management emulation, per-role data scoping |

Screens whose endpoints don't exist yet stay on mock — the seam is per-service, so mixed mode is clean.

## Auth model — guest + 8 mock users (user decision 2026-07-23)

- **Guest (default):** active with NO login — the app boots into it, behaving like today's prototype. **Read-only, enforced at the API layer** (writes return 403; UI hides/disables write affordances for guest). Guest preference changes stay client-side only (today's behavior); server-side guest preferences are the seeded defaults.
- **8 mock users:** activate via explicit login (`/api/login` against seeded credentials). Full write ability. Preferences + customer scoping persist server-side, making each user a reusable, hassle-free test scenario (mix of planners with differing customer assignments, a manager, an admin).
- No SSO / OIDC / IT involvement — fake accounts emulate the login and user-management features end-to-end.

## Latency & UX

Real network + real Postgres by default. One knob: optional `SIMULATED_DELAY_MS` env on the functions to exaggerate latency when deliberately studying loading/skeleton UX.

## Error handling

- Functions return contract-shaped errors (status + message); the `live` client path (`api/client.ts`) already surfaces failures to TanStack Query (`error` states).
- Seed/migration scripts fail loudly and are idempotent from a clean drop.

## Testing

- Existing service/mapper tests keep running against fixtures (contract shapes unchanged — that's the point of mimicking OdysseyONE).
- New: per-endpoint function tests with a test DB (or SQL-level assertions on the seeded invariants); the 9 generator invariants become seed-verification checks.

## Open questions (carry to implementation planning)

- Exact endpoint list/shapes to mimic first — derive from what `gridService`/`shipmentService`/`orderService`/`lookupService` call in `live` mode.
- Whether counts endpoints reuse the grid endpoint with an aggregate flag or stand alone.
- Where the migration-runner script lives (`packages/db` scripts vs `tools/`).

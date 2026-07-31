---
title: Tracking — Decision Log
domain: tracking
type: decision-log
tags: [tracking, decisions, data-model, api]
date: 2026-07-30
status: active
---

# Tracking — Decision Log

Decisions about the Tracking domain's data model and API seam. Cross-domain decisions live in `vault/40-decisions/`; Shipments decisions live in that domain's own log (referenced below as **Shipments [[decision-log]]**).

## Format

```
### TR-XX — <title>
**Decided:** YYYY-MM-DD
**Previous state:** what existed before
**Decision:** what was decided
**Rationale:** why
**Source:** session / stakeholder / artifact reference
**Affects:** components, files, or backlog items impacted
```

Decision IDs use the `TR-` prefix (Tracking).

> All decisions below rest on **one** real payload (page 43 of 18,971, 10 bundles). That is strong evidence for *existence* claims ("this shape is legal") and weak evidence for *universality* claims ("this is the only shape"). Each decision states which kind it is.

## Decisions

### TR-01 — Tracking identity is the triple `(documentId, organizationId, source)`; `trackingRequestReferenceNumber` is the message join key and is opaque
**Decided:** 2026-07-30
**Previous state:** No Tracking data model existed. Our Shipments model keys on a single id (`buy_shipment` user-facing / `sell_shipment` internal wire key, DEC-66 in Shipments [[decision-log]]).
**Decision:** A tracked document is identified by all three of `documentId` + `organizationId` + `source`. `documentId` alone is **not** unique. `trackingRequestReferenceNumber` is a separate, **opaque** key whose only guaranteed role is joining `shipmentData` to `trackingMessage[]` — it must never be constructed or parsed client-side.
**Rationale:** Observed directly: `S260006XKF` appears in its own `relatedShipments[]` under a different `organizationId` (`1000031` vs `2116`) and `source` (`ODM` vs `NN`) — same document id, different record. And `trackingRequestReferenceNumber` is the concatenation `documentId+source+organizationId` on only 2 of 10 documents; on the rest it is a carrier PRO or a provider shipment id (`694362879`, `90340145740120`). A derivation rule fitted to 2 of 10 rows would break in production.
**Source:** `vault-sources/10-domains/tracking/data/tracking-payload-page43-2026-07-30.json` (real API response, captured 2026-07-30); analysis in [[tracking-payload]] §2 and [[tracking-api-contract]] §3.
**Affects:** any future `tracking_*` schema in `packages/db/`, the API adapter layer, [[tracking-service-api]]. Contrasts with the single-id assumption in `packages/db/migrations/001_schema.sql`.

### TR-02 — Stop `sequence` is global and authoritative; array order is not
**Decided:** 2026-07-30
**Previous state:** Our stop model uses `stopSequence: number` (`apps/odyssey-one/src/api/types/sellShipmentOut.ts`), `stopNumber: number` (`apps/odyssey-one/src/api/types/shipmentDetail.ts`), `stops.sequence integer` (`packages/db/migrations/001_schema.sql`) — and consumers implicitly trust the array order they are handed.
**Decision:** `sequence` is a **string**, is **global across stop types** (`1..N` over the whole route, not `pickup 1..n` / `delivery 1..n`), and the **array order does not match it**. Every consumer sorts by `parseInt(sequence)` before rendering. We keep `integer` in our own schema and parse at the seam.
**Rationale:** Observed on `0200994650`: stops arrive in array order `[1, 4, 3, 2]` with a single pickup at sequence 1 and deliveries at 2, 3, 4. Rendering as delivered would show Boston before Providence before New Haven. This is a live defect class, not a theoretical one.
**Source:** `tracking-payload-page43-2026-07-30.json` bundle 9; [[tracking-payload]] §3.
**Affects:** `StopVM` mapping, Stops pane / details-modal ordering, any tracking timeline UI, the `stops` table read path.

### TR-03 — Real production data settles DEC-68: the aggregation/consolidation taxonomy is DESCRIPTIVE, not exhaustive; and it confirms invariant I3 / DEC-67
**Decided:** 2026-07-30
**Previous state:** **DEC-68** (Shipments [[decision-log]], same day) recorded Jana's vocabulary — *Aggregation* = 1 pickup + 1 delivery; *Consolidation* = >1 pickup **and** >1 delivery — and deliberately did **not** enforce it, because exhaustiveness was unconfirmed. A generator change forcing every multi-order shipment into one of the two patterns was written and reverted the same day, leaving 223 "mixed" shapes legal. DEC-68's stated open question: *"is the taxonomy an exhaustive partition, or the two common cases?"* Separately, **DEC-67** established that an order is picked up at exactly one stop and delivered at exactly one stop (invariant **I3** in `apps/odyssey-one/tools/generate.mjs`), with deliveries splitting like pickups.
**Decision:** Three findings, of different strength.
1. **The taxonomy is not exhaustive — settled.** Document `0200994650` (Afton Chemical, mode `TT/ISO`, carrier `TRAP`) is **1 pickup + 3 deliveries**. Under a strict reading it is neither Aggregation (needs 1 delivery) nor Consolidation (needs >1 pickup). It is real production data. **Mixed shapes are valid; the 223 mixed shapes in our seed are not defects; the reverted constraint stays reverted.** DEC-68's open question is answered in the direction DEC-68 hedged toward.
2. **DEC-67 / invariant I3 is confirmed — settled.** On `0200994650` the seq-1 pickup carries **all three** order references (`0082294413`, `0082294414`, `0082294415`) while each of the three deliveries carries **exactly one**. That is I3 verbatim: every order appears exactly twice across the stop list, once per side, and an order's ship-to is *its own delivery stop*, not the shipment's destination. Our seeded model matches production.
3. **The taxonomy itself — RESOLVED the same day, after this decision was written.** We hypothesised the dividing line was shared-lane rather than stop counts. The user put the question to **Rovo** against LINX/Odyssey domain documentation, which returned the actual model: **Consolidation is the UMBRELLA term** ("grouping of orders on a shipment"), with two subtypes — **Aggregation** (orders grouped by the *same O/D pair*) and **Multistop** (multiple pickup **and/or** delivery points). Our hypothesis was half right: Aggregation genuinely is same-O/D-pair, but Consolidation is the parent, not the contrast. Under the real model `0200994650` (1P/3D) is **Multistop**, and so is a 2-pickups→1-consignee milk run — the *and/or* is what makes both fit. Every shape we seed is classifiable; nothing is unnamed; **no constraint is needed or wanted.** See the rewritten DEC-68.

**Rationale:** DEC-68 explicitly declined to enforce the taxonomy because it was "not established that no other shape is valid" and reasoned that "a milk run collecting from two shippers for one consignee is ordinary freight." One page of real tracking data produces the mirror-image shape (one shipper → three consignees) in a live load. Speculation is now evidence. Enforcing the taxonomy would have made valid production freight unrepresentable.
**Question, now ANSWERED:** *does "2 pickups → 1 consignee" count as consolidation?* **Yes — specifically a Multistop consolidation.** (Rovo, LINX/Odyssey domain docs, 2026-07-30.) Follow-on: the consolidation XML carries a `SubShipmentList` with a `PickupSequence` and `DropoffSequence` per sub-shipment — an authoritative order↔stop binding we have never seen and should obtain.
**Source:** `tracking-payload-page43-2026-07-30.json` bundle 9 (`0200994650` + siblings `0082294413/14/15`), real production API response captured 2026-07-30. Prior context: DEC-67, DEC-68 (Shipments [[decision-log]], 2026-07-30, from Jana via the user, S103).
**Affects:** `apps/odyssey-one/tools/generate.mjs` invariant header (the "NOT an invariant" note on the taxonomy — now backed by external evidence, still not enforced), DEC-68's open question, any future stop-shape validation. **No code change follows from this decision** — it removes a reason to change code.

### TR-04 — Timezones are stored as IANA identifiers; abbreviations are derived for display only
**Decided:** 2026-07-30
**Previous state:** `apps/odyssey-one/tools/data-pools.mjs:208` maps city → 3-letter abbreviation (`CST`, `EST`, `MST`, `PST`) via `CITY_TIMEZONES`/`deriveTimezone`, and `packages/db/migrations/001_schema.sql` stores pre-formatted display strings like `'MM/DD/YYYY HH:MM CST'`.
**Decision:** Stop timezones are **IANA** (`America/New_York`) and that is what we store. The 3-letter abbreviation becomes a *derived display value* computed from IANA + the instant, never the stored truth. On ingest, all message timestamps are normalized to an absolute instant.
**Rationale:** Every one of the 22 observed stops carries an IANA `timeZone`. Our abbreviations are both non-standard for the wire and **wrong about DST** — we emit `CST` for a July date, which is `CDT`. Separately, message timestamps arrive in four incompatible notations in the same field (`UTC`, `GMT`, `Z`, `-04:00`, `-05:00`, `-07:00`), and `occurredLocation.timeZone` mixes IANA with abbreviations. Only normalization to an instant makes events sortable.
**Rationale (secondary):** this is the highest-leverage single fix in the divergence table — it is a correctness bug in our current seed, independent of Tracking.
**Source:** [[tracking-payload]] §3, §5; [[tracking-api-contract]] §4, §6.5.
**Implemented:** 2026-07-30. `CITY_TIMEZONES` now maps city → IANA zone; `tzAbbrev(zone, date)` derives the DST-correct abbreviation via `Intl.DateTimeFormat`; generator stops carry an IANA `timeZone` field mirroring the real contract. Verified over 5109 seeded stops: 0 missing a zone, **0 summer dates rendering standard time** (was 100% before), and `America/Phoenix` correctly stays MST year-round. NOTE the split that survives: shipment/tracking stops store IANA, but the ORDER wire's paired field is `*TimeZoneCode` and legitimately wants the abbreviation — `PickupDeliverySection` now derives that code per-field from the party city AND that field's own date.
**Affects:** `apps/odyssey-one/tools/data-pools.mjs`, seeded display strings, `packages/db/migrations/001_schema.sql`, any future event ordering. **Documentation-only for now — no code changed under this decision.**

### TR-05 — `visible: false` references are search aliases: filtered from UI, retained for search
**Decided:** 2026-07-30
**Previous state:** No reference-visibility concept anywhere in our model. We carry `pro`, `bolNo`, `poNumber` as flat columns/fields.
**Decision:** Every reference carries a `visible` boolean. **UI lists render only `visible: true`; the search index consumes all of them.** The filter belongs in the API adapter, not in individual components. Reference types are an **open list** (9 business types + 3 alias types in a single page) and get a `references` table/jsonb keyed by `(level, type, value, visible)` — not a column per type.
**Rationale:** All 16 `visible: false` references observed are `CR_*` types that are literal string transforms of a visible sibling (`CR_REF_NO_DASH_REMOVE`: `SO-40614628` → `SO40614628`; `CR_ORDER_NO_ZEROS`; `CR_REF_NO_REMOVE_LAST`; `CR_ORDER_NUMBER`). Their purpose is matching typed variants in search *(inferred, but the naming makes it near-certain)*. Rendering them would show users duplicated, mangled order numbers. Conversely, dropping them at ingest would silently degrade search — the exact scenario GS-01 in [[decision-log]] (GlobalSearch) is built around: cross-customer lookup by reference number.
**Source:** [[tracking-api-contract]] §5; [[tracking-payload]] §2.
**Affects:** future tracking schema, the API adapter, GlobalSearch indexing ([[global-search]]), any reference-display component.

### TR-06 — Tracking events are a first-class entity we do not have; they bind to stops by `stopSequence` ONLY when `stopType` is lowercase
**Decided:** 2026-07-30
**Previous state:** `packages/db/migrations/001_schema.sql` has an `events` table — `{type, message, actor, occurred_at, data}` — which is a **shipment audit/history log**. No carrier telemetry exists in our model at all; the generator produces none.
**Decision:** Carrier tracking events are a **separate entity** from the audit log: different producer (carrier/provider, not a user), different lifecycle, different volume (3–30 per document, 86 across 10). They get their own table joined on the tracking-request key — the audit `events` table is **not** overloaded. Event binding to stops follows one rule: **join `trackingMessage.stopSequence` to `stops[].sequence` only when `trackingMessage.stopType` is lowercase `pickup`/`delivery`.** Uppercase `TERMINAL`/`DESTINATION` events are carrier-network telemetry and render on the timeline **without** a stop anchor.
**Rationale:** `P44_LTL` emits `stopSequence` values 3–9 with `stopType: TERMINAL` on documents whose `stops` array holds only **2** stops — those index the carrier's terminal network, not our route. A naive join attaches a terminal hop to the wrong stop or to a stop that does not exist. Additionally: the `stops` array **on the message** is empty (`[]`) on all 38 occurrences and binds nothing — it must not be built against, despite being the obvious-looking field. And event state must be read from **both** `messageType` and `code`, which are near-complementary rather than redundant (35 of 36 `LOCATION_UPDATE` rows carry no `code`; 22 rows carry a `code` and no `messageType`).
**Source:** [[tracking-api-contract]] §6, §6.4; [[tracking-payload]] §5.
**Affects:** `packages/db/migrations/` (new table when Tracking activates), tracking timeline UI, [[tracking-service-api]]. Note there is **no overall status field** on `shipmentData` — current state must be derived from the latest event, which makes this entity load-bearing rather than decorative.

### TR-07 — `mode` is open text, not an enum; stop-splitting must key on stop count, not on mode
**Decided:** 2026-07-30
**Previous state:** Our mode vocabulary is `TL, LTL, RR, IMD, AIR`, and `apps/odyssey-one/tools/generate.mjs:511` / `:555` branch on `mode === 'TL'` to decide whether pickups and deliveries may split across multiple stops (per David's "LTL = 2 stops only", `project_mode_definitions`).
**Decision:** Treat `mode` as **open text**. Add `TT/ISO` to our pool. Move multi-stop capability off a `mode ===` check onto the actual stop count.
**Rationale:** `TT/ISO` (3 of 10 documents) is not in our vocabulary, and its slashed compound form breaks any enum or exact-match branch. More importantly, the 1-pickup/3-delivery load in TR-03 **is** a `TT/ISO` document — under our current logic, a non-`TL` mode can never split its stops, so we could not represent a real production load that exists today. The `equipmentCode` on it is `TTC` (tank truck / chemical), also outside our pool.
**Caveat:** this does **not** invalidate David's LTL rule. All 7 observed `LTL` documents have exactly 2 stops, which is consistent with it. The change is that mode must stop being the *gate* on capability.
**Source:** [[tracking-payload]] §6 row 3; [[tracking-api-contract]] §3. Conflicts with nothing in existing canon — extends `project_mode_definitions`.
**Affects:** `apps/odyssey-one/tools/generate.mjs` (stop-split branches), `apps/odyssey-one/tools/data-pools.mjs` (mode + equipment pools), mode filter vocabularies. **Documentation-only — no code changed.**

### TR-08 — A single physical movement can appear as N+1 tracked records; counts must dedupe the `relatedShipments` graph
**Decided:** 2026-07-30
**Previous state:** `packages/db/migrations/001_schema.sql` models `shipments.orders text[]` — a one-way order list. No concept of a shipment relating to another shipment, and no notion that a record count might overstate reality.
**Decision:** `relatedShipments[]` is a **bidirectional edge list with two distinct semantics** and **no discriminator field**: (a) *sibling documents* — the orders riding a master load (same org, same source); (b) *cross-system alias* — the same `documentId` under a different `organizationId`/`source`. We model it as edges with an explicit `relation` discriminator we derive ourselves, and **dedupe the graph before any count or KPI**.
**Rationale:** `0200994650` lists its three orders, and `0082294414` lists `0200994650` back — each order is also a standalone tracked document with its own `loadId` and its own duplicate stop pair. So one trailer moving from Sparta NJ to three consignees surfaces as **four** records. `totalRecords: 18971` therefore does not equal 18,971 distinct movements. Any "shipments tracked" figure built on the raw count is inflated by an unknown factor.
**Status:** the *existence* of both patterns is **observed**; the claim that the graph is always bidirectional, and the magnitude of the inflation, are **inferred from 7 documents** and listed as open in [[tracking-payload]] §7. Flagged early because it silently corrupts metrics rather than failing loudly.
**Source:** [[tracking-payload]] §4; [[tracking-api-contract]] §7.
**Affects:** any tracking list/count surface, Home-domain widgets that would show a tracking count, future tracking schema.

---

## Changelog

| Date | Decisions added |
|---|---|
| Jul 30, 2026 | TR-01 through TR-08 — first Tracking canon, synthesized from one real production API response (page 43/18,971). TR-03 reconciles Shipments DEC-67 / DEC-68. |

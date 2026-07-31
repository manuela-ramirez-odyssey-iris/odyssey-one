---
title: Tracking Domain — Map of Content
domain: tracking
type: moc
tags: [moc, tracking, api, data-model]
date: 2026-07-30
status: active
---

# Tracking — Map of Content

The Tracking domain follows a shipment **after** it leaves: carrier telemetry, stop arrivals, ETAs, delivery confirmation. It is the one domain where the data is not ours — it arrives through provider integrations (project44, FourKites, Kleinschmidt EDI 214) and we aggregate.

**Status:** documentation only. No Tracking UI is built in `apps/odyssey-one/` — the route is a placeholder stub. Tracking's production UI is **Angular** and its eng owner is **Irina Jachimek** ([[api-endpoints-and-owners]]); whether we build a React client at all is unsettled.

## Canon

- **[[tracking-payload]]** — the domain canon. Stop model, order↔stop relationship, tracking-event lifecycle, pagination, identity/reference model, and the **divergence table** (real payload → our current equivalent → recommended action). *Start here.*
- **[[tracking-api-contract]]** (`data/`) — field-by-field schema with cardinality, plus every observed value for `referenceType` (12), `messageType` (6 + absent), `code` (11), `stopType` (4, two vocabularies), `mode`, `source`, `explanationCode`.
- **[[decision-log]]** (`decisions/`) — `TR-` prefixed decisions, TR-01 → TR-08.

## Cross-cutting

- **[[tracking-service-api]]** — the API-integration cross-reference, beside [[shipment-service-api]] / [[order-service-api]] / [[carrier-service-api]]. Endpoint surface, provider layer, auth gaps.
- **[[api-endpoints-and-owners]]** — service/ownership matrix. Tracking's row is empty: no service, no API surface, no PO.

## Decisions at a glance

| ID | Decision |
|---|---|
| TR-01 | Identity is the triple `(documentId, organizationId, source)`; `trackingRequestReferenceNumber` is an opaque join key |
| TR-02 | Stop `sequence` is global and authoritative; **array order is not** — always sort |
| TR-03 | Real data settles DEC-68: the aggregation/consolidation taxonomy is **descriptive, not exhaustive**; confirms DEC-67 / invariant I3 |
| TR-04 | Timezones stored as IANA; 3-letter abbreviations are derived display only |
| TR-05 | `visible: false` references are search aliases — hidden in UI, indexed for search |
| TR-06 | Tracking events are a first-class entity we lack; bind to stops only on lowercase `stopType` |
| TR-07 | `mode` is open text (`TT/ISO` exists); stop-splitting keys on stop count, not mode |
| TR-08 | One movement can surface as N+1 records — dedupe `relatedShipments` before any count |

## Relationships to other domains

- **Shipments** — closest neighbour. TR-03 reconciles this domain's evidence with DEC-67/DEC-68 in the Shipments decision log; the payload independently **confirms** Shipments invariant I3 (`apps/odyssey-one/tools/generate.mjs`). Divergences in [[tracking-payload]] §6 are largely *Shipments* schema fixes.
- **GlobalSearch** — TR-05's hidden `CR_*` aliases exist for exactly the cross-customer reference lookup GlobalSearch is built around ([[global-search]]).
- **Home** — a "shipments tracked" widget would be inflated by the TR-08 record-duplication effect.

## Sources

- `vault-sources/10-domains/tracking/` — raw artifacts (the 2026-07-30 production payload, 199KB, page 43/18,971). Archived 2026-07-30 as `tracking-payload-page43-2026-07-30.json`.
- `screenshots/` — Tracking line UI capture.

## Open / TBD

Consolidated in [[tracking-payload]] §7 and [[tracking-service-api]]. The three that block the most:

1. **The endpoint is undocumented** — verb, path, request/filter contract all unknown.
2. **`totalLoads: 0`** against 18,971 records — unexplained.
3. **Is the taxonomy lane-based?** One sentence to Jana: *does "2 pickups → 1 consignee" count as consolidation?* (TR-03 open hypothesis — **ours, not Jana's**.)

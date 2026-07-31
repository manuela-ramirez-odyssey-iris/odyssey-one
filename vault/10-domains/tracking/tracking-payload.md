---
title: Tracking Payload — Domain Canon
domain: tracking
type: canon
tags: [tracking, api, data-model, stops, events, pagination]
date: 2026-07-30
status: active
---

# Tracking Payload — Domain Canon

> **Source:** one real Tracking-domain API response captured 2026-07-30 (`vault-sources/10-domains/tracking/data/tracking-payload-page43-2026-07-30.json`). Page **43 of 18,971 records**, `pageSize` 10 → 10 bundles, 22 stops, 110 references, 86 tracking messages.
>
> **Evidence status:** this is a SINGLE sample of REAL PRODUCTION data. Everything below marked *(observed)* is read directly off the payload; *(inferred)* is our reading of a field from its name/shape and is unconfirmed. One page cannot establish enumerations as closed — treat every value list as "observed so far", not "the enum".
>
> Field-level schema lives in [[tracking-api-contract]]. Decisions live in [[decision-log]] (this domain's, `TR-` prefix). Service cross-reference: [[tracking-service-api]].

## 1. Envelope & pagination model

```
{ pageNumber, pageSize, totalRecords, totalLoads, bundles[] }
```

*(observed)* `pageNumber: 43`, `pageSize: 10`, `totalRecords: 18971`, `totalLoads: 0`.

- Page-number pagination (not cursor). Same family as the Shipments/Orders grid envelope documented in [[shipment-service-api]] — but the count field is named **`totalRecords`**, where shipment/order services use `totalCount`. Three different names for one concept across three services.
- **`totalLoads: 0` while `totalRecords: 18971`** — unresolved. It is not "number of loads on this page" (10 bundles all carry a `loadId`). Best *(inferred)* reading: a second aggregate counted under a different definition (distinct loads matching the query) that this endpoint/filter did not populate. See **Open / TBD**.
- No `hasNext`, no `totalPages`, no sort echo. *(observed absence — one page cannot prove a field never appears.)*

### The bundle
```
bundles[] = { shipmentData, trackingMessage[], documentCount }
```
A bundle is **one tracked document plus its event stream**. `documentCount` was `0` on all 10 *(observed)* — attached-document count, feature present but empty in this sample *(inferred)*.

## 2. Identity & reference model

### The identity triple
A tracked document is identified by **`(documentId, organizationId, source)`** — not by `documentId` alone. *(observed, and load-bearing:* `S260006XKF` appears as its own `relatedShipments` entry under a *different* `organizationId` (`1000031` vs `2116`) and a different `source` (`ODM` vs `NN`). Same document id, different system → different record.*)*

| Key | Example | Meaning |
|---|---|---|
| `documentId` | `0200994650`, `SO-40614628`, `PO-424014` | Source-system document number. Format varies wildly by customer — do **not** pattern-match it. |
| `organizationId` | `3051`, `10020`, `1000031` | Owning org/tenant. Numeric string. |
| `source` | `NN` (all 10), `ODM` (in `relatedShipments`) | Source system code. |
| `loadId` | `ODY00447684` | **Odyssey's own load id** — `ODY` + 8 digits. The one identifier that looks like ours. |
| `trackingRequestReferenceNumber` | `SO-40614628NN10020`, `694362879`, `90340145740120` | **The join key between `shipmentData` and `trackingMessage[]`.** Sometimes the literal concatenation `documentId + source + organizationId`, sometimes a carrier PRO or provider shipment id. Treat it as opaque. |

> **Do not derive** `trackingRequestReferenceNumber` from the triple. It matches the concatenation on 2 of 10 documents *(observed)* and is something else entirely on the rest.

### `references[]` — two levels, one shape
The same `{ referenceType, referenceValue, visible }` object appears at **shipment level** (42 seen) and **per stop** (68 seen). All three keys always present *(observed)*.

- Shipment-level references are the document's own identifiers.
- **Stop-level references are the order↔stop binding.** See §3.
- **`visible: false` marks a derived search alias, not a business reference** *(inferred, strongly)*. Every `visible: false` value observed is a `CR_*` type whose name describes a string transform of a visible sibling: `CR_REF_NO_DASH_REMOVE` (`SO-40614628` → `SO40614628`), `CR_REF_NO_REMOVE_LAST`, `CR_ORDER_NO_ZEROS`, `CR_ORDER_NUMBER`. They exist so a search index matches typed variants. **UI must filter `visible: false` out of any reference list; search must keep them.**

## 3. Stop model

A stop *(observed — all 14 keys present on all 22 stops, except `references` on 18/22)*:
`stopType, sequence, name, addressLine1, city, state, country, postalCode, startAppointmentTime, endAppointmentTime, latitude, longitude, timeZone, references[]`

Four properties matter more than the field list:

1. **`sequence` is a STRING, and it is GLOBAL across stop types.** `"1".."N"` over the whole route, not `pickup 1, pickup 2 / delivery 1, delivery 2`. *(observed on `0200994650`: pickup=1, deliveries=2,3,4.)*
2. **Array order does NOT match sequence order.** `0200994650` ships its stops as `[1, 4, 3, 2]`. **Any consumer must sort by `parseInt(sequence)` before rendering.** *(observed — this is a live bug waiting to happen.)*
3. **`timeZone` is an IANA identifier** — `America/New_York` *(observed, all 22)*. Not a 3-letter abbreviation.
4. **No `orderIds[]`.** Orders bind to stops through `references[]` (§4).
5. Every stop carries `latitude`/`longitude` as **strings** *(observed)* — map-ready without geocoding.
6. `startAppointmentTime` / `endAppointmentTime` are naked local datetimes (`2026-07-28T05:00:00`, no offset) to be read in the stop's `timeZone` *(inferred — the pairing is the only sane reading)*. On all 22 stops the two are **identical**, so no appointment *window* is exercised in this sample.

## 4. Order ↔ stop relationship — the core finding

**`0200994650`** (Afton Chemical, mode `TT/ISO`, carrier `TRAP`, equipment `TTC`) is **1 pickup + 3 deliveries**:

| seq | type | facility | city | orders bound via stop `references[]` |
|---|---|---|---|---|
| 1 | pickup | AFTON CHEMICAL CORPORATION C/O HENIFF TRANSPORTATI | SPARTA NJ | `0082294413`, `0082294414`, `0082294415` — **all three** |
| 2 | delivery | SHELL OIL PRODUCTS US | NEW HAVEN CT | `0082294413` |
| 3 | delivery | SHELL OIL PRODUCTS US | PROVIDENCE RI | `0082294414` |
| 4 | delivery | SHELL OIL PRODUCTS US C/O ENERGY TRANSFER | BOSTON MA | `0082294415` |

Each order appears at each stop as a **pair** of references: `TRACKING_NUMBER` (`visible: true`) and `CR_ORDER_NUMBER` (`visible: false`) carrying the same value.

**This is exactly our invariant I3** (`apps/odyssey-one/tools/generate.mjs`, invariant header): *every order is picked up at exactly one stop and delivered at exactly one stop*. The pickup legitimately lists all three; each delivery lists exactly one. Real production data confirms the invariant we already seed against. See [[decision-log]] TR-03.

### `relatedShipments[]` has TWO distinct meanings
Present on 7 of 10 documents *(observed)*. Same shape both times — `{documentId, organizationId, source}` — but two semantics:

| Pattern | Example | Reading |
|---|---|---|
| **Sibling documents** | `0200994650` → `0082294413/14/15` (same org `3051`, same source `NN`) | The orders riding the master load. |
| **Cross-system alias** | `S260006XKF` → `S260006XKF` **org `1000031`, source `ODM`** | The *same* document as it exists in another system. |

The graph is **bidirectional** *(observed)*: `0082294414` lists `0200994650` back. So each order also exists as its own standalone tracked document with its own `loadId` (`ODY00447612`) and its own 1-pickup/1-delivery stop pair, duplicating the master's seq-1 and seq-3 stops.

> **Consequence for us:** a single physical movement can surface as **N+1 records** in a tracking list (the master + one per order). `totalRecords: 18971` therefore does not equal 18,971 distinct movements. Any count, dedupe, or "shipments tracked" metric must collapse the `relatedShipments` graph first. *(inferred from the observed bidirectional pairs — worth confirming, it changes every KPI.)*

## 5. Tracking-event lifecycle

86 messages across 10 bundles — **3 to 30 per bundle** *(observed)*. Messages join to `shipmentData` on `trackingRequestReferenceNumber` (present on all 86).

### Two overlapping vocabularies
Each message can carry a coarse **`messageType`** and/or a fine EDI-style **`code`**:

- `messageType` *(observed, 64 of 86; the key is simply **absent** on the other 22 — absent, never `null`)*: `LOCATION_UPDATE` (36), `AT_STOP` (14), `IN_TRANSIT` (6), `COMPLETED` (5), `OUT_TO_STOP` (2), `INFO` (1).
- `code` *(observed, 51 of 86)*: `X2 EtaAtConsignee`, `X1 DlvryArvLoc`, `P1 DepartTermLoc`, `D1 Delivered`, `AF PickedUp`, `L1 Loading`, `X3 PickUpArvLoc`, `X6 EnRoute`, `AA PickupAppt`, `AB DeliveryAppt`, `ME Memo`. **These are EDI 214 status codes** *(inferred — the code/short-description pairs match the EDI 214 standard set)*.
- Neither is reliably present: 35 messages are `LOCATION_UPDATE` with no `code`; 22 have a `code` with no `messageType`. **A lifecycle state machine must consume both.**

`longDescription` is `<canonical text> (<carrier free text>)` — e.g. `Completed Unloading at Delivery Location (Picked Up in LEES SUMMIT, MO)`. The parenthetical is duplicated in the separate `comment` field *(observed on all 17 with `comment`)* — **read `comment`, do not parse `longDescription`.**

### How events bind to stops — and where it breaks
- **`stops[]` on a message is ALWAYS `[]`** *(observed — 38 occurrences, every one empty)*. It binds nothing today. **Do not build against it.** (This corrects the working assumption that `stops` was the binding.)
- Binding is via **`stopSequence`** (string, 50 of 86) plus **`stopType`** (29 of 86).
- **`stopType` on a message uses a DIFFERENT vocabulary than on a stop.** Stops use `pickup` / `delivery` (lowercase). Messages use `pickup` / `delivery` **and** `TERMINAL` / `DESTINATION` (uppercase) — the latter only from `provider: P44_LTL` *(observed)*.
- **Carrier-network sequences do not index our stops.** `P44_LTL` messages carry `stopSequence` `3..9` with `stopType: TERMINAL` on documents whose `shipmentData.stops` has only **2** stops. Those are the carrier's internal terminal hops, not our route.

> **Rule** *(inferred, but forced by the data)*: `stopSequence` is only joinable to `shipmentData.stops[].sequence` when `stopType` is lowercase `pickup`/`delivery`. Uppercase `TERMINAL`/`DESTINATION` events are carrier-network telemetry and must render on a timeline **without** a stop anchor. Joining blindly will attach a terminal hop to the wrong stop or to a stop that does not exist.
- Boolean flags `pickup: true` / `delivery: true` appear mutually exclusively (7 and 8) *(observed)* — a coarser "which leg" hint, redundant with `code` on every row seen.

### Time is a mess and must be normalized on ingest
Every message timestamp is `{datetime, timezone}` — and the `timezone` slot mixes **four incompatible notations** *(observed)*: `UTC` (136), `-04:00` (44), `GMT` (38), `-05:00` (26), `-07:00` (12), `Z` (2). Meanwhile stops use IANA, and `occurredLocation.timeZone` mixes IANA (`America/New_York`, `America/Chicago`) with abbreviations (`CDT`). Four timestamp fields per message: `timeOccurred` (the event), `messageReceived`, `messageGenerated`, `eta`.

**Ordering must key on `timeOccurred` normalized to an absolute instant.** Never sort on the raw string.

### `occurredLocation` is polymorphic
Usually a lat/long/city/state point (79 of 83). But on 9 messages it is a **full stop object** — carrying `stopType`, `sequence`, `references[]`, `name`, `addressLine1`, `startAppointmentTime`, `endAppointmentTime` *(observed)*. Same key, two shapes. A typed client must union them.

## 6. Divergence table — real payload vs our current model

Grounded in `apps/odyssey-one/src/api/types/sellShipmentOut.ts`, `apps/odyssey-one/src/api/types/shipmentDetail.ts`, `packages/db/migrations/001_schema.sql`, `apps/odyssey-one/tools/generate.mjs`, `apps/odyssey-one/tools/data-pools.mjs`.

| # | Real payload | Our current equivalent | Divergence | Recommended action |
|---|---|---|---|---|
| 1 | `stops[].sequence` — **string**, global 1..N, **array order ≠ sequence order** | `SellShipmentStop.stopSequence: number` (`sellShipmentOut.ts:120`); `StopVM.stopNumber: number` (`shipmentDetail.ts:72`); `stops.sequence integer` (`001_schema.sql`) | Type (string vs number); we implicitly trust array order | Keep `integer` in DB — **parse at the seam**. Add an explicit `ORDER BY sequence` on read and a sort in the mapper. Never render `stops[]` as delivered. |
| 2 | `stops[].timeZone` = **IANA** `America/New_York` | `CITY_TIMEZONES` emits 3-letter `CST/EST/MST/PST` (`data-pools.mjs:208-220`); display strings `'MM/DD/YYYY HH:MM CST'` (`001_schema.sql` shipments) | We emit abbreviations that are ambiguous and **ignore DST** (`CST` in July is wrong — it is `CDT`) | Store IANA. Keep the abbreviation as a *derived display* value computed from IANA + instant, not as the stored truth. Highest-value single fix. |
| 3 | `mode` = `LTL`, **`TT/ISO`** | Our pool: `TL, LTL, RR, IMD, AIR`; `generate.mjs:511/555` branches on `mode === 'TL'` for stop splitting | `TT/ISO` does not exist in our vocabulary; a slashed compound breaks any enum. Our stop-count logic is **keyed on a mode string we do not fully know** | Treat `mode` as **open text**, not an enum. Move stop-splitting off `mode === 'TL'` onto actual stop count. Add `TT/ISO` (tank truck / ISO container) to the pool. |
| 4 | Order↔stop via `stops[].references[]` (`TRACKING_NUMBER` + hidden `CR_ORDER_NUMBER`) | `SellShipmentStop.orderIds?: string[]`; `StopVM.orderIds: string[]` | Ours is a clean array; theirs is a typed reference bag needing extraction and dedupe of the visible/hidden pair | Keep `orderIds[]` as our internal shape — it is better. Add an **adapter** that extracts `visible:true` `TRACKING_NUMBER`/`CR_ORDER_NUMBER` values into it. Document the adapter as the seam. |
| 5 | 9 `referenceType` values, 2-level, with a `visible` flag | No reference-type vocabulary in the schema; `pro`, `bolNo`, `poNumber` are **flat columns** on `shipments`/order types | We model 3 references as named columns; reality is an open typed list that grew to 9 in one page | Add a `references` table/jsonb (`level`, `type`, `value`, `visible`) instead of adding a column per type. Keep the hot ones (`pro`, `bol`) as generated columns for indexing. |
| 6 | Pagination `{pageNumber, pageSize, totalRecords, totalLoads}` | Shipments/Orders envelope uses `totalCount` ([[shipment-service-api]], [[order-service-api]]) | **Three services, three count field names.** `totalLoads` has no analogue at all | Normalize at our API layer to one envelope. Do not leak three names into the FE. Ask what `totalLoads` counts before mirroring it. |
| 7 | `trackingMessage[]` — 86 events, dual vocabulary, 4 timestamps, lat/long | `events` table exists (`001_schema.sql`) but is `{type, message, actor, occurred_at, data}` — a **shipment audit/history log**, not carrier telemetry. No tracking events are generated at all | **The biggest gap.** Tracking events are a first-class entity we do not have. Either add `tracking_events` (own table, joined on the tracking-request key) or explicitly widen `events`. Do **not** overload the audit log — different producer, different lifecycle, different volume (30 rows per document). |
| 8 | `visible: false` on 16 of 110 references | No concept | Rendering the raw list would show users duplicated, mangled order numbers | Filter `visible:false` from every UI list; index them for search. Bake the filter into the adapter, not each component. |
| 9 | `permalink: "signature=6f08cecc"` | No concept | A signed share token — the mechanism for external/carrier-facing tracking links | Treat as opaque, **never** construct it client-side. Confirm base URL, TTL, and whether it authorizes unauthenticated access before exposing it anywhere. Security-relevant. |
| 10 | `relatedShipments[]` — bidirectional, two semantics (sibling orders / cross-system alias) | No concept. Our `shipments.orders text[]` is a one-way order list | Their record graph can double-count a single movement | Model as an edge list with an explicit `relation` discriminator. Dedupe before any count. |
| 11 | `loadId` = `ODY00447684` | `shipments.sell_shipment` / `buy_shipment` (DEC-66) are our ids; `load` / `load_count` are display text | `ODY…` is a real Odyssey load key that our schema has no typed home for | Add `load_id` as a first-class column — it is the likeliest real join key to Odyssey systems. |
| 12 | `PASSTHRU$*` keys, `providerMetaData`, `TIVE tracker` on `shipmentData` | No concept | Provider passthrough sprayed into the top-level object as arbitrary keys, including a **`$`-containing key and a key with a space** | Never model as fixed fields. Collect unknown top-level keys into a `passthrough jsonb`. Ensure our client does not assume a closed key set. |

## 7. Open / TBD

1. **`totalLoads: 0`** — what does it count, and why zero against 18,971 records? Blocks mirroring the envelope.
2. **`documentCount: 0`** on all 10 — is the document feature live, or unpopulated for these customers?
3. **Is `relatedShipments` really bidirectional in all cases**, or only for the `NN`-sibling pattern? Determines whether dedupe can be one-directional.
4. **Do the sibling order-documents duplicate the master in list counts?** If yes, every "N shipments tracked" figure in the UI is inflated.
5. **`permalink`** — full URL form, TTL, auth semantics. Do not expose until answered.
6. **`explanationCode`** — only `NS` (36) and `NA` (2) observed, on 38 of 86. Vocabulary and meaning unknown; `NS`/`NA` read as "not specified"/"not available" *(inference, low confidence)*.
7. **`source` vocabulary** — only `NN` in `shipmentData`, `ODM` seen inside `relatedShipments`. Full list unknown.
8. **Is there a status field?** No overall tracking status on `shipmentData` — current state must be **derived** from the latest `trackingMessage`. Confirm whether a status is served elsewhere or whether derivation is the contract.
9. **Appointment windows** — `start`/`end` identical on all 22 stops. Does the field pair ever express a real window?
10. **`TIVE tracker`** (null on 4) — a key with a space, IoT device reference *(inferred from the vendor name)*. Confirm before modeling.

## Conflicts with existing vault canon

None found. This payload is the first Tracking-domain data artifact; it **corroborates** rather than contradicts the Shipments canon — specifically invariant I3 and DEC-67 in [[decision-log]] (Shipments). Its bearing on DEC-68's aggregation/consolidation taxonomy is reconciled in TR-03 of this domain's [[decision-log]]. The user is the merge authority on any conflict later surfaced.

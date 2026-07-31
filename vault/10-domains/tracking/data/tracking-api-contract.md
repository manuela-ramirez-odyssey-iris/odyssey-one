---
title: Tracking API Contract — Field-by-Field Schema
domain: tracking
type: spec
tags: [tracking, api, schema, contract, reference-types]
date: 2026-07-30
status: active
---

# Tracking API Contract — Field-by-Field Schema

> Derived from ONE real response: page 43/18,971, 10 bundles, 22 stops, 110 references, 86 tracking messages (`vault-sources/10-domains/tracking/data/tracking-payload-page43-2026-07-30.json`, 2026-07-30).
>
> **Cardinality is measured against this sample only.** `always` = present on 100% of observed instances at this sample size — it is evidence, not a guarantee. Narrative model in [[tracking-payload]]; divergences and recommended actions live there too. Service placement in [[tracking-service-api]].

## Legend

| Mark | Meaning |
|---|---|
| **always** | present on every observed instance |
| **optional** | key absent on some instances |
| **nullable** | key present with value `null` |
| *(inf)* | meaning inferred from name/shape — unconfirmed |

## 1. Envelope

| Field | Type | Cardinality (n=1 response) | Notes |
|---|---|---|---|
| `pageNumber` | int | always | `43`. 1-based *(inf)*. |
| `pageSize` | int | always | `10`; matches `bundles.length`. |
| `totalRecords` | int | always | `18971`. |
| `totalLoads` | int | always | `0` — semantics unknown, see [[tracking-payload]] Open/TBD. |
| `bundles` | array | always | 10 entries. |

## 2. `bundles[]`

| Field | Type | Cardinality | Notes |
|---|---|---|---|
| `shipmentData` | object | always | §3 |
| `trackingMessage` | array | always | §6. 3–30 entries (86 total). Never empty in this sample. |
| `documentCount` | int | always | `0` on all 10. Attached-document count *(inf)*. |

## 3. `shipmentData`

n = 10.

| Field | Type | Cardinality | Observed |
|---|---|---|---|
| `documentId` | string | **always** (10/10) | `SO-40614628`, `O319058290`, `S260006XKF`, `PO-424014`, `0200994650`, `0082294414` — no common format. |
| `organizationId` | string | **always** (10/10) | `10020`, `7420`, `2116`, `3051`, `1000031` — numeric string. |
| `source` | string | **always** (10/10) | **`NN`** ×10. (`ODM` observed only inside `relatedShipments`.) |
| `loadId` | string | **always** (10/10) | `ODY00447612`…`ODY00447684`. |
| `trackingRequestReferenceNumber` | string | **always** (10/10) | Join key to `trackingMessage[]`. Sometimes `documentId+source+organizationId`, sometimes a PRO/provider id. Opaque. |
| `mode` | string | **always** (10/10) | **`LTL`** (7), **`TT/ISO`** (3). |
| `customer` | string | **always** (10/10) | Display name, not an id: `DuBois Chemicals`, `Clariant`, `SONNYS`, `Afton Chemical`. |
| `shipDate` | string | **always** (10/10) | Naked local datetime `2026-07-28T15:00:00` — **no offset, no paired timezone field**. |
| `carrierSCAC` | string | **always** (10/10) | `DAFG`, `DNTS`, `EXLA`, `RLCA`, `FXFE`, `TRAP`. |
| `carrierName` | string | **optional** (9/10) | `DAYTON FREIGHT LINES`. Absent on `0200994650`. Truncated in places (`KAG SPECIALTY PRODUC`) — treat as 20-char-clipped *(inf)*. |
| `stops` | array | **always** (10/10) | §4. 2 or 4 entries. |
| `references` | array | **always** (10/10) | §5, shipment level. 1–5 entries. |
| `equipments` | array | **always** (10/10) | Exactly 1 entry; only key is `equipmentCode`. |
| `permalink` | string | **always** (10/10) | `signature=<8 hex>` — a query fragment, not a URL. Signed share token *(inf)*. |
| `relatedShipments` | array | **optional** (7/10) | §7. Absent (not null) on 3. |
| `capacityProviderSCAC` | string | **optional** (2/10) | Equals `carrierSCAC` on both. |
| `capacityProviderName` | string | **optional** (2/10) | Equals `carrierName` on both. |
| `providerMetaData` | object | **optional** (1/10) | `{provider:"FourKites", mode:"PUSH", referenceDataKeysMapping:{}, additionalInfo:{}}` — both maps empty. |
| `TIVE tracker` | ? | **optional + nullable** (4/10, all `null`) | **Key contains a space.** IoT tracker ref *(inf)*. |
| `PASSTHRU$P44_ACCOUNT_GROUP` | string | **optional** (5/10) | `1000031`. **Key contains `$`.** |
| `PASSTHRU$P44_ACCOUNT_CODE` | string | **optional** (5/10) | `EXLA`, `RLCA`, `FXFE` — a SCAC. |
| `PASSTHRU$P44_SHIPMENT_ID` | string | **optional** (5/10) | `90340145740120` — equals `trackingRequestReferenceNumber` on these rows. |

> **`PASSTHRU$*` is an open key namespace.** Do not model it as fixed fields; collect unknown top-level keys into a passthrough map. Same for `TIVE tracker`.

### `equipments[]`
| Field | Type | Cardinality | Observed |
|---|---|---|---|
| `equipmentCode` | string | **always** (10/10) | `LTL` (7), `TTC` (2), `ISO` (1). Only key present. |

## 4. `shipmentData.stops[]`

n = 22. Every field below is **always** present except `references`.

| Field | Type | Cardinality | Notes |
|---|---|---|---|
| `stopType` | string | **always** (22/22) | **`pickup`** (10), **`delivery`** (12). Lowercase. |
| `sequence` | **string** | **always** (22/22) | `"1".."4"`. **Global across stop types.** **Array order ≠ sequence order** (`0200994650` ships `[1,4,3,2]`). |
| `name` | string | **always** | Facility name, uppercase, sometimes 50-char clipped (`…C/O HENIFF TRANSPORTATI`). |
| `addressLine1` | string | **always** | No `addressLine2` observed. |
| `city` | string | **always** | Uppercase. |
| `state` | string | **always** | 2-letter. |
| `country` | string | **always** | `US` on all 22. |
| `postalCode` | string | **always** | |
| `startAppointmentTime` | string | **always** | Naked local datetime, read in this stop's `timeZone` *(inf)*. |
| `endAppointmentTime` | string | **always** | **Identical to `start` on all 22** — no window exercised. |
| `latitude` | **string** | **always** | `"41.063305"` — string, not number. |
| `longitude` | **string** | **always** | `"-74.663866"`. |
| `timeZone` | string | **always** | **IANA**: `America/New_York` (all 22 in this sample). |
| `references` | array | **optional** (18/22) | §5. The order↔stop binding. |

## 5. `references[]` (both levels)

Shape is identical at shipment level (n=42) and stop level (n=68). All three keys **always** present on all 110.

| Field | Type | Cardinality |
|---|---|---|
| `referenceType` | string | always (110/110) |
| `referenceValue` | string | always (110/110) |
| `visible` | boolean | always (110/110) |

### All observed `referenceType` values (9 distinct)

| Type | Total | Shipment lvl | Stop lvl | `visible` | Reading |
|---|---|---|---|---|---|
| `TRACKING_NUMBER` | 30 | 10 | 20 | **true** always | The tracked document / order number. At stop level this is the **order binding**. |
| `PRO_NUMBER` | 20 | 10 | 10 | **true** always | Carrier PRO. Also seen holding a container number (`SUTU2667539`) on a `TT/ISO` document. |
| `BOL_NUMBER` | 12 | 2 | 10 | **true** always | Bill of lading. |
| `PURCHASE_ORDER` | 11 | 5 | 6 | **true** always | |
| `CR_ORDER_NUMBER` | 8 | 0 | 8 | **false** always | Search alias of the stop's order number *(inf)*. |
| `SALES_ORDER_NO` | 6 | 0 | 6 | **true** always | Note: distinct spelling from `SALES_ORDER`. |
| `BILL_OF_LADING` | 5 | 5 | 0 | **true** always | **Duplicate concept with `BOL_NUMBER`, different name and different level.** |
| `SALES_ORDER` | 5 | 5 | 0 | **true** always | **Duplicate concept with `SALES_ORDER_NO`.** |
| `PICKUP` | 5 | 5 | 0 | **true** always | Pickup number *(inf)*. |
| `CR_REF_NO_DASH_REMOVE` | 4 | 0 | 4 | **false** always | `SO-40614628` → `SO40614628`. |
| `CR_REF_NO_REMOVE_LAST` | 2 | 0 | 2 | **false** always | Last character stripped *(inf)*. |
| `CR_ORDER_NO_ZEROS` | 2 | 0 | 2 | **false** always | Leading zeros stripped *(inf)*. |

*(12 rows — 9 "business" types plus 3 `CR_*` alias types. Every `CR_*` type is `visible:false`; every non-`CR_*` type is `visible:true`, without exception in this sample.)*

**Two synonym pairs** (`BOL_NUMBER`/`BILL_OF_LADING`, `SALES_ORDER_NO`/`SALES_ORDER`) split cleanly by level — stop level uses the `_NUMBER`/`_NO` spelling, shipment level uses the long form. Whether that is a rule or a coincidence of 10 records is unknown. **Normalize both pairs at the seam.**

**Shipment-level references are never `visible:false`** (42/42 true). Hiding is a stop-level-only concern in this sample.

## 6. `trackingMessage[]`

n = 86.

| Field | Type | Cardinality | Observed values / notes |
|---|---|---|---|
| `trackingRequestReferenceNumber` | string | **always** (86/86) | **The join key** back to `shipmentData`. |
| `messageGenerated` | `{datetime, timezone}` | **always** (86/86) | |
| `messageReceived` | `{datetime, timezone}` | **always** (86/86) | |
| `timeOccurred` | `{datetime, timezone}` | **always** (86/86) | **The ordering key.** |
| `trackingNumber` | string | optional (80/86) | Mirrors the document's `TRACKING_NUMBER`. |
| `carrierReferenceIdentifier` | string | optional (80/86) | The PRO. |
| `provider` | string | optional (80/86) | **`P44_LTL`** (42), **`Kleinschmidt-214`** (38). Absent on 6. |
| `reportingCarrier` | string | optional (80/86) | SCAC. |
| `loadId` | string | optional (56/86) | |
| `messageType` | string | **optional (64/86 — key ABSENT on 22, never `null`)** | See enum below. |
| `code` | string | optional (51/86) | EDI 214 code *(inf)*. See enum below. |
| `shortDescription` | string | optional (51/86) | Always co-present with `code`. |
| `longDescription` | string | optional (51/86) | `<canonical> (<carrier free text>)`. |
| `occurredLocation` | **object, polymorphic** | optional (83/86) | §6.3. |
| `stopSequence` | **string** | optional (50/86) | `"1".."9"`. May be a carrier-network index, not ours — §6.4. |
| `explanationCode` | string | optional (38/86) | **`NS`** (36), **`NA`** (2). Only two values. Meaning unknown. |
| `stops` | array | optional (38/86) | **EMPTY (`[]`) on all 38.** Binds nothing. Do not build against it. |
| `shipperBOL` | string | optional (38/86) | |
| `shipperReferenceIdentifier` | string | optional (38/86) | |
| `transitID` | string | optional (38/86) | Equals the PRO on rows seen. |
| `eta` | `{datetime, timezone}` | optional (43/86) | |
| `stopType` | string | optional (29/86) | **Different vocabulary from stops** — see enum below. |
| `latitude` | string | optional (36/86) | Duplicates `occurredLocation.latitude`. |
| `longitude` | string | optional (36/86) | Duplicates `occurredLocation.longitude`. |
| `comment` | string | optional (17/86) | The parenthetical from `longDescription`, unwrapped. **Read this, don't parse.** |
| `delivery` | bool | optional (8/86) | Always `true` when present. |
| `pickup` | bool | optional (7/86) | Always `true` when present. Mutually exclusive with `delivery`. |
| `packageCount` | string | optional (6/86) | `"1"` on all 6. |

### 6.1 `messageType` — all 6 observed values (+ absent)

| Value | Count |
|---|---|
| `LOCATION_UPDATE` | 36 |
| `AT_STOP` | 14 |
| `IN_TRANSIT` | 6 |
| `COMPLETED` | 5 |
| `OUT_TO_STOP` | 2 |
| `INFO` | 1 |
| *(key absent)* | 22 |

### 6.2 `code` — all 11 observed values

| `code` | `shortDescription` | Count | Co-occurring `messageType` |
|---|---|---|---|
| `X2` | `EtaAtConsignee` | 9 | `AT_STOP` (7), `OUT_TO_STOP` (1), `LOCATION_UPDATE` (1) |
| `X1` | `DlvryArvLoc` | 11 | `AT_STOP` (7), *(absent)* (4) |
| `D1` | `Delivered` | 10 | `COMPLETED` (5), *(absent)* (5) |
| `AF` | `PickedUp` | 8 | `IN_TRANSIT` (5), *(absent)* (3) |
| `P1` | `DepartTermLoc` | 5 | *(absent)* |
| `L1` | `Loading` | 2 | *(absent)* |
| `X6` | `EnRoute` | 2 | `OUT_TO_STOP` (1), `IN_TRANSIT` (1) |
| `X3` | `PickUpArvLoc` | 1 | *(absent)* |
| `AA` | `PickupAppt` | 1 | *(absent)* |
| `AB` | `DeliveryAppt` | 1 | *(absent)* |
| `ME` | `Memo` | 1 | `INFO` |

`LOCATION_UPDATE` carries **no `code`** on 35 of 36 — the two vocabularies are near-complementary, not redundant. **Any lifecycle state machine must read both.**

### 6.3 `occurredLocation` — polymorphic

Always: `city`, `state`, `country` (83/83; `country` frequently `""`). Usually: `longitude`/`latitude` (79), `postalCode` (51), `timeZone` (40).

**On 9 of 83 it is a full stop object**, additionally carrying `stopType`, `sequence`, `references[]`, `name`, `addressLine1`, `startAppointmentTime`, `endAppointmentTime`. Union type required.

`occurredLocation.timeZone` mixes notations: `America/New_York` (21), `CDT` (10), `America/Chicago` (5), `America/Los_Angeles` (4), absent (43). **IANA identifiers and abbreviations in the same field.**

### 6.4 `stopType` on messages — 4 observed values, TWO vocabularies

| Value | Count | Vocabulary | `stopSequence` range |
|---|---|---|---|
| `TERMINAL` | 12 | **carrier network** (`P44_LTL` only) | 2–8 |
| `DESTINATION` | 4 | **carrier network** (`P44_LTL` only) | 2, 9 |
| `delivery` | 9 | our stop model | 2, 3, *(absent)* |
| `pickup` | 4 | our stop model | 1 |
| *(absent)* | 57 | — | often present with `stopSequence` alone |

**Critical:** documents whose `shipmentData.stops` has only 2 stops receive `TERMINAL` messages with `stopSequence` 3–9. Uppercase `stopType` values index the **carrier's** network, not our route. Joining on `stopSequence` without checking `stopType` casing produces wrong or dangling stop anchors.

### 6.5 Timestamp `timezone` notations observed (across the 3 always-present time objects, n=258)

`UTC` (136) · `-04:00` (44) · `GMT` (38) · `-05:00` (26) · `-07:00` (12) · `Z` (2)

Four notations for the same slot. **Normalize to an absolute instant on ingest**; never sort or compare the raw strings.

## 7. `relatedShipments[]`

n = 12 entries across 7 documents. All three keys **always** present.

| Field | Type | Cardinality |
|---|---|---|
| `documentId` | string | always |
| `organizationId` | string | always |
| `source` | string | always — `NN` (4), `ODM` (5) *(by entry)* |

**No `relation` / `type` discriminator field exists** — the two semantics (sibling order vs cross-system alias) must be distinguished by comparing `documentId` to the parent's. See [[tracking-payload]] §4.

## Open / TBD

Consolidated in [[tracking-payload]] §7. Contract-specific additions:

- Are `BOL_NUMBER`/`BILL_OF_LADING` and `SALES_ORDER_NO`/`SALES_ORDER` genuinely level-scoped synonyms, or two independent vocabularies that happen to split this way in 10 records?
- Is `sequence`/`stopSequence`/`latitude`/`longitude`/`packageCount` being string-typed intentional (EDI passthrough) or incidental? Affects whether we parse defensively forever.
- Does `messageType` ever appear as explicit `null`, or only as an absent key? (Absent on all 22 here.) Changes the client type.
- Full `explanationCode`, `source`, `provider`, `mode`, `equipmentCode`, `referenceType` vocabularies — none can be closed from one page.

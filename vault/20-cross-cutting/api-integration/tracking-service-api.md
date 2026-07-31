---
title: tracking-service — API understanding
domain: cross-cutting
type: spec
tags: [api, backend, integration, tracking-service]
date: 2026-07-30
status: active
source: "One real Tracking API response captured 2026-07-30 (page 43 of 18,971; 10 bundles) — vault-sources/10-domains/tracking/data/tracking-payload-page43-2026-07-30.json. NO Confluence LLD and NO Swagger for this service; endpoint paths below are UNCONFIRMED."
---

# tracking-service — API understanding

> **Different provenance from its siblings.** [[shipment-service-api]], [[order-service-api]] and [[carrier-service-api]] are synthesized from Confluence LLDs — *documented intent*. This one is synthesized from a **captured production response** — *observed behaviour*, with no endpoint documentation at all. Where those docs risk being stale WIP, this one risks being one unrepresentative page. See [[api-endpoints-and-owners]] — Tracking is listed there with **no service, no API surface, no PO**; Eng owner **Irina Jachimek**, prod UI **Angular**.
>
> Full field-by-field schema: [[tracking-api-contract]]. Domain model and our divergences: [[tracking-payload]]. Decisions: [[decision-log]] (`TR-` prefix).

## Read endpoints (these back the FE)

| Method | Path | FE use |
|---|---|---|
| ? | **unknown — a paged tracking list** | **The Tracking grid.** Returns `{pageNumber, pageSize, totalRecords, totalLoads, bundles[]}`. The captured response is page 43 at `pageSize` 10 → 18,971 records. Verb, path and request body are **all unconfirmed**. |

That is the entire evidenced surface: **one list endpoint, shape known, address unknown.** No detail-by-id, no document fetch, no filter/lookup endpoints are evidenced — though `documentCount` on every bundle implies a documents endpoint exists somewhere *(inferred)*.

**Contrast with the siblings:** shipment-service exposes ~12 read paths, order-service ~9 plus ~25 lookups, carrier-service ~30. Tracking's registry row in [[api-endpoints-and-owners]] is empty across the board. Either this service is owned outside the LLD process, or it is a provider integration (FourKites / project44 / Kleinschmidt) surfaced through a thin Odyssey wrapper *(inferred from the `provider` and `providerMetaData` fields, see below)*.

## The bundle envelope — a different pattern from every sibling

```
{ pageNumber, pageSize, totalRecords, totalLoads, bundles[{ shipmentData, trackingMessage[], documentCount }] }
```

Two things diverge from the house style:

1. **Count field naming.** shipment-service and order-service both echo `totalCount`; tracking uses **`totalRecords`**, plus an unexplained **`totalLoads`** (observed `0` against 18,971 records — semantics unknown). Three services, three vocabularies. **Normalize in our API layer; do not leak three names to the FE.**
2. **The list row is a composite, not a row.** Sibling list endpoints return flat grid rows and defer the heavy object to a detail call ([[order-service-api]] even documents the compact-row / flat-detail split explicitly). Tracking's list returns the **full nested document plus its entire event stream** — 3 to 30 messages per bundle, ~199KB for 10 records. At `pageSize` 10 that is ~20KB per row. **There is no light list projection.** Any grid we build pays full detail cost per page, and paging deep (page 43 of 1,898) is on the caller.

## Entity → UI mapping (`bundles[]`)

- `shipmentData` header — `documentId, organizationId, source, loadId, mode, customer, shipDate, carrierSCAC, carrierName` → **tracking grid row**
- `shipmentData.stops[]` `{sequence, stopType, name, address, lat/long, timeZone, references[]}` → **route / map / stops panel**. `sequence` is a **string, global across stop types, and unsorted in the array** (TR-02).
- `shipmentData.stops[].references[]` → **the order↔stop binding** — there is no `orderIds[]`. Orders bind via `TRACKING_NUMBER` (visible) + `CR_ORDER_NUMBER` (hidden) pairs.
- `shipmentData.references[]` → document-level identifiers (PRO, BOL, PO, sales order)
- `shipmentData.relatedShipments[]` → **sibling orders OR a cross-system alias of the same document**, with no discriminator (TR-08)
- `trackingMessage[]` → **the event timeline**. No overall status field exists anywhere — current state is *derived* from the latest message (TR-06).
- `documentCount` → attached-documents badge (0 on all 10 observed)
- `permalink` (`signature=<8 hex>`) → external share link. Opaque; **never construct client-side**.

## Provider layer — this service is an aggregator

`provider` on messages: **`P44_LTL`** (42 of 86) and **`Kleinschmidt-214`** (38). `providerMetaData` on one document: `{provider: "FourKites", mode: "PUSH", referenceDataKeysMapping: {}, additionalInfo: {}}`. Top-level `PASSTHRU$P44_ACCOUNT_CODE` / `_ACCOUNT_GROUP` / `_SHIPMENT_ID` keys, and a `TIVE tracker` key, appear inline on `shipmentData`.

Three consequences for our client:
- **Event vocabulary is provider-dependent.** `Kleinschmidt-214` emits EDI 214 codes (`AF`, `D1`, `X1`…); `P44_LTL` emits `messageType` plus carrier-network stop hops. Both, differently shaped, in one array.
- **`stopType` on messages carries two vocabularies** — lowercase `pickup`/`delivery` (ours) and uppercase `TERMINAL`/`DESTINATION` (`P44_LTL`'s network). Joining `stopSequence` without checking the casing anchors events to the wrong stop (TR-06).
- **Top-level keys are an open set**, including keys containing `$` and a space. Collect unknowns into a passthrough map; a closed-key-set client will drop data or throw.

## Auth / headers / pagination

**Unknown.** No headers were captured with the payload. Siblings use `Authorization: <JWT>`, `Content-Type: application/json`, `x-correlation-id` ([[shipment-service-api]], [[order-service-api]]); assume the same until confirmed. `permalink` suggests a **second, signature-based access path** for external parties — its auth semantics are unknown and security-relevant.

Pagination is page-number based (`pageNumber`/`pageSize`), no `hasNext`, no `totalPages`, no sort echo.

## What this means for OUR db + api layers

Full divergence table (12 rows, grounded in `apps/odyssey-one/src/api/types/sellShipmentOut.ts`, `…/shipmentDetail.ts`, `packages/db/migrations/001_schema.sql`, `apps/odyssey-one/tools/generate.mjs`) lives in [[tracking-payload]] §6. The five that change our schema:

1. **Tracking events don't exist in our model.** Our `events` table is a shipment audit log — different producer, lifecycle and volume. New table, not an overload (TR-06).
2. **Timezones must be IANA**, not our 3-letter `CITY_TIMEZONES` abbreviations — which are also DST-wrong today (TR-04).
3. **References are an open typed list with a `visible` flag**, not the three flat columns we model (TR-05).
4. **`loadId` (`ODY…`) has no typed home in our schema** and is the likeliest real join key to Odyssey systems.
5. **`relatedShipments` means record counts overstate physical movements** — dedupe before any KPI (TR-08).

## ⚠️ Open gaps to confirm

1. **The endpoint itself** — verb, path, request body, filter/sort contract. Nothing is documented. Ask Irina Jachimek.
2. **`totalLoads: 0`** against 18,971 records — what does it count? Blocks mirroring the envelope.
3. **Is there a detail endpoint**, or is the list genuinely the only surface? If the latter, our grid pays full-document cost per row.
4. **Documents** — `documentCount` implies an endpoint we have no trace of.
5. **`permalink`** — base URL, TTL, and whether it grants unauthenticated access. Do not expose until answered.
6. **Angular ownership.** Tracking's prod UI is Angular ([[api-endpoints-and-owners]]) — clarify whether we consume this contract at all before investing in a React client for it.
7. **Vocabularies** (`referenceType`, `messageType`, `explanationCode`, `mode`, `source`, `provider`) cannot be closed from one page. Full lists in [[tracking-api-contract]].

## Sensitive (internal only)

The captured payload contains **real customer names, facility names, street addresses, geo-coordinates, carrier SCACs, PRO/BOL numbers and driver-entered comments** (a `comment` field reads `MIKE`). Real orgs: Afton Chemical, Shell Oil Products US, Clariant, DuBois Chemicals, SONNYS. **Do not seed fixtures, demos or commits with these values** — same bar as the sample payloads in [[shipment-service-api]] and [[order-service-api]]. `permalink` signatures are credentials-adjacent; keep them out of logs and screenshots.

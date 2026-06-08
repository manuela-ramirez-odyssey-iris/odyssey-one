---
domain: orders
type: reference
tags: [api, backend, integration, order-service]
date: 2026-06-05
status: active
source: "Confluence TMS LLDs 3401056276 (Order Service Phase-2 / v3), 2361917446 (Order Domain / v1 lookups + entity model), 2630090754 (Order Service LINX / v2). FE Order Creation page 2561835022 is image-only."
---

# order-service — API understanding

> Synthesized from the Order LLDs. v3 = UI/CRUD surface; v2 = LINX ingestion; v1 = entity model + master-data lookup catalog. See [[api-endpoints-and-owners]]. Owners: PO Ramesh Raman, Eng Venkata Kesavarao Seerla.

## v3 — UI / CRUD endpoints (these back the FE)
All POST/PATCH; headers `Authorization`, `Content-Type: application/json`, `x-correlation-id`.

| Method | Path | Purpose / FE use |
|---|---|---|
| POST | `/order-service/v3/order/list` | **Orders grid** — paged/filtered/sorted. Returns compact grid rows. |
| POST | `/order-service/v3/order/view` | **Order detail** by `{orderNumber, customerId}` → full flat `manualOrder{}`. |
| POST | `/order-service/v3/manual-order` | **Manual/Quick order create** (flat schema). Draft→`DRAFT`; submit→`RD_4_PLNNG`. |
| POST | `/order-service/v3/order` | Integrated create / edit / hold / cancel (`orderInterface{}` wrapper; toggles `deleteFlag`/`orderHoldStatus`). |
| POST | `/order-service/v3/order/validation` | **Inline order-number uniqueness** — 409 `DUPLICATE_ORDER_NUMBER`. |
| POST | `/order-service/v3/order/cancel` · `/order/restore` | Row/detail cancel + restore by `{orderNumber, customerId}`. |
| PATCH | `/order-service/v3/order-status` | Bulk status change from grid multi-select. |
| POST | `/order-service/v3/audit-report` | **Order history/audit tab** (paged change log: field, oldValue, newValue, changeMadeBy). |

**Shape mismatch to handle in FE layer:** `/order/list` returns a *compact grid row* (nested-by-role: `consignor{}`, `consignee{}`, `grossWeight{value,uom}`…), while `/order/view` returns the *flat* `manualOrder`. Need two DTOs: `OrderListRow` + `OrderDetail`.

## v2 — LINX ingestion (not FE): `POST|PATCH /v2/order`, `/v2/message/forward`, `GET /v1/order/{id}`, `GET /v2/order-out/{orderNumber}`, `/v2/order/search`, `/v2/{order-number,source-order-number}/lookup`.

## v1 — master-data lookup catalog (FE form dropdowns)
~25 lookups under `/order-service/v1/...`, mostly `POST {lookup, pageNumber, pageSize}` → `{data:{code:desc}, hasNext}`, **frequency-sorted**: `freight-terms, equipment/lookup, ship-direction/lookup, modes, org-address/lookup, owning-org/lookup, product/lookup, special-services/lookup, handling-units/lookup, uom-type/lookup, ship-class(-id)/lookup, instruction-type/lookup, currency/lookup, packing-groups, wgk-code/lookup, reference-codes/lookup, country-origin/lookup, scac-code/lookup, timezones`. (Address validation is in `address-service/v1/validation`, not order-service.)

## Data model — `OrderHeader` (table `order_info`)
Identity: `orderIdentifier`(=source order #), `orderNumber`, `customerId`, `poNumber/poDate`, `orderReleaseId`. Dates each paired w/ `*TimeZoneCode`. Flat origin/destination blocks. Totals: gross/net weight, volume, netValue, `plannedCostAP/AR`, `apCompletedCost/arCompletedCost`. Nested: `orderLines[]` (~80 fields incl. full hazmat group, dims, charges), `orderInvolvedPartyList[]` (ShipTo/BillTo/Shipper/Seller/Buyer by `partyType`), `orderCarrierEquipDetailList[]`, `orderInstructionList[]`, `orderAccessorialDetails[]`, `orderChargeList[]`, `userFieldList[]` (EAV), `orderStatus`, `sourceApplication`. Audit snapshots stored as jsonb (`OrderAudit`). Statuses: `RD_4_PLNNG`, `DRAFT`, Planned Load/Shipment, Hold, Cancelled.

## Auth / pagination
Three headers (as above). `/order/list` req: `{pagination{pageNumber,pageSize}, filters{customers[],equipment[],orderStatuses[],pickupDateFrom/To}, sort{field,direction}}` → echoes `pagination{...,totalCount}`. Lookups page via `pageNumber/pageSize` + `hasNext`.

## ⚠️ Open gaps
- FE Order Creation flow (page 2561835022) is **image-only** — exact manual-order-vs-order submit contract + draft trigger unconfirmed. Validate with BE / Swagger.

## Sensitive (internal only)
Dev/qa Swagger URLs, an AWS account number + SQS FIFO queue + Lambda console URL, an internal service-to-service auth key, sample customer codes (SABIC etc.) — keep out of FE code/fixtures/commits.

---
domain: shipments
type: reference
tags: [api, backend, integration, shipment-service]
date: 2026-06-05
status: active
source: "Confluence TMS LLDs 3525869576 (Shipment Service Phase-2, WIP), 2778202116 (Rating & Cost Allocation), 2643099672 (Shipment Service LINX). Live contract: shipment-swagger/v3/api-docs (dev/qa)."
---

# shipment-service — API understanding

> Synthesized from the Shipment Service LLDs. **WIP caveat:** pages are flagged under review; the live Swagger (`…/shipment-swagger/v3/api-docs`) is the source of truth — reconcile before finalizing. See [[api-endpoints-and-owners]]. Owners: PO Jana, Eng Soni Sinha.

## Read endpoints (these back the FE)

| Method | Path | FE use |
|---|---|---|
| GET | `/shipment-service/v1/sell-shipment-out/{id}` | **Shipment detail (AR/sell)** — hydrates all tabs. Returns `sellShipmentOut`. |
| GET | `/shipment-service/v1/buy-shipment-out/{id}` | Shipment detail (AP/buy) — parallel shape `buyShipmentOut`. |
| GET | `/shipment-service/v1/sell-shipment/{id}/exists` | `{flag}` guard before binding a planned shipment. |
| GET | `/shipment-service/v1/executed/shipment/{id}/details` · `/errors` | Executed-shipment / PGI-PGR field-edit page. |
| GET | `/shipment-service/v1/manual-missed/shipment/{id}/details` | Manual/Missed PGI detail. |
| GET | `/shipment-service/v1/shipment/error/category/count` (+ manual-missed, rating variants) | Donut chart counts `{errorOverview[], total}`. |
| POST | `/shipment-service/pgi-pgr/v1/error/list` (+ manual-missed) | **Paginated/filtered/sorted** error grid. |
| POST | `/shipment-service/pgi-pgr/v1/error/download` | CSV export (max 10k rows). |
| POST | `/shipment-service/advanced-filter/{sell-shipment-id\|customers\|mbol\|bol}/lookup` | **Filter typeaheads → maps to GlobalSearch/FilterSuggestions.** (`scac/lookup` deprecated → use master `/master-data/v1/scac-code/lookup`.) |

Filter/dropdown data also comes from external services: `customer-service/v1/{org-name/lookup,freight-terms}`, `location-service/v1/ship-direction/lookup`, `product-service/v1/product/lookup`.

## Write/ingestion (NOT called by FE — system-to-system)
`POST /v2/load` (primary ingest), `POST|PATCH /v1/shipment` (create / tender-accept-cancel), `POST /v1/forward/message` (router), `POST /v1/pgipgr/field/{validate,process}`.

## Read entity → UI tab mapping (`sellShipmentOut`)
- Header: `shipmentId, shipmentType, customerId/Name, planningStatus, ratingStatus, numberOfStops, totalWeight/Volume/PackageCount, pgiFlag, pgiDate`, many date fields each with a `*TimeZoneCode`.
- `origin`/`destination` (objects) → **Stops/Routing header**
- `shipmentStopList[]` `{sequence, stopType, orderIdList[]}` → **Stops tab**
- `shippingOptionList[]` (carrier rate options: mode/carrier/equipment, tenderStatus, transit fields, nested `freightEstimate{arMarkup, chargeList[{code,description,amount,uomCode}]}`) → **Routing Guide tab** (accepted option carries the charge breakdown)
- `orderList[]` → **Order tab**; `orderList[].orderLines[]` (incl. full hazmat block) → **Product tab**
- `instructionList[]` / `orderList[].orderInstructionList[]` → **Instructions tab**
- `shipmentPartnerList` → BillTo / carrier bill-to

## Cost allocation / rating
Three tiers, each with currency siblings: **order** (`apAllocated`/`arCalculated` estimates; `apCompletedCost`/`arCompletedCost` finals), **charge** (`orderChargeList[]`, `orderLineChargeList[]` per-charge AP/AR), **carrier-option** (`freightEstimate.chargeList[]` + `arMarkup`). Charge codes: Base Rate, FUE, CLN, HZC, accessorials. **Completed costs are null until PGI/PGR completes** → gate margin/final display on `pgiFlag`/`ratingStatus` (matches the prototype's "Available after PGI/PGR" Cost tab). Rating: LINX `rating-service POST /v1/rate-order` wraps TMS `/routing/qca`; allocation type (BY_WT/BY_VOL) from `customer-service/v1/cost-allocation-type`.

## Auth / headers / pagination
- `Authorization: <JWT>`, `Content-Type: application/json`, `x-correlation-id: <NN txn id>` on create/patch/reads.
- List/grid envelope: req `{pageNumber, pageSize, filter{...}, sortBy, orderBy}` → resp `{pageNumber, pageSize, totalCount, <data>}`. Single-entity GETs are by-id only.

## ⚠️ Open gaps to confirm
1. **No generic `GET /shipments` list endpoint** evidenced — the main table's list source is unclear (error grids + advanced-filter lookups only). Confirm with Jana / Swagger.
2. **Documents & Notes tabs** have no API here — separate service or out of scope?
3. LLDs are WIP — reconcile field names against live Swagger.

## Sensitive (internal only)
Dev/qa Swagger hosts + TMS rating host are internal; rating uses Basic auth, reads use JWT; sample payloads contain real-looking customer/org/address/VAT data — do not seed fixtures with them.

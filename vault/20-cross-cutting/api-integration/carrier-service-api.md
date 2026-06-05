---
domain: carriers
type: reference
tags: [api, backend, integration, carrier-service]
date: 2026-06-05
status: active
source: "Confluence TMS LLD 2643066896 (Carrier Service - LLD; parent 2837577768 empty). Last modified Sep 2025."
---

# carrier-service — API understanding

> Synthesized from the Carrier Service LLD. Base path `/carrier-service/v1/...`. Internally split: `rmis-carrier-service` (ingestion) + `carrier-service` (FE-facing). See [[api-endpoints-and-owners]]. Owners: PO Kathleen O'Donnell, Eng Utkarsh Tripathi (Cognizant).

## Grid / list (main screen)
| Method | Path | Purpose |
|---|---|---|
| POST | `/carriers/list` | Primary grid — paged/sorted/searched/filtered. Resp `{pageNumber, pageSize, totalCount, statusCount{ALL,NC,IN}, carrierList[]}`. |
| POST | `/carriers/download` | Same body → `carrier_list.csv`. |
| GET | `/select/columns` | Column catalog `{xid, caption, required}`. |

`/carriers/list` req: `{pageNumber, pageSize, search, sortBy, orderBy, status:"all"|"NC"|"IN", filters:{carrierName[], scac[], complianceStatus[], odysseyStatus[], waiverStatus[], businessUnits[], modes[], carrierTypes[], carrierClassifications[], hazardous[], carbCompliance[], onboardedDateStartRange, onboardedDateEndRange, authorityGranted{Start,End}Date}}`. Status tabs: ALL / NC (noncompliant, 30d) / IN (inactive); `statusCount` feeds badges.

## Lookups / dropdowns (filter chips + typeahead)
All POST, shared envelope `{lookup, search{searchCarrierName[],searchScac[],searchMC[],searchDOT[],searchCarrierID[],searchRMISID[],searchBusinessUnit[],globalSearch}}` → `{data:{value:label}}`:
`carrierName, scac, complianceStatus, waiverStatus, businessUnits, modes, carrierTypes, carrierClassifications, hazardous, carbCompliance` (+ `/lookup`). Dependent/cascading: one facet's options narrow by other selections.
- `POST /search/lookup` — **unified global omnibox typeahead** → `[{label, value, type}]` where `type ∈ carrierName|scac|mc|dot|carrierId|businessUnit|rmisID`. **Maps directly to GlobalSearch** (grouped-by-type results).

## Saved views + column customization (3 distinct layers)
1. **Column catalog** — `/available/columns` `[{id,code,name}]` (33 cols) or `/select/columns` `{xid,caption,required}` (required cols locked).
2. **Saved views** (named column selections per user) — `GET /user/{id}/dropdown` `[{id,name,default,editable}]` (built-ins `editable:false`); `/view/{viewID}/selected/columns`; `/user/{u}/view/{v}/retrieve/columns` (ordered); `POST /add`, `POST /update` (`selectedColumns:[{columnId}], default`).
3. **Saved advance filters** (named criteria, full CRUD) — `POST /save/filter`, `GET /list/filters/{userId}`, `GET /view/filter/{id}`, `PATCH /update/filter`, `DELETE /delete/filter/{id}`. `widget:"true"` flag = surfaceable as dashboard widget. *(Inconsistency: list uses `onboardedDate{Start,End}Range`; saved filters use `onboardDate:[start,end]` — shim needed.)*

## Detail + contacts + user
- `GET /carrierdetail/{carrierId}/section/{section}` — `section ∈ general|dot|contacts`; lazy-load per accordion. Returns PascalCase composite (`CertificationStatus, CarrierReferences, CarrierInformation, Certifications, DiversityInformation, "Equipment Details"`).
- `POST /save/contact` (single) + `POST /contact/details/upload` (multipart Excel bulk, needs `carrierPartyId`).
- `POST /user/details` → `{userId, emailId, firstName, lastName}` — call once on load; `userId` is required by view/filter calls.

## Data model — `CarrierParty` (normalized JPA)
`CarrierParty{carrierName, dba, taxId, authorityId, clientWaiver, vendorId, odysseyStatus}` → OneToOne `CarrierTruckingInfo{dotNumber, mcNumber, scac, businessUnit, complianceStatus, hazmatCertified, twic, tankerEndorsed, driversCount, operatingStatus, dotAuth/Time/Safety, registrationExpiry, authorityGranted}`; OneToMany `CarrierClassification[]`, `CarrierCoverage[]` (insurance), `CarrierMode[]`, `CarrierType[]`.

## Auth / pagination
`Authorization: Bearer <JWT>` + `x-correlation-id` (Bearer is canonical; one older example omits prefix). `/contact/details/upload` is `form-data`. RMIS ingestion endpoints (`/delta-api`, `/carrier-info/retrieve`) auth separately via `ClientID`/`Pwd` URL params — **backend only, never FE**. Only `/carriers/list` paginates (0-based + totalCount); lookups return full narrowed maps (debounce-and-filter, no infinite scroll).

## RMIS ingestion (NOT FE): `/delta-api` (Fetch/Clear), `/carrier-info/retrieve` (Expanded Carrier API) → persist normalized carrier_* tables.

## Sensitive (internal only)
RMIS production host + `ClientID`/`Pwd` broker credentials, a `localhost:8081` leak, a real employee identity in `/user/details` sample + a contractor OneDrive path, real BU/carrier names — keep out of FE config, code, fixtures, commits.

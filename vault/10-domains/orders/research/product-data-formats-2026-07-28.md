---
domain: orders
type: research
date: 2026-07-28
status: draft
---

# Product Information — data format research (Product ID, Product Class, Handling Unit, Harmonized Code)

Sources: Jira project LINX (Rovo/Jira MCP), Confluence space TMS (Rovo/Confluence MCP). All findings below are **verbatim quotes/extracts from tickets or the Master Data Design-LLD page** unless marked "Inferred". Field applicability comes from `LINX-8121` ("Quick Order Creation - Product Information Section (Add Product)") and its children.

## 1. Product ID

**Verbatim — `LINX-9875` ("Quick Order Creation - Product ID Dropdown"):**
> Single-select dropdown for Product ID
> Product IDs listed by frequency of use (highest to lowest)
> Search functionality available (same as Owning Organization search per LINX-8118)
> User can clear and re-select Product ID prior to order creation
> Product ID selection triggers auto-population of Product Description (Story 3)

**API (Master Data Design-LLD, Confluence page `Master Data Design-LLD` id 2408743006):**

- Endpoint: `POST /master-data/v1/product-service/v1/product/lookup` (gateway path) → routes to `/product-service/v1/product/lookup`
- Request:
  ```json
  {
    "lookup": "<search string>",
    "pageNumber": 0,
    "pageSize": 20
  }
  ```
- Response (verbatim example from the LLD, real-looking product IDs and descriptions):
  ```json
  {
    "pageNumber": 1,
    "pageSize": 25,
    "totalCount": 10,
    "data": {
      "000000000000100027": ["KYMENE 525 BULK (FLAGGED - DO NOT USE)", "KYMENE 218 BULK-DO NOT USE"],
      "000000000000100029": ["KYMENE 525 BULK (FLAGGED - DO NOT USE)"]
    }
  }
  ```
- LLD annotation: "Search String is Product ID. Like match to get the list of Products. SQL: `external_id` from table `mf_ship_item`. Used in UI lookup" (refs `OTMS-795`, `OTMS-922`).

**Format takeaways:**
- Product ID is a long numeric string, zero-padded to ~18 digits in the sample data (`000000000000100027`) — this is the legacy `external_id` / `mf_ship_item` key, not a short SKU.
- One Product ID can map to **multiple descriptions** (array) — the LLD sample shows the same ID appearing with a "(FLAGGED - DO NOT USE)" variant, i.e. real-world master data has duplicate/dirty descriptions per ID. Worth mimicking a *few* products with 2 description variants for realism, but most should have 1.
- A separate "No Data Found" fallback is defined: `LINX-8063` ("BE - Fix Ship Item Validation to handle 'No Data Found' lookup correctly") states when product lookup returns "No Data Found", it is *not* an error — the External ID (i.e., the Product ID itself) is used as the Product Description instead.
- Related lookup: `/master-data/v1/ship-item/identifier/validation` — exact-match validation of a ship-item identifier, example payload/response: `{"lookup": "000000000000100029"}` → `{"000000000000100029": "KYMENE 218 BULK-DO NOT USE"}`.

## 2. Product Class

**Verbatim — `LINX-8131` acceptance criteria (customfield_10032, "Long Order Creation - Product Information Section (Add Product - Product Details)"):**
> Product Class — Same BRs as 'Product Class' [in Quick Order] apply. If the value was entered during Quick Order Creation, it should be retained here...

Product Class, Commodity (STCC), and NMFC are **three distinct fields** in the same section (confirmed by `LINX-9874`'s table column list: "Shipping Class, Shipping Class ID" plus separate Commodity/Harmonized/NMFC fields referenced in LINX-8131). "Shipping Class" in the table UI = Product Class.

**Verbatim — `Verify shipClass is derived from master data lookup` (ticket title):**
> ShipClass = Product Class for Mode-LTL / Commodity code for Mode-Rail

This confirms Product Class is mode-dependent: for LTL, the classification value shown as "Ship Class" is the Product/Freight Class; for Rail, it's the Commodity (STCC) code instead.

**API (Master Data Design-LLD):**

- `POST /master-data/v1/product-service/v1/product-class/lookup` — "Product Class Drop down". Request: `{"lookup": "<prod-class>"}`. Response is paginated (`pageNumber`, `pageSize`, `totalCount`, `data`), same shape family as Product ID lookup.
- `POST /master-data/v1/product-class/validation` (routes to `/product-service/v1/product-class/validation`) — request `{"lookup": "<prod-class>"}` → response `{id: value}`. LLD note: "Exact Match validated against Shipping Class ID."
- `POST /master-data/v1/freight-class/lookup` (routes to `/product-service/v1/freight-class/lookup`) — request `{"lookup": ""}` → response `{"key1": "value1", "key2": "value2"}`. **SQL cited in the LLD: `SELECT REV_ID, REV_REF_VALUE FROM MF_REFERENCE_VALUE WHERE REV_RQ_CODE='FRT_CLASS'`** — this confirms Product Class values are the standard NMFC freight-class reference table (`FRT_CLASS`), i.e. the classic 50–500 class scale, sourced from a reference-value table rather than a free-text field.
- `POST /master-data/v1/freight-class/validation` — `{"lookup": ""}` → `{"flag": true/false}`.
- Related: `GET /master-data/v1/product-service/v1/ship-class` — request `{"lookup": "p"}` (or empty) → response example: `{"P": "Product Class"}` or full map `{"P": "Product Class", "C": "Commodity", "H": "Harmonized", "N": "NMFC"}`. LLD flags uncertainty: "?? Not sure now if we are using this api endpoint — `SELECT * FROM CSUSER.CG_REF_CODES WHERE RV_DOMAIN LIKE 'SHIP_CLASS'`; needs confirmation" (ref `OTMS-923`). Treat this one as **unconfirmed/tentative**.
- `POST /master-data/v1/product-service/v1/ship-class-id` — request `{"pageNumber", "pageSize", "lookup"}` → response `{"data": ["1874973", "2864789", ...], "pageNumber": 1, "pageSize": 25, "totalCount": 10}`. SQL cited: `SELECT * FROM "CSUSER"."MF_SHIPPING_CLASS" WHERE SC_CD_SHIP_CLASS='C' AND SC_CLASS_ID LIKE '%SEARCH_STRING%'` — numeric Shipping Class IDs, distinct from the class code letter itself.
- `POST /master-data/v1/product-service/v1/ship-class-description` — request includes `productClass` / `harmonizedCode` fields (per LLD line ~690).

**Format takeaways:** Product Class values are backed by `MF_REFERENCE_VALUE` where `REV_RQ_CODE='FRT_CLASS'` → a small enumerated reference table, consistent with NMFC freight classes (50, 55, 60, 65, 70, 77.5, 85, 92.5, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500). No literal class-value examples were found in the tickets/LLD (the LLD uses placeholder `key1`/`value1`), so **exact class codes/labels are inferred from domain knowledge of NMFC, not verbatim from source** — flagged for QA confirmation.

## 3. Handling Unit

**Verbatim — `LINX-9879` ("Quick Order Creation - Handling Unit Field"):**
> Single-select dropdown for Handling Unit
> Options listed by frequency of use (highest to lowest)
> Field is optional and can be removed via Manage Column (LINX-8122)
> Handling Unit maps to Packaging ID in Legacy TMS (if available/not null)
> For integrated orders, Packaging identifier from LINX-8064 must be mapped to Handling Unit if present and valid

**API (Master Data Design-LLD) — real catalog values found:**

- `GET /master-data/v1/product-service/v1/handling-units` — "handling units drop down". **Verbatim response example:**
  ```json
  { "BOX": "BOXES", "CN": "CAN", "CONT": "CONTAINER" }
  ```
  LLD annotation: table detail to confirm is `cg_ref_codes.rv_low_value` where `rv_domain = 'HANDLING_UNIT'` (ref `OTMS-988`) — i.e. a legacy Oracle reference-code domain, key = short code, value = full label.
- Separate/related field, **Packaging Identifier** (legacy "Package ID"), has its own lookup+validation pair:
  - `POST /master-data/v1/package-id/lookup` → request `{"lookup": "<search string>"}` → response `["packageID1": "<packageName>", "packageID2": "<packageName>"]` (like-match, used for dropdown).
  - `POST /master-data/v1/package-id/validation` → request `{"lookup": "<search string>"}` → response `{"packageID": "<packageName>"}` (exact match, used in integrated/order processing).
- Related: `POST /product-service/v1/package-group/lookup` (Packing Group dropdown) and `POST /product-service/v1/hazmat-package-group/lookup` (Hazmat Packaging Group) — separate fields, do not conflate with Handling Unit.

**Additional real values, from QA defect tickets (`FE - [LINX-8135] - BR Points Observation Fix` and related "Placeholder" defects against `qa.linx.odysseylogistics.com`):**
> Selecting a Handling Unit value does not auto-populate the HU Description field... Click the Handling Unit dropdown and select "**Drum**"

> Package ID (Packaging Identifier) is text input instead of single-select dropdown [defect] — should be "a single-select dropdown listing existing Package IDs ordered by frequency of use"

From an older backlog item ("Order Line to Pallet"), a **customer-level Handling Unit catalog example** (marked as illustrative, from Master Data, not the LINX-9879 dropdown source-of-truth):
> Handling Unit: Customer Handling Units from Master Data e.g.: Box, Bag, Tote, Tank
> Handling Unit = Pallet (for the parent pallet line)

**Format takeaways:** Real confirmed codes from the LLD dropdown payload: `BOX → BOXES`, `CN → CAN`, `CONT → CONTAINER`. QA tickets confirm `Drum` also exists as a selectable value. Domain-knowledge-consistent (but **not verbatim-confirmed**) additional values commonly seen in this reference domain: Pallet, Bag, Tote, Tank, Crate, Roll, Bundle — these appear in the "Order Line to Pallet" ticket as illustrative customer examples, not as the literal Handling Unit dropdown payload, so treat as **inferred/plausible, not verbatim**, pending QA screenshot confirmation of the full list.

Also relevant: Handling Unit has an associated free-text "HU Description" field, HU Count (must reject 0), and 150-character limits on HU Description/Package ID/Package Description (per defect ticket `FE - [LINX-8135] - BR Points Observation Fix`).

## 4. Harmonized Code

**Verbatim — `LINX-8131` acceptance criteria:**
> Harmonized Code — This is a non-mandatory field. This will be a free text field wherein the user can enter alphanumeric & special characters for the complete HS code (length will vary depending on geography and other factors). Minimum should be 1 character, excluding space, and there is no upper limit on characters that can be entered.
> ... Country codes, Harmonized Codes, Currency should be at a global level, covering all geographies.

So the **UI field itself is free text** (not a dropdown), consistent across Quick Order and Long Order Create flows, and values are retained/synced between the two.

**API (Master Data Design-LLD) — despite being free text in the UI, it is backed by a lookup+validation service, presumably for autocomplete/typeahead and server-side validation:**

- `POST /master-data/v1/harmonized-code/lookup` (routes to `/product-service/v1/harmonized-code/lookup`) — request:
  ```json
  { "pageNumber": "<value>", "pageSize": "<value>", "lookup": "<string>" }
  ```
  response:
  ```json
  { "pageNumber": "<value>", "pageSize": "<value>", "totalCount": "<value>", "data": { "<string>": "<string>.", "<string>": "<string>" } }
  ```
  LLD note: exact query still TBD ("Query: @Sakthivel Kaliswamy to provide the query") — **schema confirmed, but no real example key/value pairs were found** (LLD uses placeholders only).
- Older gateway naming for the same capability (from `Devops-API endpoints update in Prod-Shipment and Masterdata` and `API Getaway creation of the Master service lookup and Validation APIs` tickets):
  - `/master-data/v1/product-service/harmonized/lookup`
  - `/master-data/v1/product-service/harmonized/validation`
  (functionally the same as `harmonized-code/lookup` above; the LLD/tickets use both naming conventions across time — treat `harmonized-code` as the more recent/canonical name.)

**Format takeaways:** No real HS code sample values were found in Jira/Confluence. Standard HS codes globally are numeric, typically 6–10 digits (e.g. `8471.30`), but per the ticket the field explicitly allows "alphanumeric & special characters" and arbitrary length — this is broader than a strict HS code and likely accommodates country-specific tariff schedule formats (e.g. US Schedule B / HTSUS 10-digit, EU CN 8-digit, or supplier-provided codes with dashes/dots). **Recommend generating prototype data as numeric strings formatted like `NNNN.NN.NNNN` (HTSUS-style) for realism, flagged as inferred, not sourced.**

## Cross-cutting notes

- All four fields sit under the `master-data` service, sub-domain `product-service` (gateway prefix `/master-data/v1/`, internal service path `/product-service/v1/...`). This is documented on Confluence page **"Master Data Design-LLD"** (id `2408743006`, space TMS) — *"The document covers all Master Service api details. We have consumers like Order, Shipment etc. who are consuming these apis."*
- Confirmed **live/deployed gateway endpoint list** (from `Devops-API endpoints update in Prod-Shipment and Masterdata`, ticket in LINX project):
  ```
  /master-data/v1/product-service/stcc/lookup
  /master-data/v1/product-service/freightclass/lookup
  /master-data/v1/product-service/harmonized/lookup
  /master-data/v1/product-service/stcc/validation
  /master-data/v1/product-service/freightclass/validation
  /master-data/v1/product-service/harmonized/validation
  /master-data/v1/uom-hazmat-flashpoint/validation
  /master-data/v1/uom-hazmat-boilingpoint/validation
  /master-data/v1/product-service/v1/hazmat-package-group/validation
  /master-data/v1/product-service/v1/ship-class-description
  /master-data/v1/product-service/v1/productclass/validation
  /master-data/v1/equipment/mode-code-description/lookup
  ```
- The full Product Information field set, per `BE-Create Product Info in Quick Order Creation` (tech ref `LINX-8121`): Line # (required), Hazardous, **Product ID**, Product Description (required), Gross Weight (Value & UoM, required), Volume (Value & UoM), **Product Class**, Commodity (STCC), **Harmonized**, NMFC, **Handling Unit** (value and UoM). Confirms all four target fields are distinct top-level fields, not sub-fields of each other.
- Related but out of this note's scope, found along the way: Currency (`declared-value-currency/lookup`), Hazmat Class/Code/Description/Packaging Group, Marine Pollutant, Tunnel Code, Special Services, Batch/Lot Number Type, UoM type (weight/volume) — all live under the same `product-service` sub-domain and follow the same `{lookup, pageNumber, pageSize}` → `{data: {...}, pageNumber, pageSize, totalCount}` request/response convention. Useful reference if the prototype needs more product-adjacent master data later.

## Could NOT be found — needs QA screenshots or SME follow-up

1. **Real Product Class code/label pairs.** Confirmed the field is backed by `MF_REFERENCE_VALUE` where `REV_RQ_CODE='FRT_CLASS'` (i.e., standard NMFC classes), but no actual `{code: label}` values were returned in any ticket or the LLD (placeholders only: `key1`/`value1`). Recommend requesting a QA screenshot of the Product Class dropdown, or asking Jana directly.
2. **Full Handling Unit catalog.** Only 4 values are verbatim-confirmed across all sources (`BOX`, `CN`, `CONT`, `Drum`). The LLD's own example response is illustrative/truncated ("BOXES", "CAN", "CONTAINER", plus "..."). No complete enumerated list was found. Recommend a QA screenshot of the Handling Unit dropdown (per the original ask, e.g. from LINX-8135-related QA runs on `qa.linx.odysseylogistics.com`).
3. **Real Harmonized Code sample values / actual HS code format constraints per geography.** The LLD's lookup response is fully templated (`"<string>": "<string>"`), and the query itself was still pending from `@Sakthivel Kaliswamy` as of this LLD's last edit. No real HS codes were found anywhere in Jira or Confluence search results.
4. **Product record's full field list beyond ID + description.** The `/product/lookup` API only returns `{productId: [description, ...]}` — no SKU category, weight, hazmat flag, or other product-master attributes were found in any lookup response shape. If the prototype needs a richer product record (e.g., a "product master" table with more columns), that data model was not located; may live in a DB schema doc not surfaced by this search, or may need direct SME (Jana) input.
5. **Product Class ↔ Commodity(STCC) ↔ NMFC relationship rules** beyond the LTL/Rail mode-dependency noted above — e.g., whether Product Class and NMFC are ever the same value, or how sub-class suffixes (raised in `Placeholder: Add Sub-Class NMFC Field in Master Data`, e.g. `43955-1`) interact with the base Product Class/NMFC value, was not fully resolved.

## LIVE DEV CAPTURE — 2026-07-28 (closes gaps 1–3)

User captured the Cognizant implementation's fetch from the browser (dev env,
their own Azure AD token); we replayed against the live services. **All values
below are VERBATIM live API responses**, superseding the inferred sections above.

- **Hosts:** product lookup lives on the ORDER service
  (`POST https://dev.order.linx.odysseylogistics.com/order-service/v1/product/lookup`),
  the rest on the master-data gateway
  (`https://dev.masterdata.linx.odysseylogistics.com/master-data/v1/...`).
  Note: NOT the `order-service/v3` or LLD gateway paths — the deployed naming
  differs from the LLD.
- **Product lookup** (`{"lookup":"","pageNumber":0,"pageSize":100}`):
  `totalCount: 2,454,406`. Keys are `P_`-prefixed external IDs. ID formats are
  wildly mixed: 18-digit zero-padded (`P_000000000000100027`), short numerics
  (`P_100027`), SKU-like (`P_3050CTT`, `P_DP1999P5`), dotted legacy
  (`P_000-000031.88`), free text (`P_G I  REBEL FLESH`), and junk test rows
  (`P_"`, `P_jhjuh`). Description arrays: often EMPTY (LINX-8063 fallback
  confirmed in the wild), sometimes multiple, sometimes = the ID itself.
  Encoding artifacts present (`NALCOÂ®`). 2.4M rows ⇒ lazy paged ComboBox
  is mandatory.
- **Handling units** (`GET .../product-service/v1/handling-units`) — the
  COMPLETE catalog is just 5 entries:
  `{"CRT":"Crate","BUL":"Bulk","PLT":"Pallet","BOX":"Box","DRM":"Drum"}`.
  (The LLD's BOXES/CAN/CONTAINER sample was illustrative, not real.)
- **Product Class** (`POST .../product-service/v1/product-class/lookup`) —
  28 rows: the NMFC scale `50 55 60 65 70 77.5 85 92.5 100 110 125 150 175
  200 250 300 350 400 450 500 650`, plus dirty rows (`LTL`, `0`, `3`, `93`,
  zero-padded dupes `055`/`085`, and one stray product row
  `1051331: "ID ALUMINA, HYDRATED ALUMINA"`). Labels are mostly empty strings.
- **Harmonized** (`POST .../product-service/harmonized/lookup`) — dotted
  4-segment HTSUS-style codes (`3401.20.00.00`, `9027.20.6050`), labels mostly
  empty, plus test junk (`H3F1R0PK: "OMG"`). `freight-class/lookup` returned
  404 on this gateway.

Mock updated same day: `HANDLING_UNITS` → the real 5 {code,label} pairs;
`PRODUCT_CLASSES` → the clean NMFC scale incl. 350/450/650 (dirty rows
deliberately excluded); harmonized placeholder → `e.g. 3401.20.00.00`.

### Second capture batch (user, browser network tab — Cognizant Orders, dev)

All verbatim API payloads. Clean values listed; every catalog also carries
test junk (`string`, `herhr`, `askjd`, …) which we exclude from mocks.

- **Freight terms** — `{P: Pre-Paid, C: Collect, N: No Charge, T: Third Party,
  A: Pre-Paid/Add}`. **CLOSES ledger row 2** — the wire codes are single
  letters P/C/N/T/A.
- **Ship direction** — `{O: Outbound, I: Inbound}` — wire codes are O/I, not
  the labels (our SHIP_DIRECTIONS uses label-as-value; reseed checkpoint).
- **Modes** — `{TL: TRUCKLOAD, LTL: LESS THAN TRUCKLOAD, LCL: LESS THAN
  CONTAINER, FCL: FULL CONTAINER LOAD, RR: RAIL, IMD: INTERMODAL, PKG: SMALL
  PACKAGE, AIR: AIR FREIGHT}` (+ dirty dupes Air/Airways/AF/Roadway/string).
  Confirms the lookup-vocabularies equipment/mode codes and adds IMD/PKG/AIR.
- **Carriers** — `totalCount: 11,142`; keys `S_<SCAC>` (S_ prefix like the
  product P_ prefix), values = carrier names, many prefixed `(DNU)` ("do not
  use" retirement convention), some with leading spaces / `~` in codes. Raw
  API is `{S_SCAC: name}` — the "SCAC - NAME" display format from the QA
  screenshot is UI-composed.
- **Ship class TYPES** — `{H: Harmonized, C: Commodity, P: Product, N: NMFC}`
  — confirms the 4-entry map is code-keyed (our SHIP_CLASSES catalog).
- **Handling units (order-service variant)** — the clean 5 (CRT/BUL/PLT/BOX/
  DRM) plus dirty rows (`Drum: Drum`, `LB`, `NO_MAPPING`, `hlu`, `yy`, `po`)
  — i.e. the order-service copy is dirtier than the master-data one; our
  5-entry mock matches the clean subset.
- **UoM weight** — clean: lb, kg, oz, g, ton, t, tn, st, mt, mton, lt, nt,
  cwt, grm, kgm, tne, lbr. Lowercase codes, code=label.
- **UoM volume** — clean: cuft, cbm, m3, gal, l, ltr, dm3, cuin, cuyd, cucm,
  hl, hlt, mm3, teu, feu, ldm, cpm, cutn, mcb.
- **UoM temperature** — clean: c, f, cel.
- **Hazmat class** — free-ish catalog: NOT HAZARDOUS / SLIGHTLY HAZARDOUS /
  Medium Hazardous / HAZARDOUS / EXTREMELY HAZARDOUS + Class1/Class12 +
  numerics — NOT the UN 1–9 class scale; looks like a severity vocabulary
  with dirty casing. Relevant to Add More Details (LINX-8131) hazmat fields.
- **Hazmat packing group** — clean: I, II, III, N/A (+ junk). Standard UN
  packing groups.
- **Phone country codes** — `{+1: United States and Canada, +91: India,
  +52: Mexico, +44: United Kingdom}` — just 4 entries.
- **Timezones** — legacy code → "(UTC±HH:MM) Region" map (IDL/BST/NT/HST/…
  33 entries), e.g. `CST: "(UTC-06:00) US/Central"`. NOTE: differs from
  Efrain's ruled display format "(UTC-06:00) Central Time (US & Canada)" —
  Efrain outranks for display (ORD-07); the legacy codes matter only as wire
  values.

### QA screenshots (inbox 2026-07-28 → vault-sources/10-domains/orders/)

Four dropdown captures from the Cognizant dev UI; they confirm the API
payloads render UNFILTERED (junk rows and all) and settle one UI fact:

- **`Product class.png` — KEY CORRECTION:** the UI column "Product Class"
  renders the 4-TYPE dropdown (Harmonized / Commodity / Product / NMFC — that
  order, label "Product" not "Product Class"), sitting next to a free-text
  "Commodity (STCC)" cell. The NMFC 50–500 catalog from
  `product-class/lookup` is NOT this cell's option list. Our grid reverted to
  the 4-type list same day; `PRODUCT_CLASSES` (NMFC scale) kept in
  master-data for whichever field consumes it (likely the class VALUE once
  type=NMFC — unresolved, ties into gap 5).
- `Handling Unit.png` — dropdown = the order-service payload verbatim
  including junk (Drum/hlu/yy/po/NO_MAPPING/LB/string/Crate/Bulk/Pallet/Box/
  Drum), labels shown. Our clean-5 mock stands.
- `Gross weight.png` / `Volume.png` — UoM selects render the raw lowercase
  code catalogs verbatim (incl. `bkjas`, `string`). Confirms code=label;
  our capitalized display labels are a deliberate design divergence.

- `LINX-9875` — Quick Order Creation - Product ID Dropdown (LINX-8121)
- `LINX-9874` — Quick Order Creation - Product Information Table UI (LINX-8121)
- `LINX-9879` — Quick Order Creation - Handling Unit Field (LINX-8121)
- `LINX-8131` — Long Order Creation - Product Information Section (Add Product - Product Details) [acceptance criteria in customfield_10032]
- `LINX-8121` — Quick Order Creation - Product Information Section (Add Product) [parent/tech reference]
- `LINX-8063` — BE - Fix Ship Item Validation to handle "No Data Found" lookup correctly
- `LINX-8135`-tagged QA defects — FE BR Points Observation Fix; HU/Package Description auto-population defects; Package ID dropdown-vs-text defect (qa.linx.odysseylogistics.com)
- "Verify shipClass is derived from master data lookup" (LINX ticket, untitled key captured)
- "Devops-API endpoints update in Prod-Shipment and Masterdata" / "...Preprod-Shipment and Masterdata" (LINX tickets)
- "API Getaway creation of the Master service lookup and Validation APIs" (LINX ticket)
- "Placeholder: Add Sub-Class NMFC Field in Master Data" (LINX ticket)
- "Order Line to Pallet" (LINX ticket) — illustrative Handling Unit examples
- Confluence: **Master Data Design-LLD**, space TMS, page id `2408743006` — https://odysseylogistics.atlassian.net/wiki/spaces/TMS/pages/2408743006/Master+Data+Design-LLD
- Confluence (referenced, not opened): **Order Domain Design-LLD**, page id `2361917446`; **Order Service (LINX) - LLD**, page id `2630090754` — both surfaced by search but not yet read in detail; may contain additional Order-side payload examples for product line items and are worth a follow-up pass.

---
title: Shipments — Search Progression
domain: shipments
type: canon
tags: [shipments, global-search, progression, attributes, search, filtering]
date: 2026-09-11
status: active
---

# Shipments — Search Progression

The Shipments domain's **search vocabulary**: 27 attributes in 10 groups, the twin of the [[../orders/orders-search-progression|Orders progression]], consumed by the same `useGlobalSearch` hook and criteria core.

**Implementation:** [`apps/odyssey-one/src/search/shipments/progression.js`](../../../apps/odyssey-one/src/search/shipments/progression.js) (`SHIPMENTS_PROGRESSION`, `SHIPMENTS_ATTRIBUTES`, `FREE_TEXT_ATTRS`).
**Taxonomy sheet:** [[data/attributes-progression-grouping|attributes-progression-grouping.csv]] · workbook (one sheet, `Progression Grouping`) at `vault/10-domains/shipments/data/attributes-progression-grouping.xlsx`, copied to `docs/story-packs/shipments-search-progression.xlsx`. Per attribute it states the control Vercel actually renders (`Field Type (as built on Vercel)`, falling back to the 2026-05 proposed type only for rows never built) and whether the attribute is reachable from the search bar (`Search status`: `Live in search` / `Not in search` / `Not in search (skipped in proposal)`).
**Contract it implements:** [[../../20-cross-cutting/global-search/data/attribute-schema|GlobalSearch Attribute Schema]] · behavior canon: [[../../20-cross-cutting/global-search/composed-criteria|Composed Criteria]] · domain landing: [[global-search-adaptation|GlobalSearch — Shipments Adaptation]].

> **Keeping this aligned.** The workbook and the CSV are **generated from the code**, not hand-edited — `npm run progression:sheets`. `npm run progression:audit` fails when a sheet and the code disagree, which is what stops this document drifting from the deployed app again. Change the search vocabulary and you regenerate the sheets and update this file in the same commit.

---

## 1. It came from a stakeholder grouping, and the build moved on

Shipments' progression started as a **stakeholder grouping exercise** (2026-05): a proposed attribute taxonomy, then our own "Suggested Group" pass over it. That sheet is the ancestor of every group name below.

The build then moved past it in three directions, and **for four months the sheet did not follow** — which is the whole reason this document exists:

| What changed | Where |
|---|---|
| `Pickup #` was marked *skipped* in the proposal; it is **implemented**, and it is in the free-text paste set | S104 (R2-2), D3 |
| `Order Count` was never in the proposal; it is **implemented** and `exact` | — |
| A **Classification** group was added — Shipment Type and Planning Type — which the proposal has no equivalent for | S108 |
| 22 proposed attributes were **never built** (§9) | — |

The stakeholder proposal is still worth reading as a proposal. It is not a description of the app, and the sheet now says which is which in a `Status` column.

The opposite rule to Orders' holds here: Shipments' progression is **not** derived from the grid columns. Several attributes are searchable without being a column, because a shipment carries N of them and a column cannot show N values — `Pickup #` is exactly that case.

## 2. One catalog, two consumers — the panel is generated from the progression

This is the **structural difference** from Orders, and the thing to understand before adding a field.

| | Search **bar** | Filters **panel** |
|---|---|---|
| File | `search/shipments/progression.js` | same file |
| Vocabulary | all 27 attributes | **all 27 attributes** |
| Scoping | flat | flat (the `All` tab; the other tab holds saved filters) |

`ShipmentsFiltersView.jsx` imports `SHIPMENTS_PROGRESSION` directly and renders one section per group, so **a new Shipments attribute appears in the filters panel automatically**. Orders has two separate catalogs (`progression.js` for the bar, `registry.js` for the panel) and a new Orders attribute appears in the bar only.

The panel's control is derived from the attribute's own `match` type — there is no per-field widget table to maintain:

| `match` | Panel control |
|---|---|
| `enum` | enum chips, multi-select |
| `letters` | ComboBox, typable; lazy-paged against the values endpoint in live |
| `date` | a date picker **and** a second date-range field |
| `digits` · `both` | text field |

## 3. Group order is the drill-forward order

**Two different labels name each group, and the sheets carry both as separate columns.** Confusing them is the documentation bug this update fixes:

- the **filters panel** section header renders the group **name** (`group.group`) — *Shipment Identifiers*;
- the **suggestions panel** section title renders the group's **drill label** (`group.label`) — *Find the shipment*.

| # | Group (filters panel header) | Suggestions panel header | Attributes |
|---|---|---|---:|
| 1 | Shipment Identifiers | *Find the shipment* | 6 |
| 2 | Customers & Parties | *Who it belongs to* | 4 |
| 3 | Route & Geography | *Where it goes* | 2 |
| 4 | Schedule & Appointments | *When it moves* | 2 |
| 5 | Transport & Equipment | *How it moves* | 4 |
| 6 | Carrier & Tender Status | *Operational status* | 3 |
| 7 | Classification | *Shipment classification* | 2 |
| 8 | Cargo & Handling | *Cargo details* | 1 |
| 9 | Rates & Costs | *Financial details* | 1 |
| 10 | Load Details | *Load logistics* | 2 |

The sequence is **identifier → who → where → when → how → status → classification → cargo → financial → load**, and Orders uses the same one so the empty-bar progression behaves identically across domains.

The meaning of the order is settled in [[../../20-cross-cutting/global-search/composed-criteria|composed-criteria]]: *progression only suggests*. Committing a chip advances the empty-input suggestion list to the group after the furthest group any committed chip belongs to. It never restricts which combinations are valid, and typing always value-matches across all attributes regardless of group.

**Classification sits at 7, deliberately not at the top.** Prime empty-input suggestion slots belong to high-selectivity needles, and a two-value enum matches about half the table.

## 4. Enum values are display labels, never stored codes

Six attributes carry a fixed catalog. Every one of them is `exact`.

| Attribute | Catalog | Source |
|---|---|---|
| Mode | TL · LTL · RR · IMD · AIR | `MODES` |
| Equipment Code | LTL · LTR · LTH · TL · TLR · TLH · TT · TLF · LCL · FCL · RR | `EQUIPMENT_CODES` |
| Tender Status | Sent · Accepted · Declined · Cancelled | — |
| Shipment Status | Review · Done | — |
| Shipment Type | Direct · Consolidation | LINX-11597 verbatim — Direct = 1 mapped order, Consolidation = >1 |
| Planning Type | RDD · SSD | LINX-12902 verbatim — RDD if ANY mapped order is RDD, else SSD |

**Why every enum is `exact` (S130):** a substring match over a fixed catalog is never what the user meant. `Mode: TL` was matching every LTL shipment.

## 5. The row is already flat — the free-text subset is the thing to know

Unlike Orders, Shipments needs no row projection: `shipments.json` rows are flat and display-valued, so the criteria core reads `row[attr.dataKey]` straight. Two fields hold arrays (`orders`, `pickupNumbers`); `fieldIncludes` joins an array on spaces before matching, so a shipment with three pickup numbers is found by any one of them.

What Shipments *does* have is a **restricted free-text set**. A bare code pasted into an empty bar is resolved against `FREE_TEXT_KEYS` only — 15 of the 27 attributes:

> buyShipment · sellShipment · customerId · customerName · origin · destination · scac · orders · pro · load · equipment · seal · consignor · consignee · pickupNumbers

The restriction is deliberate: a row must never be **labelled** or **ranked** by a field the filter did not look at. `FREE_TEXT_ATTRS` keeps them in progression order, which is what breaks ties between two attributes matching the same query equally well.

`pro`, `load`, `equipment` and `seal` were added in S104 — a pasted Pro, BOL, trailer or seal number found nothing before that, and it is the single most likely thing to paste into an empty bar. `pickupNumbers` was added in the same pass (R2-2): the customer's own pickup reference is a prime paste.

Orders has no equivalent export. Its bar matches across all 20 attributes, so there is no restricted subset to document.

## 6. Exact-match fields

Everything else substring-matches. Two count fields and the six enums do not:

- **Order Count** and **Load Count** — `exact: true`. *Order Count: 2* must not match a count of 12.
- **All six enums** — §4.

Orders' `Errors Count` is the same rule, for the same reason.

## 7. Open items

| Topic | The conflict | Owner |
|---|---|---|
| 22 stakeholder attributes not built | The proposal reads like a spec (§9). It is a proposal, and nothing tells a reader which half shipped — until now. | Jana / Shipments |
| `Shipment Type` name collision | The proposal's `Shipment Type` catalog is *Pooling · Cross customer · Line haul · Rule 11*. The **implemented** `Shipment Type` is *Direct · Consolidation* (LINX-11597) — a different field wearing the same name. Reading only the proposal, you would assume the Pooling catalog shipped. | Jana / Shipments |
| Panel and bar share one catalog | Shipments generates the panel from the progression; Orders keeps two catalogs (§2). A new field lands differently in each domain. Worth settling before the domains are handed over. | Manuela / design system |

## 8. The attribute table

Progression order. `match` and `exact` are the code's own fields; the panel columns are derived per §2.

| # | Group | Attribute (bar label) | `dataKey` | `match` | Exact | Example (seeded) | Free-text |
|---:|---|---|---|---|:-:|---|:-:|
| 1 | Shipment Identifiers | Buy Shipment # | `buyShipment` | digits | | `11852604` | ✓ |
| 2 | Shipment Identifiers | Sell Shipment # | `sellShipment` | digits | | `25969909` | ✓ |
| 3 | Shipment Identifiers | Order # | `orders` | both | | `0000000091000` | ✓ |
| 4 | Shipment Identifiers | Order Count | `orderCount` | digits | ✓ | `1` | |
| 5 | Shipment Identifiers | Pro#/Booking # | `pro` | digits | | `441275` | ✓ |
| 6 | Shipment Identifiers | Pickup # ¹ | `pickupNumbers` | both | | `PU-929686` | ✓ |
| 7 | Customers & Parties | Customer ID | `customerId` | letters | | `WEYERH_01` | ✓ |
| 8 | Customers & Parties | Customer Name | `customerName` | letters | | `Weyerhaeuser Company` | ✓ |
| 9 | Customers & Parties | Consignor | `consignor` | letters | | `G2O TECH SOLUTIONS` | ✓ |
| 10 | Customers & Parties | Consignee | `consignee` | letters | | `SOLVAY CHEMICALS PL` | ✓ |
| 11 | Route & Geography | Origin | `origin` | letters | | `Bastrop LA US 71202` | ✓ |
| 12 | Route & Geography | Destination | `destination` | letters | | `Green River WY US 82935` | ✓ |
| 13 | Schedule & Appointments | Pickup Date | `pickupDate` | date | | `06/05/2026 12:30 CDT` | |
| 14 | Schedule & Appointments | Delivery Date | `deliveryDate` | date | | `06/07/2026 12:30 CDT` | |
| 15 | Transport & Equipment | Mode | `mode` | enum (5) | ✓ | `LTL` | |
| 16 | Transport & Equipment | Equipment Code | `equipmentCode` | enum (11) | ✓ | `LTH` | |
| 17 | Transport & Equipment | Equipment # | `equipment` | digits | | `4575` | ✓ |
| 18 | Transport & Equipment | Seal Number | `seal` | letters | | `S447972` | ✓ |
| 19 | Carrier & Tender Status | SCAC | `scac` | letters | | `XPOL` | ✓ |
| 20 | Carrier & Tender Status | Tender Status | `tenderStatus` | enum (4) | ✓ | `Sent` | |
| 21 | Carrier & Tender Status | Shipment Status | `shipmentStatus` | enum (2) | ✓ | `Done` | |
| 22 | Classification | Shipment Type ² | `shipmentType` | enum (2) | ✓ | `Direct` | |
| 23 | Classification | Planning Type | `planningType` | enum (2) | ✓ | `SSD` | |
| 24 | Cargo & Handling | Gross Weight | `grossWeight` | digits | | `6129` | |
| 25 | Rates & Costs | AP Freight Cost | `apFreightCost` | digits | | `4,624.99` | |
| 26 | Load Details | Load # | `load` | digits | | `23492` | ✓ |
| 27 | Load Details | Load Count | `loadCount` | digits | ✓ | `1` | |

Examples are real values from the seeded `src/data/shipments.json` (2,200 rows).

¹ **Was marked *skipped* in the stakeholder proposal; it is implemented.** A Pickup # is an ORDER-header reference copied to the load, so a shipment carries N of them — which is exactly why it could not be found as a shipment *column* (D3, R2-2). Searchable without being a column, and in the free-text set since S104.

² **Not the proposal's `Shipment Type`.** See §7.

## 9. Proposed but not built

22 attributes from the 2026-05 stakeholder grouping are **not in the deployed app**. They stay on the record — carrying `Search status: Not in search` (or `Not in search (skipped in proposal)` for the one the stakeholders themselves marked skipped) in the workbook — because a proposal is worth keeping; they are simply not documentation of the build.

Three of them are a sharper case than "not built": `Shipment Sequence Leg`, `Next Shipment ID` and `Validation Message` are fields that **exist on the seeded `shipments.json` row today** and were simply never exposed to search — the workbook's Notes column says so explicitly for each (`` Field `shipmentSequenceLeg` EXISTS on the shipment row; never exposed to search. `` and the two siblings). That is a smaller gap than the other 19, which have no row data behind them at all.

| Proposed group | Attributes not built |
|---|---|
| Route & Geography | Distance · Stops · Ship Direction |
| Schedule & Appointments | Earliest Pickup Date · Latest Pickup Date · Earliest Delivery Date · Latest Delivery Date |
| Transport & Equipment | Incoterm Info · Freight Terms |
| Cargo & Handling | Net Weight · Tare Weight · Pkg Count · Hazardous (Y/N) |
| Rates & Costs | Preferred AP Direct Cost · AR Freight Cost · Preferred AR Direct Cost |
| Load Details | Load Status |
| Advanced / Rare Fields | Shipment Type *(Pooling · Cross customer · Line haul · Rule 11)* · Shipment Sequence Leg · Next Shipment ID |
| *Skipped in the proposal itself* | Validation Message · SCAC - Tender Status *(combined)* |

Two notes. The app ships **Gross Weight** and **AP Freight Cost** only, one of each family — the other six weight and cost fields are proposals. And the combined `SCAC - Tender Status` was split by the stakeholders into the two separate attributes the app does implement, which is why the combined form is marked skipped rather than missing.

## 10. Related

- [[data/attributes-progression-grouping|Shipments attributes CSV]] — the taxonomy sheet, generated
- [[../orders/orders-search-progression|Orders — Search Progression]] — the sibling domain, same format
- [[global-search-adaptation|GlobalSearch — Shipments Adaptation]] — how the canon lands in this domain
- [[../../20-cross-cutting/global-search/composed-criteria|Composed Criteria]] — what the group order means at runtime
- [[../../20-cross-cutting/global-search/data/attribute-schema|Attribute Schema Contract]]
- [[domain-analysis|Shipments domain analysis]] · [[decisions/decision-log|Shipments decision log]]

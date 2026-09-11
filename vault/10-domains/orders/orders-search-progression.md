---
title: Orders — Search Progression
domain: orders
type: canon
tags: [orders, global-search, progression, attributes, search, filtering]
date: 2026-09-11
status: active
---

# Orders — Search Progression

The Orders domain's **search vocabulary**: 20 attributes in 9 groups, the twin of the [[../shipments/shipments-search-progression|Shipments progression]], consumed by the same `useGlobalSearch` hook and criteria core.

**Implementation:** [`apps/odyssey-one/src/search/orders/progression.js`](../../../apps/odyssey-one/src/search/orders/progression.js) (`ORDERS_PROGRESSION`, `ORDERS_ATTRIBUTES`, `orderSearchRow`), pinned by [`progression.test.js`](../../../apps/odyssey-one/src/search/orders/progression.test.js).
**Taxonomy sheet:** [[data/attributes-progression-grouping|attributes-progression-grouping.csv]] · workbook (one sheet, `Progression Grouping`) at `vault/10-domains/orders/data/attributes-progression-grouping.xlsx`, copied to `docs/story-packs/orders-search-progression.xlsx`. Per attribute it states the control Vercel actually renders (`Field Type (as built on Vercel)`, falling back to the 2026-05 proposed type only for rows never built) and whether the attribute is reachable from the search bar (`Search status`: `Live in search` / `Not in search`).
**Contract it implements:** [[../../20-cross-cutting/global-search/data/attribute-schema|GlobalSearch Attribute Schema]] · behavior canon: [[../../20-cross-cutting/global-search/composed-criteria|Composed Criteria]].

> **Keeping this aligned.** The workbook and the CSV are **generated from the code**, not hand-edited — `npm run progression:sheets`. `npm run progression:audit` fails when a sheet and the code disagree. Change the search vocabulary and you regenerate the sheets and update this file in the same commit.

---

## 1. It is built from the grid columns

Shipments' progression came from a stakeholder grouping exercise — a proposed taxonomy, then our own "Suggested Group" pass. **Orders had no such session.**

> *"Orders have its own columns, that is why we are defining its own progression."* — user ruling, S130 (recorded verbatim in the `progression.js` header)

So the source is [`components/orders/ordersColumns.jsx`](../../../apps/odyssey-one/src/components/orders/ordersColumns.jsx) — every column on all three tabs, and nothing else:

| Tab | Ticket | Columns |
|---|---|---|
| **All** | LINX-11658 | Order Number · Hazardous · Order Source · Order Status · Customer · Ship Direction · Freight Terms · Equipment · Shipper Location · Destination Location · Latest Pickup Date and Time · Latest Delivery Date and Time · Gross Weight · Volume |
| **Draft** | LINX-11663 | Order Number · Customer · Created · Created By · Last Edit · Last Edited By |
| **Validation Errors** | LINX-11659 | Order Number · Customer · **Validation Status** · Errors Count |

The rule cuts **both** ways, and `progression.test.js` enforces both:

- every column on every tab has a progression attribute (a column with no attribute is a field the bar silently cannot find an order by);
- the progression carries **nothing that is not a column** (§9).

The test also pins the shape: 9 groups, 20 attributes, unique keys, every attribute carrying a known `match` type, every `enum` carrying a non-empty value catalog. Three column headers map to a differently-worded attribute label and the test whitelists exactly those three — `Latest Pickup Date and Time` → `Latest Pickup Date`, the same for delivery, and the Validation Errors tab's `Validation Status` staying its own attribute rather than folding into `Order Status`.

**The opposite rule to Shipments' holds here.** Shipments has attributes that are searchable without being a column, because a shipment carries N of them — `Pickup #` is that case. Orders has none by construction.

## 2. Two catalogs, both flat — the panel does NOT come from the progression

This is the **structural difference** from Shipments, and the thing to understand before adding a field.

| | Search **bar** (progression) | Filters **panel** (registry) |
|---|---|---|
| File | `search/orders/progression.js` | `search/orders/registry.js` |
| Vocabulary | all **20** attributes | **13** fields |
| Scoping | flat — one catalog, always all 20 | flat — every field on every tab (ORD-23) |
| Source | the grid columns (S130 ruling) | LINX-10285 / LINX-11663 / LINX-11659 AC, merged |

Because the two are separate files, **a new Orders attribute appears in the bar only**. Shipments generates its panel from the progression, so a new attribute there appears in both automatically.

**Seven attributes have no panel equivalent at all** — Equipment, Ship Direction, Freight Terms, Order Source, Hazardous, Gross Weight, Volume. They are All-tab columns the three stories never listed as basic filters, so they are bar-only. Nothing runs the other way: every registry field has a progression attribute.

Bar-only does **not** mean unfilterable. All 20 attributes narrow the grid through a path separate from the panel's: a committed chip travels as `filters.searchChips` (`src/api/types/orderList.ts`), the mock evaluates it with `matchesChip` over the projected row, and the live path maps it to a column through `CHIP_COLS` in `api/_lib/orders.mjs`. The two implementations are held together by `src/search/orders/chipParity.test.js`.

**Tabs are populations, not filters.** Created (LINX-10777), Draft (LINX-11663) and Validation Errors (LINX-11180) are three disjoint populations, sent as `request.tab` and applied server-side before `filters` ([[decisions/decision-log#ORD-24|ORD-24]]). Bar chips and panel fields AND onto whichever population the tab holds; a criterion the population cannot satisfy yields zero rows and a 0 badge. There is no per-tab special case anywhere in the client. The tab badges narrow with the criteria since S131 (ORD-22) — `buildTabCountsQuery` runs the list's own `orderWhereClauses`, so the counts above the grid agree with the list below.

History: until S139 the panel was tab-scoped on the strength of LINX-10285's strikethrough (*"Basic filters are applicable for ~~all 3~~ 'All' tab only"*); the same story's description says filters "show/hide specific orders in each of the tabs", and the user ruled the per-tab grouping out after the 2026-09-04 meeting with Ramesh (ORD-23). The bar was never scoped (S130): searching for a Created By while the Created tab is open must find the order.

## 3. Group order is the drill-forward order

**Orders carries THREE label sets, and the sheets now carry them as separate columns.** Telling them apart is the documentation gap this update closes:

1. the **suggestions panel** section title renders the group's **drill label** (`group.label`) — *Find the order*;
2. the **bar's** attribute grouping uses the group **name** (`group.group`) — *Customers & Parties*;
3. the **filters panel** section header renders the **registry's own** group name — and there are only five of those, which do not match the nine above (§7).

| # | Group (bar) | Suggestions panel header | Attributes |
|---|---|---|---:|
| 1 | Order Identifiers | *Find the order* | 1 |
| 2 | Customers & Parties | *Who it belongs to* | 1 |
| 3 | Route & Geography | *Where it goes* | 2 |
| 4 | Schedule & Appointments | *When it moves* | 2 |
| 5 | Transport & Equipment | *How it moves* | 3 |
| 6 | Order Status & Source | *Operational status* | 4 |
| 7 | Classification | *Order classification* | 1 |
| 8 | Cargo & Handling | *Cargo details* | 2 |
| 9 | Created & Edited | *Who touched it* | 4 |

The sequence is **identifier → who → where → when → how → status → classification → cargo → audit**, the same one Shipments uses, so the empty-bar progression behaves identically across domains. Groups 1–8 reuse the Shipments group names wherever the concept matches. **"Created & Edited" is new** — Shipments has no audit columns, and the Orders Draft tab is built on them.

The meaning of the order is settled in [[../../20-cross-cutting/global-search/composed-criteria|composed-criteria]]: *progression only suggests*. Committing a chip advances the empty-input suggestion list to the group after the furthest group any committed chip belongs to. It never restricts which combinations are valid, and typing always value-matches across all attributes regardless of group.

## 4. Enum values are display labels, never stored codes

Six attributes carry a fixed catalog. Every one of them is `exact`.

| Attribute | Catalog | Stored as |
|---|---|---|
| Equipment | LTL · LTR · LTH · TL · TLR · TLH · TT · TLF · LCL · FCL · RR | the code itself |
| Ship Direction | Outbound · Inbound | `'O'` / `'I'` |
| Freight Terms | Pre-Paid · Collect · Pre-Paid/Add · Third Party · No Charge | `'P'` `'C'` `'A'` `'T'` `'N'` |
| Order Status | Draft · Ready for Planning · Planned Load · Planned Shipment · Planning Failed · Shipment Failed · Hold · Cancelled | the label |
| Order Source | Integrated · Manual | `'INTEGRATED'` / `'MANUAL'` |
| Validation Status | Error · Complete · Purge | `'Error'` … |
| Hazardous | Hazmat | `true` / `false` |

**Why labels:** a chip has to read the way the column reads. The alternative — chip shows a label, matcher compares a code — needs a code↔label split in every consumer. Instead the *row* is projected to labels and the matcher compares labels, so the catalog and the row speak one language. `progression.test.js` guards this from both ends: `values` must equal `['Outbound','Inbound']`, not `['O','I']`, and every enum must be `exact: true`.

Two notes on specific catalogs:

- **Order Status is eight values, Hold included** (domain-analysis §4, ORD-24). The bar's catalog is the full lifecycle; the Created tab's own Order Status *filter* strips `Draft` back out, because Draft has its own tab and is never a Created-tab option (D3).
- **Validation Status lost `Ready`.** LINX-11659 said *"options are Complete, Ready & Purge"*; LINX-16391 replaced `Ready` with `Error`, and Ramesh confirmed on 2026-09-10 that *"since OIF errors step 1 & step 2 are fixed in 1 login session, 'Ready' is not required"* (ORD-26). The live vocabulary is **Error / Complete / Purge**.
- **Hazardous is one value.** The column renders a `Hazmat` badge or `-`, so `Hazmat` is the only value a user can read and therefore type. `Yes`/`No` was invented here and matched nothing anybody could see (S130).

## 5. `orderSearchRow` — the row the matcher reads

The criteria core reads `row[attr.dataKey]` **directly** (`fieldIncludes`), with no path support. An orders row is not flat: locations are objects, dates are ISO timestamps, weight and volume are `{ value, uom }`, three fields are stored as codes and one as a boolean.

`orderSearchRow(row)` is the single place that gap closes — one flat, display-valued field per progression `dataKey`:

- **Locations** → `"<name>, <city>, <state>, <country>"` — facility name first, because that is what people say, then the city/state/country the panel filters on.
- **Dates** → ISO to `M/D/YYYY`, the shape `parseSearchDate` reads. **Time-of-day is dropped**: the columns show it, but no date criterion is finer than a day and a trailing time would only ever be noise in a chip label.
- **Measures** → the numeric value as a string, uom dropped.
- **Codes and booleans** → display labels (§4). A blank projects to `''`, which matches nothing — the same rule every empty field follows, and what keeps a Validation Errors row (which carries `orderStatus: null`, having never entered the lifecycle) from matching an Order Status chip.

It is the mock twin of what a live search index would project server-side. Whether the eventual API projects exactly this shape is **not yet settled** — flagged as inference in the source header too. The test asserts every one of the 20 `dataKey`s resolves to a non-empty string on a projected row, which is what stops a silently unreachable attribute.

Shipments needs no projection at all: its rows are already flat. What it has instead is a restricted free-text subset, which Orders does not — the Orders bar matches across all 20 attributes.

## 6. Exact-match fields

Everything else substring-matches. `Errors Count` and the six enums do not.

**Errors Count is the same field with two deliberately different controls:**

- **Bar** — `match: 'digits', exact: true`. `Errors Count: 1` must not match 12. Same rule as Shipments' Order Count.
- **Panel** — an operator Dropdown plus an integer field (`Greater Than` / `Equals` / `Less Than`, LINX-11659 verbatim), mapped to `errorCountOperator` + `errorCountValue`.

**Why they differ:** a bar chip has no room for an operator, so the bar's version is equality only. The comparator is a panel affordance; the bar's is the fast path.

## 7. Open items

| Topic | The conflict | Owner |
|---|---|---|
| Location naming | The panel filters `origin`/`destination` as City-State-Country triples and labels them *Origin City, State, Country*; the column and the bar say *Shipper Location* / *Destination Location* and match the flattened string **including the facility name**. So `G2O TECH` finds an order in the bar but is not an option in the panel. | Ramesh / Orders |
| Panel group names diverge from the bar's | The 2026-09-07 ruling was to group the panel filters the way Shipments groups them, and the grouping does mirror it — but the **names** were never aligned. The panel says *Schedule* / *Audit Trail* / *Draft & Errors* where the bar says *Schedule & Appointments* / *Created & Edited* / *Order Status & Source*, and it files Customer and Order Status under *Order Identifiers*. Neither is wrong on its own; the same field is simply named by two different groups depending on the surface. | Ramesh / Orders |
| Two of three Validation Status values are unreachable | The catalog is Error / Complete / Purge, but every Validation Errors row in the mock **and in Neon** carries `Error` — 1,430 of 1,430 live. A chip or panel selection for Complete or Purge returns nothing, so neither branch has ever run against data. | Ramesh / Orders |

The bar uses the **column's** name because the column is what a user is reading when they type. Reconciling any of these labels is an Orders-team decision, not a silent rename on either side.

~~Two smaller label drifts sat in the same bucket~~ — **closed by ORD-23 (2026-09-04):** the panel now says **Errors Count** and **Last Edited By**, matching the columns. The third, ~~*Draft Order Status*~~, was closed by the 2026-09-10 rename to **Validation Status** (*not* "Validation Order Status"). The `draftOrderStatus` / `draftOrderStatuses` **key** is untouched — it is the wire contract and Neon's `draft_order_status` column, and the divergence is commented at every site.

## 8. The attribute table

Progression order. `match` and `exact` are the code's own fields; the panel columns record what `registry.js` offers for the same concept.

| # | Group | Attribute (bar label) | `dataKey` | `match` | Exact | Example (seeded) | Panel label | Panel section |
|---:|---|---|---|---|:-:|---|---|---|
| 1 | Order Identifiers | Order Number | `orderNumber` | both | | `0000000091000` | Order Number | Order Identifiers |
| 2 | Customers & Parties | Customer | `customer` | letters | | `WEYERH_01` | Customer | Order Identifiers |
| 3 | Route & Geography | Shipper Location | `shipperLocation` | letters | | `G2O TECH SOLUTIONS, Bastrop, LA, US` | Origin City, State, Country ⚠ | Route & Geography |
| 4 | Route & Geography | Destination Location | `destinationLocation` | letters | | `SOLVAY CHEMICALS PL, Green River, WY, US` | Destination City, State, Country ⚠ | Route & Geography |
| 5 | Schedule & Appointments | Latest Pickup Date | `latestPickup` | date | | `6/5/2026` | Latest Pickup Date | Schedule |
| 6 | Schedule & Appointments | Latest Delivery Date | `latestDelivery` | date | | `6/7/2026` | Latest Delivery Date | Schedule |
| 7 | Transport & Equipment | Equipment | `equipment` | enum (11) | ✓ | `LTR` | — none | |
| 8 | Transport & Equipment | Ship Direction | `shipDirection` | enum (2) | ✓ | `Outbound` | — none | |
| 9 | Transport & Equipment | Freight Terms | `freightTerms` | enum (5) | ✓ | `Pre-Paid/Add` | — none | |
| 10 | Order Status & Source | Order Status | `orderStatus` | enum (8) | ✓ | `Planned Load` | Order Status | Order Identifiers |
| 11 | Order Status & Source | Order Source | `orderSource` | enum (2) | ✓ | `Integrated` | — none | |
| 12 | Order Status & Source | Validation Status ¹ | `draftOrderStatus` | enum (3) | ✓ | `Complete` | Validation Status | Draft & Errors |
| 13 | Order Status & Source | Errors Count ² | `errorCount` | digits | ✓ | `1` | Errors Count *(comparator)* | Draft & Errors |
| 14 | Classification | Hazardous | `hazardous` | enum (1) | ✓ | `Hazmat` | — none | |
| 15 | Cargo & Handling | Gross Weight | `grossWeight` | digits | | `6129` | — none | |
| 16 | Cargo & Handling | Volume | `volume` | digits | | `166` | — none | |
| 17 | Created & Edited | Created | `createdDate` | date | | `5/29/2026` | Created Date | Audit Trail |
| 18 | Created & Edited | Created By | `createdBy` | letters | | `ben.planner` | Created By | Audit Trail |
| 19 | Created & Edited | Last Edit | `lastEditDate` | date | | `9/15/2026` | Last Edit Date | Audit Trail |
| 20 | Created & Edited | Last Edited By | `lastEditedBy` | letters | | `cara.planner` | Last Edited By | Audit Trail |

Examples are real values from the seeded `src/data/orders.json` (5,077 rows). ⚠ marks a label that does not agree with the panel (§7). Only 102 of the 5,077 seeded orders carry a `lastEditAt`.

¹ **Renamed 2026-09-10 (Ramesh, S145)** — was `Draft Order Status`, now **Validation Status**, *not* "Validation Order Status". Label only: the `dataKey` stays `draftOrderStatus`, the wire field and Neon's `draft_order_status` column.

² **Meaning widened 2026-09-10 (Ramesh, S145)** — the value is the TOTAL of both OIF levels, `errorCount` (Level 2 / master data, LINX-11137) **+** `interfaceErrorCount` (Level 1 / structural, LINX-16049), because *"Error = Order has structural and/or master data error"* and both levels are fixed in one login session. The header text is unchanged; it is simply accurate now. Derived once in `mapOrderListRow.totalErrorCount`, which the grid cell, the export, `orderSearchRow` and the mock filter all read, so display and query cannot diverge. **The live path sums both columns too** — migration `010_orders_interface_errors.sql` added `interface_error_count` to Neon in S145, closing Q-OIF-4, and `api/_lib/orders.mjs` compares `(error_count + coalesce(interface_error_count, 0))` in both the filter and the sort.

## 9. On the row, deliberately not searchable

Orders' progression is column-derived, so there is no stakeholder proposal to reconcile — Shipments has 22 such attributes. What Orders records instead is the fields that **exist on the row and are deliberately excluded**, because `progression.test.js` enforces "nothing that is not a column":

| Field | Why not |
|---|---|
| `poNumber` | on the row, on no grid |
| `commodity` | on the row, on no grid |
| `planningDateType` | on the row, on no grid |
| the `earliest*` timestamps | the grids show the `latest*` pair only |

Adding one means adding a column, an attribute and an `orderSearchRow` field **together**. That is the rule, and the test is what enforces it. All four carry `Search status: Not in search` in the workbook, and `Field Type (as built on Vercel): Proposed — no control built` — unlike Shipments' three data-exists rows (its own §9), no Orders field is known to already exist on the row without being searchable.

## 10. Related

- [[data/attributes-progression-grouping|Orders attributes CSV]] — the taxonomy sheet, generated
- [[../shipments/shipments-search-progression|Shipments — Search Progression]] — the sibling domain, same format
- [[../../20-cross-cutting/global-search/composed-criteria|Composed Criteria]] — what the group order means at runtime
- [[../../20-cross-cutting/global-search/data/attribute-schema|Attribute Schema Contract]]
- [[domain-analysis|Orders domain analysis]] · [[decisions/decision-log|Orders decision log]] · [[research/jira-orders-table-columns-2026-07-26|Orders table — Jira column research]]

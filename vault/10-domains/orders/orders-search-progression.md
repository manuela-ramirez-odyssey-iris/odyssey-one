---
title: Orders — Search Progression
domain: orders
type: canon
tags: [orders, global-search, progression, attributes, search, filtering]
date: 2026-08-24
status: active
---

# Orders — Search Progression

The Orders domain's **search vocabulary**: 20 attributes in 9 groups, the twin of the Shipments progression, consumed by the same `useGlobalSearch` hook and criteria core.

**Implementation:** [`apps/odyssey-one/src/search/orders/progression.js`](../../../apps/odyssey-one/src/search/orders/progression.js) (`ORDERS_PROGRESSION`, `ORDERS_ATTRIBUTES`, `orderSearchRow`), pinned by [`progression.test.js`](../../../apps/odyssey-one/src/search/orders/progression.test.js).
**Taxonomy sheet:** [[data/attributes-progression-grouping|attributes-progression-grouping.csv]] (also `.xlsx`).
**Contract it implements:** [[../../20-cross-cutting/global-search/data/attribute-schema|GlobalSearch Attribute Schema]] · behavior canon: [[../../20-cross-cutting/global-search/composed-criteria|Composed Criteria]].

---

## 1. It is built from the grid columns

Shipments' progression came from a stakeholder grouping exercise (a proposed attribute taxonomy, then our "Suggested Group" pass — see the Shipments CSV). **Orders had no such session.** Instead:

> *"Orders have its own columns, that is why we are defining its own progression."* — user ruling, S130 (recorded verbatim in the `progression.js` header)

So the source is [`components/orders/ordersColumns.jsx`](../../../apps/odyssey-one/src/components/orders/ordersColumns.jsx) — every column on all three tabs, and nothing else:

| Tab | Ticket | Columns |
|---|---|---|
| **All** | LINX-11658 | Order Number · Hazardous · Order Source · Order Status · Customer · Ship Direction · Freight Terms · Equipment · Shipper Location · Destination Location · Latest Pickup Date and Time · Latest Delivery Date and Time · Gross Weight · Volume |
| **Draft** | LINX-11663 | Order Number · Customer · Created · Created By · Last Edit · Last Edited By |
| **Validation Errors** | LINX-11659 | Order Number · Customer · Draft Order Status · Errors Count |

The rule cuts **both** ways, and `progression.test.js` enforces both:

- every column on every tab has a progression attribute (a column with no attribute is a field the bar silently cannot find an order by);
- the progression carries **nothing that is not a column**. `poNumber`, `commodity`, `planningDateType` and the `earliest*` timestamps exist on the row and are deliberately out. Adding one means adding a column, an attribute and an `orderSearchRow` field together.

The test also pins the shape: 9 groups, 20 attributes, unique keys, every attribute carrying a known `match` type, every `enum` carrying a non-empty value catalog.

Three column headers map to a differently-worded attribute label; the test whitelists exactly those three (`Latest Pickup Date and Time` → `Latest Pickup Date`, same for delivery, and the Validation Errors tab's `Draft Order Status` staying its own attribute rather than folding into `Order Status`).

## 2. Flat for the bar, tab-scoped for the panel

Orders has **two** filter vocabularies, and they are scoped differently on purpose.

| | Search **bar** (progression) | Filters **panel** (registry) |
|---|---|---|
| File | `search/orders/progression.js` | `search/orders/registry.js` |
| Scoping | **flat** — one catalog, always all 20 | **tab-scoped** — `attrsForTab(tab)` |
| Source | the grid columns (S130 ruling) | LINX-10285 / LINX-11663 / LINX-11659 AC |

The panel's tab-scoping is an explicit ruling, not an oversight — LINX-10285 carries it with the strikethrough intact: *"Basic filters are applicable for ~~all 3~~ **'All' tab only**"*.

The bar is not scoped, per the S130 ruling: searching for a Created By while the All tab is open must find the order, and a vocabulary that shifted under the user on every tab switch would be its own bug. **One catalog, two consumers with different scoping rules.**

## 3. Group order is the drill-forward order

The order is the same drill sequence Shipments uses, so the empty-bar progression behaves identically across domains: **identifier → who → where → when → how → status → classification → cargo → audit.**

| # | Group | Drill label (suggestion-panel title) | Attributes |
|---|---|---|---|
| 1 | Order Identifiers | *Find the order* | 1 |
| 2 | Customers & Parties | *Who it belongs to* | 1 |
| 3 | Route & Geography | *Where it goes* | 2 |
| 4 | Schedule & Appointments | *When it moves* | 2 |
| 5 | Transport & Equipment | *How it moves* | 3 |
| 6 | Order Status & Source | *Operational status* | 4 |
| 7 | Classification | *Order classification* | 1 |
| 8 | Cargo & Handling | *Cargo details* | 2 |
| 9 | Created & Edited | *Who touched it* | 4 |

Groups 1–8 reuse the Shipments group names wherever the concept matches. **"Created & Edited" is new** — Shipments has no audit columns, and the Orders Draft tab is built on them.

The meaning of the order is the one already settled in [[../../20-cross-cutting/global-search/composed-criteria|composed-criteria]]: *progression only suggests*. Committing a chip advances the empty-input suggestion list to the next group after the furthest group any committed chip belongs to; it never restricts which combinations are valid, and typing always value-matches across all attributes regardless of group.

## 4. Enum values are display labels, never stored codes

Three fields are stored as codes and one as a boolean, but the grid shows the label:

| Attribute | Stored | Progression / chip value |
|---|---|---|
| Ship Direction | `'O'` / `'I'` | `Outbound` / `Inbound` |
| Freight Terms | `'A'` `'T'` `'P'` `'N'` `'C'` | `Pre-Paid/Add` · `Third Party` · `Pre-Paid` · `No Charge` · `Collect` |
| Order Source | `'INTEGRATED'` / `'MANUAL'` | `Integrated` / `Manual` |
| Hazardous | `true` / `false` | `Yes` / `No` |

**Why:** a chip has to read the way the column reads. The alternative — chip shows a label, matcher compares a code — needs a code↔label split in every consumer. Instead the *row* is projected to labels and the matcher compares labels, so the catalog and the row speak one language. `progression.test.js` guards this from both ends: `values` must equal `['Outbound','Inbound']` (not `['O','I']`), and every enum must be `exact: true` — a fixed catalog never substring-matches.

## 5. `orderSearchRow` — why the projection exists

The criteria core reads `row[attr.dataKey]` **directly** (`fieldIncludes`), with no path support. An orders row is not flat:

- locations are objects (`consignor` / `consignee` with name, city, state, country);
- dates are ISO timestamps;
- weight and volume are `{ value, uom }`;
- three enums are stored as codes, one as a boolean.

`orderSearchRow(row)` is the single place that gap closes — one flat, display-valued field per progression `dataKey`. Specifically:

- **Locations** → `"<name>, <city>, <state>, <country>"` — facility name first, because that is what people say, then the city/state/country the panel filters on.
- **Dates** → ISO to `M/D/YYYY`, the shape `parseSearchDate` reads. **Time-of-day is dropped**: the columns show it, but no date criterion is finer than a day and a trailing time would only ever be noise in a chip label.
- **Measures** → the numeric value as a string, uom dropped.
- **Codes/booleans** → display labels (§4).

It is the mock twin of what a live search index would project server-side — *stated as such in the source header; whether the eventual API projects exactly this shape is not yet settled (inference flagged).* The test asserts every one of the 20 `dataKey`s resolves to a non-empty string on a projected row, which is what stops a silently unreachable attribute.

## 6. Errors Count: exact in the bar, comparator in the panel

The same field, two deliberately different controls.

- **Bar** — `match: 'digits', exact: true`. `Errors Count: 1` must not match 12. Same reasoning as Shipments' Order Count.
- **Panel** — an operator Dropdown + integer field (`Greater Than` / `Equals` / `Less Than`, LINX-11659 verbatim), mapped to `errorCountOperator` + `errorCountValue`.

**Why they differ:** a bar chip has no room for an operator, so the bar's version is equality only. The comparator is a panel affordance; the bar's is the fast path.

## 7. Open — the location naming conflict

Not resolved, and deliberately not silently renamed on either side.

| | Panel (`registry.js`) | Columns + progression |
|---|---|---|
| Key | `origin` / `destination` | `shipper-location` / `destination-location` |
| Label | *Origin City, State, Country* / *Destination City, State, Country* | *Shipper Location* / *Destination Location* |
| Data | `consignor` / `consignee`, filtered as `City\|State\|Country` triples | flattened text **including the facility name** |

The panel filters a location as a City-State-Country triple (LINX-10285's own matching rule: the query hits if it appears in City OR State OR Country — "MI" → Miami/Florida/US, Detroit/Michigan/US, Palikir/Micronesia). The bar matches the flattened string, facility name included, so `G2O TECH` finds an order in the bar but is not an option in the panel.

The bar uses the **column's** name because the column is what a user is reading when they type. Reconciling the two labels — and whether the panel's option set should carry the facility name too — is an open item for the Orders team (Ramesh), not a silent rename of either.

Two smaller label drifts sit in the same bucket: the panel labels `draftOrderStatus` **"Order Status"** while the column and progression say **"Draft Order Status"**, and it labels `errorCount` **"Error Count"** / `lastEditedBy` **"Last Edit By"** against the columns' **"Errors Count"** / **"Last Edited By"**.

## 8. The attribute table

Progression order. `match` and `exact` are the code's own fields; Panel column records what `registry.js` offers for the same concept, and on which tabs.

| # | Group | Attribute | `dataKey` | `match` | Example (seeded) | Panel equivalent |
|---:|---|---|---|---|---|---|
| 1 | Order Identifiers | Order Number | `orderNumber` | both | `0000000091000` | text — all 3 tabs |
| 2 | Customers & Parties | Customer | `customer` | letters | `WEYERH_01` | lazy ComboBox — all 3 tabs |
| 3 | Route & Geography | Shipper Location | `shipperLocation` | letters | `G2O TECH SOLUTIONS, Bastrop, LA, US` | *Origin City, State, Country* — All ⚠ |
| 4 | Route & Geography | Destination Location | `destinationLocation` | letters | `SOLVAY CHEMICALS PL, Green River, WY, US` | *Destination City, State, Country* — All ⚠ |
| 5 | Schedule & Appointments | Latest Pickup Date | `latestPickup` | date | `6/5/2026` | date-range — All |
| 6 | Schedule & Appointments | Latest Delivery Date | `latestDelivery` | date | `6/7/2026` | date-range — All |
| 7 | Transport & Equipment | Equipment | `equipment` | enum · exact (11) | `LTR` | — none |
| 8 | Transport & Equipment | Ship Direction | `shipDirection` | enum · exact (2) | `Outbound` | — none |
| 9 | Transport & Equipment | Freight Terms | `freightTerms` | enum · exact (5) | `Pre-Paid/Add` | — none |
| 10 | Order Status & Source | Order Status | `orderStatus` | enum · exact (7) | `Load Planned` | enum chips — All only |
| 11 | Order Status & Source | Order Source | `orderSource` | enum · exact (2) | `Integrated` | — none |
| 12 | Order Status & Source | Draft Order Status | `draftOrderStatus` | enum · exact (3) | `Complete` | enum chips as *Order Status* — VE ⚠ |
| 13 | Order Status & Source | Errors Count | `errorCount` | digits · exact | `1` | comparator as *Error Count* — VE |
| 14 | Classification | Hazardous | `hazardous` | enum · exact (2) | `No` | — none |
| 15 | Cargo & Handling | Gross Weight | `grossWeight` | digits | `6129` | — none |
| 16 | Cargo & Handling | Volume | `volume` | digits | `166` | — none |
| 17 | Created & Edited | Created | `createdDate` | date | `5/29/2026` | date-range as *Created Date* — Draft |
| 18 | Created & Edited | Created By | `createdBy` | letters | `ben.planner` | lazy ComboBox — Draft |
| 19 | Created & Edited | Last Edit | `lastEditDate` | date | `9/15/2026` | date-range as *Last Edit Date* — Draft |
| 20 | Created & Edited | Last Edited By | `lastEditedBy` | letters | `cara.planner` | lazy ComboBox as *Last Edit By* — Draft |

Examples are real values from the seeded `src/data/orders.json` (5,077 rows). ⚠ marks a label that does not agree with the panel (§7).

**Seven attributes have no panel equivalent at all** — Equipment, Ship Direction, Freight Terms, Order Source, Hazardous, Gross Weight, Volume. They are All-tab columns the three stories never listed as basic filters, so they are bar-only. Nothing runs the other way: every registry attribute has a progression attribute.

Bar-only does **not** mean unfilterable. All 20 attributes narrow the grid, through a criteria path that is separate from the panel's fields: a committed chip travels as `filters.searchChips` (`api/types/orderList.ts`), the mock evaluates it with `matchesChip` over the projected row, and the live path maps it to a column through `CHIP_COLS` in `api/_lib/orders.mjs`. That separation is what lets the bar stay flat while the panel stays tab-scoped per LINX-10285, without either one bending to the other. The two implementations are held together by `src/search/orders/chipParity.test.js` — the same server-twin arrangement the Shipments search registry has.

Two consequences worth knowing. Enum chips carry the **display label** (`Outbound`, `Pre-Paid/Add`, `Hazmat`), so the live path maps label → stored code before comparing; a label outside the catalog matches nothing rather than falling through to the raw text. And the main **tab badges do not yet narrow** with bar criteria — `buildTabCountsQuery` takes only the customer scope, so the counts above the grid can disagree with the list below it. That gap predates the chip path (free text never narrowed them either) and is the next obvious slice; Shipments' own `buildCountsQuery` records the rule: *"Tab badges must narrow with the search, or they contradict the grid below them."*

## 9. Related

- [[data/attributes-progression-grouping|Orders attributes CSV / XLSX]] — the taxonomy sheet
- [[../shipments/data/attributes-progression-grouping|Shipments attributes CSV]] — the precedent this mirrors
- [[../shipments/global-search-adaptation|GlobalSearch — Shipments Adaptation]] — the sibling domain adaptation
- [[../../20-cross-cutting/global-search/composed-criteria|Composed Criteria]] — what the group order means at runtime
- [[../../20-cross-cutting/global-search/data/attribute-schema|Attribute Schema Contract]]
- [[10-domains/orders/domain-analysis|Orders domain analysis]] · [[10-domains/orders/research/jira-orders-table-columns-2026-07-26|Orders table — Jira column research]]

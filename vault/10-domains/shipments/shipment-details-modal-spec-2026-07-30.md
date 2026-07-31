---
domain: shipments
type: spec-intake
tags: [shipment-details, modal, udf, customer-reference, cost, stops, LINX]
date: 2026-07-30
status: partially-implemented
source: vault-sources/10-domains/shipments/shipment-details-modal-spec-2026-07-30.png
---

# Shipment Details — annotated spec (2026-07-30 inbox)

Annotated wireframe drawn over screenshots of **our own built app** (the Cost
Information pane and the Stops pane are verbatim captures of `CostAllocationTab`
and `StopsTab`). Author not stated on the artifact — **provenance is an open
question** (see below).

## What the artifact specifies

**Header strip** (5 key/value chips across the top):

| Field | Value in mock | Note |
|---|---|---|
| Buy Shipment | `8956` | |
| Pro/Booking # | `67819A88` | |
| Tracking Link | *(link)* | rendered as a hyperlink, no label/value pair |
| Rating Status | `Successful` | |
| Sell Shipment | `9678` | rendered as a link |

**§ General Information** (label/value table):

| Field | Value in mock | Annotation |
|---|---|---|
| Source Name | `USALCO` | *"`org_long_name` looked up using `SOURCE_ID` passed on order"* |
| Shipment Status | `Accepted` | |
| Carrier | `CTNS` | |
| Pickup Date/Time | — | *"from current option"* (i.e. the accepted routing option) |
| Delivery Date/Time | — | *"from current option"* |
| Gross Weight | `44470 LB` | |
| Volume | `200 cuft` | |
| Mode | `LTL` | |
| Equipment | `LTL` | |
| Freight Term | `Collect` | |
| Hazmat | `Yes` | *"Yes / No"* |

**§ Cost** — the existing Cost Information pane (Planned/Completed toggle) plus a
side table naming the required rollup: Base, Fuel (FSC), Accessorials,
**AP Total (Carrier)**, **AR Total (Customer)**, Margin (`$250 – 7.7%`),
**Direct Cost**.

**§ Stops** — the existing Stops pane, marked with a move/drag handle. Annotations:
- hyperlink on the order
- address should be included
- *"Check story – LINX-"* (**ticket number left blank in the artifact**)

**§ User Defined Fields** — a wide table, one row per order (`L14372086`,
`L14372084`), columns: `TEMP_SENSITIVITY`, `CONTACT`, `DATE AVAILABLE`,
`PICKUP #`, `MANUAL SHIPMENT PLANNING`, `STATUS 1`, `STATUS 2`,
`MANUAL TRACKING REQUEST`, `AFTER HOURS`, `EXTERNAL_TRANSACTION_ID`,
`ALD_USER11` … `ALD_USER17`.

**§ Customer Reference Values** — a two-column table keyed by the same order ids.

## Gap vs what is built

`apps/odyssey-one/src/components/detail/ShipmentDetailsModal.jsx` (S102, Figma
1348:16364) organizes information as four sections — **Shipment / Order /
Initial Pickup / Final Delivery**. The artifact organizes it as **header strip /
General Information / Cost / Stops / User Defined Fields / Customer Reference
Values**. These are different information models, not a superset/subset.

Fields in the artifact that the modal does not show today: Source Name,
Shipment Status, Carrier, Freight Term, Pro/Booking #, Tracking Link, Rating
Status, Cost rollup, Stops, UDFs, Customer Reference Values.

Fields the modal shows that the artifact does not: Pkg Count, Distance,
Instructions, Planning Date Type, Order Pickup/Delivery Date, Pickup #,
Initial Pickup / Final Delivery party blocks.

## Data availability (checked 2026-07-30)

| Artifact field | Available today? | Where |
|---|---|---|
| Buy / Sell Shipment | yes | `ShipmentRowVM` |
| Pro/Booking # | yes | `OrderDetailVM.proBooking`, row `pro` |
| Rating Status | yes on the wire, **dropped by the mapper** | `SellShipmentOut.ratingStatus` |
| Freight Term | yes on the wire, **dropped by the mapper** | `SellShipmentOut.freightTerms` |
| Shipment Status | yes | `ShipmentRowVM.shipmentStatus` |
| Carrier | yes | `StopsSummaryVM.acceptedCarrier`, row `scac` |
| Pickup/Delivery Date/Time from current option | yes | `RoutingOptionVM` (accepted option) |
| Gross Weight / Volume / Mode / Equipment / Hazmat | yes | row + `StopsSummaryVM` + `OrderDetailVM.hazmat` |
| Cost rollup incl. Direct Cost | yes | `CostSummaryVM` + `CostOrderVM.directCost` |
| Stops (with address, order link) | yes | `StopVM` already carries `order` + `address` |
| **Tracking Link** | **no** | no field anywhere in the contract or generator |
| **User Defined Fields** | **no** | no field, no column, no seed data |
| **Customer Reference Values** | **no** | no field, no column, no seed data |

Source Name deserves its own note: the artifact defines it as a **lookup**
(`org_long_name` by `SOURCE_ID` from the order), not a stored shipment
attribute. Nothing in the current contract carries `SOURCE_ID`.

## Rulings (user, 2026-07-30)

- **Scope** — this IS the Shipment Details modal, and it is *"a summary of the
  whole information we have per shipments bar."* It **supersedes the S102
  four-section model** (Figma 1348:16364); Shipment / Order / Initial Pickup /
  Final Delivery are replaced wholesale.
- **Header** — render as a `SummaryStrip`, exactly like the Stops pane's KPI band.
- **Cost** — the artifact's cost block is ambiguous; the authoritative row list
  is: Base · Fuel (FSC) · Accessorials · AP Total (Carrier) ·
  AR Total (Customer) · Margin · **Direct Cost**. (Discount, present in the Cost
  pane's own strip, is deliberately NOT in the modal.)
- **Source Name** — Jana's wording is poor. It means the **customer**
  (`ShipmentRowVM.customerName`). There is no `SOURCE_ID` lookup to build.
- **Direct Cost** — the wire carries `directCostAmount` per order only; the
  modal shows the **sum across orders**. Added to `CostSummaryVM` in the mapper.
- **Freight Term** — already mapped as `OrderDetailVM.paymentTerms`
  (`freightTermLabel` of the `P/C/A/T/N` wire code), so `Collect` = `C`.
- **User Defined Fields** (Jana, call 2026-07-30) — the table's columns are NOT
  a fixed schema. UDFs are **order-scoped, sparse, and user-defined**: some
  derive from order fields we already hold, others arrive from customers via CSV
  or email. *"They are not hard fields that must exist even empty — some orders
  might be filled, others not."* Any implementation must render only the
  populated keys per order, never a fixed 17-column grid.
- **Customer Reference Values** — the `L14372086` / `L14372084` codes in that
  block are **order numbers**; the block is keyed by the shipment's orders.
  Layout: order in column 1, its reference numbers with their labels beside it,
  wrapping downward through the remaining columns when there are too many.
- **UDF placement** — the field set is too wide to inline, so it moves behind
  its **own tab**. Layout mimics `CostAllocationTab` for both: tabs band on
  top, identifiers `SummaryStrip` directly below, the band's bottom hairline
  touching the strip with **no gap**. The strip is Details-only (the UDF tab
  doesn't need it).
- **Stops — un-halted, summary only.** The full pane stays in the bar's Stops
  tab. The modal shows the most important information per stop, with two
  mandatory items: (1) every stop links to its order in the **Orders domain**
  (`/orders/:orderId`), (2) the address.
- **ModalMedium is NOT modified** — ModalMedium already owns a header, so the
  `SummaryStrip` stays part of the modal's CONTENT. The earlier idea of a
  toggleable edge-to-edge header slot on the component is **dropped**; no
  normalize cycle, no version bump, no DSM churn.

## Still open

1. **Provenance** — the Stops annotation cites *"LINX-"* with no ticket number.
2. **User Defined Fields — data is INVENTED.** No UDF payload existed anywhere,
   so per the user's instruction ("just make them up") `generate.mjs` now seeds
   them. Field *names* come from the spec artifact; every *value* generator is
   ours. **Live mode still shows nothing until Neon is reseeded.**
4. **Tracking Link** — in the artifact it is the blue text immediately right of
   the `Pro/Booking #` value, i.e. a hyperlink hanging off the Pro number rather
   than its own field. No URL exists anywhere in the contract; renders `--`.

## What was built (2026-07-30)

`ShipmentDetailsModal.jsx` rebuilt to: `SummaryStrip` header (Buy Shipment ·
Pro/Booking # · Tracking Link · Rating Status · Sell Shipment) + § General
Information (11 fields) + § Cost (the 7 rows above) + § Customer Reference
Values. Stops and UDF absent (halted / data-blocked).

**Customer Reference Values** renders one sub-block per order — order number
over its populated reference fields, reusing the same six the Orders pane shows
(`salesOrder`, `deliveryNumber`, `poNumber`, `proBooking`, `pickupNumber`,
`confirmationNumber`). Sparse by construction: `'--'` values are dropped, and an
order with no references collapses to a single `'--'`. **Assumption flagged** —
the artifact's second column is blank, so "which reference is *the* customer
reference" is inferred, not sourced.

Supporting mapper work:
- `ShipmentDetailVM.ratingStatus` — the field was generated and on the wire
  since S92 but never mapped. One-line addition, **no reseed needed**.
- `CostSummaryVM.directCost` — summed across `orderList`; `--` when all absent.
- Pickup/Delivery Date/Time resolve from the **accepted** routing option
  (`status === 'Accepted'`), falling back to rank 1 then the first option.

**User Defined Fields** is a second tab (band on top of the `SummaryStrip`,
CostAllocationTab layout). Content is a `GroupTable` — one group per order,
child rows = field/value — mirroring Compare AP/AR. Backing data added to
`generate.mjs` (`userDefinedFieldList` on the detail blob's order), typed as
`SellShipmentOrder.userDefinedFieldList` and mapped to
`ShipmentDetailVM.userDefinedData`. **Every order carries 3–8 fields** (user:
"fill user field details with anything"); WHICH of the 17 catalog keys stays
random, so the shape still reflects the real model where each customer sends a
different subset.

**Stops** renders as a summary block on the Details tab: per stop, a
Pickup/Delivery eyebrow + stop number in column 1, then Order (a `Button
variant="link"` → `/orders/:orderId`, closing the modal first so the user isn't
left with a dialog over a different route), Address, and Date.

**Stops ↔ orders — see DEC-67** in `decisions/decision-log.md` (canonical) and
invariant I3 at the head of `tools/generate.mjs`. TL deliveries now split like
pickups (1–2 stops), each order is assigned to exactly one pickup AND one
delivery, and an order's ship-to follows its own delivery stop instead of the
shipment's destination. **An order appearing at two stops — one pickup, one
delivery — is correct**; the original "all orders on every stop" report was a
misreading of that split. A mode-gated order count was briefly added to force
distribution and reverted the same day (see DEC-67).
`StopVM` gained `orderIds: string[]` alongside the joined `order` string (same
joined/split pattern as `AddressVM`), so the modal renders one link per order.

**Yes, there is a `stops` table** (`packages/db/migrations/001_schema.sql:63`,
with a `data jsonb` holding the full `SellShipmentStop`). But the detail
endpoint does NOT read it — `sellShipmentDetail` serves the frozen
`shipments.detail` blob (merging only `tenders` over it), so the stop fix
travels with the blob on reseed; no migration needed.

**The pinned-order whack-a-mole is fixed at the root.** Every generator change
reshuffles the faker stream and re-rolls every seeded value, which invalidated
`resolve.test.jsx`'s hardcoded order in S100, S101, and twice more on
2026-07-30. The test now DERIVES its order from `orders.json` at load time —
first row matching errorCount 5 / Shipment Failed / Ready whose
`deriveValidationErrors` output spans `general.*` + `consignor.postal` — and
throws a clear message if no row qualifies. No future re-pin.

App tests 585 → 590, `tsc` clean, build green.

**A Neon reseed is OWED** — mock mode has UDFs now, live mode does not until
the DB is reseeded from the new generator. Not run (permission-gated).

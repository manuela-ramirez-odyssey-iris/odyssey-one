---
domain: orders
type: analysis
tags: [orders, audit-trail, LINX-8091, LINX-9128, LINX-7958, visual-design]
date: 2026-09-14
status: active
source: "LINX-8091 + LINX-9128 Jira exports (AC-bearing, 2026-09-14) × Ramesh walkthrough transcript 2026-09-10 × Laura's Figma mock node 6801-24439 × user rulings 2026-09-14. Raw artifacts at vault-sources/10-domains/orders/audit-trail/."
---

# Orders — Audit Trail (LINX-8091 / LINX-9128)

> The per-order change history: what happened to an order after it existed, who did it, when. Read-only, internal-only, reverse-chronological, append-only. This page is the canon the visual design + build follow; the design itself is `docs/superpowers/specs/2026-09-14-order-audit-trail-design.md`. Both stories are **Blocked / `VD_Pending`** — this design is what unblocks them.

## 1. Purpose

Ramesh (2026-09-10): *a bank statement for the order.* A customer calls — "why is my shipment late", "why did $500 become $700" — and the planner opens the trail and answers from it: weight 100 → 150 lb, on 09/10 at 14:30, by whom. It is forensic, not operational: **there are no actions on it** (Manuela asked; Ramesh: "nothing, nothing, nothing").

## 2. Boundaries

- **Exists-before-it-is-audited.** The trail begins when the order exists in OdysseyONE. OIF resolution is **not** audited (an unresolved message is not an order); the resolved order's creation is row one. A draft's submission lands as a lifecycle change.
- **Ends at handoff.** Everything until the order moves to the Shipments domain. Shipments keeps its own history (Jana's), and the Consolidation Audit Trail (LINX-15788) / Optimizer Audit Trail (LINX-13472) are sibling patterns in that domain — same conventions, different feature.
- **Manual and integrated alike.** Once inside, there is no distinction (Ramesh); creation rows differ only in Source (`User · email` vs `System · ERP`).
- **Internal users only** — planners, O2 admins, auditors, operations. Never customers or carriers (AC business rule 2).
- **Non-modifiable, appendable, system-generated** (both ACs, verbatim).
- **Only saved changes.** Edits that were never confirmed/saved via the UI do not appear (AC Notes §2).

## 3. Record shape

Every row: **Date & Timestamp** (MM/DD/YYYY HH:MM 24-h; we append the zone) · **Change Made By** (`User` | `System`) · **Source** (User → e-mail + full name; System → `ERP` / `UI` / `Legacy TMS` / `LINX`) · **Change Type** (`Order Action` | `Order Event`) · **Change Category** · **Line Item ID** · **Field Name** · **Old Value** · **New Value**. Plus **Order ID**, which the AC lists as a column and we lift into the page header — a per-order log repeats it on every row.

Blank cells render `--` under a still-visible column header (AC legend; Ramesh on the call; the app's convention).

### Category vocabulary (LINX-9128 — the superset; 8091 is the header-level subset)

| Change Type | Change Category | Level | Line Item ID | Field / Old / New |
|---|---|---|---|---|
| Order Action | Order Creation | header | — | — |
| Order Action | Order Header Editing | header | — | ✓ |
| Order Action | Order Line Item Editing | line | ✓ | ✓ |
| Order Event | Order Lifecycle Status Change | header | — | ✓ (`Status`: prior → current) |
| Order Event | Order Applied on Hold | header | — | — |
| Order Event | Order Released from Hold (Header Level Editing) | header | — | ✓ (fields edited while on hold) |
| Order Event | Order Released from Hold (Line Item Editing) | line | ✓ | ✓ |
| Order Event | Order Partial Cancellation | line | ✓ | — |
| Order Event | Order Full Cancellation | header | — | — |

*Change Type* is the category's family; *Change Made By* is who actually did it, per row. Ramesh's spoken taxonomy ("Actions are manual, Events are system-driven") is not a rule the AC states, and holds/cancellations are user acts filed as Events — so `Order Event · Applied on Hold · User` is a legal row, and Laura drew it that way.

The AC's **Source** wording contradicts itself (bullet: "User ID & Name"; table: "E-mail ID & full name"). **Email wins** — LINX-9784 stores the email; the consolidation trail shows one.

## 4. Row granularity — contested (Q-AT-1)

- **AC (both stories, Notes §1):** one row per save session (9128: per modified line item), the row holding **the list** of changed fields with old/new values. The matrix's *Released from Hold* row says "field name(s)".
- **Ramesh, spoken 2026-09-10, correcting Laura twice:** one row **per field** — location + date in one save = two rows.

Stories outrank transcripts, so the build follows the AC and the value cells are **vertical stacks** (one line per changed field, Old/New aligned line-for-line); a single-field change is a one-line stack, visually the same as Ramesh's row. Either answer is a data change, not a layout change — but it is the data model, so it is **filed for Ramesh**, not silently decided.

## 5. Placement and interaction (user rulings 2026-09-14)

- **Its own page** — `/orders/:orderId/audit-trail` — under the **standard navbar** (search bar present, currently unwired), breadcrumb **`Orders › <n> Audit Trail`** (two crumbs; `Orders` is the way back), then `PageHeader` "Audit Trail" with the order number / source / creation stamp as supporting text. *(First cut used the Edit-Stops title-mode shell — centred title + `✕` — and a `View order <n>` middle crumb; both revised on the browser check, user 2026-09-14.)*
- **Opened from the Orders grid ⋮ menu** (Created tab, every row incl. Cancelled). **Not** a secondary button on View Order, **not** a tab.
- **Deviation from the AC, to inform Ramesh (Q-AT-4):** the AC places it *on the View Order page as a button/tab titled "Audit Trail & Activity History"*. Steve O'Hara's approval comment ("select an order and view the audit trail") reads as row-level access; the title is shortened to *Audit Trail* because nothing on the page is an "activity history" distinct from the trail.
- **Sortable:** Date & Timestamp only (the AC also names Order ID, now in the header). Default newest-first. The other columns are not sortable (Laura's ↕ on all ten is beyond the AC).
- **Pagination** (AC §II, reworked 2026-07-07 by Balaji *around our components*): bottom-left `Showing X to Y of Z results`; bottom-right `‹ 1 2 3 … n ›`, `«`/`»` struck; **Rows per page** left of the controls, **10–40 step 5, default 25**. Our `Paginator` already is exactly this.
- **Value badges:** Old Value **gray**, New Value **purple, no icon** — a change is not a fault (the S144 StopBadge rule). Laura's warning-triangle on New Value is the one thing in the mock the user rejected outright.

## 6. What the mock got right, and what the build corrects

Laura's frame (`6801-24439`) is the 9128 screen wearing 8091's title. Kept: the column set and order, the nine-ish categories, the Action/Event badge tones, the pagination layout, `CDT` on the timestamp. Corrected in the build: `DataTable` not `GroupTable` (every group affordance was hidden); Order ID → header; **Line Item ID `--` on the six header-level categories** (mock fills `11415` on all rows); Source as email + name; rows-per-page 25 from {10…40} (mock: 50, and a page-2 summary computed for 10); sort on the timestamp only; both *Released from Hold* variants; the title-mode navbar dropped after the browser check (standard navbar; the search bar is visible but search over the trail is **parked**); `--` for blanks; gray/purple value badges without icons.

## 7. Data + API

`POST /order-service/v3/audit-report` (LINX-8457, Closed) — paged change log (field, oldValue, newValue, changeMadeBy). Field-level diffs come from LINX-9730's JSON comparison (`added` / `removed` / `modified` with dotted paths like `order.orderStatus.orderStatusCode` — the UI shows the human label, not the path). Actor email via the User-Management integration (LINX-8458 / 9784). The response field table is an **image** in LINX-8457 that the export did not carry (Q-AT-2).

Prototype: **derived at read time from the order** (`auditTrail.js`, PRNG keyed on the order number — no generator/fixture change, no faker-stream shift) (creation actor/source/time from the order; status rows walk its real lifecycle path; edits change fields it has, ending at its current values; hold rows only where the lifecycle has a hold; cancellation rows only on Cancelled orders). No Neon column, no reseed, no deploy in this slice.

## 8. Out of scope

Search/filter of the trail — **parked** by the user on 2026-09-14 after a lean scope was discussed (progression from the table's columns, free text, filtering in the seam, toggle-chip panel); LINX-8148 was **Canceled** in Jira so this would be our addition; seconds, time-range search, saved search, "system ID" (Niranjana's 2026-02-14 questions, never answered, not in the approved AC); a category for *line item added* (9128 scope note lists it, the table has no name — Q-AT-3); the Shipments-side trails; any `@odyssey/ui` addition (nothing new is normalized).

## Related

[[10-domains/orders/domain-analysis#8. Audit trail|Domain analysis §8]] · [[10-domains/orders/decisions/decision-log#ORD-27|ORD-27]] · [[10-domains/orders/open-questions#Audit trail|Open questions Q-AT-1…4]] · [[10-domains/orders/section-map|Section map row 12]] · [[order-service-api]] · [[10-domains/orders/requirements-tracker|Requirements tracker — LINX-7958 sub-epic]]

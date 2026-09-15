# Order Audit Trail — Design

**Date:** 2026-09-14 (S147)
**Stories:** LINX-8091 *Audit Trail for Manual & Integrated Orders (Single Line Item) — View Actions & Events* · LINX-9128 *… (Multiple Line Items)* — both **Blocked / `VD_Pending`** (Ramesh, 2026-07-10: "since VD is still pending"), labels Approved · FUNCTIONAL_PHASE2 · Phase2_October2026_Release · Refinement_done. Parent epic LINX-7958 (Approved). **This design is the VD they are blocked on.**
**Sources:** the two Jira exports (AC-bearing, archived `vault-sources/10-domains/orders/audit-trail/`) · Ramesh walkthrough with Laura + Manuela, transcript `Orders OIF Audit.vtt` (2026-09-10, archived alongside) · Laura's mock, Figma `Orders - OdysseyONE` node `6801-24439` (frame *"Audit Trail for Manual & Integrated Orders (Single Line Item)"*) · `Manual Consol Mockups_08Sept26.pptx` (Shipments **consolidation** audit trail, LINX-15788 / 13472 — a *sibling* pattern, not this feature; used as precedent only) · `POST /order-service/v3/audit-report` (LINX-8457; [[order-service-api]]).
**User rulings (2026-09-14):** (1) no warning icon on New Value; Old Value on a **gray** badge; (2) it is **per order**, so it gets a **page header in the Edit Shipment Stops pattern** and is opened from the **Orders ⋮ action column** — *no* secondary button; (3) Laura's categories stand (they are 9128's — my earlier objection was wrong); (4) pagination/sorting re-checked against the AC; (5) the mock is a mock — the real one carries the fixes below.

## What it is

A read-only, per-order history page. One row per **recorded change** to an order that already exists in OdysseyONE — creation, header/line edits, lifecycle status changes, hold on/off, partial/full cancellation — reverse-chronological, append-only, never editable. Internal users only (planners, O2 admins, auditors, operations; never customers or carriers). Ramesh's framing: *a bank statement for the order* — the planner opens it when a customer asks "why is my shipment late / why did my price change" and reads "weight 100 → 150 lb, 09/10 14:30, by jane@odysseylogistics.com".

Nothing enters the trail before the order exists: **OIF resolution is not audited** (an unresolved message is not an order); the moment it resolves, that creation is the trail's first row. Draft → submitted lands as a lifecycle change. The trail stops growing when the order leaves for the Shipments domain (Shipments has its own history — Jana's, not this).

**Zero actions.** Manuela asked on the call; Ramesh: *"nothing, nothing, nothing."* Sorting + paging are the only interactions.

## Entry point and page shape

**Route:** `/orders/:orderId/audit-trail`. Its own page under `AppShell`, sibling of `/orders/:orderId`.

**Entry:** a new **`Audit Trail`** option in the Orders grid's ⋮ `ActionMenu`, on the **Created** tab, for every row (Cancelled rows included — a cancelled order still has a trail; it just stopped growing). Not on Draft (a draft has no trail yet) nor Validation Errors (not an order yet). `allTabActionLabels` becomes `['View', 'Audit Trail', …]` / `['View', 'Audit Trail', 'Copy', 'Restore']` etc. — `primaryRowAction` is untouched (View/Edit/Resolve precedence stands; Audit Trail is never the row's primary action). Also reachable from the View Order page? **No** — user ruling, no secondary button. The breadcrumb is the way back.

> **Deviation from the AC, to tell Ramesh:** both stories say *"visible in the particular order's 'View Order' page (LINX-10233), as a separate button / tab titled 'Audit Trail & Activity History'"*. We open it from the row's ⋮ menu instead (Steve O'Hara's Feb-17 approval comment — *"we should be able to select an order and view the audit trail"* — reads the same way), and we title it **`Audit Trail`**, not *Audit Trail & Activity History* (nothing on the page is an "activity history" distinct from the trail; the longer title is two names for one thing). Logged as ORD-27 deviation (a).

**Header** — breadcrumb `nav` then `PageHeader`. *(Revised after the browser check, user 2026-09-14: the title-mode navbar was dropped and the crumbs shortened — see the two bullets marked REVISED.)*

```
Orders  ›  000000011415 Audit Trail
Audit Trail
Order 000000011415 · Manual · Created 05/23/2026 14:30 CDT by jane@odysseylogistics.com
```

- **REVISED** `Breadcrumb` ×2: `Orders` → `/orders`; `<n> Audit Trail` current. The first cut had a `View order <n>` middle crumb; the user called it misleading ("it just needs to be Orders › ord# Audit Trail"). The `Orders` crumb is the way back.
- `PageHeader title="Audit Trail"` with `supportingText` = order number · order source · the creation row's timestamp + actor. This is where **Order ID goes** — it is constant on every row of a per-order trail, so it is not a column (see *Columns*).
- **REVISED — standard navbar**, not title mode: the user wants the navbar search bar available on this page ("lets use the search functionality in the navbar … that means no edit mode for nav"). The first cut shipped the Edit-Stops title-mode shell (centred title + `✕`), as Laura's mock drew it; it is gone. **Search/filter of the trail is PARKED** (user: "halt the search functionality, only leave the ui") — the bar renders unwired. When it resumes, the lean scope discussed: a small progression from the table's columns (Change Type / Category / Made By enums, Source, Field Name, Date), free text over the text cells, filtering in `getAuditTrail` (mock + live) before paging, FilterButton → a toggle-chip panel that writes bar chips. Note LINX-8148 (search/filter) was Canceled in Jira — this is our addition.

**Body** — `DataTable` (not `GroupTable`: nothing is grouped, selected, totalled or actioned — Laura's frame is a GroupTable with all four hidden) with `footer={<Paginator table={table} />}`. `sortable` on, but only two columns opt in (below). No `truncationTooltip` — the three value cells are multi-line stacks and DataTable's truncation detector would tooltip them concatenated (Task 4 review); Source (email + name) clips like any other cell.

## Columns

Order of columns as the AC lists them, minus Order ID (moved to the header — a per-order log repeats it on every row, and the AC's "sortable by Order ID, descending" is a vestige of the trail's earlier life as a global section, cf. Niranjana's Feb-14 comment "search by customer is applicable only if this is a separate section").

| # | Column | AC | Render | Blank rule (`--`) |
|---|---|---|---|---|
| 1 | **Date & Timestamp** | Compulsory. `MM/DD/YYYY HH:MM` 24-h, date+time sort **as one value**, **default descending**, arrow right of the label flips asc/desc. | `05/23/2026 14:30 CDT` — AC has no zone; we append the zone abbreviation (precedent: the consolidation trail's `Last Refresh … CST`; S144's `TimezoneSelect short`). **Sortable.** | never |
| 2 | **Change Made By** | Compulsory. `User` \| `System`. | plain text | never |
| 3 | **Source** | Conditional. User → **e-mail ID & full name**; System → system name (`ERP`, `UI`, `Legacy TMS`, `LINX`). | `jane@odysseylogistics.com · Jane Doe` / `ERP`. The AC contradicts itself (bullet says "User ID & Name", table says "E-mail ID & full name"); **email wins** — LINX-9784 stores email, the consolidation trail shows `johndoe@odysseylogistics.com`. Laura's `ID 98980 / User Name` is the losing variant. | never |
| 4 | **Change Type** | Compulsory. `Order Action` \| `Order Event`. | `Badge` — `blue` for Action, `gray` for Event (Laura's tones, kept). | never |
| 5 | **Change Category** | Conditional on Change Type (vocabulary below). | plain text | never |
| 6 | **Line Item ID** | 9128: compulsory *column*, value only at line level. 8091: not listed. | plain text, the order line's number/id. Column **always present** (a single-line order is 9128's degenerate case; one grid serves both stories). | blank for **Order Creation, Order Header Editing, Lifecycle Status Change, Applied on Hold, Released from Hold (Header), Full Cancellation** — i.e. every *Order Header*-level row in the 9128 matrix. Laura's mock fills `11415` on all nine rows; six of them must be `--`. |
| 7 | **Field Name** | Conditional. | plain text, the human field label (`Weight`, `Status`, `Pickup Location`), not the JSON path (`order.orderStatus.orderStatusCode` is what LINX-9730 emits — map it). | blank for Order Creation, Applied on Hold, Partial Cancellation, Full Cancellation |
| 8 | **Old Value** | Conditional. | **`Badge variant="gray"`** (user ruling). Lifecycle change: the earlier status. | same as Field Name |
| 9 | **New Value** | Conditional. | **`Badge variant="purple"`, no icon** (user ruling: no warning glyph — *a change is not a fault*, the S144 StopBadge `changed` rule). Lifecycle change: the current status. | same as Field Name |

Every column header renders even when its cells are blank (AC legend: *"column name should be displayed, but column value to be blank"*). Blank = `--`, the app's empty-cell convention (ORD-13, the consolidation trail, Ramesh on the call: *"double dash or whatever … consistent with whatever we have"*).

**Sorting:** only Date & Timestamp (and Order ID, now a header — moot). The other seven columns are **not** sortable (Laura's mock puts the ↕ on all ten; the AC names two). Default `[{ id: 'timestamp', desc: true }]`.

### Change Category vocabulary (LINX-9128 — the superset; 8091 is the header-only subset)

| Change Type | Change Category | Entity level | Line Item ID | Field / Old / New |
|---|---|---|---|---|
| Order Action | **Order Creation** | header | — | — |
| Order Action | **Order Header Editing** | header | — | ✓ |
| Order Action | **Order Line Item Editing** | line | ✓ | ✓ |
| Order Event | **Order Lifecycle Status Change** | header | — | ✓ (`Status`: prior → current) |
| Order Event | **Order Applied on Hold** | header | — | — |
| Order Event | **Order Released from Hold (Header Level Editing)** | header | — | ✓ (fields edited while on hold) |
| Order Event | **Order Released from Hold (Line Item Editing)** | line | ✓ | ✓ |
| Order Event | **Order Partial Cancellation** | line | ✓ | — |
| Order Event | **Order Full Cancellation** | header | — | — |

Nine values. Laura's mock shows eight (the two *Released from Hold* variants collapsed into one) — the build carries all nine; the label text is the AC's, including the parenthetical, because that parenthetical is what tells a planner *which* release row they are reading.

The *User vs System* tension in Ramesh's taxonomy (he bucketed Events as "system-driven" yet holds and cancellations are things users do) is resolved the way Laura drew it and the AC allows: **Change Type is the category's family; Change Made By is who actually did it**, per row. An `Order Event · Applied on Hold · User` row is legal.

## Row granularity — ⚠️ the open contract question (Q-AT-1)

The AC (both stories, Notes §1): *"in a single login session, the user can make changes to one or multiple order field(s). The system should capture all changes, **in one row** … This row should contain the **list** of all the fields that changed, along with the old & new values"* — 9128 adds *"for each modified line item"*, and the *Released from Hold* matrix row reads "field name(s)", plural.

Ramesh on the call, correcting Laura twice: *"each field that changed should be a row"* — pickup location + date in one save = **two rows**.

Stories outrank transcripts (project rule), so the **build follows the AC**: one row per save per entity (header, or each modified line), and Field Name / Old Value / New Value are **lists**. But this is the data model, not styling, and Ramesh's verbal is the more recent — **it is filed as Q-AT-1 for him to settle before the seed is treated as canon.** The UI is designed so either answer is a data change, not a layout change:

- Field Name / Old / New cells render a **vertical stack**, one line per changed field, in the same order in all three cells; Old and New badges align line-for-line. Row height grows with the list. A single-field change is a one-line stack — visually identical to Ramesh's per-field row.
- If Ramesh confirms per-field rows, the seed emits one field per row and nothing in the table changes.

Sorting is unaffected either way (timestamp is per row).

## Pagination (AC §II, verbatim into our `Paginator`)

Balaji reworked §II on 2026-07-07 *"basis the standard UI components for pagination & rows per page, provided by Manuella"* — i.e. around **our** `Paginator`, which already matches:

- bottom-**left** `Showing 26 to 50 of 1000 results`; bottom-**right** `‹ 1 2 3 … 40 ›`, current page highlighted, `‹`/`›` disabled at the ends, `«`/`»` **struck out of the AC** (not rendered — `Paginator` has none).
- **Rows per page** select **left of** the page controls, options **10 → 40 step 5** (`Paginator`'s `DEFAULT_PAGE_SIZE_OPTIONS` is exactly `[10,15,20,25,30,35,40]`), **default 25**. Laura's mock shows **50** (not an allowed value) and `Showing 11 to 20 of 97` on page 2 (arithmetic for a page size of 10) — both wrong; nothing to design, the component is already right.
- Last page shows the remainder (`976 to 980 of 980`).

Server-side paging through `POST /order-service/v3/audit-report` (paged; field, oldValue, newValue, changeMadeBy) — the same `manualPagination` + `manualSorting` shape `OrdersTable` uses. Mock mode pages the generated trail in memory.

## Data

**Derived at read time, not seeded** (plan amendment, 2026-09-14): `src/components/orders/audit-trail/auditTrail.js` builds an order's trail from its `orders.json` row + `order-details.json` lines with a PRNG keyed on the order number — a new faker draw in `generate.mjs` re-numbers every seeded id, and everything a trail needs is already on the order. Same coherence rule, stated for the derive: the creation row's actor/source/timestamp come from the order's `createdBy`/`orderSource`/`createdAt`; status-change rows walk the order's actual lifecycle path to its current status; edit rows change fields the order really has, with the New Value equal to the order's current value; hold rows appear only on orders whose lifecycle includes Hold; cancellation rows only on Cancelled orders. Integrated orders: creation `System · ERP`; manual: `User · <email> · <name>`. Order-level rows fill Line Item ID with `--`; line-level rows reference a real line of the order.

**Neon / live:** not in this slice. `POST /v3/audit-report` exists (LINX-8457, Closed) — the adapter is a swap behind `orderService.getAuditTrail(orderNumber, { page, pageSize, sort })`. The response field list is in the LLD table image LINX-8457 embeds (**not** in the archive — Q-AT-2). No reseed, no deploy without a separate go.

**Row VM** (`api/types/auditTrailRow.ts`): `{ id, timestamp (ISO + zone), changedBy: 'User'|'System', source: { email, name } | { system }, changeType, changeCategory, lineItemId | null, changes: [{ field, oldValue, newValue }] }` — `changes` is the list; `[]` for the blank categories.

## Components

Nothing new in `@odyssey/ui`. `DataTable` + `Paginator` + `Badge` + `Breadcrumb` + `PageHeader` + `ActionMenu` — all normalized. The multi-line value-stack is a cell renderer in the app (`auditTrailColumns.jsx`), not a component; if a second table needs it, that is the moment it becomes one.

App-local, `src/components/orders/audit-trail/`: `AuditTrailTable.jsx` (TanStack instance + `DataTable` + `Paginator`), `auditTrailColumns.jsx`, tests. Route `src/routes/orders/OrderAuditTrailRoute.jsx` (header + fetch + states: loading → `DataTable loading`; error → retry; empty → `EmptyState` "No changes recorded yet" — reachable only if the API returns nothing for an order that exists, which the AC says cannot happen since creation is always row one, but the state costs nothing).

## Out of scope

- Search / filter over the trail (LINX-8148 — **Canceled**).
- Seconds in the timestamp, time-range search, saved search, "system ID" (Niranjana's Feb-14 questions — never answered; the AC that got approved has none of them).
- Line-item *add* events: 9128's scope note lists "Adding one/more line item(s)" as a tracked change but the category table has no category for it. Filed as Q-AT-3; the seed does not emit it until it has a name.
- Shipments' own history, the Consolidation Audit Trail (LINX-15788), the Optimizer recommendation Audit Trail (LINX-13472) — sibling patterns in other domains. When those are built they should share this table's cell conventions (`--`, email actor, gray/purple value badges); noted in the cross-cutting canon, not built here.
- Angular twin — nothing new was normalized, so nothing is owed.

## Open questions

See [[open-questions#Audit trail]] — Q-AT-1 (row granularity: AC "one row, list of fields" vs Ramesh "one row per field"), Q-AT-2 (`/v3/audit-report` response shape — the LLD image did not survive the Jira export), Q-AT-3 (category name for "line item added"), Q-AT-4 (title + placement deviation: `Audit Trail` from the ⋮ menu vs the AC's *Audit Trail & Activity History* button/tab on View Order — inform Ramesh, and confirm whether View Order also needs the link so the AC's "on the View Order page" is literally true).

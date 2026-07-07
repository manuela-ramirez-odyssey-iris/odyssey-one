---
title: Orders — Decision Log
domain: orders
type: decision-log
tags: [orders, decisions, conformance, linx-5943]
date: 2026-06-15
status: active
---

# Orders — Decision Log

Implemented decisions and PO-conformance observations for the Orders domain. Cross-cutting decisions live in `40-decisions/` or the relevant `20-cross-cutting/` log; per-domain decisions live here.

## Format

```
### ORD-XX — <title>
**Decided:** YYYY-MM-DD
**Previous state:** what existed before
**Decision / Finding:** what was decided or observed
**Rationale:** why
**Source:** session / stakeholder / artifact reference
**Affects:** components, files, LINX stories, or backlog items impacted
```

Decision IDs use the `ORD-` prefix (Orders).

## Decisions

### ORD-01 — PO conformance gap report (Ramesh, 2026-06-15)
**Decided:** 2026-06-15
**Previous state:** The Orders prototype was built **lean and Create-flow-first**. The Order Summary / Overview page (screen 0) was treated as the lowest-priority Orders screen — built minimally because its design may still change (project memory: Orders Summary screen-0 low priority). Two routes exist: `/orders` (OrdersRoute = Summary page) and `/orders/create` (Create flow). The manual Create Order flow was built end-to-end across sessions 54–55 (General Info, Pickup/Delivery, Ship/Delivery dates, Special Services, Confirmation quick+long, in-order actions, draft reopen), with Product Information left as 🚧 WIP and Planning Date validation completed. No work had yet been done on the Overview epic actions, audit trail, or integrated-order fallout UI.
**Decision / Finding:** Ramesh (PO) reviewed the deployed prototype URL on 2026-06-15 and reported that **only the Order summary/overview page + the manual order creation UI are visible**. Triangulating his feedback with the master FR tracker and a code-level build audit, the conformance gap is:

- **Overview / Summary epic (LINX-7557) is non-conformant or unbuilt:**
  - LINX-9896 Summary Page — grid exists but **columns are wrong/minimal**: it shows "ID" instead of **Order Number**, and is missing Order Source, Ship Direction, Freight Terms, Consignor/Consignee, Latest Pickup Date, Latest Delivery Date, Order Status, and the full Order Actions set (story specifies 4 actions). **Tabs are missing.** **Horizontal scroll only works when scrolled to the vertical bottom** (layout defect).
  - LINX-10285 View / Apply Filters — Filter button is a **no-op stub**.
  - Order Action button — non-functional. **Export to CSV** (LINX-11165) — **missing**. **Manage Columns** (LINX-10300) — **missing**.
  - **Custom Views** — Display (LINX-10788), Create (LINX-10814), Edit (LINX-10825), Delete (LINX-10838) — all **absent**.
- **Post-creation row actions are stubs (menu renders, no handlers):** View Order (LINX-10233), Edit Order (LINX-10248), Cancel Manual Order (LINX-10258), Copy Order (LINX-10259).
- **Audit Trail epic (LINX-7958) unbuilt:** single-line (LINX-8091) and multi-line (LINX-9128) — both **absent**.
- **Integrated-order fallout unbuilt:** OIF UI to fix validation errors for integrated orders (LINX-11137) — **absent**.
- **Create flow is built** except **Product Information** (Quick LINX-8121 + all Long sub-sections LINX-8131–8135, and product-grid column controls LINX-8122/8123), which is **Partial / WIP**.

Ramesh also asked (a) whether a **separate grooming session** will be organized, and (b) whether **all stories in the XLS are covered** — both **open** (see TBDs).
**Rationale:** The lean Create-first build sequence was deliberate (Create flow is the highest-value, best-groomed slice; Summary screen-0 was explicitly de-prioritized as design-unstable). Ramesh's review is the first PO conformance checkpoint and re-surfaces the Overview/actions/audit/OIF surfaces that were always planned but not yet started. Capturing the gap here makes the "owed UI scope" explicit and traceable before the next grooming/build round. Full per-story verdicts in [[../requirements-tracker|requirements-tracker]].
**Source:** Ramesh (PO) prototype-review feedback email, 2026-06-15; Ramesh's "Functional Req. Status Tracker 1.xlsx" (master FR tracker, LINX-5943); prototype build-state code audit (this session). UI coverage counts: Built 12 · Partial 7 · Stub 5 · Absent 9 (UI stories only).
**Affects:**
- **Epics/sub-epics:** LINX-7557 (Order Overview & Actions — largest gap), LINX-7556 (Edit/Cancel), LINX-7554 (Copy), LINX-7958 (Audit Trail), LINX-7552 (OIF UI), and LINX-7553/8026 Product Information slice.
- **Stories — Absent:** LINX-11137, LINX-8091, LINX-9128, LINX-10300, LINX-10788, LINX-10814, LINX-10825, LINX-10838, LINX-11165 (CSV export).
- **Stories — Stub:** LINX-10233, LINX-10248, LINX-10258, LINX-10259, LINX-10285.
- **Stories — Partial/WIP:** LINX-8121, LINX-8122, LINX-8123, LINX-8131, LINX-8132, LINX-8133, LINX-8134, LINX-8135, LINX-9896 (grid contents).
- **Code:** OrdersRoute (`/orders` Summary page) — columns, tabs, Filter, Export, Manage Columns, Custom Views, row-action handlers; Create flow Product Information section.
- **Canon:** [[../requirements-tracker|requirements-tracker]], [[../domain-analysis|domain-analysis]] §5–§8.

### ORD-02 — Every Orders row click opens the Order Summary (Draft detour removed)
**Decided:** 2026-07-07
**Previous state:** `OrdersRoute` row click branched on status: `Draft` rows navigated to `/orders/create?draft=<orderNumber>` (spec §4 / plan decision 17 — reopen a session draft in the create form); all other rows opened `/orders/<orderNumber>` (Order Summary). After the S80 data unification, the shared generator seeds `'Draft'` into the unshipped-order status pool (`tools/generate.mjs` `UNSHIPPED_STATUS_POOL`, weight 20/100 ≈ 110 rows), so those generated rows also hit the create-form branch — but `getDraft()` only knows session drafts, so the form opened blank. Users experienced "random" navigation: same click, sometimes summary, sometimes an empty create flow.
**Decision / Finding:** Row click **always** opens the Order Summary page — every row, Draft included (Manuela, 2026-07-07: "Every row should open order summary when clicked"). The `?draft=` reopen path in `CreateOrderForm` is retained as a documented dev trigger; nothing navigates to it from the grid anymore. Supersedes plan decision 17's row-click detour (draft reopen as a grid behavior); a future explicit "Edit" row action can restore form-editing for drafts.
**Rationale:** Uniform, predictable navigation; the summary page renders any order (session drafts at full fidelity via `getOrderView`). Companion fix: `getOrderList`'s mock merge now has overlay rows **shadow** base rows sharing an `orderNumber` (previously `[...overlay, ...base]` with no dedupe — a draft saved over a generated row would duplicate it and collide TanStack row ids).
**Source:** User bug report + repro (S80 wrap → S81 priority 0); root-cause trace this session (generator status pool → `OrdersRoute.jsx` status branch → `getDraft` miss).
**Affects:** `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx` (onRowClick), `apps/odyssey-one/src/api/services/orderService.ts` (`getOrderList` overlay shadowing), `orderService.test.ts` (+1 shadow test). Stories: LINX-10233 (View Order — the row-click target), LINX-10248 (Edit Order — where draft-reopen semantics move next).

## TBDs / open items

- **Grooming session** — Ramesh asks whether a separate grooming session will be organized for the gap items. Pending.
- **Full XLS coverage** — Ramesh asks whether all stories in the tracker XLS are covered. The matrix in [[../requirements-tracker|requirements-tracker]] is the answer-in-progress; confirm none are missed (e.g. LINX-11165 CSV export is in canon §5 but not a separate tracker row — verify against the live XLS).
- **Summary horizontal-scroll defect** — layout bug (scroll only at vertical bottom); fix when the grid is reworked.
- **"ID" → "Order Number"** — LINX-11013 rule (show Order Number when present) not applied in the prototype grid.

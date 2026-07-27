---
domain: orders
type: research
tags: [orders, research, jira, orders-table, columns]
date: 2026-07-26
status: active
source: "LINX Jira via Atlassian MCP (Odyssey account), session S94"
---

# Orders Main Table — Jira Research (2026-07-26)

Purpose: full Jira extraction for the Orders Overview/Summary grid (3 tabs) ahead of the Figma contrast + implementation plan. Source: LINX Jira via Atlassian MCP. KEY METHOD LESSON: the per-tab column specs live in Jira custom field customfield_10032 ("Acceptance Criteria"), NOT in the description field — description on all tab stories is identical boilerplate.

## Structure
- Epic LINX-7557 "Order Overview and Actions" owns the grid. LINX-9896 (umbrella story, Blocked) split into 3 tab stories: LINX-11658 "All", LINX-11663 "Draft", LINX-11659 "Validation Errors" (all Blocked).
- QA test cases LINX-13571–13590 (all Todo) encode All-tab behavior.
- Jira QA naming: tabs are "All", "Draft", "Data Validation Errors" (LINX-13572). Our code says "Validation Errors" — label drift to reconcile.
- All tab is default-selected (LINX-13571). Tab counts update dynamically (LINX-13574).
- Efrain linked the Figma on all 3 tab tickets on 2026-07-22: https://www.figma.com/design/29IXNDEmyPekpvSrGrEcm7/Orders---OdysseyONE?node-id=5777-21538 — THE frame for the contrast session.
- Attachments on all 3: "Linx_EU_Feedback_VD_V7_21st_May_2025 1.pdf", "LINX - Phase II_Screens_14th_July_2025 4 (1).pdf" (reference only).

## Draft tab columns (LINX-11663, customfield_10032, verbatim)
1. Order Number
2. Customer
3. Created (Date & Timestamp of first draft)
4. Created By (Full Name of the person creating the draft)
5. Last Edit (Date & Timestamp of the most recent draft)
6. Order Actions (⋮): Edit (LINX-10248) · Submit (→ "Ready for Planning", moves to All tab; confirm popup "Are you sure you want to submit?"; Yes = submitted + confirmation page LINX-9002/LINX-9004; No = stays Draft) · Cancel (soft delete; confirm popup "Are you sure you want to cancel the order?"; No = stays Draft, values retained; Yes = cancellation flow LINX-10258)

Rules: only Order Number + Owning Organization guaranteed present on drafts (LINX-9010); blank fields can't be filtered. Drafts = pre-creation saves (LINX-9010) AND post-creation edits in progress (LINX-11185). A struck-through copy of the old wide column list also sits in this field — superseded, do not implement.

## Validation Errors tab columns (LINX-11659, customfield_10032, verbatim)
1. Order Number (user provided or Linx generated)
2. Customer
3. Draft Order Status (Ready/Complete/Purge)
4. Error Count (number of validation errors for the order)
5. Order Actions (⋮): Resolve → OIF Validation UI (LINX-11137)

Rules: integrated orders only (error types per LINX-11137: missing mandatory field e.g. Owning Organization; invalid data type e.g. character in phone number; invalid data not matching TMS master). Post-resolution: Ready → "Ready for Planning" (LINX-6001) → removed from this tab, appears in All. Count badge = colored circle. Same superseded struck-through wide list present.

## All tab columns (LINX-11658, customfield_10032, verbatim — inline strikethroughs are edit history)
1. Order Number (user provided or Linx generated)
2. Order Source (Manual | Integrated)
3. Hazardous (Hazmat flag if ≥1 item hazardous, BRs in LINX-12102)
4. Customer (renamed from struck-through "Owning Organization")
5. Ship Direction
6. Freight Terms
7. Equipment
8. Shipper (renamed from struck-through "Consignor") — sub-columns: Location ID; Origin City, State, Country; Latest Pickup Date & Time (Earliest Pickup struck through = removed)
9. Consignee — sub-columns: Location ID; Destination City, State, Country; Latest Delivery Date & Time (Earliest Delivery struck through = removed)
10. Gross Weight (Value & UoM)
11. Volume (Value & UoM)
(Commodity struck through = removed)
12. Order Status (per Order Lifecycle LINX-6001 & LINX-6081)
13. Order Actions (⋮): View (LINX-10233) / Edit (LINX-10248) / Copy (LINX-10259) / Cancel (LINX-10258)

Plus: Filter Bank above the table (basic + advanced filters, LINX-10285 & LINX-11895).

CAVEAT: strikethrough usage inconsistent across the 3 tickets (wholesale deprecated block in 11663/11659 vs inline edits in 11658); grooming active as of 2026-07-23 — confirm removed items (Commodity, Earliest dates) with Ramesh/Efrain.

## Cross-cutting grid behavior (QA tickets)
- Value formats (LINX-13590): '--' for empty optional fields; BLANK (not '--') for missing pickup/delivery times; no timezone displayed.
- Manage Columns (LINX-13588): hide/show + reorder.
- Export (LINX-13586/13587): Excel download; hard 25,000-row cap with error message. Backend exists: POST /order-service/v3/action/orders/export (.xlsx via OrderListExportComponent) but DEFECT LINX-12747 (High): exports ≥ ~20k rows time out at API gateway (~30s) → HTTP 503; the >25k HTTP-400 rejection works ("Exporting is limited to 25000 rows. Please apply additional filters..."). Blocks LINX-9896.
- Filter (LINX-13585): Filter button opens "filter bank".
- Pagination (LINX-13589).

## Row actions detail
- View (LINX-10233 + test cases LINX-13804–13808): read-only, no status change; "View Order" screen reusing confirmation-page template; Order Details tab + Audit Trail & Activity History tab; manual + integrated.
- Edit (LINX-10248 + LINX-13853–13866): "Edit Order" pre-populated; locked fields = Order Number, Owning Organization, creation timestamp; submit → "Confirm & Save Changes"/"Discard" dialog; Discard reverts to previous version; audit-trailed. BLOCKED by bug LINX-13901 (500 on manual-order edit). FE build vehicle LINX-13299 (DEVIN AI) in development (General Info done; Special Services + Pickup/Delivery in dev).
- Cancel/Restore: shared BE (LINX-10795/LINX-10796, Closed); Restore applies to Cancelled orders (inferred from BE ticket title, not verbatim AC). Copy: separate epic LINX-7554, least specified.

## Backend data model (mid-migration — treat as unstable)
- Old source: om.order_staging. New table per DDL comment on LINX-13392 (2026-07-15): om.draft_error_orders — order_number, customer_id, ship_direction_code, freight_term_code, equipment_number, origin/destination (partner_id, full_name, city, region, country), pickup/delivery appointment + requested/scheduled timestamps EACH WITH separate *_time_zone_code columns, gross_weight_value/uom_code, volume_value/uom_code, linx_order_status_id FK → om.order_status, order_staging_id FK → om.order_staging, audit cols.
- Status seeds (LINX-12091): ('DRAFT','Draft','PRE_SUBMISSION') and ('RPLN_PGRS','Re-Plan in Progress','POST_EDIT') — note the status_type grouping (PRE_SUBMISSION/POST_EDIT) our schema lacks.
- Migration in flight: LINX-13391 PR otms-odyssey-order-service#863 in review (2026-07-23); E2E validation LINX-13813 In Development. Earlier abandoned approach LINX-12090 added same fields directly to order_staging. Implementation PRs #813/#814/#816 not fetched.
- Implication: design our own schema/API contract; align field names with the DDL where settled, don't mirror an in-flux table 1:1.

## Data gaps vs our current schema (packages/db/migrations/001_schema.sql)
Draft tab needs: created, created_by, last_edit. Validation Errors needs: draft_order_status (Ready/Complete/Purge), error_count. All tab needs: hazardous, latest pickup/delivery timestamps (+ tz codes). None exist today. Current OrdersTable.jsx renders ONE flat column set identical across tabs (no Order Status column, no sub-columns, no Manage Columns/Export/Filter).

---

Provenance: researched 2026-07-26 via Atlassian MCP (Odyssey account), session S94; compiled by Claude; AI-generated — validate with Ramesh/Efrain before implementation.

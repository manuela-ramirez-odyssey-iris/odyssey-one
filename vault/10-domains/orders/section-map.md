---
domain: orders
type: analysis
tags: [orders, section-map, api-integration, build-plan]
date: 2026-06-10
status: draft
source: "Derived from [[10-domains/orders/domain-analysis|Orders domain analysis]] (Jira LINX intake 2026-06-10) × [[order-service-api]] (Confluence LLDs)"
---

# Orders — Section Map (UI section ↔ data ↔ endpoint)

> The GATE 0 artifact: every UI surface the React rebuild needs, the data it consumes, and the real `order-service` endpoint that serves it. The Orders counterpart of the Shipments seam-to-API map. Spec coverage column tells us how much grooming each slice can lean on.

| # | UI section | What it does | Data needed | Endpoint(s) | Spec coverage |
|---|---|---|---|---|---|
| 1 | **Order Overview grid** (landing) | Paged/filtered/sorted list of all orders; columns per §5; Order Number shown over LINX id | Compact role-nested grid rows; pagination envelope | `POST /order-service/v3/order/list` | **Strong** (LINX-7557) |
| 2 | **Overview filters** (basic + advanced) | Order #/Status/Customer multi-select (AND across, OR within); origin/destination; date ranges; advanced set | Filter object on the list request; lookup values for dropdowns | same `/order/list` + `v1/*` lookups | **Strong** (LINX-10798–10810) |
| 3 | **Error tabs** (Data Validation · Technical) | Badge-counted fallout tabs on Overview. ⚠ **Tab-set conflict**: Efrain's design shows **All · Saved · Canceled · Interface Failures** instead (screen 0) — see Q25 | Failed-order lists + counts | `POST /order/validation-error/list` · `POST /order/technical-error/list` | **Medium** (LINX-11180/11181; OIF detail in Analysis; tabs unresolved) |
| 4 | **Manage Columns + Custom Views** | Show/hide/reorder (min 6, max 12); per-customer saved views (columns + filters) | View definitions persisted server-side | **Endpoint unknown** — views are DB-persisted (LINX-10788) but no API named | **Medium** — UI specced, persistence contract is a gap |
| 5 | **CSV export** | Exports current filtered/sorted view | Same filter object as the grid | `POST /order-service/v3/order/export/csv` | **Strong** (LINX-11165) |
| 6 | **Order detail (View Order)** | Full read view; tabs incl. Audit Trail; descriptions enriched | Flat `manualOrder{}`; master-data description lookups | `POST /order-service/v3/order/view` `{orderNumber, customerId}` | **Strong** (LINX-10700/10233) |
| 7 | **Order create form (Quick + Long = ONE form)** | Progressive disclosure: Quick is the default view; "Add More Details" expands **in place** into Long (Efrain) — NOT two routes. Field-level validation as-you-type; frequency-sorted type-ahead dropdowns; Save / Save-for-Later / Discard | ~20 `v1/*` lookups; inline order-# uniqueness; create envelope | `POST /v3/manual-order` · `POST /v3/order/validation` · `order-service/v1/*` lookups | **Strong+** (LINX-7553, 319 stories + Efrain UX: General Info, Pickup/Delivery, Special Services, Save semantics) |
| 8 | **Product Information grid** | Fully specified in Efrain's design (screens 4.x): editable grid with search, US/Metric toggle, sort, inline add/edit rows w/ per-row Save/Cancel, validation, three-dot menus, expand-to-modal, column management, roll-up stats. Long sub-sections (Packaging, Hazmat etc.) extend it | Same as #7 + extended line fields | Same as #7 | **Design reference Strong (screens), written spec Weak** (LINX-8026 ungroomed; required-columns conflict Q26) |
| 9 | **Create confirmation page** | Post-submit summary (Quick vs Long variants); includes an **async info-message state** ("you'll be notified when the Order number is created") | Create response envelope `{orderId, success, message, data}` | response of `/manual-order` | **Strong** (Efrain §Confirmation + LINX-9002/9340/9347) |
| 10 | **Order actions** (row + detail) | Edit · Cancel/Restore · Copy · Delete · Hold/Release · assign/remove shipment. Sourced preconditions: **Edit = anything except Customer**; **Delete = only when not on a Shipment** (PRD 2365915159) | Action preconditions (status rules); minor-vs-major edit classification | `POST /v3/order/cancel` · `/order/restore` · `PATCH /v3/order-status` (bulk) · edit via `POST /v3/order` (`orderInterface{}`) · delete: legacy `DELETE /v1/order/{orderId}` | **Weak** — Edit/Cancel UI in Tech Design; Delete story missing; Copy 1 story; preconditions now PRD-sourced |
| 11 | **OIF fallout review** | Fix → re-validate → re-send failed integrated orders; 3 error categories | Exception rows (`order_exception_detail`); staged payload | Backed by error lists (#3); re-process contract **not named** | **Weak** (LINX-11137 in Analysis) |
| 12 | **Audit Trail tab** | Append-only, reverse-chron field-level history; order + line granularity | Paged change log: field, oldValue, newValue, changeMadeBy, timestamp | `POST /order-service/v3/audit-report` | **Strong** (LINX-7958/8091/9730/10812) |

## Out of v1 scope (documented, not built)
- Shipment-reaching-cutoff view (LINX-448 — empty epic)
- Order Upload from template / creation templates (LINX-5984, LINX-6002 — Todo, unspecced)
- Parcel orders / Order Line to Pallet (placeholder epics)
- **TEMPLATE=Y order mode** — future flag suppressing required fields, hidden from screens (PRD 2365915159)
- **Batch → event-based Move migration** — backend prerequisite for real-time order sync, no UI surface (PRD 2453340164)

## Suggested vertical-slice order (Phase 2)
Rationale: strongest-specced + highest-leverage first; each slice demos end-to-end in mock mode through the real contract (the Plan 2a pattern).

1. **Overview grid + filters + pagination** (#1, #2, #5) — the landing surface; reuses Shipments' list/grid wiring patterns (`useQuery` + paged service).
2. **Order detail / View Order** (#6) — read-only, contract-rich, exercises the flat `manualOrder` DTO + mapper.
3. **Order create form** (#7, #9) — the richest spec; includes the Long in-place expansion shell (Additional Info / Instructions / References); brings in FormField/FieldSelect/Checkbox/Accordion/StepIndicator components already normalized for this. Product sub-sections deferred to slice 6.
4. **Audit Trail tab** (#12) — small, well-specced, attaches to detail.
5. **Error tabs + OIF review** (#3, #11) — needs open-question answers first.
6. **Actions + Long Product sub-sections** (#10, #8) — blocked on grooming; build against what's settled, flag the rest.

## Contract gaps to reconcile (carry into Phase 1 spec)
- Custom Views persistence endpoint (#4) — not in the LLD notes.
- OIF re-process/re-send endpoint (#11) — unnamed.
- Manual-order **edit** submit contract — `/manual-order` vs `/order` (`orderInterface{}`) for edits is unconfirmed ([[order-service-api]] open gap: image-only FE Order Creation page).
- Delete UI story key (LINX-10300 collision — see [[10-domains/orders/domain-analysis|Orders domain analysis]] §10).
- **Sync vs async create** — what triggers the async "you'll be notified" path (Efrain §Confirmation), and does the form poll/subscribe for the Order Number? Relates to the batch→event migration (PRD 2453340164).
- **Synthetic orders** — `sourceApplication` value for CX-Platform-generated orders + how they render on the Overview grid (PRD 2366406657).
- **Contact Information fields** (name, E.164 phone, email under Pickup/Delivery — Efrain) — no Jira backing; data-model home unknown (involved party? new collection?).

## Component gaps (drives Phase 2 /normalize cycles)

Consolidated in [[10-domains/orders/screens-reference|Screens reference]] — the deduped table of UI elements visible in Efrain's Figma design screens with no normalized `@odyssey/ui` equivalent yet. Headliners: **date picker · time picker · async searchable master-data select · editable data-grid (inline add/edit rows) · accordion-stepper composition · sticky form footer · read-only KeyValue list · value+UoM composite input**.

> AI-generated. Validate with the Orders team (Ramesh/Priya) before Phase 1 spec. Status: draft pending GATE 0.

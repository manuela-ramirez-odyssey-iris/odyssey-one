---
title: Orders — Functional Requirements Tracker (Story Matrix)
domain: orders
type: reference
tags: [orders, requirements-tracker, jira, conformance, linx-5943, prototype-state]
date: 2026-06-15
status: active
source: "Ramesh (PO) — Functional Req. Status Tracker 1.xlsx (master FR tracker for the LINX-5943 Order Capability epic) + Ramesh feedback email 2026-06-15 + prototype build-state audit (this session)"
---

# Orders — Functional Requirements Tracker (Story Matrix)

This note is a **synthesized story matrix** for the Orders epic, triangulating three sources:

1. **Ramesh's "Functional Req. Status Tracker 1.xlsx"** — the PO's master Functional Requirements Tracker. Every story is tagged **Story Type (UI / Backend)** and carries Jira readiness statuses. This is the authoritative **scope/status** list. Scope = **LINX-5943 "Order Capability"** epic.
2. **Ramesh's prototype-review feedback (2026-06-15)** — observations after reviewing the deployed prototype URL (what is / isn't visible).
3. **Prototype build-state audit (this session)** — code-level verdict per story (what is actually built in the React app).

The **Prototype state** column is the conformance lens — what the React prototype owes against the documented scope. It is NOT a Jira status; it is our build verdict.

Related canon: [[domain-analysis]] · [[section-map]] · [[screens-reference]] · [[decisions/decision-log|Orders decision log]] · [[order-service-api]]

**Prototype state legend**
- **Built** — implemented and functional in the prototype.
- **Partial** — partly implemented / WIP.
- **Stub** — UI renders but the action is a no-op (no handler).
- **Absent** — not present in the prototype.
- **— (backend)** — Backend story, out of prototype (UI) scope.

---

## Story matrix (grouped by Sub-Epic / priority)

### Sub-Epic LINX-7552 — Integrated Order Creation & Validation (priority 1)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| Data Mapping for Integrated Orders | LINX-8063 | Backend | Complete | — (backend) |
| Validations for Integrated Orders — Mandatory fields | LINX-8064 | Backend | Complete | — (backend) |
| Validations for Integrated Orders — Conditional fields | LINX-8066 | Backend | Complete | — (backend) |
| Validations for Integrated Orders — Additional fields | LINX-8067 | Backend | Complete | — (backend) |
| **OIF UI to fix validation errors for integrated orders** | **LINX-11137** | **UI** | In Progress / readiness Yet to Start | **Absent** |
| Country/Region/City/Postal — Validation for Integrated Orders | LINX-8068 | Backend | Complete | — (backend) |
| QCA Routing Call from Order (Integrated) | LINX-9021 | Backend | Complete | — (backend) |
| QCP Rating Call from Order (Integrated) | LINX-9020 | Backend | Complete | — (backend) |
| Integrated Order — Cancelling non-existent order — rephrase error | LINX-10683 | Backend | Complete | — (backend) |

### Sub-Epic LINX-7558 — Master Data Integration (priority 2)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| Master Data for Order Creation | LINX-8062 | Backend | Complete | — (backend) |

### Sub-Epic LINX-7555 — Order Lifecycle Management (priority 3)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| Order Lifecycle for Integrated Orders | LINX-6001 | Backend | Complete | — (backend) |
| Order Lifecycle for Manual Orders | LINX-6081 | Backend | Complete | — (backend) |
| Order Lifecycle during Order Editing (Manual & Integrated) | LINX-11185 | Backend | (blank / Analysis) | — (backend) |

### Sub-Epic LINX-7958 — Audit Trail (priority 4\*\*)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| **Audit Trail (Single Line Item) — View Actions & Events** | **LINX-8091** | **UI** | Complete (readiness Yet to Start) | **Absent** |
| **Audit Trail (Multiple Line Items) — View Actions & Events** | **LINX-9128** | **UI** | Complete (readiness Yet to Start) | **Absent** |

### Sub-Epic LINX-7553 — Manual Order Creation (Quick Order) (priority 5)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| Quick — General Information Section | LINX-8118 | UI | Complete / Groomed | **Built** |
| Quick — Pickup / Delivery Section (Consignor & Consignee) | LINX-8119 | UI | Complete / Groomed | **Built** |
| Quick — Ship & Delivery Date and Time | LINX-8120 | UI | Complete / Groomed | **Built** |
| Quick — Product Information Section (Add Product) | LINX-8121 | UI | Complete / readiness WIP | **Partial** (🚧 WIP) |
| Quick — Manage Column for Product Information | LINX-8122 | UI | WIP | **Absent** |
| Quick — Reorder columns & column width (Product Info) | LINX-8123 | UI | WIP | **Absent** |
| Quick — Special Services (Manage Special Services) | LINX-8124 | UI | Complete / Groomed | **Built** |
| Quick — Special Services (Quick selection) | LINX-8125 | UI | Complete / Groomed | **Built** |
| New Logic for fetching Special Services (Quick) | LINX-10985 | Backend | Complete | — (backend) |
| Quick Order Confirmation Page | LINX-9002 | UI | Complete / Groomed | **Built** |
| In-Order Actions in Quick Order Creation | LINX-9010 | UI | Complete / Groomed | **Built** |
| QCA Routing Call from Order (Manual) | LINX-8100 | Backend | Complete | — (backend) |
| QCP Rating Call from Order (Manual) | LINX-8101 | Backend | Complete | — (backend) |
| Search Functionality for Mandatory Fields (Manual Create UI) | LINX-9882 | Backend | Complete | — (backend) |

### Sub-Epic LINX-7556 — Manual Order — Edit, Cancel Order (priority 6)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| **Post Order Creation Actions — Edit Order** | **LINX-10248** | **UI** | Complete (readiness Yet to Start) | **Stub** (menu item, no handler) |
| **Post Order Creation Actions — Cancel Manual Order** | **LINX-10258** | **UI** | Complete (readiness Yet to Start) | **Stub** (menu item, no handler) |

### Sub-Epic LINX-8026 — Manual Order Creation (Long Order) (priority 7)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| Long — References Sub-Section (General Information) | LINX-8126 | UI | Complete / Groomed | **Built** |
| Long — General section (Add Instructions) | LINX-8127 | UI | Complete / Groomed | **Built** |
| Long — References section | LINX-8128 | UI | Complete / Groomed | **Built** |
| Long — Pickup / Delivery section | LINX-8042 | UI | Complete / Groomed | **Built** |
| Long — Ship & Delivery Date and Time | LINX-8028 | UI | Complete / Groomed | **Built** |
| Long — Product Information (Add Product — Product Details) | LINX-8131 | UI | WIP | **Partial** (🚧 WIP) |
| Long — Product Information (Add Product — Add Reference Codes) | LINX-8132 | UI | WIP | **Partial** (🚧 WIP) |
| Long — Product Information (Add Product — Add Hazmat) | LINX-8133 | UI | WIP | **Partial** (🚧 WIP) |
| Long — Product Information (Add Product — General) | LINX-8134 | UI | WIP | **Partial** (🚧 WIP) |
| Long — Product Information (Add Product — Packaging) | LINX-8135 | UI | WIP | **Partial** (🚧 WIP) |
| Long — Special Services (Manage Special Services) | LINX-8043 | UI | Complete / Groomed | **Built** |
| New Logic for fetching Special Services (Long) | LINX-10986 | Backend | Complete | — (backend) |
| Long — Special Services (Quick selection) | LINX-8044 | UI | Complete / Groomed | **Built** |
| Long Order Confirmation Summary Page | LINX-9004 | UI | Complete / Groomed | **Built** |
| In-Order Actions in Long Order Creation | LINX-9009 | UI | Complete / Groomed | **Built** |

### Sub-Epic LINX-7554 — Order Copy (priority 8)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| **Post Order Creation Actions — Copy Order** | **LINX-10259** | **UI** | Complete (readiness Yet to Start) | **Stub** (menu item, no handler) |

### Sub-Epic LINX-7557 — Order Overview & Actions (priority 9)

| Story | Story # | Type | Tracker status | Prototype state |
|---|---|---|---|---|
| **Order Management — Order Overview / Summary Page** | **LINX-9896** | **UI** | Complete (readiness Yet to Start) | **Partial** (grid built; wrong/minimal columns, no tabs — see below) |
| **Post Order Creation Actions & View Order** | **LINX-10233** | **UI** | Complete (readiness Yet to Start) | **Stub** (menu item, no handler) |
| **Order Overview — Manage Columns** | **LINX-10300** | **UI** | Complete (readiness Yet to Start) | **Absent** |
| **Order Overview — Display Custom Views** | **LINX-10788** | **UI** | Complete (readiness Yet to Start) | **Absent** |
| **Order Overview — Create Custom Views** | **LINX-10814** | **UI** | Complete (readiness Yet to Start) | **Absent** |
| **Order Overview — Edit Custom Views** | **LINX-10825** | **UI** | Complete (readiness Yet to Start) | **Absent** |
| **Order Overview — Delete Custom Views** | **LINX-10838** | **UI** | Complete (readiness Yet to Start) | **Absent** |
| **Order Overview — View / Apply Filters** | **LINX-10285** | **UI** | Complete (readiness Yet to Start) | **Stub** (Filter button is a no-op) |

> Export to CSV (LINX-11165, referenced in [[domain-analysis]] §5) is part of the Overview scope and is **Absent** in the prototype. Ramesh's feedback also flags it as missing.

---

## UI coverage summary

This is what the prototype owes against documented UI scope. Backend stories are excluded (out of prototype scope).

**Built (12 UI stories)** — the manual Create Order flow, almost entirely:
- Quick: General Info (LINX-8118), Pickup/Delivery (LINX-8119), Ship/Delivery Date & Time (LINX-8120), Special Services Manage (LINX-8124) + Quick selection (LINX-8125), Confirmation (LINX-9002), In-Order Actions (LINX-9010).
- Long: References sub-section (LINX-8126) + References section (LINX-8128), Add Instructions (LINX-8127), Pickup/Delivery (LINX-8042), Ship/Delivery Date & Time (LINX-8028), Special Services Manage (LINX-8043) + Quick selection (LINX-8044), Confirmation (LINX-9004), In-Order Actions (LINX-9009).
- *(Plus Planning Date radio + Early≤Late validation, which sits across LINX-8120/8028.)*

**Partial / WIP (7 UI stories)** — all the Product Information surface:
- Quick Product Info (LINX-8121, 🚧), Long Product sub-sections: Product Details (LINX-8131), Reference Codes (LINX-8132), Hazmat (LINX-8133), General (LINX-8134), Packaging (LINX-8135). Plus the Overview Summary grid (LINX-9896) — built but with the wrong/minimal column set and no tabs (counts as Partial; see Stub/Absent breakouts below).

**Stub (5 UI stories)** — UI renders but no handler:
- Edit Order (LINX-10248), Cancel Manual Order (LINX-10258), Copy Order (LINX-10259), View Order (LINX-10233) — all in the row-action menu but no-ops.
- View / Apply Filters (LINX-10285) — the Filter button renders but does nothing.

**Absent (9 UI stories)** — not present at all:
- OIF / integrated validation UI (LINX-11137).
- Audit Trail single-line (LINX-8091) + multi-line (LINX-9128).
- Manage Columns (LINX-10300), plus the Product-grid column controls (LINX-8122, LINX-8123).
- Custom Views: Display (LINX-10788), Create (LINX-10814), Edit (LINX-10825), Delete (LINX-10838).
- *(Export to CSV — LINX-11165 — also Absent.)*

**Counts:** Built **12** · Partial **7** · Stub **5** · Absent **9** (UI stories only; ~13 backend stories are out of prototype scope).

> Note on LINX-9896 (Summary Page): the grid exists but its column set is wrong/minimal vs spec — it shows ID, Customer, Origin, Destination, Weight, Volume, Commodity, Equipment, Early Pickup, Action, whereas the spec ([[domain-analysis]] §5, LINX-11165 CSV default set) requires Order Number, Order Source, Ship Direction, Freight Terms, Consignor/Consignee, Latest Pickup/Delivery Date, Order Status, etc. The "ID" column must show **Order Number** when present (LINX-11013). Tabs (All/Saved/Canceled/Interface Failures per Efrain design, or the three story-spec tabs) are absent. Categorized **Partial** because the grid shell is built even though its contents are non-conformant.

---

## What's covered vs what's owed (one-line)

The prototype currently covers the **manual Create Order flow** (Quick + Long, minus Product Information) — that is the Built bucket. Everything in the **Overview/Summary epic (LINX-7557)**, **post-creation row actions (LINX-7556/7554/10233)**, the **Audit Trail epic (LINX-7958)**, and the **OIF integrated-validation UI (LINX-11137)** is **Stub or Absent**. Product Information (Quick + all Long sub-sections) is **Partial/WIP**. See [[decisions/decision-log|ORD-01]] for the conformance-gap decision entry.

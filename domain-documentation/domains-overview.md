# Odyssey-One — Domains Overview

> **Source:** Grooming session with David Johns, 2026-04-29 (`shipments-documentation/Documentation/Grooming-sessions/0429-Domains-grooming-David.vtt`).
>
> **Status:** First-pass synthesis. The Shipments domain has its own deeper documentation in `shipments-documentation/Documentation/`. This file is the umbrella reference — it grows as other domains get their own grooming sessions.

## Sidebar order — operational principle

David's framing: **transactional flow on top, master data below.**

| Group | Sidebar order |
|---|---|
| **Transactional** (the user's actual workflow) | Home → Orders → Shipments → Tracking |
| **Master data** (reference, edited rarely) | Carriers, Customers (future) |

When asked "carriers or shipments next?", David answered **Shipments**. Carriers is a reference table that Orders, Shipments, and Tracking all read from — it doesn't belong in the transactional flow.

### Code-vs-spec gap

Current `apps/odyssey-one/src/components/layout/Sidebar.jsx` order:
```
Home / Orders / Carriers / Shipments / Tracking
```

Recommended new order (aligned with David's principle, plus the User Management addition discussed previously):
```
[transactional]  Home / Orders / Shipments / Tracking
[master data]    Carriers / User Management / Partners
```

`Settings` (User Settings) was **not** mentioned in this session. It's currently in the sidebar as legacy; potentially overlaps with User Management. Decision pending.

## Per-domain summaries

### Home
- **What:** Personalized dashboard of widgets, scoped to the user's assigned customers. Customizable layout over time.
- **Who:** Planners, Managers — entry point for all roles upon login.
- **Entities:** widgets (KPI cards, status summaries), the user's customer roster.
- **Cross-domain:** **read-only consumer.** Aggregates from Orders, Shipments, Tracking. Writes nothing back.

### Orders
- **What:** Where planners create the request to move goods. Auto-creates a Shipment on submission.
- **Who:** Planners, Managers.
- **Entities:** Customer Order (with line items / products), order status, dates, special handling flags (e.g., hazmat).
- **Cross-domain:**
  - Reads: Customers (master), Carriers (compliance lookups for tendering).
  - Writes: creates a Shipment record on order creation; can trigger auto-tender to a Carrier.
- **Note:** auto-tender is **optional** — David said "can be" automatically tendered, not "is always." Implies a rule/threshold or planner override path.

### Shipments
- **What:** Operational view of freight movements tied to orders. Tender history, status, compliance.
- **Who:** Planners, Managers — primary day-to-day working domain.
- **Entities:** Shipment (linked to Order), Tender (offer to a Carrier), shipment status, tender history, pickup/delivery windows.
- **Cross-domain:**
  - Reads: Orders (parent), Carriers (for tender), Customers (context).
  - Writes: shipment status updates, Tender records.
- **Existing documentation:** `shipments-documentation/Documentation/shipments-domain-analysis.md` and decision log.
- **Note:** tender history must always be logged — David flagged the prototype was missing this. The full history shows on the shipment, not just the latest tender state.

### Tracking
- **What:** Read-only view of shipment progress and exception alerts. Real-time or near-real-time.
- **Who:** Customers (external), Planners, Managers (internal visibility).
- **Entities:** Tracking events (pickup, in-transit, delivery), Exception alerts (delay, damage, miss).
- **Cross-domain:**
  - Reads: Shipments (parent shipment state), Carriers (carrier identity), Orders (context).
  - Writes: **none** confirmed. Pure consumer per David's framing. (Potential ack-events back to Shipments — not confirmed; defer.)
- **Source of events:** carrier APIs + Shipments status — undefined whether real-time push or polling.

### Carriers (master data)
- **What:** Master data registry + compliance matrix. Lists carriers, their qualifications (TL/LTL, hazmat, equipment types), contractual status.
- **Who:** Carrier team (master-data maintenance). Read indirectly by Orders/Shipments during auto-tendering.
- **Entities:** Carrier record (name, contact), compliance matrix (qualifications), contacts/rates.
- **Cross-domain:**
  - Reads: by Orders, Shipments, Tracking (foreign-key-style references).
  - Writes: Manual entry by the Carrier team. **Bulk import** from existing database is supported.
- **Note:** UI emphasis should be **bulk operations and compliance verification**, not single-record entry. Compliance is **stored** reference data, not a live query.

### Customers (master data — not yet a sidebar entry)
- **What:** Master data registry of Odyssey's customers (shippers).
- **Who:** Maintained centrally; read by Orders and Home.
- **Entities:** Customer name, location, shipping profile (TL/LTL preference, special instructions, rates).
- **Cross-domain:**
  - Reads: Orders (customer context), Home (user-customer assignments).
  - Writes: Master data maintenance, slow-moving.
- **Note:** David confirmed this is needed but didn't elaborate. Decision pending: dedicated sidebar entry, or surfaced only via Orders / User Management.

### User Management (not discussed this session)
Not covered with David. From earlier project context: planners get assigned to ~7 customers each (soft cap), managers want full-team visibility (~8–12 customers). Roles unclear beyond planner/admin. Spec for this domain is still pending — collect docs separately.

## Cross-domain canonical flow

The **happy path** confirmed by David:

```
1. Planner creates Order        (Orders)
       │
       │ auto-creates a Shipment
       ▼
2. Shipment exists               (Shipments)
       │
       │ optional auto-tender
       ▼
3. Tender → Carrier              (Shipments writes; Carriers read)
       │   tender history logged on Shipment
       ▼
4. Tracking sees progress        (Tracking reads from Shipments + carrier APIs)
       │   exceptions surface here
```

**Reverse writes:** none. Carriers is a hub of reference data — Orders/Shipments/Tracking all look up Carriers, but changes to Carriers don't flow back into them automatically.

## Surprises / things to revisit

1. **Transactional vs master data is a new framing** — clarifies sidebar grouping and schema thinking. Affects both UI (visual divider in the sidebar) and Supabase RLS shape.
2. **Customers is missing from the sidebar plan** — needs a decision on whether to surface it.
3. **Auto-tender is optional** — schema needs a tender-mode field on Orders (or a config table).
4. **Carrier compliance is stored, not computed** — `carriers` table needs `equipment_types[]`, `hazmat_certified`, `mode_qualifications[]`, etc. The current schema sketch in `docs/supabase-migration-plan.md` only has `id, scac, name, created_at`.
5. **Manager role visibility differs from planner** — managers see their team's customers, not just their own. RLS policy needs a team/manager-of relation.
6. **Tender history is mandatory UX** — must always be visible, never squashed.

## Open questions (to ask in future grooming)

| Question | Why it matters | Whom to ask |
|---|---|---|
| When does auto-tender fire vs. require manual review? | Schema field on Orders/Shipments + planner UX in Orders. | David, John |
| What's the carrier-selection algorithm for auto-tender? (round-robin? cost? compliance-only?) | Affects Shipments backend logic. | David, John |
| Real-time vs near-real-time Tracking source? Carrier APIs (push) or polling? | Affects infra: webhooks vs polling jobs. | David, IT |
| Does Tracking write back ack-events to Shipments? | Determines whether Tracking is read-only. | David |
| Are managers a formal role, or a "view-as" elevated planner? Team structure? | RLS policy shape. | David, IT |
| Is "User Settings" still needed in the sidebar, or folded into User Management? | Sidebar item count + UX. | David, Manuela's call |
| Does Customers warrant a sidebar entry now, or surface via Orders only? | Sidebar item count + IA. | David, Efrain |

## Stakeholders who own each domain

| Domain | Internal owner | External feedback |
|---|---|---|
| Home | TBD (likely product manager / Efrain) | — |
| Orders | David (operational), John (consolidating internal feedback) | — |
| Shipments | David, Janardhana (Jana — domain expert), John | Efrain (UX) |
| Tracking | TBD | TBD |
| Carriers | The Carrier team | — |
| Customers | TBD | — |
| User Management | TBD | — |

David is consolidating internal feedback with John before deeper Shipments work — applies to other domains too as their groomings happen.

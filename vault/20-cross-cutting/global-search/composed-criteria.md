---
title: GlobalSearch — Composed Criteria (working spec)
domain: cross-cutting
type: spec
status: in-progress
date: 2026-06-04
tags: [global-search, search, composed-criteria, chips, entity-scope, api-design]
---

# GlobalSearch — Composed Criteria (working spec)

Living discovery log for **multi-chip ("composed") search behavior**. When a user
commits more than one chip, what does the result set mean? This doc captures the
rules as we discover them, case by case, building toward a single overview that
feeds **API design + documentation**.

> **Why a separate doc:** the behavior has many corner cases that need
> experimentation, not a one-shot statement. We log cases here, extract the
> general rule, and only promote firm rules to [[decisions/decision-log]] (GS-NN)
> + the [[global-search|canon]] once they stabilize. The goal is to express
> behavior as **taxonomy-driven rules** (attribute → entity scope), NOT as
> per-pair enumeration of the ~40 attributes.

Companion to the [[global-search|canon]] (mechanics/UI) and the
[[data/attribute-schema|attribute schema]]. Implementation seam:
`apps/odyssey-one/src/search/shipments/adapter.js` (`searchShipments`).

---

## Core model (working)

Four concepts drive everything below.

### 0. The domain is the implicit search context

Every search inherits the **current domain as its universe**. In Shipments, you
are always searching *shipment-related* data — committing `Customer ID` first does
**not** mean "find a customer," it means "shipment data scoped to this customer."
In Tracking, the same chip means tracking data for that customer. The domain is
the frame; chips refine within it.

Counter-pressure from business (Jana): users sometimes want to drill to a
*different* entity than the domain's headline noun — *"orders delivered in a date
range for two customers,"* *"customers that have hazmat products in an order."*
That's reconciled by concept #1: the **leading chip picks the entity granularity**
(order / shipment / customer) *within* the domain context. Domain = universe;
leading chip = which grain of it you get back.

### 1. The leading chip sets the result ENTITY

> **The first committed chip (`chips[0]`) determines the *entity* the results
> represent — the "noun" you're searching for. Every other chip is a filter on
> that entity.**

- Lead with an **order-scoped** attribute (e.g. Order #) → results are **orders**.
  A shipment with 3 matching orders produces **3 rows**. `total` = matching orders.
- Lead with anything else → results are **shipments**. **1 row per shipment**.
  `total` = matching shipments.

The leading chip also drives the **bold field** in `MatchRow`, the **avatar icon**,
and which **status badge** is shown (see Conventions).

### 2. Every attribute has an entity SCOPE

Scope = the entity level an attribute lives at. It decides both how the attribute
filters AND what entity it produces when it leads.

| Scope | Meaning | Attributes (draft — needs validation vs CSV/Jana) |
|---|---|---|
| **order** | belongs to a single order | Order # |
| **shipment** | belongs to the shipment | Buy/Sell Shipment #, Pro#, Origin, Destination, Pickup/Delivery Date, Mode, Equipment Code, Equipment #, Seal, SCAC, Tender Status, Shipment Status, Gross Weight, AP Freight Cost, Load #, Load Count |
| **customer** | a party on the shipment | Customer ID, Customer Name, Consignor, Consignee |

**Cross-scope filtering rule** (generalizes — no per-pair logic):
- A shipment **qualifies** if *every* chip matches it. For an order-scoped chip,
  "matches" = at least one of the shipment's orders contains the value.
- When result entity = **order**, after shipment qualification we **explode** each
  shipment into its orders and keep only the orders that satisfy the order-scoped
  chips. Shipment-scoped + customer-scoped chips never filter individual orders —
  they only decide which shipments survive.

> Code marker: `ORDER_KEYS` / `CUSTOMER_KEYS` sets in the adapter. Today
> `order` scope = `{orders}` only. The full scope map is the open taxonomy
> (see Open Questions Q1).

### 3. All combinations are valid; progression only *suggests*

Any chip can combine with any other — **progression order never restricts what's
valid**. `Mode: LTL` then `Buy Shipment #: 25` is fine even though Mode sits far
below shipment-id in the progression. Progression order does exactly one thing:
it orders the **empty-input suggestions** (see next section). Typing always
value-matches across *all* attributes regardless of group.

---

## Empty-suggestion progression

What the suggestion list shows **when the input is empty** (it's a guide, never a
constraint):

- **No chips committed** → entry points: the first `INITIAL_COUNT` (5) attributes
  at the top of the progression. Title: *"Suggested Filters"*.
- **≥1 chip committed** → the **next progression GROUP** — don't repeat the entry
  set (repeating it reads as "you must reuse these"). The next group = the group
  *after the furthest group any committed chip belongs to* (drill forward). The
  suggestion list title becomes that group's drill-stage **label**
  (e.g. *"Who it belongs to"*, *"Where it goes"*).
- **On / past the last group** → stay on the last group, minus committed.
- Fully-committed groups are skipped so the panel is never empty.

The progression groups, in order, with their drill-stage labels:

| # | Group | Label (suggestion title) |
|---|---|---|
| 0 | Shipment Identifiers | Find the shipment |
| 1 | Customers & Parties | Who it belongs to |
| 2 | Route & Geography | Where it goes |
| 3 | Schedule & Appointments | When it moves |
| 4 | Transport & Equipment | How it moves |
| 5 | Carrier & Tender Status | Operational status |
| 6 | Cargo & Handling | Cargo details |
| 7 | Rates & Costs | Financial details |
| 8 | Load Details | Load logistics |

Example: commit `Customer ID: Erco` (group 1) → empty suggestions show group 2
*"Where it goes"* = Origin / Destination. Reads as *"shipments for Erco — now,
where do they go?"*

> Code: `nextProgressionGroup(chips)` + `getInitial(chips)` in the adapter.
> The hook (`useGlobalSearch`) just passes committed chips to `getInitial`; it
> knows nothing about group order (domain-agnostic). Anchoring = **furthest group
> reached** (not last-committed-chip) so out-of-order commits never backslide —
> noted as a sub-decision; revisit if last-chip anchoring feels better in use.

---

## Conventions driven by the leading chip

| Leading scope | Bold field (`matchId`) | Avatar icon | Badge | Extra meta cell |
|---|---|---|---|---|
| order | the matching order # | `package` | **tender status** (Accepted/Sent/Declined/Cancelled) | `Shipment #:` (the parent buy shipment) |
| customer | the matched party value | `handshake` | shipment status (Done/Review) | — |
| shipment (default) | the leading attr's value | `container` | shipment status (Done/Review) | — |

Rationale for tender-status on order searches: showing *shipment* status in an
*order* search is confusing — orders are pre-shipment-decision entities, so the
tender outcome is the relevant signal. (S-? refinement, 2026-06-04.)

---

## Cases log

### Case 1 — Order # (empty) + Buy Shipment # = X  →  the shipment's orders
**Date:** 2026-06-04 · **Status:** ✅ implemented

- **Input:** commit `Order #` chip empty, type a valid shipment number, commit
  `Buy Shipment #` chip.
- **Intent (user words):** *"Order numbers that belong or match with X buy
  shipment #"* — i.e. all 3 orders of that shipment.
- **Before:** 1 shipment row, showing only the first order. ❌
- **After:** N order rows (one per order on shipment X), bold = order #, meta
  shows `Shipment #: X`, badge = tender status. ✅
- **Rule extracted:** leading order-scoped chip → result entity = order (the
  Core Model above). The empty order chip contributes no per-order narrowing
  (`includes('')` matches all), so all orders of the qualifying shipment surface.

### Case 2 — Empty-input suggestions don't repeat the entry set; they drill forward
**Date:** 2026-06-04 · **Status:** ✅ implemented

- **Problem:** after committing the first chip, the empty-input suggestion list
  re-showed the *same* top-of-progression attributes — reads as "you must reuse
  these filters," even though reusing them would still be valid.
- **Decision:** empty-input suggestions advance to the **next progression group**
  (titled by the group's drill-stage label); on the last group, stay there;
  suggestions only, never enforced; typing still matches any attribute. See
  *Empty-suggestion progression* above.
- **Realizations captured (Core model #0/#3):** the domain is the implicit search
  context; the leading chip picks entity grain within it; all chip combinations
  are valid regardless of progression order — progression only orders suggestions.

---

## Open questions

- **Q1 — Full entity-scope taxonomy.** The scope of all ~40 attributes needs to
  be settled (likely derivable from the CSV grouping + Jana). Drives every
  composed case. The draft table above is a starting guess.
- **Q2 — Customer-leading entity.** When the leading chip is customer-scoped,
  is the result entity a **customer** (one row per matching customer) or
  **shipments scoped to that customer**? Per Core model #0, the domain context
  (Shipments) argues the headline result is shipment-grained even when you lead
  with a customer — BUT Jana's examples (*"customers that have hazmat products in
  an order"*) show users sometimes genuinely want a **customer** result. Likely
  answer: customer-leading defaults to shipment-grained within Shipments, with an
  explicit way to flip the grain to customer when that's the intent. Currently:
  shipment entity + handshake icon. Needs a UX call — flagged, not decided.
- **Q3 — Order-row data shape.** Order rows currently inherit the *shipment's*
  route / customer / carrier / BOL (only order IDs exist at the main-row level).
  `orderDetails` has per-order shipFrom/shipTo, but lives in the on-demand detail
  file (too heavy to fetch for live preview). If per-order origin/destination is
  wanted in results, those fields must be lifted into the search index.
- **Q4 — Dedup / ordering of order rows** across multiple qualifying shipments
  when the order chip has a value (e.g. partial order # shared across shipments).
  Current: relevance-sorted by order # against the query, then sliced to 15.
- **Q5 — `total` semantics for "Show N results".** For order entity, N = matching
  orders. Confirm this is the number we route the table to (table is order-filtered
  vs shipment-filtered — interacts with the deferred table-filtering work).

---

## Promotion path

Firm rules graduate from this doc →
[[decisions/decision-log]] (`GS-NN`, with rationale/source) → [[global-search|canon]]
(mechanics) → eventual API contract docs. Until then, treat everything here as
the working model, subject to change as cases accumulate.

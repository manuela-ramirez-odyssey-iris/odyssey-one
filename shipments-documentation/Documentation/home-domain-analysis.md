# Domain Analysis — Home

Sources: David Johns (central PM, co-PM for Home), Kathleen (co-PM for Home), Manuela Ramirez (designer), Session 21 conversation (2026-05-08)

> Note: Home is **not a data-owning domain**. It does not have its own grooming sessions, decision log, or backlog the way Shipments does. This doc captures the *shape* of Home (model, mechanics, components) — actual data and business rules belong to the source domains (Orders, Shipments, Tracking, etc.). When this file is migrated into the Obsidian vault alongside other domain docs, expect it to be the lightest entry by far.

---

## 1. What Home Is

Home is the landing page of Odyssey-One. It is a **cross-domain dashboard** that exposes a tailored, high-level view of the platform's other domains (Orders, Shipments, Tracking, Carriers, Exceptions, User Management) without owning any of that data itself.

Brand intent: surface the **"One"** in Odyssey-One. Give users awareness that the tools share a unified database and that work across domains is correlated. Home is where a planner or executive lands first thing in the morning and *sees* what needs their attention before drilling into any specific domain.

It is deliberately **not** an action surface. Widgets are read-only visualizations + "Go to [domain]" links. No record-editing, no business workflows, no state changes that affect data outside the dashboard's own configuration. The actual work happens in the source domains.

---

## 2. Data Model

There is no Home-specific data model. All data lives in the single Odyssey-One database, which is a collection of records across all customers. Shipments reads it, Home reads it, Carriers reads it — no domain owns it.

What Home *does* own:

| Entity | Owner | Purpose |
|---|---|---|
| **Customer Scope** | per-user | Which of a user's assigned customers' data flows into the current Home view. Default = all assigned. |
| **Widget Instance** | per-user | A specific widget placed on the dashboard (e.g. "Orders @ 2x", "Shipments-Exceptions @ 1x"). |
| **Widget Profile** | per-user OR predefined | A saved layout = a grid of widget instances + their positions/sizes. Lets users switch between "Morning Triage" and "Carrier Review" without rebuilding the dashboard. |

> Sourced from Session 21 brief: "we have all this data in our database which is a collection of all data from our customers, when we select some customers, only the data of those will be shown" — Manuela paraphrasing the model.

---

## 3. Mechanics

### 3.1 Customer scope (the filter)

The `EntityChip` in `SectionHeader`'s trailing actions exposes the active customer scope. A user can have N customers assigned to them; the chip shows the count + handshake stack. The "+" affordance (an `IconButton` inside the chip) opens an "Add customers" picker. Selecting a subset narrows every widget's data in real time.

The chip itself is decorative — the *only* clickable element is the inner "+". (Session 21 decision: 2026-05-07, confirmed by Efrain.)

### 3.2 Widgets

Each widget is a visualization tile reflecting data from a source domain:

- **Order widgets**: counts/statuses for relevant order states (exceptions, cancelled, data-validation, interface failures)
- **Shipments widgets**: exception types, monitoring breakdowns, PG/POR
- **Tracking widgets**: AR Risk Pickup, AR Risk Delivery, On-Time, Late, Delivered
- **Carriers widgets**: not-started, in-transit, delivered
- **User Management widgets**: active, locked, pending, suspended, new account reviews
- **Account Request widgets**: new account reviews, rejected requests

The widget catalog is large and will be pruned + extended over time. Reference: `screenshots reference/Widgets.jpg`.

### 3.3 Widget sizes

Three sizes, fixed:

- **1x** — single metric (one number + one label). Most compact. One metric per instance; multiple 1x widgets needed to expose multiple metrics from the same domain.
- **2x** — single metric + small visualization (donut + percentage). Same split as 1x — one metric per instance.
- **3x** — consolidated multi-metric list (4–6 rows of label+value) for an entire domain. With a `showChart` variant that adds a donut to the right with row indicators tying to chart segments.

Resizing a widget changes its layout. **The system does not auto-collapse smaller instances when a user adds a 3x of the same domain** — that's a configuration concern, not a normalization concern.

### 3.4 Grid + rearrangement

Widgets are **draggable** (rearrange grid) and **sizeable** (swap between the 3 sizes). The grid system, drag mechanics, and the "Add Widgets" library modal are separate work from widget-component normalization.

### 3.5 Widget profiles (saved layouts)

A profile is a stored layout — grid position + size + configuration for every widget on the dashboard. Two flavors:

- **Predefined profiles** — shipped with the platform, role- or scenario-based ("Morning Triage", "Carrier Review", etc.)
- **User profiles** — saved by individual users for their own context-switching

Profile switching replaces the whole dashboard layout in one swap. Not yet specced in detail.

---

## 4. Components & Composition (as of Session 21)

Home's chrome composes existing `@odyssey/ui` primitives:

- `PageHeader title="Home"` (the route title)
- `SectionHeader title="Welcome [user]" supportingText="Last update: ..." leadingActions={<Button>Add Widgets</Button>} trailingActions={<EntityChip />}` (the greeting row)
- *(WIP)* `Widget` family + `WidgetShell` for the dashboard grid below

Wired in `apps/odyssey-one/src/routes/Home.jsx`. The actual dashboard content is being built incrementally — widget normalization is the current cycle.

---

## 5. Stakeholders & Ownership

| Person | Role |
|---|---|
| **David Johns** | Central PM for Odyssey-One overall (cohesion across domains) **+ co-PM for Home**. |
| **Kathleen** | Co-PM for Home alongside David. |
| **Manuela Ramirez** | Designer (this prototype). |
| **Efrain** | Designer (Session 21 input on chip-vs-IconButton interactivity). |

For Home-specific questions: David and Kathleen. For cross-domain cohesion: David (he owns the unity of the "One").

---

## 6. Open questions / non-decisions

- **Widget catalog pruning** — the screenshot shows ~40 widgets across all domain sections; the final list will be smaller. No defined criteria yet for what's in/out.
- **Grid layout system** — drag-and-drop framework, persistence, conflict resolution when a widget grows. Deferred until widget normalization lands.
- **Edit mode vs view mode** — widgets in the screenshot show close X + drag handle (grip-vertical icon). When does the user enter edit mode? Implicit (always-on)? Explicit toggle? Tied to the `TrailNav` Editor mode pattern already built for GlobalSearch?
- **Profile management UI** — how a user creates / saves / switches / deletes profiles. Not yet designed.
- **Customer-picker UX** — the "+" on EntityChip should open a customer-picker. Picker design not yet specced.

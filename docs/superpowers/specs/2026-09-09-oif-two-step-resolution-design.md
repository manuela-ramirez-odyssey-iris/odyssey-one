# OIF Two-Step Error Resolution — Design

**Date:** 2026-09-09 (S145)
**Sources:** LINX-16049 (Step 1 — Order Interface Errors, structural / pre-validation; assigned to Manuela, status *Initial UX/UI Design*) · LINX-11137 (Step 2 — Order Data Errors, master data; re-scoped 2026-09-03 to "the 2nd tab", already shipped as ORD-10) · LINX-16391 (OIF statuses `OIF_ERR` Error / `OIF_COMP` Complete / `OIF_PRG` Purge) · LINX-16281 (error payload `{ fieldTree, field, message }`) · `Order_Processing_and_Validation_Flow.docx` + `Level1_Error_Resolution_Design_Review.docx` (Ramesh/Dave, attached 2026-08-27 / 09-03; archived to `vault-sources/10-domains/orders/oif/`) · Saikat's 13-rule enumeration (LINX-16049 comment, 2026-09-03) · user rulings 2026-09-09.
**User rulings this session (2026-09-09):** steps, not tabs ("tabs mean options, not steps") — a 3-dot clickable timeline at the top, third dot = success preview; navigable both ways, editable only forward; reuse our components, refine later; mock/generator/local API only — no Neon reseed, no prod deploy without a separate go.
**Ramesh rulings (relayed 2026-09-10):** (1) of the message-control fields the user may set only the boolean (`deleteFlag` Yes/No); (2) Step 1 fixes are saved right away, not at the final Save; (3) a `Complete` order does NOT stay in the Validation Errors tab; (4) Dave's "not the same UI" means **Step 1 cannot be plugged into the create-form sections — Step 1 gets its own UI; Step 2 keeps the existing screen** (transcript 1:06–1:07); (5) address conflicts are picked **field by field**; (6) structural line faults are fixed by the planner; **Purge exists only for master-data (Step 2) errors**.

## What it is

An integrated order arrives as a customer message. Before it can become an order it passes **Level 1** (13 pre-condition checks: can the message be transformed into OrderIn at all?) and then **Level 2** (are the transformed values valid against master data?). Level 2 resolution is the existing `?resolve=` mode of `CreateOrderForm` (ORD-10). This design adds Level 1 resolution **on the same page, as a preceding step**, and a third success step, driven by a horizontal timeline.

Level 1 errors are mostly **contradictions between lines** (line 1 says PRE-PAID, line 3 says COLLECT) — nothing is individually wrong, so a parser cannot pick a winner; the planner must. The resolution control is therefore a **value picker**, not a field to correct.

Validation is sequential and real-time (LINX-11137 §E): an order never fails both levels at once; fixing Step 1 immediately runs Step 2 in the same interaction. The order stays `Error` until both steps are clean.

## Page shape

Route unchanged: `/orders/create?resolve=<orderNumber>`. Header unchanged (`Order Validation Error Resolution`, `Order Number <n>`, `← Back to overview page` → `/orders`, discards unsaved work).

Under the header, **ResolveTimeline** — three `StepIndicator`s laid horizontally on a track, label + detail text under each:

```
 ●━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━○
 Message errors            Data errors             Order ready
 8 errors · in progress    locked                  —
```

- Dot status: `error` (red — current step with open errors) · `on` (green check — passed) · `off` (gray — pending/locked).
- Track: segment behind a passed step fills with the existing success color token, the segment leading into the current erroring step with the existing error color token, pending segments stay `--border-subtle`. No new tokens; exact bindings settled at `/normalize`.
- Detail line per step: Step 1 `N errors · in progress` / `passed · N fixed` / `no errors`; Step 2 `locked` / `N errors · in progress` / `passed`; Step 3 `—` / `ready for planning`.

Below the timeline, the body depends on the step: **Step 1 renders its own panel** (see *Step 1 panel* — not the create-form sections, per Ramesh #4); **Step 2 renders the existing resolve form** unchanged apart from the "Set in step 1" helper; **Step 3 renders `ConfirmationView`**. The resolve `Alert` sits above the body on Steps 1 and 2, scoped to the current step's errors.

## Navigation rules

| Situation | Behaviour |
|---|---|
| Order has Level 1 errors | Opens at Step 1. Dot 2 locked (`aria-disabled`, default cursor, no handler). |
| Order has no Level 1 errors | Opens at Step 2. Dot 1 `on` with detail `no errors`; clicking it shows the Step 1 panel **read-only** with an empty state ("No message errors were found"). |
| Step 1 validated (every conflict picked, every structural fault fixed, no unresolvable message-control error) | `Validate and continue` **saves the Step 1 fixes immediately** (Ramesh #2: mock overlay / local API write of the picked values + `interfaceErrorCount: 0`), then Step 2 renders on the same page: picks appear in their header fields locked in the green **Validated** state (FormField has no helper-line prop and is a normalized component — adding one is a Figma-first change, deferred); Level 2 seeding excludes the picked paths so a pick is never re-broken. Dot 1 → `on`. A later `Back to overview` keeps the Step 1 fixes and re-entry opens at Step 2. |
| From Step 2, click dot 1 | Step 1 read-only view. Not re-editable (re-breaking the message would void Step 2's error set). Dot 2 click returns. |
| Step 2 Save with all resolved | Step 3: `ConfirmationView` (order-summary layout) with all three dots `on`; dots 1 and 2 remain clickable read-only. Footer `Back to overview`. |
| Purge (Step 2 only — Ramesh #6) | `ModalMedium` confirm (existing copy) → status `Purge` → `/orders`. Step 1 has no Purge. |
| Cancel / Back link | `/orders`. Step 2 edits are discarded (LINX-11137 §C); Step 1 fixes already saved at Validate survive. |

Alert scoping: the top `Alert`'s `errors` list, count and docked nav cover **only the current step's** errors. The docked bar re-arms per step (nav session state resets on step change, as it does today on `?resolve=` change).

Footers: Step 1 `Cancel · Validate and continue` (primary enabled once every conflict has a pick, every structural fault is fixed and `deleteFlag` is set; stays disabled while an unresolvable message-control error exists). Step 2 `Cancel · Purge · Save` (as today, Save gated on all Level 2 resolved). Step 3 `Back to overview` only.

## Step 1 panel

Its own layout — accordions grouped by error class, in this order, then a read-only **Received order data** accordion. Same `Accordion` shell as the rest of the app (one accordion per class, `status='error'` + count while open errors remain, `'on'` when the class is clean), so it reads as a sibling of the Step 2 sections without being the create form.

The LINX-16049 AC keeps "show all fields & highlight fields currently in error; present all errors together at the top; selecting an error navigates to the affected field" even after Ramesh #4. It is met as: the resolve `Alert` at the top lists every Step 1 error and `onErrorNav` scrolls to + focuses that error's row; the three class accordions ARE the highlighted error fields; and **Received order data** (collapsed by default) shows every header field as read-only text plus the full line grid as received, so nothing the customer sent is hidden.

| Class | Rules (Appendix A numbering) | Renders as |
|---|---|---|
| **Cross-line conflicts** | 3 planning dates, 5 shipper/consignee address, 6 freight term, 7 planning date type, 12 earliest window, 13 latest window | One `ConflictRow` per **field** (Ramesh #5 — address rule 5 expands into one row per address field that actually differs: e.g. City, Postal Code). Row = field label + rule message + `ConflictPicker`. |
| **Structural** | 1 one schedule per line, 2 line-vs-schedule quantity, 4 time zone missing with a date | `StructuralGrid` — a compact `DataTable` of **only the offending lines** (line #, product, schedule #, the faulty columns). Faulty cells are editable inputs; an extra schedule row carries the plain trash icon (order-creation row convention). Planner fixes in place (Ramesh #6). |
| **Message control** | 8 relySourceId, 9 sourceSystem, 10 deleteFlag, 11 modifyTimestamp | `MessageControlBlock`. `deleteFlag` → a Yes/No `Radio` pair (Ramesh #1). The other three render read-only: `fieldTree` in mono + backend message in `--text-error` + the line *"Message rejected by the integration — contact support."* They cannot be fixed or purged here (open question 1); `Validate and continue` stays disabled while one exists. |

### ConflictPicker

- Row of `ButtonToggle` chips, one per **distinct** value across lines, label `<display value> · lines 1, 2` (1-based, ascending), plus an `Enter another value` chip that reveals a plain `FormField` input beneath the row. Single-select.
- Picking records the value in `picks[path]`, marks the conflict resolved (Alert entry flips, row shows the green validated state), and updates the accordion count.
- Props `{ options: [{ value, label, lines: number[] }], value, onPick(value), onOther(), otherOpen, disabled }`. `disabled` = read-only look-back: picked chip selected, others inert.
- Field by field: the address rule contributes independent rows (City, Postal Code, …); the user may take City from line 1 and Postal from line 3 (Ramesh #5).

### StructuralGrid

Opt-in columns per fault kind: rule 1 → schedule rows under the line with a trash icon on every schedule beyond the first (resolved when one remains); rule 2 → the line's `packageCount / grossWeight / volume` cells editable next to the schedule's read-only values (resolved when equal); rule 4 → a `Dropdown` of time zones on the schedule row (resolved when set). Uses `DataTable` with `meta.forwardClick` off; no sorting/resizing.

### Interface error module — `deriveInterfaceErrors(orderNumber, interfaceErrorCount, values)`

Sibling of `deriveValidationErrors` (same seeded PRNG recipe, same file conventions), `apps/odyssey-one/src/components/orders/resolve/interfaceErrors.js`.

- `INTERFACE_POOL` — the 13 rules as data: `{ rule, class, path (RHF header path or grid line path), fieldTree (LINX-16281 form, e.g. orderLines[].freightTermCode), field (label), message (Appendix A text) }`. Cross-line entries carry a `conflictValues(values)` generator producing 2–3 distinct plausible values and a line assignment.
- Returns `{ errors, conflicts: Map<fieldPath, {value,lines}[]>, structural: [{ line, schedule?, kind, current }], messageControl: [{ fieldTree, field, message, editable: boolean }], applyErrors(values), isResolved(error, state) }`. Address conflicts are emitted **per field** — one entry per address field whose values differ across lines.
- `applyErrors` returns a hydrated draft that agrees with the errors: per-line values diverge for every conflict field; the header field for a conflict is blanked (no winner yet); structural lines get the extra schedule / mismatched quantity / blank tz. `applyPicks(draft, picks, structuralFixes)` produces the Step 2 draft (header fields set, lines aligned).
- Deterministic per `orderNumber` + `interfaceErrorCount`; count 0 → empty result (the "opens at Step 2" case). Message-control errors appear only when `interfaceErrorClass` says so: `deleteFlag` (editable) on most of those rows, an unresolvable one (`sourceSystem` / `modifyTimestamp` / `relySourceId`) on a handful — enough for the state to exist in the demo, not to dominate it.
- Errors expose `fieldTree` so the payload shape matches LINX-16281 and a real endpoint replaces the module without touching consumers.

## Statuses and data

### Vocabulary

`draftOrderStatus` is the **OIF status** (LINX-16391 `status_type = 'OIF'`), values **`Error` · `Complete` · `Purge`**. `Ready` is removed everywhere it exists: generator, `orders.json`, `DRAFT_ORDER_STATUS_VALUES` (progression/registry), `orderRowVm.ts` / `orderList.ts` comments and types, `ordersColumns.jsx` + `OrdersTable.jsx` Resolve gate (now `=== 'Error'`), filter panel options, and every test asserting `'Ready'`.

Writes (`orderService.ts`, mock overlay + live PATCH + `api/_lib/orders.mjs` + `tools/local-api.mjs`):
- Validate and continue (Step 1) → picked values + structural fixes written to the order (mock overlay / local API `PATCH`), `interfaceErrorCount: 0`; `draftOrderStatus` stays `Error`. Re-entry opens at Step 2.
- Save (Step 2, all resolved) → `draftOrderStatus: 'Complete'`, lifecycle `status: 'Ready for Planning'`, `errorCount` cleared. Row leaves the Validation Errors population (Ramesh #3).
- Purge → `draftOrderStatus: 'Purge'`, row leaves the Validation Errors population.

### Seed (`tools/generate.mjs`, `orders.json`, Neon schema deferred)

New per-VE-row fields, all seeded so every UI branch is reachable ([[feedback_discriminator_must_be_seeded]]):
- `interfaceErrorCount` — 0 for ~60 % of VE rows (opens at Step 2), else 1–5 weighted low.
- `interfaceErrorClass` — `'conflict' | 'structural' | 'mixed' | 'delete-flag' | 'unresolvable'`; the last two on ~10 % / ~3 % of rows with `interfaceErrorCount > 0`.
- `draftOrderStatus` — `Error` for all seeded VE rows (Complete/Purge only ever written by the UI overlay).

The Validation Errors grid gains an **Interface errors** count column beside `errorCount` (LINX-16028 added the flag + filter server-side; the UI shows the count). Resolve is enabled on `draftOrderStatus === 'Error'`.

The `resolveMeta` history state carries `interfaceErrorCount` + `interfaceErrorClass` alongside `errorCount`; a refreshed `?resolve=` URL falls back to the list-row fetch as today.

## Components

| Unit | Where | Notes |
|---|---|---|
| `ResolveTimeline` | `packages/ui/src/ResolveTimeline.jsx` | NEW molecule, NORMALIZING. Composes `StepIndicator` horizontally. Props `steps: [{ key, label, detail, status: 'off'\|'on'\|'error', onClick? }]`, `current`. Clickability = `onClick` presence. DSM demo (Schematic + one Playground). Figma master + Code Connect owed at batch close. |
| `Step1Panel` | `apps/…/orders/resolve/Step1Panel.jsx` | App-local. Three accordions (conflicts / structural / message control) + empty state. Read-only mode for look-back. |
| `ConflictPicker` | `apps/…/orders/resolve/ConflictPicker.jsx` | App-local until the pattern recurs. Uses `ButtonToggle` + `FormField`. |
| `StructuralGrid` | `apps/…/orders/resolve/StructuralGrid.jsx` | App-local. `DataTable` of offending lines with editable faulty cells. |
| `MessageControlBlock` | `apps/…/orders/resolve/MessageControlBlock.jsx` | App-local. `Radio` Yes/No for `deleteFlag`; read-only rows otherwise. |
| `interfaceErrors.js` | `apps/…/orders/resolve/` | Derive + seed, rule table as data. |
| `ResolveModeContext` | existing | Value grows `pickedPaths`; `resolveFieldProps` returns `{ validated: true, disabled: true }` for a picked path. |
| `ResolveShell.jsx` | `apps/…/orders/resolve/` | NEW. Owns the step machine `1 \| 2 \| 3` + `viewingStep`, the timeline, per-step Alert, footer switch, Step 1 save, Step 3 render. Renders `CreateOrderForm` (existing resolve mode) as the Step 2 body. `CreateOrderRoute` mounts `ResolveShell` when `?resolve=` is present. |
| Generator, `orders.json`, `local-api.mjs`, `api/_lib/orders.mjs`, `orderService.ts` | existing | Fields + status writes. |
| Orders grid | `ordersColumns.jsx`, `OrdersTable.jsx` | Resolve gate → `Error`; Interface errors column. |

## Testing

- `interfaceErrors.test.js` — determinism; count fidelity; class mix per `interfaceErrorClass`; `applyErrors` produces lines that actually disagree for every conflict path and a blanked header; count 0 → empty.
- `ConflictPicker.test.jsx` — one chip per distinct value with correct line list; pick → `onPick` + selected; `Enter another value` reveals input; disabled renders inert.
- `StructuralGrid.test.jsx` — only offending lines listed; trash removes the extra schedule and resolves rule 1; equalising counts resolves rule 2; picking a zone resolves rule 4.
- `MessageControlBlock.test.jsx` — Yes/No sets `deleteFlag`; unresolvable rows render read-only and keep Validate disabled.
- `ResolveTimeline.test.jsx` — statuses map to `StepIndicator`; locked dot has no handler + `aria-disabled`; clickable dot fires.
- `resolve.test.jsx` (extend) — entry cases (Level 1 errors → Step 1; none → Step 2 with dot 1 `on` and Step 1 empty state on click; unresolvable message-control → Validate disabled); Step 1 pick → Alert count decrements; Validate → order written with picks + `interfaceErrorCount 0`, Step 2 shows "Set in step 1" helper and Level 2 errors; Back to overview then re-enter → opens at Step 2; dot 1 from Step 2 → read-only; Save → Step 3 preview + list row `Complete` and gone from VE tab; Purge only on Step 2 → `Purge`.
- Grid/filter tests updated for `Error` gate + vocabulary; whole app + API + seed suites stay green.

## Story conformance

| Story / AC bullet | How this design meets it |
|---|---|
| LINX-16049 §A navigation: overview → Validation Errors tab → search/filter → *Resolve* in Actions | Unchanged path; Resolve gate becomes `draftOrderStatus === 'Error'` (LINX-11659 gating + LINX-16391 vocabulary). |
| LINX-16049 §B "the UI will have 2 tabs" | **No tabs.** The story's two surfaces are delivered as two **steps on one timeline** (user ruling: tabs show sibling information; this is a progression the user must complete in order). The split the story asks for is kept; the widget is a stepper, not a tab bar. Inform Ramesh at the regroom. |
| LINX-16049 §B.I 13 pre-validation checks, stored in `order_interface_staging` as Error | All 13 rules encoded in `INTERFACE_POOL` with Appendix A messages and LINX-16281 `fieldTree`s. |
| LINX-16049 §B.I "show all fields & highlight fields in error; all errors at the top; selecting navigates to the field" | Alert list + `onErrorNav` → row; error accordions; read-only *Received order data* for all fields. |
| LINX-16049 §II status transition: Error while fixing; fixed → stage 2, still Error; no step 1 errors → straight to stage 2, step 1 read-only | Navigation rules table rows 1–3; `draftOrderStatus` stays `Error` until Step 2 Save. |
| LINX-11137 §B template, heading, sub-heading, as-is data, only error fields editable in red with prompt, vertical scroll, itemized list, click-to-navigate, resolution tracking | Existing Step 2 screen (ORD-10), unchanged. |
| LINX-11137 §B validate immediately on update, remove highlighting | Existing live zod + `validated` state. |
| LINX-11137 §B technical errors trigger a retry mechanism | **Out of scope** (no real submission). |
| LINX-11137 §C *Back to overview page* → All tab, without saving Step 2 fixes | `/orders` opens on the Created (All) tab; Step 2 discarded; Step 1 kept (Ramesh #2). |
| LINX-11137 §D statuses Error / Complete / Purge; Complete only when both surfaces clean; Purge removes from queue | Status writes section; Save gated on Step 2 all-resolved after Step 1 validated; Complete leaves the tab (Ramesh #3). |
| LINX-11137 §E real-time + sequential (fix Step 1 → Step 2 validation immediately; never both at once) | Validate and continue saves and derives Level 2 in the same interaction; seeded orders never carry both classes unresolved. |
| LINX-16028 interface-error flag + count filter on the error list | *Interface errors* column on the VE grid; `interfaceErrorCount` seeded. |
| LINX-16281 error payload `{ fieldTree, field, message }` | Module output shape; real endpoint is a swap. |

## Out of scope

- Real endpoints (`fieldTree` shape honoured so the seam is a swap; re-validate/re-send contract Q3 still unnamed).
- Technical-error retry (AC bullet; no submission exists).
- Roles/permissions for re-submitting a failed integrated order.
- Angular twin of `ResolveTimeline` — at batch close.
- Neon reseed and prod deploy — separate explicit go each.
- "Open line grid" as a separate surface (the design review's deferral) — structural errors are edited in place in Product Information.

## Open questions (carried to `open-questions.md`)

1. **For Venkat** — a message whose `sourceSystem` / `modifyTimestamp` / `relySourceId` fails validation: does it reach the queue at all, and if so what is the planner's exit? Ramesh had no answer (technical). This build shows them read-only with no exit and seeds them rarely.
2. **For Venkat** — the Step 1 save contract (Ramesh #2 "right away"): which endpoint receives the picked values, and does it return the Level 2 error set in the same call (LINX-11137 §E "immediately performs Order Data Error validation")? This build writes via the existing order update path and derives Level 2 client-side.
3. **Structural fixes in the grid** (Ramesh #6) — confirm at the regroom that editing package count / weights on a line is acceptable for an integrated order (it changes customer data, unlike picking between values the customer sent).

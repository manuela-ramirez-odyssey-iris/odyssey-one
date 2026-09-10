# OIF Two-Step Error Resolution — Design

**Date:** 2026-09-09 (S145)
**Sources:** LINX-16049 (Step 1 — Order Interface Errors, structural / pre-validation; assigned to Manuela, status *Initial UX/UI Design*) · LINX-11137 (Step 2 — Order Data Errors, master data; re-scoped 2026-09-03 to "the 2nd tab", already shipped as ORD-10) · LINX-16391 (OIF statuses `OIF_ERR` Error / `OIF_COMP` Complete / `OIF_PRG` Purge) · LINX-16281 (error payload `{ fieldTree, field, message }`) · `Order_Processing_and_Validation_Flow.docx` + `Level1_Error_Resolution_Design_Review.docx` (Ramesh/Dave, attached 2026-08-27 / 09-03; archived to `vault-sources/10-domains/orders/oif/`) · Saikat's 13-rule enumeration (LINX-16049 comment, 2026-09-03) · user rulings 2026-09-09.
**User rulings this session:** steps, not tabs ("tabs mean options, not steps") — a 3-dot clickable timeline at the top, third dot = success preview; Step 1 renders inside the same order form (approach A); navigable both ways, editable only forward; reuse our components, refine later; mock/generator/local API only — no Neon reseed, no prod deploy without a separate go.

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

Below the timeline: the Step 1 **Message control block** (only when message-control errors exist), the existing resolve `Alert` (scoped to the current step), then the create-form sections, then the footer.

## Navigation rules

| Situation | Behaviour |
|---|---|
| Order has Level 1 errors | Opens at Step 1. Dot 2 locked (`aria-disabled`, default cursor, no handler). |
| Order has no Level 1 errors | Opens at Step 2. Dot 1 `on` with detail `no errors`; clicking it shows Step 1 **read-only** (all fields disabled, no picker). |
| Step 1 validated (all conflicts picked, no message-control errors) | `Validate and continue` → Step 2 renders on the same page: picks land in their header fields as normal inputs with helper line *"Set in step 1 — was in conflict"*; Level 2 errors derived and shown. Dot 1 → `on`. |
| From Step 2, click dot 1 | Step 1 read-only view. Not re-editable (re-breaking the message would void Step 2's error set). Dot 2 click returns. |
| Step 2 Save with all resolved | Step 3: `ConfirmationView` (order-summary layout) with all three dots `on`; dots 1 and 2 remain clickable read-only. Footer `Back to overview`. |
| Purge (any step) | `ModalMedium` confirm (existing copy) → status `Purge` → `/orders`. |
| Cancel / Back link | `/orders`, nothing saved. |

Alert scoping: the top `Alert`'s `errors` list, count and docked nav cover **only the current step's** errors. The docked bar re-arms per step (nav session state resets on step change, as it does today on `?resolve=` change).

Footers: Step 1 `Cancel · Purge · Validate and continue` (primary disabled until every conflict has a pick and every structural error is fixed; permanently disabled while any message-control error exists). Step 2 `Cancel · Purge · Save` (as today, Save gated on all Level 2 resolved). Step 3 `Back to overview` only.

## Step 1 mechanics

### Error classes (the 13 rules → our sections)

| Class | Rules (Appendix A numbering) | Renders as |
|---|---|---|
| **Cross-line conflict** | 3 planning dates, 5 shipper/consignee address, 6 freight term, 7 planning date type, 12 earliest window, 13 latest window | `ConflictPicker` in place of the header field's input + red cell highlight on disagreeing lines in the Product Information grid |
| **Structural** | 1 one schedule per line, 2 line-vs-schedule quantity, 4 time zone missing with a date | Product Information grid: the offending line's cells editable (remove the extra schedule / correct the quantity / pick a time zone); everything else locked |
| **Message control** | 8 relySourceId, 9 sourceSystem, 10 deleteFlag, 11 modifyTimestamp | Read-only **Message control block** above the sections: `fieldTree` in mono + the backend message in `--text-error`. Not resolvable in the UI — a user must never set a delete flag (a blank one defaults the message to *create*, so a customer cancellation could become a new order). Exit = Purge. |

### ConflictPicker

A field-mode component rendered by the section call sites when `resolveCtx.conflicts.has(path)` and the step is 1 and editable:

- Row of `ButtonToggle` chips, one per **distinct** value across lines, label `<display value> · lines 1, 2` (line numbers 1-based, ascending). Plus an `Enter another value` chip that reveals the field's normal input beneath the row.
- Single-select. Picking writes the value to the RHF path (so zod validates it), records it in `picks`, marks the conflict resolved (Alert entry flips, field shows `validated`), and clears the grid's red highlights for that path.
- Prop shape: `{ options: [{ value, label, lines: number[] }], value, onPick(value), onOther(), otherOpen, disabled }`. `disabled` renders the picked chip selected and the rest inert (read-only mode).
- Label/reason under the picker before a pick: the rule's own message (e.g. *"Freight Term Codes must be the same across all order lines"*).
- Multi-field conflicts (rule 5, shipper/consignee address; rule 3, date + time zone) pick a **whole block**: one chip per distinct block, labelled by its first line + city (or date + zone); the pick writes every field of the block. `Enter another value` reveals the whole block's inputs.

### Interface error module — `deriveInterfaceErrors(orderNumber, interfaceErrorCount, values)`

Sibling of `deriveValidationErrors` (same seeded PRNG recipe, same file conventions), `apps/odyssey-one/src/components/orders/resolve/interfaceErrors.js`.

- `INTERFACE_POOL` — the 13 rules as data: `{ rule, class, path (RHF header path or grid line path), fieldTree (LINX-16281 form, e.g. orderLines[].freightTermCode), field (label), message (Appendix A text) }`. Cross-line entries carry a `conflictValues(values)` generator producing 2–3 distinct plausible values and a line assignment.
- Returns `{ errors, conflicts: Map<path, {value,lines}[]>, structural: [{ line, path, kind }], messageControl: [{ fieldTree, message }], applyErrors(values), isResolved(error, current, picks) }`.
- `applyErrors` mutates the hydrated draft so data agrees with the errors: product lines get the divergent per-line values; the header field for a conflict is blanked (no winner yet); structural rows get the extra schedule / mismatched quantity / blank tz.
- Deterministic per `orderNumber` + `interfaceErrorCount`; count 0 → empty result (the "opens at Step 2" case). Message-control errors are included only when the seeded `interfaceErrorClass` says so (see Data).
- Errors expose `fieldTree` so the payload shape matches LINX-16281 and a real endpoint replaces the module without touching consumers.

### Product Information grid

`ProductGrid` gains two opt-in props used only in resolve mode: `lineHighlights: Map<lineIndex, Set<columnKey>>` (red cell background + `aria-invalid`) and `editableCells: Map<lineIndex, Set<columnKey>>` (re-enables exactly those cells while the rest stay disabled). Structural "remove extra schedule" is a per-line trash affordance on the extra schedule row only (existing plain trash-icon convention).

## Statuses and data

### Vocabulary

`draftOrderStatus` is the **OIF status** (LINX-16391 `status_type = 'OIF'`), values **`Error` · `Complete` · `Purge`**. `Ready` is removed everywhere it exists: generator, `orders.json`, `DRAFT_ORDER_STATUS_VALUES` (progression/registry), `orderRowVm.ts` / `orderList.ts` comments and types, `ordersColumns.jsx` + `OrdersTable.jsx` Resolve gate (now `=== 'Error'`), filter panel options, and every test asserting `'Ready'`.

Writes (`orderService.ts`, mock overlay + live PATCH + `api/_lib/orders.mjs` + `tools/local-api.mjs`):
- Save (Step 2, all resolved) → `draftOrderStatus: 'Complete'`, lifecycle `status: 'Ready for Planning'`, `errorCount`/`interfaceErrorCount` cleared. Row leaves the Validation Errors population.
- Purge → `draftOrderStatus: 'Purge'`, row leaves the Validation Errors population.

### Seed (`tools/generate.mjs`, `orders.json`, Neon schema deferred)

New per-VE-row fields, all seeded so every UI branch is reachable ([[feedback_discriminator_must_be_seeded]]):
- `interfaceErrorCount` — 0 for ~60 % of VE rows (opens at Step 2), else 1–5 weighted low.
- `interfaceErrorClass` — `'conflict' | 'structural' | 'mixed' | 'message-control'`; message-control on ~10 % of rows with `interfaceErrorCount > 0`.
- `draftOrderStatus` — `Error` for all seeded VE rows (Complete/Purge only ever written by the UI overlay).

The Validation Errors grid gains an **Interface errors** count column beside `errorCount` (LINX-16028 added the flag + filter server-side; the UI shows the count). Resolve is enabled on `draftOrderStatus === 'Error'`.

The `resolveMeta` history state carries `interfaceErrorCount` + `interfaceErrorClass` alongside `errorCount`; a refreshed `?resolve=` URL falls back to the list-row fetch as today.

## Components

| Unit | Where | Notes |
|---|---|---|
| `ResolveTimeline` | `packages/ui/src/ResolveTimeline.jsx` | NEW molecule, NORMALIZING. Composes `StepIndicator` horizontally. Props `steps: [{ key, label, detail, status: 'off'\|'on'\|'error', onClick? }]`, `current`. Clickability = `onClick` presence. DSM demo (Schematic + one Playground). Figma master + Code Connect owed at batch close. |
| `ConflictPicker` | `apps/…/orders/resolve/ConflictPicker.jsx` | App-local until the pattern recurs. Uses `ButtonToggle`. |
| `MessageControlBlock` | `apps/…/orders/resolve/MessageControlBlock.jsx` | App-local. |
| `interfaceErrors.js` | `apps/…/orders/resolve/` | Derive + seed, rule table as data. |
| `ResolveModeContext` | existing | Value grows: `{ step, editable, errorByPath, resolvedSet, conflicts, picks, onPick }`. `resolveFieldProps` unchanged for Level 2 paths; a new `conflictFieldProps(ctx, path)` returns picker props or `{}`. |
| `CreateOrderForm.jsx` | existing | Step machine `1 \| 2 \| 3` + `viewingStep` (read-only look-back). Per-step alert scoping, footer variants, Step 3 render. If the file passes ~900 lines the resolve chrome (timeline, message-control block, alert, footer switch) moves to `ResolveShell.jsx`. |
| `ProductGrid` | existing | `lineHighlights` / `editableCells` opt-ins. |
| Generator, `orders.json`, `local-api.mjs`, `api/_lib/orders.mjs`, `orderService.ts` | existing | Fields + status writes. |
| Orders grid | `ordersColumns.jsx`, `OrdersTable.jsx` | Resolve gate → `Error`; Interface errors column. |

## Testing

- `interfaceErrors.test.js` — determinism; count fidelity; class mix per `interfaceErrorClass`; `applyErrors` produces lines that actually disagree for every conflict path and a blanked header; count 0 → empty.
- `ConflictPicker.test.jsx` — one chip per distinct value with correct line list; pick → `onPick` + selected; `Enter another value` reveals input; disabled renders inert.
- `ResolveTimeline.test.jsx` — statuses map to `StepIndicator`; locked dot has no handler + `aria-disabled`; clickable dot fires.
- `resolve.test.jsx` (extend) — three entry cases (Level 1 errors → Step 1; none → Step 2 with dot 1 `on`; message-control → `Validate and continue` disabled, block rendered); Step 1 pick → Alert count decrements + grid highlight clears; Validate → Step 2 with "Set in step 1" helper and Level 2 errors present; dot 1 from Step 2 → read-only; Save → Step 3 preview + list row `Complete` and gone from VE tab; Purge → `Purge`.
- Grid/filter tests updated for `Error` gate + vocabulary; whole app + API + seed suites stay green.

## Out of scope

- Real endpoints (`fieldTree` shape honoured so the seam is a swap; re-validate/re-send contract Q3 still unnamed).
- Technical-error retry (AC bullet; no submission exists).
- Roles/permissions for re-submitting a failed integrated order.
- Angular twin of `ResolveTimeline` — at batch close.
- Neon reseed and prod deploy — separate explicit go each.
- "Open line grid" as a separate surface (the design review's deferral) — structural errors are edited in place in Product Information.

## Open questions for the regroom (carried to `open-questions.md`)

1. Which of the 13 rules are user-editable — confirm message-control (8–11) are Purge-only.
2. Dave's two rulings (2026-07-29 "not the same UI" vs 2026-08-24 "re-use the existing UI") — this design follows the later one; confirm.
3. Do Step 1 picks persist server-side before Step 2 Save (design review: "a new version is written to `order_interface_staging`; the original is always retained")? This build keeps everything client-side until Save.
4. Is "Complete" visible in the VE tab at all, or does the row leave on Save (this build: leaves)?

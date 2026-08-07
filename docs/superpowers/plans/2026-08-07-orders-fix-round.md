# Orders Fix Round — Execution & Audit Plan

**Date:** 2026-08-07 · **Session:** 113 · **Baseline:** 1001 tests / 79 files, all green
**Mode:** `VITE_API_MODE=live` — every fix must be verified against Neon, not the mock adapter.

---

## Scope

Five user-reported items, plus two bugs found during investigation:

| # | Item | Source | Status going in |
|---|---|---|---|
| A | Product section columns + order mismatch (View vs Create) | S112 carry-forward | Root cause confirmed |
| B | Appointment checkbox doesn't survive edit (both directions) | User, deployed app | **Hypothesis only — needs repro** |
| C | Created order not visible in All tab | User, deployed app | Root cause confirmed |
| D | Save for Later must persist as a Draft | User | Half-built; upsert missing |
| E | Breadcrumb: `View order VAL-98937` / `Edit order VAL-98937` | User | Not built |
| F | Appointment renders blank in Shipment Details → Orders tab | Found in investigation | Root cause confirmed |
| G | `useCreateOrder` never invalidates `order-tab-counts` | Found in investigation | Root cause confirmed |

### User decisions taken (2026-08-07)

1. **A — View mirrors Create.** View Order shows the same equipment-driven column set and order as Create. The shared card also changes on the create-confirmation page and the Shipments Orders tab; this was accepted explicitly.
2. **C — All tab defaults to newest first** (`created_at DESC`). Order Number stays sortable.
3. **D — Save for Later allows a blank Order Number.** Server assigns it; the form adopts the returned number so later saves update in place.

### The through-line

Items A, B, D, F are all the same bug class: **a write that never reached the DB, or a read that never reached the cell.** This repo has a documented history of it — `mapShipmentErrorRow` silently dropped columns for months (S110), and the S110 carry-forwards named three more mappers of the same shape that were never audited. Phase 1 audits them all **once** instead of patching symptoms one at a time.

---

## Phase 0 — Prove the appointment bug (BLOCKING for Task 2 only)

**Nobody edits appointment code until this phase produces a reproduction.**

We have a hypothesis, not a root cause. The evidence is genuinely contradictory and that must be respected:

- Every hop was **executed**, not merely read: form schema → `mapFormToOrderInterface` → JSONB round-trip → `mapOrderViewToFormVm` → `reset()`. All correct, including the uncheck direction.
- The S110 dirtyFields fix was re-run under a jsdom harness — 6/6 assertions pass.
- Production is confirmed running the fixed code (deployed commit `fbdbaad` is a descendant of `2e0aef7`).
- Yet Neon shows **4 orders total** that ever carried `PICKUP_APPOINTMENT`/`DELIVERY_APPOINTMENT`, none with `Y` — including two edited 2026-08-07 whose timestamps were valid, so the checkbox would have been enabled.

> **Correction to the investigation's framing:** it reported "6,919 orders, 100% failure, all-time." That overstates it. 6,915 of those never went through the app's mapper at all (they are seeded rows), so the real sample is **4 app-written orders**, of which 2 are the user's edits today. The signal is real but small — which is exactly why it needs a live repro rather than a confident fix.

**Task 0.1 — Browser reproduction.** Against the deployed app in `live` mode:
1. Open an existing order for edit that has pickup + delivery date AND time populated.
2. **Wait for hydration to visibly complete** before touching anything. Check the appointment box. Save. Reopen. Record the result.
3. Repeat, but click the checkbox **immediately on load**, before fields populate. Record the result.
4. Repeat the uncheck direction for whichever path persisted.
5. After each save, query Neon directly for that order's `manual_order -> 'userFieldList'` and record the stored value.

**Deliverable:** a decision between two outcomes.
- *If step 2 persists and step 3 does not* → the loading-gate hypothesis is confirmed. Task 2 fixes it.
- *If step 2 also fails* → the hypothesis is **wrong**, the loss is elsewhere, and Task 2 is re-scoped before any code is written.

**Do not skip to the fix because the loading gate is worth adding anyway.** It is — but adding it and declaring the bug fixed without a repro is how a symptom gets patched while the cause survives.

---

## Phase 1 — Whitelist mapper audit (BLOCKING for Task 1)

**Task 1.1 — Audit every whitelist mapper.** For each, produce: fields consumed upstream, fields emitted, fields **silently dropped**, and whether any consumer needs a dropped field today.

| Mapper | Status |
|---|---|
| `mapFormVmToOrderPane.js:116-128` | **Confirmed dropping** — Handling Unit, Handling Count, L/W/H, Harmonized Code, Declared Value + Currency, Mfg Country, STCC. Also hardcodes `shippingClass: ''`. |
| `mapSellShipmentOutToDetail.ts:102,105` | **Confirmed wrong type** — emits raw booleans where the renderer expects strings. |
| `mapOrderListRow` | S110 carry-forward, never audited |
| `mapOrderViewToFormVm` | Verified non-lossy for products; audit the rest of its surface |
| `mapShipmentErrorRow` | Fixed in S110 — confirm no regression |

**Task 1.2 — Seeded-data check (determines whether we reseed).** Once View Order shows equipment-driven columns, do **seeded** orders carry `handlingUnit` / dims / `harmonizedCode` / `stccCode` in their `manual_order` JSONB? Query Neon and report coverage.
- If seeded rows lack these fields, View Order on any seeded order shows blank cells — cosmetically indistinguishable from the bug we're fixing.
- **Reseed is authorized by the user for this session.** Recommend it only if coverage is genuinely poor; report the numbers first either way.

---

## Phase 2 — Fixes

Tasks 3, 4, 5 are independent and parallelizable. Tasks 1 and 2 both touch `OrderPaneSections.jsx` and **must not run concurrently** on it.

Every task is TDD: **a failing test first**, then the fix. Every test must be mutation-checked — delete the fix, confirm the test goes red, restore. This repo has shipped tests that could not fail (S111: three of six tests asserted only button-absence in a state where the button never existed).

### Task 1 — Product section mirrors Create *(depends on Phase 1)*

- Make `ProductInfoCard` equipment-case aware, reusing `columnsForEquipment` from `productColumns.js` — **do not duplicate the case matrix**, it is canon (ORD-08 / LINX-13893).
- Column order follows `productColumns.js` BASE: `Line # → Hazardous → Product ID → Description → Gross Weight → Volume → Product Class → …`. This matches LINX-8121's authoritative BE field order (`product-data-formats-2026-07-28.md:154`). The current View order (Hazardous between Volume and Product Class, inserted by R2-7) **matches no canon**.
- Remove the whitelist in `mapFormVmToOrderPane.js:116-128` so the extra fields reach the table. Fix the hardcoded `shippingClass: ''`.
- Verify all three consuming surfaces still render: View Order, create-confirmation, Shipments Orders tab.

### Task 2 — Appointment *(depends on Phase 0; scope set by its outcome)*

- **2a (conditional on Phase 0):** add a hydration loading gate to `CreateOrderForm.jsx:100-118`. The form must not present interactive-looking controls while `reset()` is still pending.
- **2b (unconditional — independent bug):** fix `mapSellShipmentOutToDetail.ts:102,105` to emit `'Yes'`/`'No'`, matching `mapFormVmToOrderPane.js:90-91`. Two mappers feeding one component incompatible shapes for the same field is the actual defect.
- Test the **uncheck** direction explicitly. "Vice versa" is where a truthy-only guard hides.

### Task 3 — All tab visibility

- Default sort for the All tab → `created_at DESC` (`OrdersRoute.jsx:37-41`). Verify `SORT_MAP` / `buildOrderListQuery` support the field server-side (`orders.mjs:24-33,74-77`); add it if absent.
- Add `queryClient.invalidateQueries({ queryKey: ['order-tab-counts'] })` to `useCreateOrder.ts:12-15` — it currently invalidates only `order-list`, unlike every sibling mutation. This is item G.
- Test: create an order → it appears on page 1 of All, and the tab count increments.

### Task 4 — Save for Later persists as a Draft

- Drop `orderNumber` from `saveGateSchema` (`schema.ts:230-242`); keep `owningOrganization`.
- Implement upsert for live mode: `saveDraft` (`orderService.ts:339-361`) must `PUT /order-service/v3/order` when a prior `draftId`/order number exists, mirroring `saveEditInPlace`. The form must adopt the server-returned order number so the second save updates instead of 409ing.
- Replace the generic `"Couldn't save the draft."` (`CreateOrderForm.jsx:404`) with the server's actual reason — the 409 was invisible to the user.
- Tests must exercise the **live** branch. The existing coverage (`orderServiceWrite.test.ts`) is hard-pinned to `mock` via `vi.mock`, so it cannot see this bug class at all.
- Verify round trip: Save for Later → appears in Draft tab → reopens in Edit → saves again without error.

### Task 5 — Breadcrumbs

- View Order (`OrderSummaryRoute.jsx:38-41`): `Orders › View order VAL-98937`.
- Edit Order (`CreateOrderForm.jsx:505-511`, `editMode` branch): `Orders › Edit order VAL-98937`.
- Create Order stays `Create new order` (no number exists yet) — confirmed correct, leave it.
- Resolve mode keeps `Order Validation Error Resolution` — out of scope.
- Number-less / pending orders fall back to `-`, the pattern already established at `OrderSummaryRoute.jsx:32`. The order number is available synchronously from `useParams()` / the `draftKey` prop, so no loading state is needed.
- `Breadcrumb` is a stable atom (v0.4.0, not normalizing) — **no component change, no Figma work, no Angular twin.** Composition only.
- No tests exist for these breadcrumbs today. Add them.

---

## Phase 3 — QA

### 3a — Suite
Full run must be **≥ 1001** and green. Report the number, not a claim.

### 3b — Browser QA *(mandatory gate)*

The project rule is explicit and has been earned repeatedly: **green builds ≠ working component.** S110, S111 and S112 each shipped bugs the suite could not see, and jsdom is structurally incapable of seeing most of what this round touches — the appointment race is a *timing* bug, and column layout is geometry.

Verify in a real browser, in `live` mode:
1. Appointment: check → save → reopen → still checked. Uncheck → save → reopen → still unchecked. Confirm the stored value in Neon both times.
2. Create an order with a blank Order Number → success → All tab page 1 shows it, tab count incremented.
3. Save for Later with a blank Order Number → Draft tab → reopen → save again → **no error**.
4. View Order product table: correct columns, correct order, extra fields populated, across at least two different equipment cases.
5. Breadcrumbs read `View order <number>` / `Edit order <number>`.
6. Shipment Details → Orders tab: appointment renders `Yes`/`No`, never blank.

---

## Phase 4 — Traceability

Required by project convention — every decision traced to source and previous state.

- **New ORD entry** — View product table mirrors Create. Cite ORD-08, ORD-09, R2-7, LINX-8121, LINX-13893. Record that R2-7's Hazardous insertion point matched no canon, and that View-as-subset was never a decision, only an inheritance from the confirmation mock.
- **New ORD entry** — All tab default sort. Note it supersedes S101's "accepted, no change" ruling on the same lexicographic-sort class.
- **New ORD entry** — breadcrumb action + order number. No prior canon exists; `screens-reference.md:51` documents only the Create form.
- **Ledger** — mark R2-5 shipped (stale since commit `ea12d96`, 2026-08-02). Update R2-6/R2-7 with Phase 0's actual finding.
- **Appointment postmortem** — if Phase 0 refutes the loading-gate hypothesis, record what the cause actually was. S110 recorded this bug as fixed and it was not.

---

## Execution model

- **Sonnet subagents implement all code.** Opus reviews, plans, and adjudicates.
- Phase 0 and Phase 1 gate their dependents. Tasks 3, 4, 5 may start immediately.
- Tasks 1 and 2 are serialized on `OrderPaneSections.jsx`.
- **Subagents must not touch git.** A subagent ran `git stash` on a shared tree in S111. Staging is by explicit path, by the main loop only.
- No deploy without explicit per-deploy permission. Reseed is pre-authorized for this session; report before running one.

## Risks

| Risk | Mitigation |
|---|---|
| Phase 0 refutes the hypothesis and Task 2 is unscoped | Planned for — Task 2b ships regardless; 2a is explicitly conditional |
| Product columns land on seeded rows with no data | Phase 1.2 measures coverage before we ship a table full of blanks |
| Changing the shared card breaks confirmation / Shipments tab | Task 1 verifies all three surfaces; user accepted the shared blast radius |
| Default-sort change surprises users | Order Number remains sortable; recorded as a decision, not a silent change |
| Tests that cannot fail | Every test mutation-checked: delete fix → red → restore |

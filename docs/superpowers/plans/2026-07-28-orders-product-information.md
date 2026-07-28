# Plan — Create Order §Product Information rebuild (S95)

Status: PLAN — awaiting approval. Sources: Figma **5347:10752** (empty) / **6025:28087** (filled, Orders---OdysseyONE); `vault/10-domains/orders/research/jira-create-order-sections-2026-07-26.md` §3 (LINX-8121, LINX-13893 matrix, LINX-9874/9875/9877/9879, LINX-8131/8134/8135); `vault/10-domains/orders/research/lookup-vocabularies-2026-07-27.md` (equipment codes); user directives 2026-07-28 (horizontal expand, ColumnPanel reuse, mode-driven columns).

## What the mocks show (verbatim intake)

**Both**: Accordion section (StepIndicator + "Product Information"), grid of 48px form-cell rows, "+ Add Product" ButtonLink bottom-left, per-row **actions column exactly like DataTable's** (user ruling 2026-07-28): a 3-dot ActionMenu with two options — **"Add More Details" (disabled, no-op for now — future LINX-8131 Product Details)** and **"Delete" (removes the row)**; NO trash icon. **Column-arrangement icon button** pinned at the top of the actions column, actions column pinned while the grid scrolls horizontally.

**Columns (filled mock, left→right)**: Line # \* · Hazardous? (checkbox) · Product ID (combobox) · Product Description \* (combobox + char counter) · Gross Weight \* (value + UoM select) · Volume \* (value + UoM) · Product Class · ‖actions‖ · Handling Unit · Handling Count · Length · Width · Height (each dim = value + UoM). Headers carry **sort arrows** (filled mock); empty mock instead has a **sort icon-button** top-right of the toolbar.

**Toolbar**: RULED (user 2026-07-28) — the FILLED mock's layout in both states: "N products added" left, Search (320px) right, sorting via column-header arrows; no toolbar sort button. Description counter: **0/75 per user ruling 2026-07-28** (Jira's 1–150 superseded for the counter; flag to Ramesh at grooming).

## Column model — equipment-driven (LINX-13893, 4 cases)

Driven by `general.equipment`. Shared base: Line #, Hazardous?, Product ID, Product Description, Gross Weight(+UoM), Volume(+UoM).

| Case | Equipment codes | Adds |
|---|---|---|
| 1 LTL family | LTL, LTR, LTH | Product Class, Handling Unit Name & Description, Handling Unit Count, Length/Width/Height(+UoM) |
| 2 TL family | TL, TLR, TLH, TT | same as Case 1 **minus Product Class** |
| 3 Ocean | LCL, FCL | Product Class, Harmonized Code, Declared Value, Declared Value Currency, Manufacturing Country Code |
| 4 Rail | RR | Product Class, STCC Code (TMS-validated, error "Incorrect STCC Code. Please check the value & re-enter") |

No equipment picked → default to the Case-1 set (matches both mocks); revisit if Ramesh answers otherwise.

## Equipment vocabulary (answers "are we saving our changes for a later DB update?")

Yes — deliberately deferred: the researched real codes (TL/LTL/TT/RR/LCL…) never landed in `EQUIPMENT_CODES` because that pool is **shared with the shipments generator + Neon DB** — swapping it = regen + reseed + deploy in one motion, permission-gated. This plan closes the visible half **lookup-only** (the EXTRA_ORGS pattern): create-order equipment options move to the consolidated code set from `lookup-vocabularies-2026-07-27.md` ("CODE - Description" labels, org-scoped), while grid/DB rows keep the old codes until a permitted reseed. DB swap logged as a follow-up requiring explicit go.

## Tasks

1. **Column model** — `productColumns.js`: base + per-case sets keyed by equipment code family; validation rules per research §3 (either/or Product ID ⟷ Shipping Class help text, weight/volume value+UoM pair errors, TL >19,000 lb warning, HU count whole-number error, 150-char description).
2. **Equipment lookup swap (lookup-only)** — real code catalog in master-data for create-order; org-scoped subsets; General Info Equipment options + 13893 case keying; shared pool untouched.
3. **Grid rebuild** — extend `ProductGrid` to render from the column model: sticky actions column with the DataTable-style 3-dot ActionMenu ("Add More Details" disabled / "Delete"), header sort arrows (DataTable 3-icon convention), search filter, "N products added" count, description maxLength 75 with 0/75 counter; **remove the US|Metric ButtonToggle** (Jira killed it) and the toolbar sort button in favor of header sorting (filled mock).
4. **Column arrangement** — reuse the shipments `ColumnPanel` (RightPanel-based): audit its API for genericity, feed it the product column model, icon button in the pinned actions header. Hidden/reordered state is section-local (not persisted) until user says otherwise.
5. **Horizontal expand on open** — when the Product Information accordion is expanded, the section breaks out of the form column to `viewport-content − 2×24px` (CSS width/margin transition against the main scroll container; sidebar-aware — measure the container, not 100vw); collapse restores. Other sections untouched.
6. **Hazardous linkage** — row Hazardous? checkbox (auto-check on UN Number when Product Details land; manual for now) feeds the existing order-level derivation (LINX-12102, already wired in General Info).
7. **Schema/mappers** — products row shape gains the per-case fields; `mapFormToOrderInterface`/`mapOrderViewToFormVm` + fixtures; tests.

## Open questions (log to decision log at build time)

- ~~Per-row chevron dropdown~~ **ANSWERED (user 2026-07-28)**: DataTable-style ActionMenu — "Add More Details" (disabled) + "Delete".
- ~~Toolbar layout~~ **ANSWERED (user 2026-07-28)**: filled-mock layout in both states. ~~Description counter~~ **ANSWERED: 0/75**.
- ~~Shipping Class / Shipping Class ID~~ **ANSWERED (user 2026-07-28)**: the Figma decision stands — columns OMITTED. Consequence: the LINX-8121 either/or rule collapses to the Product ID & Description path only (the ≥1-product gate + description validation remain); note this deviation vs LINX-9874 for Ramesh at grooming.
- Column-arrangement persistence scope. (user)
- DB equipment-pool swap + reseed — needs explicit permission when we're ready.

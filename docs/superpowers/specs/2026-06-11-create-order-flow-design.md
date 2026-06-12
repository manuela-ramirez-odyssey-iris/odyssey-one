# Create Order Flow — Design Spec

**Date:** 2026-06-11 · **Domain:** Orders · **Build:** #3 (after Summary Page #1)
**Status:** Approved design, pending user spec review
**Sources:** `vault/10-domains/orders/screens-reference.md` (screens 1–7), `vault/10-domains/orders/section-map.md`, Efrain's description texts (`vault-sources/10-domains/orders/efrain/orders-sections-efrain-descriptions.md` — **outrank Jira story texts**, per Efrain 2026-06-11), Order Service Phase-2 LLD (`vault-sources/10-domains/orders/lld/order-service-phase-2.md`), live team session 2026-06-11 (Q15–Q17, Q20, Q21, Q26, Q27 resolved — see `vault/10-domains/orders/open-questions.md`).

## 0. Scope

The Create New Manual Order flow (screens 1–7): one progressive-disclosure form (Quick → Long), four accordion-stepper sections, save/draft semantics, confirmation page (sync + async variants). Mock-mode on the LLD-shaped contract, same seam as the Summary Page. **Out of scope:** navbar bell notification for async order numbers (cross-domain chrome), edit-existing-order, copy, templates, OIF failure review, screen-0 follow-ups.

**Component policy:** app-local build reusing `@odyssey/ui` primitives wherever they fit (user directive: "use our components as much as possible"). Normalization of new heavy pieces happens in a parallel session; this build swaps them in as they land. No `/normalize` cycles here.

## 1. Resolved questions baked into this design (live team session 2026-06-11 unless noted; Q19/Q22 resolved earlier from screens)

| Q | Resolution | Design consequence |
|---|---|---|
| Q15 | Consolidatable is **header-only**; checkbox IS the value (old TMS line-duplication is fixed; LINX-9473 describes the old structure) | Plain checkbox, checked by default, writes header field |
| Q16 | Order Number optional at entry; **Order Number + Owning Organization both required to Save / Save-for-Later** (red error otherwise); auto-generated on direct Create if blank | Save-gate validation separate from submit validation |
| Q17 | Async path is system-determined; **no polling** — final number arrives via navbar bell | Async confirmation variant is render-only; mock always returns sync |
| Q19 | Instruction Type removed from UI; backend defaults `0012` | Description-only instruction rows |
| Q20 | Freight Term dynamic default: **Outbound→Pre-Paid, Inbound→COL** (Efrain texts > LINX-6012) | Effect on Ship Direction change; never overwrites a user-touched field |
| Q21 | Guided reference rows write **dedicated header fields** (`poNumber`, `pickupNumber`); free-form rows → generic type/value list. `poDate` unaddressed (residual) | Mapper splits guided vs free-form rows |
| Q22 | Planning Date Type radio is two-way (Ship / Delivery); PRD's "Both" not rendered | Two-option radio |
| Q26 | Product grid: **all five asterisked columns required** (ID, Description, Gross Weight, Volume, Ship Class); design supersedes LINX-9874 either/or. Residuals: canonical class label (Efrain), backend validation match (Ramesh) | All-required row validation; label interim: "Ship Class" |
| Q27 | **No auto-save — manual saving only.** Save = in-place draft, UI open. Save-for-Later = via Cancel (or navbar), draft + close to grid. Discard = via Cancel, explicit confirm, nothing kept | Banner reworded; no autosave logic anywhere |

Open residuals logged in `open-questions.md`; none block this build.

## 2. Architecture

### 2.1 Route & chrome

- **Route `/orders/create`** inside the existing `AppShell` (sidebar stays).
- **Navbar contextual state** — the Home widget-edit pattern (`Navbar.jsx` `isEditMode` branch): a `CreateOrderModeContext` (mirroring `EditModeContext`) flips the navbar to `NavbarShell compact` + `GlobalSearch mode="title" title="Create New Order"` + `TrailNav mode="editor"` carrying **Save for Later** (button), **?** (help, inert), **✕** (close → same path as Cancel: opens the discard/save modal). Extend `TrailNav` editor-mode props only if the current API can't express button + help + close; prefer existing props.
- Navigation guard: leaving via ✕/Cancel routes through the modal; browser back is not intercepted (prototype scope).

### 2.2 Form architecture

- **`react-hook-form` + `zod`** (`@hookform/resolvers`). One `OrderFormValues` shape (UI-friendly), one zod schema composed of per-section sub-schemas.
- **Section completion:** each `StepIndicator` circle derives from its sub-schema's validity against watched values (debounced). Complete = green checkmark.
- **Quick → Long:** "Add More Details" toggle expands General Information in place (Additional Information, Instructions, References). Other sections structurally identical in both modes. One `isLongMode` boolean in form context; no route change.
- **Banner:** info Alert reworded to *"Required fields will complete steps."* (auto-save claim dropped per Q27).
- **Sticky footer:** Cancel (left) · Save · **Create Order** (right, primary, disabled until full-form schema passes).

### 2.3 Data layer (mirrors S52 seam)

```
src/api/
  types/createOrder.ts        — orderInterface{} request + create response envelope, LLD-verbatim names
  types/orderFormVm.ts        — OrderFormValues (UI shape)
  mappers/mapFormToOrderInterface.ts   (+test, TDD)
  services/orderService.ts    — extend: createOrder(), saveDraft(), getDraft()
  services/lookupService.ts   — new: typeahead lookups behind mock/live seam (+test, TDD)
  queries/useCreateOrder.ts   — useMutation
  queries/useSaveDraft.ts     — useMutation
  queries/useLookup.ts        — useQuery factory (debounced, min 2 chars, frequency-sorted)
```

- **Mock write layer:** module-level in-memory overlay on `orders.json` — `createOrder` generates an `S26…` order number, appends a grid row (status Ready For Plan), returns the LINX-9340 envelope; `saveDraft` upserts a **Draft-status row that appears in the Summary grid** and reopens via `/orders/create?draft=<id>`. Lost on refresh (accepted; user approved fake-backend simulation).
- **Live branch:** `POST /order-service/v3/manual-order`; lookups → `order-service/v1/*/lookup` catalog (owning-org, equipment, freight-terms, ship-direction, org-address, product, ship-class, special-services, timezone, reference-codes). Mock lookups serve from `tools/data-pools.mjs` pools.
- Typeahead contract (LINX-7553 family): 2-char minimum (excluding spaces), case-insensitive, frequency-sorted, debounced ~250ms.

### 2.4 Validation model (zod)

- **Submit schema (Create Order):** General Info — Owning Organization, Equipment, Freight Term, Ship Direction required. Pickup & Delivery — consignor + consignee each resolved (lookup pick OR complete manual address validated in combination); Planning Date Type required; **Ship selected → Late Pickup required; Delivery selected → Late Delivery required**; Early ≤ Late ordering; timezone required when not auto-derivable; contact phone E.164, email format (only when filled). Products — **≥1 row; all five fields per row** (Q26). Special Services — optional.
- **Warnings (non-blocking):** past/current dates (LINX-7632 family) render as field warnings, never errors.
- **Save-gate schema (separate):** Order Number + Owning Organization present → else red error Alert naming both fields (Q16/Q27). Applied by Save, Save-for-Later (footer modal + navbar).
- Date format MM/DD/YYYY, time HH:MM 24h, time defaults 00:00.

## 3. Sections

### 3.1 General Information
Quick fields: Order Number (free text, helper: auto-generated if blank), Owning Organization*, Equipment* (typeahead, options scoped by Owning Org), Freight Term* (dynamic default per Q20), Ship Direction* (default Outbound), Consolidatable checkbox (checked). Long expansion ("Add More Details"): **Additional Information** (Customer Required Carrier SCAC typeahead, Equipment Reference Number text), **Add Instructions** (description-only repeatable rows), **References** (two-column repeatable table: guided pre-seeded rows Pickup Number + PO Number, plus free-form Type/Value rows; per-row delete).

### 3.2 Pickup & Delivery
Mirrored Consignor | Consignee columns. Each: location typeahead (auto-populates address from master data) OR "+ Add Location Manually" → manual grid (ID/Org Name, Long Name, Address 1/2, City combobox, State/Region select, Postal combobox, Country select); "Add Contact Information" toggle (Name, Phone E.164, Email). Below: Planning Date Type radio (Ship / Delivery), Early/Late Pickup + Early/Late Delivery groups (Date picker + Time select + Timezone select auto-derived).

### 3.3 Product Information
Editable inline-row grid on the **`.odyssey-table` cell contract** (S-handoff 2026-06-11). Toolbar: search field, **`ButtonToggle` text mode "US | Metric"** (converts display UoMs), sort direction, column affordance (inert). Empty state: "0 products added" + "+ Add Product". Row edit: Product ID typeahead, Description (enabled after ID; 1–150 chars), Gross Weight + UoM select, Volume + UoM select, Ship Class select, per-row Save/Cancel; read rows get three-dot menu (Edit/Delete) + expand icon (inert this build). Missing-field alert per screen 4. Roll-ups (count, total weight, total volume, hazmat Y/N) computed for confirmation.

### 3.4 Special Services
Search typeahead with tabular dropdown (Service Category code + Description, frequency-sorted, searchable by either). Selected rows: category Badge + auto description + trash. Optional.

## 4. Save / Draft / Discard flows

- **Save (footer):** save-gate → mock `saveDraft` upsert → success toast/inline feedback, **UI stays open**, status Draft.
- **Cancel (footer) or ✕ (navbar):** opens **modal** (screen 3): "Save for Later" (secondary) / "Discard" (primary) / dismiss. Save for Later → save-gate → draft + navigate to `/orders` (grid shows Draft row). Discard → confirm in-modal → drop state, navigate to `/orders`, nothing kept.
- **Save for Later (navbar button):** save-gate → draft + close (same as modal path, skipping the modal).
- **Draft reopen:** Summary grid Draft row → `/orders/create?draft=<id>` → form hydrated from draft.

## 5. Confirmation (screens 6/7)

Post-submit state on the same route (form unmounts). Header strip: Order Number · Order Date/TZ · Shipment Mode (from response; derivation = Q28 open, mock supplies "Ground") · Payment terms. Read-only accordion sections, all expanded, rendering **what was filled** (Quick/Long richness automatic). **Sync variant:** green success Alert + real number. **Async variant:** blue info Alert, Order Number "–", copy per screen 7; render-only (Q17 — no polling; bell notification out of scope). Mock always returns sync; async variant covered by tests + dev-only trigger (`?confirm=async`).

## 6. Error handling

- Field errors inline (FormField error state); section-level error count optional on the accordion header.
- Submit mutation failure → error Alert above footer, form intact, retry available.
- Save-gate failure → red error Alert naming Order Number / Owning Organization.
- Lookup failures → inline "couldn't load" row in the dropdown with retry; never crash the form.

## 7. Testing

TDD (vitest, import-after-mock idiom from S52) on the logic cores:
1. **zod schemas** — validation matrix: required sets, conditional Late date by Planning Date Type, Early ≤ Late, E.164/email, product row rules, save-gate.
2. **`mapFormToOrderInterface`** — guided refs → dedicated fields vs free-form → reference list; instructions type default; parties shape; measures `{value,uom}`; appointment datetimes + TZ codes.
3. **orderService write layer** — createOrder envelope + grid row append; saveDraft upsert + reopen hydration round-trip.
4. **lookupService** — 2-char gate, case-insensitivity, frequency sort, org-scoped equipment.
Component smoke: step-completion flips, footer enable/disable, modal flows.

## 8. Component inventory

**Reuse `@odyssey/ui` / existing:** Button, FormField, FieldSelect, SearchField, Checkbox, Radio (if present), Alert, Badge, ButtonToggle (text mode), StepIndicator, Accordion, NavbarShell/TrailNav/GlobalSearch (title mode), `.odyssey-table` contract.
**New app-local (`src/components/orders/create/`):** CreateOrderForm (orchestrator), SectionStepper (accordion + StepIndicator + rail), TypeaheadSelect (async, generic), DateInput / TimeSelect / TimezoneSelect, AddressFields, ContactFields, RepeatableRows (instructions/references), ProductGrid (+ row editor), SpecialServicesPicker, StickyFooter, DiscardSaveModal, ConfirmationView.
Each new piece is a normalization candidate for the parallel session; built token-bound (no hardcoded values) so the swap is cheap.

## 9. Build order (for the implementation plan)

1. Contract + mapper + service write layer + lookup service (TDD) — the seam.
2. Route + CreateOrderModeContext + navbar contextual state + section shell (stepper, footer, modal, banner).
3. General Information (quick + long expansion).
4. Pickup & Delivery.
5. Product Information grid.
6. Special Services + Confirmation + draft reopen loop.
Each batch: implementer → spec-compliance review → code-quality review; final holistic integration review (S52 pattern).

## 10. Risks / notes

- `react-hook-form` + `zod` + `@hookform/resolvers` are new deps (workspace-standard choices; approved).
- Timezone auto-derivation in mock = static city→TZ map in data pools; live uses `/timezone/lookup`.
- US|Metric toggle converts **display** only; stored values keep entered UoM codes (LLD sends `{value, uom}` verbatim).
- The class column label awaits Efrain's canonical pick; interim "Ship Class" (constant, one-line change).
- Async-create UX beyond the static variant (bell wiring) is a navbar-domain follow-up.

> AI-generated design spec. Validate with Efrain/Jana before treating as canon.

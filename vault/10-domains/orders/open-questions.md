---
domain: orders
type: reference
tags: [orders, open-questions, grooming]
date: 2026-06-10
status: active
source: "Gaps surfaced by [[10-domains/orders/domain-analysis|Orders domain analysis]] §10 + [[10-domains/orders/section-map|section map]] contract gaps (Jira LINX intake 2026-06-10)"
---

# Orders — Open Questions for the Team

> Question list to push for answers (Ramesh = PO, Priya = PM, Jana/David/Kathleen/Steve/Niranjara = PMs, Utkarsh + devs). Grouped by who most likely owns the answer. Check off + record the answer inline; resolved items graduate into [[10-domains/orders/domain-analysis|domain-analysis]] with their source.

## Contract / API — Ramesh, Utkarsh (BE devs)

- [ ] **Q1 — Custom Views persistence endpoint.** Saved views (columns + filters per customer) are DB-persisted (LINX-10788), but no API is named in the stories or the LLD. What's the endpoint contract (CRUD on view definitions)?
- [ ] **Q2 — Manual-order EDIT submit contract.** Creation uses `POST /v3/manual-order`. Do edits to a manual order go through the same endpoint, or through `POST /v3/order` with the `orderInterface{}` wrapper (the integrated path)? The FE Order Creation Confluence page is image-only, so this is unconfirmed.
- [ ] **Q3 — OIF re-process contract.** After a user fixes a failed integrated order in the Failure-review UI, what call re-validates and re-sends it (LINX-11137 is still in Analysis)?
- [ ] **Q4 — Delete: real story + contract.** LLD task LINX-10922 references "LINX-10300" as the Delete story, but LINX-10300 is actually Manage Columns. Which story specs Delete UI, and is the legacy `DELETE /v1/order/{orderId}` (LINX-6055) still the intended endpoint?
- [ ] **Q5 — Bulk status change UI.** `PATCH /v3/order-status` exists for grid multi-select, but no functional story details the UI. Is bulk status change in scope for the rebuild, and which transitions does it allow?

## Behavior / functional — Ramesh, Jana, Priya

- [ ] **Q6 — Edit minor-vs-major classification.** LINX-10248 says edits are classified minor vs major with different downstream propagation, but the rules aren't written. What's the classification matrix, and what does each class trigger on Shipments?
- [ ] **Q7 — Order edit ↔ shipment status rules.** Which shipment statuses block order edits / order removal? Known so far: no updates after PGI/PGR (LINX-6062); remove-from-shipment blocked when Tendered (LINX-6135); the rest "to be defined with Jana" (LINX-11185).
- [ ] **Q8 — Manage Columns max: 12 or 15?** LINX-6101 title says "Max-15," body says 12. Which is implemented? (We assumed 12.)
- [ ] **Q9 — Status propagation story LINX-7945.** It's Canceled yet tagged Approved (shipment→order status propagation). Was the behavior folded into LINX-6001/6081, or was a requirement lost?
- [ ] **Q10 — Special Services scope.** Current lookup over-fetches all charge codes incl. non-special-services (LINX-10985/10986 are placeholders). What's the intended filter for "order-relevant special services"?
- [ ] **Q11 — Long Orders grooming.** Long Orders (LINX-8026) has 51 stories vs Quick's 319, many with no AC. Is Long form fully implemented in Angular (and just under-documented), or partially built? Can we treat the Angular build as the spec where stories are silent?

## Scope confirmation — Priya, David

- [ ] **Q12 — Cutoff view (LINX-448).** "Shipment Reaching Cut-Off and Update History UI" is an empty pre-2022 epic. Dead, or future scope?
- [ ] **Q13 — Order Upload / templates.** LINX-5984 (upload from template) + LINX-6002 (creation templates) are Todo/unspecced. In scope for the React rebuild?
- [ ] **Q14 — Copy field matrix.** Copy drops dates and retains origin/destination/direction/payment terms (LINX-7554, LINX-10259) — is there a full field-by-field retain/drop list, or do we derive it?

## From the Efrain + PRD merge (added 2026-06-10)

### Contract / data model — Ramesh, devs
- [x] **Q15 — Consolidatable: checkbox or derived? RESOLVED (David, live team session 2026-06-11).** **Consolidatable is header-only — the user's checkbox IS the value.** The old TMS had a broken DB structure where almost all header data was duplicated on the lines (e.g., one order Philadelphia→NY with a line Philadelphia→Miami); that's been fixed and is no longer possible. LINX-9473's line-derivation describes the old structure. *Build:* checkbox, checked by default, user-controlled, writes the header field.
- [x] **Q16 — Order Number mandatory-to-save? RESOLVED (Efrain, live team session 2026-06-11).** Optional at field entry (no asterisk), but **both Order Number + Owning Organization are required to use Save or Save-for-Later** — if either is blank the order cannot be saved and a red error message prompts for both values. *Residual closed (Efrain descriptions doc, same session):* "If left blank, the system will automatically generate an Order ID upon submission" — auto-generation on direct Create confirmed.
- [x] **Q17 — Async create path. RESOLVED (team live session 2026-06-11).** The async path is **system-determined** — a backend process owns order-number generation after create; the UI does not poll. **The system pushes a notification to the navbar bell badge** when the order number is created; that's how the user (and the UI) learns the final number. Confirmation page meanwhile renders Order Number `-` with the full summary (screen 7). *Build impact:* no polling logic in the create form; the bell-notification integration is a cross-domain (navbar chrome) dependency — out of scope for the create-flow build, mock the async confirmation state only.
- [ ] **Q18 — Contact Information fields' home.** Efrain's Pickup/Delivery Contact fields (name, E.164 phone, email) have no Jira backing. *Screens: render confirmed under Pickup/Delivery (screen 2); confirmation labels one "Contact Name (Alternate City)" — hints they're mapped onto an existing party/address field.* Where do they live in the model?
- [ ] **Q19 — Instruction Type: dead or hidden?** LINX-6195 has an Instruction Type lookup; Efrain says removed from UI, backend defaults `0012`. *Screens: confirmed removed — free-text description rows only (screen 1-Long).* Remaining: dead in the model or just hidden?
- [x] **Q20 — Freight Term dynamic default. RESOLVED (Efrain, live team session 2026-06-11).** Dynamic default confirmed: Outbound→Pre-Paid, Inbound→COL (Collect) — explicit in `vault-sources/10-domains/orders/efrain/orders-sections-efrain-descriptions.md` (General Information §, Freight Term). **Source-precedence note from Efrain:** his description texts incorporate the client transcripts, not just the stories — where they conflict with Ramesh's Jira story texts (here: LINX-6012's static Pre-Paid), **Efrain's texts win.**
- [x] **Q21 — References mapping. RESOLVED (David, live team session 2026-06-11).** "If there is a dedicated field use it" — the guided pre-seeded rows ('common' references: PO Number, Pickup Number) **write to the existing dedicated header fields** (`poNumber`, `pickupNumber`) rather than the generic reference list; free-form rows go to the generic type/value reference list. *Residual (minor):* `poDate` not addressed — no date column in the new References UI; ask when convenient.

### Behavior / functional — David, Ramesh
- [ ] **Q22 — Date Anchor "Both".** PRD 2365915159 lists Pickup/Deliver/**Both**; *screens confirm the implemented radio is two-way Ship/Delivery only (screen 2).* Is "Both" planned scope or dead?
- [ ] **Q23 — Synthetic orders.** What `sourceApplication` do CX-Platform-generated synthetic orders carry, which shipment fields are copied, and how do they appear on the Overview grid (PRD 2366406657)?
- [ ] **Q24 — TEMPLATE=Y mode.** Confirm the future template-order behavior (no required fields, no planning, hidden from screens) and its sequencing vs Order Upload/templates (Q13).

## From the screenshots correlation (added 2026-06-10)

- [ ] **Q25 — Overview tabs: Jira stories vs Efrain's design.** Stories spec **Data Validation Errors + Technical Errors** tabs (LINX-11180/11181); **Efrain's design** shows **All · Saved · Canceled · Interface Failures** (screen 0). Is the Jira version planned-but-not-yet-designed, or has Efrain's design superseded those stories? (Ramesh/Priya/David)
- [x] **Q26 — Product grid required columns. RESOLVED (Efrain, live team session 2026-06-11).** All asterisked columns are required — Product ID, Description, Gross Weight, Volume AND Ship Class. Efrain: every required field is asterisked and also described as mandatory in his section texts. Design supersedes the LINX-9874 either/or rule. *Residual (Ramesh):* confirm backend validation matches all-required (vs the story's either/or); the class-column label drift across screen states still needs one canonical label (Efrain).
- [x] **Q27 — Auto-save model. RESOLVED (Efrain, live team session 2026-06-11).** **There is NO auto-save — saving is manual only.** The banner was Efrain's own proposal; the governing rules are the Discard-screen action rules: **Save** = saves progress in-place (UI stays open, not submitted, status Draft). **Save for Later** = via Cancel button; saves progress, closes UI, status Draft, retrievable from the Overview page. **Discard** = via Cancel button; terminates without saving anything, after an explicit confirmation screen; not retrievable. **Save precondition** (both Save paths): Order Number + Owning Organization required, red error otherwise (→ Q16). *Build impact:* drop or reword the banner's "They are automatically saved" claim (step-completion checkmarks on required fields remain valid).
- [ ] **Q28 — Shipment Mode on confirmation.** Confirmation header shows "Shipment Mode: Ground" but Mode is never captured in the Quick form (screens 6/7). Derived from Equipment? Defaulted? (Ramesh)

## From the Summary Page build review (added 2026-06-10, spec `2026-06-10-orders-summary-page-design.md`)

Raised while reviewing the build assumptions with Manuela. **2026-06-11 update:** the Confluence **"Order Service Phase-2" LLD** (page 3401056276) was fetched — raw dump at `vault-sources/10-domains/orders/lld/order-service-phase-2.md` — resolving Q30/Q32 and most of Q29. Verbatim payloads now live in the build spec §5 (`docs/superpowers/specs/2026-06-10-orders-summary-page-design.md`).

### Contract — Ramesh, devs
- [ ] **Q29 — Pagination: 0- or 1-based + max page size.** LLD ✓: envelope is `pagination{pageNumber, pageSize, totalCount}` + `orders[]`; examples use `pageSize: 20`. Remaining: the LLD's `/order/list` example is **1-based** while its own `/order-status/lookup` example is **0-based** — which is it? And what's the max/allowed page-size set? Build interim: 1-based, default 20.
- [x] **Q30 — List-row payload shape. RESOLVED (LLD 2026-06-11).** Role-nested row confirmed: `consignor{}`/`consignee{}` objects, `grossWeight{value,uom}`/`volume{value,uom}`, `orderStatus` as a **display string** ("Ready For Plan"), `customer` display key, no `orderId`/`customerId`/`orderDate` on the row. *Residual (minor):* the advanced-filter fields (equipment/commodity/weight, LINX-10803/10810) are **absent from the LLD filter object** — extended later, or filtered client-side? Ask when convenient.
- [ ] **Q31 — Date-based sort for newest-first.** Manuela's UX default is **newest first**, but the list row has no `orderDate` and the LLD example sorts `orderNumber asc`. Is a creation-date `sort.field` supported by `/order/list`? Which fields are valid for `sort.field` at all? Build interim: `orderNumber desc` as proxy.
- [x] **Q32 — Status code value set. RESOLVED (LLD 2026-06-11).** Full enum from `/order-status/lookup`: `CAN`=Cancelled, `PLN_LD`=Planned Load, `PLNED_SHIP`=Planned Shipment, `PLNNG_FAIL`=Planning Failed, `RD_4_PLNNG`=Ready for Planning, `SHIP_FAIL`=Shipment Failed; plus `DRAFT` (create-order remark). **Key finding: HOLD is a boolean `orderHoldStatus` flag on the order, NOT a status code** — the lifecycle's "Hold resumes previous status" behavior is the flag clearing. *Residual:* confirm the lookup list is exhaustive (DRAFT absent from it — possibly filtered to planning-workflow statuses).
- [ ] **Q35 — Tab badge counts: no endpoint (LLD).** The LLD documents **no count/badge endpoint**; the only count is `pagination.totalCount` on `/list`. When the tab strip lands (Q25), where do badge counts come from — N parallel filtered list calls, or an undocumented endpoint? (Ramesh)

### Design — Efrain
- [ ] **Q33 — Grid sorting affordance.** *(DEFERRED 2026-06-11 — Manuela: screen 0 is low priority, don't push this yet.)* Screen 0 shows a single toolbar sort-direction toggle — Manuela finds toggle-only limiting. Header-click column sorting intended? Build ships toggle-only meanwhile.
- [ ] **Q34 — Grid loading / empty / error states.** Not in the design exports; build uses provisional patterns (`EmptyState`, retry button) until designed.
- [ ] *(also for Efrain, from the build scope)*: export of the **open filter panel** — blocks the filter-panel build that follows the Summary Page.

### 📌 Reminder — Summary Page deferred list (not questions; build follow-ups)

From the approved spec §2 — each is rendered-but-inert (✋) or absent (∅) in build #1:
1. ✋ **Filter panel** — next build, after Efrain's open-panel export
2. ∅ **Tab strip** — blocked on Q25
3. ✋ **Create Order** button — create-form build (#3)
4. ✋ **Row three-dot actions** (View/Edit/Copy/Cancel/Restore/Delete) — per-action builds
5. ✋ **ID link navigation** — order detail build (#2)
6. ∅ **Column management** — partly blocked on Q1 (saved-views API)
7. ✋ **Bulk actions** (checkboxes select; no action bar) — Q5
8. ∅ **CSV export** — contract known; quick follow-up
9. ∅ **EntityChip ↔ customer scope wiring** — param exists in the data layer

## Known defects (confirm fix-in-rebuild, don't replicate)

- Location dropdown lookups inconsistent (LINX-11155/11156/11157, LINX-10246)
- Owning Organization dropdown renders `[object Object]` (LINX-10808, LINX-10771) + substring-match bug (LINX-9702)
- Instruction description not persisted (LINX-11151)

> AI-generated from the Jira intake. Validate before acting on answers; record sources when resolving.

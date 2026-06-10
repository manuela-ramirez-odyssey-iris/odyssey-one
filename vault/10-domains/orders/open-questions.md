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
- [ ] **Q15 — Consolidatable: checkbox or derived?** Efrain describes a user-facing checkbox (checked by default); LINX-9473 derives `isConsolidateable` from line `isLoadConstraints`. *Screens 2026-06-10: checkbox confirmed, checked by default (screen 1).* Remaining: does the line-derived value override the user's choice?
- [ ] **Q16 — Order Number mandatory-to-save?** LINX-9742 says optional/auto-generated; Efrain says it's required on the Save-for-Later/draft path. *Screens: no asterisk at field entry (screen 1) — optional at entry; the save-gate behavior not visible in captures.* Which is implemented?
- [ ] **Q17 — Async create path.** *Screens: async state confirmed — confirmation renders Order Number `-` with the full summary, non-blocking (screen 7).* Remaining: what triggers it, and does the form poll/subscribe? Ties to the batch→event migration (PRD 2453340164).
- [ ] **Q18 — Contact Information fields' home.** Efrain's Pickup/Delivery Contact fields (name, E.164 phone, email) have no Jira backing. *Screens: render confirmed under Pickup/Delivery (screen 2); confirmation labels one "Contact Name (Alternate City)" — hints they're mapped onto an existing party/address field.* Where do they live in the model?
- [ ] **Q19 — Instruction Type: dead or hidden?** LINX-6195 has an Instruction Type lookup; Efrain says removed from UI, backend defaults `0012`. *Screens: confirmed removed — free-text description rows only (screen 1-Long).* Remaining: dead in the model or just hidden?
- [ ] **Q20 — Freight Term dynamic default.** Efrain: Outbound→Pre-Paid, Inbound→COL. LINX-6012: static Pre-Paid. *Screens: Outbound→Pre-Paid leg confirmed (screen 1); Inbound→COL unverified.*
- [ ] **Q21 — References mapping.** How do legacy header `poNumber`/`poDate` map onto the Reference Type/Number UI? *Screens: References rows are pre-seeded with guided types (Pickup Number, PO Number) mixed with free-form rows (screen 1) — richer than the two-open-columns model.*

### Behavior / functional — David, Ramesh
- [ ] **Q22 — Date Anchor "Both".** PRD 2365915159 lists Pickup/Deliver/**Both**; *screens confirm the implemented radio is two-way Ship/Delivery only (screen 2).* Is "Both" planned scope or dead?
- [ ] **Q23 — Synthetic orders.** What `sourceApplication` do CX-Platform-generated synthetic orders carry, which shipment fields are copied, and how do they appear on the Overview grid (PRD 2366406657)?
- [ ] **Q24 — TEMPLATE=Y mode.** Confirm the future template-order behavior (no required fields, no planning, hidden from screens) and its sequencing vs Order Upload/templates (Q13).

## From the screenshots correlation (added 2026-06-10)

- [ ] **Q25 — Overview tabs: Jira stories vs Efrain's design.** Stories spec **Data Validation Errors + Technical Errors** tabs (LINX-11180/11181); **Efrain's design** shows **All · Saved · Canceled · Interface Failures** (screen 0). Is the Jira version planned-but-not-yet-designed, or has Efrain's design superseded those stories? (Ramesh/Priya/David)
- [ ] **Q26 — Product grid required columns.** The grid asterisks Product ID, Description, Gross Weight, Volume AND Ship Class all as required (screen 4 missing-field alert), contradicting the either/or rule "(Product ID + Description) OR (Shipping Class + ID)" (LINX-9874). Which validation is implemented? Also: the class column is labeled three different ways across states. (Ramesh/Efrain)
- [ ] **Q27 — Auto-save model.** The banner "Required fields will complete steps. They are automatically saved" (screens 1–5) describes auto-save + auto-step-completion no text source mentions. What exactly is persisted, when, and how does it interact with Save / Save-for-Later / Discard? (Ramesh/Efrain)
- [ ] **Q28 — Shipment Mode on confirmation.** Confirmation header shows "Shipment Mode: Ground" but Mode is never captured in the Quick form (screens 6/7). Derived from Equipment? Defaulted? (Ramesh)

## Known defects (confirm fix-in-rebuild, don't replicate)

- Location dropdown lookups inconsistent (LINX-11155/11156/11157, LINX-10246)
- Owning Organization dropdown renders `[object Object]` (LINX-10808, LINX-10771) + substring-match bug (LINX-9702)
- Instruction description not persisted (LINX-11151)

> AI-generated from the Jira intake. Validate before acting on answers; record sources when resolving.

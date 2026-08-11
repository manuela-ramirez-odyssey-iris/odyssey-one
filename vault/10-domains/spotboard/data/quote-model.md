---
title: SpotBoard — Quote Data Model, States & Notification Catalog
domain: spotboard
type: data-model
tags: [spotboard, overflow, data-model, schema, states, notifications, ocm, mffcofl, legacy, quote-viewer]
date: 2026-08-11
status: active
---

# SpotBoard — Quote Data Model, States & Notification Catalog

Field-level, state-level and message-level reference for the SpotBoard (Overflow) quote. Split out of [[../spotboard|the canon]] at v1.2 because the PRD supplies enough tabular detail to stand alone; the canon carries the narrative and this file carries the tables.

**Everything here is sourced to `OdysseyONE_Overflow_Bidding_PRD_v2.md` (v2.0, 07/02/2026)** unless marked otherwise. Cited as `(PRD, Feature N)` / `(PRD, Appendix A.N)` / `(PRD, §N)`.

> **One non-PRD source, added 2026-07-29 (canon v1.4).** §3.4 and part of §5.6 come from **`Jana story — Overflow Portal bid review and submission.md`** — a **draft** Jira-style user story by **Janardhana (Jana), PM for Shipments**, cited as `(Jana story, <section>)`. It is unpublished (*"Unsaved changes"*), carries no Jira key, and is by a PM from a neighbouring domain. **It is also one side of a live disagreement with Kathleen O'Donnell about carrier access** — see [[../spotboard|canon]] §15 and [[../decisions/decision-log|SPB-16]]. **The material used here is the part of that story that is *orthogonal* to the disagreement** and holds whichever access model wins.

> **A second non-PRD source, added 2026-08-11 (canon v1.6).** Parts of §1.1, §1.2 and §3.3 come from **`image (1)`** (a direct screenshot of `Maintain Carrier Overflow (MFFCOFL)` with its carrier grid populated) and **`image (4)`** (the legacy `Quote Viewer` cross-bid screen), both pasted into the **2026-08-07 "Spotboard UX discussion"** call and therefore read together with its transcript. Cited as `(image N)`. **These are the same screens the PRD's Appendix B shows, photographed at higher fidelity and with real data in them** — they *extend* the PRD-sourced content here and correct none of it. Everything drawn from them is tagged *(new 2026-08-11, SHOWN)*. Narrative in [[../spotboard|canon]] §17. **`image (4)` is truncated** (header reads `1 - 16 of 16`, ~3 rows unseen), so nothing is claimed about its paging, sorting or footer.

> **Naming.** The PRD predates the Overflow → SpotBoard rename and says *Overflow* throughout. This file uses **SpotBoard** for the product ([[../decisions/decision-log|SPB-01]]) and keeps *Overflow* only inside verbatim quotes, legacy identifiers (`MFFCOFL`, `COFL_*`, `mf_ocm_overflow_carrier`) and legacy screen names, where it is the literal name of the thing.

> ✅ **Conversion damage — repaired 2026-07-29 by reading the PDF pages visually.** The PRD reached us as a MarkItDown conversion that shredded two tables, stripped every Appendix B screenshot, and dropped the profile listings on pp.30–32 entirely. **The original PDF pages have now been read as rendered images** and the damaged regions recovered. Citations of the form `(PRD p.NN, read visually)` mark content that came from the page image rather than from the text conversion.
>
> | Damaged region | Status |
> |---|---|
> | **Appendix A.5** — carrier-eligibility rules (§2.2) | **Verified visually (PRD p.18). The prior reconstruction was correct** — four rules, their triggers, logic and outcomes, and the four-row precedence table all match the source exactly. Caveat removed. |
> | **Feature 11** — email catalog (§7) | **Verified visually (PRD pp.11–12). The prior reconstruction was correct** — all eight rows, recipients, triggers and required actions match. Caveat removed. |
> | **Appendix B** — legacy screenshots (pp.21–29) | **Recovered.** Ten screenshots described in [[../spotboard|canon]] §14. Yields the profile-driven charge codes (§5.5), the legacy carrier-row status set (§3.3) and the markup charge line (§5.6). |
> | **pp.30–33** — profile listings and OCM screens | **Recovered.** Both profile catalogues are transcribed in §5.3 / §5.4 below. |
>
> **Two caveats remain, and neither is fixable from this artifact.**
> 1. **The `RV_MEANING` column on p.30 and the `SP_DESC` column on p.31 are cut off at the right page edge *in the source raster itself*** — the screenshots were pasted wider than the page and clipped when the document was authored. Re-rendering at any width recovers nothing. Every profile description below is therefore truncated exactly where the page truncates it, marked `…[clipped]`. **To close this, re-request those two tables as text or as a wider image export.**
> 2. **The text conversion silently flattened strikethrough.** Three of the PRD's seventeen open questions (`OQ-4`, `OQ-5`, `OQ-16`) are **struck through** in the PDF and read as live in the conversion — see [[../decisions/decision-log|SPB-14]]. Any other formatting-carried meaning in the conversion should be treated as unverified unless it has been read visually.

---

## 1. Quote record structure

The legacy model splits a quote into **one header row plus N carrier-candidate rows**, and the PRD explicitly recommends carrying that shape forward: *"Modeling OdysseyONE's quote history the same way (one header + N carrier-response rows per quote request) keeps the audit trail consistent with how planners already think about 'a quote.'"* (PRD, Feature 10 legacy note).

### 1.1 Quote header — legacy `mf_carrier_overflow` (COFL)

*"The quote header. One row per quote. Stores equipment, OCM profile, duration, open/close/actual-close dates, flexible pickup/delivery flags & days, status, cost/tolerance audit fields."* (PRD, Appendix A.2)

| Field | Notes |
|---|---|
| Quote ID | Unique per quote request. *"The system shall generate a unique Quote ID for each quote request."* (PRD, Feature 1). Rendered `QT-88421` in the wireframe — **the `QT-` prefix is the wireframe's, not the PRD's** (wireframe, Screen 2). |
| Load / consolidation reference | Legacy links back via `ald_cofl_id` (single load) or `acol_cofl_id` (consolidation) (PRD, Appendix A.2). |
| Load type code | `'L'` = single load, `'C'` = consolidated load. Legacy passes it as a Forms global; *"model as normal input parameters (load id + type) in OdysseyONE"* (PRD, Appendix A.11 #1). |
| Equipment (seed) | The load's seed equipment; expanded into a comparable set to find carrier lists (§2.1). Locked once carriers are loaded (PRD, Appendix A.4). |
| OCM profile | The overflow master profile that produced the carrier list — **profile type 14 / code 69** (PRD, §3, Appendix A.2). |
| Quote duration | Integer **1–99,999 minutes**. Required when a quote exists. **Locks once sent.** (PRD, Feature 1 legacy note; Appendix A.7). |
| Open date | Set on send. |
| Close date | `open + duration` (PRD, Feature 1 legacy note). |
| Affiliate close date | `open + duration + COFL_AFFLM buffer` — a **later** close time for the internal affiliate bidder (§5, §6). *"Confirm whether OdysseyONE needs an equivalent affiliate-close concept."* — **open** (PRD, Feature 1 legacy note). |
| Actual close date + closing user | Written by Close (PRD, Appendix A.3 step 5). |
| Flexible pickup flag / flexible days | Shown only when the OCM profile allows flexible days > 0; defaults `'N'`; *"persisting to the quote header immediately on change"* (PRD, Appendix A.9). |
| Flexible delivery flag / flexible days | Same treatment. 23 active configurations each for flexible pickup and flexible delivery (PRD, Appendix A.11 #4). |
| Status | Draft → OPEN → CLOSED (§3.1). |
| Cost / tolerance audit fields | Display gated by system profile `COFL_DSPAU` (PRD, Appendix A.8, A.9). |
| **`External Quote No`** *(new 2026-08-11, SHOWN)* | A pair of quote-header footer fields on `MFFCOFL` — `External Quote No` and `Expires` — **empty in every screenshot we hold**, and rendered as **editable inputs**, not read-outs. The same pair appears on the legacy tender screen's `Quote` tab ([[../spotboard|canon]] §14.6). **Purpose undocumented in the PRD and unmentioned in any transcript** — plausibly the dormant external rate-API path (`OQ-3`), but **that is INFERENCE and nobody has said so.** `image (1)`. |
| **`Expires`** *(new 2026-08-11, SHOWN)* | See above — paired with `External Quote No`, and distinct from the quote header's own `Quote Expires`. |
| **Raw legacy keys exposed on the form** *(new 2026-08-11, SHOWN)* | `ocm_id` · `ooc_id` · `rlce_id` · `rlce_mrl_id`, printed in the footer in italic lowercase. Confirms the FK graph in §1.3 against a live record (`ocm_id 762`, `ooc_id 515`, `rlce_id 10736`, `rlce_mrl_id 144112`). `image (1)`. |

> **§1.1 provenance note (2026-08-11).** The four rows tagged *(new 2026-08-11, SHOWN)* above come from a **direct screenshot of `MFFCOFL`**, `image (1)`, pasted into the 2026-08-07 UX call — not from the PRD. Cited as `(image 1)`. See [[../spotboard|canon]] §17.2.

### 1.2 Carrier candidate / response row — legacy `mf_rate_admin_load_carr_equip` (RLCE)

*"The carrier grid rows — one per (carrier SCAC × equipment) candidate on the quote. Stores include flag, planned pickup/deliver dates, tender/quote status, response user/datetime, quoted cost, report-log id."* (PRD, Appendix A.2)

| Field | Notes |
|---|---|
| Carrier (SCAC) × equipment | The row's key. One row per candidate pair. |
| Include flag | Default `Y`, forced `N` by the eligibility rules in §2.2. Planner may re-check Routed/Waffled rows (PRD, Feature 1). |
| Active / inactive | Only failed hazmat certification deactivates a row (§2.2 BR-1). |
| Planned pickup date | Per carrier. Non-consol: date planning computes it. Consolidation: uses dates already on the shipment (PRD, Feature 1). |
| Planned delivery date | As above. |
| Quote / tender status | Set from the RFQ transmission result (§4) and from carrier responses. |
| Quoted cost | Linehaul/base + fuel + accessorials (PRD, Feature 3). |
| Response user + datetime | *"The portal shall display the carrier's most recently submitted quote and the submitting user."* (PRD, Feature 3). |
| Report-log id | The RFQ email/report instance sent to this carrier (PRD, Appendix A.6). |
| Currency | Defaults from the carrier master record, falling back to an org-level system-profile default. Multi-currency is out of MVP scope but *"this fallback logic is worth preserving as a pattern"* (PRD, Feature 2 legacy note). |
| `rlce_embargoed` | Column exists but is **always written `'N'`** because the embargo check is disabled — *"misleading if relied on downstream"* (PRD, Appendix A.5 BR-2). |
| **`Status Date`** *(new 2026-08-11, SHOWN)* | A **per-row timestamp beside `Status`**, distinct from the response datetime above: on a live quote `Excluded` rows carry a `Status Date` equal to the send time (`25-JUN-2026 11:01 EST`) even though those carriers never responded. So this stamps **the last status transition**, not the carrier's answer — which is what makes it usable for the audit trail David asked for ([[../decisions/decision-log|SPB-28]]). `image (1)`. |
| **`Transit`** · **`Distance`** *(new 2026-08-11, SHOWN)* | **Per-carrier** columns on the `MFFCOFL` grid (`.74 hr`, `37 mi`). Uniform across all seven rows in the sample, so whether they are genuinely per-carrier values or a shipment value repeated per row is **not determinable from the screenshot**. Irina states they are per carrier: *"in TMS, I do have date. Pick up delivery, transit time, distance"* (Aug 7 call, 30:03). `image (1)`. |
| **`Gave Back`** *(new 2026-08-11, SHOWN)* | A **checkbox column** on the carrier grid, unchecked on every row in the sample. **The term is defined nowhere** — not in the PRD, not in any transcript, not in this canon. It is *adjacent* to the wireframe's `Waffled / Gave back` eligibility flag (§2.2) and to `OQ-17`'s flag list, but **no artifact equates the two.** Recorded as an open vocabulary gap ([[../spotboard|canon]] §10). `image (1)`. |
| **`Routed`** *(new 2026-08-11, SHOWN)* | A **checkbox column**, and the eligibility rule made visible: all four `Routed ☑` carriers in the sample are `Excluded` + `Include? ☐` + rendered red — **except `CTNS`, which is `Routed ☑` yet included and responded.** That single row is the proof that the planner's opt-in is real and exercised, confirming Kathleen's *"you can include them for a spot bid if you want to"* (Aug 7 call, 27:52). `image (1)`. |
| **`MFFLCE Tender Status`** *(new 2026-08-11, SHOWN)* | The **tender** state of each candidate carrier, surfaced **inside** the overflow grid (observed value: `Cancelled`). **This is the Tender→SpotBoard direction of a cross-link we currently model only in the SpotBoard→Tender direction** ([[../decisions/decision-log|SPB-02]]'s `SPOT RATE` flag). Whether OdysseyONE needs the reverse link is unaddressed by every artifact. `image (1)`; [[../spotboard|canon]] §14.1, §17.2. |

> **§1.2 provenance note (2026-08-11).** The six rows tagged *(new 2026-08-11, SHOWN)* come from **`image (1)`**, a direct screenshot of `MFFCOFL` with its carrier grid populated, plus **`image (4)`** (the `Quote Viewer`), both pasted into the 2026-08-07 UX call. They are legacy **field inventory**, not requirements: recorded so that a field we choose not to carry is a visible choice rather than an oversight. [[../spotboard|canon]] §17.2–17.3.
>
> **What `image (4)` adds at this grain:** the cross-quote view renders per carrier `Response Time` · `Response User` · `Quoted Cost` · `Awarded` — **`Awarded` is a PER-CARRIER mark** (`-` on the open quote, a red ✗ on every row of the closed ones), not a quote-level flag. And **`Quoted Cost` doubles as a response-outcome cell**: it carries the literal string **`Declined`** where a carrier declined, rather than a null with the state held elsewhere. Both are shape facts our model should decide about explicitly.

### 1.3 Other tables in the legacy quote graph

| Table | Role (PRD, Appendix A.2) |
|---|---|
| `mf_ocm_profile` (OCM) | Carrier-overflow master profile, type 14 / code 69. Defines eligible equipment/owner-org combinations. |
| `mf_ocm_overflow_carrier` / `mf_ocm_overflow_carrier_list` (OOC / OOCL) | Overflow carrier definitions and their lists, scoped by origin/destination location. |
| `mf_organization` (ORG) | Owner / consignor / consignee orgs. The hierarchy is **walked** to find applicable profiles. |
| `mf_act_load` (ALD) / `mf_act_consolidated_load` (ACOL) | The underlying load / consolidation. |
| `mf_load_carrier_equipment` (LCE) | Existing tenders on the load. Checked for staleness and "already processed" guards. **This is the `LCE` in `No Costed LCE Option` (IE-5).** |
| `mf_ship_equipment` (SE) | Equipment descriptions. |
| `mf_cofl_acol_detail` (COAD) | Per-order detail rows, written when a quote is sent for a consolidation. |
| `mf_order`, `mf_reference_qualifier`, `mf_carrier` | Lookups — order numbers, reference descriptions, carrier currency. |

---

## 2. Carrier list construction and eligibility

### 2.1 How the candidate set is produced

Two steps, and the PRD is emphatic that the first is misunderstood:

1. **Comparable-equipment expansion.** *"Legacy carrier-list eligibility works by equipment expansion, not direct lookup: the load's seed equipment type is expanded into a comparable-equipment set per TMS configuration (e.g., seed = TL → comparable set = [TL, LTL]); the eligible overflow carrier lists for every equipment in that set are unioned and offered to the planner. **The Equipment field is really picking a carrier list — the equipment is just the path that produces it.**"* (PRD, Feature 1 legacy note; Appendix A.3 step 2)
2. **Profile scoping.** Eligible lists are found *"by walking the consignor org hierarchy for active OCM profiles matching ship direction and origin/destination descendancy"*, matching ship-from/ship-to against location descendants of the load's first-pickup and last-dropoff points (PRD, Appendix A.3 step 2; §3). No match → *"No carrier overflow templates satisfy this load"*.

The planner then **selects exactly one** list (PRD, Feature 1).

Scoping dimensions the configuration supports: client / owning organization · shipping site / org · equipment type · geography as a **country-to-country origin/destination pair** (`US-US`, `US-CA`, `BE-Paris`) · hazmat flag (PRD, Feature 1). Geography input is the shipment's precise origin/destination; *"the response can be more vague (based on most specific config)"* (PRD, Feature 1).

**No code-level equipment restriction exists** in legacy — any configured equipment type can use overflow. Which types are *actually* used must be answered from quote history, not configuration (PRD, Feature 1; OQ-13, owner Doug).

### 2.2 Eligibility rules — four checks, one precedence order

Each candidate carrier starts **included and active**, then runs four business rules (PRD, Appendix A.5).

> ✅ **Verified visually 2026-07-29 (PRD p.18, read visually).** This was the worst-mangled region of the text conversion — rule text, outcome text and a stray page header interleaved. It was reconstructed from context at v1.2 and **the reconstruction was correct**: the table below now reproduces the source's own column headers (`Rule` · `Trigger` · `Logic` · `Outcome`) and cell wording verbatim. No values changed; the `[conversion damage]` marker is removed.

| Rule | Trigger | Logic | Outcome |
|---|---|---|---|
| **BR-1 — Hazmat Certification** | Shipment is hazardous | *"Look up OCM profile attribute 38 (Hazmat Certification) for consignor/carrier/equipment/direction. Not found or not starting with 'Y' → not certified."* | *"Excluded AND deactivated (only rule that deactivates the record)."* **INFERENCE (short, from Feature 1 + wireframe):** such carriers therefore never appear as selectable. |
| **BR-2 — Carrier Embargo** | **N/A — disabled** | *"Commented out / not executing. Would have checked transit-time error code 1782 as an embargo indicator."* | *"No effect today; `rlce_embargoed` column always written 'N' (misleading if relied on downstream)."* |
| **BR-3 — Quote Waffling** | Always evaluated | *"Finds the most recent load-carrier-equipment record for the carrier/equipment on this shipment; checks its waffle flag (carrier previously committed, then backed out or changed position)."* | *"Excluded, but record stays Active/visible."* |
| **BR-4 — Routed Carrier** | Always evaluated (2 sub-checks) | *"(A) Creator of the existing carrier/load record is the system routing user (auto-assigned, not planner-selected). (B) A matching non-usable-carrier record exists."* The routing user is named `MFLRTE` in Feature 1's legacy note, not in A.5 itself. | *"Excluded, but record stays Active/visible."* |

**Final status precedence (top wins):**

| Condition | Status | Included |
|---|---|---|
| Failed hazmat cert (BR-1) | Inactive | N |
| Waffled (BR-3) | Active | N |
| Routed (BR-4) | Active | N |
| None of the above | Active | Y |

Carriers excluded by BR-3/BR-4 render **red** and are **unchecked by default**; the planner may opt them in (PRD, Feature 1; wireframe, Screen 1). Additionally: *"Carriers that are in the overflow list and were part of the route guide and declined or did not respond to their previous tender offer will by default be unselected"* (PRD, Feature 1) — the same default-off treatment, driven by prior tender behavior.

**Which of these flags surface in the UI is still open** — `Not Hazmat Certified`, `Waffled/Gave Back`, `Routed`, `Embargoed`, **`Indirect`** (a fifth flag named only in OQ-17 and Appendix A.11 #7, defined nowhere in the PRD). OQ-17, owner Product/UX.

---

## 3. State machines

### 3.1 Quote lifecycle — legacy COFL states

`Draft → OPEN → CLOSED`, with two side-exits (PRD, Feature 8 legacy note; Appendix A.3).

| Step | Action | What it does |
|---|---|---|
| 1 | **Begin / Resume** (`overflow_begin`) | Runs on open and after every action. Finds the most recent active quote for the load and rehydrates it; otherwise runs seed selection. |
| 2 | **Carrier-list eligibility** (`overflow_get_seed`) | Comparable-equipment expansion + org-hierarchy profile walk (§2.1). |
| 3 | **Get carriers & plan dates** (`overflow_get_carriers`) | Creates the header, runs the four eligibility checks, inserts grid rows, computes planned ship/deliver dates per carrier — falling back to request-date logic, or first-pickup/last-dropoff dates for multi-stop. |
| 4 | **Send** (`overflow_send`) | Validates dates and duration; sets open / close / affiliate-close dates; writes per-order detail rows for consolidations; writes a quote note **including dropped-carrier reasons**; transmits the RFQ (§4). Status → **OPEN**. |
| 5 | **Close** (`overflow_close`) | Sets actual close date/user, writes a close note. Status → **CLOSED**. Also **auto-closes if the load becomes inactive**. |
| 6 | **Modify** (`overflow_modify`) | Copies the closed quote into a **new editable draft** for adjustment and re-send. |
| 7 | **Clear** | **Voids** the current quote, unlinks it from the load/consolidation, returns to seed selection. |
| 8 | **Process SCAC** (`overflow_process_scac`) | Award. Guards against double-processing, acquires an order-interface lock, applies the quote/carrier to the load. Renamed **`Award Carrier`** in OdysseyONE ([[../decisions/decision-log|SPB-06]]). |

### 3.2 Button/field enablement by state

*"Use this as the starting point for the OdysseyONE state model and UI enablement rules."* (PRD, Feature 8 legacy note; matrix from Appendix A.4)

| COFL state | SEND / MODIFY / CLOSE label | Clear | Equipment field | Duration / dates / flags editable |
|---|---|---|---|---|
| No quote yet (seed phase) | `SEND` (disabled) | Visible | Enabled + picker | n/a |
| Draft (carriers loaded, not sent) | `SEND` (enabled) | Visible | **Locked** | Yes |
| OPEN (sent, awaiting responses) | `CLOSE` | **Hidden** | Locked | **No** |
| CLOSED | `MODIFY` | Visible | Locked | No |
| Load inactive | All hidden | Hidden | Disabled | No — warning shown |

**This matrix contradicts the wireframe in one place:** wireframe Screen 4 shows a quote in `CLOSED` state offering `Force Close`, which the matrix says is not available once closed (the button becomes `MODIFY`). Treated as a wireframe slip — see [[../spotboard|canon]] §12.

### 3.3 Status vocabularies

**Five distinct sets — was four; a fifth was recovered from the Appendix B screenshots. Do not merge them.**

| Vocabulary | Values | Source |
|---|---|---|
| **Quote header state** (internal/legacy) | `Draft`, `OPEN`, `CLOSED` | PRD, Feature 8 legacy note / Appendix A.3. **Visually confirmed** — the `MFFCOFL` header `Status` field reads `OPEN` on a live quote and `CLOSED` after close (PRD pp.22, 25, 29, read visually). |
| **Carrier row status — the legacy set** *(new, recovered visually)* | `Sent` · `Excluded` · `Done` · `Declined` · `Accepted` | **PRD pp.21–22, 25, 29, Appendix B screenshots, read visually.** The `Status` column of the `MFFCOFL` carrier grid. `Sent` = RFQ transmitted; `Excluded` = failed an eligibility rule (§2.2) and was not invited; `Done` = the carrier responded; `Declined` = the carrier declined. `Accepted` appears once on a closed quote (p.25). Blank before send. **This is the persisted vocabulary the OdysseyONE bid row has to map onto**, and it is not the same shape as the wireframe's presentational set below — legacy has no `Lowest bid` status, because "lowest" is a comparison, not a state. |
| **Carrier bid row status — the wireframe's set** | `Lowest bid`, `Bid`, `Declined`, no response (`—`) | wireframe, Screen 4. **The PRD prose does not enumerate these** — it names the concepts (lowest bid, decline, no response) but never as a status set. Presentational; treat as proposal, and reconcile against the legacy set above. |
| **Quote lifecycle / board status** | `Open`, `Closing soon`, `In review`, `Awarded`, `Unawarded`, `Invalidated` | wireframe, Screen 6. PRD supports `Awarded` / `Unawarded` / `Invalidated` and the review concept; `Closing soon` is presentational. |
| **Quote outcome / history** | `Awarded`, `Not awarded`, `Cancelled`, `Manual intervention`, `Invalidated (transportation-relevant change)`, `Superseded by later request` | **PRD, Feature 10 — verbatim.** *"awarded, non-awarded, cancelled, or manual intervention"* plus *"invalidated by transportation-relevant change, or superseded by a later quote request."* The wireframe's badges are a faithful rendering, not an invention. |

> **Confirmed 2026-08-11 against a direct screenshot, with two additions.** `image (1)` shows the carrier-row set live on one 60-minute quote: **`Done`** (responded, with a `Quoted Cost`), **`Declined`**, **`Sent`** (transmitted, no answer yet), **`Excluded`** (failed an eligibility rule). `Accepted` does not appear on this open quote, consistent with §14.1's note that it appears on a closed one. **Two additions to the row above:** (a) each status carries a **`Status Date`** that stamps the *transition*, not the response — `Excluded` rows are dated at send time (§1.2); (b) the cross-quote `Quote Viewer` renders **`Declined` as a value in the `Quoted Cost` column** (§1.2), a **fourth rendering of the decline state** alongside the legacy status, the wireframe's row status and Jana's carrier-facing set. **Nobody has reconciled the four.** `image (1)`, `image (4)`; [[../spotboard|canon]] §17.2–17.3.
>
> **Also confirmed at the header level:** `image (1)` shows `Status OPEN` with `Quote Opened 11:01`, `Quote Expires 12:01` and **`Quote Closed` empty** — i.e. the close timestamp is written by the close event, and a quote can be `OPEN` with responses already in. Relevant to [[../decisions/decision-log|SPB-28]]'s award-early requirement, which needs `award()` to operate on exactly this state.

**Open, in the PRD's own words:** *"Should we add another quote status for carrier history so quotes don't stay in review status?"* (PRD, Feature 7 — an unnumbered open question).

Note that **none** of these is the Shipments tender status set (`Sent` / `Accepted` / `Declined` / `Cancelled`, with `Pending` retired — [[../../shipments/decisions/decision-log|DEC-03]]). The wireframe's `Tendered — Pending` on Screen 5 belongs to no vocabulary in evidence; see [[../spotboard|canon]] §9.5.

> **A sixth set, surfaced 2026-07-29 and not reconciled by anyone.** Jana's Bid Listing Page specifies a **carrier-facing** status set — *"list of all bids visible to the carrier (**Open / Expired / Awarded / Cancelled**)"* (Jana story, screen summary §4). It matches none of the five above: it is quote-level like the outcome set but shorter, it uses `Expired` where the PRD uses `Not awarded` and the wireframe uses `Unawarded`, and it drops `Manual intervention`, `Invalidated` and `Superseded` — plausibly because those are internal concepts a carrier should not see. **No artifact maps it onto the other five.** Recorded, not merged.

### 3.4 Non-participation — the value none of the five sets names (new 2026-07-29)

**Source: `Jana story`, not the PRD and not the wireframe.** This is the part of that artifact that is fully separable from the carrier-access disagreement ([[../spotboard|canon]] §15) and holds under either access model. Logged as [[../decisions/decision-log|SPB-17]].

#### The gap it fills

A carrier that receives an RFQ and never answers has **no representation** in any persisted vocabulary:

| Set | A silent carrier is… | Why that is a problem |
|---|---|---|
| Legacy carrier row | **stuck at `Sent`** — permanently (PRD pp.21–22, 25, 29, read visually) | A terminal outcome stored as an in-flight status. `Sent` at minute 1 and `Sent` at minute 121 are the same row |
| Wireframe Screen 4 | an **em-dash `—`** (wireframe, Screen 4) | A rendering of absence. Not a value: nothing to persist, filter, count, or audit against |
| Quote outcome / history | not represented — that set is **quote-level** | Wrong altitude. `Not awarded` is about the quote, not about which carriers ignored it |

Note the asymmetry that makes this concrete: **`Declined` is persisted, timestamped and re-openable** (`Declined` in the legacy set; *"status would move out of Declined"* on re-bid, PRD Feature 3), while its complement — never answering — is not persisted at all.

#### The four rules

All from `Jana story`, verbatim where quoted:

1. **`No Bid Submitted` is a status.** *"Odyssey One must reflect the carrier as having **'No Bid Submitted'** or equivalent non-participation status in the bid summary."* (AC "Status Visibility in Odyssey One"). Trigger: *"Given the bid window has closed, When no bid has been received from a specific carrier"* — so it is **assigned at window close**, per carrier, and is **terminal**.
2. **No explicit decline is required.** *"Carrier participation is voluntary. The portal must not require an explicit action to decline participation; lack of bid submission by the deadline is considered non-participation."* (Business Rules "No Mandatory Carrier Response").
3. **Expiry is the non-participation event.** *"if they do not submit a bid, the event naturally expires for them without requiring any explicit decline"* (Business Rules "Bid Window Enforcement"); *"the bid opportunity for that carrier expires automatically with no further action from the carrier"* (AC "Bid Expiry for Non-Participating Carriers").
4. **It must not read as a decision.** *"Non-participation events appear in history simply as 'No Bid Submitted' or similar wording, **without implying a formal decision from the carrier**."* (Business Rules "History"). **This is the semantic constraint, and it is why `Declined` cannot be reused** — `Declined` asserts an act the carrier did not perform.

#### Where it lands in the model

| Layer | Effect |
|---|---|
| **Carrier response row** (§1.2) | The row's *quote / tender status* field gains a terminal value written **by the close event**, not by a carrier action. Every other value in the legacy set is written by a transmission or a response; this one is written by **the clock**. That is a new writer, and it is the only structural consequence |
| **Quote header state machine** (§3.1) | **No change.** Non-participation is a per-carrier outcome, not a quote state. The `Close` step (`overflow_close`, step 5) is the natural place it would be stamped — it already *"sets actual close date/user, writes a close note"* — but no artifact says so. **INFERENCE, marked:** step 5 is where this would be written; Jana specifies the requirement, not the mechanism |
| **Button/field enablement** (§3.2) | **No change** — it is not planner-actionable |
| **Audit trail** | *"Odyssey One must record and display carriers who did not submit bids within the bid timeframe, to support a complete audit trail and enable user decision-making."* (Business Rules "Odyssey One Visibility"). Satisfies the PRD's auditability non-functional (§8) rather than extending it — and legacy already writes *"a quote note including dropped-carrier reasons"* on send (§3.1 step 4), so the **habit** exists; what is new is a per-carrier **status** at close |
| **History** | *"the history must show shipments where the carrier submitted a bid as well as events they simply did not participate in (bid expired)"* (AC "Carrier Portal History") — on the carrier's own history surface, and on the planner's |

#### Extends or conflicts?

**Extends — with one reading that must be avoided, and it is an easy misreading.** Rule 2 says the portal must not *require* a decline. Read as *"remove the Decline action"* it would contradict three things: PRD Feature 3's `Submit Bid` / `Update Bid` / `Decline` actions with re-bid explicitly permitted; the legacy `Decline` / `Submit` button pair (PRD p.23, read visually); and the persisted `Declined` status itself. **Read as written — decline stays offered, silence is not a failure state — it is a clean extension of every vocabulary above.**

**So the model now carries two distinct non-award outcomes that must not be collapsed into one:**

| | `Declined` | `No Bid Submitted` |
|---|---|---|
| Written by | the carrier, deliberately | the close event, by default |
| Reversible while window open | **Yes** — *"status would move out of Declined"* (PRD, Feature 3) | No — it does not exist until the window shuts |
| Asserts | an act | an absence |
| Source | PRD Feature 3; legacy set | Jana story |

**Also consistent with, but not the same as, `IE-1`.** `IE-1 No Carrier Bids Submitted` fires only on *"Quote expiration reached with **zero bids**"* (§7) — quote-level, all carriers silent. Jana's requirement is **per-carrier and applies even when other carriers did bid**. Not a conflict; `IE-1` simply never had a per-carrier counterpart. **Whether partial non-participation warrants any notification is unaddressed by both artifacts** ([[../spotboard|canon]] §10).

**Adjacent open PRD question, not closed by this.** *"Should we add another quote status for carrier history so quotes don't stay in review status?"* (PRD, Feature 7). That asks about **quotes stuck in review**; Jana's asks about **carriers who never answered**. Decidable together, not the same question.

**Weight.** The `Jana story` is a **draft**, so `No Bid Submitted` is the **first named treatment** of non-participation rather than a ratified label. The *concept* is well-founded — three vocabularies visibly lack it and the PRD's auditability requirement needs it. **The exact string is Jana's proposal**, and she says so herself: *"'No Bid Submitted' **or equivalent** non-participation status"*.

---

## 4. RFQ transmission mechanics

On send, **per included/active carrier**, legacy takes one of two paths (PRD, Appendix A.6; Feature 4 legacy note):

| Path | Mechanism | Status handling |
|---|---|---|
| **External rate API** (`mf$extRateSvc`) | Used when the carrier participates in a rate API. | Quote status set from the return code: `0` → success, `3` → decline-type response, anything else → error. Each maps to a specific internal status code. |
| **Email / report** (`mf$report`, template `mfrcoflqr`) | Default. Sent to the carrier's **communication distribution list**. | If no distribution list exists, an **internal notification** is sent instead. |

Every carrier row is then updated with report-log id, quote status, response timestamp and modify user/date.

**Current reality:** the API path is *"hooked up in TMS, but currently no carriers with a rate API participate in overflow. Path must still be supported, but is dormant today."* (PRD, Appendix A.11 #2). Email is not going away: *"many carriers remain low-tech and rely on it. Keep email/report delivery; a modern notification channel can be additive, not a replacement."* (PRD, Appendix A.11 #3). Which integration event owns this in OdysseyONE is **OQ-3** (owner Engineering).

> **Corroborated at v1.5 (2026-08-03).** Kathleen confirms the granularity on the July 30 call: *"**Each shipment will be its own e-mail**"* (July 30 call, 10:01) — one RFQ per shipment per recipient, explicitly **not** merged across shipments for a carrier who happens to receive several (which would require the cross-shipment carrier view that is deferred post-V1; [[../decisions/decision-log|SPB-18]]). This matches the per-recipient signed-token model ([[../decisions/decision-log|SPB-09]], [[../decisions/decision-log|SPB-19]]): one email, one token, one shipment. A separate minor legacy detail from the same-week walkthrough: the carrier bid page *"refreshed every 5 minutes"* (July 28 full, ~28:00), where the wireframe proposes a 1-minute auto-refresh ([[../spotboard|canon]] §6) — a presentational discrepancy, not a schema one. No schema, state-machine or email-catalog fact changes at v1.5.

---

## 5. Configuration surface

### 5.1 Carrier-list configuration (PRD, Feature 2)

- Multiple **named** overflow carrier lists.
- Configurable at four levels: **system-wide, client, shipping site, org.**
- Each list record: `list name`, `equipment type`, `participating carriers (with contact emails)`, `default quote duration`.
- Each list customised by equipment type and **country-to-country origin/destination pair**, based on the client's shipping history.
- Quote **charge types by equipment type** (base, fuel, accessorials) are configurable.
- Client-level enable/disable of overflow is **not in scope** — *"therefore only controlled by not creating an overflow list."*
- A carrier record needs `SCAC`, `name`, `contact email(s)` (PRD, §3).

### 5.2 Automation controls, per client / org / equipment (PRD, Feature 2)

| Control | Purpose |
|---|---|
| Manual review required flag | Forces planner review **regardless of tolerance result**. |
| Quote tolerance percentage above highest routed cost | Primary auto-award test. |
| Quote tolerance monetary cap | Absolute cap above highest routed cost. |
| Quote total cap | Absolute ceiling on the quote total. |
| No-route fallback calculation rule | Per-mile estimate used when no routed (LCE) cost exists. |

**Benchmark definition:** *"the highest **total** routed cost in the route guide, **not necessarily the highest routed cost for the same equipment type** as the overflow bid"* (PRD, Feature 5). Making the benchmark dynamic (average routed cost, market/spot benchmark, other) is a named **future enhancement**, out of MVP scope.

**One threshold, two jobs — flagged for splitting.** *"Tolerance checks currently serve two different purposes: (1) determining whether the system can auto-award the lowest bid without planner review, and (2) determining whether markup should be applied when a planner manually awards a bid. Today, the same tolerance threshold is used for both."* Splitting them is **OQ-12** (owner Engineering/Dave/Doug).

### 5.3 Named legacy system profiles needing an OdysseyONE equivalent or an explicit retirement decision (PRD, Appendix A.9)

| Profile | Purpose |
|---|---|
| `COFL_AFFLM` | Affiliate close-time extension, in minutes, added on top of the standard quote duration — the extra bidding window for the internal affiliate desk (§6). |
| `COFL_DSPAU` | Controls whether cost/tolerance audit data is displayed to users. |
| `FROMEMAIL` | Sender address used on outbound RFQ emails. |

Plus the org-hierarchy-scoped OCM lookups (type 14 / code 69).

**Consumption pattern:** OdysseyONE should read these *"through master data wrapper functions so the application does not depend directly on TMS table structure."* Some custom OCM profiles already have lookup functions; others return only an OCM ID that must be used to fetch satellite data. Which need new wrappers is **OQ-15**. Crucially: *"OCM profiles will be configured in the shipment planning function in OdysseyOne. This overflow application does not need to build this logic, we just need to know what part of the profile we need to access."* (PRD, Appendix B, MTG 4 note).

> **A.9's three profiles are a shortlist, not the inventory.** The PRD's last four pages carry the *full* catalogues — an eleven-row OCM profile table and a thirteen-row system profile table. Both were lost to the text conversion and are transcribed below from the page images. §5.3 above remains the list of profiles the PRD explicitly flags for a build-or-retire decision; §5.4 and §5.5 are the complete populations they were drawn from.

### 5.4 The COFL OCM profile catalogue — complete (PRD p.30, read visually)

**Eleven profiles, all of `RV_DOMAIN = OCM_PROFILE`.** This is the screen the PRD introduces with *"The below screen displays all the OCM profiles for COFL"* — the paragraph survived the conversion, the table did not. Together these eleven **are** the configuration surface described narratively in §5.1–5.2; this table is what that surface is actually made of.

> **Descriptions are truncated where the source page truncates them.** The `RV_MEANING` column runs off the right edge of the page image and is clipped in the source raster — see the caveat at the top of this file. `…[clipped]` marks the cut, and nothing after it is asserted.

| `RV_ABBREVIATION` | `RV_MEANING` (verbatim to the page edge) | Maps to |
|---|---|---|
| `COFL Carriers` | *"Define this profile to specify overflow carrier lists. Click the Overflow Ca…[clipped]"* | The named carrier lists of §5.1 — and the clipped tail is almost certainly *"…Carriers button"*, the `MFFOOC` drill-in shown on p.32 (**INFERENCE**, from the parallel `COFL Charges` row which uses the same construction) |
| `COFL Manual Review` | *"Define this profile to specify whether or not carrier overflow quotes requi…[clipped]"* | The **manual-review flag** (§5.2) — the one that forces planner review regardless of tolerance and fires `IE-3` |
| `COFL Quote Tolerance Percentage` | *"Define this profile to specify a carrier overflow quote tolerance as a perce…[clipped]"* | **Tolerance %** above highest routed cost (§5.2) |
| `COFL Quote Tolerance Cap` | *"Define this profile to specify a flat dollar amount cap for the Cofl Quote T…[clipped]"* | **Tolerance monetary cap** (§5.2) |
| `COFL Quote Total Cap` | *"Define this profile to specify a flat dollar amount cap for the Cofl Quote T…[clipped]"* | **Quote total cap** (§5.2) |
| `COFL Quote No Route` | *"Define this profile to specify a per distance monetary amount to be used as…[clipped]"* | The **per-mile no-route fallback** (§5.2) — the rule whose absence fires `IE-5` |
| `COFL Flexible Pickup` | *"Define this profile to specify the number of workdays past the COFL quote pi…[clipped]"* | **Flexible pickup days** (§1.1). Confirms flexibility is expressed as *workdays past the planned pickup*, which the narrative text never states |
| `COFL Flexible Delivery` | *"Define this profile to specify the number of workdays beyond the COFL quote …[clipped]"* | **Flexible delivery days** (§1.1) |
| `COFL Fuel Schedule` | *"Define this profile to specify the fuel schedule for calculating COFL quote …[clipped]"* | The source of the carrier's **read-only precalculated fuel** (§5.6) |
| `COFL Markup` | *"Use this profile to define overflow quote markup fees. **NO means do not apply**…[clipped]"* | **Markup** (§5.6). Note the explicit opt-out value — markup is not universally applied |
| `COFL Charges` | *"Define this profile to specify overflow carrier quote charges. Click the Ove…[clipped]"* | The **accessorial / charge-code list** (§5.5) |

**What this settles.** Every automation control the PRD describes in prose (§5.2) has a named, discrete OCM profile behind it, and the profile names are one-to-one with the controls. It also **answers `OQ-15` in part**: these eleven are the overflow profiles whose wrapper-function status Engineering has to audit. And `COFL Markup`'s *"NO means do not apply"* establishes that **markup is opt-out per profile**, which no prose in the PRD says.

### 5.5 System profiles — complete (PRD p.31, read visually)

**Thirteen `SP_ID` rows.** Same clipping caveat. Three of these (`COFL_AFFLM`, `COFL_DSPAU`, and the `FROMEMAIL` equivalent) were already known from Appendix A.9; the other ten are new to this canon.

| `SP_ID` | `SP_DESC` (verbatim to the page edge) |
|---|---|
| `CTR_HOST` | *"This profile defines the address of the APEX listener where the carrier tender response application is running.VA…[clipped]"* |
| `CTR_APPID` | *"This profile defines the carrier tender responese APEX application identifier.VALID VALUES: The application ident…[clipped]"* [sic — "responese"] |
| `DEBUG_APEX` | *"Use this profile to turn on apex debug. Apex writes log information to `mf_apex_log`.VALID VALUES: Y/N"* — **complete, not clipped** |
| `ATL_MOD_DT` | *"This profile determines whether or not date modifications are allowed from ACCEPT tender email link.VALID VALUES:…[clipped]"* |
| `COFL_APPID` | *"This profile defines the carrier overflow APEX application identifier.VALID VALUES: The application identifier, e…[clipped]"* |
| `COFV_APPID` | *"This profile defines the carrier overflow **quote viewer** APEX application identifier.VALID VALUES: The application…[clipped]"* |
| `COFA_APPID` | *"This profile defines the carrier overflow **affiliate viewer** APEX application identifier.VALID VALUES: The applicat…[clipped]"* |
| `COFL_AFFLM` | *"This profile defines the additional mins a carrier overflow quote will remain opened for affiliates.VALID VALUES:…[clipped]"* |
| `ORCV_APPID` | *"This profile defines the order date change viewer APEX application identifier.VALID VALUES: The application ident…[clipped]"* |
| `SHOW_BEST` | *"This profile defines whether or not the Apex carrier overflow app will show the BEST BID SO FAR amount.VALID VALU…[clipped]"* — completed by a second screenshot: *"**VALID VALUES: N (default) = do not show, Y = Do show**"* (PRD p.27, read visually) |
| `COFL_NSTLD` | *"This profile determines whether Carrier Overflow has been installed. If Carrier Overflow has not been installed…[clipped]"* |
| `COFL_DSPAU` | *"This profile defines whether or not the carrier overflow show reporting data button is enabled.VALID VALUES: Y or…[clipped]"* |
| `AWS_S3_URL` | *"This profile defines the URL for carrier saftey data sheets stored on an Amazon S3 bucket."* — **complete, not clipped** [sic — "saftey"] |

**Four things this settles.**

1. **The three-application split is confirmed at the configuration layer.** `COFL_APPID` (carrier app), `COFV_APPID` (quote viewer) and `COFA_APPID` (affiliate viewer) are three separately-registered APEX applications — independent corroboration of §6's `200` / `220` / `240` split, from a source that never mentions those numbers. **INFERENCE (short):** `COFV_APPID` is the `220` internal planner app, since the PRD calls the planner screen *"the quote viewer"* elsewhere; `COFA_APPID` is unambiguously `240`.
2. **`AWS_S3_URL` is the MSDS mechanism**, and it explains `OQ-10`'s hesitation verbatim — *"Amazon S3 account maintenance is uncertain"*. The MSDS hyperlink on wireframe Screen 3 resolves through this profile.
3. **`SHOW_BEST` defaults to `N`.** The canon recorded *"leading bid so far"* as configurable/future scope; the profile confirms it is configurable **today, per org, and off by default** — see §5.7.
4. **The whole legacy carrier portal is Oracle APEX**, listener address and all (`CTR_HOST`). That is the stack OdysseyONE is replacing, not merely a screen.

**Not overflow-specific, but in the same table:** `CTR_HOST`, `CTR_APPID` and `ATL_MOD_DT` belong to the **carrier tender response** application — a sibling capability (accept/decline a tender from an email link) that is not SpotBoard. `ATL_MOD_DT` is worth noting anyway: it governs *"whether or not date modifications are allowed from ACCEPT tender email link"* — i.e. Odyssey already has a configurable carrier-changes-dates-from-an-email control on the tender side. See [[../decisions/decision-log|SPB-13]].

### 5.6 Charge codes and the markup line (PRD pp.23–25, read visually)

The accessorial list is OCM-driven (`COFL Charges` → the `MFFOOCC` screen, *"Maintain OCM Overflow Carrier Charges"*). One configured list, read from the page image:

| Code | Description | Label shown |
|---|---|---|
| `HZC` | HAZARDOUS MATERIALS | Haz-Mat |
| `TKM` | TANKERMAN | Tanker Endorsement |
| `TAR` | TARPING CHARGES | Tarping |
| `HT` | HIGHWAY TOLL | Tolls |
| `MSC` | MISC CHARGE | Miscellaneous |

A different client's carrier-facing list shows `Hazmat` · `Pickup` · `Tips` · `Tolls` (p.23) — **direct evidence for `OQ-8`**, which asks whether carriers within the same client have different surcharge code lists. Two different lists are visible in the same document, though at different orgs, so it corroborates *variation* without answering the question as posed.

> ⚠️ **A conflicting requirement arrived 2026-07-29 and is unresolved.** Jana's Bid Edit Page requires *"cost components (**standard accessorial codes same as Odyssey One to be used**)"* (Jana story, screen summary §4). **That sits against the model above**, which is per-OCM-profile configurable by the PRD's own verbatim requirement — *"Accessorial / charge-code list configurable per OCM"* (PRD, Feature 3) — and demonstrably variable, since the two lists in this section come from two different orgs.
>
> **Two readings, unequal in cost.** *(i)* The **code vocabulary** should come from Odyssey One's charge master rather than being invented portal-side — compatible with per-OCM *selection from* that master. *(ii)* **One standard list for everyone** — which contradicts Feature 3 and is falsified by the two lists above.
>
> **INFERENCE (marked): reading (i) is what reconciles the artifacts, and `MFFOOCC`'s `Description Alias` column is the mechanism** — the screen carries a `Charge` code **plus a separate display alias** (PRD p.33, read visually), i.e. shared codes with per-profile labels, which is exactly "standard codes, client-specific presentation". **Nobody has said this.** Jana's sentence is nine words with no field list behind it and she may mean (ii). It also leans on **`OQ-8`** (owner **Dave**), still open. **Ask Jana which she means; do not resolve it by picking the convenient reading.** [[../spotboard|canon]] §9.13.
>
> **One thing the requirement must not license:** exposing Odyssey's internal charge master to carriers. **`QMU` is Odyssey-side and applied after award — carriers never see it** ([[../decisions/decision-log|SPB-15]]).

**Markup is a charge line, not an invisible uplift.** The awarded carrier's cost record on the Tender side (`MFFLCE` → `Quote` tab, p.25) reads:

| | |
|---|---|
| Base Cost | `$100.000 USD` |
| `FUE` FUEL | `$53.430` |
| `HAZ` HAZMAT | `$100.000` |
| `TIP` SERVER TIPS | `$10.000` |
| **`QMU` QUOTE MARKUP** | **`$50.000`** |
| **Total Cost** | **`$313.430 USD`** |

and that same `313.430 USD` is the figure carried on the route-guide row in the Carrier Tender grid. `Quote Type` on that record reads **`Carrier Overflow`**, and `Quote Status` reads `Completed`. See [[../decisions/decision-log|SPB-15]].

### 5.7 `SHOW_BEST` — the leading-bid configuration, end to end (PRD pp.27–28, read visually)

The canon recorded *"leading bid so far"* as configurable/future scope on two one-line PRD mentions. The page images give the whole mechanism:

- **The profile:** `Type = APEX`, `Profile ID = SHOW_BEST`, `Default Value = N`, with a per-organization override grid (`Org Id` / `Org Short Name` / value) — one client shown set to `Y`.
- **What the carrier then sees** — a bid row with columns `Quote Closes` · `Your Quote` · **`Best`** · `Username` · `HH:MM Remaining` · `Action` (`Quote`) · `Action` (`Decline`). Sample values: `06/26/2026 12:53 EST` · `-` · `1,053.43 USD` · `-` · `01:00`.
- The `Best` column is the *only* thing the flag adds. Everything else in that row is always shown.

So: **per-org, off by default, and it exposes an amount only — never the competing carrier's identity.** The `Username` column shows the *carrier's own* submitting user, not the leader's. That distinction matters for the cross-carrier-visibility non-functional (§8), and it is not derivable from the PRD's prose.

**Still open in the PRD's own words, from the same page:** *"Doug to give more details on this screen and the Org Carrier Mode profile and more details on inheritance."* The **inheritance** model — how an org-level profile override resolves against the system default down an org hierarchy — is named as a gap by the PRD itself and is not documented anywhere in it.

### 5.4 Legacy PL/SQL packages requiring OdysseyONE service equivalents (PRD, Appendix A.2)

`mf$cofl` (`create_quote`, `create_quote_details`, `copy_quote`, `move`, `note`, `get_quote_display`) · `mf$genpfc` (`processScac`, `getRequestDate` / `getRequestDateAld`) · `mf$extRateSvc` (`carrierAPI`, `getQuoteByCofl`) · `mf$report` (RFQ email/report generation) · `mf$get` · `mf$convert.time` · `mf$location_p` · `mf$security` · `mf$orc` (order-change audit) · `mf$oif_lock`.

---

## 6. The legacy application split — and the affiliate

Legacy overflow is **three applications**, not one (PRD, Appendix B):

| App | # | Who | What it shows |
|---|---|---|---|
| **Carrier app** | `200` | External carriers, via **Net Native credentials** | *"A carrier sees only its own open quote requests and history."* A per-client profile can additionally show **the best bid so far**. A developer/admin view can see all carriers in a bid; *"that visibility should not be available to normal carrier users."* |
| **Affiliate app** | `240` | Odyssey's **CTNS brokerage team** only | **Sees the lowest quoted amount from every trucker bidding on the shipment**, *"which permits CTNS to potentially win the business if they can bid at a lower price than the current lowest bidder."* A setting grants CTNS **an extra "X" minutes to bid after the bid closes for all other carriers** — this is the `COFL_AFFLM` buffer. |
| **Internal planner app** | `220` | Odyssey planners, via **TMS login credentials** | All bids, active and historical, across carriers. *"OdysseyONE should preserve internal visibility to all carrier bids while maintaining strict carrier-facing isolation."* |

The **affiliate is an internal Odyssey desk competing inside the carrier auction with privileged information and a longer clock.** No other artifact mentions it: it is absent from both meeting transcripts and from all seven wireframe screens, and the PRD never states whether OdysseyONE should rebuild it — the only trace in the requirements is the unanswered *"Confirm whether OdysseyONE needs an equivalent affiliate-close concept"* (PRD, Feature 1 legacy note). See [[../spotboard|canon]] §10.

---

## 7. Notification catalog

Two carrier-facing emails (`CE`) and six internal exception alerts (`IE`). *"Subject line patterns must match those documented below to ensure consistent identification by recipients and operations teams."* (PRD, Feature 11)

> ✅ **Verified visually 2026-07-29 (PRD pp.11–12, read visually).** The source table's columns were split across lines in the text conversion and reconstructed at v1.2 from the table plus the confirming bullet list. **The reconstruction was correct** — all eight rows, and every recipient, trigger and required-action cell, match the source table exactly. The `[conversion damage]` marker is removed.
>
> **One thing the page image adds that the conversion hid.** The requirement bullet *"The system shall support in-app notifications within OdysseyONE as a supplement to email alerts for internal users receiving IE-1 through IE-6 events. See Feature 4."* is **struck through** in the PDF (PRD p.12, read visually) and appears as live requirement text in the conversion. It has been withdrawn from Feature 11. The claim that in-app delivery is future scope **survives anyway**, on an independent and un-struck source: §5's out-of-scope table lists *"In App Notifications — This is a future requirement"* (PRD p.13, read visually).

| ID | Email | Recipient | Trigger | Action / notes |
|---|---|---|---|---|
| **CE-1** | Request for Quote (RFQ) | Carrier contact(s) on the selected overflow carrier list | Planner sends the quote request from OdysseyONE | Carrier reviews shipment detail and submits a bid via the portal. **Order/load IDs must be excluded.** |
| **CE-2** | Quote Awarded | Winning carrier contact(s) | Quote is auto-awarded or manually awarded | Carrier is notified of award. If the awarded carrier declines the subsequent tender, the **next eligible carrier is evaluated and notified** (a second CE-2). |
| **IE-1** | No Carrier Bids Submitted | Configured internal team mailbox(es) per system profile | Quote expiration reached with **zero bids** | Planner manual review required. Consider re-quoting or alternate recovery. |
| **IE-2** | Lowest Cost Carrier Out of Tolerance | " | Quote closed; bids received but lowest bid **exceeds the tolerance threshold** | Planner manual review and award decision required. |
| **IE-3** | Manual Review Required | " | Quote closed with the **Manual Review flag = Yes**, regardless of bid amount or tolerance result | Planner must review all bids and manually award or decline. |
| **IE-4** | Quote Cancelled — Order Change | " | A **transportation-relevant order change** occurred while a **consolidation** quote was open | Quote cancelled automatically; tendering restarts; planner notified to re-evaluate. |
| **IE-5** | No Costed LCE Option | " | Quote closed; **no routed LCE cost exists and no fallback rule is configured** — tolerance cannot be evaluated | Planner manual review required. Quote cannot auto-award. |
| **IE-6** | No Distance for LCE Calculation | " | Quote closed; **no shipment distance available** to calculate an estimated LCE cost for tolerance | Planner manual review required. Quote cannot auto-award. |

**Subject-line patterns** (PRD, Feature 11): carrier emails use `"Request for Quote…"` and `"Quote Request [ID] Awarded"`; internal exception alerts use the `"Attention —"` prefix.

**CE-1 payload:** Quote ID, basic load details (equipment type, origin, destination, pickup and delivery dates), and a link to the carrier portal quote form. **Order ID and Load ID excluded** ([[../decisions/decision-log|SPB-05]]).

**Recipients** for IE-1…IE-6 are configurable per client and org via system profiles. In-app notification of the same six events is a **supplement to email, future scope** (PRD, Feature 4, Feature 11, §5).

There is also an unlisted internal exception in Feature 4's trigger bullets — *"An order change or cancellation invalidates an open quote"* — annotated **"(no notification for this today)"**, i.e. a requirement without a catalog entry unless IE-4 is meant to cover it. IE-4's trigger names only the **consolidation** case, so single-load invalidation appears to have **no email**. **[Possible gap in the PRD, not in the conversion.]**

---

## 8. Data-adjacent non-functional constraints

| Dimension | Requirement (PRD, §6) |
|---|---|
| **Time zone** | *"Legacy makes heavy, exact use of time-zone conversion — dates are entered/displayed in the consignor/consignee local time zone and stored as GMT. This precision must be preserved… date-handling bugs here directly affect quote validity windows and carrier date commitments."* Free-text dates are parsed against the relevant org time zone and stored as GMT (Appendix A.7). |
| **Token expiry** | Signed carrier access tokens must expire **no later than quote close time**. |
| **Speed** | Bid submissions and status updates reflected to internal users **within 30 seconds**. |
| **Security** | Carrier access scoped to **their own quote requests only**; cross-carrier visibility not permitted. (Note the tension with the affiliate app, §6, and with the org-scoping limitation in [[../spotboard|canon]] §8.) **New 2026-07-29:** this requirement is satisfied by **both** sides of the carrier-access disagreement — it forbids *cross-carrier* visibility only, and org-level isolation holds under a tokenized link and under a username/password login alike. **So the disagreement in [[../spotboard|canon]] §15 is not a security dispute**, and must not be presented as one. |
| **Configurability** | Rules configurable per client, org and equipment type **without code changes**. |
| **Carrier usability** | The carrier bid flow **must be operable on mobile browsers**. |
| **Resilience** | Automation failures must degrade gracefully into manual planner workflows with clear error messaging. |
| **Scalability** | A single load must support **multiple sequential quote cycles** with full history preserved. |
| **Auditability** | Every response, closure reason and award decision logged and traceable. |

### Date validation rules (PRD, Appendix A.7)

- Pickup must be **after "now"**; delivery after "now" when there is no pickup; delivery **strictly after** pickup. Both validated against ship/delivery PUDO ranges.
- **Multi-stop block:** if the consolidation has stop-offs, pickup/delivery dates **cannot be edited here** — the user is directed to the consolidation shipment screen (legacy `MFFCS2`). Confirmed to carry forward unchanged (Appendix A.11 #6); tracked as **OQ-11**.
- **Staleness / concurrency:** an active tender on the load **hard-stops** send/modify/close. If the load/consolidation goes inactive, an OPEN quote is **auto-closed** and the form disables.
- **Order change:** an outstanding order change on the consolidation blocks tendering activity and disables insert/update.
- **Award double-guard:** warns if the carrier's quote was already processed, or if the required resource lock cannot be obtained.
- **Single instance:** only one MFFCOFL window per session (a legacy Forms constraint; *"Only one active quote workflow may exist per load at a time"* is the business rule that matters — PRD, §2).

---

## See also

- [[../spotboard|SpotBoard — Domain Canon]] — narrative, surfaces, actors, conflicts, open questions
- [[../decisions/decision-log|SpotBoard — Decision Log]]
- [[../_moc|SpotBoard — Map of Content]]
- [[../../shipments/domain-analysis|Shipments — Domain Analysis]] — §3 Tendering, §4 Spot Bidding / Overflow

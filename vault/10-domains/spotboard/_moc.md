---
title: SpotBoard Domain — Map of Content
domain: spotboard
type: moc
tags: [moc, spotboard, overflow, loadboard, tendering, carriers, bidding, carrier-portal]
date: 2026-07-29
status: active
---

# SpotBoard — Map of Content

Entry point for the SpotBoard domain knowledge base.

**SpotBoard** (formerly *Overflow*) is Odyssey's spot-market bidding channel: when contracted carriers won't take a shipment, a profile-derived set of carriers is invited to **bid a price**, one is awarded, and the winner is handed back to the Shipments Tender tab. PM: **Kathleen O'Donnell**. It replaces the legacy TMS `MFFCOFL` screen with a native OdysseyONE experience, including an **absorbed carrier portal**.

**Not to be confused with [[spotboard#4-loadboard-vs-spotboard-h1--resolved|Loadboard]]** — a *separate* channel that automatically posts shipments to Odyssey's own internal brokerage desks. Automated vs planner-initiated; internal vs external. Resolved 2026-07-29.

> **v1.2 — canon promoted to `active`.** The blocking artifact has landed: the **Overflow Bidding PRD v2.0** (07/02/2026), the document Kathleen's wireframe was derived from, plus a same-day written note from her settling carrier authentication. v1/v1.1 were `draft` on exactly one condition — *"draft until the PRD and user stories land and an update cycle runs"* — and that condition is met. The product's own open questions, with named owners, are tracked in [[spotboard#10-open--tbd|§10]].

> **v1.3 — conversion-damage recovery.** No new artifact: the **same PRD, re-read from its source PDF pages as images**, recovering what the MarkItDown text conversion destroyed. The Appendix B screenshots are now described (**canon §14**), pp.30–33's two profile catalogues are transcribed ([[data/quote-model|data/quote-model]] §5.4–5.5), and the Appendix A.5 / Feature 11 reconstructions are **verified correct** and their caveats removed. A second class of damage was found — **the conversion silently flattened strikethrough**, so three of the PRD's seventeen open questions read as live when they are retired ([[decisions/decision-log|SPB-14]]). **Fourteen are live.** Content recovered this way is cited `(PRD p.NN, read visually)`.

> **⚠️ v1.4 — the carrier-access disagreement.** One new artifact: **a draft user story by Janardhana (Jana), PM for Shipments**, plus a one-sentence meeting note from Manuela. It specifies a **username/password carrier portal**, which is incompatible with [[decisions/decision-log|SPB-09]]'s tokenized-link model for v1 — and *"in today's meeting Jana and Irina were opposing Kathleen's email link idea"* (meeting context, 2026-07-29). **Two named PMs, two positions, same day, neither superseded.** The canon **records the disagreement and resolves nothing** ([[spotboard#15-the-carrier-access-disagreement--two-pms-two-models-unresolved-new-at-v14|canon §15]], [[decisions/decision-log|SPB-16]] — whose `Decided` field says outright that nothing is decided). The story's most durable content is **orthogonal** to the fight: first-class **non-participation semantics** ([[decisions/decision-log|SPB-17]]). `status: active` is **retained deliberately** — the canon never claimed `OQ-1` was formally closed, so this adds a second position to an already-open question rather than reopening a settled one; the justification is stated at the top of the canon. **Nothing was closed by this cycle.**

## Canon

- [[spotboard|SpotBoard — Domain Canon]] — the source-of-truth document. Lifecycle placement, relationship to the Tender tab, screen anatomy (internal + carrier-facing), vocabulary and status sets, actors and access model, conflicts, open questions, **wireframe ↔ PRD reconciliation (§12)**, MVP scope boundary and non-functionals (§13), **legacy screen evidence (§14)**, **the carrier-access disagreement (§15, new at v1.4)**.
- [[data/quote-model|Quote Data Model, States & Notification Catalog]] — **new at v1.2, extended at v1.3 and v1.4.** Field-level schema (quote header + carrier-response rows), the `Draft → OPEN → CLOSED` state machine and button-enablement matrix, the four carrier-eligibility rules, RFQ transmission mechanics, the configuration/OCM surface, the three legacy applications, and the full `CE`/`IE` email catalog. **At v1.3:** the complete OCM and system profile catalogues, the charge-code list, the markup line, and the `SHOW_BEST` leading-bid mechanism. **New at v1.4: §3.4 non-participation** — the value none of the five status vocabularies names — plus a sixth carrier-facing status set and a conflicting accessorial-code requirement (§5.6).
- [[decisions/decision-log|Decision Log]] — `SPB-01`…`SPB-17`, traced to source. `SPB-13`…`SPB-15` come from the visual-recovery pass rather than from a new artifact. **`SPB-16` is the log's first entry that records a *contested* question instead of a decision** — it states both PMs' positions and chooses neither.

## The three questions this canon was built to answer

| # | Question | Short answer — full evidence in [[spotboard]] |
|---|---|---|
| H1 | Is SpotBoard an umbrella containing *overflow* and *lowboard*? | **No — resolved at v1.1, corroborated at v1.2.** Overflow **is** SpotBoard (renamed). "lowboard" was a mishearing of **load board**; **Loadboard** is a *separate process* — automated, posting to Odyssey's internal brokerage desks. The PRD independently treats them as peer destinations of failed tendering (`OQ-5`). See [[spotboard#4-loadboard-vs-spotboard-h1--resolved|§4]], [[decisions/decision-log|SPB-07]]. |
| H2 | Is SpotBoard an extended Shipments Tender tab? | **Split at v1.2 — right about the process, premature about the placement.** *Process:* confirmed **verbatim** by the PRD — *"tender is a separate event. They can be awarded the load, but they do not get assigned to the load until it is tendered."* SpotBoard feeds Tender and is not a superset of it. *Placement:* the PRD leaves the launch point **open**, owned by **David**, with four candidates — one of which is *"display in existing Tender tab like TMS does today."* See [[spotboard#3-relationship-to-the-shipments-tender-tab-h2|§3]], [[decisions/decision-log|SPB-11]]. |
| H3 | What is the canonical spelling? | **`SpotBoard`** — one word, capital S, capital B. The PRD says *"Overflow"* throughout because it **predates the rename**; that is chronology, not dissent. See [[spotboard#5-naming-h3|§5]], [[decisions/decision-log|SPB-01]]. |

## Settled at v1.2

| Question | Answer |
|---|---|
| **How do carriers authenticate?** | ⚠️ **This answer was reopened at v1.4 — see "Contested at v1.4" below. The v1.2 record is left as written:** *"v1: a tokenized email link scoped to the recipient — no login at all. Deferred until user management exists: a logged-in area showing all quotes, time remaining, and history. Any user from a carrier org will then see **all** that org's quotes — the limitation Tracking already has, inherited rather than invented."* [[spotboard#8-actors|§8]], [[decisions/decision-log|SPB-09]] — **still the accurate record of Kathleen's position, and not withdrawn.** |
| **Is the carrier portal ours or a separate system?** | **Ours — absorbed, not wrapped.** Legacy is TMS app `200` on Net Native credentials; the PRD rebuilds it *"natively within OdysseyONE's Carrier Portal."* What stays in TMS is data (OCM profiles), not UI. [[decisions/decision-log|SPB-10]]. |
| **When may a SpotBoard quote start?** | Three triggers — guide exhausted, **no carriers for the lane**, or **lead time too short**. Not gated on exhaustion. The tender lock is **reciprocal**. [[decisions/decision-log|SPB-12]]. |
| **What do `IE-1…IE-6` and `OCM` mean?** | Six internal exception alert **emails** (catalogued in [[data/quote-model|data/quote-model]] §7). `OCM` = **Org Carrier Mode** — confirmed at v1.3 by the screen title itself, `Maintain Organization Carrier Mode Profile (MFFOCM)`. |

## Settled at v1.3

| Question | Answer |
|---|---|
| **Can carriers change pickup/delivery dates in legacy — or not?** *(the PRD appeared to say both)* | **They choose within a planner-set `Earliest`/`Latest` window; they do not propose dates.** Both PRD passages were true of different halves of the same feature. `OQ-6` is therefore a genuine net-new question. [[decisions/decision-log|SPB-13]], [[spotboard#9-conflicts-and-tensions|§9.8]]. |
| **How is markup actually applied?** | As a discrete **`QMU QUOTE MARKUP` charge line** on the awarded carrier's cost record — itemised beside the carrier's own charges, not an opaque uplift. Opt-out per OCM profile. [[decisions/decision-log|SPB-15]]. |
| **What are the system profiles on pp.30–32?** | Recovered — **11 `COFL *` OCM profiles** (one per automation control) and **13 system profiles**, including `SHOW_BEST`, `COFL_AFFLM`, `AWS_S3_URL` and three separate APEX application IDs confirming the `200`/`220`/`240` split. [[data/quote-model|data/quote-model]] §5.4–5.5. |
| **Are all seventeen PRD open questions live?** | **No — fourteen.** `OQ-4`, `OQ-5` and `OQ-16` are struck through; the text conversion hid it. [[decisions/decision-log|SPB-14]]. |

## Contested at v1.4 — recorded, not resolved

**The domain's largest open question, displacing the affiliate.** Two named Product Managers, two incompatible answers, both current as of **2026-07-29**, neither superseded. **This vault does not pick one.**

| | **Kathleen O'Donnell** — PM, SpotBoard; owner of the PRD | **Janardhana (Jana)** — PM, Shipments |
|---|---|---|
| **How does a carrier reach its bid?** | A **per-recipient tokenized email link. No login in v1** — *"we don't have user management to control which carrier users can log in"* (Kathleen note, 2026-07-29) | A **username/password carrier portal** — Login, Forgot/Reset Password, Change Password, Profile, Notification Preferences, Dashboard, Bid Listing, Bid Details, Bid Edit, Bid History, FAQ, Contact Support (Jana story, screen summary §§1–6) |
| **Reason given** | A named blocking constraint, corroborated by the PRD (§1) | **None.** The story specifies a portal without arguing for one or mentioning the alternative |
| **Artifact** | Dated verbatim note, this domain's PM | **Unpublished draft** (*"Unsaved changes"*, no Jira key), a neighbouring domain's PM |

**Genuinely incompatible: one thing — whether v1 ships a login.** Read as two accounts of v1, they cannot both be built.

**Only apparently incompatible:** the portal screens themselves (Kathleen *wants* them — *"when we have user management, we can add a place where the user can login and see all quotes… and see historical quotes"*); email-versus-portal as an either/or (a token is a URL and can open a portal screen); and security (the PRD forbids *cross-carrier* visibility only, and org-level isolation holds under both — **this is not a security dispute**).

**Two findings about Jana's position** ([[spotboard#15-the-carrier-access-disagreement--two-pms-two-models-unresolved-new-at-v14|canon §15.2]]): it **presupposes the user management Kathleen says is missing and never acknowledges the dependency** — the inventory has Login, Forgot Password and Change Password and **no registration screen at all**; and it **does not solve Kathleen's actual problem**, which is per-rep scoping, because the story is org-scoped throughout (*"a **carrier** logs into"*, `SCAC`). **A password proves which company is at the keyboard no better than a shared inbox does.**

**INFERENCE, marked and proposed by nobody:** the dispute may be about **sequencing, not architecture** — Jana's inventory closely describes Kathleen's own deferred target state. One question to Jana settles it: **is this v1 scope, or the target state?**

**What would settle it:** a **user-management timeline** (nobody has dated, scoped or owned it — and neither position survives the answer unchanged); **Thomas ratifying `OQ-1`**, the mechanism the PRD designed for this and never used; Irina's position in her own words; and a **jurisdiction statement**, which evidence cannot supply. Full table in [[spotboard#15-the-carrier-access-disagreement--two-pms-two-models-unresolved-new-at-v14|canon §15.4]].

## Settled at v1.4 — the part of Jana's story that is orthogonal to the fight

| Question | Answer |
|---|---|
| **How is a carrier that simply never answered represented?** | **It wasn't.** Legacy leaves the row at `Sent` forever; the wireframe shows an em-dash; the PRD's outcome set is quote-level. Jana names it: **`No Bid Submitted`**, assigned at window close, per carrier, terminal — with **no explicit decline required**, expiry as the natural non-participation event, and an audit trail of who did not bid. **Extends the five vocabularies, conflicts with none** — provided rule 2 is read as *"decline not required"*, not *"decline removed"*. Two distinct non-award outcomes now exist and must not be collapsed: an **act** (`Declined`) and an **absence** (`No Bid Submitted`). [[decisions/decision-log|SPB-17]], [[data/quote-model|data/quote-model]] §3.4. |
| **Is the portal absorbed or wrapped?** *(re-test)* | **[[decisions/decision-log|SPB-10]] survives, corroborated in direction not in strength.** *"(Odyssey One Integrated)"* and *"As Odyssey One, I want to…"* corroborate; but the story pairs them as two systems — *"The Overflow Portal **and** Odyssey One must track…"* — and *"Integrated"* is weaker than the PRD's *"rebuilt natively within"*. |
| **Do carriers get shipment identifiers?** *(re-test)* | **[[decisions/decision-log|SPB-05]] survives; the story contradicts it at field level.** Jana puts a **`shipment ID` filter** on two carrier-facing screens and specifies *"full shipment information"*, against the PRD's verbatim *"No IDs will be shared for Order/Shipment to protect from carriers 'stealing the load'"*. **INFERENCE: boilerplate, not a considered reversal** — the story never mentions the concern. **Flag to Jana anyway.** [[spotboard#9-conflicts-and-tensions|§9.14]]. |
| **Where is SpotBoard launched from?** *(re-test)* | **[[decisions/decision-log|SPB-11]] untouched** — the story is silent on the internal launch point. Recorded as an absence so it is not mistaken for agreement. |

## Does Loadboard need its own domain folder?

**Recommended: still not yet.** Unchanged at v1.2 — the PRD corroborates the boundary but adds nothing about Loadboard itself, not even how a shipment gets onto it. There is no artifact *about* it: no screen, no field list, no status set, no named PM. It lives as boundary material in [[spotboard#4-loadboard-vs-spotboard-h1--resolved|§4]] and should not accumulate detail beyond that. **Promote to `vault/10-domains/loadboard/` when any of:** a Loadboard-specific artifact arrives; a PM other than Kathleen owns it; or Odyssey-One builds the `Loadboard` module the nav already reserves.

## Bordering canon

- [[../shipments/domain-analysis|Shipments — Domain Analysis]] — §3 Tendering and §4 Spot Bidding / Overflow, the pre-existing seam SpotBoard sits on. **Two of its statements are flagged as stale by v1.2** (the carrier portal as *"a separate system"*, and SpotBoard entry requiring full route-guide exhaustion). Not edited by this cycle — raised for the Shipments owner.
- [[../shipments/decisions/decision-log|Shipments — Decision Log]] — notably `DEC-01` (Routing Guide → Tender) and `DEC-03` (tender statuses, which govern the spot row — the wireframe's `Tendered — Pending` is drift).
- **The transportation-relevant change definition is Jana's**, and SpotBoard's quote-invalidation trigger depends on it. The PRD deliberately refuses to duplicate the field list.
- [[../carriers/_moc|Carriers domain]] — carrier profiles / OCM data are SpotBoard's list source.
- [[../../20-cross-cutting/global-search/global-search|GlobalSearch]] — quote-ID-first search is a PRD requirement, because *"carriers may contact planners with only the quote number and no order or load number."*
- **Tracking** — SpotBoard inherits its org-scoped carrier access model. Whatever fixes it there fixes it here.

## Raw sources

Archived to `vault-sources/10-domains/spotboard/`:

| Artifact | Date | Notes |
|---|---|---|
| `OdysseyONE_Overflow_Bidding_PRD_v2.md` | 07/02/2026 | **The authoritative spec.** 33 pages, "Development Ready", owner Kathleen O'Donnell. Reached us as a MarkItDown conversion which shredded two tables, stripped every Appendix B screenshot and lost pp.30–32. **Repaired at v1.3 by reading the source PDF pages as images** — the reconstructions proved correct, the screenshots and profile tables are recovered, and a further defect surfaced (flattened strikethrough). Source of `SPB-10`…`SPB-15`. **Residual damage:** two profile-description columns are clipped in the source raster itself and cannot be recovered from this artifact — re-request as text if the full wording is needed. |
| **The PRD's source PDF** — `OdysseyONE_Overflow_Bidding_PRD_v2.pdf` | 07/02/2026 | Same document, read **visually** at v1.3. Not a separate artifact — the same spec, undamaged. Cited `(PRD p.NN, read visually)`. **Always prefer it over the `.md` for anything tabular, any screenshot, and anything whose meaning could ride on formatting.** Source of `SPB-13`, `SPB-14`, `SPB-15` and canon §14. |
| `Kathleen note — carrier portal auth 2026-07-29.md` | 2026-07-29 | Verbatim written note from SpotBoard's PM; the v1 carrier-authentication model. Source of `SPB-09`. **No longer the sole newest artifact** — the Jana story is dated the same day and takes the opposite position, so **recency no longer produces a tie-break on carrier access** (canon Precedence, rule 4). |
| `Jana story — Overflow Portal bid review and submission.md` | 2026-07-29 | ⚠️ **A draft, not a published story** — status *"Unsaved changes"*, no Jira key, no assignee, no sprint — by **Janardhana (Jana), PM for Shipments**, i.e. a neighbouring domain's PM. Relayed by Manuela with a one-sentence meeting note (cited separately as `meeting context, 2026-07-29`), which is **a report and not a transcript** and is the only evidence for **Irina's** reported opposition. Source of `SPB-16` (the contest) and `SPB-17` (non-participation). **Also uses the pre-rename name "Overflow Portal"** — and unlike the PRD it cannot plead chronology, since it postdates the rename by a day; Jana was not in the meeting where the rename happened. **`SPB-01` is not reopened.** |
| `SpotBoard Wireframes v1 — OdysseyONE.html` | 07/28/2026 | Kathleen's own 7-screen prototype, **derived from the PRD**. Its medium-confidence caveat is now lifted wherever it agrees with the PRD — which is most places. |
| `Overflow meeting 1.txt` | — | First SpotBoard meeting. Kathleen O'Donnell, Irina Jachimek, Manuela Ramirez. The live rename. |
| `Carrier Load Board vs Overflow Board meeting.txt` | 2026-07-29 | Kathleen, Saikat Ghosh (Cognizant), David Johns, Doug, "Kumar". Short and lossy; settles the Loadboard boundary. Source of `SPB-07`, `SPB-08`. |

**Most valuable open follow-ups — reordered at v1.4.** (0) **The carrier-access disagreement, and the three things that would settle it:** a **user-management timeline** (undated, unscoped, unowned in every artifact we hold — and the single fact both positions depend on); **Thomas's ratification of `OQ-1`**, now arbitration rather than formality, and note he must choose among **three** models where the PRD offered two; and **one question to Jana — is her portal v1 scope or the target state?** See the "Contested at v1.4" section above. **This displaces the affiliate as the domain's largest unknown.** Then, unchanged in substance: (1) **is the affiliate/CTNS desk in scope for OdysseyONE?** — an internal team that bids inside the carrier auction while seeing the leading bid and getting extra time. *Narrowed at v1.3: what leaks is a price, never an identity, and the same disclosure is available to any client with `SHOW_BEST = Y`, so this is a configuration question rather than an architectural exception* ([[spotboard#9-conflicts-and-tensions|§9.9]]); (2) **Doug's answer on how Loadboard settings decide when a shipment goes to the load board** — still missing; (3) **Doug's answer on OCM profile inheritance** — *new at v1.3*, named as a gap by the PRD itself and now the highest-value configuration question, since profiles demonstrably resolve down an org hierarchy with no documented rule; (4) **Thomas's formal confirmation of `OQ-1`**, which Kathleen has already answered in substance; (5) **the two clipped profile-description columns on PRD pp.30–31**, re-requested as text — the only conversion damage this pass could not repair.

## Backlog

Domain-tagged items live in the unified backlog at `vault/60-backlog/`. Filter by `domain: spotboard`. Nothing filed yet — this domain is at understanding stage only.

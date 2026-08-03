---
title: SpotBoard — Domain Canon
domain: spotboard
type: canon
tags: [spotboard, overflow, loadboard, tendering, carriers, bidding, carrier-portal, quotes]
date: 2026-07-29
status: active
---

# SpotBoard — Domain Canon (v1.4)

**Status: active — deliberately retained; see the note below.** The blocking artifact has landed. v1 and v1.1 were explicitly `draft` on one condition — *"the Overflow Bidding PRD v2.0 and user stories are referenced but not yet in our hands; this canon is draft until they land and an update cycle runs."* The PRD is now in hand and integrated, along with a same-day written note from Kathleen. Fourteen product open questions remain (three of the seventeen turn out to be struck through), tracked with named owners in §10 — they are **the product's**, not gaps in our understanding of the domain.

> **Version note.** The task brief for this cycle described the canon as v1.2 and asked for a bump to v1.3. **v1.3 already existed** — it was the conversion-damage recovery pass, logged in the changelog below and in [[decisions/decision-log|SPB-13]]…[[decisions/decision-log|SPB-15]]. Bumping to v1.3 again would have overwritten that identity, so this cycle is **v1.4**. Flagged rather than silently reconciled.

> **Why `status: active` survives an unresolved architectural disagreement.** v1.4 records a live conflict between two named PMs about how carriers reach their bids (§15). That does **not** downgrade the canon, for one specific reason: **this canon never claimed the question was formally closed.** [[decisions/decision-log|SPB-09]] recorded Kathleen's model as *"the working v1 model on PM authority; `OQ-1` answered in substance, not formally closed"*, with the formal decision assigned to **Thomas** (PRD, §3, §8 `OQ-1`). v1.4 therefore does not reopen something settled — it adds a **second named position** to a question the canon already carried as formally open, and it names who else now holds a stake in it. `status` describes whether our *understanding* is reliable, not whether the *product* has decided; §10 has always separated the two. Fourteen PRD questions were already open at `active`. A contested `OQ-1` is the fifteenth open product question, honestly recorded, not a defect in the canon. **If this canon ever asserts one of the two positions as the answer, that is the moment to downgrade it.**

**v1.4 changelog (2026-07-29) — the carrier-access disagreement.** One new artifact: **a draft Jira-style user story by Janardhana (Jana), PM for Shipments**, plus meeting context supplied by Manuela. It is a **draft** (*"Unsaved changes"*), it carries no Jira key, and it is authored by a PM from a **neighbouring domain** — SpotBoard's PM is Kathleen (§11). Weighted accordingly throughout.

- **New §15 — the carrier-access disagreement, recorded and not resolved.** Kathleen holds a per-recipient tokenized email link for v1 *because user management does not exist*; Jana's story specifies a **full carrier portal with username/password authentication**. Both are current as of 2026-07-29, both are named PMs, neither is superseded. §15 states each position, what each presupposes, what is genuinely incompatible versus only apparently so, and what would settle it. **[[decisions/decision-log|SPB-16]] records the contest; it decides nothing.**
- **Non-participation becomes a first-class concept** — *"No Bid Submitted"* as a named status, no explicit decline required, expiry as natural non-participation, and a per-carrier audit trail of who did not bid. **This is the story's most durable contribution and it is orthogonal to the auth fight.** It names a value that **none of the five existing status vocabularies names** (§7; [[data/quote-model|data/quote-model]] §3.4). [[decisions/decision-log|SPB-17]].
- **Jana's portal screen inventory is recorded as a proposed target-state surface** (§15.5), kept **deliberately separate** from Kathleen's seven wireframe screens (§6). The two are not merged into one anatomy; each is attributed.
- **Two new conflicts** (§9.13, §9.14): the story's *"standard accessorial codes same as Odyssey One"* against the PRD's per-OCM-configurable charge list; and the story's carrier-facing **`shipment ID` filter** against [[decisions/decision-log|SPB-05]], which withholds order/shipment identifiers from carriers on the PRD's own verbatim requirement.
- **Standing verdicts re-tested:** [[decisions/decision-log|SPB-05]] **survives** (and the story contradicts it at field level); [[decisions/decision-log|SPB-09]] **survives as the record of Kathleen's position but is now contested**; [[decisions/decision-log|SPB-10]] **survives, corroborated in direction with one wording wrinkle**; [[decisions/decision-log|SPB-11]] **untouched — the story is silent on the internal launch point.**
- **Nothing was closed by this cycle.** Recorded explicitly so the absence is not mistaken for an oversight.

**v1.3 changelog (2026-07-29) — conversion-damage recovery pass.** No new artifact. The **same PRD, read again from the source PDF pages as rendered images**, recovering everything the MarkItDown text conversion destroyed. Content recovered this way is cited `(PRD p.NN, read visually)` to distinguish it from text-conversion content.

- **New §14 — Legacy screen evidence.** All ten Appendix B screenshots described. This is the only visual record of what SpotBoard is replacing, and it was entirely absent from v1.2.
- **PRD pp.30–33 recovered** — two complete profile catalogues (11 OCM profiles, 13 system profiles) plus the OCM configuration screens. Now in [[data/quote-model|data/quote-model]] §5.4–5.5. **Closes the v1.2 open item *"What are the system profiles on pp.30–32?"***
- **Appendix A.5 and the Feature 11 email table verified visually. Both prior reconstructions were correct** — no values changed; the `reconstructed` caveats are removed ([[data/quote-model|data/quote-model]] §2.2, §7).
- **A second class of conversion damage found: strikethrough was silently flattened.** `OQ-4`, `OQ-5` and `OQ-16` are **struck through** in the PDF and read as live in the conversion — [[decisions/decision-log|SPB-14]]. So did one Feature 11 requirement bullet.
- **Conflict §9.8 (can carriers change dates?) RESOLVED** — the legacy carrier portal's own bid screen shows a `Flexible Dates` panel with editable pickup and delivery bounded by Earliest/Latest. [[decisions/decision-log|SPB-13]].
- **Markup's mechanism recovered** — it is a discrete `QMU QUOTE MARKUP` charge line on the awarded carrier's cost record, not an invisible uplift. [[decisions/decision-log|SPB-15]].
- **A fifth status vocabulary recovered** — the legacy carrier-row set (`Sent` · `Excluded` · `Done` · `Declined` · `Accepted`), §7.
- **Two caveats survive**, both stated where they bite: the `RV_MEANING` / `SP_DESC` columns on pp.30–31 are clipped *in the source raster* and cannot be recovered from this artifact; and formatting-carried meaning elsewhere in the text conversion remains unverified.

**v1.2 changelog (2026-07-29).** Two new artifacts: the **PRD** (the document the wireframe was derived from) and **Kathleen's written note on carrier portal authentication**, dated today. Changes:

- **Carrier authentication is settled for v1** — a per-recipient tokenized email link; the logged-in carrier area is deferred until user management exists (§8, [[decisions/decision-log|SPB-09]]).
- **The carrier portal is being absorbed into OdysseyONE**, not wrapped — closing the v1.1 "surprise" against the Shipments canon (§8, [[decisions/decision-log|SPB-10]]).
- **New §12 — wireframe ↔ PRD reconciliation.** The wireframe's medium-confidence caveat is lifted where the PRD agrees; the divergences are itemised with a read on each.
- **New §13 — MVP scope boundary, non-functionals and the PRD's user stories.**
- **New field-level reference:** [[data/quote-model|Quote Data Model, States & Notification Catalog]].
- **SpotBoard's launch point is an open PRD decision owned by David**, not settled — [[decisions/decision-log|SPB-03]] is downgraded to a proposal by [[decisions/decision-log|SPB-11]].
- **SpotBoard entry is not gated on route-guide exhaustion** — three distinct triggers, closing conflict §9.3 ([[decisions/decision-log|SPB-12]]).
- H2, SPB-02, SPB-05, SPB-07 re-tested against the PRD (§3, §4, §12). All survive; two are refined.
- TBDs closed: the meanings of `IE-1…IE-6`, the expansion of **OCM**, the carrier-portal ownership question, the entry-condition conflict, and the `Tendered — Pending` status question.

## Sources

| Ref | Artifact | What it gives |
|---|---|---|
| `PRD` | `OdysseyONE_Overflow_Bidding_PRD_v2.md` — **Overflow Bidding PRD v2.0, "Development Ready", 07/02/2026.** Owner: Product Management, Kathleen O'Donnell. Supersedes v1.0 (07/01/2026). 33 pages. Reached us as a MarkItDown conversion of a PDF; **at v1.3 the PDF pages were also read directly as images** to repair the conversion's damage. Cited as `(PRD, Feature N)` / `(PRD, §N)` / `(PRD, Appendix A.N)` for text-conversion content, and as `(PRD p.NN, read visually)` for content recovered from the page images. | Objectives, scope, actors, the full bidding lifecycle, business rules, field-level legacy baseline, the email catalog, the MVP scope boundary, non-functionals, user stories, and 17 numbered open questions with owners |
| `Kathleen note` | `Kathleen note — carrier portal auth 2026-07-29.md` — verbatim written message from Kathleen O'Donnell to Manuela Ramirez, **2026-07-29**. Cited as `(Kathleen note, 2026-07-29)`. | The v1 carrier authentication model and what is deferred; the org-scoping limitation inherited from Tracking |
| `meeting 1` | `Overflow meeting 1.txt` — first SpotBoard meeting. Kathleen O'Donnell, Irina Jachimek, Manuela Ramirez. Cited as `(meeting 1, M:SS)`. Also cited as `(transcript, M:SS)` in passages written at v1. | Intent, process, legacy-TMS behavior, the live rename moment |
| `wireframe` | `SpotBoard Wireframes v1 — OdysseyONE.html` — 7-screen low-fidelity prototype Kathleen built herself, dated 07/28/2026, **derived from the PRD**. Cited as `(wireframe, Screen N)`. | Anatomy, vocabulary, field/column inventory, status sets, the rename in settled use |
| `loadboard transcript` | `Carrier Load Board vs Overflow Board meeting.txt` — 2026-07-29 (assumed; undated in-artifact). Kathleen O'Donnell, Saikat Ghosh (Cognizant), David Johns, Doug, "Kumar". Cited as `(loadboard transcript, M:SS)`. | The Loadboard ↔ Overflow/SpotBoard boundary; Loadboard's audience and trigger model; Doug's role |
| `Jana story` | `Jana story — Overflow Portal bid review and submission.md` — **draft** Jira-style user story by **Janardhana (Jana), PM for Shipments**, relayed by Manuela Ramirez, **2026-07-29**. Status shown as *"Unsaved changes"*; **no Jira key, no assignee, no sprint.** Cited as `(Jana story, <section>)` — e.g. `(Jana story, AC "Status Visibility in Odyssey One")`, `(Jana story, Business Rules)`, `(Jana story, screen summary §4)`. | A carrier portal with username/password authentication and a twelve-screen inventory; **first-class non-participation semantics**; an accessorial-code alignment requirement |
| `meeting context` | Manuela Ramirez's written framing accompanying the Jana story, **2026-07-29**. Cited as `(meeting context, 2026-07-29)`. **Not a transcript** — a one-sentence report of a meeting we hold no recording of. | The only evidence that Jana **and Irina** opposed Kathleen's email-link model in a live meeting, and that Kathleen holds her position *because* user management does not exist |

### Precedence

**None is automatically primary — all five together are the evidence.** Where they disagree, both readings are recorded under **Conflicts** (§9) and the reconciliation is itemised in §12. Three deliberate tie-breaks, applied by **recency** and **specificity**, and stated wherever they are used:

1. **The PRD outranks the wireframe on behavior and business rules.** The wireframe is Kathleen's reading of the PRD, self-labelled *"Confidence: medium… AI-generated draft"*. Where the two agree, that caveat is lifted (§12).
2. **The PRD does not reopen the rename.** It is dated 07/02/2026 and therefore **predates** the live Overflow → SpotBoard rename in meeting 1. It says *"Overflow"* throughout, which is not evidence against `SpotBoard` — it is evidence of its own date. [[decisions/decision-log|SPB-01]] stands. *Overflow* survives in this canon only inside verbatim quotes and legacy identifiers (`MFFCOFL`, `COFL_*`, `mf_ocm_overflow_carrier`).
3. **The PRD also predates the loadboard meeting** (07/29). On the Loadboard ↔ SpotBoard boundary, the later meeting wins — but the PRD does not in fact contradict it (§4).
4. **Kathleen's note is the newest artifact in evidence and wins on carrier authentication**, where it directly answers the PRD's own `OQ-1` (§8). ⚠️ **Qualified at v1.4 — recency no longer produces a tie-break here.** The Jana story is dated the **same day** (2026-07-29) and takes the opposite position. Recency cannot separate two same-day artifacts, and specificity cuts the wrong way to be useful: Jana's is far more *detailed* while Kathleen's is far more *authoritative for this domain* (she is the PRD's listed owner and SpotBoard's PM; Jana is the PM for **Shipments**). **No tie-break is applied. Both positions are recorded in §15 and neither is adopted.** Rule 4 continues to govern only where the Jana story is silent, which is everything except the access model.

5. **Volume of detail is not authority — stated as a rule because this cycle needed it.** The Jana story is longer and more specific about the carrier portal than every other artifact combined, and it is a *draft* by a PM from a neighbouring domain. Where it conflicts with the PRD's requirement text, the PRD wins on being a *"Development Ready"* spec with a named owner for this domain (§9.13, §9.14). Where it conflicts with **Kathleen's note**, nothing wins — see rule 4.

**Source-quality caveat on the PRD.** The PRD carries its own draft notice: *"issued as development-ready. Requirements should be validated by Engineering before implementation begins"*, and closes with *"AI-generated draft — not an official Odyssey position. Validate with David and relevant SMEs before acting."* Appendix A is separately rated *"Confidence: medium-high — reverse-engineered from the form's items, triggers, and PL/SQL program units."* That is the document's own view of itself and it stands.

**Conversion damage — largely repaired at v1.3.** The PRD reached us as a MarkItDown conversion of a 33-page PDF, and v1.2 was written against a damaged text. At v1.3 **the original PDF pages were read as rendered images** and the damage inventoried and repaired:

| What was damaged | v1.2 state | v1.3 state |
|---|---|---|
| **Appendix A.5** eligibility table | Column-shredded; reconstructed from context and marked as reconstructed | **Verified visually (p.18). The reconstruction was correct** — caveat removed, [[data/quote-model|data/quote-model]] §2.2 |
| **Feature 11** email catalog | Column-shredded; reconstructed and marked | **Verified visually (pp.11–12). The reconstruction was correct** — caveat removed, [[data/quote-model|data/quote-model]] §7 |
| **Appendix B** screenshots | All stripped; captions without images | **Recovered — §14 below** |
| **pp.30–32** profile listings | *"Entirely lost"* | **Recovered** — [[data/quote-model|data/quote-model]] §5.4–5.5. (Note: the *prose* on p.30 did survive the conversion; what was lost was the two tables and pp.32–33's screens) |
| **Strikethrough** | Not known to be damage at all | **Newly found.** The conversion flattened struck-through text into live text — `OQ-4`, `OQ-5`, `OQ-16` and one Feature 11 bullet. [[decisions/decision-log|SPB-14]] |

**Two caveats survive.** (1) The `RV_MEANING` column on p.30 and `SP_DESC` on p.31 are **cut off at the right page edge in the source raster itself** — the screenshots were pasted wider than the page when the document was authored, so no re-render recovers them. Those descriptions are transcribed only as far as the page goes, marked `…[clipped]`. **Closing this needs those two tables re-requested as text.** (2) Because strikethrough turned out to be lossy, **any other formatting-carried meaning in the text conversion is unverified** unless it has been read visually. Highlight colour, for instance, marks Kathleen's inline questions throughout the PDF and is invisible in the conversion — the questions' *text* survives, their *status as questions* does not.

**Source-quality caveat on the loadboard transcript.** It is short (~1:50 of captured speech) and lossy. Doug is invited to answer and is addressed by name, but almost none of his speech carries a Doug speaker label — the substantive answer at 0:45–1:26 is labelled **Kathleen O'Donnell**, and the only line plausibly Doug's is labelled `Speaker 1` at 1:40. Attributions below follow the transcript's own labels; where the real speaker is likely Doug, that is marked as INFERENCE.

**Source-quality caveat on the wireframe — substantially relaxed at v1.2.** The wireframe carries its own disclaimer verbatim: *"Confidence: medium. Layouts inferred from Overflow Bidding PRD v2.0 (07/02/2026) and the OdysseyONE Tender screenshot… AI-generated draft — validate with UX, TMS SMEs, and Legal/Compliance before acting."* (wireframe, disclaimer). v1 and v1.1 therefore treated wireframe *layout* as proposal and wireframe *vocabulary* as primary. **We now hold the document it was inferred from.** Reading the two side by side (§12), the wireframe turns out to be a **faithful and often verbatim** rendering of the PRD — most of its annotations are PRD sentences reproduced almost word for word. So: **where the wireframe agrees with the PRD, the medium-confidence caveat is lifted and the claim is firm.** Where it diverges, §12 states which of two readings applies — intentional evolution beyond the PRD, or drift — and why. The caveat is retained only on the divergences.

---

## 1. What SpotBoard is

SpotBoard is Odyssey's **spot-market bidding channel**: when contracted carriers cannot or will not take a shipment at their contracted rate, Odyssey invites a different, profile-derived set of carriers to **bid a price** on that shipment, then awards one and hands it back to tendering.

**The PRD's own one-sentence definition, verbatim** — the authoritative framing, and it matches the above:

> "Overflow Bidding is a spot-procurement workflow that activates on an OdysseyONE shipment when standard routing cannot produce a covered carrier. Pre-approved overflow carriers are notified by email, invited to submit bids through the OdysseyONE Carrier Portal, and the winning bid is awarded automatically or manually by a planner — all tracked inside OdysseyONE." (PRD, §1)

Kathleen's own one-line framing, from her wireframe subtitle: *"OdysseyONE Carrier Portal · Overflow Bidding (now 'SpotBoard')"* (wireframe, subtitle).

### What the PRD says this project is

Three framings the PRD supplies that no other artifact does:

1. **It is a rebuild of a specific legacy screen.** *"This PRD defines the MVP feature set. It replaces the legacy TMS overflow function (MFFCOFL screen) with a native OdysseyONE experience."* (PRD, §1). `MFFCOFL` is *"Maintain Carrier Overflow"*, an Oracle Forms module; the PRD's Appendix A is a field-level reverse-engineering of it, converted from `mffcofl.fmb` (PRD, Appendix A). The legacy baseline lives in [[data/quote-model|data/quote-model]].
2. **Automation is the target state, not an enhancement.** *"The target process should remain highly automated, with manual intervention required only for defined exceptions or failed automation paths."* (PRD, §1). This settles v1.1's conflict §9.7 — the wireframe's auto-award is not an addition on top of Irina's manual account; **automation is the design intent and manual review is the exception path.**
3. **Three design constraints are named as unique to this rebuild** (PRD, §1): TMS **OCM profiles** are used because *"OdysseyOne does not have the carrier and customer data required for overflow"*; **external carrier user management does not exist** (§8); and modes/equipment in scope are whatever current TMS configuration allows.

**Terminology note.** The PRD says *"Overflow"* everywhere because it predates the rename (see Precedence, rule 2). Read every PRD quotation in this canon with `Overflow` → `SpotBoard`.

Irina's framing of the mechanism — the clearest description in either artifact:

> "instead of this routing guide system will calculate you who are participating in the carrier… to which we can send invitation to bid on this particular shipment. So it's look very similar like this tendering stuff, but it's calculate different list for you." (transcript, 14:07–14:26)

> "they will not reply that they accept shipment. They will reply with the quote that they could take the shipment for this much money." (transcript, 15:05)

Two properties define the domain, and both come straight from that quote:

1. **A different carrier list.** Not the contract routing guide. Sourced from carrier/OCM profiles that declare which carriers participate in spot bidding for which equipment — *"it's the OCM profiles or whatever they flow OCM profiles, carrier profiles. So basically it's few tables when they say for this equipment… we following carrier participate in this board"* (transcript, 13:35).
2. **A different response type.** Carriers answer with a **price**, not a yes/no. Tendering asks "will you take this?"; SpotBoard asks "what would you charge?"

Everything else in the domain follows from those two.

## 2. Where SpotBoard sits in the Odyssey lifecycle

Kathleen walked the whole chain at the top of the meeting (transcript, 0:03–1:16), and it matches the lifecycle already documented in [[../shipments/domain-analysis|Shipments — Domain Analysis]] §2:

```
Order → Shipment (consolidation) → Plan → Routing guide (ranked contract carriers)
    → Tender (sequential, by rank)
        ├── Accepted → Monitoring
        └── Exhausted / declined
                ├── LOADBOARD  (automated; internal brokerage teams; earlier "in theory")
                │       ├── Brokerage team actions it → covered internally
                │       └── Not actioned ─┐
                └──────────────────────── ▼
                                        SPOTBOARD  (planner decision; external carriers bid)
                                          ├── Award → back into Tender as a new route-guide row
                                          └── No bids → manual intervention / re-quote
```

**On the Loadboard leg:** its position is *nominal, not enforced* — *"in theory, load board is before overflow; doesn't have to be, but… In theory."* (loadboard transcript, 1:40, `Speaker 1`; **INFERENCE:** speaker is Doug, since Kathleen turns to him by name at 1:26 and this is the immediate reply). Kathleen frames Loadboard as *"earlier in the process… than overflow, if it's going to happen at all"* (loadboard transcript, 1:26) — the trailing clause meaning overflow may never occur, not that Loadboard is optional. Full boundary in §4.

Kathleen on the upstream half:

> "when we get an order to plan, and it goes into Odyssey One shipment to start planning, we consolidate, say, a couple orders into a shipment… After that process, the system, when it's ready to plan, will auto… dispatch based on, we have like a set guide, we have set rates with certain carriers… if XYZ carrier is the number one in the route guide… we try to tender to them first. If they turn it down, it will go to the second person." (transcript, 0:05–1:03)

This is the **same seam** already recorded in the Shipments canon: *"When ALL carriers from the routing guide have been exhausted, the system falls to a 'spot put' / 'overflow board'"* ([[../shipments/domain-analysis|domain-analysis]] §4, sourced to David, Mar 25). SpotBoard is the productisation of that fallback, now with a PM and a UI.

### Entry conditions — three triggers, not one (new at v1.2)

The Shipments canon's account is **narrower than the PRD's**. The PRD names three independent conditions, only one of which is exhaustion:

> "When a shipment cannot be tendered via the standard route guide because **the guide is exhausted, no carriers exist for the lane, or lead time is too short** — a planner initiates a spot bid from a configured overflow carrier list." (PRD, §2)

So a shipment can reach SpotBoard **without ever exhausting a route guide** — an empty lane or a short-fuse pickup gets there directly. This resolves conflict §9.3, where the wireframe's guardrail (no *active or accepted* tender) looked suspiciously looser than the Shipments canon's "all carriers exhausted". The looser reading is the correct one, and the PRD's UI constraints confirm it — they gate on tender *state*, never on guide exhaustion:

> "Can only start overflow when there is no active / accepted tender. There also cannot be another open bid (Loadboard or Overflow) for that shipment. **The system cannot tender when shipment is in Overflow or Loadboard.**" (PRD, Feature 1, "UI Constraints")

Note the **third** constraint: the lock is **reciprocal**. Not only can SpotBoard not start during a live tender — tendering is blocked while the shipment is in SpotBoard or on the Loadboard. The wireframe reproduces the first two constraints and omits this one (§12). Legacy enforces the same thing harder: *"before send/modify/close, an active tender on the load hard-stops the action"* (PRD, Appendix A.7). Logged as [[decisions/decision-log|SPB-12]].

**Planner-initiated, in the PRD too.** *"a planner initiates a spot bid"* (PRD, §2) and Feature 1 is titled *"Overflow Quote Initiation (Internal User)"*. This independently corroborates the loadboard meeting's *"overflow board is a decision that's made by the planner"* (§4) from a document written 27 days earlier.

**Inferred (not stated in any artifact):** that SpotBoard corresponds to the `Spot Bid` shipment status Jana enumerated in the Shipments status machine — *"From approved it can go to load board, load board to spot bid, bid review from it goes to done"* (`vault/10-domains/shipments/grooming/0401-jana.vtt`, 15:57). No artifact maps SpotBoard onto that status vocabulary.

**Strengthened at v1.1:** Jana's ordering (`load board` → `spot bid`) is now independently corroborated by Kathleen and Doug, who put Loadboard before overflow from a completely different vantage point (loadboard transcript, 1:26, 1:40). Two unrelated sources agreeing on the sequence makes the status-machine mapping substantially more likely — but it is still an inference, because nobody has said "the `Spot Bid` status *is* SpotBoard". **Confirm with Jana + Kathleen.**

## 3. Relationship to the Shipments Tender tab (H2)

**This is the load-bearing question for the canon, so it gets the evidence in full.**

### Verdict

SpotBoard is **not** an extended Tender tab. It is a **sibling surface and a downstream fallback stage that feeds the Tender tab.** It is also two things the Tender tab is not: a **carrier-facing channel** and a **cross-shipment operational module**.

The hypothesis's kernel of truth is that SpotBoard *terminates* in a tender — it is "about tendering and carriers" in the sense that its output is a tender. But it is not a superset of the Tender tab, and it does not replace it.

**Re-checked at v1.1 against the loadboard transcript: the verdict stands, unchanged and untouched.** That transcript never mentions tendering, awards, the route guide, or the Tender tab — it is entirely about the Loadboard/overflow boundary. It neither confirms nor contradicts §3. Recorded here so the absence is on the record rather than mistaken for silent agreement. [[decisions/decision-log|SPB-02]] is unaffected.

### Re-tested at v1.2 against the PRD — the process claim SURVIVES verbatim; the placement claim is REFINED to open

This is the one place where the PRD both confirms and complicates the canon, so the two halves of H2 are separated.

**Half one — "SpotBoard hands off *to* Tender; Award ≠ tender." CONFIRMED, verbatim, and it is the PRD's own sentence, not the wireframe's:**

> "The system shall send an Award Notification email to the winning carrier after award. **Note, tender is a separate event. They can be awarded the load, but they do not get assigned to the load until it is tendered** (automatically or manually)." (PRD, Feature 4)

> "If automation is enabled and the lowest bid is within tolerance, the system shall: select the awarded carrier; **move that carrier into the OdysseyONE shipment tendering flow**; store awarded quote charges against the shipment record; associate the Quote ID with the awarded shipment; send the Award Notification email…" (PRD, Feature 5)

The wireframe's bolded *"Award ≠ tender"* is therefore not Kathleen's gloss — it is the PRD's requirement restated. Confidence caveat lifted. The decline-and-fall-through loop is also PRD text: *"Following award, a tender is sent to the awarded carrier. If that awarded carrier declines the tender, then the next best carrier option will be considered for award/notification"* (PRD, Feature 4).

**Half two — "SpotBoard is not an extended Tender tab; it is a separate surface." REFINED. The PRD leaves the surface question explicitly OPEN, and names the Tender tab as one of four live candidates:**

> "In TMS, Logistics Coordinators navigate to Overflow using the **Overflow Carriers button on the Equipment Screen (Tender screen with routing options)**. **DAVID to confirm where this makes most sense in the future.** — We can review with UX team to see if Popup from Action makes sense on primary Shipment screen or even Routing Tender Screen or if we want to have a new tab for Overflow **or display in existing Tender tab like TMS does today**." (PRD, Feature 1)

Four candidate placements, unranked: **(a)** a popup from an Action menu on the primary Shipment screen, **(b)** the Routing/Tender screen, **(c)** a new dedicated tab, **(d)** inside the existing Tender tab, as TMS does today. The wireframe picks **(c)**. That is a legitimate proposal from the PM — she flags in her own Screen 6 annotation that *"the Feature 1 launch-point decision"* is still pending with David — but it is **not a settled decision**, and this canon overstated it at v1/v1.1. [[decisions/decision-log|SPB-03]] is downgraded to a working proposal by [[decisions/decision-log|SPB-11]].

**What this does and does not do to H2.** It does **not** revive "SpotBoard is an extended Tender tab" as a *process* claim — the PRD is unambiguous that awarding and tendering are distinct events with distinct data, and that SpotBoard has a carrier-facing channel and a cross-shipment audit surface that the Tender tab has neither of. Every row of the comparison table below survives the PRD intact. What it does is separate **what SpotBoard is** (settled: a sibling process that feeds Tender) from **where its UI lives** (open: David's call, four options, one of which is literally inside the Tender tab). H2 was right about the first and premature about the second.

### Evidence — SpotBoard hands off TO Tender, it does not contain Tender

Irina describes the hand-off end to end:

> "I took the least cost and I says, okay, I would like to award this carrier with this shipment. Once I do say that I want this carrier, this carrier will be added as the additional option in your tendering screen, what you have, one, two, three, four options right now… There will be the 5th carrier added to this… The 5th line will be added for this carrier with the cost he provided… and the quote, and you will be then capable to tender it to that carrier." (transcript, 15:44–16:24)

The wireframe implements exactly that, and states the boundary in bold twice:

- *"Award moves the carrier into the shipment tendering flow — it does **not** assign the load until tendered."* (wireframe, Screen 4, Award Action panel)
- *"**Award ≠ tender.** Tender is a separate event; this row shows live Tender Status (Tendered / Pending / Accepted / Declined)."* (wireframe, Screen 5 annotation)
- *"Awarded spot carrier is appended as the **last row** of the route guide, flagged **SPOT RATE** and visually distinct."* (wireframe, Screen 5 annotation)

Screen 5 is literally the existing Tender tab with one extra row: four routed carriers (Declined / Cancelled) plus `WABC · Wabash Carriers [SPOT RATE]` at rank 5, `$2,690 (bid $2,540 + markup)`, `Tendered — Pending`.

This is consistent with the Shipments canon's existing account: *"After award, system loops back to tendering — a formal tender is sent at the bid price for acceptance"* and David's *"Even if the carrier bids $1000 and we say we're going to award it to them, then we send them a tender with that $1000 for them to accept"* ([[../shipments/domain-analysis|domain-analysis]] §4).

### Evidence — different list, different question, different answer

| | Tender tab ([[../shipments/domain-analysis|Shipments canon]] §3) | SpotBoard |
|---|---|---|
| Carrier list source | Routing guide — pre-agreed contracts, rate-engine ranked | OCM / carrier profiles declaring spot participation by equipment (transcript, 13:35) |
| Sequencing | Strictly sequential by rank; only ONE tender `Sent` at a time | Simultaneous broadcast to N carriers, all open at once (transcript, 14:26–14:46) |
| What the carrier is asked | Accept or decline a known rate | Submit a price (transcript, 15:05) |
| Carrier response values | Sent / Accepted / Declined / Cancelled | Bid / Declined / No response (wireframe, Screen 4) |
| Closing mechanic | Response window per tender | One shared bid window with a countdown timer, `Quote Duration` in minutes (wireframe, Screens 1, 3) |
| Carrier-facing UI | None documented | RFQ email + carrier portal bid form (wireframe, Screens 2, 3) |
| Scope | One shipment | One shipment **and** a cross-shipment monitoring board (wireframe, Screens 6, 7) |

### Evidence — the surface question (v1 argued "separate tab"; see the v1.2 correction below)

Irina thinks out loud and lands on "separate", though she visibly wavers:

> "we need additional tab, at least I, well, I don't know if we need additional tab… in TMS… maybe not additional top from the standard page, they have a button which called overflow. You click on the on the button and instead of this routing guide system will calculate you who are participating… there is a functionality that therefore, that's why it's need to be the separate tab, tab, you need a button from this probably top… to that tab or just additional tab because there are different functionality." (transcript, 12:35–15:05)

Kathleen endorses the separate-tab reading:

> "Good explanation, Irina. That's exactly how I could, I should, I could see that happening from another tab that goes back to this screen for who gets awarded. But we need visibility in this route guide, in this tender route guide that that was from the quote, I would think." (transcript, 16:36)

That second sentence is the origin of the `SPOT RATE` flag on Screen 5 — **inferred link**, but a short one: Kathleen asks for provenance visibility on the tender row, and her own wireframe two days later renders exactly that flag.

The wireframe proposes an answer: `SpotBoard` as its own tab in the shipment tab strip, sitting after `Notes`, visually distinct (amber) — `Orders · Product · Stops · Tender · Cost Allocation · Instructions · Documents · Notes · **SpotBoard**` (wireframe, Screens 1, 4, 5). See [[decisions/decision-log|SPB-03]].

> **Corrected at v1.2.** v1 said the wireframe *"settles the question."* It does not. The PRD, which the wireframe is derived from, lists four candidate placements and assigns the choice to David (above). The wireframe expresses Kathleen's preference among the PRD's own options — a strong signal, since she is both the PRD's owner and the wireframe's author, but a preference nonetheless. [[decisions/decision-log|SPB-11]].

**One extra data point the PRD supplies:** legacy reaches overflow from the **Tender screen** — *"the Overflow Carriers **button** on the Equipment Screen (Tender screen with routing options)"* (PRD, Feature 1). That is direct documentary support for Irina's account of a *button* on the standard tendering page (meeting 1, 14:07), which v1 had recorded only as her recollection. Conflict §9.2 (tab vs button) therefore has a firmer legacy baseline: **the legacy answer is definitively "button, on the Tender screen"**, and the four-way choice is about whether OdysseyONE keeps that or moves.

### Where the two surfaces touch

1. **Entry guardrail.** *"cannot start SpotBoard when there is an active/accepted tender or another open bid (Loadboard or Overflow) on the shipment"* (wireframe, Screen 1 annotation).
2. **Award → route-guide row**, with markup applied at hand-off (§6).
3. **Tender decline → next bid.** *"If the awarded carrier **declines the tender**, the next eligible SpotBoard carrier (Conway, $2,695) is considered for award/notification."* (wireframe, Screen 5 annotation). The loop runs both ways.
4. **Audit link.** *"Quote ID stays associated with the shipment for audit."* (wireframe, Screen 5 annotation).
5. **Manual quote entry already exists in the Tender tab today** and overlaps SpotBoard's job — see §9 Conflicts.

## 4. Loadboard vs SpotBoard (H1) — RESOLVED

> **Retitled at v1.1.** This section was *"Overflow vs 'lowboard'"* in v1, when the only available evidence was a term raised and dropped in passing. The `loadboard transcript` is a meeting convened specifically to answer this question, and it answers it.

### Verdict

**They are two separate processes, not two names for one thing and not parent and child.** The single load-bearing quote:

> "they're separate processes. And overflow board is a decision that's made by the planner, whereas the load board is an automated process to take the shipment." (loadboard transcript, 0:45, labelled Kathleen O'Donnell)

### The boundary

| | **Loadboard** | **SpotBoard** (= Overflow) |
|---|---|---|
| Trigger | **Automated** — the system posts the shipment (loadboard transcript, 0:45) | **A planner's decision** (loadboard transcript, 0:45) |
| Who sees it | **Odyssey's own internal brokerage teams** — *"our internal load board"* (loadboard transcript, 0:49) | **External carriers**, drawn from OCM/carrier profiles (meeting 1, 13:35) |
| Which teams / carriers | A **brokerage team in Kennesaw** takes *"truckload kind of shipments"*; a **bulk brokerage group** takes bulk shipments (loadboard transcript, 1:04) | A named `Carrier List` per quote, e.g. *TL Southeast Overflow* (wireframe, Screen 1) |
| What the recipient does | Takes it or leaves it — *"for them to action if they want them or not"* (loadboard transcript, 1:19) | Submits a **price** (meeting 1, 15:05) |
| Response type | Claim / no-claim. No price is quoted to Odyssey. **INFERENCE** from *"action if they want them or not"* — no pricing mechanism is described for Loadboard in any artifact | A bid: linehaul + fuel + accessorials (wireframe, Screen 3) |
| Lifecycle position | **Earlier** — *"earlier in the process, right, Doug, than overflow, if it's going to happen at all"* (loadboard transcript, 1:26) | Later; the last automated channel before manual intervention |
| Is the order enforced? | **No.** *"in theory, load board is before overflow; doesn't have to be, but… In theory."* (loadboard transcript, 1:40) | — |
| Commercial nature | **Insourcing** — the work stays inside Odyssey, moved to an internal brokerage desk. **INFERENCE** from "our internal load board" + named in-house teams | **Outsourcing** — the work goes to a third-party carrier at a bid price |

### Does one feed the other?

**Not as a data hand-off, and not as an enforced gate.** They are two escalation channels reached from the same upstream condition, conventionally tried in the order Loadboard → SpotBoard but with that order explicitly disclaimed as non-binding (loadboard transcript, 1:40). Nothing in any artifact describes Loadboard state, bids, or carriers flowing into a SpotBoard quote. Contrast SpotBoard → Tender, which *is* a real hand-off with a defined payload (§3, [[decisions/decision-log|SPB-02]]).

The one place they are coupled is **mutual exclusion at runtime**: a shipment may not have a SpotBoard quote open while a Loadboard bid is open (wireframe, Screen 1 guardrail — see §9.1).

### Re-tested at v1.2 against the PRD — SPB-07 SURVIVES; SPB-08 is upgraded from inference to established

The PRD predates the loadboard meeting by 27 days, so on this boundary the meeting outranks it (Precedence, rule 3). **In the event there is nothing to arbitrate: the PRD does not contradict SPB-07, and it corroborates it from a third direction.**

1. **The PRD treats Loadboard and SpotBoard as peer destinations of the same upstream failure**, in a question it asks about both at once: *"Should OdysseyONE use OCM profiles, master data settings, or both to determine whether a shipment moves from failed tendering to **load board, overflow, or user review**?"* (PRD, §8 `OQ-5`, owner Product/Ops). Three peer outcomes of failed tendering, listed as alternatives — exactly SPB-07's model, from a document that never discusses the comparison.
2. **The reciprocal runtime lock is a PRD requirement, not wireframe invention** — *"There also cannot be another open bid (Loadboard or Overflow) for that shipment. The system cannot tender when shipment is in Overflow or Loadboard."* (PRD, Feature 1). See §2.
3. **The PRD never claims Loadboard is automated.** It says nothing at all about how a shipment gets onto the Loadboard — which is precisely the gap the 07/29 meeting was convened to close, and which Doug's missing answer still leaves open (§10). No conflict, an absence.

**SPB-08 upgraded.** [[decisions/decision-log|SPB-08]] concluded that the guardrail's *"(Loadboard or Overflow)"* was stale copy for SpotBoard itself, and marked that an INFERENCE because nobody had been asked about the sentence. **The sentence is now traced to its origin: it is the PRD's, reproduced almost verbatim by the wireframe.** In a document dated 07/02/2026 that calls this product *Overflow* on every page and calls the other one *load board*, `(Loadboard or Overflow)` can only mean *the Loadboard, or this product*. The inference marker comes off. What remains is a copy fix — the OdysseyONE string should read `(Loadboard or SpotBoard)`.

### Correction to v1

v1 recorded, on the evidence then available: *"No evidence in either artifact for 'lowboard is mostly automations.'"*

**That is now superseded.** The original verbal hypothesis was right on substance and wrong only on the word: **Loadboard *is* the automated one**, in Kathleen's own words. v1 was correct to reject *"lowboard"* as a term (a mishearing of "load board" — confirmed by the user) and correct that Loadboard is a sibling rather than a child, but its automation claim was a false negative caused by an evidence gap, not by a wrong reading. Logged as [[decisions/decision-log|SPB-07]].

**What survived v1 intact:** Loadboard is a **sibling module, not part of SpotBoard**. Three independent confirmations now: Kathleen's own module nav lists them as peers (`OdysseyONE · Shipments · Loadboard · SpotBoard · Carriers · Reports` — wireframe, Screens 6, 7); Jana's status machine runs them as two sequential states (`grooming/0401-jana.vtt`, 15:57); and Kathleen states outright that they are *"separate processes"* (loadboard transcript, 0:45). `Loadboard Expiry` already exists as a Tender-tab column ([[../shipments/domain-analysis|domain-analysis]] §3), so Loadboard predates SpotBoard in the product.

### Recommendation — should `vault/10-domains/loadboard/` exist?

**Not yet. Recommendation only — nothing has been created.**

Loadboard is now defined well enough to *disambiguate* it from SpotBoard, but not well enough to canonise. What we have is roughly six sentences of one lossy transcript: a trigger model, an audience, two team names, and a soft lifecycle position. There is no screen, no field list, no status set, no owner, and no statement of who its PM is.

**Where it lives in the meantime:** §4 of this canon, explicitly as *boundary material* — what Loadboard is, only to the depth needed to keep SpotBoard's edges honest. This canon is **not** its permanent home and should not accumulate Loadboard detail beyond that boundary.

**Trigger condition — promote to its own domain folder when any one of these lands:**

1. A **Loadboard-specific artifact** — a wireframe, a PRD, a screen, or a meeting convened about Loadboard rather than about the comparison. (The closest near-miss: Kathleen invited Doug to explain *"how the settings of load board works. So it can tell us when shipment will go to load board"* (loadboard transcript, 0:14) — that answer does not survive in the captured audio. If it is re-asked and captured, that alone likely clears this bar.)
2. A **named owner/PM** distinct from Kathleen, making it someone else's domain.
3. **Odyssey-One builds a Loadboard surface.** The module nav already reserves a `Loadboard` slot beside `SpotBoard` (wireframe, Screens 6, 7) — the day that slot gets a screen, it needs a canon.

Until one of those, a folder would hold a stub, and a stub in `10-domains/` reads as a domain we understand. We do not.

**Open on Loadboard** (moved to §10): its configuration/settings model — the literal question Kathleen convened the meeting to answer.

## 5. Naming (H3)

**Canonical form: `SpotBoard`** — one word, capital S, capital B, no space.

Used consistently and exclusively throughout Kathleen's own artifact: HTML `<title>`, page `<h1>`, the tab label, all seven screen titles, the module nav, and her own filename `SpotBoard_Wireframes_v1.html` (wireframe, throughout). No instance of `Spotboard`, `Spot Board`, or `Spot board` appears in the wireframe.

**The rename happened live in this meeting.** Irina, mid-explanation:

> "Possibility to put it on the the on the overflow board quote board. I have to start using the new name or something. OK, overflow quote board." (transcript, 13:15)

Kathleen: *"Botboard."* (13:26) — almost certainly a transcription garble of "SpotBoard". Manuela: *"Spot for, let's name it because…"* (13:28) — likewise garbled. The transcript therefore **predates settled usage** and its spellings are unreliable; the wireframe (07/28/2026) is the settled evidence. Use the wireframe for UI labels.

The old name persists in three places and should be expected to surface again: the wireframe's own subtitle *"Overflow Bidding (now 'SpotBoard')"*, its references to *"Overflow Bidding PRD v2.0"*, and Kathleen's working directory `C:/Users/kathleenodonnell/Claude/Projects/**Overflow**/` (wireframe, source comment line 2). See [[decisions/decision-log|SPB-01]].

**The PRD is the fourth place, and it does not reopen the decision.** The PRD is dated **07/02/2026** — 26 days before the wireframe and before the rename was raised in meeting 1 — and it says *"Overflow"* in its title, its filename, its executive summary and every feature heading. That is chronology, not dissent: a document cannot use a name that did not yet exist. **[[decisions/decision-log|SPB-01]] stands and the PRD's naming must not leak into the canon.** It leaks legitimately in exactly three classes of string, all of which are proper nouns rather than product names:

- **Legacy identifiers**, which are the literal names of legacy things and must not be translated: `MFFCOFL`, `COFL_AFFLM`, `COFL_DSPAU`, `mf_carrier_overflow`, `mf_ocm_overflow_carrier_list`, `overflow_send`.
- **Verbatim quotations** from the PRD and from meeting 1.
- **Document titles** — "Overflow Bidding PRD v2.0" is the artifact's real name.

Everywhere else, including UI copy inherited from PRD requirement text, the term is **SpotBoard**. The known live instances needing a copy fix: the Screen 1 guardrail string `(Loadboard or Overflow)` (§4), and the PRD's own `"Overflow review queue"` phrasing in `OQ-7`.

**TBD:** whether the carrier-facing surfaces use "SpotBoard" as an outward brand. The RFQ email never says "SpotBoard" — it says *"You're invited to bid on a spot load"* and signs as `Odyssey Logistics <spotquotes@odysseylogistics.com>` (wireframe, Screen 2). The portal header reads `OdysseyONE Carrier Portal` (wireframe, Screen 3). SpotBoard may be an internal name only.

---

## 6. Surface anatomy

Seven screens, split by audience. Screens 1, 4, 5, 6, 7 are internal; Screens 2 and 3 are carrier-facing.

> **Read this section with §12.** The anatomy below is the wireframe's, written at v1 when the wireframe was the only visual artifact. Almost all of it is now **confirmed by the PRD** and can be treated as firm; the handful of divergences and the behavior the wireframe never drew are itemised in §12. Field-level detail — the quote record's schema, the legacy state machine and button-enablement matrix, the carrier-eligibility rules, the configuration surface and the full email catalog — has moved to **[[data/quote-model|Quote Data Model, States & Notification Catalog]]** rather than being inlined here.

### Internal — in-shipment tab (`SpotBoard`, three sub-tabs)

Sub-tabs: `Setup & Carriers` · `Live Bids` · `Quote History` (wireframe, Screens 1, 4).

**Screen 1 — Setup & Carriers.** Where a planner composes and sends a bid request.

- Context header (6 read-only cells): `Origin`, `Destination`, `Equipment (seed)`, `Distance`, `Hazmat`, `Pickup Window`.
- Toolbar controls: `Carrier List (select exactly one)` — a named profile-derived list, e.g. *"TL Southeast Overflow — Van — default 120 min"*, *"LTL Comparable Set — default 240 min"*; `Quote Duration (open window, min)`; `Flexible Pickup` (No / *"Yes (carrier picks feasible date)"*).
- Carrier table: `Incl.` (checkbox) · `Carrier (SCAC · Name)` · `Equip` · `Contact Email` · `Planned Pickup` (editable) · `Planned Delivery` (editable) · `Flags`.
- Actions: `Send RFQ` (primary) · `Save Draft` · `Cancel`.
- Rules stated on-screen: equipment only *produces* the eligible list via **comparable-equipment expansion (TL → [TL, LTL])** — the carrier list is the real selection; `Routed` and `Waffled / Gave back` carriers render red and are **unchecked by default** but the planner may opt them in; non-hazmat-certified carriers are excluded entirely and never appear; `Send RFQ` is blocked until pickup/delivery dates are populated for every included carrier; duration is an integer 1–99,999 min and **locks once sent**; `Flexible Pickup` appears only when config allows flexible days > 0, and *"carriers see dates, planners see the window not the day count."*

**Screen 4 — Live Bids (results, review, award).**

- Header strip: `Quote QT-88421 · CLOSED · Opened 08:00 · Closed 10:00 CST · List: TL Southeast Overflow`, plus `Award type will be recorded: Manual`.
- Bid table: `Carrier` · `Status` · `Linehaul` · `Fuel` · `Accessorials` · `Total` · `Submitted By` · `Response` (timestamp). Row statuses seen: `Lowest bid` (green/winning), `Bid`, `Declined`.
- Actions: `Award Carrier & Send to Tender` (primary) · `Force Close` · `Modify & Resend` · `Clear & Start Over`.
- **Tolerance Evaluation** panel — the auto-award math, shown so the planner understands the outcome: `Highest routed cost (benchmark)` · `Tolerance (% above)` · `Tolerance ceiling` · `Lowest bid` · `Result` (*Within tolerance*) · `Manual-review flag` (*ON → routed to planner*). Benchmark = highest total routed cost, **per-mile fallback if none**.
- Stated rules: award is **auto** (within tolerance + auto-award enabled) **or manual**, and the system records which; *"Manual-review flag forces planner review even when within tolerance"*; planner may award, reopen/modify, clear, or leave unresolved; award triggers the **CE-2** award email; award needs **idempotency/concurrency guards (no double-award)**.
- **Markup** — an OCM percentage or a flat amount — *"is applied when the carrier moves from SpotBoard to Tender"*, not at bid time. Screen 5 shows this concretely: bid `$2,540` → tender rate `$2,690`. **PRD-confirmed verbatim:** *"Apply markup per OdysseyONE markup rules. Markup is applied when the winning carrier is moved from the Overflow board to the tender process. The markup is driven by OCM profiles and can either be a percentage or a flat amount."* (PRD, Feature 5).

> **Corrected and extended at v1.3.** v1.2 recorded *"whether it is applied automatically or configured per quote is an open PRD question — `OQ-4`."* **`OQ-4` is struck through in the PRD** (p.14, read visually) and was flattened into live text by the conversion — it is a retired question, not an open one ([[decisions/decision-log|SPB-14]]). Separately, the legacy screens show *how* markup lands: as a **discrete `QMU QUOTE MARKUP` charge line** on the awarded carrier's cost record, sitting alongside `FUE` fuel and the accessorials and summing into `Total Cost` (PRD p.25, read visually). It is an itemised, auditable line — not an invisible uplift on the bid. The `COFL Markup` OCM profile carries an explicit *"NO means do not apply"* value, so markup is **opt-out per profile** (PRD p.30, read visually). [[decisions/decision-log|SPB-15]]; detail in [[data/quote-model|data/quote-model]] §5.6.

**Force Close is two mechanisms, not one — corrected at v1.2.** The canon and the wireframe both treated `Force Close` as a planner button. The PRD gives it a **whole feature of its own** and the primary meaning is automatic:

> "Feature 6 — Force-Close Logic—Bidding. **Quotes may close before their configured expiration when all carriers have responded.** Force-close shall not trigger when remaining quote duration is below a configurable minimum threshold (default: 5 minutes). On force-close, the system shall log the reason and proceed to automation or manual review per configuration." (PRD, Feature 6)

So there are two: **(a) system force-close**, fired when every invited carrier has responded, suppressed if less than ~5 minutes of the window remain (`OQ-2` asks whether OdysseyONE keeps 5 minutes or makes it configurable from day one); and **(b) planner force-close**, *"The system shall allow a user to force-close a quote early, transferring control to manual review"* (PRD, Feature 8). The wireframe draws only (b) — but its own audit trail records (a): *"Closure — Force-closed (all responded) 08:50"* (wireframe, Screen 7). Both are real; the canon had captured only the button.

**Quote closure and evaluation, in full (PRD, Feature 5).** The system auto-closes a quote at its configured expiration; evaluates the lowest received bid against tolerance; auto-awards if within tolerance **and** automation is enabled **and** the manual-review flag is off; otherwise routes to planner review. *"If out of tolerance or no response, it goes to manual review."* All evaluation detail is logged and made visible to internal users. Tolerance supports four rule types — percentage above highest routed cost, monetary cap above highest routed cost, total quote cap, and a per-mile no-route fallback — see [[data/quote-model|data/quote-model]] §5.2.

**Screen 5 — the Tender tab after hand-off.** Not a SpotBoard screen; the existing Tender tab (`Routing Options` / `Notify & Response Method` / `Volume Commitment` / `Additional Info`) with the awarded spot carrier appended as the last route-guide row, flagged `SPOT RATE`. Columns as in the Shipments canon: `Route Rank` · `Rank` · `SCAC` · `Carrier` · `Equip` · `Rate` · `Tender Status` · `Transit` · `Notify Method`.

### Internal — standalone cross-shipment module

**Screen 6 — Monitoring Board.** Top-level module (`OdysseyONE · Shipments · Loadboard · SpotBoard · Carriers · Reports`), showing every active and closed spot event across all shipments. Kathleen's annotation states the reasoning: *"Standalone module, not inside one shipment. Resolves the naming mismatch: a 'board' that shows every spot event, with drill-in to the per-shipment screens (1 & 4)."*

- KPI tiles: `Open bids` · `Closing < 15 min` (alert) · `Awaiting review` (amber) · `Unawarded / expired today` · `Awarded today`.
- Filters: `Client` · `Status` · `My org / site` · `Search (Quote ID / Load)`.
- Table: `Quote ID` · `Load` · `Client` · `Lane` · `Equip` · `Resp. / Invited` (e.g. `2 / 4`) · `Leading Bid` · `Status` · `Time` (countdown or close time) · row action (`Open` / `Review` / `View` / `Re-quote`).

**Screen 7 — Quote History / Quote Viewer.** Search and audit, reachable from the board **and from a shipment**.

- Search fields: `Quote ID` · `Client` · `Order ID` · `Load ID` · `Date range`; actions `Search`, `Export`.
- Table: `Quote ID` · `Req #` · `Load` · `Lane` · `Awarded Carrier` · `Award Type` · `Outcome` · `Closed`.
- Expandable **audit trail** per quote: `Created / carrier list` · `Invited carriers` · `Sent` · `Responses` (per-carrier amounts and declines) · `Tolerance result` · `Closure` (e.g. *"Force-closed (all responded) 08:50"*) · `Award` (type, planner name, CE-2 sent, markup applied at tender).
- Stated rules: *"**Quote ID search is first-class**: carriers call planners with only the quote number, no order/load. Search must resolve quote → shipment/load."*; one shipment can carry **multiple quote requests (#1, #2…)**, each retaining its own invited carriers, bids, tolerance result, closure reason and outcome; data model = **one header + N carrier-response rows per request** (PRD Appendix A.2), preserving historical versions of responses; legacy hid history in a separate app, and OdysseyONE should make it reachable from the shipment context too.

### Carrier-facing

**Screen 2 — RFQ email (`CE-1`).** From `Odyssey Logistics <spotquotes@odysseylogistics.com>`, subject pattern `Request for Quote — QT-88421 — Charlotte, NC → Houston, TX` (*"Subject line pattern must start with 'Request for Quote…'"*). Body headline: **"You're invited to bid on a spot load"**, with *"Odyssey is requesting a spot rate for the load below. Submit your bid before the window closes."* Detail rows: `Quote ID` · `Equipment` · `Origin` · `Destination` · `Pickup` · `Delivery` · `Distance` · `Hazmat` · `Bid closes` (absolute time + remaining). CTA: `Submit Your Bid →`, footnoted *"Secure link — no login required for MVP (token-authenticated)."*

**Screen 3 — Carrier Auction / bid entry** (`OdysseyONE Carrier Portal`, scoped to the carrier: *"Carrier sees only its own quotes"*).

- Countdown: `Bid closes in 14:52`, *"turns red final 15 min · auto-refresh 1 min"*.
- `Shipment Detail — Quote QT-88421`: `Shipper` (*"Acme Chemicals (name only)"*) · `Equipment` · `Origin` · `Destination` · `Stops` · `Distance` · `Pickup` · `Delivery` · `Hazmat` (with `MSDS` hyperlink from product master data) · `Special Services` · `Instructions`.
- `Your Bid`: `Linehaul / Base (USD)` (editable) · `Fuel (precalculated — not editable)` (read-only) · one row per accessorial, e.g. `Accessorial — Lift Gate`, `Accessorial — Expedited` · computed `Total`. Accessorial/charge-code list is **configurable per OCM**.
- Actions: `Submit Bid` · `Update Bid` · `Decline`. A carrier may update while the window is open, or decline and later re-bid if still open (*"status moves out of Declined"*).
- Provenance line: *"Last submitted: $2,540.00 by J. Rivera · 09:12 CST"*.
- **Order ID and Load ID are deliberately excluded** from both carrier surfaces *"to prevent carriers from 'stealing the load'"* — see [[decisions/decision-log|SPB-05]].
- *"Leading bid so far"* is explicitly configurable/future scope — not shown by default. **PRD-confirmed twice:** as a requirement, *"Future scope: display leading bid amount — configuration to be supported (current functionality)"* (PRD, Feature 3), and as an existing legacy behavior, *"There is a profile that for a client the carrier app (200) will show the best bid so far"* (PRD, Appendix B).

> **New at v1.4 — a second, competing account of the carrier-facing surface exists, and it is not merged into the two screens above.** Jana's draft story proposes a **twelve-screen authenticated carrier portal** in place of (or beyond) Kathleen's single tokenized response screen. It is a different surface set answering a different access model, and combining the two would manufacture an anatomy nobody proposed. **Kathleen's Screens 2 and 3 remain the canon's carrier-facing anatomy for v1; Jana's inventory is recorded separately in §15.5 as a proposed target state.** Read them side by side, never spliced.
>
> **One carrier-facing behavior the story adds that is *not* contingent on the access fight:** the carrier's own view of a bid it did not act on. *"if no bid is submitted by deadline → screen reflects 'Bid Expired'"* (Jana story, screen summary §4, Bid Details Page), and history *"must show shipments where the carrier submitted a bid as well as events they simply did not participate in (bid expired)"* (Jana story, AC "Carrier Portal History"). **No artifact in evidence before this drew an expired or non-participated state on a carrier surface** — legacy's `Quote History` view (§14.3) has the columns but the PRD never says what a non-response renders as. §7, [[decisions/decision-log|SPB-17]].

### Behavior the PRD specifies that no screen exists for (new at v1.2)

The wireframe covers Features 1, 3, 4 (CE-1 only), 5, 7 and 10. **Four areas of the PRD have no drawing at all**, and are recorded here as canon so they are not mistaken for out-of-scope.

**1. Configuration and master data (PRD, Feature 2).** Overflow behavior is configured, not hardcoded: multiple named carrier lists, configurable at **system-wide, client, shipping site and org** level; each list holding `list name`, `equipment type`, `participating carriers (with contact emails)`, `default quote duration`; customised by equipment type and **country-to-country origin/destination pair** based on the client's shipping history; charge types configurable per equipment type; and per-client/org/equipment automation controls (manual-review flag, tolerance %, tolerance monetary cap, total quote cap, no-route fallback rule). Full surface in [[data/quote-model|data/quote-model]] §5. **Where this configuration lives is itself unresolved** — Kathleen wrote into the PRD, *"David, I am uncertain if access to OCM will give us these configurations or if we need to build some configurations in OdysseyOne?"* (PRD, Feature 2), and the later MTG 4 note lands on: *"OCM profiles will be configured in the shipment planning function in OdysseyOne. This overflow application does not need to build this logic, we just need to know what part of the profile we need to access."* (PRD, Appendix B). Client-level enablement is explicitly **not built** — *"only controlled by not creating an overflow list."*

**2. Invalidation and recovery (PRD, Features 8 and 9).** A **transportation-relevant** order change or cancellation while a quote is open **automatically closes and invalidates** it; the internal team is notified; invalidated records are visually distinguished from valid completed ones; and the user is offered recovery options — *"re-quote, rebuild consolidation, break apart load, reselect carriers."* SpotBoard's own responsibility is deliberately narrow: *"The overflow requirement is limited to taking the shipment off the board; restarting tendering is handled by the broader shipment/tendering workflow."* The current behavior is blunt and known to be blunt — *"any transportation-relevant change causes the quote to close and the tendering process to start over, even if the change is minor"*, with smarter logic named as a future refinement *"not assumed for MVP"*.

> **Cross-domain dependency, and a live one.** The PRD refuses to define what counts as transportation-relevant and points at Shipments instead: *"The detailed field list should be referenced from the centralized story owned by **Jana** rather than duplicated in this PRD… (Jana has that list for the shipment domain)."* (PRD, Feature 8, Feature 9). Examples discussed were location, date, weight and volume changes. **SpotBoard's invalidation trigger is therefore owned by the Shipments domain**, not this one — see [[../shipments/domain-analysis|Shipments — Domain Analysis]].

**3. Six internal exception emails and the award email (PRD, Feature 11).** The wireframe draws `CE-1` and nothing else. The catalog is two carrier emails and six internal alerts — `CE-2` Quote Awarded, `IE-1` No Carrier Bids Submitted, `IE-2` Lowest Cost Carrier Out of Tolerance, `IE-3` Manual Review Required, `IE-4` Quote Cancelled — Order Change, `IE-5` No Costed LCE Option, `IE-6` No Distance for LCE Calculation. Recipients, triggers, required actions and subject-line patterns in [[data/quote-model|data/quote-model]] §7. **This closes the v1.1 TBD on what `IE-1…IE-6` mean.**

**4. The affiliate — an internal Odyssey desk bidding inside the carrier auction.** Legacy overflow is **three applications**: the carrier app (`200`), the internal planner app (`220`), and an **affiliate app (`240`) available only to Odyssey's CTNS brokerage team** (PRD, Appendix B).

> "This screen permit the CTNS user to see the lowest quoted amount from all truckers that bidded on the shipment. This permits CTNS to potentially win the business if they can bid at a lower price than the current lowest bidder. Note, that there is also a setting that permits CTNS an extra 'X' minutes to bid after the bid closes for all other carriers." (PRD, Appendix B)

That extra window is the `COFL_AFFLM` "affiliate close-time extension" profile, and it explains the third date on the quote header — open, close, **affiliate close** ([[data/quote-model|data/quote-model]] §1.1). **No other artifact mentions the affiliate at all**: it is absent from both transcripts and from all seven wireframe screens, and the PRD never states whether OdysseyONE rebuilds it — the only trace in the requirements is an unanswered *"Confirm whether OdysseyONE needs an equivalent affiliate-close concept"* (PRD, Feature 1). It also sits in visible tension with the PRD's own security non-functional, *"cross-carrier visibility is not permitted"* (PRD, §6) — the affiliate app exists to grant exactly that, to one privileged internal bidder. Flagged in §9 and §10; **this is the single largest thing the PRD reveals that the domain had no idea about.**

## 7. Vocabulary

Kathleen's labels, verbatim. This is the naming source for UI work.

| Term | Meaning as used |
|---|---|
| **SpotBoard** | The domain. The renamed Overflow Bidding. |
| **Loadboard** / **load board** | **Not this domain.** A separate, automated channel that posts a shipment to Odyssey's *internal* brokerage desks. Written as one word `Loadboard` in Kathleen's module nav; spoken as two words. Never "lowboard" — that spelling is a mishearing and must not enter any artifact. See §4. |
| **Quote** / **Quote ID** (`QT-88421`) | One bid event on one shipment. The primary key of the domain — carriers reference it by phone. |
| **Req #** (`#1`, `#2`) | Sequence of quote requests on one shipment; a re-quote is a new Req #, the prior one is `Superseded`. |
| **RFQ** | The outbound invitation. Verb form is the button `Send RFQ`. |
| **Bid** | A carrier's priced response. |
| **Carrier List** | A named, profile-derived pool (e.g. *TL Southeast Overflow*) with a default quote duration. Exactly one per quote. |
| **Quote Duration** / **open window** | Minutes the bid stays open. Integer 1–99,999. Locks on send. |
| **Routed** | Flag: carrier was already in the contract routing guide for this shipment. Red, unchecked by default. |
| **Waffled / Gave back** | Flag: carrier previously took and returned the load. Red, unchecked by default. |
| **Award** | Selecting a winning bid. Explicitly **not** a tender. |
| **Award Type** | `Manual` or `Auto` — recorded on every award. |
| **Tolerance** | Percentage above the benchmark within which a bid may auto-award. |
| **Benchmark** | Highest total routed cost; per-mile fallback if no routed cost exists. |
| **Manual-review flag** | Config that forces planner review even when within tolerance. |
| **Markup** | OCM % or flat amount added to the winning bid at hand-off to Tender. |
| **SPOT RATE** | Badge on the tender route-guide row that came from SpotBoard. |
| **Force Close** | Close a quote before its window expires. |
| **Invalidated** | Outcome when a transportation-relevant change to the shipment voids the quote. |
| **Comparable-equipment expansion** | Widening the eligible carrier pool by equipment class (TL → [TL, LTL]). |
| **OCM** | **= Org Carrier Mode** — expansion resolved at v1.2. The configuration/profile layer that owns carrier participation, accessorial/charge codes, markup %, tolerance and hazmat certification. The overflow master profile is **profile type 14 / code 69**. Source: *"Doug to give more details on this screen and the **Org Carrier Mode** profile and more details on inheritance"* (PRD, Appendix B) — the only expansion of the acronym in any artifact, in a caption about the OCM profile screen. |
| **CE-1 / CE-2** | Carrier **emails**: `CE-1` Request for Quote (RFQ) invitation; `CE-2` Quote Awarded. PRD-confirmed (Feature 11). |
| **IE-1…IE-6** | **Meanings resolved at v1.2 — and they are emails first, not in-app.** Six *internal exception alert emails* to configured client/org team mailboxes: `IE-1` No Carrier Bids Submitted · `IE-2` Lowest Cost Carrier Out of Tolerance · `IE-3` Manual Review Required · `IE-4` Quote Cancelled — Order Change · `IE-5` No Costed LCE Option · `IE-6` No Distance for LCE Calculation. In-app delivery of the same six is a **supplement to email and future scope** — the v1 canon had this backwards. Full matrix: [[data/quote-model|data/quote-model]] §7. |
| **MFFCOFL** | The legacy Oracle Forms module being replaced — *"Maintain Carrier Overflow"*. An inquiry-plus-action console: read-only load header plus a working section driving the quote lifecycle. Entered with a load id + type code (`'L'` single load, `'C'` consolidated load). `MFFCS2` is the sibling consolidation screen that owns multi-stop dates. |
| **LCE** | *Load Carrier Equipment* — legacy `mf_load_carrier_equipment`, the existing tenders on a load. The source of the **routed cost** that tolerance benchmarks against, hence `No Costed LCE Option` (IE-5) and `No Distance for LCE Calculation` (IE-6). |
| **Affiliate** / **CTNS** | An internal Odyssey brokerage team that **bids inside the carrier auction from a privileged app (240)**, seeing the current lowest bid and getting `COFL_AFFLM` extra minutes after the window closes for everyone else. §6. |
| **Transportation-relevant change** | The class of order change that invalidates an open quote. **Defined in the Shipments domain, not this one** — the authoritative field list is Jana's (PRD, Features 8–9). Examples discussed: location, date, weight, volume. |
| **Routed cost** | The cost of a route-guide (LCE) option. The tolerance benchmark is the **highest total** routed cost on the guide — *"not necessarily the highest routed cost for the same equipment type as the overflow bid"* (PRD, Feature 5). |
| **Process SCAC** | Legacy name for the award action. *"'Process SCAC' means applying the selected carrier to the load/carrier list… this should be represented as 'Award' or 'Award Carrier' in OdysseyONE"* (PRD, Feature 7). See [[decisions/decision-log|SPB-06]]. |
| **No Bid Submitted** | **New at v1.4.** A carrier-row outcome: the bid window closed with **no submission from that carrier**. Written by the **close event**, not by a carrier action — every other value in the legacy carrier-row set is written by a transmission or a response, so this one has a new writer, the clock. **Explicitly not a decline** — *"without implying a formal decision from the carrier"*. Source: Jana story, AC "Status Visibility in Odyssey One" and Business Rules "History". **Not the PRD's and not the wireframe's**; the string is Jana's proposal (*"or equivalent"*). See below and [[decisions/decision-log|SPB-17]]. |
| **Bid Expired** | **New at v1.4.** The **carrier-facing** rendering of the same event, on the carrier's own bid detail screen — *"if no bid is submitted by deadline → screen reflects 'Bid Expired'"* (Jana story, screen summary §4). The internal counterpart is `No Bid Submitted`. §6. |
| **Overflow Portal** | **Jana's term for the carrier-facing surface** (Jana story, throughout). **A third string, and not canonical** — neither *Overflow* (the pre-rename product name) nor *Carrier Portal* (the surface). Unlike the PRD's usage this cannot plead chronology: the story postdates the rename by a day, and Jana was not in the meeting where it happened (§11). **[[decisions/decision-log|SPB-01]] stands.** Use `SpotBoard` for the product and `OdysseyONE Carrier Portal` for the surface. §5, §10. |

### Status vocabularies (five distinct sets — do not merge)

| Where | Values | Standing at v1.3 |
|---|---|---|
| **Quote header state** (internal/legacy) | `Draft`, `OPEN`, `CLOSED` | **New at v1.2.** The actual persisted state machine, with `Modify` copying a CLOSED quote into a new Draft and `Clear` voiding it (PRD, Feature 8; Appendix A.3). Drives button/field enablement — matrix in [[data/quote-model|data/quote-model]] §3.2. **Visually confirmed on the legacy header field** (PRD pp.22, 25, 29, read visually). |
| **Carrier row — the legacy set** | `Sent`, `Excluded`, `Done`, `Declined`, `Accepted` | **New at v1.3, recovered from the Appendix B screenshots** (PRD pp.21–22, 25, 29, read visually). The `Status` column of the `MFFCOFL` carrier grid — blank before send, `Sent` on transmission, `Excluded` for carriers an eligibility rule kept out, then `Done` / `Declined` / `Accepted` on response. **This is the persisted vocabulary**, and it is not the wireframe's shape: legacy has no `Lowest bid`, because lowest is a comparison rather than a state. §14. |
| Carrier bid row (Screen 4) | `Lowest bid`, `Bid`, `Declined`, (no response = `—`) | Wireframe-only. The PRD names all four concepts but **never as a status set**. Presentational; treat as proposal, and reconcile against the legacy set above. |
| Quote lifecycle / Monitoring Board (Screen 6) | `Open`, `Closing soon`, `In review`, `Awarded`, `Unawarded`, `Invalidated` | Mostly PRD-backed; `Closing soon` is a presentational derivation of the countdown. |
| Quote outcome / history (Screen 7) | `Awarded`, `Not awarded`, `Cancelled`, `Manual intervention`, `Invalidated (transportation-relevant change)`, `Superseded by later request` | **Promoted to firm at v1.2 — this is the PRD's own vocabulary, not Kathleen's.** *"awarded, non-awarded, cancelled, or manual intervention"* (PRD, Feature 10) plus *"invalidated by transportation-relevant change, or superseded by a later quote request"* (same feature). |

None of these is the [[../shipments/domain-analysis|Shipments]] tender status set (`Sent` / `Accepted` / `Declined` / `Cancelled`). Screen 5 shows a fifth string on the tender row — `Tendered — Pending` — **resolved at v1.2 as wireframe drift**, see §9.5.

#### Non-participation — the value none of the five sets names (new at v1.4)

**Check the five sets above for how a carrier that simply never answered is represented. None of them names it.**

| Vocabulary | How a silent carrier appears | Problem |
|---|---|---|
| Legacy carrier row (`Sent`/`Excluded`/`Done`/`Declined`/`Accepted`) | **It doesn't.** The row stays at `Sent` forever — indistinguishable from a carrier whose RFQ went out five seconds ago (PRD pp.21–22, 25, 29, read visually) | A terminal outcome wearing an in-flight status |
| Wireframe Screen 4 | An **em-dash**, `—` (wireframe, Screen 4) | Presentational absence, not a value. Nothing to filter, count, or audit on |
| Quote outcome / history (PRD, Feature 10) | Not applicable — that set is **quote-level** (`Awarded`, `Not awarded`, …), not per-carrier | Wrong altitude for the question |

**Jana's story names it, and makes it first-class** (Jana story, throughout — this is the single most consistent thread in the artifact):

> *"Odyssey One must reflect the carrier as having **'No Bid Submitted'** or equivalent non-participation status in the bid summary."* (Jana story, AC "Status Visibility in Odyssey One")

Four rules travel with it, all from the same artifact:

1. **`No Bid Submitted` is a status**, carried per carrier in the bid summary — not a blank (Jana story, AC "Status Visibility in Odyssey One").
2. **No explicit decline is required.** *"Carrier participation is voluntary. The portal must not require an explicit action to decline participation; lack of bid submission by the deadline is considered non-participation."* (Jana story, Business Rules "No Mandatory Carrier Response").
3. **Expiry *is* the non-participation event.** *"the event naturally expires for them without requiring any explicit decline"* (Jana story, Business Rules "Bid Window Enforcement"); *"the bid opportunity for that carrier expires automatically with no further action from the carrier"* (Jana story, AC "Bid Expiry for Non-Participating Carriers").
4. **It must not read as a decision.** *"Non-participation events appear in history simply as 'No Bid Submitted' or similar wording, **without implying a formal decision from the carrier**."* (Jana story, Business Rules "History"). This is the semantic point, and it is why `Declined` cannot be reused for it — `Declined` asserts an act.

**Extends, does not conflict — with one reading that must be avoided.** Rule 2 says the portal must not *require* a decline; it does **not** say `Decline` is removed. Read as "remove the Decline action" it would contradict PRD Feature 3 (`Submit Bid` / `Update Bid` / `Decline`, with re-bid after decline explicitly allowed), the legacy `Decline` / `Submit` button pair (PRD p.23, read visually) and the persisted `Declined` status. **Read as written — decline stays available, silence is not a failure state — it is a clean extension.** So the domain has *two distinct* non-award outcomes that must not be collapsed: an act (`Declined`) and an absence (`No Bid Submitted`). Full treatment in [[data/quote-model|data/quote-model]] §3.4; logged as [[decisions/decision-log|SPB-17]].

**Adjacent but not the same question.** The PRD asks itself *"Should we add another quote status for carrier history so quotes don't stay in review status?"* (PRD, Feature 7 — an unnumbered open question). That is about **quotes stuck in review**; Jana's is about **carriers who never answered**. Related enough to be decided together, different enough that Jana's story does not close the PRD's question.

**Terms added to the vocabulary table above:** `No Bid Submitted`, `Bid Expired` (its carrier-facing counterpart), and `Overflow Portal` (flagged as non-canonical naming).

**One more set, and it is a sixth — not reconciled by anyone.** Jana's Bid Listing Page specifies a **carrier-facing** status set: *"list of all bids visible to the carrier (**Open / Expired / Awarded / Cancelled**)"* (Jana story, screen summary §4). It matches none of the five above — quote-level like the outcome set but shorter, using `Expired` where the PRD says `Not awarded` and the wireframe says `Unawarded`, and dropping `Manual intervention`, `Invalidated` and `Superseded`, plausibly because those are internal concepts a carrier should not see. **No artifact maps it onto the other five.** [[data/quote-model|data/quote-model]] §3.3.

## 8. Actors

| Actor | Surfaces | Can do |
|---|---|---|
| **Internal — Logistics Coordinator / Planner** (wireframe's own label, Screen 1) | Screens 1, 4, 5, 6, 7 | Pick carrier list, set duration and flexible-pickup, include/exclude carriers (including opting in red-flagged ones), set planned pickup/delivery, `Send RFQ`, `Save Draft`; review bids and tolerance math; `Award Carrier & Send to Tender`, `Force Close`, `Modify & Resend`, `Clear & Start Over`; monitor across shipments; search/export quote history |
| **Internal — Ops / Operations Manager** | Screens 6, 7 | Monitoring board and audit. Named as an actor by the PRD's user stories — *"As an Operations Manager I want to monitor open and unawarded quote queues so I can identify loads at risk end-of-day"* (PRD, §7). Whether Ops can award is still **not stated**. |
| **Internal — Affiliate / CTNS brokerage** | Legacy app `240`; **no OdysseyONE surface proposed** | Bids inside the carrier auction while seeing *"the lowest quoted amount from all truckers that bidded"*, plus `COFL_AFFLM` extra minutes after the window closes for other carriers (PRD, Appendix B). **New at v1.2.** Whether this actor exists in OdysseyONE is unanswered — §6, §10. |
| **External — Carrier** | Screens 2, 3 | Receive RFQ email, open token link, view lane detail (no Order/Load ID, shipper by name only), enter linehaul + accessorials (fuel read-only), `Submit Bid` / `Update Bid` / `Decline`, re-bid after declining while the window is open. Sees only its own quotes. |
| **System** | — | Build eligible list from OCM profiles + comparable-equipment expansion; send CE-1; compute totals and tolerance; auto-award when within tolerance and auto-award is on; send CE-2; apply markup at hand-off; append the SPOT RATE row to the route guide |

### Carrier access and authentication — Kathleen's v1 model (settled at v1.2, **CONTESTED at v1.4**)

> ⚠️ **Read this subsection together with §15.** Everything below is **Kathleen O'Donnell's position**, recorded at v1.2 and **left intact and unsoftened** at v1.4. It is no longer the only position in evidence: **Jana's draft story specifies a full username/password carrier portal**, and *"in today's meeting Jana and Irina were opposing Kathleen's email link idea"* (meeting context, 2026-07-29). **The disagreement is recorded in §15 and is not resolved anywhere in this canon.** Nothing below has been withdrawn, weakened or rewritten to accommodate the other position — it is Kathleen's account, in her own words, and it stands as that.

This was the domain's largest open question and at v1.2 it had an answer, from the newest artifact then in evidence.

**The problem, stated by the PRD.** OdysseyONE has no carrier identity layer: *"External carrier user management (SSO / self-service provisioning) is not yet available."* (PRD, §1). The PRD put two options on the table and refused to pick, marking the choice **`Recommendation: TBD`** and **`ACTION: Dev/Thomas to confirm preferred approach before development begins`** (PRD, §3; `OQ-1`, owner **Thomas**):

| | Option A — Net Native User Management | Option B — Secure Token-Based Access |
|---|---|---|
| Mechanism | *"TMS carrier portal users are provisioned through Net Native"* | *"Each RFQ email to a carrier contains a unique, time-limited signed token. The carrier clicks the link and is taken directly to their quote form without a login."* |
| Cost | *"requires coordination with the Net Native team for each carrier onboarding"* | *"Token expires when the quote closes. No user account required."* |

**Kathleen's answer, 27 days later — Option B for v1.** Her note is dated **2026-07-29**, is the most recent evidence we hold, and is by the PRD's own owner. Verbatim:

> "Today the carrier get the email and logs in to give their reply. That would be great, but we don't have user management to control which carrier users can log in… So what I've suggested is **sending an email and a link that will be a token for that recipient to respond in that screen that I show for the UX**." (Kathleen note, 2026-07-29)

**The v1 model, stated plainly:** *no carrier login exists.* A carrier receives `CE-1` containing a link carrying a **token scoped to that recipient**, which opens the single-quote response screen — the wireframe's Screen 3. Token expiry is bounded by the PRD's non-functional: *"Signed carrier access tokens must expire no later than quote close time"* (PRD, §6). The PRD's own user story wants exactly this shape: *"As a Carrier I want to receive an email with a direct link to the bid so I can respond quickly **without navigating a portal**"* (PRD, §7).

**Status of this as a decision.** Kathleen's wording is *"what I've suggested"* — a PM proposal, and the PRD formally assigns `OQ-1`'s decision to **Thomas / Dev**. **No confirmation from Thomas is in evidence.** So: this is the working v1 model on the authority of the domain's PM and the newest artifact we hold, and `OQ-1` is answered in substance but not formally closed. [[decisions/decision-log|SPB-09]].

> **Appended at v1.4.** That last sentence is now doing more work than it was written to do. `OQ-1` being *"answered in substance but not formally closed"* was, at v1.2, a bookkeeping caveat about a missing signature from Thomas. At v1.4 it is the live seam: a **second named PM has proposed the opposite answer** on the same day, and the person the PRD appoints to decide has still not spoken. §15, [[decisions/decision-log|SPB-16]].

### What is deferred, and the limitation being inherited

**Deferred until user management exists** — Kathleen names the future state precisely:

> "When we have user management, we can add a place where the user can login and see **all quotes** and **how much time they have to respond to current quote** and see **historical quotes**." (Kathleen note, 2026-07-29)

**INFERENCE (short):** that description maps almost one-to-one onto PRD Feature 3's logged-in requirements — *"The portal shall display all open quote requests available to the authenticated carrier"*, *"a Quote Requests view for open/active bids"*, *"a Quote History view for closed requests"*, *"export of quote history data"*. Those are therefore the parts of Feature 3 that **do not ship in v1**; what ships is the single tokenized response screen. Kathleen does not enumerate the Feature 3 bullets herself, so the mapping is mine, not hers.

**The org-scoping limitation, inherited from Tracking.** This is the part with real design consequences and it comes only from Kathleen's note:

> "The way that Irina built tracking is that **any carrier can login and see all tracking for their carrier**. This will be the same for the carrier quote. Say we have 5 carrier reps that quote from XYZ carrier, **we have no way to control which user can respond to the quote**. Any carrier user that logs in from that company will see all tracking and all quotes for their org. Once we have user management, we can control it." (Kathleen note, 2026-07-29)

Three consequences, kept distinct:

1. **Isolation is at the carrier-organization boundary, not the user boundary.** Once logins exist, any user at XYZ carrier sees every quote for XYZ. There is no way to scope a quote to the individual rep it was sent to.
2. **That does not violate the PRD's security requirement.** *"Carrier access must be scoped to their own quote requests only; **cross-carrier** visibility is not permitted"* (PRD, §6) is an org-level rule, and org-level isolation holds. The gap Kathleen describes is *intra*-org, which the PRD never legislated. **Compatible, not contradictory** — but the PRD's Appendix B phrasing *"A carrier sees only its own open quote requests"* should be read as *carrier org*, not *carrier user*.
3. **v1 is, ironically, tighter than the deferred state.** A per-recipient token is scoped to the individual who received it; the future logged-in area is scoped only to the org. The org-scoping limitation is a property of what comes *after* v1, not of v1 itself.

**Precedent, not one-off.** Tracking already ships this model. SpotBoard is inheriting an existing platform constraint rather than inventing one, which is why it is described as settled rather than as a risk.

### Is the carrier portal ours or theirs? — the v1.1 "surprise", RESOLVED

v1.1 flagged a contradiction: the Shipments canon calls the carrier portal *"a separate system, managed by Kathleen's team"* ([[../shipments/domain-analysis|domain-analysis]] §4), while the wireframe brands its bid screen `OdysseyONE Carrier Portal`. **Both are right, at different times.**

- **The Shipments canon describes the legacy state and is accurate about it.** *"The carrier portal is part of TMS functionality but uses Net Native credentials for carrier login."* (PRD, Appendix B). It is a TMS app — number `200` — with its own credential system.
- **The PRD's decision is to absorb it.** *"As OdysseyONE becomes the system of record for shipment execution, this function must be **rebuilt natively within OdysseyONE's Carrier Portal**."* (PRD, §2) and *"The system shall provide an external carrier-facing quote portal **within OdysseyONE**"* (PRD, Feature 3). The document's own cover line is `OdysseyONE Carrier Portal`.

**Answer: absorbed, not wrapped.** And Kathleen's note completes the move — Option A would have kept a foot in TMS by reusing Net Native credentials; the v1 token model removes even that dependency. [[decisions/decision-log|SPB-10]]. *(Recorded here only. The Shipments canon is not edited by this cycle — its sentence remains true of the system as it exists today.)*

## 9. Conflicts and tensions

Recorded, not resolved.

1. ~~**"Overflow" used as something *other than* SpotBoard.**~~ **CLOSED at v1.1 — leaked legacy naming, no third channel.** Screen 1's guardrail reads *"cannot start SpotBoard when there is an active/accepted tender or another open bid (Loadboard or Overflow)"*. v1 could not tell whether "Overflow" there was stale copy for SpotBoard itself or a third bidding channel. The loadboard transcript is a meeting held expressly to enumerate the boards, and it enumerates **exactly two**: *"the difference between load board and overflow board"* (loadboard transcript, 0:34, Saikat) → *"they're separate processes"* (0:45, Kathleen). No third board is named by anyone. The guardrail therefore reads: *no other open bid, whether on the Loadboard or on SpotBoard itself.* **INFERENCE** — nobody was asked about the guardrail sentence directly; this is the two-board finding applied to it. It is a short inference and the alternative (a third, entirely unmentioned channel) now has no support at all. Logged as [[decisions/decision-log|SPB-08]]; supersedes the **Watch** clause on [[decisions/decision-log|SPB-01]]. Still worth one confirming sentence from Kathleen when convenient, since the copy itself should be corrected to say "SpotBoard".
2. **Tab vs button.** Irina describes legacy TMS as a **button** on the standard page (transcript, 14:07) and audibly oscillates between button and tab (12:35–15:05). The wireframe commits to a tab. Both readings preserved; the wireframe's is the working assumption ([[decisions/decision-log|SPB-03]]).
3. ~~**When SpotBoard may start.**~~ **CLOSED at v1.2 — the looser reading is correct.** Shipments canon said *"When ALL carriers from the routing guide have been exhausted"* ([[../shipments/domain-analysis|domain-analysis]] §4); the wireframe guardrail was looser. The PRD settles it with three independent triggers — *"the guide is exhausted, no carriers exist for the lane, or lead time is too short"* (PRD, §2) — and UI constraints that gate only on tender state, never on exhaustion (PRD, Feature 1). Exhaustion is the common case, not the rule. See §2 and [[decisions/decision-log|SPB-12]]. **The Shipments canon's sentence is narrower than reality**; not edited by this cycle, flagged for the Shipments owner.
4. **`Add Quote` already exists on the Tender tab.** The Shipments canon lists `Add Quote` — *"add a manual carrier quote"* — as an existing tender action ([[../shipments/domain-analysis|domain-analysis]] §3), and Irina independently confirms the legacy capability: *"you might manually add this carrier with the equipment and enter manually the quote. Yes, there is a currently in TMS."* (transcript, 12:14). SpotBoard automates the same outcome via bidding. **Unresolved: does `Add Quote` survive alongside SpotBoard, or does SpotBoard subsume it?** This was in fact the question that opened the discussion — Kathleen: *"Irina, do you understand what this quote is in the screen on the tender?"* (transcript, 11:47) — and it is never answered.
5. ~~**`Tendered — Pending` is a new status string.**~~ **CLOSED at v1.2 — wireframe drift; use the Shipments set.** Screen 5 shows `Tendered — Pending` on the spot row, and its annotation names four values (*"Tendered / Pending / Accepted / Declined"*) matching no vocabulary in evidence. **The PRD is completely silent on tender statuses** — it defines quote statuses only, and defers the tender itself to the shipment workflow. With no PRD support and an explicit Shipments decision on the point (`Sent` / `Accepted` / `Declined` / `Cancelled`, `Pending` retired — [[../shipments/decisions/decision-log|DEC-03]]), the tender row's status set is **owned by Shipments and governed by DEC-03**. Recorded as a judgement on source authority, not as PRD confirmation: the PRD's silence cannot *prove* drift, but nothing supports the invented strings and the domain that owns the field has already decided. **Treat `Tendered — Pending` as wireframe copy to discard.**
6. **Wireframe screen count vs tab strip.** Screen 4's tab strip omits `Instructions`, which Screens 1 and 5 include. Almost certainly a wireframe slip, not intent. Unchanged at v1.2 — the PRD does not specify a tab strip.
7. ~~**Cross-artifact silence on automation.**~~ **CLOSED at v1.2 — automation is the design intent.** Irina's account was entirely manual; the wireframe added auto-award within tolerance; v1.1 could not source it. The PRD sources it and goes further: *"The target process should remain **highly automated**, with manual intervention required only for defined exceptions or failed automation paths"* (PRD, §1). Manual review is Feature 7, an exception path — not the default. Irina was describing the planner's experience of the exception, which is the path she works.

### New at v1.2 — tensions inside the PRD itself

8. ~~**The PRD contradicts itself on whether carriers can change dates.**~~ **RESOLVED at v1.3 — the screenshot settles it, and the two statements were never really in conflict.** Feature 3's legacy note said carriers cannot: *"The legacy MFFCOFL workflow does not support carriers proposing alternate pickup/delivery dates — dates are planned by the system/planner and presented to the carrier. Allowing carrier-proposed dates in OdysseyONE would be a **net-new capability**"*, and `OQ-6` asks whether to add it. Appendix B said the opposite: *"the carrier can add the line haul, fuel and additional charges. **They an also change pickup and delivery dates**"* [sic]. v1.2 could only guess at a reconciliation. **The Appendix B screenshot the sentence captions has now been read** (PRD p.23, read visually) and it shows exactly what the carrier gets: a `Flexible Dates` panel headed *"\*Choose pickup and delivery dates:"*, with an editable `Pickup` and `Delivery` date each **bounded by a read-only `Earliest` and `Latest`** set by the planner. The carrier **picks within a window; it does not propose a date.** That is the `Flexible Pickup` / `Flexible Delivery` feature, not a carrier-proposal capability — so Feature 3 is right that proposal is net-new, and Appendix B is right that dates are editable. Both true. **`OQ-6` therefore remains a genuine net-new question**, and the v1.2 worry that it might already be answered *yes* is dismissed. [[decisions/decision-log|SPB-13]].
9. **The affiliate app vs the security non-functional.** *"Carrier access must be scoped to their own quote requests only; cross-carrier visibility is not permitted"* (PRD, §6) against an affiliate app whose entire purpose is showing one privileged internal bidder everyone else's lowest bid, plus extra time to beat it (PRD, Appendix B). Resolvable if "carrier" excludes the internal affiliate desk — but the PRD never says so, and never says whether the affiliate is in scope. §6, §10.
   > **Narrowed at v1.3, not resolved.** The screens show what actually leaks (PRD pp.26–28, read visually; §14.5): a **price, never an identity**. The `Best` column carries an amount; the adjacent `Username` column shows the *viewer's own* submitting user, not the leader's. And the affiliate bids through the ordinary carrier portal as `SCAC = CTNS` — there is no separate affiliate UI, only a data privilege plus the `COFL_AFFLM` clock extension. Also relevant: the same disclosure is available to **ordinary carriers** wherever `SHOW_BEST = Y` is set for a client ([[data/quote-model|data/quote-model]] §5.7), so leading-bid visibility is not an affiliate-only exception at all — it is a per-org configuration that the affiliate happens to always have. **The tension is therefore about competitive information rather than identity disclosure, and it is a configuration question rather than an architectural exception.** Whether the affiliate is in scope for OdysseyONE is still unanswered.
10. **An internal exception with no email.** Feature 4 lists *"An order change or cancellation invalidates an open quote"* among the internal notification triggers and annotates it **"(no notification for this today)"**. Feature 11's `IE-4` covers only the **consolidation** case. Single-load invalidation therefore appears to have no email, while Feature 9 requires *"The system shall notify the internal team when a shipment change invalidates an open quote"* without qualification. **Likely a genuine PRD gap rather than conversion damage** — the three passages are individually legible and simply do not agree.
11. **Unfilled placeholders in the PRD.** *"The system shall allow the user to set or adjust quote duration (open window) prior to sending. **Up to X hours.**"* (PRD, Feature 1) — `X` is never resolved, and sits oddly beside the legacy rule of 1–99,999 minutes (69 days). Read as an unfinished sentence rather than a requirement.
12. **`David` / `Dave` / `DAVID`.** The PRD uses all three, assigning `OQ-8` and `OQ-9` to "Dave" and Feature 1's launch-point decision to "DAVID". **INFERENCE:** one person, David Johns, who attends SpotBoard meetings (§11). Not certain — "Dave" also appears paired with Doug in `OQ-12`/`OQ-15` as if a distinct engineering-side reviewer. Low stakes; worth one clarifying question.

### New at v1.4 — tensions introduced by the Jana story

> Both of these are **content conflicts, entirely separable from the access disagreement in §15.** They would exist whichever access model wins.

13. **`"standard accessorial codes same as Odyssey One to be used"` against a charge list the PRD makes configurable per OCM profile.** Jana's Bid Edit Page requires *"cost components (**standard accessorial codes same as Odyssey One to be used**), review total cost, submit final bid"* (Jana story, screen summary §4). The PRD's model is the opposite of standard: *"Accessorial / charge-code list configurable per OCM"* (PRD, Feature 3, verbatim), driven by the `COFL Charges` profile through the `MFFOOCC` screen, *"Maintain OCM Overflow Carrier Charges"* (PRD p.33, read visually) — and the PRD contains **two different lists at two different orgs**: `HZC` · `TKM` · `TAR` · `HT` · `MSC` on one profile (PRD p.33, read visually) against a carrier-facing `Hazmat` · `Pickup` · `Tips` · `Tolls` on another (PRD p.23, read visually).
    **Two readings, and they are not equally costly.** *(i)* Jana means the **code vocabulary** should come from Odyssey One's charge master rather than a portal-local invention — compatible with per-OCM *selection from* that shared master, and arguably already how legacy works, since `MFFOOCC` carries a `Charge` code **plus a separate `Description Alias`** (PRD p.33, read visually), i.e. shared codes with per-profile labels. *(ii)* Jana means **one standard list for everyone** — which contradicts Feature 3 verbatim and is falsified by the two lists visible in the PRD itself.
    **INFERENCE (marked): reading (i) is what reconciles the artifacts, and the `Description Alias` column is the mechanism that makes it work.** Nobody has said this. Jana's sentence is nine words with no field list behind it, and she may well mean (ii). **It also lands squarely on an open PRD question** — `OQ-8`, *"Do different carriers within the same client have different surcharge code lists configured?"*, owner **Dave** (§10). Jana's requirement presumes the answer is *no*; the PRD has not established it either way. **Ask Jana which she means before any charge-code work; do not resolve it by picking the convenient reading.**
    One thing the requirement must **not** be read to license: exposing Odyssey's full internal charge master to carriers. `QMU QUOTE MARKUP` is an Odyssey-side code applied *after* award and carriers never see it ([[decisions/decision-log|SPB-15]]).

14. **A carrier-facing `shipment ID` filter against [[decisions/decision-log|SPB-05]].** Jana's story puts shipment identifiers in the carrier's own hands, twice: *"filters and sorting based on date, **shipment ID**, bid status, route, etc."* (Jana story, screen summary §4, Bid Listing Page) and *"filters such as **shipment ID**, date range, event type"* (Jana story, screen summary §5, Bid History Page). The Bid Details Page is also specified as *"**full shipment information**"* (Jana story, screen summary §4) with no field list bounding it.
    **This contradicts a PRD requirement, in the PRD's own words, and the PRD names shipment IDs specifically:** *"**No IDs will be shared for Order/Shipment to protect from carriers 'stealing the load'**"* (PRD, Feature 4), restated as *"Order ID and Load ID shall be excluded"* (PRD, Feature 11) — and confirmed visually, since the legacy carrier portal's quote list has **no Order or Load column anywhere** while showing `Shipper` as a bare company name (PRD pp.22, 26, read visually; §14.3). Legacy went so far as to build an **entire internal screen** (`MFFQCOFL`, §14.2) purely to let planners resolve a quote number back to an order/load, *because* carriers cannot be given the identifier.
    **Verdict: SPB-05 survives and this is drift in the story, not a revision of the decision.** The PRD is *"Development Ready"* requirement text with a named domain owner; the story is an unpublished draft whose screen summary is self-described as *"a concise list of the UI screens the portal would typically require"* — a sketch of a generic carrier portal, in which a shipment-ID filter is an unremarkable default. **INFERENCE (short, marked): the `shipment ID` filters are boilerplate rather than an intentional reversal of SPB-05** — the story never mentions load stealing, disintermediation, or SPB-05's concern at all, so there is no evidence of a considered decision to overturn it. **It still needs flagging to Jana**, because a filter is not cosmetic: it is a query surface, and *"full shipment information"* is exactly the phrase under which order and load numbers arrive by accident.

## 10. Open / TBD

> **Two kinds of open question, kept apart.** *Ours* are gaps in our understanding of the domain. *Theirs* are the PRD's own unresolved product decisions, which have named owners and are open regardless of how well we understand them. The PRD's 17 numbered questions are listed separately below and are **not** defects in this canon.
>
> **A third kind, new at v1.4: a question that is open because two people who both get to answer it disagree.** That is not a gap in our understanding — we understand both positions precisely — and it is not an ordinary product TBD either, because it already *has* two answers. It is listed first, below.

### Nothing was closed at v1.4

**Stated explicitly so the absence is not read as an oversight.** The Jana story closes no open item in this section. It **sharpens** two (`OQ-1`, now contested rather than merely unratified; `OQ-8`, now with a requirement leaning on it — §9.13), **adds** the items below, and leaves the rest untouched. In particular it does **not** close *"Is 'SpotBoard' internal-only?"* — see §5 and the naming note below.

### Newly opened at v1.4 — ours, and the first one is the headline

- **⚠️ HOW DO CARRIERS REACH THEIR BIDS? Two named PMs, two answers, same day, neither superseded.** **Kathleen O'Donnell** (PM, SpotBoard; owner of the PRD): a per-recipient tokenized email link, **no login**, for v1 — *because* user management does not exist (Kathleen note, 2026-07-29; [[decisions/decision-log|SPB-09]]). **Janardhana (Jana)** (PM, Shipments): a **username/password carrier portal** with Login, Forgot/Reset Password, Change Password, Profile, Notification Preferences, Dashboard, Bid Listing, Bid Details, Bid Edit, Bid History, FAQ and Contact Support (Jana story, screen summary §§1–6). Opposition stated in a live meeting by **Jana and Irina Jachimek** (meeting context, 2026-07-29). **Formal owner of the decision: Thomas** (`OQ-1`, PRD §3, §8) — who has still not spoken. **Full treatment, including what is genuinely incompatible versus only apparently so, and what would settle it: §15.** [[decisions/decision-log|SPB-16]]. **This is now the domain's largest open question, displacing the affiliate.**
  - **Sub-question, and it may be the whole thing:** *is the disagreement about architecture or about sequencing?* Kathleen's own model is explicitly two-phase (token now, logged-in area when user management lands), and Jana's inventory is close to a one-for-one description of Kathleen's phase two. **§15.3 argues this and marks it INFERENCE** — nobody in any artifact has framed the disagreement as being about timing. **One question to Jana settles it: is this v1 scope, or the target state?**
- **When does user management land, and who owns it?** This is the load-bearing unknown underneath the whole disagreement, and **no artifact in evidence dates it, scopes it, or names an owner.** The PRD states only the negative — *"External carrier user management (SSO / self-service provisioning) is not yet available"* (PRD, §1) — and Kathleen's *"when we have user management"* (Kathleen note, 2026-07-29) is a condition with no date attached. **A user-management timeline would very likely collapse the disagreement without anyone having to concede anything** (§15.4).
- **Does Jana's portal presume per-user scoping, or does it inherit the org-level limitation?** The story's access clause is *"Given a **carrier** logs into the Carrier Portal"* (Jana story, AC "Carrier Access & Bid Opportunity") — **carrier, not rep** — and every listed surface is org-scoped. The single hint of a user model is four words on the Carrier Profile Page: *"editable sections **depending on permissions**"* (Jana story, screen summary §2), with no model behind them. §15.2.
- **Which of the two non-award outcomes does a given surface need?** Non-participation (`No Bid Submitted`) and decline (`Declined`) are now both first-class and must not be collapsed (§7, [[decisions/decision-log|SPB-17]]). Where each appears — planner bid table, monitoring board, quote history, carrier history — is unspecified in every artifact.
- **`IE-1` is quote-level; Jana's requirement is carrier-level.** `IE-1` *"No Carrier Bids Submitted"* fires on *"Quote expiration reached with **zero bids**"* ([[data/quote-model|data/quote-model]] §7). Jana requires per-carrier non-participation recorded *"to support a complete audit trail"* even when other carriers did bid (Jana story, Business Rules "Odyssey One Visibility"). **Not a conflict — a gap.** Whether partial non-participation warrants any notification at all is unaddressed by both artifacts.
- **Does the rename reach the other domains?** Jana says *"Overflow Portal"* throughout, **one day after the wireframe settled `SpotBoard`** — and unlike the PRD she cannot plead chronology (§5). She was not in the meeting where the rename happened (attendees: Kathleen, Irina, Manuela — §11). **[[decisions/decision-log|SPB-01]] is not reopened and must not be.** What is genuinely open is whether the rename has been communicated beyond that meeting, and note that *"Overflow Portal"* is a **new third string** — not *Overflow* (the product) and not *Carrier Portal* (the surface) — used to mean the carrier-facing surface specifically.
- **Who owns carrier-portal requirements?** Kathleen is SpotBoard's PM and the PRD's owner (§11); Jana is the PM for **Shipments** and is writing carrier-portal user stories. Neither is Thomas, whom the PRD appoints to decide the access model. **Recorded as a structural observation, not a criticism** — Jana owns the transportation-relevant-change definition that SpotBoard's invalidation depends on (§6), so cross-domain authorship is already normal here. But **it means the disagreement is partly about jurisdiction, and jurisdiction is not resolved by evidence.** §15.4.

### Closed at v1.2

| Was open | Closed by |
|---|---|
| **The PRD itself** — v1.1's single largest blocker (*"Everything in §6 is Kathleen's reading of it, at medium stated confidence"*) | **Received and integrated.** The wireframe turns out to be a faithful rendering of it; caveats lifted where they agree (§12). |
| **What do `IE-1…IE-6` mean?** (v1.1 §7) | **Closed.** Six internal exception alert **emails**, fully catalogued with recipients and triggers (PRD, Feature 11) → §6, [[data/quote-model|data/quote-model]] §7. v1 also had them backwards: they are emails, with in-app delivery as future scope. |
| **What does "OCM" expand to?** (v1.1 §7) | **Closed. `OCM` = Org Carrier Mode** (PRD, Appendix B, caption to the OCM profile screen). Overflow master profile = type 14 / code 69. |
| **Is the carrier portal a separate system or ours?** (v1.1 §10 cross-domain) | **Closed — absorbed.** Legacy is TMS app `200` on Net Native credentials; the PRD rebuilds it *"natively within OdysseyONE's Carrier Portal"* (PRD, §2) → §8, [[decisions/decision-log|SPB-10]]. |
| **How do carriers authenticate?** (implicit in v1.1 §8's *"token link… or signed token — OQ in Section 3"*) | **Closed for v1** — per-recipient tokenized email link; logged-in area deferred until user management exists (Kathleen note, 2026-07-29) → §8, [[decisions/decision-log|SPB-09]]. Formally still `OQ-1`, owner Thomas. |
| **When may SpotBoard start?** (v1.1 §9.3) | **Closed.** Three triggers, exhaustion being only one; UI constraints gate on tender state (PRD, §2, Feature 1) → §2, [[decisions/decision-log|SPB-12]]. |
| **Is `Tendered — Pending` a real status?** (v1.1 §9.5) | **Closed — wireframe drift.** PRD silent on tender statuses; Shipments [[../shipments/decisions/decision-log|DEC-03]] governs → §9.5. |
| **Where does auto-award come from?** (v1.1 §9.7) | **Closed.** Automation is the stated design intent, not an addition (PRD, §1) → §9.7. |
| **Are user stories coming?** (v1.1 "blocking canon completion") | **Partially closed.** The PRD carries eight `As a… I want to… So that…` stories in §7 → §13. Whether a fuller separate story set exists is unknown. |
| **Is "SpotBoard" internal-only?** (v1.1 §5) | **Still open**, and the PRD cannot help — it predates the name. Unchanged. |

### Closed at v1.1

| Was open | Closed by |
|---|---|
| **What is Loadboard, and does it relate to SpotBoard beyond mutual exclusion?** (v1 §4 TBD) | **Closed.** Loadboard = automated posting to Odyssey's internal brokerage desks; SpotBoard = planner-initiated external carrier bidding. They relate only by convention of order (soft) and runtime mutual exclusion. (loadboard transcript, 0:45–1:40) → §4, [[decisions/decision-log|SPB-07]] |
| **Is the wireframe's "Loadboard or Overflow" guardrail a third channel?** (v1 §9.1) | **Closed — no third channel.** Exactly two boards are enumerated in a meeting held to enumerate them. (loadboard transcript, 0:34–0:45) → §9.1, [[decisions/decision-log|SPB-08]] |
| **Doug's role** (v1 §11, "role unknown") | **Closed.** TMS expert / SME, invited by Kathleen to own the Loadboard settings answer. (loadboard transcript, 0:14) → §11 |
| **Is the wireframe's "David" our David Johns?** (v1 §11, inferred/unconfirmed) | **Not formally closed, but materially strengthened** — David Johns attends SpotBoard meetings. (loadboard transcript, 0:09) → §11 |

### Newly opened at v1.1

- **Loadboard's configuration/settings model** — *"how the settings of load board works. So it can tell us when shipment will go to load board"* (loadboard transcript, 0:14). This is the question the meeting was convened to answer and **the answer is not in the captured audio.** The single most valuable follow-up available on this boundary. Ask Doug.
- **What decides bulk vs truckload routing on the Loadboard**, given two distinct receiving desks (loadboard transcript, 1:04–1:19). SpotBoard's carrier-list model has no equivalent split; whether that matters is unknown.
- **Can a shipment be on the Loadboard and reach SpotBoard in the same lifecycle** — i.e. does an unactioned Loadboard posting close before a SpotBoard quote opens, or can both be live? The Screen 1 guardrail says they cannot overlap; nothing says what closes a Loadboard posting.
- **Does the Loadboard have any concept of a bid or a price**, or is it strictly claim/no-claim? *"for them to action if they want them or not"* (loadboard transcript, 1:19) suggests the latter, but the guardrail calls it an *"open bid (Loadboard or Overflow)"* — which implies Loadboard postings *are* bids. **Sharpened at v1.2, still unresolved:** that phrasing is now known to be the **PRD's own** (Feature 1), not loose wireframe copy, so "bid" is deliberate product language from Kathleen's team — but the PRD says nothing else about Loadboard, so it settles nothing.
- **Who "Kumar" is** (§11).
- **What Cognizant's delivery scope on SpotBoard/Loadboard is**, given Saikat's briefing role (§11).

### Newly opened at v1.2 — ours

- **Is the affiliate (CTNS) in scope for OdysseyONE?** An internal Odyssey desk that bids in the auction, sees the leading bid, and gets extra minutes after close (§6). The PRD documents it in Appendix B and then never mentions it in any requirement; its only trace in Sections 1–8 is *"Confirm whether OdysseyONE needs an equivalent affiliate-close concept"*. If it is in scope, it is a **fourth actor with a fourth surface** and a deliberate exception to the cross-carrier-visibility rule. **The most consequential unknown opened by the PRD.**
- ~~**Does the internal planner "see all bids" view (legacy app `220`) map onto the wireframe's Monitoring Board, or is it a third thing?**~~ **Largely answered at v1.3 by the screenshot** (PRD p.27, read visually) — §14.7. The `220` Quote Viewer is a **flat cross-quote list with a filter bar** (`Client` · `Order#` · `Load#` · `Quote#` · a date `Interval`), grouped by Quote#, one row per invited carrier, with an `Awarded` column and drill-in icons to quote and load detail. **It is Screen 7 (Quote History), not Screen 6.** It has no KPI tiles, no countdown-driven "closing soon" grouping and no queue framing — which are precisely the things Kathleen added. So the Monitoring Board is genuinely new design against a stated Feature 10 requirement, and the Quote History screen has a legacy ancestor. **INFERENCE** — the PRD never maps its screens onto the wireframe's; this is a structural comparison of the two.
- ~~**Can carriers change pickup/delivery dates today, or not?**~~ **CLOSED at v1.3** — they choose within a planner-set Earliest/Latest window; they do not propose dates. §9.8, [[decisions/decision-log|SPB-13]].
- **What is the `Indirect` carrier flag?** Named in `OQ-17` and Appendix A.11 #7 alongside the four documented flags, and defined nowhere in the PRD. Appendix A.5 documents four rules; `Indirect` is a fifth term with no rule. **Unchanged at v1.3** — the legacy carrier grid was read visually (§14.2) and has no `Indirect` column; only `Gave Back` and `Routed` are drawn as checkboxes. So the term is not merely undocumented, it is not on the screen the PRD reverse-engineered either.
- **Is single-load quote invalidation notified?** Feature 9 requires it, Feature 4 says *"no notification for this today"*, `IE-4` covers only consolidations (§9.10). **Unchanged at v1.3** — confirmed to be a PRD gap, not conversion damage.
- **Where does SpotBoard configuration actually live** — TMS OCM, OdysseyONE, or split? Kathleen asked David this inside the PRD and the answer arrived only partially, in an Appendix B meeting note (§6). **Narrowed at v1.3:** we now know *what* the configuration consists of — eleven named `COFL *` OCM profiles and thirteen system profiles ([[data/quote-model|data/quote-model]] §5.4–5.5) — so the question is no longer "what are these settings" but only "which system owns them". Note also that `OQ-5`, one of the two questions bearing on this, is **struck through** ([[decisions/decision-log|SPB-14]]).
- **NEW at v1.3: how does OCM profile inheritance resolve?** `SHOW_BEST` has a system default (`N`) and a per-org override grid, so profiles resolve down an org hierarchy — but the rule is documented nowhere. The PRD names the gap itself: *"Doug to give more details on this screen and the Org Carrier Mode profile and more details on inheritance."* (PRD p.28, read visually). **Ask Doug** — this is now the highest-value configuration question, and it was invisible before the pages were read.
- ~~**What are the system profiles on PRD pp.30–32?**~~ **CLOSED at v1.3.** Recovered by reading the pages as images: eleven `COFL *` OCM profiles and thirteen system profiles, transcribed in [[data/quote-model|data/quote-model]] §5.4–5.5. **Partial residue:** both tables' description columns are clipped at the right page edge *in the source raster*, so the descriptions are truncated. Re-request those two tables as text if the full wording matters.

### The PRD's own open questions — theirs, not ours (PRD, §8)

Seventeen numbered questions, each with a named owner. `OQ-16` and `OQ-17` are marked `(New)` — surfaced by the legacy MFFCOFL analysis. Reproduced here because they define what the product has not yet decided; **the later meetings and Kathleen's note have moved three of them.**

> **⚠️ Corrected at v1.3 — three of these are struck through and only fourteen are live.** v1.2 said *"all `Status: Open` as of 07/02/2026"*, which is what the text conversion showed. Reading the pages (PRD pp.14–15, read visually) shows **`OQ-4`, `OQ-5` and `OQ-16` struck through in full — number, question, owner and status all crossed out.** MarkItDown flattens strikethrough into ordinary text, so the conversion presented three retired questions as live ones. **INFERENCE (strong, and marked because the PRD nowhere states what strikethrough means):** a struck-through row in an open-questions table is a retired question — either answered or withdrawn. The rows are kept below with the strike shown, because *what they asked* is still evidence even where *the asking* has stopped. [[decisions/decision-log|SPB-14]].

| # | Question (condensed) | Owner | Moved since 07/02? |
|---|---|---|---|
| `OQ-1` | Carrier authentication: Net Native (Option A) or token-based email link (Option B)? | **Thomas** | ⚠️ **CONTESTED at v1.4 — and the contest does not fit the question's own two options.** v1.2 read it as *"answered in substance — Option B for v1"* (Kathleen note, 2026-07-29). At v1.4 a second named PM proposes a **third thing** the PRD never listed: OdysseyONE-native username/password credentials, which is neither Net Native provisioning nor a tokenized link (Jana story, screen summary §1). **Thomas's confirmation is now not bookkeeping but arbitration.** §15, [[decisions/decision-log|SPB-16]], [[decisions/decision-log|SPB-09]]. |
| `OQ-2` | Configurable minimum threshold before force-close is suppressed? (TMS default 5 min) | Product / Ops | No. |
| `OQ-3` | Which Boomi integration event handles outbound RFQ and award emails? Legacy also has a dormant external-rate-API path to account for architecturally. | Engineering | No. |
| ~~`OQ-4`~~ | ~~Is markup applied automatically post-award, or configured per quote by the planner?~~ | ~~Ops / Product~~ | **STRUCK THROUGH — retired** (p.14, read visually). v1.2 wrongly carried it as open and used it to qualify the canon's markup account; that qualification is withdrawn (§6, [[decisions/decision-log|SPB-14]], [[decisions/decision-log|SPB-15]]). |
| ~~`OQ-5`~~ | ~~Should OdysseyONE use OCM profiles, master data settings, or both to decide whether a shipment moves from **load board, overflow, or user review**?~~ | ~~Product / Ops~~ | **STRUCK THROUGH — retired** (p.14, read visually). **Note what does *not* change:** [[decisions/decision-log|SPB-07]] cited this row as corroboration that Loadboard / SpotBoard / user-review are three *peer* destinations of failed tendering. That sentence still exists on the page and still frames them as peers, so the corroboration holds — only the question's live status changes. §4. |
| `OQ-6` | Carrier-proposed pickup/delivery dates in MVP, or excluded as atypical? Legacy MFFCOFL does not support it — net-new. | Product / Ops | **Sharpened at v1.3, still open.** The apparent Appendix B contradiction is resolved: legacy lets carriers *choose within a planner-set window*, not propose dates (§9.8, [[decisions/decision-log|SPB-13]]). So `OQ-6` really is a net-new-capability question, as Feature 3 says. |
| `OQ-7` | What is the current manual-review queue name in TMS/Odyssey monitoring — replicate it or introduce a new Overflow review queue? | Product / Ops | No. *(Copy note: any new queue is a **SpotBoard** review queue.)* |
| `OQ-8` | Do different carriers within the same client have different surcharge code lists configured? | **Dave** (to query master data) | No. |
| `OQ-9` | Which clients are still active in overflow configuration? *"No formal offboarding process exists, and some configurations may be outdated."* | **Dave** (to produce an active client list) | No. |
| `OQ-10` | Is MSDS/SDS in MVP scope? *"Current adoption is limited, and Amazon S3 account maintenance is uncertain."* | Product / Ops | No. **The wireframe shows the MSDS link without this caveat** (§12). |
| `OQ-11` | Multi-stop shipments do not support per-carrier date planning — confirm as an acceptable MVP constraint. | Product / Ops | No. Legacy confirms it is a hard rule. |
| `OQ-12` | Split the single tolerance threshold into separate auto-award-eligibility and markup-eligibility thresholds? | Engineering / Dave / Doug | No. This is the wireframe's *"separate thresholds"* note. |
| `OQ-13` | Which equipment types are **actually** used in overflow, from quote history rather than configuration? | **Doug** (agreed to write the query) | No. |
| `OQ-14` | Provide a shipment-level quote history view **in addition to** the global quote history/search view? | Product / UX | **Pre-answered by the wireframe, not by the product** — Kathleen draws both (Screen 1/4 `Quote History` sub-tab *and* Screen 7). A proposal, not a resolution. §12. |
| `OQ-15` | Which non-standard OCM profiles need wrapper functions — overflow carrier list, surcharge/charge code list, tolerance, markup? | Engineering / Dave / Doug | No. |
| ~~`OQ-16` `(New)`~~ | ~~Legacy embargo enforcement exists in code but is disabled and has not been executing. Build a working embargo check, or permanently out of scope? If built, what triggers it?~~ | ~~Product / **Compliance**~~ | **STRUCK THROUGH — retired** (p.15, read visually). **INFERENCE (short):** retired in favour of the un-struck §5 out-of-scope entry, which already answers it — *"no live embargo control to carry forward as-is"*, i.e. embargo enforcement is simply out of MVP scope. That reading makes the strike consistent with the rest of the document; the PRD does not say so itself. [[decisions/decision-log|SPB-14]]. |
| `OQ-17` `(New)` | Which legacy carrier grid flags — `Not Hazmat Certified`, `Waffled/Gave Back`, `Routed`, `Embargoed`, `Indirect` — must surface to planners, and how? *"How each is set is now defined; what remains open is which to display."* | Product / UX | No. The wireframe surfaces two of five (`Routed`, `Waffled / Gave back`) — a proposal. |

**Unnumbered open questions the PRD asks in its own body**, easy to lose because they are not in the `OQ` table:

- *"Do we need to have dates for each carrier or can we just have shipment dates?"* (Feature 1)
- *"Up to X hours"* — the quote-duration ceiling is an unfilled placeholder (Feature 1; §9.11)
- *"Confirm whether OdysseyONE needs an equivalent affiliate-close concept"* — `COFL_AFFLM` (Feature 1)
- *"David, I am uncertain if access to OCM will give us these configurations or if we need to build some configurations in OdysseyOne?"* (Feature 2)
- *"Should we add another quote status for carrier history so quotes don't stay in review status?"* (Feature 7) — the wireframe's *"carrier history status"* note
- *"USD only for MVP. Should we support CAD as well?"* (§5, Out of Scope)
- *"Doug to give more details on this screen and the Org Carrier Mode profile and more details on inheritance."* (Appendix B)

**Resolved by the PRD's own SME log (Appendix A.11)** — six of seven closed by the TMS developer during the legacy analysis: the load-type code meaning, the dormant-but-supported rate API, email as a non-negotiable RFQ channel, flexible pickup/delivery confirmed in active use (23 configs each), master-data drill-through roles, and the multi-stop date restriction carrying forward unchanged. Item #7 stayed open and became `OQ-17`.

### Domain questions raised by the artifacts themselves

- Placement and permissions for the Monitoring Board: *"who sees all clients vs. only their org. Confirm with David alongside the Feature 1 launch-point decision."* (wireframe, Screen 6 annotation). **Still open** — and the PRD adds context: role-based access beyond carrier-portal login is explicitly deferred post-MVP (PRD, §5).
- The **Feature 1 launch-point decision** — where SpotBoard is launched from. **Still open, now with the four candidate placements named** (§3, [[decisions/decision-log|SPB-11]]).
- Which carrier flags surface in the UI (`OQ-17`) and whether carriers may propose dates (`OQ-6`) — both now traced to the PRD's numbered list above.
- Legacy dispatch path: *"Legacy sends via email/report OR external rate API (dormant, zero carriers today). Architect for both paths."* — **PRD-confirmed** as `OQ-3`; mechanics in [[data/quote-model|data/quote-model]] §4.
- `SCAC` = Standard Carrier Alpha Code. Still unexpanded in any artifact; the PRD uses it as a bare field name. Low risk — it is an industry standard.

### Cross-domain

- Does SpotBoard map to Jana's `Spot Bid` shipment status, and does `Bid Review` correspond to `In review`? (§2) — *more likely after v1.1, still unconfirmed; the PRD does not use OdysseyONE shipment statuses at all*
- ~~What is **Loadboard**?~~ **Closed** — see above and §4. What remains is Loadboard's **settings model** and whether it earns its own domain folder (§4 recommendation). The PRD corroborates the boundary but adds nothing on Loadboard's trigger.
- Does `Add Quote` on the Tender tab survive? (§9.4) — **still open. The PRD never mentions it**, which is itself informative: a document that reverse-engineers the entire legacy overflow flow does not treat manual quote entry as part of it.
- Is "SpotBoard" an internal-only name, or does it appear on carrier-facing surfaces? (§5) — the PRD cannot help; it predates the name.
- ~~**Is SpotBoard absorbing the carrier portal, or wrapping it?**~~ **CLOSED — absorbing.** §8, [[decisions/decision-log|SPB-10]].
- **NEW: the transportation-relevant change definition is Jana's, and SpotBoard depends on it.** Quote invalidation is triggered by it, and the PRD deliberately refuses to duplicate the field list (§6). This is a hard dependency from SpotBoard onto Shipments.
- **NEW: `GlobalSearch` intersects quote-ID search.** *"A Quote ID search capability is operationally important because carriers may contact planners with only the quote number"* (PRD, Feature 10) — PRD-confirmed, and the reason is now sourced rather than inferred. See [[../../20-cross-cutting/global-search/global-search|GlobalSearch]].

## 11. Stakeholders

| Person | Role | Evidence |
|---|---|---|
| **Kathleen O'Donnell** | **Product Manager for SpotBoard.** Ran both meetings, authored the wireframe herself. Convenes the SMEs and answers on the domain's behalf. | meeting 1 throughout; wireframe authorship (`C:/Users/kathleenodonnell/…`); loadboard transcript, 0:14–1:26 |
| **Janardhana ("Jana")** | **PM for Shipments — new to this table at v1.4, though the canon has depended on him since v1.2.** Author of the draft carrier-portal story that opens the access disagreement (§15), and one of the two people reported as opposing Kathleen's email-link model. Already load-bearing here in a different role: **the transportation-relevant-change field list that triggers SpotBoard quote invalidation is his**, and the PRD deliberately refuses to duplicate it — *"referenced from the centralized story owned by Jana"* (PRD, Features 8–9; §6). Also the source of the `Spot Bid` shipment-status enumeration this canon has never been able to map onto SpotBoard (§2). **Not SpotBoard's PM** — that is Kathleen. | `Jana story` (authorship); meeting context, 2026-07-29; PRD, Features 8 and 9; `vault/10-domains/shipments/grooming/0401-jana.vtt`, 15:57 |
| **Irina Jachimek** | Stakeholder — the deepest legacy-TMS knowledge in meeting 1; supplied the mechanism explanation Kathleen endorsed. Employer and formal role **TBD**. Absent from the loadboard meeting. **New at v1.4:** reported as opposing Kathleen's email-link model alongside Jana (meeting context, 2026-07-29). ⚠️ **Her position is held on secondhand evidence only** — a one-sentence report from Manuela, with **no transcript, note or artifact in Irina's own words.** We do not know what she proposed instead, or on what grounds. §15.1. Note the irony worth checking with her: it is **Irina's own Tracking implementation** that established the org-scoped carrier access model SpotBoard inherits (Kathleen note, 2026-07-29). | Named in full in the meeting 1 speaker labels (line 52). Kathleen: *"Good explanation, Irina."* (16:36); meeting context, 2026-07-29 |
| **Manuela Ramirez (Iris Software)** | Designer — our user. | meeting 1 |
| **David Johns** | **Attends SpotBoard meetings** — present in the loadboard meeting. Established elsewhere in this project as the source of operational feedback on TL/LTL, PGI and cost allocation. The wireframe names a "David" as required confirmation for Monitoring Board placement/permissions and the Feature 1 launch point; his attendance here makes **David Johns** the near-certain referent — **still formally an inference**, but a much shorter one than at v1. | loadboard transcript, 0:09 (speaker label `David Johns`); wireframe, Screen 6 annotation |
| **Doug** | **Role identified at v1.1: the TMS expert / SME.** Kathleen: *"I invited Doug, who is the expert with TMS, to explain to us how the settings of load board works"* (loadboard transcript, 0:14). Owns the Loadboard configuration answer. **INFERENCE:** also the `Speaker 1` at 1:40, since Kathleen turns to him by name at 1:26 and this is the immediate reply. v1 had him as "role unknown"; he is also the wireframe's pending-PRD confirmation. Surname and employer **TBD**. | loadboard transcript, 0:14, 0:34, 1:26, 1:40; wireframe, disclaimer |
| **Saikat Ghosh (Cognizant)** | **New at v1.1.** Delivery partner (Cognizant) — the party asking for the domain explanation, i.e. on the receiving end of requirements: *"we like to know what is the difference between load board and overflow board"* (loadboard transcript, 0:34). His "we" implies a Cognizant group being briefed, not an individual query. Cognizant's involvement in SpotBoard/Loadboard delivery is established by his presence; his specific title is **TBD**. | loadboard transcript, 0:06–1:39 (speaker label carries the employer) |
| **Thomas** | **New at v1.2.** Named as the **owner of the carrier-authentication decision** — `OQ-1`, with the action written as *"Dev/Thomas to confirm preferred approach before development begins"* (PRD, §3, §8). The `Dev/` prefix places him on the engineering side. First name only; no other artifact mentions him. Whether he is the "Thomas" recorded elsewhere in this project as an ally is **unconfirmed — INFERENCE, do not rely on it.** ⚠️ **His importance changes at v1.4.** At v1.2 his confirmation was a formality over a decision Kathleen had effectively made. At v1.4 he is the PRD-appointed arbiter of a live disagreement between two PMs, and **his silence is now the reason the question is open** (§15.4). He remains a first name with no contact, no employer and no evidence of having been asked. | PRD, §3 and §8 `OQ-1` |
| **"Kumar"** | **New at v1.1, unresolved.** Named once, by Saikat, apparently greeting someone joining the call — *"Hi. / Kumar."* (loadboard transcript, 1:34–1:35). No speaker label of that name appears; the person never speaks in the captured audio. First name only. Given the greeting comes from Saikat, **possibly also Cognizant — INFERENCE, weak, do not rely on it.** Role, employer and even whether they were actually present are all **TBD**. | loadboard transcript, 1:35 |

**Internal groups named (not individuals):**

| Group | What it is | Evidence |
|---|---|---|
| **Kennesaw brokerage team** | Odyssey's in-house brokerage desk receiving *"truckload kind of shipments"* off the Loadboard. Kennesaw is an Odyssey location. | loadboard transcript, 1:04 |
| **Bulk brokerage group** | Second in-house desk, receiving bulk shipments off the Loadboard. Implies a **bulk vs truckload** split in Loadboard routing that has no counterpart yet in the SpotBoard carrier-list model. | loadboard transcript, 1:13 |

**Strengthened at v1.2 by the PRD:**

- **Kathleen O'Donnell** is named in the PRD's own metadata block as `Owner — Product Management`. Her PM role is now documentary, not inferred.
- **David** is confirmed as the decision-maker on SpotBoard's launch point (*"DAVID to confirm where this makes most sense"*, Feature 1) and as the addressee of Kathleen's configuration question (Feature 2), and the PRD's draft notice says it was *"reviewed and updated through four working sessions with David and the SME team."* The wireframe's "David" is therefore **near-certainly David Johns**, who attends these meetings (loadboard transcript, 0:09) — the inference is now very short. The `David`/`Dave` spelling question is §9.12.
- **Doug** owns three concrete deliverables in the PRD: the equipment-type usage query (`OQ-13`), the OCM/Org Carrier Mode inheritance walkthrough (Appendix B), and — with Dave and Engineering — the tolerance-split and profile-wrapper questions (`OQ-12`, `OQ-15`). Combined with the 07/29 meeting's *"the expert with TMS"*, his role is fully established.

**Transcription noise — not stakeholders.** The loadboard transcript contains two garbled proper nouns that should not be read as people until corroborated: *"I need to meet you with Mington"* (0:06) and *"Thanks, Tom."* (0:11). Both are single-instance and unintelligible in context. Sample names in the wireframe's mock data — `J. Rivera`, `M. Ford`, `S. Holden` — are fictional.

---

## 12. Wireframe ↔ PRD reconciliation (new at v1.2)

**Why this section exists.** v1 and v1.1 treated the wireframe's *layouts* as proposal and its *vocabulary* as primary, precisely because Kathleen labelled it *"Confidence: medium… AI-generated draft"* and derived it from a PRD we did not hold. **We now hold that PRD.** So every wireframe claim can be tested: agreement lifts the caveat, divergence needs a verdict.

**Headline finding.** The wireframe is a **faithful** rendering. Read side by side, most of its annotations are PRD sentences reproduced near-verbatim — the guardrails, the equipment-expansion rule, the red/unchecked default, the fuel-read-only rule, the decline-and-re-bid rule, the tolerance benchmark, the markup timing, the "Award Carrier replaces Process SCAC" note and the outcome badges are all PRD text. The medium-confidence label was Kathleen being conservative about *layout*, and it turns out the *content* was traced closely. **The default posture flips: assume a wireframe claim is PRD-backed unless listed under Divergences below.**

### 12.1 Promoted to firm — wireframe agrees with the PRD

Caveat lifted on all of the following. Where the PRD's wording is materially richer, the pointer is given.

| Claim | PRD source |
|---|---|
| Comparable-equipment expansion `TL → [TL, LTL]`; the equipment field is really picking a carrier list | Feature 1 legacy note, near-verbatim; Appendix A.3 step 2 |
| Exactly one carrier list per quote; lists are named and carry a default duration | Feature 1; Feature 2 |
| `Routed` and `Waffled / Gave back` render red, **unchecked by default**, planner may opt in | Feature 1, verbatim |
| Non-hazmat-certified carriers excluded **and deactivated** — never selectable | Appendix A.5, BR-1 |
| Quote duration is an integer **1–99,999 min** and **locks once sent** | Feature 1 legacy note; Appendix A.7 |
| `Send RFQ` blocked until pickup/delivery dates are populated for every included carrier | Feature 1 |
| `Flexible Pickup` appears only when config allows flexible days > 0; *"carriers see dates, planners see the window not the day count"* | Feature 1 (the PRD's own sentence here is garbled — *"When flexible operations cannot see number of days flexible, but carriers can see the dates"* — the wireframe's rendering is the clearer one and matches Appendix A.9) |
| Entry guardrails: no active/accepted tender, no other open bid | Feature 1 "UI Constraints", verbatim |
| Order ID and Load ID excluded from carrier surfaces; shipper by name only | Feature 4; Feature 11 CE-1; Feature 3 |
| Subject line must start with *"Request for Quote…"* | Feature 11, verbatim |
| Fuel precalculated and **not editable** by the carrier | Feature 3, verbatim |
| Accessorial / charge-code list configurable per OCM | Feature 3, verbatim |
| Carrier may update a bid while open; may decline and re-bid while still open (*"status would move out of Declined"*) | Feature 3, verbatim — the wireframe's parenthetical is the PRD's |
| Shows most recent bid + submitting user (*"Last submitted: $2,540 by J. Rivera"*) | Feature 3 |
| Countdown; **turns red in the final 15 minutes**; submission blocked after close | Feature 3, verbatim |
| MSDS hyperlink sourced from product master data | Feature 3 — but see 12.2(f) |
| `Award Carrier` replaces legacy `Process SCAC` | Feature 7, verbatim — [[decisions/decision-log|SPB-06]] confirmed |
| Award is auto or manual and the system records which; manual-review flag forces review even within tolerance | Feature 5; Feature 7 |
| Planner may award / reopen-modify / clear / leave unresolved | Feature 7, verbatim |
| Award needs **idempotency / concurrency guards** (no double-award) | Feature 7 legacy note; Appendix A.7 |
| Benchmark = **highest total routed cost**, per-mile fallback if none; show the supporting math to the planner | Feature 5, verbatim |
| Markup is OCM % or flat, applied **at the move from SpotBoard to Tender** | Feature 5, verbatim (qualified by `OQ-4` — §10) |
| Award triggers `CE-2`; if the awarded carrier declines the tender, the next eligible carrier is considered and notified | Feature 4; Feature 11 |
| **Award ≠ tender** — award does not assign the load | Feature 4, verbatim → [[decisions/decision-log|SPB-02]], H2 |
| Multiple quote requests per shipment, **only one active at a time**, each retaining its own carriers, bids, tolerance result, closure reason and outcome | Feature 8, verbatim |
| Data model = one header + N carrier-response rows; preserve historical versions of responses | Feature 10 legacy note; Appendix A.2 |
| **Quote-ID search is first-class** because carriers call with only a quote number | Feature 10, verbatim; Appendix B |
| Outcome badges `Awarded` / `Not awarded` / `Cancelled` / `Manual intervention` / `Invalidated (transportation-relevant change)` / `Superseded by later request` | Feature 10, verbatim — **the status vocabulary is the PRD's, not Kathleen's** |
| End-of-day monitoring queues for open and closed-unawarded quotes | Feature 10, verbatim |
| Legacy dispatch is email/report **or** a dormant external rate API; architect for both | Feature 4 legacy note; Appendix A.6, A.11 #2 |
| *"Leading bid so far"* is configurable / future scope | Feature 3; Appendix B |

### 12.2 Divergences — and which reading applies

Each is classified as **(a) intentional evolution beyond the PRD** or **(b) drift / AI-generation artifact**, with reasoning. Kathleen wrote both documents, so (a) is available in a way it would not be for a third party's wireframe — but authorship is not a licence to assume intent, so each is argued.

**(a) Intentional evolution — Kathleen deliberately moving past the PRD**

- **The name `SpotBoard`.** Wireframe-only; the PRD says *"Overflow"*. **(a), certainly.** The rename happened live in meeting 1 *after* the PRD was written, and the wireframe's own subtitle announces the change: *"Overflow Bidding (now 'SpotBoard')"*. Chronology, not conflict. [[decisions/decision-log|SPB-01]] stands.
- **`SpotBoard` as a dedicated shipment tab.** The PRD lists **four** candidate placements and assigns the choice to David (§3). The wireframe commits to one of them. **(a) — but it must be labelled a proposal, not a decision.** Kathleen flags the openness herself in her Screen 6 annotation (*"the Feature 1 launch-point decision"*), so she is not overriding the PRD, she is voting in it. The canon overstated this at v1/v1.1; corrected by [[decisions/decision-log|SPB-11]].
- **The standalone cross-shipment SpotBoard module (Screen 6), with a top-level module nav.** The PRD requires the *capability* — end-of-day monitoring queues, a Quote Viewer screen — but never specifies a module, a nav, or KPI tiles. **(a), well-grounded.** Kathleen states her reasoning on the artifact: *"Standalone module, not inside one shipment. Resolves the naming mismatch: a 'board' that shows every spot event."* And it has legacy precedent she may not have been thinking of: the internal planner app `220` already shows all bids across carriers, active and historical (PRD, Appendix B). A design answer to a stated requirement — the strongest kind of (a). [[decisions/decision-log|SPB-04]] unaffected.
- **A `Quote History` sub-tab inside the shipment, in addition to the module-level Screen 7.** This is literally `OQ-14` — *"Should OdysseyONE provide a shipment-level quote history view in addition to a global quote history/search view?"*, owner Product/UX, **Open**. The wireframe answers **yes** by drawing both. **(a) — a proposal that pre-answers an open question.** Defensible: Feature 10 leans the same way (*"OdysseyONE should improve this by making quote history accessible from the shipment context where feasible"*). But `OQ-14` is not closed by a wireframe.
- **`Save Draft` as an explicit button on Screen 1.** Legacy has a `Draft` state but no save action — the draft is created implicitly when carriers are loaded, and legacy uses *"silent commit/post… to persist mid-workflow without user prompts"* (PRD, Appendix A.10; A.4). **(a), minor** — making an implicit state explicit is a reasonable UX improvement, but it is a new affordance, not a carry-forward.

**(b) Drift — no PRD support, and the better source says otherwise**

- **`Tendered — Pending`, and the four-value tender status set on Screen 5.** The PRD is **silent on tender statuses** — they belong to the shipment workflow, not to overflow. The Shipments canon has already decided the set and explicitly retired `Pending` ([[../shipments/decisions/decision-log|DEC-03]]). **(b) — discard the string.** §9.5.
- **Screen 4 offers `Force Close` on a quote whose header reads `CLOSED`.** The legacy button-state matrix says that once CLOSED the action becomes `MODIFY`; `CLOSE` is only available while OPEN (PRD, Appendix A.4, which the PRD explicitly nominates as *"the starting point for the OdysseyONE state model and UI enablement rules"*). **(b), a slip** — the screen is showing a full action bar rather than a state-correct one. Build enablement from the matrix in [[data/quote-model|data/quote-model]] §3.2, not from Screen 4.
- **Screen 4's tab strip omits `Instructions`.** **(b), trivial slip.** §9.6.
- **`auto-refresh 1 min` vs the PRD's *"Refresh screen after 1 minute of **inactivity**"*** (Feature 3). A polling refresh and an inactivity-triggered refresh are different behaviors. **(b), small** — take the PRD's wording.

**Neither — the wireframe simply stops short**

- **Coverage gaps, not divergences.** No screen exists for Feature 2 (configuration/master data), Features 8–9 (invalidation and the four recovery options), `CE-2`, any of `IE-1…IE-6`, or the affiliate app. All are canon in §6. The wireframe is 7 screens covering roughly half the PRD; it never claimed otherwise.
- **The wireframe reproduces two of the three entry guardrails** and omits the reciprocal one — *"The system cannot tender when shipment is in Overflow or Loadboard"* (PRD, Feature 1). Omission, not contradiction. §2.

**(f) One case that is neither promotion nor divergence: MSDS.** The wireframe shows the MSDS hyperlink on Screen 3 as settled functionality, and Feature 3 does specify it. But `OQ-10` asks *"Should the MSDS/SDS feature be included in MVP scope? Current adoption is limited, and Amazon S3 account maintenance is uncertain. Confirm whether to include, defer, or remove."* **The requirement exists and its scope is simultaneously open.** Treat the field as specified-but-at-risk. *(Aside: the PRD glosses MSDS as "Material Safety Data **Shipments**" — the standard expansion is Material Safety Data **Sheet**. Likely an authoring slip rather than conversion damage, since "Shipments" is a word this document uses constantly.)*

---

## 13. MVP scope boundary, non-functionals and user stories (new at v1.2)

Material the PRD fixes that no other artifact addressed at all.

### 13.1 Explicitly out of scope for MVP (PRD, §5)

| Item | Note |
|---|---|
| **Rail, Ocean shipment types** | *"Do not handle today"* |
| **Highway carrier data integration** | Use OCM profiles for MVP — the constraint that forces the TMS dependency |
| **Self-service carrier portal registration** | Carrier access via Net Native or token only. **Kathleen's note narrows this further to token for v1** (§8) |
| **Role-based access beyond carrier-portal login** | Deferred post-MVP — this is why Monitoring Board permissions are still open (§10) |
| **Bid analytics / performance dashboards** | Quote-history export is available; analytics deferred |
| **Multi-currency** | USD only. The PRD asks itself *"Should we support CAD as well?"* — unanswered |
| **Dynamic tolerance benchmark / market-rate comparison** | Future; MVP preserves the highest-routed-cost benchmark |
| **Carrier embargo enforcement** | *"no live embargo control to carry forward as-is"* — the legacy check is commented out. `OQ-16` |
| **In-app notifications** | Future; email is the MVP channel for both carrier and internal alerts |

### 13.2 Non-functional requirements (PRD, §6)

Bid submissions and status updates visible to internal users **within 30 seconds**. Every response, closure reason and award decision **logged and traceable**. Rules configurable per client/org/equipment **without code changes**. **The carrier bid flow must be operable on mobile browsers** — a hard constraint on Screen 3's design that no other artifact mentions. Automation failures must **degrade gracefully into manual planner workflows** with clear error messaging. Carrier access scoped to their own quote requests; **no cross-carrier visibility** (with the affiliate tension noted in §9.9). A single load must support **multiple sequential quote cycles** with full history. Signed carrier tokens **expire no later than quote close**. And, called out at length:

> "Legacy makes heavy, exact use of time-zone conversion — dates are entered/displayed in the consignor/consignee local time zone and stored as GMT. **This precision must be preserved in OdysseyONE; date-handling bugs here directly affect quote validity windows and carrier date commitments.**" (PRD, §6)

### 13.3 The PRD's user stories (PRD, §7)

Eight, verbatim in structure — partially closing v1.1's *"user stories expected, not yet received"*. They are epic-level, embedded in the PRD rather than a separate backlog set; whether a fuller set exists elsewhere is unknown.

| As a… | I want to… | So that… |
|---|---|---|
| Planner (Logistics Coordinator) | Initiate overflow bidding from a shipment record | I can get spot quotes when the route guide fails |
| Planner | See all carrier bids ranked by price with tolerance result | I can make a fast, informed award decision |
| Planner | Re-open bidding after a quote expires with no award | I can recover the load without losing history |
| Operations Manager | Monitor open and unawarded quote queues | I can identify loads at risk end-of-day |
| Carrier | Receive an email with a direct link to the bid | I can respond quickly **without navigating a portal** |
| Carrier | Update my bid while the quote is still open | I can stay competitive if my costs change |
| Carrier | See remaining time on the quote window | I know when I need to respond by |
| Internal Team | Be notified when all carriers decline or no bids come in | I can take manual action before the load is at risk |

Two things to notice. The fifth story — *"without navigating a portal"* — is the PRD arguing for its own Option B before `OQ-1` was raised, and independently supports Kathleen's v1 token model (§8). And the fourth names **Operations Manager** as a distinct role from Planner, which is the only place in any artifact where Ops gets a stated need (§8 actors).

---

## 14. Legacy screen evidence — Appendix B, recovered visually (new at v1.3)

**Why this section exists.** Appendix B is the PRD's screenshot walkthrough of the legacy system — ten images with captions. The text conversion kept every caption and stripped every image, so v1.2 held sentences like *"the carrier can add the line haul, fuel and additional charges"* with nothing to look at. **The pages have now been read as images.** This is the only visual record we have of what SpotBoard is replacing, and it is the closest thing to design evidence the domain owns, since the wireframe is a proposal and the PRD is prose.

**Read it as legacy, not as target.** These are Oracle Forms and Oracle APEX screens from the system being retired. They establish *what the capability does today* — field inventory, status vocabulary, button vocabulary, information hierarchy — not what OdysseyONE should look like. Where legacy vocabulary is already ruled out, it is flagged (`Process SCAC` → `Award Carrier`, [[decisions/decision-log|SPB-06]]).

**All citations in this section are `(PRD p.NN, read visually)`.** Field labels are transcribed as rendered. Where a screenshot is low-resolution or partly cropped in the source, that is said rather than guessed.

### 14.1 The legacy internal form — `MFFCOFL`, "Maintain Carrier Overflow" (pp.21, 22, 25, 29)

The screen SpotBoard replaces. One window, four stacked regions:

1. **Shipment block (read-only).** `ID` · `Load` · `Consol` · `Status` · `Ship Date` · `Owner` · `Desc` · `Consignor` · `Consignee` · `Weight` · `Pkg Count` · `Equip` · `Instructions` (checkbox) · `Hazardous` (checkbox) · a **`View Load Details`** button.
2. **Order block (read-only).** `No` · `Date Type` (e.g. `SCHEDULED SHIP DATE`) · `Pickup` · `Delivery` · `Pickup #` · `Earliest` · `Latest`.
3. **Quote block.** `Equipment` (code + description, e.g. `TL` / `Truckload`) · `Owner` · `Ship From` · `Ship To` · `Quote#` · `Status` · `Duration (minutes)` · `Flexible Pickup?` (checkbox) · `Quote Opened` · `Quote Expires` · `Quote Closed`.
4. **Carrier grid.** `Include?` (checkbox) · `Scac` · `Name` · `Pickup` · `Delivery` · `Transit` · `Distance` · `MFFLCE Tender Status` · `Gave Back` (checkbox) · `Routed` (checkbox) · `Status` · `Status Date` · `Username` · `Quoted Cost`. Below it: `External Quote No` · `Expires`, and raw key fields `ocm_id` · `ooc_id` · `rlce_id` · `rlce_mrl_id`.

Footer buttons: **`Carrier Contacts`** and **`Load Instructions`**, always present.

**Four things this confirms or adds.**

- **The red-carrier convention is real and looks exactly as described.** Ineligible carriers (`BSHP`, `CCNI`, `CNWY`, `CTNS`, `SEFL`) render in **red text with `Include?` unchecked**; eligible ones (`RDWY`, `YFSY`) render in black and checked. The PRD's *"These carrier shall display in red and are not selected for the overflow quote by default"* is a description of this screen. **Note the colour carries no other information** — red means "excluded by a rule", and *which* rule is only readable from the separate `Gave Back` / `Routed` checkboxes.
- **The action bar is state-dependent, exactly as the button-enablement matrix says** ([[data/quote-model|data/quote-model]] §3.2). Before send: **`CLEAR`** · **`SEND`**. While OPEN: a single **`CLOSE`**. After close: **`CLEAR`** · **`MODIFY`** · **`Process SCAC`**. This is direct visual confirmation of Appendix A.4, and independently confirms §12.2's finding that wireframe Screen 4 showing `Force Close` on a CLOSED quote is a slip.
- **The carrier-row status vocabulary** — `Sent`, `Excluded`, `Done`, `Declined`, `Accepted`, blank — with a `Status Date`, the responding `Username` (a carrier email address) and `Quoted Cost` alongside. §7.
- **`MFFLCE Tender Status` is a column on the SpotBoard grid**, showing values like `Cancelled` — i.e. legacy surfaces the *tender* state of each candidate carrier inside the *overflow* screen. That is the same provenance link Kathleen asked for in the other direction (`SPOT RATE` on the tender row, [[decisions/decision-log|SPB-02]]).

### 14.2 The quote-lookup screen — `MFFQCOFL`, "Query Carrier Overflow" (pp.29–30)

A flat searchable list of every quote. Columns: `Quote` · `Status` · `Load` · `Status` *(a second, load-level status)* · `Shipment` · `Order` · `Owner` · `Equipment` · `Duration (minutes)` · `Actual` · `Opened` · `Closed` · `Active`.

The caption states the purpose, and it is the strongest available justification for a design requirement the canon already holds: *"When a carrier calls or inquires about an RFQ, they don't have order# or load# to identify to the planner what they are looking at, they have only the quote#. The planners can't easily find the order/load given just a quote#. So, this screen was created where you can query by quote# to find the order/load."* (p.29). **This is the legacy ancestor of quote-ID-first search** ([[decisions/decision-log|SPB-04]], [[decisions/decision-log|SPB-05]]) — a whole screen built to work around the deliberate withholding of order and load IDs.

Two observations from the data. **Quote status shows only `CLOSED` or blank** — never an explicit `OPEN` string in this grid; open quotes have an empty `Status` and a populated `Active` checkbox. And **`Duration` is not always 60**: the grid shows `60`, `10` and `5`-minute quotes, so short windows are in real use — relevant to `OQ-2`'s five-minute force-close threshold, which would suppress force-close for an entire 5-minute quote.

### 14.3 The carrier portal — quote list (pp.22, 26)

Oracle APEX, Odyssey-branded. Left nav has exactly two items: **`Quote Requests`** and **`Quote History`** — which is the shape Kathleen's note describes as the *deferred* logged-in area ([[decisions/decision-log|SPB-09]]). Main region titled **`Requests For Quote`**, table columns: `Load Detail` (a magnifier drill-in) · `Quote#` (sortable, sorted) · `SCAC` · `Shipper` · `Equipment` · `Ship From` · `Ship To` · `Intermediate Stop-offs` · `Hazmat` · `Pickup` …

**This is the field list that proves [[decisions/decision-log|SPB-05]] visually:** `Shipper` shows a company name (`Acme Chemical Company`), `Ship From` / `Ship To` show full addresses, and **there is no Order or Load column anywhere** — while `Load Detail` as a *label* exists as the drill-in icon. The `Quote History` view (p.26) has the same columns plus a search bar, `Rows` selector and an `Actions` menu — standard APEX interactive-report furniture, not designed affordances.

### 14.4 The carrier bid form — `Quote Entry` modal (p.23)

**The single most useful screenshot in the appendix**, because it is the legacy counterpart of wireframe Screen 3. A modal titled `Quote Entry`, headed `Quote# 15940`, with three panels:

- **`Base Charge`** — `Linehaul` (**editable**, `100.00`) · `Currency` (a **dropdown**, `USD`) · `Fuel` (**read-only**, `53.43`, annotated *"[ 1.44 per mile (minimum 10.00) ]"*) · `Subtotal` (`153.43`).
- **`Additional Charges`** — a two-column `Charge` / `Amount` grid, rows driven by the OCM profile: `Hazmat` (`100.00`) · `Pickup` · `Tips` · `Tolls`.
- **`Flexible Dates`** — headed in red, *"\*Choose pickup and delivery dates:"*. `Pickup` (editable, `08-Jul-2026`) with read-only `Earliest` `06-Jul-2026` and `Latest` `10-Jul-2026`; `Delivery` the same shape. Format hint `(dd-Mon-yyyy)` under each, with a date-picker icon.

Actions: **`Decline`** and **`Submit`**.

**Four findings.**

1. **The fuel read-only rule is not just enforced, it is *explained* to the carrier** — the rate basis and minimum are printed next to the value. The canon and wireframe both had "not editable"; neither had "and the carrier is told why". Worth carrying forward.
2. **Dates are chosen within bounds, not proposed.** This resolves conflict §9.8 and is logged as [[decisions/decision-log|SPB-13]].
3. **A currency dropdown exists in legacy**, which makes the PRD's out-of-scope note (*"USD only for MVP. Should we support CAD as well?"*, itself a highlighted open question the conversion flattened) a **removal** of existing capability rather than a deferral of a new one. Worth flagging to Kathleen.
4. **The button pair is `Decline` / `Submit`** — no separate "update" action. The wireframe's three-button `Submit Bid` / `Update Bid` / `Decline` is Kathleen's refinement, not a carry-forward.

### 14.5 The affiliate view (p.26) and what the carrier sees with `SHOW_BEST` on (pp.27–28)

The affiliate screen is *the same portal*, and the affiliate bids **as a SCAC** — the `Requests For Quote` row reads `SCAC = CTNS`, on quote `15941`. There is no distinct affiliate UI; the privilege is entirely in the data.

That privilege is visible in the carrier bid row (p.28), whose columns are: `Quote Closes` · `Your Quote` · **`Best`** · `Username` · `HH:MM Remaining` · `Action` (`Quote`) · `Action` (`Decline`). **The `Best` column is circled in red in the PRD itself** — the author's own emphasis, invisible in the conversion. Sample row: `06/26/2026 12:53 EST` · `-` · `1,053.43 USD` · `-` · `01:00`.

**What this adds to the affiliate account (§6, §9.9).** The leading-bid disclosure is **an amount only, never an identity** — the `Username` column shows the viewer's own submitting user, not the leader's. So the cross-carrier-visibility tension is narrower than v1.2 stated: what leaks is a price, not who quoted it. It is still a leak, and the affiliate still gets `COFL_AFFLM` extra minutes to beat it, but the tension with the PRD's *"cross-carrier visibility is not permitted"* is about **competitive information, not identity disclosure**. Mechanism and defaults in [[data/quote-model|data/quote-model]] §5.7.

### 14.6 Where the awarded quote lands — `MFFLCE`, "Maintain Load Carrier Equipment" (pp.24–25)

The legacy **tender** screen, and therefore the far side of the SpotBoard → Tender hand-off. Tab strip: `Carrier Tender` · `Appointments` · `Decline Response` · `User Fields *` · **`Quote *`** · `Vol Commitment *` · `NCR` · `Rack Schedule` · `History *`. Route-guide grid columns: `Route Rank` · `Rank` · `SCAC` · `Carrier Name` · `Equip` · `Cost` · `Client Cost` · `Carrier Network Quoted` · `Leverage` · `Tender Status` · `Pickup` (`Date/Time` · `Day` · `Org Hours`) · `Delivery` (same) · `Indirect Point`.

**Two structural findings.**

- **The `Overflow Carriers` button lives at the bottom of this screen**, beside `Carrier Contacts` · `Load Instructions` · `Dropped Carriers` · `Procurement Carriers`. This is **visual confirmation of the PRD's launch-point sentence** — *"the Overflow Carriers button on the Equipment Screen (Tender screen with routing options)"* — and therefore of Irina's recollection of a button on the tendering page (§3, [[decisions/decision-log|SPB-11]]). The legacy answer to the placement question is now not merely documented but photographed. It remains one of four candidates; David's decision is untouched.
- **The `Quote` tab is where the awarded spot quote is stored on the tender record**, with `Quote Type` = **`Carrier Overflow`**, `Quote Status` = `Completed`, a `Quoter` (carrier email), an `Edit Quote` button, `External Quote No` / `Expires`, a `Base Cost` carrying the `Quote No`, an `Additional Cost` grid with `New` / `Edit` / `Delete`, and a `Total Cost`. **Markup appears here as a `QMU QUOTE MARKUP` charge row** — [[decisions/decision-log|SPB-15]], breakdown in [[data/quote-model|data/quote-model]] §5.6.

### 14.7 The internal planner app — the Quote Viewer (p.27)

Browser-based APEX, left nav `Quote Viewer`. A filter bar across the top — `Client` · `Order#` · `Load#` · `Quote#` · `Interval` (a day-range selector, `6 days`) with `Submit` / `Clear` — over a report **grouped by `Quote#`**, one row per invited carrier. Columns: `Order#` · `Load#` · `SCAC` · `Shipper` · `Equipment` · `Ship From` · `Ship To` · `Intermediate Stop-offs` · `Hazmat` · `Pickup` · `Deliver` · `Quote Opened` · `Quote Duration` · `Actual Duration / Time Remaining` · `Response Time` · `Response User` · `Quoted Cost` · `Awarded` · `Quote Detail` · `Load Detail`.

This is the legacy answer to *"planners see all bids, active and historical, across carriers"* — and it is a **history/search surface, not a monitoring board**. See §10 for what that implies about wireframe Screens 6 and 7. Note `Actual Duration / Time Remaining` as a single column that flips meaning by quote state, and `Awarded` rendered as a red ✗ on non-awarded rows.

### 14.8 The OCM configuration screens (pp.24, 32–33)

Four Forms screens, all reached from the Organization Carrier Mode profile:

| Screen | Title | What it holds |
|---|---|---|
| `MFFOCM` | **Maintain Organization Carrier Mode Profile** | The profile table itself: `Owning Organization` · `Org Fac Type` · `Profile Type` (a dropdown, set to **`Carrier Overflow`**) · `Profile ID` (a dropdown listing the `COFL *` profiles) · `Ship Direction` · `Carrier` · `Equip` · `Ship Mode` · `Profile Value` · `Currency` · `UOM` · `Note` · `Active`, over a `Parent Org` and a `Profile Description`. A tab rail underneath — `Matching` · `Field` · `Qualifier` · `FAK` · `Audit` · `Cutoff Increments` · `Line Item Tolerance` · `Compatibility` · `Rate Range` · `Bill To` · `Contact` · `Freight` · `Support Charges` · `Statute of Limitations` · `FedEx Account` · **`Overflow Carriers`** · **`Overflow Charges`** · `Overflow Markup` · `Tender Threshold` · `Transit Time Buffer`. |
| `MFFOOC` | **Maintain OCM Overflow Carriers** | The carrier-list definition. An `OCM Profile` header (`Owning Organization` · `SCAC` · `Equipment` · `Ship Mode` · `Ship Direction`) over an **`Overflow Carriers`** grid keyed by `Origin` (`Ctry` · `St` · `Desc` · `Type`) → `Destination` (same), each row carrying its own **`Quote Duration (minutes)`** and `Status`. Below that, the actual **SCAC list** — `SCAC` · carrier name · `Active`. Raw keys `OCM_ID` · `OOC_ID` · `LOC_ID (orig)` · `LOC_ID (dest)` · `OOCL_ID`. |
| `MFFOOCC` | **Maintain OCM Overflow Carrier Charges** | The accessorial list per profile — `Carrier` · `Charge` code · description · `Description Alias`. Transcribed in [[data/quote-model|data/quote-model]] §5.5. |
| `MFFSYSP` | **Maintain System Profile Values** | `Type` · `Profile ID` · `Default Value`, over an `Organization Profile` override grid (`Org Id` · `Org Short Name` · value). The mechanism behind `SHOW_BEST` and its siblings. |

**What `MFFOOC` settles that the prose did not.** The PRD describes carrier-list scoping as *"a country-to-country origin/destination pair"* — the screen shows the scoping is **per row and finer-grained than that**: `US/UT/SALT LAKE CITY → US/UNITED STATES`, `US/OH/OHIO → US/KY/KENTUCKY`, `CA/CANADA → US/UNITED STATES`, each with a `Type` code (`C` city, `S` state, `N` nation) and **its own quote duration**. So origin/destination is a *pair of location nodes at any level of the geography hierarchy*, and country-to-country is just the coarsest case. It also means **the "default quote duration" is a property of the origin/destination row, not only of the list** — which the PRD's Feature 2 field list (*"list name, equipment type, participating carriers, default quote duration"*) does not convey.

### 14.9 What is *not* in Appendix B

Worth recording so absences are not read as omissions in this canon. There is **no** screenshot of: the RFQ email itself (`CE-1`), any internal alert email (`IE-1`…`IE-6`), the tolerance evaluation or its math, the award confirmation, an invalidation/order-change flow, or any configuration screen for tolerance and markup *values* (only for the profiles that hold them). Appendix B is a walkthrough of the **planner form, the carrier portal and the OCM profile screens** — the automation half of the PRD has no visual record at all.

### 14.10 Other visual-only content in the PRD

Checked page by page. **There are no diagrams, flowcharts, state machines or annotated mockups anywhere in the PRD** — pages 1–20 are pure text and tables, and every image in the document is a legacy screenshot in Appendix B or on pp.30–33. The state machine in [[data/quote-model|data/quote-model]] §3 is our rendering of prose, not a transcription of a drawn diagram.

What *is* visual-only is **formatting-carried meaning**, which the text conversion drops entirely:

- **Strikethrough** — `OQ-4`, `OQ-5`, `OQ-16` (pp.14–15) and one Feature 11 requirement bullet (p.12). [[decisions/decision-log|SPB-14]].
- **Highlight colour marking open questions.** Kathleen's inline questions are red- or yellow-highlighted throughout — *"DAVID to confirm where this makes most sense in the future"* (p.3, red), *"David, I am uncertain if access to OCM will give us these configurations…"* (p.4, red), *"Do we need to have dates for each carrier or can we just have shipment dates?"* (p.4), *"Should we add another quote status for carrier history…"* (p.9), *"Should we support CAD as well?"* (p.12), *"Doug agreed to write a query to identify equipment types currently used in overflow"* (p.3), and the `OQ-8` / `OQ-9` action notes (p.14). §10 already lists these as unnumbered open questions — **the recovery is that they are visually marked as such in the source**, which is why they belong in that list rather than reading as ordinary requirement text.
- **The red box around the `Best` column** on p.28 — the author's own emphasis on the leading-bid disclosure.

---

## 15. The carrier-access disagreement — two PMs, two models, unresolved (new at v1.4)

**Why this section exists, and what it deliberately does not do.** As of **2026-07-29** two named Product Managers hold **incompatible positions on how a carrier reaches its bid**, and both positions are current on the same day. Neither is superseded. **This section does not pick one.** Its job is to make the disagreement legible — each position, who holds it, what each presupposes, which parts are genuinely incompatible and which only look that way, and what evidence or event would settle it. **A canon that resolved this by picking the better-argued or better-documented side would be inventing a decision nobody made**, and the more detailed artifact must not win by volume of detail (Precedence, rule 5).

### 15.1 The two positions, attributed

| | **Kathleen O'Donnell** — PM, SpotBoard; owner of the PRD | **Janardhana (Jana)** — PM, Shipments |
|---|---|---|
| **The model** | **A per-recipient tokenized email link. No login at all in v1.** The `CE-1` RFQ email carries a link with a token scoped to the recipient, opening the single-quote response screen directly | **A full carrier portal with username/password authentication.** Twelve screens, entered through a Login Page |
| **Verbatim** | *"Today the carrier get the email and logs in to give their reply. That would be great, but **we don't have user management to control which carrier users can log in**… So what I've suggested is sending an email and a link that will be a token for that recipient to respond in that screen that I show for the UX."* (Kathleen note, 2026-07-29) | *"**Login Page** — standard username/password login; allows carriers securely access the portal"* (Jana story, screen summary §1). *"Given **a carrier logs into the Carrier Portal** and views a bid event, When the bid window is open, Then the carrier may review shipment details and choose to submit a bid…"* (Jana story, AC "Carrier Access & Bid Opportunity") |
| **Stated reason** | **A named blocking constraint.** User management does not exist, so a login cannot deliver the control that would justify it. The PRD states the same negative independently: *"External carrier user management (SSO / self-service provisioning) is not yet available"* (PRD, §1) | **None given.** The story contains **no rationale for authentication**, no mention of user management, no mention of provisioning, and no argument against a tokenized link. It specifies a portal; it does not defend one |
| **Artifact type** | A verbatim written note, dated, first-person, from the domain's PM and the PRD's listed owner | An **unpublished draft** — status *"Unsaved changes"*, no Jira key, no assignee, no sprint — by the PM of a **neighbouring** domain |
| **Standing in the PRD's own framing** | **Option B** of the PRD's two named options (PRD, §3) | **Neither option.** OdysseyONE-native credentials are not Option A (Net Native provisioning) and not Option B (tokens). §15.2 |
| **Recorded as** | [[decisions/decision-log|SPB-09]] — unmodified, unsoftened, still the record of this position | [[decisions/decision-log|SPB-16]] — which records **that the two positions exist**, and decides nothing |

**The meeting, and the limits of what we know about it.** The only evidence that this is a live dispute rather than two documents that happen to differ:

> *"In today's meeting Jana and Irina were **opposing Kathleen's email link idea**, but as you see Kathleen wants that idea while we don't have user management."* (meeting context, 2026-07-29 — Manuela Ramirez)

**Three limits on that sentence, stated because it is carrying a lot of weight.** *(i)* It is a **one-sentence report, not a transcript** — we hold no recording. *(ii)* **Irina's position exists only here.** We have nothing in her own words, do not know what she proposed instead, and do not know her grounds. *(iii)* **Jana's story does not itself argue against Kathleen.** It never mentions tokens, email links, or the access question as a question. So the *opposition* is documented in Manuela's report; the *alternative* is documented in the story. Those are two different pieces of evidence and neither substitutes for the other.

**What is not in dispute.** Both positions agree the carrier-facing surface is **OdysseyONE's** ([[decisions/decision-log|SPB-10]]), that carriers submit a **price** rather than an accept/decline, that a **bid window** bounds the response, and that **email** initiates the exchange — Jana's own Notification Preferences screen is *"email toggles for bid invitations or updates"* (Jana story, screen summary §2), which presupposes the RFQ email survives.

### 15.2 What each position presupposes

**Kathleen presupposes** that user management does not exist and will not for v1; that a recipient-scoped token is an acceptable substitute for identity; and that the parts of PRD Feature 3 requiring an *authenticated* carrier (*"display all open quote requests available to the authenticated carrier"*, a Quote Requests view, a Quote History view, export) therefore do not ship in v1 ([[decisions/decision-log|SPB-09]] — that mapping is marked INFERENCE there and remains so).

**Jana presupposes the very thing Kathleen says is missing — and never says so.** This is the sharpest structural finding of the cycle, so it is stated precisely:

- Username/password login **per carrier user** requires somewhere to store, verify, reset and revoke those credentials. That is user management.
- **The story nowhere acknowledges the dependency.** Searched for it: no mention of user management, provisioning, SSO, Net Native, onboarding, account creation, or administration anywhere in the artifact.
- **The clearest evidence is a screen that is absent.** The inventory has **Login**, **Forgot Password / Reset Password**, and **Change Password** (Jana story, screen summary §1) — and **no registration, sign-up, or invitation screen.** Every one of the three listed screens operates on credentials that **already exist**. The story therefore assumes accounts arrive from somewhere it does not name.
- **INFERENCE (marked, and it is the whole point):** the story does not *rebut* Kathleen's constraint, it **assumes it away**. Two artifacts describing the same v1 cannot both be right about whether user management exists. Nobody in any artifact has framed it this way; this is our reading of what the story presupposes versus what it says.

**And it does not solve the problem Kathleen actually raised.** Kathleen's concern is not that carriers lack a login — it is that **a quote cannot be scoped to the specific rep it was sent to**:

> *"Say we have 5 carrier reps that quote from XYZ carrier, **we have no way to control which user can respond to the quote**. Any carrier user that logs in from that company will see all tracking and all quotes for their org."* (Kathleen note, 2026-07-29)

Test Jana's story against that, clause by clause:

| Jana's story says | Scope it implies |
|---|---|
| *"Given **a carrier** logs into the Carrier Portal"* (AC "Carrier Access & Bid Opportunity") | **Carrier, not rep.** The subject of the sentence is the organization |
| *"list of **all bids visible to the carrier**"* (screen summary §4, Bid Listing) | Org-level |
| *"Carrier Profile Page — displays carrier information (name, contact, **SCAC** if applicable)"* (screen summary §2) | `SCAC` is an **organization** identifier, not a person |
| *"**When a carrier reviews past events**, the history must show shipments where the carrier submitted a bid"* (AC "Carrier Portal History") | Org-level history |
| *"editable sections **depending on permissions**"* (screen summary §2) | The **only** per-user hint in the artifact — four words, with no permission model, no roles, and no statement of who assigns them |

**Verdict: the story inherits the same org-level limitation, and adding a login does not fix it.** A password proves *which company* is at the keyboard no better and no worse than a shared inbox does. So Jana's portal would deliver exactly what Kathleen predicted the logged-in state would deliver — *"any carrier user that logs in from that company will see all… quotes for their org"* — and **v1's token would remain the tighter of the two**, because a per-recipient token is scoped to an individual while a login is scoped to an org ([[decisions/decision-log|SPB-09]], the "irony" note). Neither model closes the intra-org gap. **Only user management does**, which is the thing neither artifact schedules.

**Note what this does and does not breach.** Org-level isolation satisfies the PRD's security non-functional — *"Carrier access must be scoped to their own quote requests only; **cross-carrier** visibility is not permitted"* (PRD, §6) — under either model. The intra-org gap was never legislated by the PRD (§8). **So the disagreement is not a security dispute.** Presenting it as one would misdescribe both positions.

### 15.3 Genuinely incompatible versus only apparently so

**Genuinely incompatible — one thing, and it is narrow:**

> **Whether v1 ships a login.** Kathleen: *"There is no carrier login in v1"* ([[decisions/decision-log|SPB-09]]; *"we don't have user management"*, Kathleen note). Jana: login is the **precondition of the primary flow** — every acceptance criterion begins after *"a carrier logs into the Carrier Portal"* (Jana story, AC "Carrier Access & Bid Opportunity"). **If both artifacts are read as describing v1, they cannot both be built.** One ships an account system; the other explicitly does not.

**Only apparently incompatible — three things:**

1. **The portal screens themselves.** Kathleen does not oppose them; she **wants** them, later, and describes them in her own words: *"When we have user management, we can add a place where the user can login and see **all quotes** and **how much time they have to respond to current quote** and see **historical quotes**."* (Kathleen note, 2026-07-29). Set that beside Jana's Dashboard (*"open bid invitations… recently closed or awarded bids"*), Bid Listing (*"Open / Expired / Awarded / Cancelled"*), Bid Details (*"bid window countdown"*) and Bid History (*"timeline of all past bids"*) (Jana story, screen summary §§3–5). **These are the same three capabilities.** The legacy portal already had exactly this shape — a left nav with precisely two items, `Quote Requests` and `Quote History` (PRD p.22, read visually; §14.3), which is also what PRD Feature 3 specifies for the authenticated carrier. **The screen set is not contested by anyone.**
2. **Email versus portal as an either/or.** A tokenized link is a URL; a URL can open a portal screen as easily as a standalone form. Nothing in either artifact requires the token to bypass the portal rather than authenticate into a view of it — and the PRD's own carrier user story asks for *"an email with a direct link to the bid so I can respond quickly **without navigating a portal**"* (PRD, §7), which is a statement about **navigation effort**, not about the absence of a portal. Jana's story keeps the email too (its Notification Preferences screen governs *"email toggles for bid invitations"*).
3. **Non-participation semantics, the accessorial requirement, and the screen inventory as a description of the target state** — all fully separable from the access question. §15.5, §15.6.

**INFERENCE — clearly marked, because nobody in any artifact has said it.** Put those together and **the real disagreement may be about sequencing rather than architecture.** Kathleen's framing is explicitly two-phase: token *now*, logged-in area *when user management lands*. Jana's inventory is close to a one-for-one description of Kathleen's phase two, drawn in far more detail than Kathleen ever drew it. On that reading the two are not rival architectures at all — Jana has specified Kathleen's own target state, and the dispute is over **whether v1 waits for it**.

**Three honest caveats on that inference, because it is convenient and convenient readings deserve suspicion:**
- **Nobody has proposed it.** Not Kathleen, not Jana, not Irina, not the PRD. It is our structural comparison of two documents, exactly like the `220`-versus-Screen-6 mapping in §10 — and it carries the same weight, which is "worth asking about", not "established".
- **The meeting reportedly involved actual opposition** (meeting context, 2026-07-29), and people do not usually oppose a phasing they agree with. Either Manuela's one-sentence summary compresses a subtler disagreement, or the disagreement is genuinely about v1 scope, or Jana and Irina object to the token mechanism itself on grounds no artifact records. **We cannot tell which.**
- **Jana's story never labels itself as target state.** It reads as a specification for a thing to be built, and its acceptance criteria are written in the present tense of a working system.

**So: recorded as a plausible reconciliation, not as the answer. One question to Jana resolves it — *is this v1 scope, or the target state?* — and until it is asked, both positions stand as written.**

### 15.4 What would settle it

Listed as evidence and events, not as a plan. **Any one of the first three would likely dissolve the disagreement without either PM conceding anything.**

| What | Why it settles it | Who holds it |
|---|---|---|
| **A user-management timeline** — a date, a scope, an owner | This is the load-bearing unknown. If it lands before SpotBoard v1, Kathleen's stated reason for the token model expires by its own terms (*"when we have user management…"*); if it does not, Jana's login has nowhere to store an account. **Neither position survives the answer unchanged.** No artifact in evidence dates it, scopes it, or names an owner | **Unknown — and that is itself a finding.** The PRD states only the negative (§1) |
| **Thomas ratifying `OQ-1`** | The PRD already assigns this exact decision to him — **`Recommendation: TBD`**, *"ACTION: Dev/Thomas to confirm preferred approach before development begins"* (PRD, §3; `OQ-1`, §8). **The mechanism to settle this was designed before the disagreement existed and has simply never been used.** Note that Thomas must now choose among **three** models, not the PRD's two (§15.2) | **Thomas** (PRD, §3, §8) |
| **One question to Jana: v1 scope, or target state?** | If target state, §15.3's inference holds and there is no architectural dispute — only a phasing to write down. If v1 scope, the incompatibility in §15.3 is real and Thomas must arbitrate | **Jana** |
| **Irina's position, in her own words** | Currently secondhand and contentless (§15.1). She built the Tracking model this whole limitation is inherited from, so her objection may be about something neither document addresses | **Irina Jachimek** |
| **A statement of whether Jana's portal is org-scoped or user-scoped** | If user-scoped, it presupposes more than login — it presupposes the very rep-level control Kathleen says is impossible, and the gap between the positions is wider than it looks. If org-scoped, both models share the same limitation and the dispute narrows to phasing (§15.2) | **Jana** |
| **A jurisdiction statement** | Kathleen is SpotBoard's PM and the PRD's owner; Jana is Shipments' PM writing carrier-portal stories (§11). **Evidence cannot settle who gets to decide.** Named because it is a real component of this disagreement and no amount of artifact-reading will resolve it | **David Johns** (central PM) — **INFERENCE**, from his role elsewhere in this project and his ownership of the Feature 1 and Feature 2 decisions (PRD, Features 1–2). Nobody has assigned him this |

**What would *not* settle it:** more detail in either document. Jana's story is already the most detailed carrier-portal artifact in evidence and its detail is precisely what does not address Kathleen's objection (§15.2).

### 15.5 Jana's proposed portal surface — recorded separately, not merged

**Attribution first: this is Jana's inventory, from a draft, and it is not Kathleen's wireframe.** The canon's carrier-facing anatomy remains **Kathleen's Screens 2 and 3** (§6). The two surface sets are **not combined into one anatomy** — they answer different access models, and splicing them would produce a design nobody proposed.

Jana's framing of her own list, verbatim, and it is appropriately modest: *"Below is a concise list of the UI screens the portal would **typically** require. These are grouped logically and reflect what carriers need to log in, review bids, submit bids, and view history."* (Jana story, screen summary preamble). Note *"typically"* — the list is presented as a conventional portal shape, not as a designed answer to SpotBoard's specifics.

| Group | Screen | Jana's description (verbatim) | Relationship to what the canon already holds |
|---|---|---|---|
| **1 · Auth & account** | Login Page | *"standard username/password login; allows carriers securely access the portal"* | **The contested screen.** Contradicts [[decisions/decision-log|SPB-09]]'s *"no carrier login in v1"*. §15.1 |
| | Forgot / Reset Password | *"for resetting credentials when required"* | Presupposes stored credentials — §15.2 |
| | Change Password Page | *"available under account settings after login"* | Presupposes an account — §15.2 |
| | *(absent)* | — | **No registration / sign-up screen.** The strongest evidence of the unnamed user-management dependency, and it is an *absence* (§15.2). Note PRD §5 puts *"Self-service carrier portal registration"* explicitly **out of MVP scope** — so the omission may be correct rather than an oversight, which makes the credential origin more mysterious, not less |
| **2 · Profile & settings** | Carrier Profile Page | *"displays carrier information (name, contact, SCAC if applicable); editable sections depending on permissions"* | **Wholly new** — no artifact in evidence gives carriers a profile surface. `SCAC` is org-level (§15.2). *"depending on permissions"* is the artifact's only per-user hint |
| | Notification Preferences *(marked Optional by Jana)* | *"email toggles for bid invitations or updates"* | **Wholly new**, and notable: it presupposes the RFQ email survives the portal. Sits against the PRD's own model, in which `CE-1` recipients come from the **OCM carrier list's configured contact emails** and the carrier's *"communication distribution list"* ([[data/quote-model|data/quote-model]] §4, §5.1) — i.e. **Odyssey-side configuration, not carrier-side preference.** Not logged as a conflict: nobody has said the two cannot coexist, but they are different control models and it is worth flagging |
| **3 · Dashboard** | Carrier Dashboard | *"high-level snapshot: open bid invitations, pending actions (if any), recently closed or awarded bids"* | Maps to Kathleen's deferred *"see all quotes"*; not drawn by anyone. §15.3 |
| **4 · Bid management** | Bid Listing Page | *"list of all bids visible to the carrier (Open / Expired / Awarded / Cancelled); filters and sorting based on date, **shipment ID**, bid status, route, etc."* | Closest to legacy's `Quote Requests` (§14.3) and PRD Feature 3's Quote Requests view. **Two problems:** the `shipment ID` filter conflicts with [[decisions/decision-log|SPB-05]] (§9.14), and its four status values (`Open` / `Expired` / `Awarded` / `Cancelled`) are **a sixth status vocabulary** — carrier-facing, matching none of the five in §7 |
| | Bid Details Page | *"**full shipment information**; bid window countdown; option to enter a bid (base cost, fuel, accessorials); if no bid is submitted by deadline → screen reflects **'Bid Expired'**"* | The counterpart of Kathleen's **Screen 3**. Countdown and the base/fuel/accessorial split **agree** with PRD Feature 3 and with legacy (§14.4). *"full shipment information"* is unbounded and points the wrong way on [[decisions/decision-log|SPB-05]] (§9.14). **`Bid Expired` is a genuine addition** — no artifact drew a carrier-side expiry state (§7) |
| | Bid Edit Page | *"structured form to: enter cost components (**standard accessorial codes same as Odyssey One to be used**), review total cost, submit final bid. Edit allowed only before submission or within allowed timeframe"* | *"Edit… within allowed timeframe"* **agrees** with PRD Feature 3's update-while-open rule and Kathleen's `Update Bid` action. The accessorial-code clause conflicts with the PRD's per-OCM model — §9.13. Note Jana splits entry (Details) from editing (Edit) into **two screens** where legacy used **one modal** (`Quote Entry`, §14.4) and Kathleen used one panel |
| **5 · History** | Bid History Page | *"timeline of all past bids: bids submitted, bids not submitted (expired), outcomes (awarded to carrier or not); filters such as **shipment ID**, date range, event type"* | Maps to legacy `Quote History` (§14.3) and PRD Feature 3's history view. **Its content requirement is the durable part** — history must show non-participation, §15.6. `shipment ID` filter: §9.14 |
| **6 · Support** | FAQ / Help Page | *"guidance on how to use the portal"* | **Wholly new.** No artifact mentions carrier self-service help |
| | Contact Support Page | *"ticket creation or contact information"* | **Wholly new**, and consequential if taken literally — *"ticket creation"* implies a support-ticketing capability nowhere in the PRD, and PRD §5 already defers anything resembling it |

**Two observations about the inventory as a whole.**

- **Roughly half of it is not about bidding.** Auth, profile, notification preferences, FAQ and support are **generic portal furniture**, and Jana labels the list *"what the portal would typically require"*. Four of the twelve screens (Profile, Notification Preferences, FAQ, Contact Support) have **no counterpart in any other artifact and no requirement behind them** in the PRD. Recorded as proposed, not as demanded.
- **The bid-management group is the substantive half, and it largely agrees with the PRD** — countdown, base/fuel/accessorial split, edit-while-open, history with outcomes. Where it agrees, it is corroboration from a second PM; where it adds (`Bid Expired`, non-participation in history), it adds something valuable; where it diverges (`shipment ID`, standard accessorials), §9.13–9.14 apply.

### 15.6 What the story contributes regardless of who wins the access argument

**Stated separately because it is the most durable part of the artifact and it would be lost if the story were filed as "the losing side of an auth dispute".**

1. **First-class non-participation semantics — the story's best contribution.** *"No Bid Submitted"* as a named status, no explicit decline required, expiry as the non-participation event, and a per-carrier audit trail of who did not bid. **It names a value none of the five existing status vocabularies names**, and it holds under either access model. Full treatment in §7; schema and state-machine placement in [[data/quote-model|data/quote-model]] §3.4; logged as [[decisions/decision-log|SPB-17]].
2. **A carrier-side expiry state** — *"if no bid is submitted by deadline → screen reflects 'Bid Expired'"* (Jana story, screen summary §4). New; §6.
3. **Corroboration of [[decisions/decision-log|SPB-10]] on direction, with one wording wrinkle.** The story's title says *"(Odyssey One Integrated)"*, its user story is written *"As Odyssey One, I want to publish shipment bid requests…"*, and it requires accessorial codes *"same as Odyssey One"* — and it mentions **TMS, Net Native and APEX nowhere at all**, which is what absorption looks like from the outside. **But the corroboration is weaker than it first appears:** the story repeatedly pairs the two as separate systems — *"**The Overflow Portal and Odyssey One** must track: bids submitted…"* (Jana story, Business Rules "History") — and *"Integrated"* is a weaker word than the PRD's *"rebuilt **natively within** OdysseyONE's Carrier Portal"* (PRD, §2). A portal that is *integrated with* Odyssey One and a portal that *is* Odyssey One are different builds. **SPB-10 survives and is corroborated in direction, not in strength.** See the appended note on [[decisions/decision-log|SPB-10]].
4. **An accessorial-code alignment requirement** that needs one clarifying question before it can be acted on — §9.13.
5. **A sixth, carrier-facing status vocabulary** (`Open` / `Expired` / `Awarded` / `Cancelled`) surfaced by the Bid Listing Page — §15.5. Not reconciled against the five in §7 by anyone.

**And what it does not touch.** The story says **nothing** about SpotBoard's internal launch point, so [[decisions/decision-log|SPB-11]] is untouched — its *"Status Visibility in Odyssey One"* criterion requires non-participation to appear *"in the bid summary"* without saying where the bid summary lives. **Recorded as an absence rather than left silent**, so it is not later mistaken for agreement.

---

## See also

- [[_moc|SpotBoard — Map of Content]]
- [[decisions/decision-log|SpotBoard — Decision Log]]
- [[data/quote-model|Quote Data Model, States & Notification Catalog]] — field-level schema, state machines, eligibility rules, configuration surface, email catalog
- [[../shipments/domain-analysis|Shipments — Domain Analysis]] (§3 Tendering, §4 Spot Bidding / Overflow)
- [[../shipments/decisions/decision-log|Shipments — Decision Log]]
- [[../carriers/_moc|Carriers domain]]

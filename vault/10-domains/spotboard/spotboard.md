---
title: SpotBoard — Domain Canon
domain: spotboard
type: canon
tags: [spotboard, overflow, loadboard, tendering, carriers, bidding, carrier-portal, quotes, legacy-screens, auction, mffcofl, quote-viewer]
date: 2026-08-19
status: active
---

# SpotBoard — Domain Canon (v1.9)

**v1.9 changelog (2026-08-19) — the bidding process walked end-to-end, and the PM answers in writing.** Three source layers, one topic (`spotbid-bidding-process`): the **2026-08-18 "Spot Quote-Overflow" call** (1h02m; Kathleen O'Donnell, Irina Jachimek, Alexey Soroka of HiTech, Manuela Ramirez — Laura Blandon and Dmitry Miterev present, near-silent) in which Manuela drives the group through how bidding/overflow actually works; **Kathleen's SIX written follow-up answers** (2026-08-19, relayed verbatim) each backed by a screenshot; and **Irina's two `MFFCOFL` screenshots**, which turn out to be a **before/after pair of the same live quote (`Quote# 222625`) across the Send action** — the first photographic record of the send lifecycle this dossier holds. Full treatment in **§21**, including a **build-delta addendum (§21.9)**. Decisions [[decisions/decision-log|SPB-55]]…[[decisions/decision-log|SPB-63]].

- **The additional-charges list is OCM-profile-driven, not a static catalog and not equipment-alone.** The call converged on *"it's just driven by the equipment"* (Kathleen, [10:08]); her written answer #1 refines it: the list is controlled by the **`COFL Charges` OCM profile** (`MFFOCM` → `MFFOOCC`), which is keyed by **org × equipment** — so equipment matters *through* the profile. The shipped 5-code static catalog is one profile's snapshot, not the rule. [[decisions/decision-log|SPB-55]], [[data/ocm-profile-charges|data/ocm-profile-charges]].
- **Fuel is precalculated, shown to the carrier, and NOT editable** (answer #2) — closing the question Manuela raised live ([14:03] "should we expose this pricing to the bidder?"). The call's *"estimated"* framing survives as the label. The shipped disabled `Fuel (Estimated)` field is **aligned**. [[decisions/decision-log|SPB-56]].
- **The planner CAN change the quote's equipment — the shipment never mutates.** Answer #3 + the `Overflow Seed Equipment` chooser (Kathleen3.png); Irina's live screenshots show it in the wild (an `LTL` shipment quoted as `FB Flat Bed`). *"Although they rarely do."* [[decisions/decision-log|SPB-57]].
- **A carrier rate-API path exists and is DORMANT** — *"no carriers with a rate API participate in overflow. Path must still be supported"* (answer #4). A seam, not a V1 feature. [[decisions/decision-log|SPB-58]].
- **⚠️ "Time is not supported on the quote" (answer #5) — against Kathleen's own screenshot of OdysseyOne date+TIME fields.** Both recorded, neither resolved; the likely reading (INFERRED, flagged) is that the **shipment's** pickup/delivery fields carry time while the **carrier's quote** does not. The shipped TimePickers on the bid page are now **suspect**. [[decisions/decision-log|SPB-59]].
- **Flexible pickup/delivery is configurable by CLIENT × EQUIPMENT as an N-day variance** — 23 configs each way, 9 clients active, e.g. one client allows 8 days (answer #6). The mechanism behind [[decisions/decision-log|SPB-13]]'s window. [[decisions/decision-log|SPB-60]].
- **Send stamps a per-carrier distribution status: `Sent` vs `No Distribution`** (no email on file), plus `Status Date`; the quote header goes `OPEN` with a Duration-driven `Quote Expires`. Photographed in Irina's before/after pair; **`No Distribution` extends the per-carrier vocabulary** (§7). [[decisions/decision-log|SPB-61]].
- **Live-bid rows show the TOTAL on the top line, collapsed by default, breakdown on demand** — Kathleen proposed, Irina confirmed it matches today ([33:47–34:16]). [[decisions/decision-log|SPB-62]].
- **Award becomes a radio-style selection gated on close, executed by ONE "Award and Tender" action** ([49:52–50:45]); on decline the planner awards the next existing bidder **without reopening**, or reopens = a **new** quote number (*"this ticket is gone"*, corroborating [[decisions/decision-log|SPB-29]]). Tender accept/decline is a **separate email/EDI flow**, never the bidding email. [[decisions/decision-log|SPB-63]].
- **Alexey (HiTech, the carrier-page UI dev) states on record that NO stories cover the charge-field logic** [8:50] — the story is owed by Kathleen + Manuela [1:00:24–1:01:39]. And Irina re-asserts the board is needed *"even for testing purposes"* [58:54–59:23] — continued pressure on, not a change to, [[decisions/decision-log|SPB-47]]'s provision-only ruling.

**⚠️ v1.8 changelog (2026-08-18) — the missing transcript arrives, and it settles V1 scope in one breath.** One artifact: **`Spot Board.md`, the COMPLETE 2026-08-11 meeting** (53m18s; Kathleen O'Donnell, Irina Jachimek, Manuela Ramirez). This is the meeting v1.7 could not find, and the meeting the shipped SpotBid code was built against **as a ~70-line fragment missing 1:11 → 46:58**. The middle 45 minutes had been read by nobody. Full treatment in **§20**, including a **build-delta table** (§20.5) — the actionable output of this cycle.

- **[[decisions/decision-log|SPB-36]]'s verdict: the artifact is FOUND, and its finding is CONFIRMED.** There was **no wholesale re-scope**. Irina, first-hand, [28:42]: *"**I absolutely agree we have to have the spot bot tab under the shipment.**"* The shipment tab is item **one** of Kathleen's V1 list. What the meeting *does* contain is a **narrower, real** cut — the internal cross-shipment monitoring board is deferred — which is almost certainly what the secondhand report compressed. [[decisions/decision-log|SPB-42]], [[decisions/decision-log|SPB-45]].
- **V1 is enumerated by the PM in one sentence, for the first time in the whole dossier** [43:12–43:29]: the **shipment spot tab** · the **spot request email** · the **carrier quote entry** · the **spot quote tab with award**. *"That's all we need right now."* [[decisions/decision-log|SPB-43]].
- **⚠️ [[decisions/decision-log|SPB-24]] is CLOSED — its author retracts it.** Kathleen crosses the internal spot board off her own diagram [41:52, 42:11, 42:20], Irina concurring, and instructs *"**save that screen** so that we have that when we talk to the business about future functionality"* [44:05]. **[[decisions/decision-log|SPB-18]] clause (2) is vindicated.** [[decisions/decision-log|SPB-44]].
- **⚠️ The carrier board was CUT, then conceded back as a *provision* — and [[decisions/decision-log|SPB-39]] was written without that middle.** Kathleen [43:12]: *"we don't need to build that carrier view because they're not going to have it. **So Manuela doesn't have to work on that.**"* Irina pushes back [44:55]: *"I do want to have **at least provision** how it's going to look like."* Kathleen concedes [45:09]: *"**Alright, Manuela, so add that to the workload.**"* **The concession is consensus** — but the board survives at **provision fidelity, below the four core items**, not as the primary deliverable. [[decisions/decision-log|SPB-47]].
- **The per-shipment tab is RENAMED.** Kathleen [43:47]: *"change that from spot board and just put like **spot quote** or something like that for that tab"* — *"because **the spot board is going to be… the board**."* **Unimplemented: `BottomBar.jsx:66` still reads `SpotBoard`.** [[decisions/decision-log|SPB-46]].
- **⚠️ [[decisions/decision-log|SPB-35]] moves decisively: Kathleen concurs with the separate database, twice, walking her own diagram** — *"Okay, so we agree on that"* [38:39]; *"Okay, so we agree on all these things right now"* [40:07]. **That is concurrence, not the mid-pivot acquiescence of Aug 7. David has still not ruled**, and Kathleen parks the multi-system ambition in the same meeting [24:35]. [[decisions/decision-log|SPB-50]].
- **One screen, not two, for quote requests + history**, filtered open/closed [46:36–47:09] — **the shipped list has two tabs** ([[decisions/decision-log|SPB-48]]). **Row grain resolved by audience:** carrier board ungrouped and **multi-SCAC**; planner view grouped by quote, deferred. The underlying argument (6:26–18:51) **never converged** and is recorded unresolved ([[decisions/decision-log|SPB-49]], half-answering [[decisions/decision-log|SPB-30]]).
- **The 15-minute "redirect" deadlock is not a deadlock.** The carrier never lands on the shipment and never sees a shipment number ([[decisions/decision-log|SPB-05]] reinforced first-hand, [32:33]); the planner *may* jump board → shipment [31:54]. The two were arguing about *automatic redirect* vs *available link*. [[decisions/decision-log|SPB-51]].
- **`Invalidated` finally defined by a human**: an order change or cancellation; the mechanic is **close-old + create-new, never mutate** — corroborating [[decisions/decision-log|SPB-29]]. The **label is negotiable** (Kathleen sanctions *"cancelled or changed"*) and the **status is deliberately temporary**. [[decisions/decision-log|SPB-52]].
- **The tokenized email is meant to land on the board's own row-detail view** — one carrier surface, not two [39:29]. **We shipped two, with divergent charge models.** [[decisions/decision-log|SPB-53]].
- **Nothing about carrier authentication moved.** Thomas has still not spoken in any artifact we hold.

**⚠️ v1.7 changelog (2026-08-17) — a REPORTED re-scope whose supplied artifact does not contain it, plus the carrier portal photographed live.** Four artifacts arrived as one drop: a transcript presented as the source of a **major SpotBoard re-scope** ("the previous concept is dropped except the external bidding landing page"), and **three live screenshots of the current carrier-facing portal** delivered by Irina on a separate follow-up call with a verbal walkthrough (2026-08).

- **The re-scope is NOT EVIDENCED — nothing is superseded by this cycle.** The supplied transcript is **byte-identical** (`cmp`, 52,248 bytes) to the **July 28 first meeting already fully integrated at v1.5** (§16). It contains no agreement to drop the concept and no statement by Irina against the shipment tab — **it contains the opposite**, verbatim (§19.2). Per this vault's own discipline (secondhand reports are recorded, not enacted — the `SPB-16`/`SPB-24` precedent), the report is logged as a **non-decision**: [[decisions/decision-log|SPB-36]]. [[decisions/decision-log|SPB-18]] clause (1), [[decisions/decision-log|SPB-25]] and every other prior ruling **stand unchanged**. If a genuine re-scope call happened, **its transcript is not in our hands — request it.**
- **New §19.3 — the carrier portal current state, photographed live in Irina's own APEX session.** The genuinely new artifact of this cycle. The portal is **three surfaces, not two**: a `Requests For Quote` **list page** (previously known only from the PRD's Appendix B caption, §14.5 — now photographed with real data) → the `Load Detail` page → the `Quote Entry` modal. Extends §17.4 / [[decisions/decision-log|SPB-32]]; yields the live bid-entry charge structure (Linehaul entered, Fuel **auto-computed per mile**, five fixed additional-charge lines) — [[decisions/decision-log|SPB-38]], [[data/quote-model|data/quote-model]] §9.
- **Irina's framing — "the new work is just a redesign of that current system" — is recorded as HER framing, not consensus** ([[decisions/decision-log|SPB-37]]). Its *direction* (replace the carrier bidding page with an OdysseyONE-native page) is corroborated by the July 28 transcript itself (38:01–38:25); its *exclusivity* ("just", i.e. nothing beyond parity) is Irina-only, and SpotBoard authority sits with the PRD + Kathleen.

**v1.6 changelog (2026-08-11) — the August 7 UX call, five legacy/current-state screenshots and one future-state wireframe.** Seven artifacts in one intake, and they are **co-equal**: the images are Teams-chat pastes from the same call as the transcript, so neither is read without the other (§17.1). This is the first cycle in which the domain holds **direct photographs of the two screens our built prototype descends from**, rather than the PRD's compressed Appendix B captions.

- **New §17 — the August 7 call and the current-state screens.** The legacy planner screen is named on-screen: **`Maintain Carrier Overflow (MFFCOFL)`**, with its full carrier grid populated (§17.2). The legacy cross-bid screen is named on-screen: **`Quote Viewer`**, standalone, one row per carrier, grouped by `Quote#` (§17.3). The **carrier-facing current state is a two-depth portal** — a `Load Detail` page whose `Enter Quote` button opens the `Quote Entry` modal — not a standalone page (§17.4). Kathleen's post-call **workflow diagram** puts one stored quote in front of **four** consumer surfaces (§17.5).
- **The carrier cannot revise a submitted bid in V1 — and that is a REGRESSION, recorded as one.** Kathleen rules it four times, Irina concedes twice, and Kathleen's own diagram writes *"Written once"*. But **legacy permits unlimited revision** (Irina, first-hand, volunteered against her own position) and **PRD Feature 3 lists `Update Bid`**. V1 removes a capability that both the legacy system and the requirements document have, on a **token-security constraint** — not a product judgement. `OQ-1` / [[decisions/decision-log|SPB-16]] are **unchanged**: Kathleen downgraded her own in-call *"Thomas said you cannot update it"* to *"Outstanding… with Thomas"* within hours. [[decisions/decision-log|SPB-23]], §17.6.
- **⚠️ [[decisions/decision-log|SPB-18]] clause (2) is reversed in substance, and the ratification is missing.** Kathleen scopes the **cross-shipment board to phase one twice** (21:12, 53:34), corroborated by her diagram drawing it solid while marking only the carrier portal future. **David never engaged with that statement.** [[decisions/decision-log|SPB-24]] records the reversal and the missing ratification; **SPB-18 and SPB-20 are not rewritten.** Clause (1) — the in-shipment tab is V1 — is **unchanged and reinforced three times** ([[decisions/decision-log|SPB-25]]).
- **A third internal surface exists and had never been logged:** Kathleen's diagram lists **`Monitoring spot view` (`EXISTS`)** and **`Internal Spot Board` (`NEW`)** as *siblings*, both fed by the same stored quote. The long-running "Kathleen placed it under Monitoring vs our `/spotboard` route" tension is a **false binary** — she sanctions both. [[decisions/decision-log|SPB-26]], §17.7.
- **David ruled three times, not twice.** Tab defaulting ([[decisions/decision-log|SPB-27]]); all-carriers + current-bids + award-early + bid-history **at the shipment altitude** ([[decisions/decision-log|SPB-28]]); and — previously unlogged — **a closed quote cannot be reopened; you create a new one** ([[decisions/decision-log|SPB-29]]). §17.9.
- **New §18 — the future-state auction portal, fenced.** The HTML wireframe is a **reverse auction**; today's system is a **sealed-quote RFQ**. It is gated on carrier login — *the same* user-management blocker as [[decisions/decision-log|SPB-09]] / [[decisions/decision-log|SPB-16]], not a separate roadmap item. Five things in it must not leak into V1 ([[decisions/decision-log|SPB-34]]).
- **Two corrections to claims made inside this cycle's own reader reports**, both caught by checking the new images against §14: the carrier-side **countdown** and the carrier-side **leading-bid amount** are *not* inventions — §14.5 already records `HH:MM Remaining` and a `Best` column on the legacy carrier quote-list row under `SHOW_BEST`. What is genuinely new in the future-state wireframe is **rank** and **% gap**, not disclosure itself. §17.8, §18.3.
- **Nothing about carrier access was closed.** Thomas has still not spoken in any artifact we hold.

**v1.5 changelog (2026-08-03) — the July 28 full transcript and the July 30 placement call.** Two new artifacts, and the first of them is an **accuracy audit of the earliest layer of this canon**, not merely new material.

- **`Discuss Overflow (spotboard)` — the COMPLETE July 28 first meeting (47m25s).** The v1 canon was synthesised from a **~9 KB incomplete cut** of this same meeting (`Overflow meeting 1.txt`), which preserved the real timestamps but dropped roughly 1:16–11:47 and everything after 17:08. **Every existing `(meeting 1, M:SS)` / `(transcript, M:SS)` citation was checked against the full recording and its timestamps line up** — so nothing already cited is mis-anchored; the full version *adds* and *corroborates* rather than *corrects timestamps*. New material, corroboration and the two genuine tensions it raises are consolidated in **§16**. Headline additions: Kathleen explaining Loadboard = the internal sister brokerage **CTNS/3TS** (truckload) and **Overland** (bulk) live in meeting 1, a day before the loadboard meeting (§4, §16); the **token carrier-auth model proposed by Kathleen on July 28** with Irina tentatively agreeing (§8, §15, [[decisions/decision-log|SPB-19]]); a live TMS walkthrough corroborating the award→tender hand-off, the *"Process"*→Award rename ([[decisions/decision-log|SPB-06]]) and a legacy **"carrier quoted" checkbox** on the tender row (§3, §16).
- **`Spotboard.md` — a LATER call, July 30 (25m10s): Manuela, Kathleen, Irina.** It opens by settling **UI placement** and is the most important artifact of this cycle. **SpotBoard's planner UI is a dedicated tab/page next to Tender, inside the shipment — not a separate sidebar domain, and not inside the Tender tab itself; the cross-shipment "board" is a top-level module deferred past V1.** Decided on PM (Kathleen) concurrence; David — the PRD's formal Feature 1 owner — was absent and returns Monday. **[[decisions/decision-log|SPB-18]]** supersedes/resolves [[decisions/decision-log|SPB-11]] and refines [[decisions/decision-log|SPB-03]] and [[decisions/decision-log|SPB-04]]. §3, §6, §10, §16.
- **Carrier access (SPB-16) did NOT resolve.** July 30 is the most recent evidence and it **reaffirms Kathleen's token model** (new XPO/Laurie onboarding rationale) while **Irina defers the auth question — *"that's for later"*** — rather than opposing it. Combined with her tentative agreement on July 28, Irina's own words either side of the 07/29 report contradict the secondhand claim that she opposed the token. **But Jana was absent from both meetings and Thomas has still not spoken**, so the Kathleen-vs-Jana contest stands. [[decisions/decision-log|SPB-19]] records the movement and decides nothing; §8, §15.
- **Nothing else was closed.** The placement question moved from open to closed (§10); the access disagreement is unchanged in status.

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
| `July 28 full` | **`Discuss Overflow (spotboard)- (1).md` — the COMPLETE transcript of the first SpotBoard meeting, July 28 2026, 47m25s.** Kathleen O'Donnell, Irina Jachimek, Manuela Ramirez (Janardhana name-checked but absent). Cited as `(July 28 full, M:SS)`. **SUPERSEDES the `meeting 1` cut below** — same meeting, but complete. Its timestamps match the cut's, so all existing `(meeting 1, …)` / `(transcript, …)` citations remain valid. | Everything the cut had, plus: the full Loadboard/CTNS/Overland explanation; the spot-market entry and planner-initiation; the fuller rename discussion; a live TMS overflow walkthrough (RFQ send, carrier bid, decline→TMS, close, *"Process"*→Award, the awarded carrier landing on the tender row with a *"carrier quoted"* checkbox); the token carrier-auth proposal and Irina's tentative agreement; markup/AP-rate; the ODM/OGM contrast |
| `meeting 1` (cut) | `Overflow meeting 1.txt` — **incomplete ~9 KB cut of the July 28 meeting**, preserving real timestamps but dropping ~1:16–11:47 and everything after 17:08. **The v1 canon was built from this cut.** Superseded by `July 28 full` above; retained only as the provenance of v1-era citations. Cited historically as `(meeting 1, M:SS)` / `(transcript, M:SS)`. | Intent, process, legacy-TMS behavior, the live rename moment — a subset of `July 28 full` |
| `July 30 call` | **`Spotboard.md` — a later call, July 30 2026, 25m10s.** Manuela Ramirez, Kathleen O'Donnell, Irina Jachimek. Cited as `(July 30 call, M:SS)`. **The most recent evidence in the whole dossier** — wins on anything it explicitly decides, above all UI placement. | The UI-placement decision (planner tab next to Tender, under the shipment, not a domain; cross-shipment board post-V1 — [[decisions/decision-log|SPB-18]]); reaffirmation of the token carrier-auth model with a new rationale; *"each shipment will be its own e-mail"* |
| `wireframe` | `SpotBoard Wireframes v1 — OdysseyONE.html` — 7-screen low-fidelity prototype Kathleen built herself, dated 07/28/2026, **derived from the PRD**. Cited as `(wireframe, Screen N)`. | Anatomy, vocabulary, field/column inventory, status sets, the rename in settled use |
| `loadboard transcript` | `Carrier Load Board vs Overflow Board meeting.txt` — 2026-07-29 (assumed; undated in-artifact). Kathleen O'Donnell, Saikat Ghosh (Cognizant), David Johns, Doug, "Kumar". Cited as `(loadboard transcript, M:SS)`. | The Loadboard ↔ Overflow/SpotBoard boundary; Loadboard's audience and trigger model; Doug's role |
| `Jana story` | `Jana story — Overflow Portal bid review and submission.md` — **draft** Jira-style user story by **Janardhana (Jana), PM for Shipments**, relayed by Manuela Ramirez, **2026-07-29**. Status shown as *"Unsaved changes"*; **no Jira key, no assignee, no sprint.** Cited as `(Jana story, <section>)` — e.g. `(Jana story, AC "Status Visibility in Odyssey One")`, `(Jana story, Business Rules)`, `(Jana story, screen summary §4)`. | A carrier portal with username/password authentication and a twelve-screen inventory; **first-class non-participation semantics**; an accessorial-code alignment requirement |
| `meeting context` | Manuela Ramirez's written framing accompanying the Jana story, **2026-07-29**. Cited as `(meeting context, 2026-07-29)`. **Not a transcript** — a one-sentence report of a meeting we hold no recording of. | The only evidence that Jana **and Irina** opposed Kathleen's email-link model in a live meeting, and that Kathleen holds her position *because* user management does not exist |
| `Aug 7 call` | **`Spotboard UX discussion.vtt` — 2026-08-07, 57m23s, 925 cues.** Kathleen O'Donnell, Irina Jachimek, Manuela Ramirez, David Johns. Cited as `(Aug 7 call, MM:SS)`. **David was absent 07:56–26:07** — for the entire "where does the board live" argument. Cue counts: **Irina 358 · Manuela 306 · Kathleen 211 · David 51.** | Bid revision ruled out for V1; the cross-shipment board twice scoped to phase one; David's three closing rulings; the SpotBoard-tab tender-state gating; Irina's first-hand account of legacy re-bidding |
| `Aug 7 images` | **`image (1)`…`image (5).png`** — screenshots pasted into the Teams chat **of that same call**, so they are companions to the transcript and are read **with** it, never separately. Cited as `(image N)`. `image (1)`/`(4)` pasted by Kathleen at 52:18; `image (2)` is Irina's own browser; `image (3)` is Kathleen's paste at 46:37; `image (5)` is Kathleen's post-call workflow diagram. | Direct photographs of `MFFCOFL`, the `Quote Viewer` cross-bid screen, both carrier-facing surfaces, and Kathleen's five-node workflow. §17 |
| `Aug 11 call` | **`Spot Board.md` — the COMPLETE transcript of the 2026-08-11 meeting, 53m18s** (`Spot Board-20260811_114813`). Kathleen O'Donnell, Irina Jachimek, Manuela Ramirez. Converted from `.docx`. Cited as `(Aug 11 call, M:SS)`. **SUPERSEDES `spotboard-rescope-call-transcript-PARTIAL.md`** — the same recording, pasted with 1:11 → 46:58 missing, which is what [[decisions/decision-log|SPB-39]]…[[decisions/decision-log|SPB-41]] and the shipped SpotBid code were written against. **The most recent evidence in the dossier, and the only artifact that enumerates V1.** | The four-item V1 scope list; the internal monitoring board crossed out with its screen ordered preserved; the carrier board cut then conceded back as a provision; the per-shipment tab rename; the standalone quote service with its own database, concurred by Kathleen twice; one-screen-with-filter; row grain by audience; the carrier/planner redirect distinction; the `Invalidated` definition |
| `Aug 18 call` | **`Spot Quote-Overflow.md` — 2026-08-18, 1h02m26s.** Kathleen O'Donnell, Irina Jachimek, **Alexey Soroka (HiTech, UI dev)**, Manuela Ramirez; Laura Blandon and Dmitry Miterev present, near-silent. Cited as `(Aug 18 call, M:SS)`. Manuela walks the group through the bidding/overflow process against her prototype. | The charge-list question and its equipment framing; fuel visibility settled; quote-equipment vs shipment-mode; per-carrier transit/distance; the send lifecycle; total-collapsed live-bid display; the radio-select + award-and-tender interaction; decline → next-bidder vs new quote; tender accept/decline as a separate email/EDI flow; the HiTech dev handoff |
| `Kathleen answers` | **`kathleen-written-answers-2026-08-19.md`** — Kathleen's six written follow-ups to the Aug 18 call, relayed verbatim by Manuela. Cited as `(Kathleen written answer #N, 2026-08-19)`. **Each is ruling-grade** — the PM answering in writing the questions the call left open. | OCM-profile charge control (#1); fuel read-only (#2); planner equipment change (#3); dormant rate-API path (#4); no time on the quote (#5); flexible pickup/delivery config (#6) |
| `Kathleen images` | **`Kathleen1.png` · `Kathleen3.png` · `Kathleen5.png`** — screenshots backing answers #1, #3, #5. `Kathleen1` = `MFFOCM` profile grid + `MFFOOCC` charge modal (org `MPM_SYS_01`, equipment `FB FLAT BED`); `Kathleen3` = `MFFCOFL` with the `Overflow Seed Equipment` chooser; `Kathleen5` = OdysseyOne Earliest/Latest Pickup/Delivery **Date and Time** fields, Latest Pickup required. | The OCM charge structure ([[data/ocm-profile-charges|data/ocm-profile-charges]]); the per-equipment seed rows (`EXP`/`FB`/`TL`/`TLH`/`TLR`/`TT` with `Ocmid`/`Oocid`); the field names — and the **time-tension** against answer #5 |
| `Irina images` | **`IrinaImage1.png` · `IrinaImage2.png`** — the screenshots Irina references live in the call ([27:51] *"I just giving you the screenshots"*, [30:10] *"the additional screen of what happened in TMS after a click send button"*). **A before/after pair of the SAME quote (`222625`) across Send**, from `irina@csuser.ps01`. | Pre-send: carrier grid with per-carrier Pickup/Delivery **datetimes**, `Transit 6.5 hr`, `Distance 325 mi`, empty statuses. Post-send: header `OPEN`, `Quote Opened`/`Quote Expires` one Duration (60 min) apart, per-carrier `Status` = `Sent` / **`No Distribution`** + `Status Date`. Also a live answer-#3 exhibit: shipment `Equip LTL`, quote equipment `FB Flat Bed` |
| `auction wireframe` | **`Carrier Portal — Spot Quotes (Ideal State, Live Auction).html`** — Kathleen's own HTML wireframe, self-banners *"WIREFRAME — v1 for UX"*, chat-captioned *"future state with auction like bid"*. Cited as `(auction wireframe)`. **FUTURE SCOPE ONLY — see §18.** | The phase-two reverse-auction carrier portal: rank, outbid alerts, repeat bidding, per-card countdown, carrier-side KPIs |

### Precedence

**None is automatically primary — all five together are the evidence.** Where they disagree, both readings are recorded under **Conflicts** (§9) and the reconciliation is itemised in §12. Three deliberate tie-breaks, applied by **recency** and **specificity**, and stated wherever they are used:

1. **The PRD outranks the wireframe on behavior and business rules.** The wireframe is Kathleen's reading of the PRD, self-labelled *"Confidence: medium… AI-generated draft"*. Where the two agree, that caveat is lifted (§12).
2. **The PRD does not reopen the rename.** It is dated 07/02/2026 and therefore **predates** the live Overflow → SpotBoard rename in meeting 1. It says *"Overflow"* throughout, which is not evidence against `SpotBoard` — it is evidence of its own date. [[decisions/decision-log|SPB-01]] stands. *Overflow* survives in this canon only inside verbatim quotes and legacy identifiers (`MFFCOFL`, `COFL_*`, `mf_ocm_overflow_carrier`).
3. **The PRD also predates the loadboard meeting** (07/29). On the Loadboard ↔ SpotBoard boundary, the later meeting wins — but the PRD does not in fact contradict it (§4).
4. **Kathleen's note is the newest artifact in evidence and wins on carrier authentication**, where it directly answers the PRD's own `OQ-1` (§8). ⚠️ **Qualified at v1.4 — recency no longer produces a tie-break here.** The Jana story is dated the **same day** (2026-07-29) and takes the opposite position. Recency cannot separate two same-day artifacts, and specificity cuts the wrong way to be useful: Jana's is far more *detailed* while Kathleen's is far more *authoritative for this domain* (she is the PRD's listed owner and SpotBoard's PM; Jana is the PM for **Shipments**). **No tie-break is applied. Both positions are recorded in §15 and neither is adopted.** Rule 4 continues to govern only where the Jana story is silent, which is everything except the access model.

5. **Volume of detail is not authority — stated as a rule because this cycle needed it.** The Jana story is longer and more specific about the carrier portal than every other artifact combined, and it is a *draft* by a PM from a neighbouring domain. Where it conflicts with the PRD's requirement text, the PRD wins on being a *"Development Ready"* spec with a named owner for this domain (§9.13, §9.14). Where it conflicts with **Kathleen's note**, nothing wins — see rule 4.

6. **Added at v1.5 — recency, and the two July transcripts.** The **`July 30 call` is the most recent evidence in the dossier** and **wins on anything it explicitly decides** — above all UI placement, where it settles what the PRD had left to David ([[decisions/decision-log|SPB-18]]). It does **not** override the carrier-access contest, because it does not decide it: Jana (the other party) was absent, so July 30 moves the evidence around the question without closing it (§15, [[decisions/decision-log|SPB-19]]). Separately, **`July 28 full` outranks the `meeting 1` cut** for any meeting-1 claim — but in practice it *corroborates and extends* the cut rather than correcting it, because the cut's timestamps proved accurate (§16).

7. **Added at v1.6 — the transcript and the images are co-equal, and four things are kept apart everywhere.** The `Aug 7 images` are pastes from the `Aug 7 call`; neither outranks the other, and where they disagree the disagreement is recorded rather than arbitrated (§17.2's *"before it's sent out"* caption against a screenshot showing a live quote with populated bids is the worked example). Throughout §17 and §18, **SAID** (spoken in the call), **SHOWN** (visible in an artifact), **DECIDED** (a ruling by someone entitled to make it) and **INFERRED** (ours) are tagged separately. A paraphrase of a ruling is not a ruling: anything load-bearing is quoted verbatim with its timestamp.
   **Authority, stated because this cycle needed it.** **David Johns is the central PM and owns decisions**; **Kathleen O'Donnell is co-PM and the design authority for this surface**. **Airtime is not authority** — the cue counts above invert the authority order. **Acquiescence is not ratification**, and **consensus in a room the decision-owner has left is not a decision**. Where an entry lacks its owner's ratification, §17 and the decision log **say so** rather than treating room-consensus as settled.

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

> ### ✅ RESOLVED at v1.5 — the placement question is closed by the July 30 call.
>
> The July 30 call settled where SpotBoard's UI lives, on PM (Kathleen) concurrence — **[[decisions/decision-log|SPB-18]]**. Stated cleanly:
>
> - **The planner-facing SpotBoard UI is a dedicated tab/page NEXT TO Tender, inside the shipment.** It is **not** a separate sidebar domain (Manuela: *"Instead of having a separate domain for it… now I understand it's very tightly related to tender"* — July 30 call, 0:12), and it is **not** rendered inside the Tender tab itself (Kathleen, on whether it can live in Tender: *"We're saying **no**, Spot Board, we need to have **its own page**… this is all from a separate screen"* — 5:13–5:35). Irina: *"the first UI, you absolutely right. **Next to the tender**… it will be **under the shipment**"* (0:30–0:52).
> - **The cross-shipment "board" is a real, distinct surface — a top-level module above the shipment, on the left menu — and it is DEFERRED past V1.** Both PMs converge: Kathleen *"we need this above the shipment level so you have an overview of all the quotes… I definitely think we need to do that, but I don't think we need to do that V1"* (22:44–23:03); Irina accepts *"if we don't need to show it today, we don't need to show it today"* (21:52). An **external** (carrier-facing cross-shipment) version is furthest out, blocked on user management and carrier onboarding.
> - **Firm or leaning?** **Firm** that it is a shipment surface and not a separate domain, and **firm** that the board is post-V1 — all three on the call agree and the PM states it. A **strong resolution, formally unratified**, on the exact in-shipment placement (dedicated tab beside Tender, *not* inside Tender): David is the PRD's assigned Feature 1 owner and was absent (*"David will be back… tap his mind"* — 24:22). Treated as SPB-09 treats Thomas: decided in substance on PM concurrence, the formal owner's sign-off pending and low-risk.
>
> This **supersedes/resolves [[decisions/decision-log|SPB-11]]** (the four candidates collapse to *"dedicated tab next to Tender"*, and *"inside the existing Tender tab"* is explicitly rejected), **vindicates and sharpens [[decisions/decision-log|SPB-03]]**, and **refines [[decisions/decision-log|SPB-04]]** (two altitudes confirmed as the target state; the standalone module is post-V1). The v1.2 "placement is open" reading below is preserved as the record of the state before July 30; it is now closed. Full walk in §16.

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

> **Scoped POST-V1 at v1.5.** On the July 30 call both PMs agreed this cross-shipment board is wanted eventually but **not built for V1** — Kathleen calls it *"this internal view that I had Claude built"* (i.e. this very screen), *"above the shipment level… an overview… I don't think we need to do that V1"* (July 30 call, 20:09–23:03); Irina accepts (21:52). An **external** version (carriers viewing across shipments) is further out, blocked on user management and carrier onboarding — reinforced by *"each shipment will be its own e-mail"* (10:01), i.e. no merged cross-shipment carrier view in V1. The per-shipment tab (Screens 1, 4) is V1; this module is not. §3, [[decisions/decision-log|SPB-18]].

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
>
> **Appended at v1.5 — the token model is now corroborated across three dates, and still not adopted formally.** Kathleen proposed exactly this token model on **July 28**, a day before the note — *"we don't need carriers to sign in… give them some sort of token… **Even if user management is done**, you want… the carrier to quickly quote"* (July 28 full, 38:41–39:22) — and reaffirmed it on **July 30** with a new rationale (the XPO/Laurie precedent that carrier onboarding *"took them years"*, against a one-month deadline — July 30 call, 2:10–2:52). **Irina, present at both meetings, tentatively agreed on July 28** (*"token dying after 60 minutes is probably possible"*, 39:37) **and deferred the auth question on July 30** (*"do not even think about how we authorize them… that's for later"*, 3:54) — so her own words either side of the 07/29 report do **not** support the secondhand claim that she opposed the token. **This does not resolve §15's contest**, because Jana (the other party) was absent from both meetings and Thomas has still not spoken. [[decisions/decision-log|SPB-19]]; §15.1, §16.

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

### Newly opened at v1.6 — grouped by who owns the answer

**Nothing was closed at v1.6.** Stated explicitly so the absence is not read as an oversight. The August 7 artifacts settle *behaviour* in several places, but every item below lacks the ratification that would close it.

**David Johns — central PM, owner of decisions.**
- **⚠️ Is the cross-shipment SpotBoard in the September 30 V1?** Kathleen scoped it to phase one **twice** (Aug 7 call, 21:12 and 53:34), corroborated by her own diagram drawing it solid; `image (5)`'s only future-marked node is the carrier portal. **David never engaged** — at 53:31 Kathleen addressed him by name (*"So David, we kind of went round and round on this"*) and his only reply was *"What do you mean all quotes?"*, a question about a different clause. **[[decisions/decision-log|SPB-18]] clause (2) is reversed in substance and the ratification is missing** ([[decisions/decision-log|SPB-24]]). Irina's counterweight is a **timeline** argument, not a scope one (15:20, *"we have seven weeks"*). **What closes it: one sentence from David, with Kathleen present**, since the two of them *"went round and round"* on it in a meeting she describes that way herself. **This is the headline open item of this cycle.**
- **Ratify or reject the standalone-module-with-its-own-database.** Irina's plan against [[decisions/decision-log|SPB-10]]'s *"rebuilt natively within OdysseyONE"*. Kathleen's [51:33] was acquiescence mid-pivot, and her own post-call diagram draws a single store with four readers. Evidence now exists on both sides. §17.10(a), [[decisions/decision-log|SPB-35]].
- **Placement, still.** He was absent for the entire placement argument and ruled only on defaulting and shipment-level content. [[decisions/decision-log|SPB-11]] / [[decisions/decision-log|SPB-18]]'s sign-off residue is untouched by this call. §17.7.

**Kathleen O'Donnell — co-PM, design authority for this surface.**
- **The `Load #SP-48213` label in her own future-state wireframe against [[decisions/decision-log|SPB-05]].** §18.3 item 1.
- **Is disclosing bid RANK and PERCENTAGE GAP to carriers sanctioned?** Note the precision: disclosing the leading-bid *amount* already exists as the configurable legacy `SHOW_BEST` behaviour (§14.5), so **only rank and gap are new**. §18.3 item 3.
- **The un-cropped exports of `image (4)` and `image (5)`** — both are truncated, and claims about the completeness of either currently carry a caveat. §17.1.
- **Is the `Monitoring spot view` in scope, and who builds it?** It is labelled `EXISTS` on her diagram and does not exist in our app. §17.7, [[decisions/decision-log|SPB-26]].

**Thomas — the `OQ-1` owner, who has still not spoken in any artifact we hold.**
- **Token lifetime** — *"he had concerns about how long they leave the token open"* (Kathleen, 41:32).
- **Can a token permit a READ-ONLY return visit, as distinct from an UPDATE?** Kathleen's own chat asks both in one breath (*"see the carrier board **and** update their quote"*) and **nobody separated them in the call.** These are different security questions with different answers.
- **Formal `OQ-1` ratification.** Unchanged by this cycle: Kathleen's in-call *"Thomas said you cannot update it"* [49:18] was downgraded by her own written *"Outstanding… with Thomas"* hours later. §17.6, [[decisions/decision-log|SPB-23]].

**Ramesh / product, unowned in the artifacts.**
- **Can a planner send a second RFQ wave** to carriers not included in the first? Asked by Manuela at 33:02, never answered. §17.10(d).
- **Can a planner enter a bid on the carrier's behalf** (phone-in quotes)? Kathleen and Irina contradict each other in two consecutive cues (34:48 / 34:54) and it is never resolved. **It interacts directly with the one-time-submit ruling.** §17.10(d).
- **Does un-declining survive the one-time-token ruling?** PRD Feature 3 permits it explicitly; a strict reading kills it. Nobody discussed it. §17.6.

**Ours — understanding gaps, no external input needed to state them.**
- **What is `Gave Back`?** A `MFFCOFL` carrier-grid checkbox column (§17.2) defined **nowhere** in this canon, in the PRD, or in any transcript. Adjacent to the wireframe's *"Waffled / Gave back"* eligibility flag but never equated to it by any artifact.
- **Does the per-carrier `MFFLCE Tender Status` inside the overflow grid have an OdysseyONE counterpart?** It is the Tender→SpotBoard direction of a link we currently model only in the SpotBoard→Tender direction ([[decisions/decision-log|SPB-02]]). §17.2.
- **What are `External Quote No` and `Expires` on the `MFFCOFL` footer for?** Present on both the overflow screen and the legacy tender `Quote` tab (§14.6), empty in every screenshot we hold.
- **Which surfaces need the two non-award outcomes** (`Declined` vs `No Bid Submitted`) — **unchanged from v1.4** and now with a third data point: `Quote Viewer` renders the literal string `Declined` **in the cost column** (§17.3), a fourth rendering nobody has reconciled.

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

### Closed at v1.5

| Was open | Closed by |
|---|---|
| **Where does SpotBoard's UI live — the Feature 1 launch point?** (open since v1.2, four candidates, David's call) | **The July 30 call, on PM concurrence.** A dedicated tab **next to Tender, under the shipment** — not a separate sidebar domain, not inside the Tender tab. David's formal sign-off pending, low-risk. §3, §16, [[decisions/decision-log|SPB-18]]. |
| **Is SpotBoard a separate domain or a shipment surface?** (implicit; the vault files it as a domain) | **A shipment surface.** *"very tightly related to tender… instead of a separate domain"* (Manuela, July 30 call). The `10-domains/spotboard/` folder is knowledge organisation; the **UI** lives under Shipments. §16. |
| **At what altitude is the cross-shipment board, and is it in V1?** (SPB-04 left it as "both altitudes") | **A top-level module, above the shipment — and deferred past V1.** Both PMs agree it is wanted eventually but not built now. §3, §6, [[decisions/decision-log|SPB-18]]. |

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
- ~~The **Feature 1 launch-point decision** — where SpotBoard is launched from.~~ **CLOSED at v1.5 by the July 30 call** ([[decisions/decision-log|SPB-18]]): a **dedicated tab next to Tender, under the shipment — not a separate domain, not inside the Tender tab.** The four PRD candidates collapse; David's formal sign-off is the only residue. The cross-shipment monitoring **board is a top-level module, deferred post-V1.** §3, §16.
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
| **CTNS** (also **3TS**) | Odyssey's in-house **truckload** brokerage / sister carrier — the internal SCAC put into the route guide so a load can be tendered internally (*"we send them the load… sending to that carrier is the load board"*). **This is the same CTNS that runs the affiliate app `240`** (§6, §8): the sister brokerage that both receives Loadboard postings and bids inside the SpotBoard auction. **New at v1.5.** Almost certainly the same desk the loadboard transcript located in **Kennesaw**. | July 28 full, 1:32–3:04; loadboard transcript, 1:04 |
| **Overland** | Odyssey's in-house **bulk / tank** brokerage desk — the bulk counterpart to CTNS (*"if it's truckload it goes to CTNS; if it's a bulk… tank shipment it goes to this overland group"*). **Named at v1.5**; the loadboard transcript's unnamed *"bulk brokerage group"* is this. | July 28 full, 3:14–3:41; loadboard transcript, 1:13 |

**Strengthened at v1.2 by the PRD:**

- **Kathleen O'Donnell** is named in the PRD's own metadata block as `Owner — Product Management`. Her PM role is now documentary, not inferred.
- **David** is confirmed as the decision-maker on SpotBoard's launch point (*"DAVID to confirm where this makes most sense"*, Feature 1) and as the addressee of Kathleen's configuration question (Feature 2), and the PRD's draft notice says it was *"reviewed and updated through four working sessions with David and the SME team."* The wireframe's "David" is therefore **near-certainly David Johns**, who attends these meetings (loadboard transcript, 0:09) — the inference is now very short. The `David`/`Dave` spelling question is §9.12.
- **Doug** owns three concrete deliverables in the PRD: the equipment-type usage query (`OQ-13`), the OCM/Org Carrier Mode inheritance walkthrough (Appendix B), and — with Dave and Engineering — the tolerance-split and profile-wrapper questions (`OQ-12`, `OQ-15`). Combined with the 07/29 meeting's *"the expert with TMS"*, his role is fully established.

**No new stakeholders at v1.5.** The complete July 28 transcript has the **same three speakers** as the cut — Kathleen, Irina, Manuela (Irina joins at 3:41, *"I stuck in another call"*). The July 30 call has the same three. So the fuller record adds **no new participants**. It does name-check two absent people: **Janardhana** as the Shipments expert who should have been there (*"I hope Janardhana was here because he's more clear about it"* — Manuela, July 28 full, 37:27; Kathleen *"I can talk to Janardhana about it further"*, 37:37), and **Dave/David** as party to an earlier same-day conversation (*"Dave was saying earlier that he puts the SCAC into the route guide"* — July 28 full, 1:45). Both are already in this table. **ODM/OGM** — a separate Odyssey SaaS planning system that does spot differently (no separate overflow board) — is named as a *system*, not a stakeholder (July 28 full, 43:47–46:48; §16).

**Transcription noise — not stakeholders.** The loadboard transcript contains two garbled proper nouns that should not be read as people until corroborated: *"I need to meet you with Mington"* (0:06) and *"Thanks, Tom."* (0:11). Both are single-instance and unintelligible in context. The July 28 full transcript adds its own garbles — TMS is variously rendered *"GMS"*, *"KMS"*, *"PMS"*, *"BGI"*; a legacy quote number reads *"222573"*. Sample names in the wireframe's mock data — `J. Rivera`, `M. Ford`, `S. Holden` — are fictional.

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

> **Extended at v1.6 — read this section with §17.** Three of the screens below were photographed directly and pasted into the August 7 design call, at far higher fidelity and with their grids populated: **`MFFCOFL`** (§14.1 → §17.2), the **`Quote Viewer`** (§14.7 → §17.3), and the **carrier portal at both depths** (§14.3/§14.4 → §17.4). Where §14 lists a field inventory from the PRD's captions, §17 shows the same screen with data in it. **Nothing in §14 is corrected by §17** — it is confirmed and extended. One §14 detail is load-bearing in the other direction and is easy to miss: **§14.5's carrier-facing `HH:MM Remaining` and `Best` columns mean a countdown and a leading-bid amount are *inherited* on carrier surfaces, not invented** (§17.8).

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

> **Updated at v1.5 — limit (ii) no longer holds, and it cuts against the report.** We now have **Irina's own words on the token, on the two days either side of the 07/29 meeting**, and they are not opposition. On **July 28** she tentatively agreed: *"we don't have user management done, but okay… we might do this the same as a tracking"* and *"Yeah, probably. We probably could do it because… this token dying after 60 minutes is probably possible."* (July 28 full, 39:14–39:37). On **July 30** she deferred the whole question rather than opposing it: *"do not even think about how we authorize them. It's not the part of this call. That's for later."* (July 30 call, 3:54), and she agreed to redirect the carrier to a landing page (4:08–4:36). So the *"Jana **and Irina** were opposing"* report is, for Irina's half, uncorroborated by — and mildly contradicted by — her own recorded speech. **The live contest is best read as Kathleen-vs-Jana**, with Irina an equivocator who defers to user-management timing, not a committed opponent of the token. Jana's half of the report still stands only on the story's *existence*, not on any argument in it. [[decisions/decision-log|SPB-19]]; §16.

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

> **Complicated (not overturned) at v1.5.** The July 28 transcript adds a Kathleen line the pure-sequencing reading has to absorb: *"**Even if user management is done**, you want to ensure that the carrier can quickly quote. So if we give them… a token, then we just have them quote."* (July 28 full, 39:22). If Kathleen wants the token path to persist **even after** user management exists, then for her the token is not merely phase one *of* the portal — it is an **enduring fast lane that coexists with** the portal. That is compatible with the sequencing reading (both surfaces ship, just not at once) but not with its simplest form (token now, portal instead-of-token later). It nudges the reconciliation from *"token now, portal later"* toward *"token always, portal additionally"*. **Still INFERENCE, and it makes the one question to Jana more precise, not less needed:** not only *is your portal v1 or target state?* but *does a quick tokenized path survive alongside it?* [[decisions/decision-log|SPB-19]].

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

## 16. The July 28 full transcript and the July 30 call (new at v1.5)

Two artifacts. The first is an **accuracy audit of the earliest layer of this canon**; the second **settles UI placement**.

### 16.1 The July 28 full transcript vs the incomplete cut — audit result

The v1 canon was synthesised from `Overflow meeting 1.txt`, a **~9 KB cut** of this meeting that dropped roughly **1:16–11:47** and **everything after 17:08**. The complete transcript (47m25s) fills those gaps.

**The headline audit finding: the cut's timestamps are accurate, so nothing already cited is mis-anchored.** Every existing `(meeting 1, M:SS)` / `(transcript, M:SS)` citation — 0:03–1:16, 11:47, 12:14, 12:35–15:05, 13:15, 13:35, 14:07–14:26, 15:05, 15:44–16:24, 16:36 — points at the same words in the full recording. The full version therefore **corroborates and extends**; it **corrects no timestamp and contradicts no canon assertion.** What it does is (a) move several claims the canon sourced to *later* documents back onto meeting 1 itself, (b) add genuinely new material, and (c) raise two tensions.

**(a) Corroborated from an earlier date — claims the canon sourced to the PRD, the wireframe, or the 07/29 loadboard meeting are also spoken live on July 28:**

| Canon claim | Was sourced to | Also in meeting 1 (full) |
|---|---|---|
| Loadboard = automated internal channel to Odyssey's own brokerage desks ([[decisions/decision-log|SPB-07]]) | 07/29 loadboard transcript | Kathleen explains it a **day earlier**: *"the load board is the tender to our sister carrier… a brokerage group called CTNS, or… 3TS… sending to that carrier is the load board… keep our own money in-house"* (1:32–3:04). Names the two desks: **CTNS/3TS** for truckload, **Overland** for bulk/tank (3:14–3:41). §4, §11 |
| Spot is **planner-initiated, not automated** (canon §2) | PRD §2 + loadboard transcript | *"it's initiated by a planner. This is not an automated system initiation. This is a planner has to initiate."* (5:32–5:48) |
| Auto-award is target state; manual is the exception (§9.7) | PRD §1 | Irina: *"We make a decision and manually awarding this carrier or **system might award based on the rule later**, but right now it's manually done."* (8:56–9:15) |
| 60-minute bid window | wireframe / PRD | *"they have an hour to bid"* (8:19); *"open for 60 minutes… you see this duration, 60 minutes"* (27:05) |
| Award ≠ tender; awarded carrier added to the tender route guide ([[decisions/decision-log|SPB-02]]) | meeting-1 cut (15:44) + wireframe | Live TMS demo (31:26–32:03): after *"process"*, the spot carrier appears on the tender screen and can be tendered |
| *"Process SCAC"* → *"Award"* rename ([[decisions/decision-log|SPB-06]]) | wireframe annotation | Irina demonstrating the legacy button: *"I have this button, process… We want to change some of the words. We don't want to keep this awkward names."* (~30:50). Live corroboration of a decision previously wireframe-only |
| Markup applied on the quote ([[decisions/decision-log|SPB-15]]) | PRD Feature 5 / legacy screens | *"We do have ability to add markup based on the quote"* (Irina, 43:20); Kathleen frames the open question as **network leverage / AP rate** on spot quotes (42:36–43:37) |
| Rename Overflow → SpotBoard ([[decisions/decision-log|SPB-01]]) | cut (13:15) + wireframe | **Fuller and earlier:** *"people didn't like overflow… we're going to call it spot… spot board… we have load board and we have spot board… or can be quote board… It's auction, but we don't want to use auction words"* (7:24–8:19). Rationale and rejected alternatives now on record |
| Carrier token auth ([[decisions/decision-log|SPB-09]]) | Kathleen note 07/29 | Proposed a day earlier; §8, §15, [[decisions/decision-log|SPB-19]] |

**(b) Genuinely new — not present in the canon from any source:**

1. **A legacy *"carrier quoted"* checkbox on the tender row.** Kathleen: *"there was a check box… that says carrier quoted"* — Irina confirms and points to it (32:40–32:53). The canon had only **inferred** a provenance flag (the `SPOT RATE` badge) from Kathleen's 16:36 request; this is the actual legacy mechanism it was inferring. Firms up [[decisions/decision-log|SPB-02]]'s rendering discussion.
2. **Legacy sorts the awarded spot carrier to RANK ONE, not "last row."** Kathleen, watching the demo: *"So interesting that they went to rank one, huh?"* (31:55). The wireframe (and [[decisions/decision-log|SPB-02]]) render the spot carrier *"appended as the last row of the route guide."* Legacy instead inserts it **by rate rank** — lowest bid sorts to rank 1. **Not a contradiction of SPB-02's substance** (the carrier still lands on the tender route guide), but the *placement within the guide* is rate-sorted in legacy vs appended-last in the wireframe. SPB-02 already marks the last-row rendering a *proposal*; this is the legacy counter-evidence. Worth flagging to whoever designs the tender row.
3. **A separate legacy tab for "draft / dropped carriers"** — carriers excluded from the routing guide on transit-time grounds (*"some carriers can have from Miami to New York two days transit time, and somebody will require three days, so we might have dropped carriers… They have it as separate. It's a separate tab."* — 21:33–22:17). Relates to the `OQ-17` flag-surfacing question and to the tab/button discussion (§9.2). Not the same as the SpotBoard carrier list.
4. **ODM/OGM — a separate Odyssey SaaS planning system that does spot *without* a separate overflow board.** *"in OGM, we do not separate it. Load board and everything is on the same page. Maybe we don't use overflow for OGM."* (43:47–44:39); it is *"a SaaS system… clients can manage their own tendering"* (Kathleen, 46:29) with its own routing guide and load-board posting (46:48). New boundary context: not every Odyssey system splits overflow out. Irina offered to demo it (46:13).
5. **Legacy operational detail:** quote numbers are bare 6-digit (`222573`, 27:18) — unlike the wireframe's `QT-88421`; the carrier bid page *"refreshed every 5 minutes"* (Irina, ~28:00) — the wireframe says auto-refresh **1 min** (§6), a minor discrepancy; a decline *"will go strictly to"* TMS; the awarded bid stamps the submitting **username** on the tender row (*"user IJ at order come"*, i.e. `ij@…`).

**(c) Two tensions the full transcript raises — both flagged, neither resolved here:**

1. **How "load board" relates to tendering.** Meeting 1 describes load board as **tendering the internal sister carrier CTNS** — its SCAC is placed in the route guide, so *"the internal is part of the tendering process"* (5:27) and *"instead of tendering to ABC carrier, now we send the tender to CTNS… that sending is the load board"* (2:10). The **07/29 loadboard transcript**, convened specifically on this boundary, calls load board *"a **separate** process… an **automated** process to take the shipment"* ([[decisions/decision-log|SPB-07]]). **INFERENCE (marked): these are reconcilable** — a CTNS SCAC in the route guide (reached during tendering) and an automated load-board posting (a separate channel) can both be real ways the same internal desks get work — but the two framings are not identical, and meeting 1 leans toward *"internal carrier inside the tendering sequence"* where 07/29 leans toward *"separate automated board."* **[[decisions/decision-log|SPB-07]] stands** (the 07/29 meeting is the one held to settle the boundary); the nuance is logged for a confirming question. It also ties **CTNS to the affiliate app `240`** (§6, §8): the same sister brokerage receives Loadboard work *and* bids inside the SpotBoard auction.
2. **Rank-one vs last-row**, item (b)2 above.

### 16.2 The July 30 call — placement, and the access question re-touched

**Placement is decided; see §3 and [[decisions/decision-log|SPB-18]] for the full statement.** In one line: the planner UI is a **dedicated tab next to Tender, inside the shipment — not a separate sidebar domain, not inside the Tender tab** (Manuela proposed, Kathleen concurred and stated it, Irina agreed); the **cross-shipment board is a top-level module, deferred post-V1**; David (the PRD's formal owner) was absent and returns Monday, so it is firm on PM concurrence with a low-risk formal sign-off outstanding.

**A note on the vault's own framing.** This vault files SpotBoard as a domain (`10-domains/spotboard/`), and Manuela herself *"initially imagined it was a separate domain"* (0:12). July 30 says the **UI** is not a separate domain — it is a shipment surface. The knowledge-organisation folder and the UI placement are different questions; the folder can stay, but SpotBoard-the-screen lives under Shipments, beside Tender.

**Carrier access re-touched, not resolved.** July 30 is the most recent evidence and it **reaffirms Kathleen's token model** with a fresh rationale — the XPO/Laurie precedent that onboarding carriers *"took them years"*, against a one-month V1 deadline (2:10–2:52) — while **Irina defers the auth question** (*"do not even think about how we authorize them… that's for later"*, 3:54). The mechanic *"each shipment will be its own e-mail"* (10:01) confirms one RFQ (hence one per-recipient token) per shipment and no merged multi-shipment carrier view in V1. **Jana was absent and Thomas is still silent, so the §15 contest is unmoved on its two principals** — but Irina's own words here and on July 28 undercut the secondhand 07/29 claim that she opposed the token. §8, §15.1, [[decisions/decision-log|SPB-19]].

---

## 17. The August 7 call and the current-state screens (new at v1.6)

**Why this section exists.** §14 describes the legacy screens as the PRD's Appendix B rendered them — small, cropped, captioned by someone summarising. This section describes **the same screens photographed directly and pasted into a live design call**, with their grids populated and their vocabulary readable. It is the first time the domain has seen the row-level data rather than the field list. It also lands the **2026-08-07 transcript analysis**, which was completed in Session 114 and never written to the vault.

**Everything below is tagged.** **SHOWN** = visible in an artifact. **SAID** = spoken in the call, attributed and timestamped. **DECIDED** = a ruling by someone entitled to make it, with the ratification state stated. **INFERRED** = ours, and marked as ours.

### 17.1 What the seven artifacts are, and three attribution corrections

| Artifact | What it is | Correction or addition from the transcript |
|---|---|---|
| `image (1)` | **`Maintain Carrier Overflow (MFFCOFL)`** — the per-shipment planner screen, name read from its own title bar | Pasted by **Kathleen** at 52:18: *"Manuela, I copied in the screen that we have today just so that you have more details for the original screen."* |
| `image (2)` | The carrier portal's **`Load Detail`** page | **Irina's own browser session** (the user chip reads `Jachimek, Irina`). The URL is `…/f?p=**200**:4:…` — Oracle APEX application **`200`**, which the PRD's Appendix B identifies as the **carrier** app. **First-hand visual confirmation of the `200`/`220`/`240` split** ([[decisions/decision-log|SPB-10]], [[data/quote-model|data/quote-model]] §6) |
| `image (3)` | The carrier's **`Quote Entry`** modal, `Quote# 15940` | **Kathleen's paste, not Irina's**, at 46:37: *"Irina, I just copied in what the carrier sees today. It's not a board. It is an actual entry screen. It says quote entry."* Same quote number the PRD reproduces on p.23 (§14.4) |
| `image (4)` | **`Quote Viewer`** — the cross-bid screen | **Kathleen names it verbatim** at 53:08: *"Okay, that one, that's the cross bid screen."* The phrase used across this intake is hers |
| `image (5)` | Kathleen's **workflow diagram** | Produced **after** the call — *"Based on our crazy discussion today, I worked on a workflow"* |
| `auction wireframe` | The future-state auction portal | Kathleen: *"a wireframe for the carrier portal dashboard, **future state** with auction like bid"*. §18 |
| `Aug 7 call` | The 57m23s transcript | David absent **07:56–26:07**: *"I'll dial back in in 20 minutes. I gotta step out. Sorry."* [07:56], next cue [26:07] |

> **⚠️ Two artifacts are truncated, and it bites on specific claims.**
> - **`image (4)` is cut off at the bottom**, mid-way through the fourth quote group. Its own header states `1 - 16 of 16`, so **roughly 3 of 16 rows were never seen** and no footer or pagination control can be ruled in or out. Any claim about the completeness of that screen's row set, its sort behaviour or its paging is unsupported.
> - **`image (5)` is cut off below `5 · Award load`** — the top arc of at least one further node is visible. **Any claim that the workflow "ends at award" is unsupported.** Ask Kathleen for the un-cropped export before treating the diagram as exhaustive.

### 17.2 `MFFCOFL` — the legacy per-shipment planner screen (SHOWN, `image (1)`)

**The direct ancestor of our in-shipment `SpotBoardTab`.** §14.1 lists its fields from the PRD; this is the same screen with data in it. One row of the carrier grid = **one carrier's participation in one quote on one load**.

**Identifier hierarchy exposed on one screen:** Shipment `ID 09427` → `Load 35349` → Order `No ACME-052626.049` → `Quote# 15943` → carrier rows keyed by `Scac`.

**Region A — `Shipment` (read-only).** `ID` `09427` · `Load` `35349` · `Consol` (empty) · `Status` `REVIEW` · `Ship Date` `07/08/2026` · `Owner` `*ACME_SYS_01` · `Desc` · `Consignor` `ACME PLT 1` · `Consignee` `ACME CLT 1` · `Weight` `140 LB` · `Pkg Count` `1` · `Equip` `TL`. Checkboxes `Instructions` ☐ and `Hazardous` ☐; button **`View Load Details`**.

**Region B — `Order` (read-only).** `No` `ACME-052626.049` (plus a second, empty field) · `Date Type` `SCHEDULED SHIP DATE` under column headers `Earliest` / `Latest` · `Pickup` `07/06/2026 13:00 EST` · `Delivery` (empty) · `Pickup #` (empty).

**Region C — the quote band.** `Equipment` `TL` / `Truckload` · `Owner` `ACME PLT 1` · `Ship From` `United States` · `Ship To` `United States` — then the quote box: `Quote#` `15943` · `Status` `OPEN` · `Duration (minutes)` `60` · `Flexible Pickup?` ☑ (checked, disabled) — then `Quote Opened` `25-Jun-2026 11:01 EST` · `Quote Expires` `25-Jun-2026 12:01 EST` · `Quote Closed` (empty).

**Region D — the carrier grid.** Fourteen columns, verbatim, left to right:

`Include?` · `Scac` · `Name` · `Pickup` · `Delivery` · `Transit` · `Distance` · `MFFLCE Tender Status` · `Gave Back` · `Routed` · `Status` · `Status Date` · `Username` · `Quoted Cost`

Seven populated rows on a 60-minute quote, all sharing `Transit .74 hr` and `Distance 37 mi`:

| Include? | Scac | Name | Delivery | MFFLCE Tender Status | Gave Back | Routed | Status | Status Date | Username | Quoted Cost |
|---|---|---|---|---|---|---|---|---|---|---|
| ☑ | `YFSY` | Yellow | `06-Jul 13:00 cst` | `Cancelled` | ☐ | ☐ | `Done` | `25-JUN-2026 11:02 EST` | `donaldduck@disney.c…` | `1,053.43 USD` |
| ☑ | `CTNS` | Capital Transport… | `07-Jul 09:45 cst` | — | ☐ | ☑ | `Declined` | `25-JUN-2026 11:03 EST` | `donaldduck@disney.c…` | — |
| ☑ | `RDWY` | Roadway | `06-Jul 13:00 cst` | — | ☐ | ☐ | `Sent` | `25-JUN-2026 11:01 EST` | — | — |
| ☐ | `BSHP` | Bull Ship | — | — | ☐ | ☑ | `Excluded` | `25-JUN-2026 11:01 EST` | — | — |
| ☐ | `CCNI` | Cardinal | — | — | ☐ | ☑ | `Excluded` | `25-JUN-2026 11:01 EST` | — | — |
| ☐ | `CNWY` | Conway | `06-Jul 13:00 cst` | — | ☐ | ☑ | `Excluded` | `25-JUN-2026 11:01 EST` | — | — |
| ☐ | `SEFL` | Sefl | `06-Jul 13:00 cst` | — | ☐ | ☑ | `Excluded` | `25-JUN-2026 11:01 EST` | — | — |

**Region E — footer.** A single **`CLOSE`** button (the OPEN-state action bar, confirming the enablement matrix in [[data/quote-model|data/quote-model]] §3.2) · `External Quote No` and `Expires` (both empty inputs) · raw keys `ocm_id 762` · `ooc_id 515` · `rlce_id 10736` · `rlce_mrl_id 144112` · buttons **`Carrier Contacts`** and **`Load Instructions`**.

**A clean triangulation win — Kathleen's recollection verified against the artifact.** She said from memory at 27:52: *"by default, **you don't send them the routed carriers** that were from the route guide, but you can include them for a spot bid if you want to."* The grid shows exactly that: `BSHP`, `CCNI`, `CNWY`, `SEFL` all carry `Routed ☑`, `Status Excluded`, `Include? ☐`, and render **red**; the three non-routed carriers are `Include?`-checked with live statuses. **`CTNS` is the informative outlier** — `Routed ☑` yet included and it responded, i.e. the planner's opt-in is real and was exercised. This is the red-carrier convention of §14.1 with the data behind it.

**A conflict between the two co-equal sources, recorded not arbitrated.** Kathleen captions this paste *"that's the screen today with the look of everything that is on the bid screen. **Before it's sent out**"* [52:38] and Manuela accepts it [52:51]. **The screenshot does not show a pre-send state:** `Status OPEN`, `Quote Opened 11:01`, `Quote Expires 12:01`, carriers at `Done`/`Declined`/`Sent`, and `1,053.43 USD` already quoted. **Disambiguation (INFERRED, and low-risk):** legacy uses **one screen** for compose *and* live monitoring, where we split the work across `Setup & Carriers` and `Live Bids`. So *"everything that is on the bid screen"* is a **field checklist spanning both of our sub-tabs**, not an instruction to merge them. Nothing in the call asks for a merge.

**Fields legacy persists that our model and our tab do not carry.** Raised as a checklist, **not as scope**: `Gave Back` (a term defined nowhere in this canon — genuinely new vocabulary), `Routed`, **`MFFLCE Tender Status`** (the tender state of each candidate carrier surfaced *inside* the overflow screen — the Tender↔SpotBoard cross-link, in the opposite direction from `SPOT RATE`, [[decisions/decision-log|SPB-02]]), `External Quote No` + `Expires`, `Username` (who responded), `Status Date`, and per-carrier `Transit` / `Distance` / `Pickup` / `Delivery`. Field-level detail added to [[data/quote-model|data/quote-model]] §1.1–1.2.

### 17.3 `Quote Viewer` — the legacy cross-bid screen (SHOWN, `image (4)`)

**The direct ancestor of our `/spotboard` dashboard**, and the screen Kathleen pointed at when she said *"that's the dashboard we're talking about that you built"* [53:21]. §14.7 describes the same screen from PRD p.27; this adds its chrome, its data and its grain.

**Chrome — the placement evidence.** Odyssey-branded top bar; a **left sidebar containing exactly one item, 🔍 `Quote Viewer`**, active, with the rail empty beneath it for the full page height. **No `Monitoring` menu, no module list, no tab strip, no breadcrumb.** It presents as its own APEX application. *(This is evidence about **legacy**, not about where OdysseyONE should put the surface — see §17.7.)*

**Filter bar:** `Client` (`SYS`) · `Order#` · `Load#` · `Quote#` · `Interval` (`6 days`), with **`Submit`** and **`Clear`**. Then APEX interactive-report furniture: a search box, `Rows` `100`, an **`Actions ▾`** menu, and an active **control break on `Quote#`** — which is *why* the table renders as per-quote bands. Row count `1 - 16 of 16`.

**Twenty columns, verbatim:** `Order#` · `Load#` · `SCAC` · `Shipper` · `Equipment` · `Ship From` · `Ship To` · `Intermediate Stop-offs` · `Hazmat` · `Pickup` · `Deliver` · `Quote Opened` · `Quote Duration` · `Actual Duration/ Time Remaining` · `Response Time` · `Response User` · `Quoted Cost` · `Awarded` · `Quote Detail` · `Load Detail`.

**The grain is the point.** One row = **one carrier's response to one quote**; rows are grouped by `Quote#` with the full header repeated per group (`15946` ×6, `15943` ×3, `15942` ×2, `15941` ×2+, truncated). Every row repeats the shipment- and order-level facts — the grid is fully denormalised so that **carriers can be read side by side**. There is **no per-quote aggregate anywhere**: no "3 of 6 responded", no leading-bid figure, no lifecycle status chip. The comparison is left to the eye.

**Values worth carrying:**
- `Actual Duration/ Time Remaining` is **one column with two renderings** — a large bold live `01:00` clock on the still-open quote, an elapsed string (`3 minutes`) on closed ones. §14.7 recorded the flip; this shows both renderings at once.
- `Quoted Cost` carries the literal string **`Declined`** where a carrier declined — the cost cell doubles as a response-outcome cell.
- `Awarded` is a **per-carrier** mark: `-` on the open quote, a red ✗ on every row of the three closed ones.
- **Two** per-row drill-ins, `Quote Detail` and `Load Detail`.
- `Load#` renders `L35349` here and bare `35349` on `MFFCOFL` — the `L` prefix is a display convention of this screen.

**This is Irina's requirement, backed by the artifact.** [11:38] *"this view doesn't show you 4 different bids for the same shipment. The other board which we discussed to put not under the shipments, **the board itself will give you that view**."* The legacy reference design agrees with her: it is per-carrier, grouped. **Our dashboard is one row per quote with `Resp./Invited` and `Leading Bid` aggregates**, pushing the actual comparison behind a drill-in. [[decisions/decision-log|SPB-30]].

### 17.4 The carrier-facing current state — a two-depth portal (SHOWN, `image (2)` + `image (3)`)

**This is one application at two depths, and that is the finding.** `image (2)` is the `Load Detail` page; its **`Enter Quote`** button opens `image (3)`, the `Quote Entry` modal. Today's carrier does not land on a bare form.

**Depth 1 — `Load Detail`** (APEX app `200`). Tabs `Requests For Quote` (active) / `Load Summary`. Left nav, exactly two items: ✎ **`Quote Requests`** · 🕘 **`Quote History`** — the same two-item nav §14.3 records, and the shape Kathleen's note describes as the *deferred* logged-in area ([[decisions/decision-log|SPB-09]]). Breadcrumb `Request For Quote / Load Detail`.

- Card **`Load Details for Quote#`** — the header renders **with no number after it** (verbatim; an unfilled substitution or a blank value). Primary action **`Enter Quote`**. Columns: `SCAC` `ARVY` · `Shipper` `Usalco` · `Ship From` (full address) · `Ship To` (full address) · `Pickup` `08/26/2026` · `Deliver` `08/26/2026` · `Distance` `325 mi` · `Weight` `200 lb` · `Hazmat` `No`.
- Card **`Items`** — `Item` · `Description` · `Weight` · `Package Count` (`15`) · `Hazmat Code` · `Hazmat Packing Group` (`Not Applicable`) · `Hazmat Class` · `Hazmat Description` (`No hazardous data provided by shipper`) · `Safety Data Sheet`. Footer `row(s) 1 - 1 of 1`.
- Card **`Instructions`** — `No Instructions.`

**Depth 2 — `Quote Entry` modal**, headed `Quote# 15940`, the only identifier on the screen. Matches §14.4 exactly, now at full resolution:

- **`Base Charge`** — `Linehaul` editable (`100.00`) · `Currency` a real select (`USD`) · `Fuel` plain text (`53.43`) annotated **`[ 1.44 per mile (minimum 10.00) ]`** · `Subtotal` (`153.43`).
- **`Additional Charges`** — a fixed four-row `Charge`/`Amount` catalogue: `Hazmat` (`100.00`) · `Pickup` · `Tips` · `Tolls`. **A catalogue, not a per-shipment derived list.**
- **`Flexible Dates`** — red bold **`*Choose pickup and delivery dates:`**, then `Pickup` editable `08-Jul-2026` between greyed `Earliest 06-Jul-2026` / `Latest 10-Jul-2026`, and `Delivery` the same shape, each with a picker icon and the hint `(dd-Mon-yyyy)`.
- Actions: **`Decline`** · **`Submit`**. Nothing else.

**[[decisions/decision-log|SPB-13]] confirmed against a live screenshot rather than a PDF page** — carriers *choose within a planner-set window*; they do not propose dates. And the mechanic is real, not decorative: `image (4)` shows `CTNS` returning a delivery of `07-Jul-2026 09:45 cst` where every other carrier returned `06-Jul` — **date variation is captured and persisted per carrier.** `image (1)`'s `Flexible Pickup? ☑` is the planner side of the same window. **Our carrier bid page has no date affordance at all** ([[decisions/decision-log|SPB-33]]).

**Identifier exposure — [[decisions/decision-log|SPB-05]] corroborated visually on both surfaces.** Neither carrier screen shows an Order#, a Load# or a shipment ID. The carrier's handle is the `Quote#`. Internal surrogate keys (`P_RLCE_ID,P_COFL_ID:4020394,222592`) appear **in the URL only**. *(Caveat: `image (2)` is viewed by an internal user, so it demonstrates the portal's layout, not the carrier's own authentication path.)*

**Irina is right on the structural point here, and Kathleen's rebuttal is factually incomplete.** [46:56] Irina: *"This is the board. This is the board."* → [46:59] Kathleen: *"That's not a board."* The entry screen **is a modal inside a portal**. Where Irina overreaches is [47:39] *"you see **one or more quotes** to populate the rates"* — `image (2)` is a single quote; the multi-quote list lives behind `Quote Requests`, i.e. behind a login. **She bounds it herself** two minutes later [48:12]: *"No, one e-mail, it's specifically designed from the security perspective. **Until we have login, we do not redirect them to the board.**"* Separately, her *"today, they submit the link and they have to log in"* [50:19] is **true of TMS** and Kathleen's *"we have nowhere for them to log in today"* [50:30] is **true of OdysseyONE** — two altitudes, neither speaker says so. [[decisions/decision-log|SPB-32]].

### 17.5 Kathleen's workflow diagram (SHOWN, `image (5)`)

Titled `Spot board workflow design`. A four-swatch legend: ● blue `Internal / planner` · ● amber `Carrier (external)` · ○ white `System / auto` · ⬭ dashed `Future phase`.

**The chain (single vertical, unlabelled arrows):**

1. **`1 · Shipment → Spot Quote tab`** — *"Dates/transit + eligible carriers auto-filled"* (blue, planner)
2. **`2 · Spot request email`** — *"Tokenized link, one per carrier"* (white, system)
3. **`3 · Carrier Quote Entry`** — *"Opens link, enters rate, submits"* (**amber, the only carrier-owned node**)
4. **`4 · Quote stored`** — **`"Written once, shown in the views below"`** (white, system)

**Node 4 fans out to four sibling consumer views on one horizontal bus:**

| Node | Eyebrow | Subtitle | Fill |
|---|---|---|---|
| `Spot Quote tab` | — | *"Responses per shipment"* | blue |
| `Internal Spot Board` | **`NEW`** | *"All open bids, status"* | blue, heavier border |
| `Monitoring spot view` | **`EXISTS`** | *"Existing shipment screen"* | blue |
| `Carrier Spotboard` | — | *"Authenticated portal, later"* | **dashed = Future phase** |

5. **`5 · Award load`** — *"From Spot Board or Spot Quote tab"*. Edges into it come from **`Spot Quote tab`** and **`Internal Spot Board`** only. **No edge** from `Monitoring spot view` or `Carrier Spotboard`.

**Four things the diagram states, in its author's own hand, after the call:**

1. **The quote is written once.** Node 4's subtitle is verbatim *"Written once, shown in the views below"*, on the same diagram whose carrier node reads *"enters rate, **submits**"* (singular). **No edge returns from any consumer view to node 3 or node 4.** §17.6.
2. **Exactly one node is marked future** — `Carrier Spotboard`, *"Authenticated portal, later"*. **The `NEW` `Internal Spot Board` is drawn solid**, i.e. in-workflow. §17.7, [[decisions/decision-log|SPB-24]].
3. **`Internal Spot Board` and `Monitoring spot view` are siblings, not nested.** Neither contains the other; both are consumers of the same stored quote. [[decisions/decision-log|SPB-26]].
4. **Award is reachable from two surfaces**, not from Monitoring. Consistent with [[decisions/decision-log|SPB-28]] locating award at the shipment altitude *and* with the board being an award surface.

**One store, four readers** — the diagram draws a single `Quote stored` node feeding everything. That is soft counter-evidence to the separate-database plan discussed in the call; §17.10, [[decisions/decision-log|SPB-35]].

**Truncation caveat repeats here:** at least one node below `5 · Award load` was not captured.

### 17.6 Bid revision — what was SHOWN, SAID, DECIDED, and what is still owed

**SHOWN — one-time submit, three independent artifacts agree.** `image (3)`: exactly two actions, **`Decline`** and **`Submit`** — no `Update`, `Revise`, `Edit`, `Withdraw` or `Resubmit` control anywhere. `image (5)` node 4: *"Written once"*. The internal grids carry a **single-response shape**: one `Status` + `Status Date` + `Username` + `Quoted Cost` per carrier on `MFFCOFL`, one `Response Time` + `Response User` + `Quoted Cost` per carrier on `Quote Viewer` — **no revision count, no bid-history sub-list, no prior-quote column.** *(INFERRED: whether re-opening the modal after submit re-renders it editable cannot be determined from a still.)*

**SAID — Irina reports, first-hand, that legacy permits unlimited revision.** She is the one who found out, and she volunteers it **against her own already-conceded position**:

> **[38:08] Irina:** *"in this dashboard right now, if I go to the my quote, which is not awarded yet, but still not closed, **I can change my prices**."*
> **[41:06] Irina:** *"If the bid is already entered, the carrier click again on that link and… he can add it and provide new cost **until the bid is closed**."*
> **[48:40] Irina:** *"you click submit button… you realize that you make a mistake… You will click on that link second time… **it's open with your data entered**."*
> **[56:59] Irina:** *"we can non-stop update these prices. **I just find out**, so I'm telling you, everybody, to know about it."*

**DECIDED — Kathleen rules it out for V1, four times; Irina concedes twice.**

> **[41:27] Kathleen:** *"…because he had concerns about how long they leave the token open. So for MVP, until we can have the carrier actually sign in, because **this is a cybersecurity concern** that allowing them to update into the last minute… **until they can log in, I don't think we're going to do that**."*
> **[42:05] Kathleen:** *"MVP, they just, they get the e-mail, they click on the e-mail, they only get that screen…"*
> **[49:14] Kathleen:** *"…when we talked to Thomas about it, he said you cannot update it. Like **that token is only available for a certain period of time**."*
> **[51:56] Kathleen:** *"today, we don't have any way for them to even update their bid because of security reasons."*
> **[41:54] Irina:** *"If we're not going to let them to update the cost, **it's fine with me**."* · **[49:27] Irina:** *"**I'm okay to not update it day one**, whatever you decide."*

**There is therefore no advocate for revisable bidding in V1.** The behaviour is settled on the design authority's ruling with the objector's concession.

**But record it as a REGRESSION, not as parity.** Today's system allows revision (SAID, first-hand) and **PRD Feature 3 explicitly lists `Update Bid`** with re-bid after decline permitted (*"status would move out of Declined"*). V1 *removes* a capability that both the legacy system and the requirements document have, **on a security constraint rather than a product judgement.** If the token question resolves favourably it comes straight back. [[decisions/decision-log|SPB-23]].

**STILL OWED — Thomas, and [[decisions/decision-log|SPB-16]] / `OQ-1` are UNCHANGED.** Kathleen's two statements are in tension **on the same day**: in-call *"he said you cannot update it"* [49:18], then in her chat with `image (5)`, hours later: *"**Outstanding** is to figure out with Thomas IF the carrier token can permit them to see the carrier board and update their quote, or if it is a one time submit only… only phase 2."* **She downgrades her own in-call claim to outstanding. Thomas's words are in no artifact we hold.** Three sub-questions are his: **token lifetime**; whether a token may permit a **read-only return visit**, which is a different question from update and which nobody separated in the call; and formal `OQ-1` ratification. Irina names the owner at [52:07]: *"I told Thomas this is his fight, not mine. It's him."*

**One consequence nobody addressed.** Un-declining is the same revisability class as re-bidding, and PRD Feature 3 permits it explicitly. A strict one-time-token reading would kill it too — contradicting the PRD twice over. **Flagged, not decided.**

### 17.7 Placement — the tension stated factually

**Three things are true at once, and they are compatible.**

1. **SHOWN, legacy:** the cross-bid screen renders today as a **standalone `Quote Viewer` page with its own one-item nav** (§17.3). `MFFCOFL` is a modal form with no navigation chrome at all. **No pixel evidence places either "under Monitoring"** — and equally none places them among sibling modules, because no siblings render.
2. **SAID, Irina** [17:24]: *"The board will be on the left… **Like icon on the very left. You click on that icon and you see all those.**"* Our `/spotboard` sidebar route implements this verbatim.
3. **SAID, Kathleen, three times** [01:18, 06:29, 54:20]: *"under the monitoring"* — and at [01:27] she is **directing Manuela to navigate the existing OdysseyONE prototype** (*"go to the shipment screen, go to monitoring. And then go to spot bid"*), not proposing a new location. The thing she means is a **filtered spot view on the existing Shipments monitoring screen**, which is what Manuela was demoing and proposing to extend [03:03]: *"instead of creating a new one, we can just add the columns that we need here."*

**`image (5)` dissolves the apparent conflict.** Kathleen's own diagram lists **`Monitoring spot view` (`EXISTS`, "Existing shipment screen")** and **`Internal Spot Board` (`NEW`, "All open bids, status")** as **two sibling consumers of the same stored quote**. She sanctions **both**. So the framing *"our route implements Irina's placement while Kathleen placed it under Monitoring"* is **not supported by the combined evidence** — our `/spotboard` route is the `NEW · Internal Spot Board` node, and the **Monitoring spot view is a third, separate, unbuilt surface** that no decision in `SPB-01…22` mentions. [[decisions/decision-log|SPB-26]].

**David endorsed the monitoring-query concept** in his last words before stepping out — [07:33]: *"this query should only show things that are open spot right now. It's for monitoring until it closes… And then from the carrier view, they might have different queries… So their views might look different."*

**What David did NOT do: rule on placement.** He was absent for the entire argument, and on return ruled only on **defaulting** and on **shipment-level content**. **[[decisions/decision-log|SPB-11]]'s formal openness on the launch point is not closed by this call**, and [[decisions/decision-log|SPB-18]]'s *"David's sign-off pending"* residue survives untouched.

**A note on how this landed in the product, kept deliberately narrow.** The user's framing of *why* the board became a separate route is her read of the meeting's politics and is **explicitly not canon**; it is not recorded here in any form. What is recorded is the factual state: a cross-shipment board exists at `/spotboard`, the design authority's diagram sanctions such a board *and* a separate Monitoring spot view, and no one with authority over placement has ruled.

### 17.8 What our built prototype invented — marked as ours, not as inherited

**Stated so that nothing in the app reads as descended from a source that does not contain it.** Files: `apps/odyssey-one/src/routes/SpotBoardDashboard.jsx`, `apps/odyssey-one/src/spotboard/board.js`, `apps/odyssey-one/src/routes/CarrierBid.jsx`.

**Dashboard — in `Quote Viewer`, absent from ours:** the per-carrier row grain and the `SCAC` column · grouping by `Quote#` · `Order#` · `Shipper` (we show `Client`) · addressed `Ship From`/`Ship To` (we collapse to a `Lane` string) · `Intermediate Stop-offs` · `Hazmat` · `Pickup`/`Deliver` · `Quote Opened` · `Quote Duration` · per-carrier `Response Time`, `Response User` and `Quoted Cost` · a **per-carrier** `Awarded` mark · **two** drill-ins where we have one action · dedicated `Order#`/`Load#`/`Quote#` filters · an **`Interval` date filter** (we have none) · `Submit`/`Clear` apply semantics · a row-count and a page-size control · `Declined` rendered in the cost column.

**Dashboard — ours, with no source ancestor:** the **five KPI tiles** (no summary tiles of any kind exist on the legacy screen) · the **quote-lifecycle `Status` badge column**, whose vocabulary `Open` / `Closing soon` / `In review` / `Awarded` / `Unawarded` / `Invalidated` comes from the wireframe and **not from legacy** — legacy has `OPEN` per quote and a *per-carrier* set (`Done`/`Declined`/`Sent`/`Excluded`) · the computed `Leading Bid` · the `Resp. / Invited` counts · the `My org / site` filter · the single contextual row action · the `Demo` badge and the empty states.

**Correctly inherited, not invented:** our `Time` column descends from `Actual Duration/ Time Remaining`, including its flip between a live clock and a post-close value. Minor divergence: legacy prints an *elapsed duration* after close, we print a *close timestamp*.

**Carrier bid page — ours, with no ancestor in any current-state artifact:** the **`Update Bid`** label (`{priorBid ? 'Update Bid' : 'Submit Bid'}`) · the **`Last submitted: … by … · <timestamp>`** provenance line, which implies a bid history the legacy per-carrier row does not model · the **decline-then-rebid** copy (*"You declined this quote. You can still submit a bid while this window is open."*). These three implement the **phase-two** behaviour of §18 today. *(The `Last submitted` line is PRD Feature 3's, so it has a **requirements** ancestor even though it has no legacy-screen one — the distinction matters.)*

> **Correction to a claim made during this cycle's own intake, and it matters twice.** It was asserted that the carrier-side **countdown** and any **leading-bid disclosure** are our inventions because `image (3)` shows neither. **§14.5 already records both on the legacy carrier surface**: the carrier's `Requests For Quote` row carries `Quote Closes`, **`Best`**, `Username` and **`HH:MM Remaining`** columns (PRD p.28, read visually), and the `Best` column is governed by the `SHOW_BEST` per-client profile ([[data/quote-model|data/quote-model]] §5.7). `image (3)` is the **modal**, one depth below the list, which is why neither appears in it. So: **a countdown on a carrier surface is inherited, and disclosing the leading bid *amount* to carriers is an existing, configurable legacy behaviour — not an unprecedented commercial-policy proposal.** What §18 genuinely adds is **rank position** and **percentage gap**. Recorded because the opposite claim would have sent a settled question to Kathleen as if it were new.

**Carrier bid page — in legacy, absent from ours:** the **`Flexible Dates` panel** (the largest functional omission — [[decisions/decision-log|SPB-33]]) · the `Subtotal` line · the fuel-rate annotation `[ 1.44 per mile (minimum 10.00) ]` (we render *"Fuel (precalculated — not editable)"* with no basis shown, and the basis is exactly the TBD our code carries) · the **fixed four-charge catalogue** `Hazmat`/`Pickup`/`Tips`/`Tolls`, where we derive accessorial rows from the shipment's `specialServices` so a carrier can only price what that shipment happens to carry · `Weight`, `Package Count` and the entire `Items` table · a real `Safety Data Sheet` value · a real `Currency` select · and the **two-screen flow** (`Load Detail` → `Enter Quote` → modal), which we merged into one page.

### 17.9 David's three rulings — verbatim (DECIDED)

S114 recorded two. **There are three.**

**Ruling 1 — tab defaulting.** [54:38] *"Well, **that tab should default**. Manuela talked about being able to do that. So if we, if we're in the spot section, then it should default to that tab. But yes."* It lands directly on Kathleen's [54:16] *"from that spot area, **so under the monitoring, that page**"* — so **"the spot section" is the Monitoring spot view**, not our `/spotboard` dashboard. Given §17.7's finding that two surfaces exist, the deep-link seam is obliged from **two** sources, one of which is unbuilt. [[decisions/decision-log|SPB-27]].

**Ruling 2 — four capabilities, at the shipment altitude.** [54:53] *"But the user needs to see **all the carriers invited**, **the current bids**, have the ability to **award a bid early**, and then also go back and see a **history of bids** **when they're looking at a shipment**, right?"* The closing clause is load-bearing: David locates all four at the **shipment** altitude, which is independent confirmation of [[decisions/decision-log|SPB-18]] clause (1). **"History of bids" has a legacy shape and should not be invented** — `MFFCOFL` persists `Status` · `Status Date` · `Username` · `Quoted Cost` · `MFFLCE Tender Status` per carrier, and `Quote Viewer` renders `Response Time` · `Response User` · `Quoted Cost` · `Awarded` per carrier. **History = the per-carrier response record with timestamp and responder identity**, not an event log we author. [[decisions/decision-log|SPB-28]].

**Ruling 3 — a closed quote cannot be reopened. Previously unlogged.** [56:18] *"I remember a long time ago when I looked at ODM quotes, the design was kind of strange and **I want to make sure we don't replicate that**. But **a quote should be specific to the duration that it's open**, right? And **if it closes, then it's closed. You can't reopen it. You can create a new quote**, right?"* Irina deflects on applicability only ([56:41] *"OGM put their quotes to load board, not to overflow board"*) and does not contest the principle; David restates it at [56:55]. **A normative constraint on the re-quote path**, and it bears on the Force Close summary flow Manuela demoed at [36:29] (*"I can have a summary of… and award it, re-send it, or start over"*). [[decisions/decision-log|SPB-29]].

### 17.10 Other findings from the call, load-bearing but outside the above

**(a) The standalone-module-with-its-own-database plan, and where it stands.** Irina, verbatim: *"This data stored in database, **not in linked shipments, it's separate database. A separate model**."* [48:56]; *"we build it is independent. So I can use later another planning system and also connect to the same dashboard."* [42:28]; *"I want to have separate page, separate placeholder."* [20:15]. **Kathleen's response is acquiescence mid-pivot, now timestamped:** [51:33] *"All right, that's fine. Do you want to build that? Okay. Also, what I want to show—"*. **Her own diagram, produced after the call, draws the opposite** — one `Quote stored` node with four readers, not a federated store. This collides with [[decisions/decision-log|SPB-10]]'s *"rebuilt **natively within** OdysseyONE"*, and there is now evidence on both sides. **A diagram is not an architecture ruling and Kathleen is not the architect. This goes to David.** [[decisions/decision-log|SPB-35]].

**(b) A decision taken live that had never been logged: the SpotBoard tab's visibility is conditional on tender state.** Manuela proposed hiding the tab once a tender is accepted [22:04]; **Irina supplied the counter-case and it is correct** — [22:44] *"But tender can decline later and if tender decline after acceptance, you will show that spot board for that shipment"*, [23:05] *"today we do have cases when carrier accept and then call and say he cannot take it."* Manuela accepted [23:33]. Hide-versus-disable was explicitly left to Manuela ([22:16] *"I'm okay either way"*). Consistent with [[decisions/decision-log|SPB-12]]'s reciprocal tender lock. [[decisions/decision-log|SPB-31]].

**(c) Where Irina is demonstrably right — recorded deliberately.** A prior session found one of her claims false, and wholesale-discounting a voice on that basis is its own failure mode. In this call she is correct on: **legacy re-bidding** (§17.6, first-hand, volunteered against her own position — the single most useful factual contribution in the call); **carrier-list provenance** — [29:14] *"this will be list provided based on the **OCM profile**… Which carrier participate for which equipment?"*, matching PRD Feature 1 and `image (1)` exactly; **the tender-decline-after-acceptance case**, which changed a design decision live and correctly (b); **the two-depth portal structure** (§17.4); and **timeline discipline** — [15:20] *"it's August 7th… We have seven weeks"*, the only quantified constraint anyone brings.

**Where she remains wrong, unchanged:** [18:38] *"Manuela, they didn't build anything. Nothing."* — established as false in Session 114 against the code (`panelConfig.js:21`, `ShipmentsRoute.jsx:250`); the images do not rescue it. Note the softer earlier version at [02:14]: *"It's maybe the placeholder, but nothing is built."* And *"This is the board"* proves the **legacy structure** but nothing about what OdysseyONE should build; the two claims slide together in her framing.

**(d) Two questions raised in the call and never answered.**
- [33:02] **Manuela:** *"Once you send the inquiry, do you want to have the others one… that you didn't send the RFQ open. Or not?"* — **can a planner send a second RFQ wave to carriers not in the first?**
- [34:48] **Kathleen:** *"But they can't update it, they'll just be able to view it."* / [34:54] **Irina:** *"Or they can update now."* — **can a planner enter a bid on the carrier's behalf** (phone-in quotes)? It interacts directly with the one-time-submit ruling.

---

## 18. FUTURE SCOPE ONLY — the auction-portal wireframe (new at v1.6)

> # ⚠️ NOTHING IN THIS SECTION IS V1.
>
> **This section describes `Carrier Portal — Spot Quotes (Ideal State, Live Auction).html`, which is phase two.** It is fenced into its own section, after everything else, for one reason: it is the most likely artifact in the dossier to be opened without its label and built. Its own banner reads **`WIREFRAME — v1 for UX` · `Carrier Portal · Spot Quotes · Ideal state with live auction`** — note that *"v1"* there means **the first version of the wireframe**, not V1 of the product. Kathleen's chat caption is unambiguous: *"a wireframe for the carrier portal dashboard, **future state** with auction like bid."*
>
> **The gate is a login, not a date.** [41:44] *"we definitely want to get to that **auction like** view for them, but **until they can log in, I don't think we're going to do that**."* · [51:13] *"They can go sign into the portal if they want… **once we have a portal**. But for now…"* · `image (5)` marks **`Carrier Spotboard — "Authenticated portal, later"`** as the **only** dashed Future-phase node. **This is blocked on the identical user-management dependency as [[decisions/decision-log|SPB-09]] / [[decisions/decision-log|SPB-16]] — not a separate roadmap item. Whatever unblocks the carrier portal unblocks this, and nothing else will.**

### 18.1 What it is

An authenticated, carrier-branded, **cross-load** portal. Top nav `Dashboard` · **`Spot Quotes`** (active) · `My Loads` · `Documents` · `Settings`; user menu `Blue Ridge Carriers Inc.`; breadcrumb `Home / Spot Quotes`. Page sub-copy states the mechanism outright: *"Live bid opportunities matched to your lanes and equipment. **Lower your quote before the window closes to win the load.**"*

- **Four carrier-side stat tiles:** `6 Open opportunities` · `2 You're currently lowest` (green) · `2 You've been outbid` (red) · `2 Closing within 1 hr` (amber).
- **Toolbar:** search *"Search lane, city, or load ID"*; filter chips `All` / `Not quoted` / `You're lowest` / `Outbid` / `Closing soon`; a **`Show lowest bid $`** toggle that reveals a `Lowest: $…` line on every card.
- **Six opportunity cards** (not a table), coloured left border by state, under headers `Lane & Load` · `Equipment` · `Pickup / Delivery` · `Time left` · `Auction status` · `Your quote`. Each carries a countdown (`1h 12m left`, red/amber tinted), a rank badge (`Not lowest · Rank 3 of 6`, `You're lowest · Rank 1 of 4`, `Open · 2 bids so far`, `Open · be the first to bid`), a gap line (*"You're ~6% above the lowest bid"*), a bid meter, and an action — **`Lower my quote`** / **`Update quote`** / **`Submit quote`**. Outbid cards carry an alert strip: *"⚠ You were outbid 8 minutes ago. Lower your quote to retake the lead before the window closes."*
- **Bid drawer:** `All-in rate (USD)` · `Rate type` (`All-in`) · `Available pickup date` · `Equipment offered` · **`Notes to Odyssey (optional)`**, with `Cancel` / `Submit quote`.

### 18.2 It is a different mechanism, not a higher fidelity of the same one

**Today is a sealed-quote RFQ. This is a reverse auction.** That framing matters more than any individual feature, because it is what makes selective borrowing dangerous.

**What it drops from today:** the itemised charge model (`Linehaul`/`Fuel`/`Subtotal`/`Hazmat`/`Pickup`/`Tips`/`Tolls`) collapses to a single **`All-in rate`**; **`Flexible Dates`** with its `Earliest`/`Latest` bounds collapses to one `Available pickup date` with no delivery date and no bounds; **`Decline` disappears entirely**; and **`Quote#` disappears**, replaced by `Load #` as the carrier-visible identifier.

### 18.3 Five things that must not leak into V1

1. **It shows `Load #SP-48213` to the carrier, on every card, in the drawer heading, and in the search placeholder.** Head-on collision with [[decisions/decision-log|SPB-05]] and the PRD's verbatim *"No IDs will be shared for Order/Shipment to protect from carriers 'stealing the load'"*. It may be a quote ID cosmetically labelled *"Load #"*, but it is **labelled `Load #` in the UI**. Both real carrier surfaces (§17.4) correctly show no order or load identifier, so **legacy is on SPB-05's side and this wireframe is the outlier. Do not carry the label forward. Flag to Kathleen.**
2. **Repeat bidding is its central premise** — `Lower my quote`, `Update quote`, the outbid alerts. Exactly the capability the August 7 call **denied for V1** (§17.6) and Kathleen's chat scoped to *"only phase 2"*. Internally consistent with its own future-state label; the single most likely thing to be copied by someone who opens the file without the label.
3. **Rank position and percentage gap** (`Rank 3 of 6`, *"~6% above the lowest bid"*). **Note the precision here** — disclosing the leading-bid *amount* to a carrier is **not** new (the legacy `Best` column under `SHOW_BEST`, §14.5, [[data/quote-model|data/quote-model]] §5.7). **Rank and gap are new**, and they are a competitive-disclosure escalation nobody has sanctioned. Take *those* to Kathleen; do not take her the amount as if it were unprecedented.
4. **A cross-shipment carrier view** — six loads in one list. [[decisions/decision-log|SPB-18]] records this as doubly blocked (user management *and* carrier onboarding) and furthest out, and Irina's *"each shipment will be its own e-mail"* ([[decisions/decision-log|SPB-19]]) is the V1 shape. Directly contradicted for V1.
5. **The nav items `My Loads`, `Documents`, `Settings`** — an entire carrier-portal surface area nobody has scoped. It is closest to **Jana's twelve-screen portal** (§15.5) — but **do not read this as Kathleen conceding to Jana.** She has always wanted the portal *later* ([[decisions/decision-log|SPB-09]], §15). **This is her phase two, drawn.** The §15 contest is about **V1**, and this artifact says nothing about V1.

### 18.4 What it adds that has no counterpart today, for the record

Authenticated multi-load browsing · a cross-load carrier-side list · rank / win-lose signalling / outbid alerts with elapsed time · per-opportunity countdown with urgency tinting · repeat bidding as the core loop · a competitive-price disclosure toggle · carrier-side filtering and KPIs · `Notes to Odyssey` free text · `Rate type` and `Equipment offered` as carrier-selectable bid dimensions. **No counter-offer from Odyssey to the carrier is modelled** — the loop is carrier-lowers-own-bid only.

---

## 19. The 2026-08-17 intake — a reported re-scope its own artifact does not contain, and the carrier portal photographed live (new at v1.7)

### 19.1 Provenance, and the duplicate transcript

Four artifacts, one drop into `00-inbox/`:

| Artifact | What it is | Status |
|---|---|---|
| `Discuss Overflow (spotboard)- Transcript.md` (+ source `.docx`) | Presented as the source of the 2026-08 re-scope | **Byte-identical to the July 28 full transcript already integrated at v1.5** — verified with `cmp` against `vault-sources/10-domains/spotboard/sources/Discuss Overflow (spotboard)-  (1).md` (both 52,248 bytes). Same meeting ID `20260728_143253`, same 47m25s. **Zero new content.** |
| `Main.jpg` · `QuoteDetails.jpg` · `QuoteEntry.jpg` | Live screenshots of the current carrier-facing portal, session `Jachimek, Irina`, APEX app `200` on `t1npe-apex03` (stage) | **Genuinely new** — delivered by Irina on a separate follow-up call with a **verbal walkthrough, 2026-08 (before 08-17)**. No transcript of that call exists; anything attributed to it is cited `(Irina screenshot call, verbal)`. |

### 19.2 The reported re-scope — NOT EVIDENCED, and what the transcript actually says

> **⚠️ Updated 2026-08-18 (v1.8) — the missing artifact has since arrived, and this section's FINDING SURVIVES.** The full **2026-08-11** transcript is now in hand (§20). It confirms there was **no wholesale re-scope**, and refutes the report's Irina claim in her own words [28:42]. What it *adds* is a narrower, genuine scope cut — the internal monitoring board deferred. **Nothing below is retracted; §20 is the current state.**

**The report (secondhand, via Manuela):** the previous SpotBoard concept is dropped altogether except the external bidding landing page; Irina no longer wants SpotBoard as a shipment tab; the new work is "just a redesign" of the current system, and this was *agreed*.

**The artifact supplied as its source is the July 28 meeting, and on the shipment-tab question it says the opposite of the report:**

- **Irina, 14:49–15:05:** *"…that's why it's need to be the separate tab… to that tab or just additional tab because there are different functionality."* — Irina arguing **FOR** a dedicated tab/surface off the shipment.
- **Irina, 35:15:** *"…it seems like you cannot put it everything, everything to the same page, because this is like a little bit different."*
- **Kathleen, 37:01–37:21:** *"I definitely see it as a separate screen… But once you hit the award to the carrier that you selected after the bidding, that's when it goes back to the tendering process."*
- **Kathleen, 36:34 framing (settled, both concur):** *"It's a second tendering process almost… a secondary process, which doesn't have a tender component until you have all the results or until you force close, and then you award."*

**What the transcript DOES settle that matches part of the report — the two-page shape, and the external bidding page:**

- **Irina, 37:39–38:25:** *"we talking about the two pages. We talk about this page, which is actually this board where we monitoring whom we sending those and **we need this bidding page also because we going to build it another C1** [Odyssey One]… **this beginning [bidding] page will be replaced**… new page with… **our same components as… other C1 components**."* — the external carrier bidding page is confirmed scope, rebuilt natively.
- **Carrier access = token link, no sign-in (V1):** Kathleen 38:41 (*"some sort of token as part of the e-mail… temporarily have access to this page"*), Irina 40:10–40:17 (*"No, we don't need to sign in for now… I think we have enough of sign-in options"*). Already logged at [[decisions/decision-log|SPB-09]]/[[decisions/decision-log|SPB-19]].

**Verdict, per this vault's own rules** (secondhand meeting reports are one evidence class below transcripts; the `SPB-16` discipline of never manufacturing a ruling): **no section of this canon is superseded**. [[decisions/decision-log|SPB-18]] clause (1) / [[decisions/decision-log|SPB-25]] (in-shipment SpotBoard tab, V1) **stand**. [[decisions/decision-log|SPB-36]] records the non-decision, and lists what a genuine re-scope artifact *would* touch so the check is fast when it lands. **The single highest-value follow-up of this cycle: obtain the transcript (or dated written note) of the call where the re-scope was allegedly agreed, with attendees.** If the user's recollection is of a call later than 2026-08-07, no artifact from it is in our hands.

> **INFERRED, proposed by nobody:** the report may be a compression of two true things — (a) the July 28 agreement that the *external bidding page* is a page we build natively, and (b) Irina's screenshot-call framing that the carrier-facing work is a redesign of the existing portal (§19.4). Neither implies dropping the internal planner surface. One question to Irina/Kathleen settles it.

### 19.3 The carrier portal, current state — three surfaces, photographed live (SHOWN unless marked)

These extend §17.4 (`image (2)`/`image (3)`, 2026-08-07) with the surface those images lacked: the **entry list**. Known from the PRD's Appendix B only as a caption (§14.5); now photographed with real data. **The current portal is: `Requests For Quote` list → `Load Detail` page → `Quote Entry` modal.** Sidebar nav on every screen: **`Quote Requests`** and **`Quote History`** — history is a first-class nav item in legacy, not an add-on. Footer: `release 1.0`. Field-level detail in [[data/quote-model|data/quote-model]] §9.

**`Main.jpg` — "Requests For Quote" (list).** One row per open RFQ for *this* carrier. Columns: `Load Detail` (icon → detail page) · `Quote#` · `SCAC` · `Shipper` · `Equipment` · `Ship From` / `Ship To` (city-level) · `Intermediate Stop-offs` · `Hazmat` · `Pickup` / `Deliver` · `Quote Opened` / `Quote Closes` (timestamps, CST) · `Your Quote` · `Best` · `Username` · **`HH:MM Remaining`** rendered as a live countdown (`00:44`), sort-defaulted. `Your Quote`/`Best`/`Username` empty pre-bid — corroborates §14.5 and `SHOW_BEST`. A `Reset` button (filters); horizontal scrollbar — the grid overflows even a full-width window *(inferred from pixels)*.

**`QuoteDetails.jpg` — "Load Details for Quote#".** Breadcrumb `Request For Quote / Load Detail`. Header grid: `SCAC` · `Shipper` · `Ship From` / `Ship To` (**full street addresses at this depth** — city-only on the list) · `Pickup` · `Deliver` · `Distance` (mi) · `Weight` (lb) · `Hazmat`. **`Items` table:** `Item` · `Description` · `Weight` · `Package Count` · `Hazmat Code` · `Hazmat Packing Group` · `Hazmat Class` · `Hazmat Description` · `Safety Data Sheet`. An **`Instructions`** free-text section (*"No Instructions."*). One action: **`Enter Quote`**. **No order or shipment identifier anywhere — the `Quote#` is the only key**, corroborating [[decisions/decision-log|SPB-05]] first-hand at a second depth.

**`QuoteEntry.jpg` — "Quote Entry" (modal over Load Detail).** Titled with `Quote# 222621`. **Base Charge:** `Linehaul` (the one number the carrier types) · `Currency` (dropdown, `USD`) · **`Fuel` pre-computed by the system** (`221.00`, annotated *"[0.68 per mile]"* — rate × the 325 mi distance, carrier does not enter it) · `Subtotal`. **Additional Charges:** a fixed table of amount fields — `Haz-Mat` · `Tolls` · `Miscellaneous` · `Tarping` · `Tanker Endorsement` — presumably the profile-driven charge codes of [[data/quote-model|data/quote-model]] §5.5 resolved for this load *(inferred; the walkthrough did not say so)*. Actions: **`Decline`** and **`Submit`** — decline is a peer action inside the entry modal, not a separate flow.

**What this corrects/extends in prior canon:** the "two-depth portal" of [[decisions/decision-log|SPB-32]] is better described as **list + two depths**; the fuel line being *system-computed* is new — our prototype's carrier page treats the bid as a single free amount, which is now a **known divergence in bid anatomy**, not just in dates ([[decisions/decision-log|SPB-33]]).

### 19.4 "Just a redesign of that current system" — Irina's scoping claim

**SAID `(Irina screenshot call, verbal)`:** the new carrier-facing work is a redesign of the portal shown in §19.3. **Direction corroborated** by July 28, 38:01–38:25 (the bidding page *"will be replaced"* with a native OdysseyONE page, *"our same components"*) and by the PRD's *"rebuilt natively within OdysseyONE"* ([[decisions/decision-log|SPB-10]]). **The exclusivity is not corroborated:** "just a redesign" would exclude, at minimum, the token-access model (§8, [[decisions/decision-log|SPB-09]] — legacy portal is credentialed), the V1 one-shot bid ([[decisions/decision-log|SPB-23]] — a deliberate regression from this very portal), and the PRD's delta features. SpotBoard authority = **PRD + Kathleen**; Irina's individual framing does not outrank them without consensus. [[decisions/decision-log|SPB-37]].


## 20. The 2026-08-11 meeting in full — V1 scoped, the boards split, and what we built against half of it (new at v1.8)

### 20.1 Provenance, and what the fragment cost

| | |
|---|---|
| **Artifact** | `Spot Board.md` (858 lines) — MarkItDown conversion of the Teams `.docx` transcript `Spot Board-20260811_114813-Meeting Recording` |
| **Date / length** | **August 11 2026, 3:48 PM · 53m18s** (transcript cues run 0:04 → 49:56) |
| **Attendees** | Kathleen O'Donnell (SpotBoard PM, design authority) · Irina Jachimek (engineering, building it) · Manuela Ramirez (Iris, UX) — **David Johns absent** |
| **Supersedes** | `vault-sources/10-domains/spotboard/sources/spotboard-rescope-call-transcript-PARTIAL.md` — **the same recording**, pasted 2026-08-17 with **1:11 → 46:58 missing**. Identical opening cues (Irina 0:04 *"So, what are we discussing today?"*; Kathleen 0:08 *"Manuela."*) and identical 46:58-onward tail. Prior citations of `47:31` / `47:51` verify unchanged. |

**Why the gap mattered.** [[decisions/decision-log|SPB-39]]/[[decisions/decision-log|SPB-40]]/[[decisions/decision-log|SPB-41]] and roughly 800 lines of production code were written from the tail alone. The tail says *"keep it separately because it's going to be a carrier view"* and *"two different boards, one I crossed out and then we have the carrier board"* — true, and it reads as a mandate. **The missing middle contains Kathleen cutting that same carrier board out of V1 outright** [43:12] **and conceding it back as a *provision*** [45:09]. The direction was right; the **fidelity and the priority were not visible**. That is the single lesson of this cycle and it is why §20.5 exists.

**Structure of the meeting.** 0:00–19:00 Manuela demos the updated internal dashboard; the `Invalidated` status is queried and defined; Irina opens the **row-grain** argument. 19:00–38:00 the long **"redirect to the shipment"** argument, inside which the **standalone-service** architecture is stated in full. 38:00–43:30 Kathleen shares her **workflow diagram**, walks it node by node with Irina, and **enumerates V1**. 43:30–48:30 the **rename**, the **provision concession**, and **one-screen-with-filter**. 48:30–end scheduling.

### 20.2 The settled V1 scope — verbatim, and what it excludes

**Kathleen, [43:12–43:29]** — the only sentence in the entire dossier that enumerates V1:

> *"So all we need from Manuela is the shipment spot port tab? the spot request e-mail, the carrier quote entry, and then the spot quote tab showing where we can award it. **That's all we need right now**, right?"* — Irina [43:29]: *"Oh, okay, yes."*

| # | V1 item | Notes |
|---|---|---|
| 1 | **The in-shipment spot tab** | RFQ setup, carrier selection, send. Reinforced by Irina herself [28:42] and by Kathleen [38:39] *"we know we need our own tab from the shipment."* **Renamed** — §20.3. |
| 2 | **The spot request email** | The tokenized link ([[decisions/decision-log|SPB-09]]/[[decisions/decision-log|SPB-19]]), unchanged. Kathleen [38:46]: *"we send the e-mail with the tokenized link, and then the carrier can enter it in."* |
| 3 | **The carrier quote entry** | The external bid surface. Irina [39:29]: it looks like today's legacy Quote Entry, reached from the email — and is *"exactly like view details of that line item on the board"* ([[decisions/decision-log|SPB-53]]). |
| 4 | **The spot quote tab showing the award** | Kathleen [41:28]: *"This is where the planner goes. This is only internal. The planner goes to that spot quote tab to see who the leading carrier is. And that's where they're going to award."* [42:29]: *"…and then they can go back to the tender and see the award"* — corroborating [[decisions/decision-log|SPB-06]]. Items 1 and 4 may be one tab with two states; nobody separated them. *(INFERRED.)* |
| **+5** | **A *provision* of the carrier board** | Not in the list above. Added minutes later by concession — §20.3. **Lower fidelity, lower priority.** |

**Deferred, explicitly:**

- **The internal cross-shipment monitoring board.** Kathleen [41:52]: *"this internal spot board. **We don't need to build that right now.** Everything can be from the spot tab."* [42:11]: *"Do you agree? Okay, so **we won't build this right now** in this for the sake of time."* [42:20]: *"just going to **put a mark through it** for now."* Irina concurs three times. **But the design is to be kept** — [44:05]: *"But **save that screen** so that we have that when we talk to the business about future functionality."* [[decisions/decision-log|SPB-44]].
- **The planner's grouped/shipment board view.** Kathleen [47:31]: *"when we build for the planner, we'll have a shipment view."*
- **The authenticated carrier portal.** Unchanged ([[decisions/decision-log|SPB-09]], [[decisions/decision-log|SPB-16]], §18). Kathleen [39:46]: the V1 board is *"your **temporary spot board, which nobody can see, until we build authentication**."*
- **A separate internal history surface.** Manuela [44:12]: *"So no history either, right?"* Kathleen [44:21]: *"they can see it just from where they put in the spot… so they would be able to just see the **history on that tab**."* Planner history lands on the spot quote tab.

**The delivery constraint, stated twice.** Irina [36:23]: *"To deliver spot board **by the end of September**, I have to build it as a separate service."* Kathleen [49:04]: *"I'm just getting concerned because we're getting close to the day that Irene is going to need to start building this thing."* Consistent with the *"seven weeks"* she gave on Aug 7.

### 20.3 The two boards, the concession, and the rename

**Kathleen splits the board concept in two and gives each a different fate** [47:51]: *"**two different boards. One I crossed out** and then we have **the carrier board**."*

**The cut, then the concession — both are on the record and the second is consensus.**

1. **CUT** [42:56–43:12]: *"we will in the future build that monitoring board, just that cross view for the planner to see everything. But in the short term, **we don't need to build that carrier view because they're not going to have it. So Manuela doesn't have to work on that.**"* Irina: *"Oh, okay, yes."*
2. **PUSHBACK** — Irina [44:36–44:55]: *"even if you're saying that carrier doesn't see that board today, it's okay, but **planners see that board today in overflow**. So when you're saying it's not needed… **I do want to have at least provision how it's going to look like. That very first screen.**"*
3. **CONCESSION** — Kathleen identifies the screen [45:00] (*"the carrier view… the one that shows **all the SCACs across all the quotes**"* — Irina: *"exactly, yes"*) and rules [45:09]: *"**Alright, Manuela, so add that to the workload.**"*

**Read per this canon's own authority rule:** where Kathleen explicitly concedes, that **is** consensus — so the carrier board is a real commitment. But her word for it is **"provision"**, adopted from Irina, and it sits *outside* and *below* the four-item list. [[decisions/decision-log|SPB-47]].

**Grain of the provisioned board — easy to miss and load-bearing.** It is **multi-SCAC**: *"all the SCACs across all the quotes"* [45:00]; Irina [45:18] *"the one which you have grouped by the SCAC"*; Kathleen [46:22] *"my screenshot shows **two different SCACs**."* It is called "the carrier view" because of its **row grain** (one row per carrier line, legacy-style), not because it is scoped to a single carrier — Irina's model [16:59] is one design filtered per audience: *"I display exactly the same way to the carrier. I just, for this particular carrier, I display only this line and filter all others."* [[decisions/decision-log|SPB-49]].

**One screen, not two** [46:36–47:09]. Legacy splits `Quote Requests` and `Quote History` into two nav items (§19.3); the redesign does not inherit that. Kathleen: *"we should have the same screen, and you can filter by open versus closed"* → Irina: *"we don't have to have two different screens"* → Kathleen: *"**one screen that just shows the status of it's open or closed.**"* Restated to Manuela [48:05]. [[decisions/decision-log|SPB-48]].

**The rename** [43:47]. Kathleen: *"change that from spot board and just put like **spot quote** or something like that for that tab"* — *"because **the spot board is going to be either the board** where they keep what the carrier can see or what the internal user can see in the future."* One word had been naming three surfaces. *"or something like that"* makes the exact string Manuela's to finalise; the **rename itself is decided**. [[decisions/decision-log|SPB-46]].

### 20.4 The standalone quote service — Kathleen's concurrence, and what is still owed

**The architecture, Irina verbatim [40:10–41:28]:** planner clicks **RFQ** on the shipment → *"there will be a service which send this request for RFQ… with the quote number, origin, destination, pounds, whatever is there… **send it to the quote service. Quote service received that. Quote service stores that.**"* → email to carriers → *"carrier provide that quote. That quote **will be stored in the database, in the quote database**. It also will be delivered from the shipment because **we can use API and communicate this information between two different services**."* → *"from my perspective, **stand alone**… we don't have to redirect carrier to the shipment."*

**Kathleen's response is concurrence, twice, and it is not the mid-pivot acquiescence of Aug 7** ([[decisions/decision-log|SPB-35]]). Walking her own workflow diagram, Irina says [38:24] *"Number 3, I agree. Quote stored… on the board. **It's a separate database from my perspective**"*; Kathleen [38:39]: *"**Okay, so we agree on that.**"* After the full statement above, Kathleen [40:07]: *"**Okay, so we agree on all these things right now.**"* And [41:28]: *"**Nobody would send a carrier to the shipment. It just, it's its own spot.**"*

**What is still owed, and one thing that is explicitly parked.** **David Johns owns architecture and was absent**; Kathleen is the design authority for the surface, not the architect — the limit [[decisions/decision-log|SPB-35]] already states. And she declines the *wider* ambition in the same meeting: Irina asks [24:16] whether the service would also carry shipments from OGM/TMS the way today's load board does; Kathleen [24:35]: *"**I don't think we have the capacity to think through that right now.** We just have to build."* So — **separate store: concurred. Multi-system service: parked.** [[decisions/decision-log|SPB-50]].

**Her stated driver is organisational, not technical** — recorded because a constraint-driven architecture ages differently from a designed one. Irina [36:08–37:08]: *"It's very difficult for us to work with the other team right now under the shipments when we very limited what we can and what we cannot do… To deliver spot board by the end of September, I have to build it as a separate service… **I don't want to share for everything, same repository.**"*

**The "redirect" argument (19:00–38:00) is not the deadlock it reads as.** Two settled halves, and the parties were arguing about different things:

- **Carrier side — unanimous, and the strongest first-hand corroboration [[decisions/decision-log|SPB-05]] has.** Irina [32:33]: *"Carrier still sits on the board only. **He doesn't even see the shipment yet, because we don't tell them a carrier shipment number until he telling us that he taking it.** We just tell him here's your possible movement. From A to B, that many pounds."* Kathleen [32:55]: *"His quote — **we're giving him a quote number**."*
- **Planner side — a link, not a landing.** Kathleen [25:15]: *"**Everything is under the shipment. The board is just a shortcut** for the user to be able to see all of the outstanding quotes."* [31:54]: *"you still need visibility for them to **jump right into** that shipment, because once they award it to that person, they may want to go back into the shipment."* Irina's objection, twice stated, is only to the automatic case — [28:42] *"I'm not agreed that when you're entering the quote, you have to redirect user to the shipment"*; [35:47] *"**I all the time against that redirection.**"* The demo behaviour she objected to is Manuela's board row navigating straight into the shipment's spot tab [19:47].

[[decisions/decision-log|SPB-51]].

**The row-grain argument (6:26–18:51) genuinely never converged — recorded, not resolved.** Irina wants one line per SCAC because status is then readable without opening a row [13:00]: *"in the old approach, when I have for each SCAC separate line, **I do see right away status. I don't have to open it**."* Kathleen wants the planner grouped by quote [16:32]: *"I see more value that you're like, okay, **what is the current status of this quote? Not of all the quotes**… There could be 6 lines all for the same exact quote. **What value does that have?**"* Irina's cost objection is never answered [18:36]: *"this is actually one of those places where **we make 2 pages instead of 1**."* Kathleen defers the audience test [18:02]: *"our next audience is to talk with **Arlena and Sadick** and that crew."* Irina [18:51]: *"We can make that decision later."* **What [47:31] settles is only the carrier board's grain**, not the argument. [[decisions/decision-log|SPB-49]].

**`Invalidated`, defined [2:36–5:00].** Kathleen reading the PRD [3:20]: *"it is **an order change or cancellation invalidates an open quote**."* Irina supplies today's mechanic and Kathleen confirms [3:49]: *"if order changed, it's trigger replanning. So **my old quote will be closed and the new quote will be created for the same shipment**… We're **not going to update the quote as is**."* — corroborating [[decisions/decision-log|SPB-29]]. The **label is not locked**: Irina dislikes the word, Kathleen [3:43] *"You could say it because it's canceled or changed. **I guess you can use either of those.**"* And the status is **deliberately temporary** [4:29]: *"I like the visibility of something's changed… **I just don't think we should leave it there for long because it's going to be covered by something else.**"* [[decisions/decision-log|SPB-52]].

**Two design points raised by Manuela and never answered — open.** (a) [5:03] the nested inner table as an alternative to horizontal scrolling — *"What I don't want is the user having to do a lot of horizontal scrolling"* (legacy's own list overflows, §19.3); (b) [5:52] whether the **customer/client filter** belongs on this board at all or is a platform-level control — *"this customer list is very useful for all the domains as well… **So maybe we shouldn't have this at all.**"* Nobody responded to either.

### 20.5 BUILD DELTA — what we shipped against what the meeting says

**Ground truth read from the working tree, 2026-08-18.** `aligned` = the build matches a ruling. `deviation` = the build does something the meeting ruled otherwise. `gap` = the meeting ruled something and the build does not do it. Uncommitted deletions are noted where relevant.

| # | What was built | What the meeting says | Verdict |
|---|---|---|---|
| 1 | **`/spotbid` shipped as a full sidebar domain** — `Sidebar.jsx:14`, `App.jsx:79-81`, `routes/spotbid/SpotBidRoute.jsx` + `SpotBidDetailRoute.jsx` (~800 lines), 12-quote seed store | The carrier board is a **provision** — cut at [43:12] (*"Manuela doesn't have to work on that"*), conceded back at [45:09] (*"add that to the workload"*) at Irina's *"at least provision how it's going to look like"* [44:55]. It sits **below** the four core V1 items [43:29]. Sidebar placement is a **user directive**, mentioned by nobody in the meeting | **deviation — priority inversion.** Direction correct ([[decisions/decision-log|SPB-47]]); fidelity and rank exceed the ruling. Not wrong work; possibly work done ahead of items 1–4 |
| 2 | **Two tabs** — `SpotBidRoute.jsx:154-155` `Tab label="Quote Requests"` / `"Quote History"`, each with its own table and empty state | *"one screen that just shows the status of it's open or closed"* [47:01]; *"we don't have to have two different screens"* [46:58]; *"you should be able to filter by the status, whether it's closed or open"* [48:05] | **deviation** — [[decisions/decision-log|SPB-48]]. Collapse to one list with an `Open` \| `Closed` filter |
| 3 | **Status filter on the History tab only** — `HISTORY_STATUS_PILLS = ['', 'Expired', 'Awarded', 'Cancelled']` (`SpotBidRoute.jsx:28`); the Requests tab has no filter | The ruled filter axis is **`Open` vs `Closed`**, spanning the whole list | **deviation (partial)** — the finer closed outcomes are compatible refinements (*INFERRED*); the missing axis is the open/closed one |
| 4 | **One row per quote; no `SCAC`, no `Username` column** (`SpotBidRoute.jsx:48-102`); `carrierQuotes.js` deliberately does not export SCAC | The provisioned board shows *"**all the SCACs across all the quotes**"* [45:00], *"two different SCACs"* [46:22], grain *"grouped by the SCAC"* [45:18]. Legacy's own list carries `SCAC` and `Username` (§19.3, [[data/quote-model|data/quote-model]] §9.1) | **gap** — [[decisions/decision-log|SPB-49]]. The board built is a single-carrier session view; the board described is multi-SCAC, filtered per audience |
| 5 | **The per-shipment tab still reads `SpotBoard`** — `components/layout/BottomBar.jsx:66` `{ key: 'spot', label: 'SpotBoard' }`; `components/detail/SpotBoardTab.jsx` | *"change that from spot board and just put like **spot quote** or something like that for that tab"* [43:47] | **gap — unimplemented ruling.** [[decisions/decision-log|SPB-46]]. Smallest actionable item in this table |
| 6 | **`routes/SpotBoardDashboard.jsx`, `spotboard/board.js`, `board.test.js`, `dashboard.css` deleted** (staged, uncommitted) | Defer **building**, not the design: *"**save that screen** so that we have that when we talk to the business about future functionality"* [44:05] | **deviation.** Route retirement is correct ([[decisions/decision-log|SPB-44]]); deletion exceeds it. Mitigated by git history, but *"save that screen"* wants a durable artifact (Figma frame or archived screenshot), not a reflog entry |
| 7 | **Two carrier bid surfaces with divergent charge models** — `routes/CarrierBid.jsx` (accessorial rows derived from the shipment's `specialServices`) and `routes/spotbid/SpotBidDetailRoute.jsx` (fixed `CHARGE_NAMES` = Haz-Mat · Tolls · Miscellaneous · Tarping · Tanker Endorsement) | The tokenized email lands the carrier on **the board's own row-detail view** — *"you'll open the e-mail and it's going to look **exactly like view details of that line item on the board**"* [39:29], accepted and built on by Kathleen [39:46] | **deviation** — [[decisions/decision-log|SPB-53]]. One surface intended; two shipped, and only one matches [[decisions/decision-log|SPB-38]]'s photographed anatomy |
| 8 | **The four core V1 items** — (1) `SpotBoardTab.jsx` `Setup & Carriers` + `Live Bids` ✅ · (2) **spot request email** — `RfqLinksPanel` generates token links, no email send ❌ · (3) `CarrierBid.jsx` ✅ · (4) award in `SpotBoardTab.handleAward` → `saveTenderOption` + `award` ✅ | All four are V1 [43:29] | **gap on item 2** — the *"spot request e-mail"* has no send path. Items 1, 3, 4 present |
| 9 | `spotbid/carrierQuotes.js` — a **self-contained store with no link to `spotboard/spotStore`, shipments or SCACs** | The quote service holds its **own database**, talking to Shipments by API [40:10–41:28]; Kathleen concurs [38:39, 40:07] | **aligned** (incidentally — it was built for seed convenience, and it happens to model the ruled architecture) |
| 10 | Neither carrier surface shows an order or shipment identifier; `SpotBidDetailRoute` breadcrumbs `SpotBid / Quote# NNNNNN` | *"He doesn't even see the shipment yet… we're giving him a quote number"* [32:33, 32:55] | **aligned** — [[decisions/decision-log|SPB-05]]/[[decisions/decision-log|SPB-51]] |
| 11 | Bid anatomy in `SpotBidDetailRoute`: `Linehaul` the only typed number, read-only `Fuel [$X per mile]`, computed Subtotal, five charge rows, `Decline` + `Submit` as peers | Matches the photographed legacy `Quote Entry` ([[decisions/decision-log|SPB-38]]); the meeting does not revisit it | **aligned** |
| 12 | Inline quote entry, no modal (`SpotBidDetailRoute`) | The meeting **does not rule on this**; it is a user ruling ([[decisions/decision-log|SPB-40]]) | **aligned** — presentation is ours; nothing in the transcript contradicts it |
| 13 | `closedOutcome` vocabulary `Expired` \| `Awarded` \| `Cancelled` — no `Invalidated` | Kathleen sanctions the alternative label explicitly: *"you can use either of those"* [3:43] | **aligned** — permitted by [[decisions/decision-log|SPB-52]]. The *mechanic* (close-old + create-new) is unmodelled, but nothing in V1 needs it yet |
| 14 | No date affordance on either bid surface | The meeting is silent; legacy has `Flexible Dates` | **gap (pre-existing, unchanged)** — [[decisions/decision-log|SPB-33]] still unruled |
| 15 | `Best` column shipped on the carrier list | Legacy has it under the `SHOW_BEST` per-client profile ([[data/quote-model|data/quote-model]] §5.7); the meeting does not discuss it | **open, not a deviation** — the plan already flags `Best` visibility as an open item |

**Ranked, actionable:** rows **5** (rename — trivial), **2/3** (one screen + open/closed filter), **8** (the spot request email is a *core* V1 item with no send path), **4** (SCAC/Username grain), **7** (two divergent carrier bid surfaces), **6** (preserve the deferred board's design properly).

### 20.6 Keep / supersede verdicts on prior sections

| Section | Verdict |
|---|---|
| **§19.1–§19.2** (the reported re-scope) | **KEEP, finding confirmed.** The missing artifact is found; no wholesale re-scope existed. Pointer added in place. |
| **§13.1** (MVP scope boundary, from the PRD) | **SUPERSEDED IN PART.** §20.2 is later, PM-spoken, and more specific about what *this build* must contain. The PRD's boundary still governs everything §20.2 does not name. |
| **§3 / §6** (the in-shipment tab) | **KEEP, reinforced a fourth time** — and this time by Irina. Its **name** changes (§20.3). |
| **§17.7** (placement, `Monitoring spot view` vs `Internal Spot Board`) | **KEEP.** The Aug 11 meeting kills the `Internal Spot Board` for V1 but **never mentions the `Monitoring spot view`**; [[decisions/decision-log|SPB-26]]'s unscoped third surface is untouched. |
| **§7 / [[data/quote-model\|data/quote-model]] §3.3** (status vocabularies) | **EXTENDED.** `Invalidated` gains a human definition, a sanctioned alternative label, and a stated expiry. |
| **§9** (conflicts) | **HALF-RESOLVED on grain** (carrier board only); the planner-side grain conflict and the two-grids cost objection remain open. |
| **§15 / §8** (carrier access) | **UNTOUCHED.** Nothing moved; Thomas still absent from every artifact. |
| **§18** (auction portal, future scope) | **UNTOUCHED.** Still fenced. |
| **§14 / §19.3** (legacy screens) | **KEEP as current-state evidence** — with one explicit non-inheritance: legacy's two-nav-item `Quote Requests` / `Quote History` split is **ruled against** for the redesign (§20.3). |

---

## 21. The 2026-08-18 bidding-process call, Kathleen's written answers, and the send lifecycle photographed (new at v1.9)

**Why this section exists.** Every prior cycle documented *surfaces* — screens, placement, scope. This one documents the **process mechanics the carrier bid page runs on**: which charges appear and why, who computes fuel, whether the quote's equipment is the shipment's, what a date on a quote actually carries, and what Send does. The evidence is triangulated — a 1h02m call, six written PM answers with screenshots, and a live before/after screenshot pair — and **no single layer is elevated**; where they tension, the tension is recorded (§21.5 is the worked case).

### 21.1 Provenance, and what Irina's images turned out to be

The call (`Aug 18 call`) is Manuela driving her prototype while Kathleen and Irina supply the domain and Alexey Soroka — **HiTech's UI developer for the carrier bid page** [5:15] — supplies the engineering questions. It opens by reconfirming placement: *"we are moving the decision to have a spot bid tab inside shipments"* [0:40]; Kathleen: *"**we had always had that tab envisioned**"* [0:57] — [[decisions/decision-log|SPB-45]]/[[decisions/decision-log|SPB-25]] reinforced yet again, and Irina restates the day-one need as the **email-token carrier bidding screen**: *"Carrier based on the token without looking supposed to enter bidding information. So bidding screen itself… needed. Day one."* [1:49].

**Irina's two screenshots are not two screens — they are one quote, twice.** Both show `MFFCOFL` on shipment `O31433264` (`*G20TECH_SYS_01`, `LTL`, `REQUESTED DELIVERY 08/26/2026 18:00 EST`), quote `222625`, `Duration 60` minutes, four carriers (`ARVY` · `FFAJ` · `KCNT` · `TQYL`). `IrinaImage1` is **pre-send**: `Quote Opened`/`Quote Expires` empty, no per-carrier statuses. `IrinaImage2` is **post-send**: header `Status OPEN`, `Quote Opened 18-AUG-2026 11:00 CST`, `Quote Expires 18-AUG-2026 12:00 CST` — exactly the 60-minute Duration — and the two columns Irina narrates at [30:20]: per-carrier `Status` (`Sent` for `ARVY`; **`No Distribution`** for the three carriers with no email on file) and `Status Date`. §21.6.

**New actors, recorded here rather than rewriting §11:** **Alexey Soroka** (HiTech — carrier bid page UI; receives the component handoff [59:42–1:00:14]); **Dmitry Miterev** and **Yury** (HiTech — the planner-side bid-initiation page [58:08]); **Laura Blandon** (Iris — named for later display refinement [33:09]). Irina remains the engineering lead brokering all three.

### 21.2 Additional charges — from "driven by the equipment" to the OCM profile (DECIDED)

The live exchange [6:17–10:08]: Irina objects that the prototype shows *"only two charges"* when *"right now we have more than two"* [6:17]; the missing set is named — *"hazmat, tolls, miscellaneous, tarping, tanker endorsement"* [8:09] (the same five [[decisions/decision-log|SPB-38]] photographed). Alexey asks for the **logic**: *"maybe for some carriers we do not need some fields… we don't have currently any logic behind it"* [8:20], and — on the record — *"we have nothing at that moment. **We do not have any stories that would cover the logic behind these fields**"* [8:50]. Kathleen's in-call answer: tarping ↔ flat bed, tanker endorsement ↔ tank truck; *"It depends on the equipment"* [9:11]; *"**But it's just driven by the equipment**"* [10:08].

**Kathleen written answer #1 (2026-08-19) supersedes-by-refinement:** *"the charges shown in the 'additional charges' section is **controlled by an OCM profile**"* — with `Kathleen1.png` showing the mechanism: the `MFFOCM` grid of `Carrier Overflow` / `COFL Charges` profiles per **owning organization**, and the `MFFOOCC` modal (*"Maintain OCM Overflow Carrier Charges"*) whose header carries `Equipment: FB FLAT BED` and whose body lists the ordered charge rows. **The two statements are consistent — equipment matters *through* the profile**, because the profile is keyed by org × equipment. What the answer kills is a **static catalog**: the five codes our bid surfaces hardcode are *one profile's snapshot* (and §5.6's PRD list was another's). [[decisions/decision-log|SPB-55]]; structure in [[data/ocm-profile-charges|data/ocm-profile-charges]].

**A code-level variance, recorded not resolved:** `Kathleen1.png` (org `MPM_SYS_01`) reads `HZC` · `TKM` · **`IHT`** · `TAR` · **`MSG`**, where [[data/quote-model|data/quote-model]] §5.6 (PRD p.33, read visually) recorded **`HT`** and **`MSC`**. Same screen, different profile — either genuine per-profile code variance or a raster-read error in one of the two passes. Both reads stand as written until a text export settles it.

**Still open, and Alexey owns the ask:** the mandatory-field map and cross-field dependencies [17:04–17:22], state designs for the bid page (*"closed… cancelled… active"* [17:55]), and the **story** describing the field logic with named components — Kathleen + Manuela, agreed at [1:00:24–1:01:39]. Two in-call anchors that survive regardless of profile: **base/linehaul is mandatory** (Irina [12:56]; Kathleen [16:11] *"Make sure you put line haul as required"* — *"For the bid part"* [16:22]) — consistent with [[decisions/decision-log|SPB-38]].

### 21.3 Fuel — precalculated, displayed, not editable (DECIDED)

Manuela raises it live: *"should we expose this pricing to the bidder? The fuel price?"* [14:03]. Irina: *"we do it's visible right now for the carrier… It's kind of estimated"* [14:28–14:35]; the room lands on *"show estimated fuel instead of recalculate"* [~15:00]. Irina also places the formula's home: today it lives in legacy TMS, tomorrow in the spot service's own master data [12:58–13:16] — consistent with [[decisions/decision-log|SPB-50]]'s standalone store. **Kathleen written answer #2 closes it:** *"Fuel is precalculated and displayed on the bid for the carrier to view. **This is not editable by the carrier.**"* Upgrades [[decisions/decision-log|SPB-38]]'s photographed anatomy from observed-legacy to ruled-for-the-redesign. The shipped **disabled `Fuel (Estimated)` field on `/spot-bid/:token` is aligned**, label included. [[decisions/decision-log|SPB-56]].

### 21.4 Equipment for the quote — changeable by the planner; the shipment never mutates (DECIDED)

The call's long exchange [20:54–26:52]: Irina — the quote's equipment can differ from the shipment's seed equipment (*"we have a flat bed, truck load, tank truck for bidding… different type of equipment that the seed equipment for the shipment"* [20:54]); Kathleen — *"they can change it if they want"* [22:09], *"if it was LTL, they can switch it to truckload to get a truckload carrier"* [23:03]; Irina's constraint — *"**We cannot change the equipment of the shipment**… we select for which equipment we changing this shipment for bidding… **the original shipment stay with the original mode**"* [24:12–25:36]. Kathleen flags that OdysseyOne's consolidation model may loosen the shipment side [26:15]; and the room separates **mode ≠ equipment** explicitly [26:39–26:52] — Jana's shipment-details mode change ([25:36–25:58]) is a *Shipments* capability, not this one.

**Kathleen written answer #3 settles it:** *"Today the planner can change it, **although they rarely do**"* — with `Kathleen3.png` showing the mechanism: `MFFCOFL`'s **`Overflow Seed Equipment`** chooser, one row per equipment (`EXP` · `FB` · `TL` · `TLH` · `TLR` · `TT`) each carrying its own `Ocmid`/`Oocid` — i.e. **choosing the equipment chooses the OCM profile pair**, which is what wires §21.2's charge list to this choice. And Irina's own screenshots are a live exhibit: shipment `Equip LTL`, quote equipment `FB Flat Bed`. [[decisions/decision-log|SPB-57]].

### 21.5 Dates and the time question — a ruling and a tension, kept apart (DECIDED + TENSION)

**Dates are pre-filled**: *"That comes from TMS OCM profiles"* (Kathleen [20:08]), inheriting from the shipment's planned pickup/delivery [20:27–20:53]. **Kathleen written answer #5 rules: "time is not supported on the quote."** **Kathleen written answer #6 gives the window mechanism:** *"Flexible pickup and delivery is **configurable by CLIENT and by Equipment**… The OCM setting is configurable by the **number of days** permitted before the requested pickup and delivery dates"* — 23 flexible-pickup and 23 flexible-delivery configs exist, **9 clients active**, one allowing an **8-day** variance. That is the configuration engine behind the `Earliest`/`Latest` window [[decisions/decision-log|SPB-13]] described. [[decisions/decision-log|SPB-59]], [[decisions/decision-log|SPB-60]].

**⚠️ The tension — recorded, deliberately unresolved.** The same answer #5 attaches `Kathleen5.png`, *"the field names in OdysseyOne"*: **Earliest/Latest Pickup Date and Time** and **Earliest/Latest Delivery Date and Time**, each with a Date input *and a Time input*, Latest Pickup marked required (`*`). A screen with Time widgets, cited by the person ruling that time is unsupported. Irina's legacy screenshots deepen it: the `MFFCOFL` carrier grid carries full **datetimes** (`26-Aug-2026 10:00 cst`). **Likely reading — INFERENCE, ours, flagged as such:** the OdysseyOne fields in `Kathleen5.png` are the **shipment/RFQ side**, which carries time; the **carrier's quote** — what the carrier submits back — does not. Nobody has said this. Until someone does, the shipped **TimePickers on the carrier bid page are suspect** (§21.9 row C), and the question goes to Kathleen verbatim: *do the quote's date fields carry a time component anywhere the carrier touches?*

### 21.6 The send lifecycle — `Sent`, `No Distribution`, and Duration-driven expiry (SHOWN + SAID)

Send is confirmed by dialog [29:08]; what it does is photographed (§21.1) and narrated by Irina [30:20–30:39]: *"there is already the status… **status sent only for the first carrier because the other three carriers, I do not have e-mail for them. So I have no distribution**… And I have the date when I initiate this bid… on the top that status for this bid is **open** and **duration**."* So Send atomically: opens the quote (`Status OPEN`), stamps `Quote Opened`, derives `Quote Expires` = opened + Duration, and writes a per-carrier **distribution outcome** — **`Sent`** or **`No Distribution`** — plus `Status Date`. **`No Distribution` is a status value no prior vocabulary carried** (§7's legacy per-carrier set was `Sent` · `Excluded` · `Done` · `Declined` · `Accepted`): it is the *system couldn't reach them* value, distinct in kind from [[decisions/decision-log|SPB-17]]'s *they chose not to answer* (`No Bid Submitted`). Do not collapse the two. [[decisions/decision-log|SPB-61]]. Also SAID in the same passage: the selection grid shows per-carrier **`Transit`** and **`Distance`** [27:10–27:51] — photographed (`6.5 hr` / `325 mi`), corroborating [[data/quote-model|data/quote-model]] §1.2.

**Asked and NOT answered — open:** can a carrier be **added to a live bid** after send, or must the bidding finish first? Manuela poses it twice [29:14–30:00]; Irina redirects to the screenshots and no one returns to it.

### 21.7 The live-bids display and the award interaction (DECIDED)

**Display.** Irina's users are *"Excel driven"* and want everything in the grid without opening rows [32:24–33:09]. Kathleen's resolution [33:47]: *"just **put the total on the top line and then just not open it by default**. And then they can open it if they want to see the breakdown."* Irina [34:05]: *"**that's what it is today.** They do have, they do preview total. They have to click additional button to see breakdown."* Consensus. [[decisions/decision-log|SPB-62]].

**Award.** The order of operations is restated hard: *"You have to **close the bid to be capable to award it**"* (Irina [34:52–35:14]), by expiry or manual **force close** [39:43–40:02]; *"You cannot award more than one"* (Kathleen [36:08], Irina concurring); on close, non-winners are notified / see closed at the link (Irina [42:54–43:07]; Alexey adds the concurrency guard — submit re-checks the bid is still active [41:57]). Kathleen proposes collapsing the two-step: *"you can avoid [it] if you just do **award in tender** from here"* [37:59]; Irina: *"you probably can do award and tender"* [38:31]. Manuela's staging idea — selection as a **visual cue** that doesn't tender — survives Irina's cross-examination (*"It's just going to deselect it… like a radio button"* [48:02–48:19]) and Kathleen lands it [49:52–50:45]: *"So you're going to **change the award to a radio button**… you select that one, and then you come to the bottom and say **award and tender**."* Two recorded cautions: **auto-tender + auto-accept carriers** (Irina's FedEx example [48:34]) make mis-selection expensive downstream, and a **pending tender must be cancelled before re-awarding** [50:45–51:17]. [[decisions/decision-log|SPB-63]].

**After the award — the tender flow is a different channel.** Acceptance/decline is *"a new e-mail or new EDI message"* [55:36–55:56], *"just the way that tender works today"* (Kathleen [55:56]); carriers may also phone the planner, who acts on their behalf [53:02]. **It never happens on the bidding email** [53:21–53:32]. If the awarded carrier declines: award the **next existing bidder** — *"bidding is not open yet"* [57:14] — or, if no options remain or the prices displease, **reopen = a NEW bid, totally new number**; *"this ticket is gone"* (Irina [51:49–52:00]) — first-hand corroboration of [[decisions/decision-log|SPB-29]]/[[decisions/decision-log|SPB-52]]'s close-old-create-new mechanic.

### 21.8 The dormant rate-API path, and the board pressure that changes nothing

**Kathleen written answer #4:** *"TMS has the ability to set up carrier to send/receive quotes via API, but currently **no carriers with a rate API participate in overflow**. Path must still be supported, but is dormant today."* An integration seam the redesign must not design away — but not a V1 surface. [[decisions/decision-log|SPB-58]].

**The board argument recurs and moves nothing.** Irina, three times [6:31, 7:20–7:52, 58:28–59:23]: the board must exist, *"even for testing purposes… It will be difficult even to test without this board."* Kathleen's answer stands where SPB-47 left it: *"You can see it in the live bid, but you see it across all the carriers"* [59:23]. **Provision-only, unchanged.** Scope discipline is also spoken by Manuela in-call: the board *"is not part of our scope right now"* [6:53–7:20].

### 21.9 BUILD DELTA addendum — where the new rulings touch shipped code

Extends §20.5 (ground truth 2026-08-18); shipped state cited from that table and this cycle's brief, **not re-verified in code this pass**.

| # | Shipped state | New ruling | Verdict |
|---|---|---|---|
| A | `/spot-bid/:token` has a **disabled `Fuel (Estimated)` field** | Answer #2: precalculated, displayed, not editable; "estimated" framing from [14:42] | **aligned** — [[decisions/decision-log|SPB-56]] |
| B | Editable Additional Charges grid seeded from the **static 5-code catalog** (§5.6 / `CHARGE_NAMES`) | Answer #1: the list is resolved from the **`COFL Charges` OCM profile per org × equipment** (`MFFOOCC`) | **deviation-in-model** — [[decisions/decision-log|SPB-55]]. The five codes are one profile's snapshot; the seam must be profile-resolved, and the field-logic story is still unwritten [8:50] |
| C | **DatePicker + TimePicker** fields on the bid page | Answer #5: *"time is not supported on the quote"* — against `Kathleen5.png`'s Time inputs (§21.5 tension) | **suspect** — [[decisions/decision-log|SPB-59]]. Do not rip out until the shipment-vs-quote reading is confirmed with Kathleen |
| D | No rate-API seam anywhere | Answer #4: dormant path, must remain supportable | **note, not a V1 gap** — [[decisions/decision-log|SPB-58]] |
| E | No equipment-change affordance for the quote | Answer #3 + `Kathleen3.png`: planner can change quote equipment; choosing equipment selects the OCM pair | **gap (low priority** — *"they rarely do"*) — [[decisions/decision-log|SPB-57]] |
| F | Per-carrier distribution status (`Sent` / `No Distribution` + `Status Date`) unmodelled | Photographed post-send state; narrated [30:20] | **gap** — [[decisions/decision-log|SPB-61]] |
| G | Live-bids breakdown display | Total on top line, **collapsed by default**, expandable [33:47–34:16] | **ruling now exists — verify build against it** — [[decisions/decision-log|SPB-62]] |
| H | Award action shape | Radio-style selection after close + single **Award and Tender** action [49:52–50:45] | **ruling now exists — verify build against it** — [[decisions/decision-log|SPB-63]] |

---

## See also

- [[_moc|SpotBoard — Map of Content]]
- [[decisions/decision-log|SpotBoard — Decision Log]]
- [[data/quote-model|Quote Data Model, States & Notification Catalog]] — field-level schema, state machines, eligibility rules, configuration surface, email catalog
- [[data/ocm-profile-charges|OCM Profile → Charges, Equipment & Flexible Windows]] — the `MFFOCM`/`MFFOOCC` structure behind the additional-charges list, the seed-equipment→profile linkage, and the flexible pickup/delivery day-variance config (new at v1.9)
- [[../shipments/domain-analysis|Shipments — Domain Analysis]] (§3 Tendering, §4 Spot Bidding / Overflow)
- [[../shipments/decisions/decision-log|Shipments — Decision Log]]
- [[../carriers/_moc|Carriers domain]]

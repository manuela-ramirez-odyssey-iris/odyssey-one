# Odyssey Shipments Domain — Progress

> **Note:** Sessions ≤81 are condensed to one-line summaries. Full narratives archived at `vault/99-archive/progress-full-archive-2026-07-14.md` (and in git history). Component detail lives in `playground/normalization-tracker.md` + the DSM route + vault decision logs.

## Session 110 — August 5, 2026

**THE FILTERS-REDESIGN + DATA-COHERENCE SESSION — Save Filters taken from an approved spec to fully shipped across FOUR phases and then redesigned TWICE more on user direction; the whole gated DB motion executed end to end (2 migrations, 2 reseeds, 3 prod deploys); and, after I declared it "not a bug" three separate times, the real cause of the empty columns found in a whitelist mapper that had been silently discarding fields for months.** Tests app+ui **834 → 974**. Migration 006 + 007, both additive. Three deploys, all verified live.

- **Save Filters shipped end to end, Phases 0–3.** Phase 0 closed the two library gates the S109 log had wrongly recorded as done — `MenuRowRadio`'s badge existed in Figma and **nowhere in React**; only `draggable` had landed. Then personal filters (hosted in the always-mounted `ShipmentsGlobalSearch`, every write pairing `save()` with `setQueryData` or it vanishes on reopen), the Odyssey defaults group, the `shared_filters` API + mock equivalent, and the drag-to-share UI with author badges. **All five Opus blockers from S109 held up** — the `translateX(-50%)` containing-block trap was verified real, and the `{commit, replace}` flattening was confirmed in code before being bypassed via a dedicated `onApplySaved`.
- **The filters panel was then redesigned twice, and the second reversed five things from the first.** Rev 1 (profile flow): tabs `Saved · All`, row body opens the editor, tab renamed to the profile. Rev 2 (two modes, user direction same day): back to `All · Saved`, **both row zones select**, entering the editor is an explicit ⋮ → **Edit Filters**, the **header** renames instead of the tab, and edit mode is **decoupled from the bar** — nothing reaches the search until `Update Filter`, which then persists *and* applies. Recorded as **GS-29** with every reversal named, so the churn is traceable rather than confusing later. Per-row copy added as **GS-28**, explicitly superseding GS-26's "not a per-row action" ruling from the same morning rather than quietly rewriting it.
- **The empty-columns bug: I was wrong three times, and the cause was a hop I never checked.** Pickup #, Shipment Type and Planning Type showed `—` all session. I verified the DB, the API projection, the renderers and the column list — each green — and concluded "not a bug, just not default-visible." Two gates were real (`DEFAULT_COLUMNS`, plus a **saved preset that overrides the defaults wholesale** on hydrate), but the actual cause was **`mapShipmentErrorRow`, a whitelist mapper that builds a new object with 23 named fields and silently drops everything else**. It is why **Pickup # never once worked** despite months in the column picker. The lesson, now a guard test: *verifying the data exists somewhere is not verifying it reaches the cell* — my own earlier test passed precisely because it hand-built a row and skipped the mapper.
- **The DB motion executed, and the documented reseed ritual turned out to be destructive.** `user_preferences` **and** `shared_filters` both reference `users(id) ON DELETE CASCADE`, while `seed.mjs` is INSERT-only and always assumed `--reset` had dropped the schema first — so "reseeding the documented way" would have cascade-deleted every saved filter and column preset, *including the ones the motion existed to support*. `seed.mjs` gained `--reseed` (truncates only the ten tables it owns, **preserves `users`**); the old ritual is marked destructive in its header. Both reseeds verified preferences survived.
- **Seeded data must be COHERENT — a ruling that reframed the linkage triplet** (memory `feedback_seeded_data_must_be_coherent`). *"We are using the word 'fake data' only because this probably is not going be the final product, but it needs to be nearly real."* I had been treating the multi-leg triplet as blocked on Jana; it was only ever blocked on doing the work properly. Chains are now **derived from real topology**: ~200 chains (2 and 3 legs), and **every invariant verified against the live DB at zero violations** — leg N's destination equals leg N+1's origin, same customer, time moves forward, sequence dense, exactly one null terminator per chain, no stray fields on single-leg rows. Notes reverted from my own over-correction (all 10,000 had notes) to a realistic **65% none / 25% one-two / 10% three-plus**.
- **Orders: two bugs fixed, one of them silent data loss.** The appointment flag un-checked itself after an order loaded — a guard meant to protect hydrated values was spent at mount, before the async `reset()` arrived, so re-saving would overwrite `Y` with `N`. Editing itself was never broken (verified: production runs live against Neon and the sampled edits persisted). View Order simply never rendered the flag. Both were already logged as R2-6/R2-7 and classified code-only; the trace confirmed that and found the mechanism.
- **Three of my own errors worth recording.** (1) The Odyssey default filters returned zero because I verified them against the **client** progression and the **mock** adapter while `.env.local` runs **live** — a smaller server-side registry that contains neither `mode` nor `tender-status`; GS-27 corrected, and the dual-vocabulary rule is now a test. (2) I twice reported data broken when my own query used the wrong key (`sell` vs `buy`, `sequenceLeg` vs `shipmentSequenceLeg`) — the second of which *did* surface a real mock-vs-live naming split, now fixed. (3) I invented a filter-count use for the badge to make it visible while sharing was blocked, when the user's design had always been the author badge; removed in rev 2.
- **Deliverables:** specs `2026-08-05-filters-profile-flow.md` (rev 1) + `2026-08-05-filters-two-modes.md` (rev 2, approved) · migrations `006_s108_fields.sql`, `007_multileg_chains.sql` · decisions **GS-24…GS-29** · `questions-for-jana-2026-08-05.md` · `GlobalSearchPanel` 0.6.2 (`primaryDisabled` + `linkDisabled`, both pass-throughs of `Button`'s own state per user ruling) · `MenuRowRadio` 0.4.2 approved + Code Connect republished (73 mappings).
- **Carry-forwards / open:** **filters UX improvements — the user's chosen start for next session** · **browser pass still owed** (drag works now, but the discard-confirm, rename cursor, modal position, group divider and per-row copy are all unproven — jsdom cannot model any of them) · **Angular catch-up, 6 components** (`DataTable`, `CalendarPicker`, `GlobalSearchPanel`, `GlobalSearch`, `MenuRowRadio`, `SummaryStrip`) · **audit the other whitelist mappers** (`mapSellShipmentOutToDetail`, `mapOrderListRow`, `mapOrderViewToFormVm` — same shape, and the Orders appointment bug was the same class) · `mode`/`tender-status` still unprojected, so enum chips and enum-based defaults remain impossible · **Jana: accuracy only, nothing blocking** — RDD/SSD ratio (~35/65 shipped), PO coverage (~60%), ratification of the two invented Odyssey defaults, and the **two different fields both named "Shipment Type"** (resolved by my own fiat as Shipment Type = Direct/Consolidation, Leg Type = Pooling/Rule 11) · **Cross customer** deliberately ungenerated — canon says Odyssey doesn't do cross-customer consolidation yet, and representing it needs the Q6 data-model call on which customer displays · Distance/Stops/Preferred AP-AR/Source ID never audited.

---

## Session 109 — August 4, 2026

**THE SAVE-FILTERS DESIGN SESSION — two user-found fixes root-caused and shipped, then Save Filters taken from a Figma link to an approved 4-revision spec + phased plan, with an Opus adversarial review that found FIVE blockers before a line was written, two Figma-first component changes landed, and the whole Neon question settled by MEASURING the live database instead of inferring from commit dates — which proved a confident "stale seed" diagnosis wrong.** Tests: app+ui **830 → 834**. No DB touched (read-only probe only), nothing deployed. Three Jira-canon findings reframed what we thought Shipment Type and Pickup # were.

- **Two fixes, both root-caused deeper than the report.** (1) **The DataTable Spinner overlapped the header** — not a z-index bug: the overlay was `inset: 0` on the *card*, and because `loading` suppresses every row, the card collapsed to roughly header height, parking the spinner on top of it. Fixed structurally (overlay is now a child of the **body**, sibling of the head, with a `min-height` so it centers with zero rows) — no JS measurement. (2) **An empty bar now suggests nothing** — a deliberate **reversal of the user's own S106 date carve-out** ("Type or Filter by date" confused users), logged as **GS-23** rather than rewriting GS-22's history; typed date suggestions, "Define set type" and drill-forward all untouched.
- **Save Filters specced through four revisions, each driven by new information.** rev 1 from the two Figma frames (`1079:31179` save modal, `1079:31240` saved rows) + component mapping, since *"those figmas do not have our components — it's your job to figure out which to use"*; rev 2 folded in the Opus review; rev 3 added the **preset groups mirroring column arrangement** (⋮ → Edit Name puts the cursor in the selected row, batch Delete mode, **Custom Filters** / **Odyssey Filters**); rev 4 turned the Odyssey group into the **shared** group — drag a custom filter in to share it, editable/deletable/movable **by its author only**, with `by: <username>` on the row.
- **The Opus review earned its keep: 5 blockers, four collapsing into ONE structural fix.** Hosting the modal inside the Filters view would have broken it three ways at once — `.shipments-results-panel` has `transform: translateX(-50%)`, making it the containing block for `position: fixed`, so `ModalMedium`'s overlay would size to the *panel*, trapped under `z-index: 49`; the bar's wrapper `onKeyDown` **commits the search on Enter in any INPUT**, so naming a filter and pressing Enter would tear the modal down; and the Filters view unmounts on every close while `useUserPreference` is `staleTime: Infinity` with a fire-and-forget `save()`, so **a just-saved filter would vanish on reopen**. All fixed by hosting modal + state in the always-mounted `ShipmentsGlobalSearch`. The fifth blocker killed my own storage rationale: routing saved chips back through `{commit, replace}` runs them via `chipsToFilters` → `mergeFiltersIntoChips`, which only emits attribute/date chips — **flattening set chips and losing `codes`/`typeLabel`**, the exact loss chip-object storage exists to prevent. Now a dedicated `onApplySaved(chips)` → `applyChips` wholesale. It also **refuted** a spec risk (SearchChip needs no `readOnly` prop — pass `label` as a string and it renders a plain span + X) and found the `chips.length > prev.chipCount` re-open bug **already live** on the All tab.
- **Two Figma-first component changes, built and screenshot-verified.** `MenuRowRadio` gained **`Draggable#4921:0`** (grip cloned from MenuRowCheckbox's canon grip so fills/size match, placed LEADING since the chevron owns the trailing slot) and **`Show Badge#4930:0`** (a real `Badge` `Shape=Pill/gray` instance, `isExposedInstance`, before the chevron) — both default **false**, all 5 variants, then React + Code Connect + tests + DSM demo + `dsm-flags --demote` + version bumps. `GlobalSearch` (`658:18`) gained a **`Copy Search Icon`** before the clear X in Default + Focused (`State=Title` has no search input — correctly skipped). **Copy = clipboard of the applied query**, a general bar affordance deliberately NOT a per-row action: *"that would mean an exclusivity feature"* (user).
- **A correction I made against myself.** I first claimed the copy button could skip the Figma gate under the GlobalSearch v1 no-normalize exemption. Checking the memory instead of trusting recall showed the exemption covers only the **new search-experience atoms** and explicitly **not** `GlobalSearch.jsx`, which is fully normalized, Code Connect mapped and Angular-ported. It became a third Figma-first gate.
- **The DB question answered by measurement, not inference — and the inference was wrong.** A subagent concluded (medium confidence, honestly flagged) that empty Notes and Pickup # meant a **stale seed predating the 2026-07-06 commits**. That contradicted our own S105 log, so I probed the live DB read-only: **10,000 shipments / 23,992 orders / 162,818 search_index / 7,749 shipments WITH pickup numbers / 8,331 with notes / 10,000 with documents+history / 13 usernames**. The DB is current. **Pickup # was never a seed gap** — the column is simply not default-visible, per the user's own 2026-08-02 ruling. Real gaps: `noteCount` min `0` legitimately leaves **1,669** shipments with an empty Notes tab; history actors come from an invented list where **only "David Johns" matches a seeded user**; today's system-actor `source` is in **0** rows.
- **Jira reframed three fields.** **Shipment Type is real and ours was wrong** — `generate.mjs` hardcodes `shipmentType: 'sell'` (the buy/sell *side*), while **LINX-11597** (Story 7/7, in QA Testing) defines `Direct` (one order) / `Consolidation` (>1). But our own CSV row 52 defines Shipment Type as **Pooling / Cross customer / Line haul / Rule 11** — and "Next Shipment ID — *used for pooling or Rule 11*" proves that row is a **multi-leg linkage triplet** (Type + Sequence Leg + Next Shipment ID), a genuinely different concept sharing a name, binned by the stakeholder exercise as "Others / Advanced / Rare Fields". My first guess (sub-types of Consolidation) was wrong and is corrected in the plan. **Pickup #** per **LINX-12039** is an order-header field, alphanumeric, with a **`poNumber` sibling we don't have at all**. **Planning Type** (`RDD`/`SSD`, any-order-RDD wins) is a real closed story (LINX-12902/12898) we're missing.
- **Progression placement ruled, with a reason.** Shipment/Planning Type stay **low** — the search registry projects only high-selectivity **needles** and deliberately excludes every enum (Mode, Tender Status, Shipment Status are the S105 non-projected class); a 2-value enum matches ~5,000 of 10,000 rows, so promoting it would evict identifiers from the prime suggestion slots. But adding them to the progression is **mandatory anyway** because `ShipmentsFiltersView` renders `SHIPMENTS_PROGRESSION` — absent from it means **unfilterable**, which is likely why the field felt missing. Landing as a new **"Classification"** group after Carrier & Tender Status, both **projected** so chips filter instead of degrading to honest-empty.
- **Deliverables:** spec `2026-08-04-save-filters-design.md` (rev 4) · plan `2026-08-04-save-filters.md` (4 phases; 0–2 ship with **no DB contact**, Phase 3 sharing gated) · plan `2026-08-04-combined-db-motion.md` (migration 006 + generator + wiring + probes).
- **⚠ Gates open, nothing run:** migration 006 · the reseed · the deploy that must ride with it. **I recommend deviating from the documented `--reset --yes` ritual** (`migrate.mjs:46` = `DROP SCHEMA public CASCADE`): run 006 additively and truncate only seeded tables, so `user_preferences` (1 live row today) and the future `shared_filters` survive — otherwise "reseed" comes to mean "users lose their saved presets and filters". **Invented values needing a ruling:** RDD/SSD ratio (~35/65 proposed) and PO-number shape/coverage (`PO-######`, ~60%). **Owed:** the user pasted Rovo's RDD/SSD + PO-number definitions but **the paste did not arrive in the transcript** — re-send before seeding those two. Also owed: one Jana question on the linkage triplet, and GS-24 (supersedes GS-09/GS-10).

---

## Session 108 — August 3–4, 2026

**THE SPOTBOARD DOMAIN SESSION — a parallel documentation track run alongside S107's search work: SpotBoard taken from "no canon exists" to a v1.5 domain canon, 19 traced decisions, and an approved spec + 13-task implementation plan. Zero code shipped by design — the one code artifact (a sidebar entry) was built, deployed, and then removed by the user once the placement question resolved against it.** Five `/analyze` intake cycles. No tests changed, no DB touched. 1 prod deploy (user-authorized, since reverted in S106).

- **Five intake cycles built the canon from nothing.** v1 (first meeting transcript + Kathleen's HTML wireframe) → v1.1 (the Loadboard-vs-Overflow meeting) → v1.2/v1.3 (the 33-page PRD, Kathleen's carrier-auth note, then a **visual recovery pass** reading the PDF pages as images to repair what MarkItDown destroyed) → v1.4 (Jana's draft portal story) → v1.5 (the **complete** July 28 transcript + the July 30 placement call). Canon `vault/10-domains/spotboard/spotboard.md` now 214 KB, plus `data/quote-model.md` (schema, five status vocabularies, state machine, config surface, 8-message email catalog) and `decisions/decision-log.md` at **SPB-01…SPB-19**.
- **The conversion-damage lesson.** The PRD's MarkItDown output silently **flattened strikethrough**, so three of the PRD's seventeen open questions (`OQ-4`, `OQ-5`, `OQ-16`) read as live when they were already dead — and `OQ-4` was load-bearing under SPB-02. Only caught by sending a second agent to read the pages **visually** after the first flagged damage. That pass also recovered pp.30–33 (eleven `COFL_*` OCM profiles, thirteen system profiles, the 200/220/240 app split) and all ten Appendix B screenshots. Two reconstructions were checked and proved correct. Unrecoverable: two description columns clipped **in the source raster itself** — re-request as text.
- **Three hypotheses tested and mostly refuted, which is the point.** SpotBoard is **not** an extended Tender tab — it's a sibling that *terminates* in one (`Award ≠ tender`, the PRD's own sentence). "Lowboard" doesn't exist; **Loadboard** does, and it's a **sibling module, not a child** — automated/internal-brokerage vs SpotBoard's planner-initiated/external. The user's "mostly automations" instinct, which v1 reported as unsupported, turned out **correct** once the Loadboard meeting landed — a false negative from an evidence gap, corrected visibly in canon §4. Biggest surprise the PRD revealed: the **affiliate (CTNS) desk** that bids *inside* the carrier auction with sight of the leading bid and extra time after close — mentioned by no transcript and in tension with the PRD's own no-cross-carrier-visibility rule.
- **Placement resolved, and it reversed a shipped change.** Early in the session a `Gavel` sidebar entry + `/spotboard` route was scaffolded and **deployed to prod** (user-authorized, verified live). The July 30 call then settled it the other way — **SPB-18**: the planner UI is a dedicated tab **next to Tender inside the shipment**, not a domain and not inside the Tender tab; the cross-shipment board is a **top-level module deferred past V1**. Manuela proposed it, Kathleen (PM) concurred in her own words, Irina agreed. Supersedes SPB-11, sharpens SPB-03/04. The sidebar entry was removed by the user (recorded in S106).
- **Two user corrections that reshaped the work.** (1) **Quote History was wireframe residue** — every "history" Kathleen names in the July 30 call is the *carrier-facing* portal she explicitly cuts from V1; the planner tab is two sub-tabs, not three. (2) **Source precedence set** (memory `project_spotboard_source_precedence`): **PRD + Kathleen's mockup are the design authority, transcripts confirm/validate, and individual pushback — Irina's specifically — is not truth without consensus.** I had been treating Irina's "two UIs" framing as if it defined the deliverable.
- **Carrier auth split in two, which unblocked the build.** **SPB-19**: the contest (`SPB-16`) is about the *eventual logged-in portal*, not V1. V1 carrier access — tokenized email link → single mobile page, no login — is settled by the PRD (its own user story 5 argues for it), Kathleen on two dates, and Irina *deferring* rather than opposing. Memory refined accordingly: build the V1 token page; don't build or adjudicate the portal. Also corrected the record — Irina's own words either side of 07/29 contradict the secondhand report that she opposed the token.
- **Deliverables for next session:** spec `docs/superpowers/specs/2026-08-03-spotboard-v1-design.md` and plan `docs/superpowers/plans/2026-08-03-spotboard-v1.md` — 13 dependency-ordered TDD tasks (pure logic → components → integration), Sonnet implementers per the model policy. Design calls made and recorded: two sub-tabs (Setup & Carriers → Live Bids) on the `RoutingGuideTab` pane pattern; **Live Bids on the nested `GroupTable`** (`detailColumns` for the charge breakdown, `stickyActions` for Award); state-driven enablement from the PRD matrix; eligibility `EmptyState` gate; tolerance math shown not hidden; carrier page as a chrome-less `/spot-bid/:token` route outside `AppShell`, mobile-first, no Order/Load ID; award appends a **SPOT RATE** row via the existing `saveTenderOption`. **No reseed** — eligibility derives from existing tender data, the auction is `localStorage`-backed (so the separate carrier tab syncs live), only the award persists. One new app-local piece: `Countdown` (nothing in the library does live time).
- **Open / carried:** the eventual carrier portal + auth model (SPB-16, owner Thomas via `OQ-1`) · David's ratification of exact placement (non-blocking) · legacy sorts the awarded carrier to **rank one** where the mockup appends it **last** (going with the mockup) · leading-bid display (`SHOW_BEST`, off by default) · whether OdysseyONE rebuilds the affiliate · a `loadboard` domain folder when a Loadboard-specific artifact arrives. **Next session (user): execute the plan on `main`.**

---

# Session Index (condensed)

## Session 107 — August 3, 2026
**THE FILTERS-CONTROLS + FIX-ROUND SESSION — opened by RECOVERING a lost session: the S107 spec (committed as `60915b7`) had been fully executed before a crash and sat uncommitted, so the first act was reconstructing that awareness from the diff.** Delivered: the filters view swapped onto normalized controls (ComboBox/FormField/DatePicker ×2 per date attribute, enum chips as a GS-12 IN-list), the **`MM/DD/YYYY` date canon** platform-wide via a new `lib/dates.js` seam (region-switching HALTED until a real regional user model exists), DataTable's `loading`/`loadingRows` split, SummaryStrip `truncate: 'lead'` → 0.7.1, the Shipments **History tab** built ourselves against Jira contrast (DEC-70, LINX-13065/8091), and three GS-22 search refinements found by the user in live use. Two durable rulings: **Efrain's mock token drift is OUR intake job, not a flag back to him**, and a "connected" MCP server can be entirely dead. Tests app 419 → 426.

## Session 106 — August 2–3, 2026
**THE SEARCHCHIP + DATES SESSION — Scenario 2 (bulk/multi-search) shipped end to end, Figma-first: the SearchChip molecule born (Single/Set/Date modes), the Spinner atom normalized, GS-21 + GS-22 specced/wired/deployed with the server learning date-range column filters, the Filters view wired BOTH directions, hazmat made system-driven, Spotboard removed, two angular-porter subagents shipping twins under CDP-driven QA, and the batch RELEASED as @oneodyssey/ui 0.12.0 (PR #14) — plus an uncommitted 0.11.0 release recovered from the Angular working tree.** Headline lessons: a date chip's open state had to be LIFTED into chip data so "quick results only when the chip closes" had one source of truth; `pickup`/`delivery` were never projected into search_index, so date chips fell to honest-empty until `search.mjs` learned to route `kind:'date-range'` chips to column filters; and the localhost "live mode" proxies `/api` to the DEPLOYED function, so server fixes stay invisible until a deploy. Tests app **643 → 685**. 2 prod deploys, Code Connect + Figma library republished.

## Session 105 — August 2, 2026
**THE SEARCH-SHIPS SESSION — the entire S104 plan executed (Track A by the main loop, Tasks 9/12/13 by Sonnet subagents under two-stage review), the plan itself review-corrected first (9 findings), ONE combined Neon reseed and TWO prod deploys — live search worked end to end on odyssey-one-stage.vercel.app for the first time, browser-verified.** Five plan defects corrected in flight (registry priority off-by-one, `/api`-prefix double-prefix that would have 404'd every search, `buildSuggestQuery` inheriting `DISTINCT ON`, live adapter returning no panel/display fields, counts never sending criteria); every SQL shape executed against real Postgres in rolled-back transactions. The final whole-span review earned its keep twice — live search silently dropped committed chips (a PLAN-level hole no per-task review could see, three rounds to fix), and GS-18's landing jump was proven by `git -S` to have never been written despite a comment promising it. Reseed: 10,000 shipments / 24,057 orders / 162,818 search_index rows, all 15 probes green. Model policy set here: **enterprise = Sonnet implementers / Fable judgment**. Tests 631 → 643. Decision-log entries owed for the invented bits (usernames, tracking-URL shape, created/edit zone source).

## Session 104 — August 1–2, 2026
**THE PROGRESSIVE-SEARCH SESSION — seven behaviour cases shipped in mock (GS-14…GS-20), plus the root-cause discovery that reframed every symptom: `.env.local` ran `VITE_API_MODE=live` and the live API had NO search implementation at all, so the table showed all rows and the tab counts never filtered.** Also: the HTTP QUERY research verdict (RFC 10008 real, but Vercel 400s and CloudFront rejects it → document-QUERY, ship-POST), the `search_index` projection architecture + tiered UNION so preview≡table holds by construction, three of my own calls corrected mid-session (GS-16 shipped DEAD behind a branch the app never takes; GS-19 and GS-20 both read BACKWARDS from the user's words — "A & B" meant the union of result sets, which boolean logic calls OR), a test that proved nothing until mutation-checked, and the findings that reshaped the plan (Pickup # is ORDER-level → array column; the ` CST` hardcode was in the GENERATOR, not a component — audit the DATA path, not just the render path). Deliverables: architecture spec + the 15-task plan S105 executed. Tests 596 → 631. Nothing deployed, nothing reseeded.

## Session 103 — July 30–31, 2026
**ShipmentDetailsModal rebuilt to Jana's annotated spec (SummaryStrip + 4 sections + UDF tab, footer removed); the stop↔order model corrected three times (my mode-gating over-correction reverted — an order legitimately appears once per side; deliveries DO split per Jana's Feb 17 grooming); real Tracking payload analyzed into a new domain canon (TR-01…TR-08, DEC-68 consolidation umbrella, DEC-69 only-LTL-capped); timezones moved to IANA with a seed parser bug caught pre-reseed (2,823 timestamps would have gone NULL); Neon reseeded 19m21s and browser-verified. Lessons: search the canon BEFORE changing the generator; a reseed is only atomic if it finishes.** Tests 585 → 596. Full narrative in git history (progress.md@S105).

## Session 102 — July 29–30, 2026
**THE FIELD-SYSTEM SESSION — Edit Order shipped end-to-end (LINX-10248), the three Tender quote modals rebuilt onto normalized components + wired to the `tenders` table, the 38px field-height bug root-caused and fixed structurally, and a 5-component batch taken demote → approve → port → RELEASE 0.10.0 with Figma synced first.** Tests: app **585** (+8), api **40** (+6), tools 65, Angular lib **985** (+6), explorer 52. DB reseeded ×1 + prod deploy ×1 (one user-gated motion). Angular local-only — NOT pushed. npm publish remains Cognizant's.


## Session 101 — July 29, 2026
**THE RESEED-SCOPE AUDIT THAT BECAME A FULL SHIPPED MOTION — an opener review found the one real gap (order-number format, never a ledger row), which grew into ledger row 10 and a combined user-gated Neon reseed + prod deploy.** Canon LINX-9742/9279: Order Number is optional free text, blank → BE generates `orderNumber = orderId`; final shape 71% auto 13-digit zero-padded / 29% user free text with customer initials (ratio + shape flagged invented). Also: the user-preferences wire (`GET/PUT /user-service/v1/preference` + `useUserPreference`, ColumnPanel presets persisted), resolve mode moved onto real `disabled` props (opacity/pointer-events blanket CSS deleted, focus-bounce guard removed), a create-order UX round, ComboBox State=Disabled through a full 0.9.1 release, and PR #13 unblocked with PR #12 discovered already merged by Cognizant. Post-deploy "no Valtris numeric orders" scare root-caused as lexicographic desc sort (letters outrank digits) — accepted, no change. Tests: app 566, api 34, Angular 979.

## Session 100 — July 29, 2026
**BOTH FLAGSHIP MOTIONS SHIPPED IN ONE SESSION — the Orders reseed (ledger rows 1–9: code → Neon reseed → prod deploy → ORD-11) AND the 14-component Angular port batch (GATE B → 0.9.0 → both repos pushed → PR #13).** `data-pools.mjs` became the single source for every shared catalog (equipment/freight/ship-direction/ship-class/NMFC/handling-unit codes, 13-digit product IDs, 43 promoted customers); UI maps code→label at the three mapper seams; PATCH `/order-service/v3/order/status` closed the S99 live-Purge gap. Reviews caught a Shipments-canon violation (productClass TYPE vs shippingClass VALUE) and a latent hazmat ID bug. Port batch: Phase 3b browser QA again beat green builds (ComboBox panel gap, Badge left-icon projection), ComboBox renamed search-field→combo-box (BREAKING), ShipmentsBar rebuilt to the fixed-stage model. Plus token snapshot refresh (126 vars), MatchSimpleRow Layout axis, FieldSearchResults two-column state, and a DSM pass making the rules playable. Tests: app 563, Angular 978.


## Session 99 — July 28–29, 2026
**ERROR VALIDATION SHIPPED END-TO-END (ORD-10 / LINX-11137) — FormField/ComboBox validated+error+focused states normalized Figma-first, then the OIF resolution behavior built via subagent-driven plan execution (7 tasks), then two live browser-QA rounds that root-caused a Chrome scroll-anchoring flicker and reworked the alert dock model.** New semantic `Border/success`; `?resolve=` mode with deterministic derive+seed as the future-OIF seam; Alert graduated to own the dock slide-in + all-resolved success surface; orders row-click removed (kebab View is the single entry); ledger rows 7–9. Tests 535 → 560. GATE B stamped on all 14 staged components. Detail: ORD-10 in the orders decision log.

## Session 98 — July 28, 2026

**CONFIRMATION PAGE CONFORMED TO ALL FOUR CASES (ORD-09 / LINX-9002) + THE EFRAIN-COPY RULE CODIFIED — quick/long as data-driven rendering, the Product Info card built for real (8-field rollup + read-only table; net/tare weight `--` gap owed to Ramesh), async order-number assignment live w/ navbar-bell notification, Shipper/Destination renames (LINX-12255/13899).** Efrain-copy rule: layouts outrank, English normalized (memory `feedback_efrain_copy_not_canonical`). Intake pivot parked (PO feedback vs stale deploy + Functional Req tracker — synthesis never ran, resume /analyze step 3). Tests 535. Detail: ORD-09 in the orders decision log.

## Session 97 — July 28, 2026
**PRODUCT INFO POLISH + SELECT-COMPONENT RULING + §SPECIAL SERVICES ON MULTISELECT — ComboBox absorbed the select ambiguity via the `typable` prop (data-source rule: fetch → ComboBox, local → Dropdown; SelectField deleted, 7 call sites swept), body-portaled typeahead panel, MatchSimpleRow plain-list rule + `twoColumn`, FieldSearchResults `columnHeaders`/`rowHeight`, MultiSelect two-column dropdown + width 100% + `emptyTableMessage`; special-services catalog extended 5→24 (codes/frequencies INVENTED, flagged).** Tests 528. Detail: orders decision log + normalization tracker.

## Session 96 — July 28, 2026
**PRODUCT DATA GROUND-TRUTHED + COUNTER BUG CLOSED — the S95 carry-forward bug root-caused as a definition mismatch (counter tracks ROWS now), then the 4 product-field format gaps closed three ways in one day: Sonnet Jira/Confluence research → live dev API replays with the user's captured token (product lookup totalCount 2,454,406; complete Handling Unit catalog = 5; freight-term wire codes P/C/N/T/A; carriers 11,142) → QA dropdown screenshots (KEY CORRECTION: the grid's "Product Class" column is the 4-TYPE dropdown, not the NMFC scale).** Mocks updated lookup-only (ledger rows 5–6); research canon at `vault/10-domains/orders/research/product-data-formats-2026-07-28.md`. Tests 525.

## Session 95 — July 27–28, 2026
**CREATE ORDER SECTIONS CONFORMED + PRODUCT INFORMATION SHIPPED — ORD-05/06/07 (General Info, Pickup & Delivery, Efrain formats/location polish) + the full ORD-08 §Product Information arc with four QA rounds.** Customer rename, ComboBox-only-for-server-search rule, DatePicker/TimePicker adoption, Appointment checkboxes, `--spacing-9` token (Angular tokens-file addition OWED), equipment-driven grid columns (LINX-13893), ColumnPanel generalized, horizontal breakout, MeasureField, `onTouched` validation + index-preserving superRefine, ComboBox 36px + Enter-commit. DB-update ledger created (reseed at end of Orders, permission-gated). Tests app 523. Detail: ORD-05..08 in the orders decision log.

## Session 94 — July 26–27, 2026
**THE ORDERS PER-TAB TABLE SHIPPED END-TO-END — research (Jira AC-field lesson: specs live in `customfield_10032`) → 12-task plan → build → live cutover (migration + reseed ×2 + 3 deploys).** Per-tab column models (All 15-col/Draft/VE + Resolve), Export to Excel (25k cap, lazy xlsx), Paginator standardized all domains, hazardous derived from product lines (LINX-12102, ~19%), ModalMedium contract fixes, SearchField → ComboBox rename + Select variant (Figma set 4715:6142), Tender-tab crash fixed + deployed, October-scope Y/N list + 5 feedback tickets processed. Ops lessons: backgrounded subagent seeds die at turn end; deploy must ride with API changes. Tests app 521, api 25.

## Session 93 — July 24, 2026
**Buy-shipment-as-ID executed (Jira-confirmed) + DB slices 3/3b shipped under fire, then two post-wrap continuations.** DEC-66 buy-first column presets + `UNIQUE buy_shipment` reseed; shipment-detail + order-view endpoints built after live-mode 404s surfaced in prod (triple Q30 gate removed); local dev → Neon via vite proxy; reseed/deploy-together lesson. Continuations: cell font audit, bar shows buy id via live-row lookup, ShipmentsBar rework (3-stage height, scrim, id-as-ButtonLink → ShipmentDetailsModal extraction) + DataTable `loadingRows`/`onRowClick`/`scrollSelectedIntoView` componentization; **HARD RULE landed: no prod deploy without per-deploy permission**; id-as-link Figma sync = blocking item before batch re-approval (ShipmentsBar + DataTable NORMALIZING both DSMs). Tests app 510, api 22/22. 4+ deploys (pre-rule), DB reseeded.

## Session 92 — July 23–24, 2026
**THE REAL DATABASE SHIPPED — Neon Postgres behind our own OdysseyONE-shaped API, LIVE on odyssey-one-stage.vercel.app.** Full brainstorm→spec→plan→subagent arc (9 tasks): `packages/db/` migrations + 11-table schema, deterministic `buildDataset()`, 10k shipments/263 MB seeded with 9/9 invariants, single Vercel Function serving the 4 contract endpoints (parameterized SQL, honest-empty scoping), seam wiring (mock branches byte-identical), prod E2E green with `VITE_API_MODE=live`. Key decisions: Neon over Supabase (vendor-neutral `pg` seam), guest + 8 mock users no SSO, `user_preferences` JSONB. Hard-won: Vercel bracket catch-all fails multi-segment paths (plain `index.js` + rewrite); `vercel dev` clobbers vite (local dev stays plain `vite`). Also: `angular-porter` custom agent, rtk trial installed, buy-shipment-as-ID investigation parked pending Jira. Tests app 503→510, node:test 23/23.

## Session 91 — July 20, 2026
**Home domain desktop pass + tab-widget showcase, iterated live and DEPLOYED.** Responsive grid (1800px content cap, 6→8 tracks at 1440px content width via ResizeObserver-driven packing), default showcase rebuilt (12 widgets/23 cells, load-bearing seed order), tab deep-linking via `location.state` (+ the duplicate-`widgetGoToPaths`-keys bug found post-deploy and fixed), the "Domain / Tab" header convention codified and swept, and widget data wired to the SAME customer-scoped hooks the routes use (numbers verified matching route badges). Ops lesson: deploy from repo root only (stray "apps" Vercel project created + deleted). 503/503 tests.


## Session 90 — July 20, 2026
**Orders main tabs shipped + the S90 error-state component batch (StepIndicator / Accordion / Alert) through the full /normalize update cycle — Figma-first, all three APPROVED (GATE B), parked pre-wiring/pre-port awaiting stakeholder feedback.** Tests: app **503/503** (+1), tools **65/65** (+1). Nothing deployed; both repos committed (Angular local-only).

## Session 89 — July 17, 2026
**The field-components batch: QA'd, hard-bug-fixed, feature-extended, and RELEASED as `@oneodyssey/ui` 0.8.0 — both repos pushed, Angular PR #12 open.** Session opened on the in-flight uncommitted batch (TimePicker + MultiSelect new; CalendarPicker/DatePicker/`useFieldPopover`; SearchField typeahead; FieldSearchResults/MatchSimpleRow/FormField/DataTable/ShipmentsBar updates — built pre-session in both repos, unwrapped). Verified it end-to-end, then spent the session on an intensive interactive QA loop with the user across both DSMs. Tests: React **490 → 502/502**, Angular lib **827 → 904/904**, app **51 → 52/52**.

## Session 88 — July 15, 2026
**Applied Tier 1 + 2 of the S87 automation punch-list (React tooling only).** Re-verified the S87 audit findings live (post-autocompact) — all held. Tier 1: `wrap-commit.sh` stale co-author trailer fixed; `token-check.mjs` bare font-weight bug (weightVars now checked before figmaNums → `600` correctly maps to `--font-weight-semibold`). Tier 2: CLI-guarded `token-check`/`release` behind `process.argv[1]` so importing them can't fire file writes, extracted `bumpPkgVersion` + `insertChangelogSection` as pure exports, +13 tests (tools 51 → 64/64). Tier 3/4 deferred (S90 built `--demote`).

## Session 87 — July 14, 2026
**Automation audit (read-only) — reviewed the 10 S85 normalize/port/release scripts vs the routine docs + /wrap skill.** Verdict: no approval gate broken (all scripts advisory or stop before push/publish); real weakness = under-guarding. Findings became the Tier 1–4 punch-list: stale `wrap-commit.sh` trailer, `token-check` bare font-weight bug, untested `release.mjs`, half-built PORTING badge, `insertAppModule`/`demoPrefix`/`verify-all` fragilities, and the missed `dsm-flags --demote` (built S90). Tiers 1+2 applied in S88.

## Session 86 — July 14, 2026
**Maintenance session — progress.md compaction.** 7,088 → ~330 lines: sessions ≤81 condensed into this index, foundations condensed, full narrative archived at `vault/99-archive/progress-full-archive-2026-07-14.md`. `/wrap` gained the rolling-compaction rule (3 newest sessions verbose). No code/library changes.

## Session 85 — July 14, 2026
Two-arc session. **Arc 1 (DataTable sorting + width model):** opt-in column sorting shipped to spec (3-icon signaling, asc↔desc with one column always driving, auto-seed), the whole column-width model rebuilt (header-fits default, 290px `MAX_COL_WIDTH` cap, drag floors, font-race + shrink-to-fit measurement fixes, resize-jump root-caused), a truncation Tooltip feature, and the per-instance feature-switch API (`sortable` / `truncationTooltip`) — APPROVED, live on Shipments, documented in usage.md + a new DSM details-modal API tab. **Arc 2 (process automation):** 10 dep-free scripts now own the mechanical normalize/port/release steps (`dsm-flags`/`release`/`port-readiness`/`scaffold-port`/`verify-all`/`scaffold-normalize`/`token-check`/`connect-publish`/`wrap-commit` + Angular `demo-parity-lint`; 65+ tests; memory `project_s85_port_automation_tooling`), and the Angular DSM presentation drift is measured (lint baseline 64/72 → convention exemptions + 43 token-table auto-fixes → 8 known-red = 5 pending-port + 3 real API gaps), repaired, and lint-guarded inside `verify-all` from here on. React 372→379/379. DataTable + ShipmentsBar stamped APPROVED. Full detail: `playground/normalization-tracker.md` + DSM route + git history.

## Session 82–84 — July 9–14, 2026
Two-arc session. **Arc 1 (Shipments search):** Order Count added to `SHIPMENTS_PROGRESSION` with `exact: true` (count chips now match by full equality) and search-result clicks open the chip-mapped ShipmentsBar tab via a shared `CELL_TAB_MAP` (`cellTabMap.js`) — also lands the previously-unwrapped S82 cell→tab wiring. **Arc 2 (field components):** CalendarPicker normalized end-to-end (Figma rebind + React + DSM, APPROVED; 5 illegal tokens rebound, single/range + minDate/maxDate); DatePicker + `useFieldPopover` extracted as code-only composites; and the Autocomplete arc reworked to render through FieldSearchResults + MatchSimpleRow (folded into SearchField as additive typeahead props, `@tanstack/react-virtual`, new Figma show-avatar/show-info booleans, hover/is-active/scrollToIndex fixes, apis.guru conformance suite). All approved (GATE B), staged for the next Angular batch port. 366/366 tests · build clean · not deployed.

## Session 81 — July 7, 2026
Bug-fix + polish session: the Orders row-click "randomness" root-caused and fixed (ORD-02), row actions View/Edit wired, the Customers panel rebuilt around staged-save + two modes, the four S80 NORMALIZING components re-approved and ported onto PR #11 (plus DataTable/PillTab S81 mods — CI green twice), and a Vercel deploy-payload diet (1.1GB → 723KB). Heavy subagent…

## Session 80 — July 6–8, 2026
Marathon session: the full S79→0.7.0 release arc (approve → Angular port → PR #11 green), two new library components (StopBadge, Timeline), Stops/Documents/Notes/Orders-sections pane redesigns to fresh Figma mocks, GlobalSearch UX batch, Column Arrangement completion, the Orders row→summary feature, and Orders↔Shipments data unification (single generator, 9 invariants, 2200…

## Session 79 — July 5–6, 2026
Shipments page overhaul + two new staging components (GroupTable, SummaryStrip) + 24 design-decision cycles (DEC-40..DEC-66+). Ran in waves: S79 (Orders tab rebuild + 8 page fixes), S79b (all tab panes + paginator), S79c (bar interaction model v2 + unified search + customer scoping), S79d (bar animation v3), S79e (GroupTable + SummaryStrip staging + bar open-to-cap), S79f–h…

## Session 77–78 — July 4–5, 2026
AUTONOMOUS SESSION — user scoped the batch extension (5 Figma nodes + 2 inbox mocks: "ShipmentsBar", 2 "mini widgets", a "section divider", a "tab group") then left ("solve this on your own; I want to see what you resolved"). Ran the full /normalize intake→Figma-componentization→implement→demo→consumer-rewire cycle for what turned out to be 2 NEW components (`ShipmentsBar`,…

## Session 76 — July 3–4, 2026
Closed the S75 batch at 8/8 APPROVED (SubSectionHeader reborn as `SubAccordion`), ran the full Phase 3 sync-back, then took the whole batch through the Angular port to PORTED (GATE B passed after one Alert-demo drift fix). The batch stays OPEN — S77 adds the missing Shipments components before final approval. Also root-caused + fixed the DataTable "delivered with a border"…

## Session 75 — July 2–3, 2026
Two arcs: (1) closed the 0.5.0 batch (final approval — both repos pushed, Angular PR #9); (2) a large new normalization batch across the search/results domain + row molecules — 8 components, ending 7/8 APPROVED (SubSectionHeader parked pending an Efrain question). Nothing was committed until `/wrap`.

## Session 74 — July 1, 2026
Overhauled the normalize workflow into a 3-badge STAGING model kept in React↔Angular DSM parity, then normalized three components into the 0.5.0 batch — `TitleSubtitle`, `StepperButtonsFooter` (+ rewired the order-create `StickyFooter` onto it), and a new `PageHeader` `Type=Last update` variant (Figma variant-set surgery). Batch is now 6 components, all at PORTED.

## Session 73 — July 1, 2026
Normalized `ModalHeader` + `ModalFooter` as real molecules (React + Figma + Angular twin @0.5.0), refactored RightPanel in BOTH stacks to compose them, redesigned the DSM demos into a Schematic + Playground pattern with `#comp-` deep-linking, and shipped editable-title UX (focus-on-enter, content veil, close/outside-click dismissal).

## Session 72 — June 29–30, 2026
Normalized `RightPanel` (React + Angular twin), rebuilt the Shipments Column Arrangement feature on it (slide-in drawer · preset select/rename · draft→Save/Cancel footer · ⋮ preset menu), then finalized the RightPanel shell to OWN the animation + editable header with Figma-parity footer. Also: unblocked Angular PR #7 CI, published `@oneodyssey/ui@0.4.0`, and established that…

## Session 71 — June 27, 2026
Closed the S70 batch: MenuRow realigned (select-only + Disable + Draggable), PillTab/Tab validated, `@oneodyssey/ui@0.4.0` released, and the long-standing Code Connect 5-component drift finally unblocked. Plus a hard lesson on stale dev servers.

## Session 70 — June 26–27, 2026
The S70 component-normalization batch — five components through the full Figma-first → React → Angular routine (per-component), plus a Badge extension and two foundational bug fixes. Settled the "Row family" convention. Batch release (0.4.0) deferred to S71; one Figma-grid cleanup outstanding.

## Session 69 — June 26, 2026
DSM search reworked into a global 3rd filter (both DSMs, pushed) + a standing version-sync rule; the `@odyssey/ui` DataTable migrated into Shipments as the redesign's QA foundation (native column state, RightPanel-ready); and the OLD Shipments design frozen as a SEPARATE disposable project (`odyssey-shipments-legacy`) instead of an in-repo fork — total isolation, `main` stays…

## Session 68 — June 26, 2026
Cut 0.3.0 — then caught that it had shipped FIVE DataTable regressions to Cognizant, root-caused them (read-only investigation workflow + verified the contested cause against TanStack source), fixed the React canonical (TDD) + the Angular twin (Δ=0), VERIFIED IN-BROWSER on both stacks, and shipped 0.3.1. Plus: DSM component-search + CODE-ONLY badge in both explorers, DataTable…

## Session 67 — June 25–26, 2026
The Cognizant table deliverable, finished. Ported the boundary FLIP + ActionMenu + DataTable to `@oneodyssey/ui` (Δ=0), caught + fixed THREE real in-browser bugs the unit tests missed (the two-window review earning its keep), then ran a fresh brainstorm→spec→plan→build arc for DataTable EXTENSIBILITY (column resize + per-cell click + reorder/visibility), React canonical +…

## Session 66 — June 24–25, 2026
THE DATATABLE SHELL shipped (React, Δ=0) — the foundation of the Cognizant table deliverable — then two follow-on components: the Dropdown boundary-aware FLIP and the ActionMenu molecule (unifying three divergent row-action menus, closing SHP-66). Each ran brainstorm → spec → plan → subagent-driven build (two-stage reviews + a final holistic pass). All on `main`; held with the…

## Session 65 — June 24–25, 2026
THE PAGINATOR shipped (React + Angular, Δ=0) — the arc-closer — plus a DSM component-versioning feature (per-section version badges + header library-version chip + a "Latest only" toggle) and the Table-deliverable strategy locked. All held with the 0.3.0 batch (no push).

## Session 64 — June 23–24, 2026
The full dropdown stack, normalized end-to-end (React + Angular): MenuRow (re-normalized + reclassified to atom) · DropdownMenu (new molecule) · DropdownButton (new atom) · Dropdown (new molecule) — plus Angular DSM feature-parity with React and a domain-usage generator fix. All Δ=0 two-window. Batch committed locally, NOT pushed (held with the S63 batch).

## Session 63 — June 22–23, 2026
Token sync + three normalizations (Badge selected-toggle · Button per-variant disabled · PaginationButton new atom) — React + Angular each — plus the table strategy decision (drop PrimeNG → headless TanStack on both sides). Batch is committed locally but NOT pushed; `@oneodyssey/ui` version bump deferred to batch-end.

## Session 62 — June 18–22, 2026
Completed the Angular library (42→46), migrated it into Cognizant's official repo + published it to GitHub Packages as `@oneodyssey/ui`, hardened the DSM explorer, and rewired the `/normalize` · `/port-to-angular` · `/wrap` skills for the new official-repo workflow.

## Session 61 — June 18, 2026
Ported the entire set of organisms Home needs to Angular — 7 organisms, library 35 → 42 — under the hardened parity discipline (Opus generation · verbatim-React demos · puppeteer screenshot+measurement parity → Δ=0 before every GATE B). One-at-a-time through `/port-to-angular` Phases 1–5 with a user GATE B each. Measurement caught real bugs that builds + code-review missed.

## Session 60 — June 17–18, 2026
Finished the Angular molecule line — all 18 portable molecules ported (library 31 → 35) — and reset the porting process to Opus + screenshot/measurement parity. Two clean batches landed (Batch 8: FormField · MenuDropdown · WidgetPieChart; then GlobalSearch, the last portable molecule). In between, a 7-organism batch and a Cell attempt were built and scrapped on Manuela's call…

## Session 59 — June 17, 2026
The Angular molecule line — 13 molecules ported across three batches + ButtonToggle; library 18 → 31 components. Finalized the S58 delivery zip, then ran the `/port-to-angular` gate at pace: Batch 5 (5 molecules + the deferred shared-base extraction + two React spec changes), the ButtonToggle queue-jump (Tier 3, needed by PageHeader's cluster), Batch 6 (5 dependency-safe…

## Session 58 — June 16–17, 2026
The Angular atom library COMPLETED + packaged for delivery, plus two new DSM features built via Superpowers. Cleared the owed Checkbox two-window review (→ Phase 5 promote), then ran sub-project C end-to-end: four `/port-to-angular` batches landed all 17 atoms (+ the Alert molecule that jumped the queue) into the versioned `odyssey-ui` Angular library. Added DSM identity +…

## Session 57 — June 16, 2026
PIVOT executed — the Angular design-system delivery line. Built the `odyssey-angular-dsm` workspace (sub-project A) AND the `/port-to-angular` gate (sub-project B) end-to-end via Superpowers (brainstorm → spec → plan → subagent-driven TDD + per-task two-stage reviews + final holistic review), then generalized the gate for the real component mix. Strategic reframe (Manuela,…

## Session 56 — June 15, 2026
Orders intake (`/analyze`) → §6 View Order data-seam built TDD (plumbing only, zero UI) → the whole branch landed in `main`; next session pivots to an Angular DSM. A reconciliation-heavy session driven by Ramesh's (PO) morning feedback on the deployed Create flow. 5 commits pushed to `origin/main`, full suite 164 green (+23), tsc clean, build green.

## Session 55 — June 12, 2026
A short polish-and-ship session: four Create-Order detail fixes, then the first production deploy since S54 so the team (incl. Efrain) can review the flow live. Also a scope audit — confirmed the confirmation pages are complete and mapped the remaining Orders work against the 12-section canon. Code committed in `c51a99a`; build green, 141/141 tests.

## Session 54 — June 11–12, 2026
The Create Order flow, built end-to-end (screens 1–7), then made design-conformant against Efrain's captures. Full Superpowers arc — brainstorm → spec → 25-task plan → subagent-driven build (6 batches, per-task spec + quality reviews, final holistic integration review) → multiple live design-conformance rounds with Manuela. ~55 commits on `shipments/global-search`, 141/141…

## Session 53 — June 11, 2026
Normalization triple-header, live-iterated with Manuela: ButtonToggle grew its `Content=Icon|Text` axis (Figma → code → Code Connect, full cycle), the table cell contract landed from the Figma `Cell` set (read-only intake — TanStack owns the markup, we normalized how cells look) including the split sticky header the S52 carry-forward deferred, and Tab (underline filter tab)…

## Session 52 — June 11, 2026
Orders Summary Page built end-to-end (screen 0), mock-mode on an LLD-shaped data layer. The S51 spec → implementation plan (`writing-plans`) → GATE A → subagent-driven build (3 batches, each implementer + spec-compliance review + code-quality review, then a final holistic integration review) → a round of Manuela's live design-conformance corrections. 20 commits on…

## Session 51 — June 10–11, 2026
Orders Phase 1 opened — the Order Summary Page spec, from brainstorm to LLD-verbatim contract. Fable main-thread per the gateway (user `/model`-switched at the boundary). Superpowers brainstorm → approved design → committed spec → assumption review with Manuela → raw-dump evidence pass → the Order Service Phase-2 LLD fetched and reconciled, so the contract types are now…

## Session 50 — June 10, 2026
Orders Phase 0 — the full four-source intake, executed end-to-end with model gateways. The Session 49 plan ran exactly as designed: Jira stories (the primary context source, not the inbox as originally assumed), Efrain's UX descriptions, David's PRD, and 18 Angular UI screenshots all landed in one session, synthesized into a cited, RAG-ready Orders canon. GATE 0 passed (slice…

## Session 50b — June 10–11, 2026 (parallel normalization session)
A `/normalize` cycle run alongside the Orders session: ButtonToggle (new molecule) + PageHeader update (node `1693:49`). Library at 45 normalized components (+ButtonToggle); Code Connect published (ButtonToggle new + PageHeader extended); build green. On `shipments/global-search`. No deploy. Figma library published by user.

## Session 49 — June 10, 2026
Short planning-only session — no code changes. Set the strategy for the Orders domain build and the model-tier discipline for the project process, then wrapped early because the user is switching from the personal Max account to the enterprise account. Two memories persist the decisions across the switch.

## Session 48 — June 9–10, 2026
A single `/normalize` cycle that produced two new components — `StepIndicator` (atom) + `Accordion` (molecule) — from a deceptively simple Figma node ("an accordion that validates filled sections"). The cycle's value was the iteration: the Figma component only modeled the collapsed header, so the full expand/validation/stepper model was discovered through the user's expanded…

## Session 47 — June 9, 2026
Design-system breadth + polish session. Backfilled the entire React explorer (5 → 42 live demos), normalized two Efrain additions (Button `icon` variant + the `Alert` molecule), normalized the Black ButtonLink tone properly, fixed a ButtonLink font-size drift, and restored the in-progress "Normalizing" panel to the explorer. All on `shipments/global-search`; build green, 80…

## Session 46 — June 9, 2026
The React Design-System Explorer — built, then immediately earning its keep. Spec → `writing-plans` → `subagent-driven-development` build of a live `/design-system` route (Atoms/Molecules/Organisms tabs rendering the REAL `@odyssey/ui` components via co-located `<Component>.demo.jsx` files), seeded with Button/Checkbox/Radio/FieldSelect/FormField. Manual verification in the…

## Session 45 — June 8–9, 2026
The Efrain component-alignment pass in depth — two full atoms-then-molecule `/normalize` cycles plus a Button variant, hardened token governance, two `/normalize` routine upgrades, and an approved spec for a React-based design-system explorer. All on `shipments/global-search`; green throughout (build + 67 tests + `tokens:audit` aligned).

## Session 44 — June 8, 2026
The GlobalSearch "search panel" arc lands: normalized the `SearchPanel` shell (the modal-pattern card) + its first content/sub-components, kicked off the Efrain component-alignment pass, migrated the Filters prototype onto the real shell, and added a second GlobalSearch entry point. Closed with an honest audit of the API data layer (no code change). All on…

## Session 43 — June 7–8, 2026
Account switch, a Shipments cleanup pass, the PR #1 merge to main, then the start of the GlobalSearch "search panel" arc: shipped the vertical-growth searchbar, prototyped the Filters/Saved view, and landed the shell-architecture decision (`ResultsPreview` → `SearchPanel` shell + content slots, the modal pattern).

## Session 42 — June 6–7, 2026
The session that put the entire Shipments surface — detail AND list — onto the real `SellShipmentOut`/grid API contract behind the mock↔live seam, so the eventual live cutover is a flag flip, not a rewrite. Two full Superpowers cycles back-to-back: Plan 2b (finish the detail-contract migration) then Plan 3 (list/grid API wiring, brainstormed → spec'd → planned → built). Ran…

## Session 41 — June 5–6, 2026
A pivot session: from GlobalSearch UI work into backend-integration groundwork, triggered by an architecture-review meeting. We analyzed the meeting, ingested the *real* OdysseyONE API contracts from Confluence, produced a production-readiness roadmap, checkpointed the working prototype, then shipped the first two increments of real API wiring — Plan 1 (the architecture pipe)…

## Session 40 — June 4, 2026
GlobalSearch composed-criteria session — the start of multi-chip search behavior. Refined ResultsPreview to reflect the *leading* search criteria, established the foundational abstraction (leading chip = result entity), shipped the empty-suggestion progression (drill by group, don't repeat the entry set), and — most durably — stood up the first automated tests in the project…

## Session 39 — June 3–4, 2026
Three arcs: (1) closed the S38 normalization carry-forward — MatchRow + ResultsPreview built in code, all owed Phase-3 sync run; (2) shipped the full GlobalSearch chip-commit flow for Shipments — attribute suggestions formatted "Attribute: query", committed chips rendered inline in the bar, ResultsPreview opens on first commit with live indexed results; (3) full Figma↔code…

## Session 38 — June 2–3, 2026
The GlobalSearch "search experience" session. Normalized FilterSuggestions (the suggestions dropdown) end-to-end, then built the functional search layer behind it (Shipments-only): a CSV-derived progression config, a lazy per-header value index, a domain adapter behind an agnostic contract, and an orchestration hook — wired into the live Shipments navbar. Iterated the…

## Session 37 — June 1, 2026
Cognizant POC continuation. The goal landed this session: take the already-converted Angular Button (POC 2's `odyssey-angular-button-demo/`) and put it into the real Cognizant repo `linx-odyssey-usermanagement-ui` — bringing the design-system foundation (tokens, typography, Inter, lucide) along with it, then swapping real PrimeNG buttons. Because `npm install` on linx is…

## Session 36 — May 31, 2026
Focused single-thread session: reworked the Home hero background. Replaced the old baked-in gradient overlay with the composed effect from the Figma "Background" artboard (Design System — MCP, node `2383:4114`), turned the static single image into a 5-image rotation that cross-fades every 2 minutes, made the start image random + shared with Login, and added per-image…

## Session 35 — May 31, 2026
Big multi-thread session: closed the FilterButton normalization cycle end-to-end, built a global cross-domain Customers feature (TrailNav handshake → popover; scrapped the Home-local impl), reworked the Home welcome header + the tracking-load-status widget, and added lazy-load entry animations (IntersectionObserver-gated chart grow-in + number count-up) with ready-but-unplaced…

## Session 34 — May 30, 2026
Single thread: ship a working quick-demo of the new GlobalSearch inside Shipments to validate the screenshot-driven UX flow end-to-end against real JSON data, *before* normalization. Three full rebuild cycles after explicit course-corrections from the user. The session's actual value isn't the code (which gets scrapped Session 35) — it's the validated understanding of the new…

## Session 33 — May 29, 2026
Closing the gap between the cross-cutting GlobalSearch canon stood up in Session 32 and an actionable Shipments-target build plan. No React code produced — pure design-intake + spec work. Three threads land: (1) an Explore-subagent audit of existing chip-shaped atoms across `@odyssey/ui` + app-local code, identifying Badge as the foundation for 4 of 5 canon chip variants and…

## Session 32 — May 28, 2026
Single-theme session: stand up the GlobalSearch cross-cutting topic from raw design materials (Tracking-demo screenshots + transcript + scenarios) to a synthesized vault knowledge artifact, then build the `/analyze` skill as the formal procedure for future multi-artifact intake. Two architectural decisions land along the way: (1) the vault is synthesis-only — raw artifacts get…

## Session 31 — May 26–27, 2026
Two main arcs in one session. Arc 1: a Slice-A audit of the Shipments route surfaces ~45 normalization gaps; instead of grinding through native-button swaps one-by-one, the session pivots to swapping 4 inline modals to canonical `ModalMedium` (a much larger win — kills ~120 lines of duplicated backdrop/dialog/close-X boilerplate, adds ESC-handling for free, transitively…

## Session 30 — May 21–25, 2026
The Cognizant POC arc. A four-day single-thread sprint orchestrated across this session + a sister Claude session running inside the cloned Cognizant Angular repo. Six gates from end-to-end repo analysis through a meeting-ready presentation outline, plus a live-data widget integration demoed to Cognizant on 2026-05-22, plus a side-by-side React/Angular Button demo built across…

## Session 29 — May 20, 2026
The Login domain start. Three /normalize cycles in rapid succession (AuthModal shell, FormField atom with switchable+toggleable trailing icon, AuthContent organism with `Variant=Login`), conditional auth gate at `/`, and a full Login → IntroMessage → Home transition driven by a phase machine in App.jsx. Heavy iteration on visual continuity, transition timing, and…

## Session 28 — May 19–20, 2026
Closing out the Home domain — the "flashy attractive part" pre-flagged in Session 27. Background treatment, sticky actions that survive scroll, edit-mode polish (grid-behind-widgets, swap-target highlight, scroll save/restore, bg fade), a staggered mount entry animation that respects below-fold cells, and a cleanup of the default widget seed to match Efrain's reference. No new…

## Session 27 — May 19, 2026
Five threads. Started with a focused Button-Disabled re-normalize, paused for a permission-allowlist audit, then a triple /normalize cycle for the three atoms needed by the Home sections feature (SectionLabel, AddSectionDivider, AddSectionButton), then the big Phase B feature work — the Home page refactored around explicit-position sections with full cross-section drag, a…

## Session 26 — May 14–18, 2026
Two distinct threads: a major Cognizant handoff meeting prep (strategic doc + visual presentation arguing for an AI-assisted React → Angular workflow), then a deep /normalize cycle that completed the Home customer flow (CustomerRow Mode axis, Badge favorite variant, SearchField Results slot, IconButtonGhost new atom replacing every inline close button, EmptyState new atom +…

## Session 25 — May 12–13, 2026
Two /normalize cycles (`ModalLarge` + `WidgetVariantPicker`, then `ModalMedium` + `CustomerRow` + SearchField extension), heavy Home edit-mode polish (action-bar swap, drag-anywhere widgets, pulse-on-insert, CTA dup prevention), Add Customers flow shipped end-to-end, plus prod deploy mid-session for a stakeholder meeting. Library at 28 normalized components (+2 organisms + 2…

## Session 24 — May 12, 2026
Marathon session — full Home "edit mode" feature shipped end-to-end: a left-side widgets panel that replaces the sidebar, navbar swap, in-grid widget reorder/remove via @dnd-kit/sortable, snapshot+revert/commit semantics, and animation replay on save. Two NEW normalized molecules (SearchField, WidgetsLeftMenu) plus two extracted sub-molecules (MenuRow with 3 states,…

## Session 23 — May 12, 2026
Wide-surface widget-family iteration capped with a full `/normalize` cycle for a new Widget variant. Spent the first two-thirds of the session closing Session 22 carry-forwards + answering a sequence of design feedback rounds on widget spacing, animation, layout, and data accuracy. Last third did the formal normalization of a brand-new variant — `3xCta` — used as a non-data…

## Session 22 — May 11, 2026
Widget-family carry-forward closeout + first cross-component interaction system. Closed every pre-flagged Session 21 carry-forward in a single session: inline-pill Badge normalization, chart-palette audit, WidgetPieChart Figma master extraction, Widget→Home wiring, hover/pressed states across 5 widget-family interactive surfaces, and a comprehensive DSM update. End state: 3…

## Session 21 — May 7–8, 2026
The Home-domain widget normalization marathon. Started as a small carry-forward sweep (PageHeader across the 5 placeholder routes), then pivoted into a full vertical slice for the Home dashboard's widget family — `WidgetMetricRow`, the `Widget` component set with 4 variants (1x / 2x / 3x / 3xChart), a `Widget content` set with matching variants, a `Button "link"` variant +…

## Session 20 — May 7, 2026
The session that pivoted the design system focus to the Home domain. Started with a small token-discipline question from the user — *"is the Shipments title using tokens for font and size?"* — which surfaced that the inline H1 in `ShipmentsRoute.jsx` was a hardcoded mess (Tailwind `text-3xl`, raw `lineHeight: '32px'`, raw `marginBottom: 25`). That triggered a full normalize…

## Session 19 — May 6, 2026
The session that built the first organism. Started as cleanup of Session-18 carry-over (Button placeholder default + DSM notification badge ad-hoc), turned into three sequential normalize cycles — TrailNav Editor mode, Ghost Button variant, and the Navbar organism — with two separate skill enforcement passes captured along the way (icon-slot convention +…

## Session 18 — May 5, 2026
The Button atom cycle. Technically: the first foundational interactive atom in `@odyssey/ui` — 3 variants (Primary/Secondary/Outline) × 3 sizes (sm/md/lg) × disabled state with optional left-icon. Politically: the longest, bumpiest normalization cycle yet, where multiple skill failures (token discipline, workflow ordering, DSM-vs-code timing) forced repeated resets and skill…

## Session 17 — May 4, 2026
Long session — the full navbar got normalized (`LeadNav` + `GlobalSearch` + `TrailNav` + `OdysseyLogo`), the Badge gained a `notification` variant, the `/normalize` skill got hardened multiple times after the user pushed back on workflow violations, Code Connect publishing became one command, and the DesignSystemMap got a Props/Tokens modal refactor.

## Session 16 — April 30, 2026
Long, multi-thread session. Three big arcs ran in sequence: (1) re-establish the post-rename design-system pipe (Figma MCP, Code Connect, permissions, tokens), (2) normalize the Sidebar atom + organism end-to-end with David's domain framing as the input, (3) stage the Supabase migration as a deferred plan rather than execute it. Several durable feedback memories landed because…

## Session 15 — April 28, 2026
Single-session execution of the umbrella migration. Two threads ran together because they were tightly coupled by Vercel project configuration: (1) collapse the shipments app into a single React-Router-driven umbrella with all 6 domain routes; (2) rename and reconfigure the Vercel project. The architecture deviates meaningfully from the Session 14 carry-forward; capturing the…

## Session 14 — April 28, 2026
Two threads: (1) Badge pushed end-to-end through the design-system pipeline (Figma library → Code Connect) as a full dry-run of the normalization workflow; (2) project name migration started — `odyssey-shipments` → `odyssey-one`.

## Session 13 — April 23, 2026
Turborepo monorepo migration. Structural change only — no feature or behavior changes.

## Session 12 — April 23, 2026
Admin + scoping session after a pause on the design system epic. No feature code shipped — focus was reconciling the backlog with current reality and mapping the boundaries of Figma push-back before committing to a normalization scope.

## Session 11 — April 20, 2026
### Gateway Knowledge Integration - Analyzed `Gateway_Project_Overview.md` — cross-referenced 4 integration flows, 47 customer gateways, and 8+ wire formats against our domain analysis - Created `shipments-documentation/Documentation/Other-Insights/Gateway_Insights_for_Shipments.md` — separated analysis file covering: - 4 integration flows mapped to our shipment lifecycle…

## Session 10 — April 15, 2026
### Bug Fixes - PGI/PGR panel crash fixed — React error #300 ("Rendered fewer hooks than expected"). Root cause: `useCallback` hook inside conditional JSX branch in App.jsx. Moved to top-level `handleScrollStart` callback. - "Sent" → "Tender Sent" — renamed in ShipmentTabs monitoring tab to match MonitorPanels card label

## Session 7 — April 6, 2026
### SHP-21: Tender Tab Rebuild (Proper Spec Workflow)

## Session 6 — April 1, 2026
### Grooming Session Analyzed - Apr 1 — Jana: MAJOR CORRECTION — Monitoring view is the same screen as Exceptions (not column-group tabs). Tender tab identical in both views. PPT slides were one table split across slides. Tender statuses simplified to 4. Shipment status mapping. Actions available in both panels.

## Session 5 — March 31, 2026
### PPT Analysis & Domain Reanalysis Extracted and cross-referenced both PowerPoint decks (`Shipments-Monitoring.pptx`, `Shipments-Exceptions.pptx`) against all 5 grooming transcripts. Major domain gaps identified and documented.

## Session 4 — March 30, 2026
### Grooming Session Analyzed - Mar 30 — Jana + Manuela review (3003-Shipment-grooming-Jana.vtt): Full walkthrough of implemented features with corrections and new requirements

## Session 3 — March 30, 2026
### New Grooming Sessions Analyzed - Mar 25 — David Johns: Spot bidding flow, PGI data flow, freight accruals, cost allocation by weight, multi-customer shipments (corrected assumption), routing guide sequential tendering, UI feedback on products/stops/instructions/documents - Mar 25 — Jana: Order→Load→Shipment hierarchy, loads hidden from users, 5 tender statuses…

## Session 2 — March 24, 2026
### Shipments Table — Last Column - Sticky last column (`position: sticky; right: 0`) with subtle left shadow - `Columns3Cog` icon in header — opens ColumnPanel side panel - `MoreVertical` (3-dot) icon per row - Column arrangement button wired to same ColumnPanel as BottomBar

---

# Project Foundations (condensed)

## Project Overview
Odyssey is a US-based logistics company building a unified platform to consolidate multiple logistics services. This project focuses on the Shipments domain — the core operational view for managing shipments, exceptions, monitoring, and PGI/PGR workflows.

## Phase 1: HTML/CSS/JS Prototype (Complete)
Fast prototyping and ideation to translate stakeholder requirements into a working demo. Served on `localhost:3005`.

## Data Generation (Complete)
### Problem All tab content was hardcoded in HTML — data inconsistent across tabs, impossible to scale.

## Domain Analysis (Complete)
### Files (`Idea visualization/`) | File | Purpose | |------|---------| | `index.html` | Interactive domain visualization (7 tabs) | | `shipments-domain-analysis.md` | Written analysis with Jana's quotes |

## Phase 2: React Migration (Complete)
### Stack | Tool | Version | Why | |---|---|---| | React | 19 | Component architecture | | Bun | 1.3.10 | Fast runtime, bundler, package manager | | Vite | 8.x | Dev server + HMR | | Tailwind CSS | v4 | Utility-first, CSS-first config | | lucide-react | Latest | Icon library (from design.md) | | CSS Custom Properties | Modern | Design tokens from design.md |

## Design System Epic: Colors (Complete)
Figma source: `https://www.figma.com/design/1kXenKxAqgxNmB36HERhvk/Test-MCP`

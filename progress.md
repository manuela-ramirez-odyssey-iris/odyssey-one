# Odyssey Shipments Domain — Progress

> **Note:** Sessions ≤81 are condensed to one-line summaries. Full narratives archived at `vault/99-archive/progress-full-archive-2026-07-14.md` (and in git history). Component detail lives in `playground/normalization-tracker.md` + the DSM route + vault decision logs.

## Session 107 — August 3, 2026

**THE FILTERS-CONTROLS + FIX-ROUND SESSION — opened by RECOVERING a lost session: the S107 spec (committed as `60915b7`) had been fully executed before the crash and sat uncommitted in the working tree, so the session's first act was reconstructing that awareness from the diff, then building on it with a user-driven review round.** Delivered: filters view on normalized controls, the `MM/DD/YYYY` date canon, DataTable's `loading`/`loadingRows` split (all recovered), then SummaryStrip lead-truncation (two rounds), the Shipments **History tab** built ourselves with Jira contrast, and **three GS-22 search-behavior refinements** — every fix Sonnet-implemented via subagents. Tests: app **419 → 426**, ui-package suites green (SummaryStrip 4, DataTable + DatePicker 110). Nothing deployed, no DB touched.

- **Recovered pre-crash work (verified green, then built upon).** Filters view swapped off prototype stubs onto normalized controls per spec — ComboBox (`variant='select'`, `getAttributeValues(dataKey, query)` new on the adapter), FormField, **DatePicker ×2 per date attribute** (single + range), multi-select enum chips packed as a GS-12 comma IN-list (no new chip kind), two-column pairs, and live-mode letters fields degrading to plain free-text (the "No matching values" panel misread as "value doesn't exist"). **Date canon `MM/DD/YYYY` platform-wide** for every slashed numeric date (matches the current Odyssey system + LINX-8120) via a new `apps/odyssey-one/src/lib/dates.js` seam — the long alphanumeric tier stays sanctioned, **region-switching HALTED** until a real regional user model exists; DatePicker's default `format` flipped (+ the `04//3202` caret bug fixed). **DataTable `loading` vs `loadingRows` split** — whole-table centered Spinner with rows suppressed (initial mount) vs stale rows rendering "Loading…" (S106's cell-blanking reverted).
- **SummaryStrip → 0.7.1, NORMALIZING (React DSM).** `truncate: 'lead'` per item for Tracking Link (pure CSS rtl/ltr flip + `<bdi>` so URL punctuation can't reorder, `title` for the full value, 280px cell). Round 1 added truncation but the band **still horizontally scrolled** — round 2 root-caused it: `overflow-x: auto` was the scrollbar itself and cells were `flex: 0 0 auto; min-width: 152px`, an inviolable floor. Now `flex: 0 1 152px; min-width: 0` with tail-ellipsis, `overflow: hidden` as backstop. **Browser check owed** — cells no longer grow past the 152px basis, which jsdom cannot prove.
- **History tab rebuilt ourselves (DEC-70) — Efrain unavailable, so built to our conventions with the Jira contrast run first.** Sources: `domain-analysis.md` §9 (Jana Mar 25: audit trail, "who changed what and when"; directive "Jira-style audit entries") + **LINX-13065** "Shipment View - Audit Log" (Buy & Sell, must log **PGI errors corrected** and **quotes entered**) + **LINX-8091** order-level audit AC as precedent. Shipped: static (non-collapsible) SubAccordion in a Notes-width column, tokenized `styles/panes/history.css` replacing every inline style, absolute **`MM/DD/YYYY HH:MM` 24-hour** timestamps through the `dates.js` seam (verbatim LINX-8091, `timeAgo()` deleted), **User|System actor split** (ERP/UI/Legacy TMS/Linx + gray "System" badge), and the two LINX-13065 events added to the generator (local JSON regen, seed 42 — **not** a Neon reseed). **Our calls, flagged in the decision log:** entry-timeline kept over the order-domain **tabular** AC (Jana said "entries"; LINX-13065 has no UI AC), and our 4-category badge model kept rather than force-fitting the order Action/Event + Category taxonomy onto shipments. Seam traced, not guessed: `historyList` → DTO → `historyData.entries`. Five-item review round followed (static, no info icon, the skipped `pane-canvas`/`pane-col` wrapper, the trailing rail line that always ran past the last dot → per-entry `::before` scoped `:not(:last-child)`, and narrow width).
- **Three GS-22 / Case 12 search refinements, all user-found in live use, all documented in `composed-criteria.md`.** (1) **Reopening a committed date chip no longer closes the results panel** — an open chip now suppresses the panel only while it has no date yet (`!from`); a reopened chip leaves `resultsOpen` untouched, with the first-commit-expanded path regression-guarded. (2) **Reopening the calendar no longer re-fires the search** — root cause: the search effect depended on the chips array by IDENTITY, and `onDateToggle` mints a new array just to flip the UI-only `open` flag; now keyed on a memoized serialization of the search-relevant fields (`open`/`monthHint` excluded). (3) **Selecting a shipment is a pure dismissal — no commit, no search** — the subtle part was a race: `SearchChip`'s outside-click commit lands on a separate React commit from `mousedown`, so the chip-close effect could flush AFTER `handleMatchClick`'s `closePanel()` and reopen the panel behind the user's selection. A `dismissRef`-guarded `dismissSearchUI()` now closes any open calendar + the panel on match-row clicks and clicks landing on `.shipments-bar`; every other outside click still commits per the S106 rule.
- **Efrain token flags DROPPED (user ruling → memory `feedback_efrain_mock_tokens_our_job`).** His mocks don't dictate our tokens — mapping mock values to canon is OUR intake job, never a pending flag back to him (killed the CB/500 and DSN/950 carry-forwards). Structural questions survive: what the Tooltip/MatchSimpleRow rework intended.
- **Ops lesson: a "connected" MCP server can be entirely dead.** Atlassian Rovo showed ✔ connected with 40 tools while **four consecutive calls** — including the no-arg liveness probe `getAccessibleAtlassianResources` — went silent for 300s and were reaped. Browser reconnect + `/login` fixed it; then use the **UUID** cloudId (`323d3152-…`), and route big JQL results through `jq` on the persisted tool-result file rather than into context.
- **Carry-forwards / open:** **Angular catch-up batch owed** — SummaryStrip 0.7.1, DatePicker format flip, DataTable `loading`, GlobalSearch family (all NORMALIZING) · Figma `Type=Date` variant on `4871:7334` · per-needle live validation endpoint + live `getAttributeValues` (returns `[]` today) · Mixed-Set wording · **browser check owed on SummaryStrip's shrink behavior** · a later audit may REMOVE some filters text inputs entirely (user).

---

## Session 106 — August 2–3, 2026

**THE SEARCHCHIP + DATES SESSION — Scenario 2 (bulk/multi-search) shipped end to end, Figma-first: the SearchChip molecule born (Single/Set/Date modes), the Spinner atom normalized, GS-21 + GS-22 specced/wired/deployed with the server learning date-range column filters, the Filters view wired BOTH directions, hazmat made system-driven, Spotboard removed, TWO angular-porter subagents shipping twins (final CDP-driven QA), and the batch RELEASED as @oneodyssey/ui 0.12.0 (PR #14) — plus an uncommitted 0.11.0 release recovered from the Angular working tree.** Tests: app **643 → 685**, api `_lib` **97** (+5 date-SQL), Angular **1031 lib + 52 explorer**. Prod deploys ×2 motions (user-authorized), Code Connect republished, Figma library republished by user.

- **SearchChip (GS-21 / Case 11), Figma-first after a called-out order violation.** Intake of Efrain's mock (`1044-31186`) found two token flags (local `Carolina Blue/500` not in canon → mapped to 400; file's DSN/950 = `#0B1629` vs canon `#0F182A`) and a bare FRAME, no master. I coded first; the user corrected the order — master then built in Design System - MCP (`4871:7334`, GlobalSearch section): `Type=Single|Set × State`, `Label`/`Summary`/`Codes` TEXT + `Show invalid` BOOLEAN, canon chip family (DSN/700/100 over the mock's 600/200), X at canon 12px. React: `packages/ui/src/SearchChip.jsx` — set summary counts VALID codes only (named-set rule = every valid code's best match agrees), EditableMiniPanel 4px below (chips-row clip escaped via `:has()`), click-to-edit **at the clicked caret** (`caretRangeFromPoint`), commits on Enter/collapse/**outside click** only, invalid codes red+decounted, X remove, chips chain. Wording open: **"Multiple Set" vs my recommended "Mixed Set" — user to decide.**
- **Spinner normalized from Efrain's loose gradient frame** (`4710-6673`, raw grays) → recolored to variable-bound DSN shades + componentized (`4876:7331`); React = pure-CSS conic ring masked to the stroke, 900ms **linear** (continuous rotation must not pulse), reduced-motion slows to 2400ms instead of freezing. Wired: results-panel loading (the `searching` flag deliberately starts at the **debounce window**, not the fetch — the panel was claiming "No results" about a query it hadn't run), ShipmentTable initial load, Orders initial + `isFetching` → DataTable's new centered `loadingRows` overlay (per-cell "Loading…" text removed).
- **GS-22 / Case 12 — dates, iterated live with the user across ~8 fix rounds.** Slashed input (`12/`) → "Filter by date" chips, each date attr twice (plain + Range), **masked like any other criterion** (`Pickup Date: 12/../....`) with partial pre-fill (month+day defaults year to current; first segment >12 = day-in-current-month; month alone steers the calendar via `monthHint`, which must drop out once `from` exists — the reopen-jumps-to-December bug). **Invalid dates** (`40/`, `2/30/2026`) suggest and commit as red non-openable "Invalid Date" chips. Committing lands the chip EXPANDED with **CalendarPicker as its own card** (no panel chrome — user corrected the double-box). Open state lifted into chip data (SearchChip gained controlled `open`/`onOpenChange`) so the rule "quick results ONLY when the chip closes — chevron / Enter / outside click" has one source of truth; partial-date typing also suppresses the panel. Empty focused bar now offers the date section titled **"Type or Filter by date"** — the user's deliberate carve-out from GS-14. **Server:** `pickup/delivery` were never projected into search_index (S105 deviation 2) so date chips fell to honest-empty ("no matching results" on a real pickup date) — `search.mjs` now routes `kind:'date-range'` chips to **column filters** on `pickup_ts`/`delivery_ts` (three shapes: date-alone hit set from the shipments table, date+text, date+indexed-chip), M/D/YYYY→ISO, `[from, to+1day)`. Verified live post-deploy: date-only = 59 shipments; date+`10039336` = exactly the Kemira row. **Single-date semantics confirmed as the domain default** (one-day range, shipment grain) — logged verbatim.
- **GS-21 wiring:** `resolveCodeSet` (GS-20 phrase gate → per-code validity → named-set rule) upgrades a code-list text commit to a Set badge; `validateCodes` powers rule-7 **type application** ("Define set type" section for untyped sets → typed GS-12 IN-list chip, non-matching codes red+decounted); GlobalSearch renders `kind:'set'|'date-range'` chips through SearchChip. Live-mode bugs found by the user's own testing: the live adapter's `getSuggestions` override knew nothing of the date branch (config-only → delegate to base), and resolveCodeSet/validateCodes still run against local seed data on live — **per-needle server validation endpoint owed**.
- **Filters view wired BOTH directions + saved profiles.** Inbound: date chips fill the date-range inputs (ISO `from|to`). Outbound: "Show N results" merges edited values back into chips (emptied → removed; unchanged → ORIGINAL chip object preserved so set/date metadata survives; untouched attrs keep chips) and commits to the table; **Saved rows are clickable** and REPLACE the bar (a profile is a whole search) — seeded "Early-April Pickups -- FXFE" proves the date path. Empty-bar suggestion title renamed twice on user feedback → "Type or Filter by date".
- **Code Connect republished after two blockers:** expired token (user refreshed), then the **Tooltip master found repurposed** — renamed `MatchSimpleRow/ModalFooter/Tooltip`, ALL property definitions stripped (recreate-from-detached signature; anatomy survived). Restored the 5 props + bindings + re-exposed the Badge in place; mapping validates again. New mappings: SearchChip (per-Type) + Spinner. **Ask Efrain what the MatchSimpleRow rework intended.**
- **Angular: two porter subagents, both with real verification.** Spinner twin (HostBinding host-is-the-ring, 12 specs; visual rotation honestly flagged unverified — no browser tool). SearchChip twin ×2 (initial + same-day date-mode catch-up after the React canon moved) — second run drove the live dsm-explorer over raw CDP: calendar mount/pick/close, set-chip edit cycle, 1:1 with React. **Released 0.12.0** via `tools/release.mjs` (+ the recovered, fully-written-but-never-committed **0.11.0** GroupTable-nested/ActionMenu-pressed batch found in the working tree) → CHANGELOG prose, tracker rows, **push + PR #14** (user-approved final approval). No npm publish — Cognizant's.
- **Unrelated fixes:** Tracking Link renders protocol-stripped (display-only, no reseed) · **Spotboard removed** (route/page/sidebar/icon; domain canon + Kathleen fight stay open — memory updated) · **Hazardous flag fully system-driven (ORD-12)** — checked ⟺ ≥1 hazmat product line, both directions, checkbox permanently disabled; tightens LINX-12102, **flag to Ramesh**.
- **Staging state:** SearchChip + Spinner **released/promoted** (0.12.0 both DSMs). **GlobalSearch, GlobalSearchPanel, DataTable = NORMALIZING both DSMs** (wiring modifications — Angular catch-ups owed next batch). **Figma `Type=Date` variant owed on `4871:7334`.**
- **Ops lessons:** `| head` SIGPIPE'd a backgrounded `ng serve` and the harness reaped a second one — third run detached via `nohup`+`disown` · the localhost "live mode" proxies `/api` to the DEPLOYED function, so server fixes are invisible until a deploy (bit us once) · `vercel deploy --prod` retried twice on swallowed output = 2 extra harmless deploys.
- **Next session (user): the Filters tab needs COMPONENTS** — the controls are still prototype stubs (DropdownStub, raw inputs, single-select enum chips) pending normalized Dropdown/ComboBox etc. Also open: Mixed-Set wording · Figma Type=Date variant · GlobalSearch-family + DataTable Angular catch-up batch · per-needle live validation endpoint · Efrain flags (CB/500, DSN/950, Tooltip master).

---

## Session 105 — August 2, 2026

**THE SEARCH-SHIPS SESSION — the entire S104 plan executed (Track A by the main loop, Tasks 9/12/13 by Sonnet subagents under two-stage review), the plan itself review-corrected first (9 findings), ONE combined Neon reseed (user-delegated), and TWO prod deploys — live search works end to end on odyssey-one-stage.vercel.app for the first time, browser-verified.** Tests: app **631 → 643**, api+tools node:test **120**, db 2, tsc clean. 20 commits. Reseed ×1 + deploy ×2, both user-authorized. Model policy updated: **enterprise account = Sonnet implementers / Fable judgment** (memory `feedback_model_tier_policy` rewritten per-account).

- **Track A (Tasks 1–8) executed directly, with FIVE plan defects corrected in flight:** registry priorities off-by-one vs `progression.js` (now pinned by `registryParity.test.js`, mutation-verified); routes registered WITH the `/api` prefix that `index.js` strips (every search would have 404'd — a ROUTES-wide guard test now bans the class); `buildSuggestQuery` wrapping `buildSearchQuery` (inherits `DISTINCT ON (entity_id)` → hides attributes; its GS-20 gate compared entity count to needle count — now a shared hits builder + `count(DISTINCT needle_ix)`); the live adapter returning no `panel`/display fields (GS-18 dead + near-empty rows → registry-driven hydration of the ≤15 hits); `getCategoryCounts` live branch never sending criteria (badges would contradict the grid). Every SQL shape executed against real Postgres in rolled-back transactions before commit. Plus Task 10 (Tracking Link end-to-end — URL shape INVENTED, decision-log entry owed), Task 10b (stop `appointmentTime` hardcoded ` CST` + shared appointment hour — one hoisted `stopTz`/`stopAt` per stop, no faker-stream shift), and Pickup # (order-header reference → `pickup_numbers text[]`, projection attr 15, "Find the shipment" group, ColumnPanel + table column NOT default-visible per user).
- **The Fable review pass on the remaining plan found 9 defects before execution** — headline: Task 13 targeted a phantom endpoint (client posts `/order-service/v3/manual-order`; drafts share it via `orderStatusCode`) and its confirmation step was ALREADY BUILT (`ConfirmationView` early-returns without an order number, so the server must assign + return it immediately); Task 9's own snippet set `lastEditedBy` before `row.lastEditAt` exists (always-null → reseed probe fails); `users` had no username column so `updateOrder` could never stamp the editor; R2-3 got a wire-format decision (zone codes as SIBLING columns `created_tz`/`last_edit_tz`, LLD `*TimeZoneCode` pattern — naive timestamps unchanged so live≡mock wall times); Task 12's Hazardous half was mostly already built (real gaps: `listRowToManualOrder` drops `row.hazardous` on lean rows + no per-line View column); Task 14's probes were stale (14 attrs → 15). Plan rewritten, THEN executed.
- **Subagent-driven execution (superpowers), Sonnet implementers + Sonnet spec-review + Fable quality-review per task.** T9 (usernames via `usernameFor()` over the 12 non-guest seeded users — D1 resolved: INVENT until user-management exists; `Last Edited By` Draft column; zone appended to created/lastEdit display) — quality review caught the COALESCE misattribution (a row claiming an edit by someone who didn't make it → honest-NULL). T13 (create persists: sequence-minted ids via `nextval(pg_get_serial_sequence)`, blank number → 13-digit `lpad` in-statement, `deriveOrderProjection` shared with update, 23505→409, 23503→400) — spec review executed the INSERT against Neon rolled-back. T12-Hazardous (one-line seam stamp + per-line View column reusing the amber Badge idiom; side effect verified coherent: Shipments' OrderTab gains the column with real data) — render assertion mutation-verified.
- **The final whole-span review earned its keep twice.** (1) **Live search dropped committed chips** — a PLAN-level hole (S104's Task 6 never consumed them; no per-task review could see it). Fix took THREE rounds, the reviewer twice proving the "fix" still 500'd live: `WITH hits AS ()` on a non-projected chip (Mode/Tender Status — 10 UI-committable attrs aren't in the registry), then pg `42P18` unreferenced-param. Pure tests had asserted SQL TEXT, not executability — `assertAllParamsReferenced` now guards every builder test, and non-projected chips degrade to honest-empty (S79c convention). Chips now: entity-set INTERSECTIONS (GS-12 IN-list within a chip), text+chips AND, counts GET carries `searchChips` JSON. (2) Confirmed live-created orders absent from search is BY DESIGN (search_index indexes shipments; unshipped orders were never in it).
- **Reseed (Task 14) — ONE combined motion, user-delegated:** migrations 001–005 + full seed → 10,000 shipments / 24,057 orders / **162,818 search_index rows** / usernames / zones / pickup numbers / tracking URLs. **All 15 corrected probes PASS**, including "every `created_by` resolves to a real users row" and "editor/edit-time travel together".
- **Deploys ×2 from a CLEAN WORKTREE at HEAD** — the concurrent session's uncommitted GroupTable/Spotboard work never shipped. Browser verification against the DEPLOYED site caught two more latent bugs no test tier could: **(1)** the live adapter posted `/api/v1/search` but `apiPost` prepends `VITE_API_BASE_URL=/api` → `/api/api/...` 404 and the preview degraded to "No matching results found" (THIRD `/api`-prefix occurrence; `liveAdapter.paths.test.js` pins the class); **(2)** **GS-18's landing jump never existed** — `git -S` proved S104 shipped `landOnPanel` + setter + a comment promising a "render-time panel jump below" that was never written (`bestPanelForSearch` imported and unused). Now: pure `landingPanel()` (tested, incl. the exact live repro) consumed render-time after the new counts arrive, one-shot. Final browser pass: paste pro → resolved preview → commit → **lands on Monitoring** with narrowed permanent tabs → table = exactly the preview's rows, 0 console errors.
- **Carry-forwards / open:** ⛔ Task 11 (LINX-13893 columns) + Task 12 Appointment half stay HALTED (user asking) · shipped-order PUT doesn't reproject `shipments.pickup_numbers`/search_index (boundary ruling needed: are edits legal on shipped orders?) · non-projected chips don't restrict in chips+text (upgrade path in `buildHits` comment) · mock's order-row explosion for order-scoped leading chips = documented live deviation · **decision-log entries OWED** for the invented bits: usernames (`usernameFor`, deviates LINX-11663), tracking-URL shape, consignor-city as created/edit zone source, `Last Edited By` column vs LINX-11663's Draft set.
- **Next session (user): keep expanding + defining the search functionality.** Candidates from this session's own residue: the non-projected-chip upgrade path (project the 10 attrs or route enum/measure chips through FIELD_MAP), order-row explosion parity, orders as their own search domain (registry is multi-domain by construction), suggest-with-committed-chips semantics.

---


# Session Index (condensed)

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

# Odyssey Shipments Domain — Progress

> **Note:** Sessions ≤81 are condensed to one-line summaries. Full narratives archived at `vault/99-archive/progress-full-archive-2026-07-14.md` (and in git history). Component detail lives in `playground/normalization-tracker.md` + the DSM route + vault decision logs.

## Session 86 — July 14, 2026

**Maintenance session — progress.md compaction.** progress.md cut 7,088 → ~330 lines: sessions ≤81 condensed to one-line summaries in a sorted "Session Index (condensed)", project foundations condensed at the bottom, stale duplicate "Current State"/"What's Next" sections dropped. Full pre-compaction narrative archived at `vault/99-archive/progress-full-archive-2026-07-14.md` (plus git history). Rationale: component detail already lives in `playground/normalization-tracker.md` + the DSM route + vault decision logs — progress.md now carries only session narrative + carry-forwards. `/wrap` skill updated with a rolling-compaction rule (3 newest sessions stay verbose; older ones collapse into the index at wrap time). No code or Angular library changes — no version bump/publish needed; not deployed.

---

## What's Next (S87)

Unchanged from S86 — the compaction consumed the session:

1. **Grow the batch** (user-named): add more components, then run the Angular batch port THROUGH the new automation as its validation run — staged APPROVED set: CalendarPicker, DatePicker (code-only), useFieldPopover, SearchField typeahead, FieldSearchResults, MatchSimpleRow, DataTable (S82 scrollbar + S85 sorting/width/tooltip), ShipmentsBar (S82 stages). `@tanstack/react-virtual` Angular adapter needed for FieldSearchResults parity.
2. **Review the automations in use** — scaffold-port/dsm-flags/release/verify-all get their first real exercise; tune whatever chafes.
3. Decide Shipments `sortable` on/off for the demo build; date-column sort parsing if it matters.
4. Carried: PR #11 watch (merge → Cognizant 0.7.0 publish → branch cleanup → `domain-usage.json` call), TimePicker + MiniMultiselect (blocked on Efrain), ActionMenu cell-click flicker, stickyTop measured-toolbar, 9.3MB chunk code-split, `.worktrees` disk cleanup (~430MB, confirm dead first), 3 real API gaps from the drift audit (checkbox `defaultChecked`, navbar `trailRef`, trail-nav `onMenuClick`).

---

## Session 85 — July 14, 2026

**Two-arc session. Arc 1 (DataTable sorting + width model): opt-in column sorting shipped and iterated to spec (3-icon signaling, asc↔desc with one column always driving, auto-seed), the whole column-width model rebuilt (header-fits default, 290px cap, drag floors, font-race + shrink-to-fit measurement fixes, resize-jump root-caused), a truncation Tooltip feature, and the per-instance feature-switch API (`sortable` / `truncationTooltip`) — APPROVED, live on Shipments, documented in usage.md + a new DSM details-modal API tab. Arc 2 (process automation): 10 scripts now own the mechanical normalize/port/release steps, and the Angular DSM presentation drift is measured, mostly repaired, and lint-guarded from here on.**

### Arc 1 — DataTable sorting + width model + tooltip (all APPROVED, awaiting Angular port)
- **Sorting (opt-in `sortable` prop):** header toggle buttons, asc ↔ desc only — **one column always drives** (no unsorted step; shell auto-seeds the first sortable column asc when the consumer hasn't). Icons per spec: `arrow-up-down` neutral (DSN/400 — one tone below tertiary) / `move-up` asc / `move-down` desc (driving+hover `--text-primary`); `aria-sort`; system columns opt out via `enableSorting: false`. Client tables need 2 touches (`sortable` + `getSortedRowModel`); server tables map `sorting` → query (ShipmentsRoute pattern: `sortBy`/`orderBy` → gridService, numeric-aware localeCompare, page-0 reset; date columns still sort lexically — flagged `ponytail:`).
- **Width model (iterated to user criteria):** default = `max(header label, cell content)` with body-driven part capped at new `MAX_COL_WIDTH` (290 — past it content ellipsizes; header label never capped). Root-caused two real bugs: pass-1 `width:auto` is shrink-to-fit → columns compressed BEFORE measuring on overflow-wide tables (now `max-content`), and the web-font race locking fallback-font widths (now re-measures on `document.fonts.ready`). Header labels measured via a wrapper span/sort button + cell padding. Drag floors: `MIN_COL_WIDTH` 54 every resizable column / `SORT_MIN_WIDTH` 74 (drag-only, defaults untouched). **Resize drag rebuilt shell-owned** — starts from the VISIBLE colgroup width (TanStack's handler captured the injected default 150 → the "jump to preset" bug); `columnResizeMode` now inert.
- **Truncation tooltip (opt-in `truncationTooltip` prop):** hover on a body cell whose ellipsis hides >1 word → normalized Tooltip with full text; checks descendants (inner wrappers); cells with own tooltips skipped via new `data-tooltip-trigger` stamp on TooltipTrigger. **App-local `TruncatedText` deleted** (stale mount-time overflow check — the "tooltips not showing" root cause).
- **Grip fixes:** `z-index: 2` (last data column's grip painted under the sticky action column) + `--edge` modifier insets it 6px clear.
- **Wiring/docs:** Shipments runs `truncationTooltip` (sorting plumbing wired but `sortable` currently OFF after the switch-test — one prop turns it back on). `DataTable.usage.md` written (React twin of the Angular usage doc); demo restructured to convention (Playground with feature-switch + data-population controls [rows 32–5000, long-content], Anatomy below); **DSM details modal grew a tab bar** — demos exporting `apiDoc` get a Props & Tokens | API split (collectDemos + DetailsPanel + CSS). CalendarPicker demo renamed "CalendarPicker + DatePicker" with DatePicker anatomy/docs (it's a standalone `@odyssey/ui` export — discoverability fix). ShipmentsBar APPROVED (S82 three-state mod).
- All verified live via headless Chrome against localhost (resize/floors/tooltips/sorting/API toggles). React tests 372→**379/379**.

### Arc 2 — Process automation (token-spend review of /normalize + /port-to-angular)
- **10 scripts now own the mechanical steps** (all dep-free node/bash, dry-run modes, 65+ unit tests, routine docs updated to call them; memory `project_s85_port_automation_tooling` records the toolkit):
  - `tools/dsm-flags.mjs` (badge lifecycle + version stamps, BOTH DSMs, createdVersion-only-if-new) · `tools/release.mjs` (batch closer: flags/versions/pkg bump/CHANGELOG skeleton) · `tools/port-readiness.mjs` (port Phase 1 gather) · `tools/scaffold-port.mjs` (10-file port skeleton + 4 wiring edits; Angular demo skeleton generated FROM the React demo) · `tools/verify-all.mjs` (full verification matrix → scoreboard) · `tools/scaffold-normalize.mjs` (new-component boilerplate: stub + .figma.tsx + index.js export + CSS block + demo skeleton) · `tools/token-check.mjs` (Figma-value → token classifier w/ nearest suggestions) · `tools/connect-publish.sh` · `tools/wrap-commit.sh` · Angular `tools/demo-parity-lint.mjs` (+ `npm run lint:demo-parity`, `--fix-tokens`).
  - **Root vitest noise fixed** — root `vitest.config.mjs` excludes `.claude/worktrees` mirrors; root run now a clean 379/379.
- **Angular DSM drift (user's named pain) measured + repaired:** lint baseline 64/72 demos drifting → approved convention exemptions (past-tense/`xChange`/`xClick` outputs, `has*/show*` gates, `interactive`, icon↔slot/`xIconName`, aria/style/rest passthroughs, TemplateRef↔render-prop, nested-handler hoists) → `--fix-tokens` rewrote **43 Angular token tables from React canon** → cleanup pass aligned 13 demo HTMLs' section titles + doc rows both sides. **Final: 8/72 failing = 5 pending-port components + 3 genuine API gaps** (checkbox `defaultChecked`, navbar `trailRef`, trail-nav `onMenuClick` — future port items). Drift is now a lint failure inside verify-all, not a two-window discovery.
- Figma library published by user (post-CalendarPicker/MatchSimpleRow/ShipmentsBar edits).

### State
- React **379/379** · build clean · demo-parity 8 known-red · NOT deployed this session.
- Angular repo: tooling + demo repairs committed **locally only** on `port/s76-search-batch` (no lib component changes → no version bump needed; PR #11 still awaiting Cognizant).
- DataTable + ShipmentsBar stamped APPROVED — staged for the port batch.

---

## Session 82–84 — July 9–14, 2026

**Two-arc session. Arc 1 (Shipments search): Order Count added to the search progression (+ exact-match semantics for count chips) and search-result clicks now open the chip-mapped ShipmentsBar tab via a shared CELL_TAB_MAP (mirrors S82's cell→tab wiring, which this wrap also lands). Arc 2 (field components): CalendarPicker normalized end-to-end (Figma rebind + React + DSM, APPROVED), DatePicker + useFieldPopover extracted as code-only composites, and the Autocomplete saga — built on FormField, team-corrected onto SearchField, folded in as typeahead props, then reworked to render through FieldSearchResults with MatchSimpleRow (new Figma booleans + hover fix). All approved; 366/366 tests.**

### Arc 1 — Shipments search wiring
- **Order Count searchable** — was missing from `SHIPMENTS_PROGRESSION` entirely (data + grid had it, search vocabulary didn't). Added to Shipment Identifiers with `exact: true` — count chips (`orderCount`, `loadCount`) now match by full equality ("2" no longer matches 12) in both the glimpse and the committed table filter (shared `matchesChip`). +2 tests.
- **Search-result → tab navigation** — `CELL_TAB_MAP` extracted from ShipmentTable into shared `cellTabMap.js` (+ dataKey aliases pro/equipment/seal/load → column keys). Match-row clicks derive the tab from the LEADING chip (same rule as the adapter's result entity): Order Count → Orders, SCAC → Tender, Consignor → Stops, etc.; customerId/Name carry expandGeneral. `handleSelectShipment` extended `(id, tab, expandGeneral)` — always selects, never toggles off.
- Also lands the previously-unwrapped **S82 cell→tab work** (BottomBar/OrderTab/ShipmentTable `requestedTab` wiring, tab-link hover tint, mapping validated via cell-tab-mapping.xlsx round-trip).

### Arc 2 — Field components (Efrain's Autocomplete / Calendar / Time / Multiselect ask)
- **Strategy settled**: typeable field composites are FormField- or SearchField-shelled with shared popover behavior — NOT Dropdown variants (Dropdown stays button-select; the panel components are the shared part). TimePicker + MiniMultiselect PARKED awaiting Efrain (3-column panel master; chips-vs-count).
- **CalendarPicker** (Figma 4422:711, `/normalize`d): 5 illegal/foreign tokens rebound at source (DSN palette, `label/sm` styles 15→14px, Radius/lg, shadow → `shadow/panel` after user pick), single/range modes (single = DSN/700 all-corners; range = pending-start ring → caps + DSN/200 band), minDate/maxDate (01/01/1900–01/01/2120, disabled days + nav stops), adjacent-month nav. **APPROVED.**
- **`useFieldPopover`** — extracted hook: focus-open, mousedown guard, blur-outside/Tab/Esc close, Enter commit+defocus, aria-haspopup/expanded. Debugged live in the DSM before extraction (5 iterations: Safari blur race, caret restore, segment-carry mask, pair-deletion auto-01, Enter/Tab a11y).
- **`DatePicker`** — code-only composite (FormField shell + CalendarPicker + dd/mm/yyyy mask with segment-carry/auto-01/caret-restore/bounds). 9 mask edge cases as unit tests.
- **SearchField typeahead** (the Autocomplete arc): built as `Autocomplete` on FormField → Efrain/dev redirect → **folded into SearchField** as additive props (`options`/`loadOptions`/`onSelect`/`filter`/`emptyMessage`/`rowProps`) — zero impact on the 6 existing consumers. Rendering then reworked to go through **FieldSearchResults** (owns virtualization via new dep `@tanstack/react-virtual`, `activeIndex` + option ids, `rowProps` passthrough) with **MatchSimpleRow** rows — new Figma booleans `Show avatar`/`Show additional info` (bound across all 3 State variants) mirrored as `showAvatar`/`showInfo` props; typeahead rows default compact (both off). Root-cause fixes: hover gating moved `[role="button"]` → `--clickable` class (role="option" rows now hover/press), missing `.is-active` CSS added, virtualizer `scrollToIndex` follows keyboard highlight. Panel chrome unified on `.field-search-results` (8px gap per Efrain's updated 1959:76 layout).
- **Conformance suite**: `SearchField.conformance.test.jsx` against a real apis.guru fixture (2,529 entries, committed at `packages/ui/src/__fixtures__/`) — WAI-ARIA combobox conformance, special-char robustness, virtualization regression guards. Caveat: jsdom renders 0 virtual rows (no layout) — true perf check is the DSM 10k playground in-browser.
- **DSM**: CalendarPicker demo (Schematic + DatePicker-composite Playground), SearchField typeahead anatomy+playground merged (double-nested legend: FieldSearchResults → └ MatchSimpleRow, compact-default documented), MatchSimpleRow toggles.
- **APPROVED (GATE B)**: CalendarPicker, SearchField, FieldSearchResults, MatchSimpleRow — all staged NORMALIZING+APPROVED awaiting the next Angular batch port.

### State
- React tests **366/366** (app-dir run; root-level vitest has pre-existing config/load noise from `.claude/worktrees` mirrors — cleanup still queued) · build clean · NOT deployed this session.
- New dep: `@tanstack/react-virtual` (packages/ui) — consistent with the TanStack table strategy.
- `domain-usage.json` edit still parked (awaiting the S81 call).

---

---

# Session Index (condensed)

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

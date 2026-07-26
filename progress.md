# Odyssey Shipments Domain — Progress

> **Note:** Sessions ≤81 are condensed to one-line summaries. Full narratives archived at `vault/99-archive/progress-full-archive-2026-07-14.md` (and in git history). Component detail lives in `playground/normalization-tracker.md` + the DSM route + vault decision logs.

## Session 93 — July 24, 2026

**Buy-shipment-as-ID executed (Jira-confirmed), plus DB slices 3/3b shipped under fire — shipment detail + order view endpoints built after live-mode gaps surfaced in prod.** Tests: app **510/510**, api node:test **18 → 22/22**, tsc clean. 4 prod deploys; DB reset + reseeded (9/9 invariants).

- **Buy-shipment confirmation (Atlassian MCP, Odyssey account):** LINX-11591 "Display Shipment Fields in Grid – Story 1/7" (Done; Steve O'Hara approved 6/15) leads its approved field list with Buy Shipment; LINX-12490's orders-popup endpoint is `GET /action/get-orders/{buyShipmentId}`; LINX-13023 built the Monitoring grid buy-first. Honest caveat logged: inference from approved column order + buy-keyed APIs — no ticket says the literal sentence.
- **4-step plan executed → DEC-66:** (1) `DEFAULT_COLUMNS`/`EXCEPTIONS`/`MONITORING` presets now buy-first (`ColumnPanel.jsx`, comment cites the tickets); (2) `genUniqueBuyShipment()` in the generator + `UNIQUE` on `shipments.buy_shipment` + regen (2200/2200 unique) + Neon `--reset --yes` + reseed (10,000 shipments / 23,246 orders / 45,091 tenders, 5m30s, verify-seed 9/9); (3) sellShipment untouched as internal wire key (DB PK, row key, detail-link token); (4) DEC-66 in the decision log, superseding the S43 sell-first display order only.
- **INCIDENT + lesson:** the reseed desynced prod (its old static `public/details/` no longer matched the new DB list) — reseed and deploy must ship together, the DB is shared with prod. And it *surfaced* a pre-existing bug: shipment detail clicks had 404'd in live mode since the S92 flip (`sell-shipment-out/{id}` endpoint never existed; the S92 E2E checked list numbers, never a detail click).
- **Slice 3 — shipment detail endpoint:** `GET /shipment-service/v1/sell-shipment-out/{id}` returns `shipments.detail` JSONB verbatim. Router gained regex-pattern routes (capture groups → `params`); `index.js` passes `e.status` through (real 404s, not 500s).
- **Slice 3b — order view endpoint + the triple Q30 gate:** order clicks hung at "Loading order…" — the old Q30 customerId gate (a real-order-service constraint: order numbers only unique per customer there) lived in THREE layers: missing endpoint, service throw, and `useOrderView`'s `enabled:` flag (the actual hang — query never fired). Built `POST /order-service/v3/order/view` → `{ row, manualOrder }` (list-row projection + `manual_order` enrichment JSONB, `pending-<orderId>` resolved by internal id); client composes with its existing `listRowToManualOrder`+merge ladder; hook gate removed (`enabled: !!orderNumber`). Our `order_number` is globally UNIQUE so customerId isn't needed — param kept as an optional refetch key for the eventual real-API cutover (Q30 answerable then: rows carry `customer`). Verified headless-Chrome on localhost AND prod (`/orders/KEM123188` renders the full summary).
- **Local dev now reaches Neon:** 6-line vite proxy `/api` → `odyssey-one-stage.vercel.app` (override `VITE_API_PROXY_TARGET`) — the missing piece that made live mode work locally (`vercel dev` still off-limits per S92).
- **Default customers 4 → 6:** + Valtris + USALCO (next in the planner's book order) in `CustomersContext.jsx:61`; CustomersModal tests re-fixtured (stage "Dubois" now that Valtris is default-selected).
- Known remaining live-mode gap: **Edit flow** (`?draft=` → `getDraft`) still live-gated (order/view → form hydration mapping, plan decision 21).
- **Post-wrap continuation (same session):** three fix rounds + an improvement batch, each deployed:
  - **Cell font audit:** ~20 `CELL_TAB_MAP` columns passed `cellClass` without a typography class — DataTable's replace contract dropped the 14px default → 16px body font. Consumer conformed (auto-restores `text-label-sm-regular`); latent since S82.
  - **Bar shows the buy id:** two rounds — BottomBar label prop, then the real fix: `selectedShipment` lookup now prefers **live page rows** (mock `getAllShipments()` misses most live sell ids; a ref holds the last row across paging). Verified via puppeteer-core click test.
  - **Improvement batch (all browser-verified):** inert toolbar Sort button removed; truncation tooltip now fires on ANY clipped cell (was >1 hidden word — @odyssey/ui change); **ShipmentsBar reworked (→ NORMALIZING both DSMs)**: shipment id renders as ButtonLink (`onShipmentIdClick`) opening the NEW `ShipmentDetailsModal` (ModalMedium, 2×2 sections, Routing Query (QCP) = primary) — extracted from the Tender tab (its button + hand-rolled modal deleted); **fixed 3-stage height model** (collapsed 48px / partial 60dvh / full 100dvh−clearance, plain CSS transitions — the S79d adaptive auto-height + ratchet + measured-JS animation RETIRED); **bar scrim** (RightPanel pattern — first outside click only collapses, covers `<main>` only); prev-arrow autoscroll now sticky-header-aware (mirror of the bar-overlap case); page/tab changes render **"Loading…" cells** while TanStack shows placeholder rows (`isPlaceholderData` → ref-read by the memoized columns). Default sort seed → `buyShipment`.
  - **Figma sync owed:** ShipmentsBar master (id as link) — flag for the next Efrain/Figma pass; Angular twin catches up at the next batch port.
- **Second continuation — styling + componentization (committed through `8037b1e`, NOT deployed):**
  - **HARD RULE (memory `feedback_no_prod_deploy_without_permission`):** no prod deploy without explicit permission for THAT deploy — user flagged the chained unprompted deploys; Neon reseeds carry the same bar (shared with prod). Prod stays at the improvement-batch deploy until told otherwise.
  - **Bar link tone fix:** the id ButtonLink rendered BLACK — the `shipments-bar__id` class (`--text-primary`, later in the stylesheet) overrode the link variant; the link now carries only `shipments-bar__id--link` (semibold + nowrap, color owned by `.btn--link` = non-black tone). **Selected row restyled:** `tr[data-selected]` = DSN-200 bg (one tone darker), `--text-link` text, semibold — mirrors the CurrentShipment link; `:active` keeps tertiary. Computed-style verified.
  - **Arrow autoscroll speed:** fresh open keeps the 600ms settle (bar open animation), selection switches fire at 50ms.
  - **Componentization pass ("stuff the dev can use") — all in @odyssey/ui:** ShipmentsBar `closeOnOutsideClick` (scrim rendered BY the component, RightPanel-parity naming — BottomBar's hand-rolled scrim deleted); DataTable `loadingRows` (data cells render "Loading…", display columns keep rendering — ShipmentTable's ref hack deleted), `onRowClick(row)` (non-interactive row area), and `scrollSelectedIntoView` (`true | { bottomBoundary, freshDelay=600, switchDelay=50 }` — the whole bar-aware autoscroll extracted from ShipmentTable; scrolls the nearest scrollable ancestor). All documented in `DataTable.usage.md` + both DSM demo API tables; ShipmentsBar demo Schematic/Playground now EXERCISE `onShipmentIdClick` (link face + click counter + both-faces legend) — the handler's presence is what switches label → ButtonLink (Angular twin will mirror via `EventEmitter.observed`).
  - **Process correction (user catch):** the id-as-link is a VISUAL change and should have gone Figma-first — the ShipmentsBar Figma master edit is the BLOCKING item before this batch re-approves. ShipmentsBar + DataTable sit at NORMALIZING in both DSMs (Angular meta flags committed local-only: `be5f521`, `aa19595` on `port/s76-search-batch` — no push). Nothing published to @oneodyssey/ui.

---

## Session 92 — July 23–24, 2026

**THE REAL DATABASE SHIPPED — the prototype now runs on Neon Postgres behind our own OdysseyONE-shaped API, LIVE on odyssey-one-stage.vercel.app.** Full brainstorm → spec → plan → subagent-driven execution arc (9 tasks, implementer + spec-review + quality-review each). Tests: app **503 → 510/510** (+7 seam), new node:test suites **23/23** (api 18 + tools 3 + db 2), tsc clean. React repo only; everything pushed.

- **Spec + plan committed** (`docs/superpowers/specs/2026-07-23-real-database-design.md`, `docs/superpowers/plans/2026-07-23-real-database-slice1.md` + as-built addendum). Key decisions: **Neon over Supabase** (own API layer makes Supabase's differentiators unused; vendor-neutral `pg` + `DATABASE_URL` seam keeps the switch trivial); **auth = guest + 8 mock users, NO SSO** (guest active without login, read-only at the API; mock users log in with fake creds, write-enabled, preferences persist server-side); **`user_preferences` JSONB table** absorbs evolving per-user UI state (column arrangements, search profiles…) with zero migrations; cutover unit = **data path, not screen** (shared hooks flip Home widgets + route badges + lists together, S91 numbers-match rule holds by construction).
- **Data layer:** `packages/db/` migration runner (`--reset --yes` ritual) + 11-table C-pragmatic schema; generator wrapped as exportable deterministic `buildDataset()` (CLI byte-identical — gate held); `tools/seed.mjs` seeded **10,000 shipments / 23,182 orders / 21,158 stops / 45,094 tenders / 84,890 events / 9 users = 263 MB** (fits free tier), `verify-seed.mjs` asserts the 9 S80 invariants as SQL — 9/9 ✓. Seed wall-clock 3m48s.
- **API layer:** single Vercel Function (`api/index.js` + `_lib/` router/db/builders) serving the 4 contract endpoints (category counts, shipment error list, order list, tab-counts — the last is OUR contract extension). Parameterized SQL, whitelist-only identifiers, honest-empty `WHERE FALSE` scoping (S79c d10), `SIMULATED_DELAY_MS` knob. **Hard-won:** Vercel's bracket catch-all `api/[...path].js` silently fails multi-segment paths (dev AND prod) → plain `index.js` + explicit rewrite `/api/(.*) → /api/index?__path=$1`; and `vercel dev` clobbers vite module URLs (blank SPA) → local dev stays plain `vite` (mock), live verification happens on deployments.
- **Seam wiring:** live counts gained `customerIds` (deviation 1 — our backend grew the filter), `getOrderTabCounts` live branch, `searchFilters` sent nested so the server can ILIKE them (Task-5 review catch: the live payload flattens filters; builders read both shapes). Mock branches byte-identical.
- **Verification + deploy:** prod E2E via CDP GREEN — Home/Shipments/Orders numbers consistent (default 4-customer scope 489/1140/3759-72-1072), re-scoping to Valtris shifts every surface to the DB-verified 120-family; API latency 124–469 ms in-browser, real loading states now visible. `VITE_API_MODE=live` set in Production+Preview env. Zero console errors (known Tracking-widget 405 falls back to mock).
- **Tooling arc (pre-DB):** `angular-porter` custom agent created at `.claude/agents/angular-porter.md` (thin dispatcher to the port routine + memory-only constraints: Phase 3b functional QA, no-push, no-publish, React read-only) and wired into the routine Phase 2 + /normalize skill. **rtk 0.43.0** (Rust Token Killer) installed as a project-scoped trial — CLAUDE.md instruction block + `.rtk/filters.toml`, opt-in `rtk`-prefixed commands, no hook; evaluate with `rtk gain`, promote to global (`rtk init -g`) if it earns it.
- **PARKED — buy-shipment-as-shipment-ID:** user reports the team decided buyShipment (not sellShipment) is THE shipment id and should lead the default column arrangement. Investigation done: sellShipment is currently DB PK / detail-link token / row key / DEC-51; buyShipment is NOT unique (generator random draw, ~50% collision odds at 10k). 4-step plan ready (columns buy-first, buy uniqueness in generator+schema+reseed, keep sell as internal wire key, decision-log entry) — **awaiting Rovo/Jira confirmation**; user to log into Odyssey Claude account for Atlassian MCP.
- **Housekeeping:** `cell-tab-mapping.xlsx.zip` + `~$cell-tab-mapping.xlsx` = KEEP (important for UX, parked — remove from junk list). `gh` auth token invalid → PR #12 still unchecked (needs `gh auth login`).

---

## Session 91 — July 20, 2026

**Home domain desktop pass + the tab-widget showcase, iterated live with the user and DEPLOYED (odyssey-one-stage.vercel.app).** Tests app **503/503** (unchanged). React repo only — no Angular, no library component changes. Uncommitted until this wrap.

- **Responsive grid:** Home foreground content caps at **1800px and centers** past it (one CSS rule on `.home-content`'s children — the hero background stays full-bleed). Grid flips **6 → 8 tracks when `.home-content` itself reaches 1440px** (user-corrected twice: content width, NOT viewport): a `ResizeObserver` is the single source of truth, driving both the inline CSS vars and the module `GRID_COLS` the packing math reads, then re-packing every section in reading order. 8-col mode drops the track floor to 0 (8×170 + gaps > 1440 → pure 1fr shares, no overflow at the threshold; verified 6 tracks @1439px content / 8 @1440px).
- **Default showcase rebuilt** (one "Overview" section, 12 widgets, 23 cells → 4 full rows @6 cols / 3 @8 cols with a single trailing empty cell): Exceptions 3xChart (5 real PANEL_CONFIG category rows) · quick-actions CTA · Orders All 2x · Tracking 3xChart (seeded after orders-all so it lands at the END — user request) · Orders Draft + Validation Errors 1x · Monitoring total 2x · five Monitoring category 1x (Hold/Consolidation/Tender Sent/SpotBid/Approved). **PGI/PGR defined but unplaced** ("we have nothing in PGI/PGR"). The seed order is load-bearing — documented in the `initialSections` comment.
- **Tab deep-linking (new):** `OrdersRoute` + `ShipmentsRoute` seed tab/panel state from `location.state` (`{tab}` / `{panel, tab}`); `widgetGoToPaths` accepts `{path, state}`; chart rows carry `nav` descriptors wired to `navigate()` at init. **Bug found post-deploy: duplicate keys in `widgetGoToPaths`** — legacy `'shipments-monitoring': '/shipments'` entries silently overrode the state-carrying ones (last key wins) → "Go to Monitoring" landed on Exceptions. Deduped + full link audit; every jump verified live via CDP (Draft tab, Monitoring panel, category tabs, exceptions row → Date Issues tab).
- **"Domain / Tab" header convention** (rule iterated with the user, codified in the `widgetTitle` helper comment): the slash is **reserved for widgets whose content nests inside that tab** (chart rows = sub-tabs, or a 1x whose label is a leaf under it — "Shipments / Monitoring" + label Hold); a widget targeting a leaf tab already named by its label, or an All/Total, keeps a plain domain title. Tab part renders at `--text-tertiary` (DSN-500 — user toned it down from 700). Swept ALL widgets incl. the catalog (every em-dash title → slash format: Tracking / Load Status, Orders / Fulfillment, Carriers / Performance, …). **1x titles wrap instead of ellipsizing — Home-scoped CSS** (`.home-widget-cell--1x .widget__title`), deliberately NOT a @odyssey/ui Widget spec change (flagged; Figma-first cycle if it should become one).
- **Widget data wired to the domains** (user: "they need to match, visible data comes from selected customers"): one effect joins the SAME customer-scoped hooks the routes use — `useOrderTabCounts(selectedDataIds)` for the Orders trio, `useCategoryCounts(panel, …, selectedDataIds)` ×3 for exceptions/monitoring/pgipgr (rows join counts on their `nav.state.tab` key; percentages + chart segments recomputed; Monitoring ring = real share of all shipment rows). Verified numbers match the routes' own tab badges (Exceptions 112, Monitoring 245, Tender Sent 60). CTA "Go to Create a New Order" now → `/orders/create`.
- **Ops:** ~5 prod deploys via CLI along the iteration. One `npx vercel --prod` accidentally ran from `apps/` and auto-created a stray "apps" Vercel project — deleted (project + local `.vercel` link); deploy always from repo root.

---

## What's Next (S94)

0. **Deploy gate:** prod is at the improvement-batch deploy — the styling + componentization commits (`252faec`…`8037b1e`) are NOT live. Ask before deploying (hard rule).
1. **Orders domain updates** (user-stated S94+ focus): order errors + other Orders work, continuing until the domain is done — **then the port batch**: ShipmentsBar + DataTable re-approval (blocked on the ShipmentsBar Figma master sync — id as link, Figma-first) + the S90 error-state components + Angular twins via the angular-porter agent (Angular DSM flags already staged locally on `port/s76-search-batch`).
2. **DB slices 4–7** (per the spec's cutover table): search endpoint (`ILIKE` → pg_trgm), customers/lookup path, first write, fake login + guest read-only enforcement (accounts already seeded; `/api/login` pending). Plus the **Edit-flow live gap** (`getDraft` live branch — order/view → form hydration mapping). rtk trial evaluation (`rtk gain`) along the way.
3. **PR #12 watch** — blocked on `gh auth login` (token invalid). Then: merge → Cognizant publishes 0.8.0 → branch cleanup → `domain-usage.json` regen (+ verify PR #11 absorbed).
4. **S90 error-state batch — UNPARK when stakeholder feedback lands:** (a) create-order wiring (per-section `errorCount` Accordions, validation Alert, docked + `onErrorNav` autoscroll); (b) batch approval → Angular port via the NEW `angular-porter` agent (its first real outing). Confirm Validation Errors status mapping with Ramesh/Efrain (ORD-03).
5. **Fix the 3 real API gaps** (checkbox `defaultChecked`, navbar `trailRef` lint convention, trail-nav `onMenuClick` demo-doc artifact — diagnosed S92-adjacent, plan in conversation history) + S87 punch-list remainder (PORTING badge decision, `port-readiness` existsSync, `figma-link.md` last_synced, gitignore `.connect-publish.last`, `verify-all` stat regexes, `demoPrefix`, `insertAppModule` guard).
6. Carried: Home 1x-title wrap → possible Widget spec change, MiniMultiselect (blocked on Efrain), ActionMenu cell-click flicker, stickyTop measured-toolbar, 9.3MB chunk code-split, `.worktrees` cleanup (~430MB, confirm dead), React MatchSimpleRow ~51px vs Angular 56px cosmetic diff. `cell-tab-mapping.xlsx` files = KEEP (parked, UX-important). `vault/00-inbox/Error Shipment.png` = S93 debug artifact, can be deleted.
7. **Process rule (S93 incident):** the Neon DB is shared with prod — any reseed must ship with its matching deploy in the same motion.

---

# Session Index (condensed)

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

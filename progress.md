# Odyssey Shipments Domain — Progress

> **Note:** Sessions ≤81 are condensed to one-line summaries. Full narratives archived at `vault/99-archive/progress-full-archive-2026-07-14.md` (and in git history). Component detail lives in `playground/normalization-tracker.md` + the DSM route + vault decision logs.

## Session 97 — July 28, 2026

**PRODUCT INFO POLISH + THE SELECT-COMPONENT RULING SETTLED + §SPECIAL SERVICES SHIPPED — a day of design-system convergence: the SelectField/Dropdown/ComboBox ambiguity resolved into ComboBox modes (user-endorsed), then Special Services built on MultiSelect with the two-column dropdown.** Tests: app **525 → 528/528**, build clean. No deploys, no DB writes, no Angular pushes.

- **Product grid fixes (session opener + user QA):** error-validation misalignment root-caused — `.co-prod-row td` was `vertical-align: middle`, so a cell growing an error label re-centered siblings; now `top` with 36px line boxes centering Line #/⋮/checkbox against the input row. ComboBox typeahead panel **body-portaled** (`position:fixed`, wrapper-rect tracked on scroll/resize) — was clipped by the grid's h-scroll wrap (ActionMenu never clipped because it already portals); panel height now capped to viewport space below the anchor (`min(320, space−48)`, floor 120). MatchSimpleRow **plain-list rule**: no avatar + no info line → ID drops semibold→`label/sm regular` 14px/400 (Figma master sync owed). Customer field passes `rowProps={{showAvatar:true, iconType:'handshake'}}` — rule verified both ways (rich rows stay semibold). Actions column: ⋮ ActionMenu → **two plain icons per inbox mock** (SquarePen = Add More Details, disabled pending LINX-8131; Trash2 = delete) on the `.co-rep__trash` convention.
- **The select-ruling arc (three swings, then settled):** grid selects briefly → ComboBox select face (wrong), then → Dropdown molecule (also wrong), then the real ruling: **choice by DATA SOURCE — needs fetch/lazyload → ComboBox; local list → Dropdown** (memory `feedback-dropdown-vs-combobox`). User then asked whether ComboBox-with-modes could absorb everything; endorsed and executed: **ComboBox `typable` prop** (default true) — `typable={false}` = pick-only select (readOnly input, pointer cursor, bar-click toggles the FULL unfiltered list, `value` = option VALUE with label rendered, `aria-autocomplete=none`); **chevron now TOGGLES** (was open-only — the user-reported gap). **No Figma variant added** — zero visual delta, Select face models the appearance (control-state convention); Efrain note owed at batch close. **SelectField deleted**; 7 call sites swept (ProductGrid selects, GeneralInfo Equipment/Freight Term/Ship Direction w/ Q20 logic preserved, AddressFields, RepeatableRows, TimeSelect + TimezoneSelect wrappers kept as option factories). DSM: mode ladder in intro + props + "Data-entry mode" playground control. +3 pick-only tests. Browser-verified (Freight Term full catalog, commit, chevron close; grid Product Class).
- **§Special Services shipped on MultiSelect (ORD queue item 1):** Figma 5427:13375 = two-column dropdown (code | description + in-panel small-caps headers). Data/stories matched first (user gate): catalog `{code,description,frequency}` fits; LINX-12402's "Code - Description" string superseded by the richer layout (Efrain outranks); mock's "ISO CODE" headers + PALEXG–"Pre-Paid" pairing = template junk. Built: MatchSimpleRow `twoColumn` mode + FieldSearchResults `columnHeaders`/`rowHeight` props (shared `--msr-col1` 160px grid, titles never wrap), MultiSelect dropdown standardized on it (40px rows, `columnHeaders` titles panel + table), **width 640→100%**, new `emptyTableMessage` prop (table + headers render empty by default — "No special services added"). Section = thin Controller adapter, wire shape `[{code,description}]` kept, frequency-sorted. **SpecialServicesPicker + TypeaheadSelect deleted** (closes the S97 TypeaheadSelect-migration item by removal). Delegated decisions: **LUMP removed** (LINX-8125 exclusion), **PALEXG stays Pallet Jack** (mock rows 2–3 corroborate our catalog).
- **Special-services catalog ground-truthed-ish (inbox screenshot):** old-TMS screen = checkbox rows, Service Name + **Value** column, alphabetical, 19 services visible A→I (real catalog 40+). New facts: scale, parameterized services exist (Value ruled out of scope by user), names-without-codes. Catalog extended **5 → 24** — real names verbatim, **codes/frequencies INVENTED** (flagged in data comment + vault note; swap on a dev lookup capture). Raw → vault-sources; synthesis → `vault/10-domains/orders/research/special-services-catalog-2026-07-28.md`.
- **Bookkeeping:** MultiSelect + MatchSimpleRow + FieldSearchResults demoted to NORMALIZING both DSMs via `dsm-flags --demote` (Angular meta edits LOCAL-ONLY, no push). Batch-close owed: Figma syncs (MultiSelect 4536:5333 two-column panel, MatchSimpleRow 3169:2821 plain-list/two-col, ComboBox typable note), Angular twins (ComboBox portal/cap/typable/chevron, MultiSelect, FieldSearchResults, MatchSimpleRow).

---

## Session 96 — July 28, 2026

**PRODUCT DATA GROUND-TRUTHED + COUNTER BUG CLOSED — the S95 carry-forward bug root-caused as a definition mismatch, then the 4 product-field format gaps closed three ways in one day: Sonnet Jira/Confluence research → live dev API replays (user's captured token) → QA dropdown screenshots.** Tests: app **527 interim → 525/525** (counter test rewritten 4→2 cases), build clean. No deploys, no DB writes, no Angular changes.

- **Counter bug (user ruling ends it):** plumbing was never broken — the bug was the DEFINITION of "added". Two prior definitions (committed productId; then non-blank rows) both read "0 products added" against visible rows. User expectation: counter tracks ROWS — now `products.length`, bumps the instant Add Product creates a line, decrements on Delete. Regression test rewritten; all paths verified in REAL Chrome via puppeteer-core (incl. the virtualized-dropdown mouse click jsdom can't render). Side finding: Product ID + Description cells are draft-state ComboBoxes — mid-typing never updates form state by design.
- **Research arc (Sonnet subagent → `vault/10-domains/orders/research/product-data-formats-2026-07-28.md`):** Master Data Design-LLD (Confluence 2408743006) + LINX-9875/9874/9879/8131/8063 → endpoints + shapes for all 4 fields (`/product-service/v1/...` family, `{lookup,pageNumber,pageSize}` convention), Product ID = 18-digit zero-padded `mf_ship_item.external_id`, Product Class backed by `FRT_CLASS` ref table, Harmonized free-text w/ lookup validation.
- **Control ruling (from the research):** ComboBox lazy-paged ONLY for Product ID + Harmonized Code (server search over huge sets); Product Class + Handling Unit = plain SelectFields (small closed catalogs) — consistent with ORD-05.
- **LIVE DEV CAPTURES (the day's method win):** user copied the Cognizant app's fetch + token from the browser; we replayed against `dev.order.linx` + `dev.masterdata.linx` (deployed hosts ≠ LLD paths — cutover-relevant). Verbatim: product lookup **totalCount 2,454,406** (lazy paging now backed by hard numbers; IDs wildly mixed formats, `P_` prefix, empty-description LINX-8063 fallback in the wild), **complete Handling Unit catalog = 5** (PLT/BOX/DRM/BUL/CRT), Product Class = NMFC scale **incl. 350/450/650**, Harmonized = dotted HTSUS `3401.20.00.00`. Second network-tab batch: **freight-term wire codes P/C/N/T/A (closes ledger row 2)**, ship direction O/I, modes (+IMD/PKG/AIR), carriers 11,142 keyed `S_<SCAC>` w/ `(DNU)` retirement convention, hazmat class = severity vocab (NOT UN 1–9), packing groups I/II/III/N/A, full UoM catalogs, legacy timezone codes (Efrain's display format still outranks). Standing theme: EVERY dev catalog carries test junk rendered unfiltered in their UI — we mimic the clean subsets. Token deleted from disk after use.
- **Mocks updated (lookup-only, shared pool/DB untouched — ledger rows 5–6):** Product ID lookup serves 18-digit padded IDs; `HANDLING_UNITS` → the real 5 {code,label}; new `PRODUCT_CLASSES` (clean NMFC scale); harmonized placeholder `e.g. 3401.20.00.00`.
- **QA screenshots (inbox → vault-sources) — KEY CORRECTION:** the UI's "Product Class" column is the **4-TYPE dropdown** (Harmonized/Commodity/Product/NMFC, label "Product") next to free-text Commodity (STCC) — NOT the NMFC scale I'd briefly wired. Grid reverted to `SHIP_CLASSES` (labels/order fixed to screenshot); `PRODUCT_CLASSES` kept for whichever field consumes the value catalog (open: likely the class value once type=NMFC). Other 3 screenshots confirm raw catalogs render verbatim.
- Open from this arc: NMFC-value-catalog consumer field; product dropdown row anatomy (ID-only today — ID+description would be Figma-first); richer product-master fields beyond ID+description.

---

## Session 95 — July 27–28, 2026

**CREATE ORDER SECTIONS CONFORMED + PRODUCT INFORMATION SHIPPED — General Information (ORD-05) and Pickup & Delivery (ORD-06) rebuilt to Figma pre-wrap, then a full intake→plan→build arc for §Product Information (ORD-07/ORD-08) with four user-QA polish rounds.** Tests: app **521 → 523/523**, tsc + build clean. No deploys, no DB writes (reseed deferred to end-of-Orders by design).

- **ORD-05 — §General Information conformed** (Figma 4139:8806/9050): Customer rename (wire key stays `owningOrganization`) as full-width ComboBox `variant='select'`; ComboBox used ONLY where Jira specifies server-search (LINX-8118/8126) — small lists stay SelectField; Hazardous checkbox (LINX-12102 derivation), banner → "Fields marked with an asterisk (*) are required", Order# 150-char rule, Accordion supporting-text default flipped off (Figma set 2850:612). ComboBox gained form-integration props → NORMALIZING.
- **ORD-06 — §Pickup & Delivery conformed** (Figma 5920:18351/5921:16412): Shipper/Destination renames (wire keys stay consignor/consignee); location search → ComboBox `variant='search'` (paged 25/req); dates → **@odyssey/ui DatePicker** via thin `DateField` adapter (+`format` prop 'MM/DD/YYYY'); times → **TimePicker** (+`error` prop); Appointment checkboxes (LINX-12095/13845, latest-date-gated, mount-guarded). CalendarPicker/DatePicker/TimePicker → NORMALIZING.
- **Lookup research:** `lookup-vocabularies-2026-07-27.md` — real QA endpoints + formats (carriers "SCAC - NAME", orgs "NAME (SOURCE)", freight terms 5-label catalog, equipment codes TL/LTL/TT/RR/LCL from QA + old-TMS screenshots); CARRIERS pool ~50, EXTRA_ORGS ~43 (lookup-only).
- **ORD-07 — Efrain formats + location/address polish (2026-07-28 inbox):** times 12h AM/PM 30-min (supersedes ORD-06's 24h — Efrain outranks Jira); timezones "(UTC-06:00) Central Time (US & Canada)" via `TIMEZONE_LABELS`; location dropdown → rich MatchSimpleRow rows (map-pin avatar, `ID:` semibold + name, `City, ST ZIP`) with 3 verbatim dropdown-slot messages (no-match / invalid-ID heuristic / Consignor≡Consignee duplicate blocked via new ComboBox `panelError`); manual address City/State/Country → typable ComboBoxes w/ "not found in master data" messages, postal warning. **`--spacing-9` (36px) token added in one motion** — tokens.css + Figma `Spacing/9` (Sizing collection) + snapshot (audit 117 vars green); **Angular tokens-file addition OWED** (tracker row). Layout: all 16px co headers semibold, `.co-field-stack` 24px inside 36px section rhythm, planning gutters 20px, centered Add-Location link 32px.
- **ORD-08 — §Product Information rebuilt** (plan `2026-07-28-orders-product-information.md`, all rulings user-confirmed): always-editable rows (Controller per cell), **equipment-driven columns** per LINX-13893 4-case matrix (default Case 1), **equipment lookup swapped to the real vocabulary lookup-only** (shared pool/DB untouched — see ledger), filled-mock toolbar (count left / search 320 right), header-arrow sorting (physical reorder), US|Metric toggle killed, actions column = DataTable pattern (Columns3Cog header + ⋮ ActionMenu: "Add More Details" disabled / "Delete"), **ColumnPanel generalized** (`allColumns`/`presets`/`defaultPresetId` props, Shipments byte-identical) reused as overlay dock w/ unsaved guard — arrangement persists section-locally, resets on case change; **horizontal breakout** on expand (100vw − sidebar − 2×24px, animated; Accordion reveal track pinned `minmax(0,1fr)`); new `MeasureField` (FormField `State=Filled Trailing Button` — Gross Weight/Volume/L/W/H per audit); hazmat chain (pool meta → row checkbox → order flag) browser-verified.
- **QA rounds (all headless-verified):** ComboBox 32→**36px** (padding 6→8, code + Figma master 4715:6142 — every instance); default = header-only table (no pending row, Figma 5368:14750); validation mode `onChange`→**`onTouched`** + `field.onBlur` forwarded through all cells + grid-local required fallbacks for blank rows (schema skips blank rows via index-preserving superRefine — a filtering preprocess misaligned error paths); Line # centered + sticky LEFT; Add Product (Plus, no underline) outside the scroll wrap; th top rule + 8px padding; 18px toolbar/table/add rhythm; sort-icon hover = DataTable ladder; ComboBox error placeholder tint (`search-field--error`); **ComboBox Enter-with-no-highlight now closes+blurs so free-text commits** (was a silent no-op).
- **DB-update ledger** created (`vault/10-domains/orders/db-update-ledger.md`) — reseed shopping list (equipment pool swap, freight-term wire codes, EXTRA_ORGS scope, product-line fields); reseed happens once Orders is done, permission-gated.
- **CARRY-FORWARD BUG:** user still sees "0 products added" not updating after adding a product — works headless on all three commit paths (dropdown pick, type+click-away, type+Enter); debug live in the user's browser next session (stale dev server? a fourth flow?).
- Known open: Product-field lookup formats — 4 gaps (Product ID row anatomy, Harmonized Code source, real Handling Unit catalog, Product Class options); "Add More Details" wiring (LINX-8131); dropdown footer "Don't see your address?" question (Efrain).

---

## What's Next (S98)

1. **Confirmation page with ALL its cases (user-stated):** LINX-9002 dual message states (order number provided → "created successfully"; blank → async "being assigned" → populated flip), QA details LINX-10987–10993 (breadcrumb, sidebar active state, Payment Terms = Freight Term in header, References placeholder, chevrons, user/branding), `?confirm=async` variant already anticipates async.
2. **Product Info open data questions (fold in when answered):** NMFC value-catalog consumer field (`PRODUCT_CLASSES`), product dropdown row anatomy (ID+description = Figma-first), special-services real codes (dev lookup capture — swap the 19 invented mnemonics).
3. **Orders/Create remainder:** "Add More Details" row expansion (LINX-8131), dropdown footer "Don't see your address?" question (Efrain), LINX-8042 address cascade, appointment propagation (13869), Edit-flow live gap.
4. **Batch re-approval + Angular port batch (growing):** ModalMedium, Paginator, DataTable, **ComboBox (36px + panelError + Enter-commit + error placeholder + S97 portal/height-cap/typable/chevron-toggle)**, **MultiSelect (two-column dropdown + 100% width + emptyTableMessage)**, **FieldSearchResults (columnHeaders/rowHeight)**, **MatchSimpleRow (plain-list rule + twoColumn)**, ShipmentsBar (Figma sync owed), DatePicker/TimePicker/CalendarPicker, Accordion, S90 error-state components, `--spacing-9` token → Angular tokens file. Figma syncs owed: MultiSelect 4536:5333, MatchSimpleRow 3169:2821, ComboBox typable note (Efrain). Angular DSM flags staged locally (no push).
5. **End-of-Orders reseed** (permission-gated, one motion with deploy): `vault/10-domains/orders/db-update-ledger.md` shopping list.
6. **DB slices 4–7** (lookup endpoints feed the create-order comboboxes). rtk trial evaluation (`rtk gain`). PR #12 watch (blocked on `gh auth login`).
7. Carried: S87 punch-list remainder, 3 real API gaps, Home 1x-title wrap, MiniMultiselect (Efrain), ActionMenu cell-click flicker, 9.3MB chunk code-split, `.worktrees` cleanup, DesignSystemMap legacy refs. Orders S94 remainder: Export deploy-verify, Filter decision, live Submit/Cancel, Resolve→OIF (LINX-11137), location-sort semantics.

---

# Session Index (condensed)

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

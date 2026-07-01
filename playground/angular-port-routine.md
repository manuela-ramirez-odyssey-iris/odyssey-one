# Angular Port Routine (`/port-to-angular`)

> Triggered by `/port-to-angular <Component>`. Reached from `/normalize` at **batch approval** — the port is **batched** (run for the whole APPROVED batch at once, NOT per-component right after each React GATE B). Its output is the **PORTED** state; the batch closes later at **final approval** (Phase 6). Be **concise** — one short status line per phase, batch decisions, only block on genuinely unknown values.

**What this does:** ports an already-normalized React component to its Angular twin **directly in the official Angular library repo `odyssey-one-library-ui`** (sibling of `odyssey-one`; GitHub `OneOdyssey/odyssey-one-library-ui`) — correct-by-construction, two-window reviewed, and inserted into the library on pass.

> **Workspace & landing (updated 2026-06-22).** The Angular library now lives in the **official repo `odyssey-one-library-ui`** and is published to GitHub Packages as **`@oneodyssey/ui`**. The old local-only `odyssey-angular-dsm` dev workspace is **retired** — develop the Angular twin directly in `odyssey-one-library-ui`. Its `main` branch is **protected** (PR + review + a "Build Check" status required), so a port lands via a **feature branch → PR** (admin-merge or teammate approval), never a direct push to `main`. When a port changes the **library** (not just a demo), cut a new `@oneodyssey/ui` version (bump `projects/odyssey-ui/package.json` + CHANGELOG, `ng build odyssey-ui`, `npm publish` from `dist/odyssey-ui`) so consumers can adopt it. See [[project_odyssey_ui_delivery]].

**Inputs (per component):**
- `packages/ui/src/<C>.jsx` — the normalized React component (props, variants, slots)
- `apps/odyssey-one/src/styles/components.css` — the component's CSS blocks for ALL states
- `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` — `meta`/`props`/`tokens` + the states/variants grid to mirror
- The Figma master node (from `meta.figmaNode` in the demo file)
- Referenced `.text-*` typography utilities (global in the Angular library — verify coverage)

**Not a migration.** The React app stays canonical. The Angular library is the generated, Cognizant-facing visual deliverable. React side is read-only during every port.

---

## Hard Rules

**Conform to Cognizant conventions:**
- Selector: `odyssey-<kebab>` (prefix `odyssey-`, component name as kebab-case)
- Files: `odyssey-<c>.component.ts`, `odyssey-<c>.component.html`, `odyssey-<c>.component.scss`
- A per-component `Odyssey<C>Module` (declares + exports the component + imports `CommonModule`) re-exported by `OdysseyUiModule`
- Tokens via `var(--token)` only — never hardcoded hex, rgb, rgba, raw px for design values
- No standalone components — Angular 17 NgModule pattern (matches Cognizant's app)

**The canonical template is `projects/odyssey-ui/src/lib/button/` in `odyssey-one-library-ui`.** Copy its file/module/spec structure for every port.

**The parity-lint (`tools/angular-parity-lint.mjs`) mechanically enforces the machine-checkable subset below. A port that fails the lint is not done.**

**Where each rule is enforced** (don't expect the lint to catch all 12): the parity-lint mechanically checks the per-component subset — **G4, G5, G7, G8, G9, G12** + the Cognizant conventions (selector `odyssey-<kebab>`, per-component module). **G6** (typed `@Input()`) is enforced by TypeScript strict mode at build (Phase 3), not the lint. **G1, G2, G3, G10, G11** are workspace-level (typography utilities, fonts, font-smoothing, packaging, test config) — established in sub-project A and guarded by the Phase 3 build/test steps, not the per-component lint. "Lint green + Phase 3 builds/tests green" together cover all 12.

### The 12 Generation Rules (MUST-follow, apply to every port)

These are standing rules, not a wishlist. A subagent generating a port applies all 12. The parity-lint asserts the machine-checkable subset.

- **G1 — typography utilities:** every `.text-*` class the component references must exist in the library `_typography.scss`. Port any missing classes from `components.css` before generating the component — do not reference utilities that don't exist in the library yet.
- **G2 — fonts:** `@fontsource/inter` must remain a real dependency (not peer) in `odyssey-ui`'s `package.json`. Verify `styles/index` still imports it — do not regress the font loading.
- **G3 — font-smoothing:** `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` must remain in `styles/index`. Verify on every port — a regenerated `styles/index` can silently drop them.
- **G4 — tokens:** the component SCSS consumes `var(--…)` only; every token it references must exist in `_tokens.scss` (1:1 match from `packages/tokens/tokens.css`). If a token is missing from `_tokens.scss`, add it — do not hardcode the value or invent a different name.
- **G5 — alignment artifact:** emit `<C>.figma-link.md` in the component's folder (Figma node URL, canonical React source path, `last_synced: <ISO date>`, deviations section). File must be present before the lint runs.
- **G6 — `@Input()` types:** every Angular `@Input()` must be typed (no implicit `any`). Mirror React prop types faithfully (`string`, `boolean`, `'primary' | 'secondary'` unions, etc.).
- **G7 — projected content + encapsulation:** every `<ng-content select="[slot=…]">` slot must have a matching `::ng-deep` (scoped under the host selector) or the component sets `ViewEncapsulation.None`. No bare component-scoped `> svg` / slot selectors — they cannot reach projected content and silently fail.
- **G8 — `className` passthrough:** every component exposes `@Input() className = ''` merged into its host class binding (e.g. `[class]="'odyssey-button ' + className"`). This mirrors React's `className` prop and is required for modifier tones applied by consumers.
- **G9 — icon wrapper:** icon selectors use **descendant** combinators (not direct-child `>`), and the component includes normalization rules for projected `<i-lucide><svg>` content. A direct-child selector silently fails to style projected icons.
- **G10 — packaging:** the library must remain self-contained after the port — `@fontsource/inter` in `dependencies`, `lucide-angular` as optional peer in `peerDependencies` + `allowedNonPeerDependencies` in `ng-package.json`, styles shipped in `dist/`. Do not remove or move these declarations.
- **G11 — workspace + test config:** the test target (`projects/odyssey-ui` in `angular.json`) must keep `stylePreprocessorOptions.includePaths` pointing at the library's `src/styles/`. All commands in this routine use `npx ng` (not a global). Tests run per-project (`--project=odyssey-ui` / `--project=dsm-explorer`).
- **G12 — module wiring:** `Odyssey<C>Module` must be imported **and** re-exported by `OdysseyUiModule`. The component and module must be exported from `public-api.ts`. Both are lint-asserted — a missing line in either file blocks the port.

---

## React → Angular translation reference

| React construct | Angular translation |
|---|---|
| functional component + props | `@Component` + one typed `@Input()` per prop |
| `{children}` | `<ng-content>` (named: `<ng-content select="[slot=x]">`) |
| `useState(x)` | a component property (+ `@Output()` if the consumer observes it) |
| `useEffect(fn, [])` (mount) | `ngOnInit` / `ngAfterViewInit` |
| `useEffect(fn, [dep])` | a setter on the `@Input()`, or `ngOnChanges` |
| `useEffect` DOM listener (e.g. ESC) | `@HostListener` or addEventListener in `ngOnInit` + cleanup in `ngOnDestroy` |
| `useRef` (DOM) | `@ViewChild(...)` |
| `useLayoutEffect` (measure before paint) | `ngAfterViewInit` (+ `ChangeDetectorRef.detectChanges()` if it sets state) |
| custom hook (useInView, CountUp) | an Angular service or directive (IntersectionObserver / `requestAnimationFrame`) |
| `ResizeObserver` in an effect | a `ResizeObserver` created in `ngAfterViewInit`, disconnected in `ngOnDestroy` |
| `variants` map (JS object) | a `readonly` component property (object/Map), referenced in the template |
| computed inline `style={{…}}` | `[ngStyle]="styleGetter"` (getter returns the style object) or `[style.prop]` bindings |
| conditional `className` | `[ngClass]` / `[class.x]="cond"` |
| `{cond && <X/>}` / ternary | `*ngIf` / `*ngIf; else` |
| `arr.map(...)` | `*ngFor` |
| many shape branches (isDot/isMetric/…) | `*ngSwitch` on a derived key, or `*ngIf` branches |
| render-prop (consumer wraps items) | `@ContentChild(TemplateRef)` + `*ngTemplateOutlet` |
| polymorphic tag (`<button>` vs `<span>` by prop) | define content ONCE in an `<ng-template #body>` and `*ngTemplateOutlet` it into either host (`*ngIf` two-host) — avoids the "two un-selected `<ng-content>`" error |

Tokens rule applies everywhere: colors go through `var(--token)` whether in SCSS or in an inline-style / variants map (the parity-lint enforces this in both). Raw px for component-internal geometry is allowed; colors/radii/type/shadow are always tokens.

---

## Phase 1 — Gather

Read the React canonical. This is research-only — no files are written in Phase 1.

1. **Read `packages/ui/src/<C>.jsx`** — capture: props API (names, types, defaults), all variant axes, slot structure (children vs named slots), any internal icons (static vs passed-in), conditional class logic.

2. **Read the component's CSS blocks in `apps/odyssey-one/src/styles/components.css`** — capture ALL state rules: base, hover, focus, active, disabled, error, any dark/tone variants. Note every `var(--token)` reference — these must all exist in `_tokens.scss`.

3. **Read `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx`** — extract:
   - `meta.figmaNode` — the Figma master URL
   - `meta.tier` — atom / molecule / organism (carries through to Angular tracker entry)
   - `props` array — the prop inventory to mirror as `@Input()` declarations
   - `tokens` array — the token list the component consumes
   - The states/variants grid structure — the Angular DSM explorer demo must mirror this grid

4. **Check `.text-*` typography utilities** — grep `_typography.scss` in `odyssey-one-library-ui/projects/odyssey-ui/src/styles/` for every `.text-*` class referenced in the React component or its CSS. List any missing classes — they must be ported in Phase 2 before the component is generated (G1).

5. **Check `_tokens.scss`** — confirm every `var(--…)` in the component's CSS has a matching entry. List any missing tokens — they must be added in Phase 2 (G4).

6. **Output a short readiness summary:** prop count, state count, typography utilities to add (if any), tokens to add (if any). One short paragraph. Do not start Phase 2 without this summary.

---

## Phase 2 — Generate

> Delegate to a subagent (Sonnet for Tier 1–2; Opus for Tier 3–4). Provide it the Phase 1 readiness summary + the relevant source files. The subagent generates everything in the list below, applying all 12 gotcha rules.

**Faithfully translate the full React component into an idiomatic Angular twin** — JSX → template, props → `@Input()`, logic → component members, styling mirroring React's mechanism. For **className-based components**, port the `.<class>` rules verbatim from `components.css` into the component SCSS (the Button is the template). For **inline/computed-styled components** (e.g. Badge), there are NO classes in `components.css` — instead translate the JS: the `variants` map becomes a component property, computed `style={{}}` becomes `[ngStyle]` bound to a getter (or `[style.x]` bindings), helper functions become component methods. Either way the visual output + behavior must match the React original. See the **React → Angular translation reference** below for construct-by-construct mappings.

The subagent produces, inside `odyssey-one-library-ui/`:

### Library output (`projects/odyssey-ui/src/lib/<c>/`)

- **`odyssey-<c>.component.ts`** — `@Component({ selector: 'odyssey-<c>', templateUrl, styleUrls, encapsulation })`. All props as `@Input()` with types. `@Input() className = ''` always present (G8). Class binding merges className: `[class]="'odyssey-<c> ' + className + (someProp ? ' modifier' : '')"`.
- **`odyssey-<c>.component.html`** — template. `<ng-content>` slots with `select="[slot=…]"` for named slots. `<i-lucide>` for baked-in icons.
- **`odyssey-<c>.component.scss`** — state rules verbatim-ported from `components.css`. All values via `var(--…)` only (G4). Descendant selectors for icons (G9). `::ng-deep` scoped under host for any projected content (G7).
- **`odyssey-<c>.module.ts`** — `Odyssey<C>Module` declares + exports `Odyssey<C>Component`, imports `CommonModule` (and `LucideAngularModule.pick({…})` for baked-in icons). Mirrors the Button's `OdysseyButtonModule` exactly.
- **`<C>.figma-link.md`** — Figma node URL (`meta.figmaNode`), canonical React source (`packages/ui/src/<C>.jsx`), `last_synced: <today ISO>`, deviations section (G5).
- **`odyssey-<c>.component.spec.ts`** — unit tests mirroring `odyssey-button.component.spec.ts`: creates the component, sets each `@Input()`, checks host class output, checks `className` passthrough. Import paths via the library, not relative component paths.

### Module wiring updates

- **`projects/odyssey-ui/src/lib/odyssey-ui.module.ts`** — add `Odyssey<C>Module` to `imports` and `exports` arrays (G12).
- **`projects/odyssey-ui/src/public-api.ts`** — add export lines for `Odyssey<C>Component` and `Odyssey<C>Module` (G12).

### Explorer demo (`src/app/demos/<c>/`)

- **`<c>.demo.component.ts/.html/.scss`** — **must REPLICATE the React demo's presentation section-for-section, not just render the component.** Open the React `<C>.demo.jsx` and mirror its exact structure: the same `ds-demo-section` titles in the same order (e.g. **"Schematic — anatomy"** then **"Playground"** — the post-S73 pattern), the Schematic's annotated instance + the **legend** (2-column `max-content 1fr` grid, tier badges, `#comp-<Child>` deep-links for composed atoms/molecules), and the same Playground controls. Port the React demo's inline styles into a scoped `<c>.demo.component.scss` (`<prefix>-schem__*` classes — copy the pattern from `right-panel.demo.component.scss`) and wire it via `styleUrls`. **A "States"/"Anatomy" grid when React shows a Schematic+legend is the #1 recurring two-window drift — match React exactly.** Uses `Odyssey<C>Module`. Sets `meta.normalizing: true`.
- **`<c>.demo.meta.ts`** — `{ name, tier, figmaNode, normalizing: true }`. Mirrors the React `meta` object shape.
- **`demos.registry.ts`** — append the new demo entry.
- **`app.module.ts`** — declare/import the new demo component and `Odyssey<C>Module`.

**React side — put the React component in its Normalizing tab too (for a symmetric two-window review):** ensure the React demo `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` has `meta.normalizing: true`.
- **Backlog ports** (already-normalized components — the flag was cleared when they first shipped): ADD `normalizing: true` back temporarily now; it clears again on Phase 5 pass.
- **New components** coming straight through `/normalize`: the flag is already set — `/normalize` Phase 3 defers clearing it (Step 8d hands off here), so the React component already sits in its Normalizing tab.
Either way, Phase 4 then shows the component in BOTH DSMs' Normalizing tabs.

**Typography utilities (if any were flagged in Phase 1):** port missing `.text-*` classes from `apps/odyssey-one/src/styles/components.css` into `projects/odyssey-ui/src/styles/_typography.scss` before the component SCSS references them (G1).

**Token additions (if any were flagged in Phase 1):** add missing `--token` entries to `projects/odyssey-ui/src/styles/_tokens.scss` (G4). Use the exact same name and value as in `packages/tokens/tokens.css` — no renames.

**Shared primitive CSS (components that share a base class):** some components share a CSS base — e.g. Checkbox + Radio both use `.control` / `.control__*`. Policy: the **first** component to use a shared base **self-contains** those rules in its own component SCSS (component-scoped). When the **second** component sharing that base is ported, **extract** the shared rules into `projects/odyssey-ui/src/lib/_shared/<base>.scss` and `@use` it from both component SCSSes (rules stay component-scoped per import; source stays DRY). Never silently duplicate a shared base across 3+ components. (Checkbox — the first control — self-contains `.control` today; Radio's port performs the extraction.)

---

## Phase 3 — Verify (BLOCKING)

Run all five checks in order. All must be green. If any fail, fix and re-run from that step — do not proceed to Phase 4 with a red check.

```bash
# 1. Parity-lint (machine-checkable gotcha subset)
node tools/angular-parity-lint.mjs <c>

# 2. Library build
npx ng build odyssey-ui

# 3. Explorer app build
npx ng build

# 4. Library unit tests
npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless

# 5. Explorer app unit tests
npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless
```

All commands run from the `odyssey-one-library-ui/` repo root.

**A port that fails lint or any build/test is not done.** Fix the underlying violation (not the lint), re-run. Common failure patterns:

- Lint: missing `className` input → add `@Input() className = ''` + class binding
- Lint: hardcoded hex in SCSS → replace with `var(--token)`
- Lint: missing `::ng-deep` for a slot → add scoped descendant rule
- Lint: `Odyssey<C>Module` not in `OdysseyUiModule` → add to imports + exports array
- Build: missing `public-api.ts` export → add both component + module exports
- Test: wrong import path → use public-api re-exports, not relative component paths

---

## Phase 4 — Two-Window Review (BLOCKING)

Build the library and bring up both DSMs:

```bash
# In odyssey-one-library-ui/
npx ng build odyssey-ui

# Restart Angular DSM (fresh dist — library changes require a serve restart)
npx ng serve --port 4200

# In odyssey-one/ (separate terminal)
npm run dev:odyssey-one          # React DSM → /design-system
```

Open both:
- **Angular DSM:** `http://localhost:4200` → Normalizing tab → `<Component>`
- **React DSM:** `http://localhost:<port>/design-system` → Normalizing tab → `<Component>`

Both must show the component in their Normalizing tabs. Verify:
- The states/variants grid matches across both DSMs
- Tokens render correctly (no missing color/spacing/radius)
- Interactive states (hover, focus, active, disabled) behave consistently
- `className` passthrough applies additional classes visually
- Icon slots (if any) render at the correct size and color

### GATE B — Wait for explicit user approval

> **STOP. Do not clear any `normalizing` flag. Do not finalize exports. Do not update the tracker.**

Wait for the user to reply with one of: `go`, `yes`, `approved`, `looks good`, `ok`, `proceed`.

Mid-stream questions, edit requests, or silence are **not approved** — stay in Phase 4, address the feedback, re-run Phase 2 (Angular only; React is frozen — no rework cascade), re-verify (Phase 3), re-serve (Phase 4), screenshot, wait again.

On reject: Manuela states what's wrong → re-run Phase 2 (Angular generation only). React demo and React component are not touched — reject applies only to the Angular output.

---

## Phase 5 — On Pass (twin reviewed → PORTED)

> **When does the port run?** The Angular port is **batched**: it runs after the whole React batch is **APPROVED** and you give **batch approval** — NOT per-component right after each React GATE B. React components are already `approved: true` when this routine runs.

Only enter after the twin's two-window GATE B passes. The port's output is the **PORTED** state — NOT clearing, NOT versioning.

### Mark ported (both DSMs) — keep it staged

1. **React demo:** `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` — set `ported: true` (KEEP `normalizing: true` + `approved: true`). Renders the **PORTED** badge (blue).
2. **Angular demo:** `odyssey-one-library-ui/src/app/demos/<c>.demo.meta.ts` — set `ported: true` (KEEP `normalizing: true` + `approved: true`). Same PORTED badge in the Angular explorer.

Both DSMs now show PORTED — the shared drift-review window (review the Angular twin for drift + a final React re-check). Still no `version`.

### Finalize library export

Verify `public-api.ts` exports are present (should be set in Phase 2, confirm nothing was accidentally reverted during Phase 3 fixes).

### Update `figma-link.md` `last_synced`

Set `last_synced` to today's ISO date in `odyssey-one-library-ui/projects/odyssey-ui/src/lib/<c>/<C>.figma-link.md`.

### Refresh the DSM domain filter

From the **odyssey-one** repo root, run `npm run domain-usage`. It regenerates `domain-usage.json` for BOTH the React DSM and this Angular library repo (`tools/domain-usage.mjs` writes both — the Angular target is `../odyssey-one-library-ui/src/app/dsm/domain-usage.json`).

### Commit locally (no PR, no push yet)

Commit the new `lib/<c>/` + demo + wiring locally on the batch branch. **Do NOT push or open the PR** — that happens at final approval (below). Local commits only ([[feedback_no_push_angular_without_approval]]).

### One-line confirmation

Output: `Ported: <Component> (tier) — Angular twin in lib/<c>/, PORTED badge in both DSMs. Awaiting final approval.`

---

## Phase 6 — Final approval (close: clear + version + commit + push)

Triggered by a **separate explicit command** to finally approve the whole PORTED batch. Applies to EVERY component staged (`normalizing: true`) in the batch.

### 1. Clear all three flags + assign the version — every component, BOTH DSMs

For each component, in BOTH DSMs (`<C>.demo.jsx` + `<c>.demo.meta.ts`):
- remove `approved` + `ported` and set `normalizing: false` (promotes out of staging into its tier tab), and
- stamp `version: 'x.y.z'` — the batch's release version (same for all). For a re-normalized/changed component this **advances** its `version` ([[feedback_version_on_modification]]). Drives the version badge + header chip + "Latest only" filter.

### 2. Update `playground/normalization-tracker.md`

Add/update each row — Angular column `done` (batch date ISO), `figma-link.md` path, deviations, `@oneodyssey/ui` version.

### 3. Commit + push BOTH repos

- **React (`odyssey-one`):** commit + push (its own branch/PR flow).
- **Angular (`odyssey-one-library-ui`):** bump `projects/odyssey-ui/package.json` `version` + CHANGELOG, commit, `git push` the batch branch → `gh pr create --base main` (protected). Merge via teammate approval + "Build Check", or `--admin`.

### 4. NO npm publish

Do **not** `npm publish` / dispatch the release workflow. Publishing is **Cognizant's** ([[feedback_cognizant_owns_npm_publish]]) — hand off the publish-ready version + CHANGELOG.

### One-line confirmation

Output: `Batch <x.y.z> closed: N components promoted (flags cleared, version stamped), both repos committed + pushed. Publish is Cognizant's.`

---

## Component tiers (port order)

Components are classified by translation complexity. Run the batch **tier-ordered (1 → 4)** — broad fast validation first, escalating to judgment-heavy DOM/observer work.

- **Tier 1 — pure-class, presentational/conditional (~24):** template + `[ngClass]`, classes copied verbatim from `components.css`. Fastest to port; do these first. Examples: Button, Checkbox (appearance states), Badge (pure-class variant), most layout wrappers.
- **Tier 2 — simple state (~6: Accordion, AuthContent, SearchField, Checkbox, ModalLarge, ModalMedium):** `@Input/@Output` + property binding. Slightly more logic, but no DOM measurement. Example: Checkbox's `[indeterminate]` DOM property binding.
- **Tier 3 — DOM measurement / side-effects (~5: ButtonToggle, WidgetPieChart, FormField, MenuDropdown):** require `ngAfterViewInit` + `@ViewChild` to replicate `useRef` + `useLayoutEffect` patterns.
- **Tier 4 — observers / complex state (~3: GlobalSearch, Widget, WidgetsLeftMenu):** RxJS, `ResizeObserver`/`IntersectionObserver` lifted into Angular services or directives, `@ContentChild` projection for render-prop patterns.
- **Plus inline/computed-styled (8: Badge, FilterSuggestions, Navbar, PageHeader, OdysseyLogo, SidebarButton, MenuRow, LeadNav):** these use `[ngStyle]` + variants-map translation (orthogonal to the tier above — a Tier 1 component can still be inline-styled).

**Model scaling by tier:** Tier 1–2 generation uses Sonnet (code output from clear spec). Tier 3–4 uses the most capable model — DOM and observer translation requires judgment. Reviews (Phase 4) always use the most capable model regardless of tier.

---

## Throughput & Order

**First 2–3 ports: one-at-a-time.** Prove the routine, lint, and gotcha rules generalize before batching. Include at least one slotted molecule among the first 3 to validate G7/G9 in a real scenario. The HARD RULE: do not hand off to Cognizant until at least 2–3 ports have passed the full routine.

**Then batches of 3–5, tier-ordered.** The Angular DSM's Normalizing tab holds the cluster naturally. Run Phase 1 for all components in the batch, then a single Phase 2 subagent dispatch for the batch (Tier 1–2 batches together; Tier 3–4 batches separately with a higher-capability model), then Phase 3 sequentially per component, then Phase 4 two-window showing all in the Normalizing tab.

**Tier order within batches: Tier 1 → Tier 2 → Tier 3 → Tier 4.** Molecules and organisms compose atoms — atoms must land in the library before their dependents are ported.

---

## Model Gateway

| Phase | Model | Reason |
|---|---|---|
| Phase 1 (Gather) | Sonnet | Reads, diffs, checklist work |
| Phase 2 (Generate) — Tier 1–2 | Sonnet subagent | Code generation from clear spec; className-based + simple-state components |
| Phase 2 (Generate) — Tier 3–4 | Opus subagent | DOM/observer translation is judgment-heavy; `@ViewChild`, RxJS, `@ContentChild` patterns |
| Phase 3 (Verify) | — | Mechanical (lint + build + test) |
| Phase 4 (Review) | Opus | Drift/parity judgment across two live surfaces — always most capable, regardless of tier |
| Phase 5 (Pass) | Sonnet | File updates, tracker entries |

Default to Sonnet. Escalate to Opus for: Phase 4 visual parity judgment; Tier 3–4 Phase 2 generation (DOM measurement, observer wiring, complex projection); any cross-file architectural decision (e.g. "should this slot be projected content or a rendered child?"). Do not default to Opus for Tier 1–2 generation — Sonnet is the right tier for className-based + simple-state output from a well-specified routine.

---

## Rules

- **React is read-only during every Angular port.** No edits to `packages/ui/`, `apps/odyssey-one/src/`, or any React file while porting. React was frozen when it passed `/normalize` Phase 3.
- **Angular `_tokens.scss` is 1:1 with `packages/tokens/tokens.css`.** Exact same names and values. No renames, no omissions, no extras without a matching React-side token.
- **Every `var(--…)` reference must exist in `_tokens.scss`.** Verify pre-generation (Phase 1 step 5) — do not generate with unknown token references.
- **`className` passthrough is non-negotiable.** Every component, every time. Modifier tones applied by consumers depend on it.
- **Lint failure blocks the port.** Fix the code, not the lint assertion.
- **GATE B blocks promotion.** Do not clear `normalizing` flags, update the tracker, or finalize exports before the user says go.
- **Reject → Angular Phase 2 only.** A reject at GATE B never touches React. The React component is approved and frozen.

### Pre-completion checklist (run before declaring any phase done)

#### Phase 3 complete when:
- [ ] `node tools/angular-parity-lint.mjs <c>` exits 0
- [ ] `npx ng build odyssey-ui` exits 0
- [ ] `npx ng build` exits 0
- [ ] `npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless` all green
- [ ] `npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless` all green

#### Phase 5 complete when:
- [ ] React `<C>.demo.jsx` `meta.normalizing` cleared
- [ ] Angular `<c>.demo.meta.ts` `normalizing` cleared
- [ ] `public-api.ts` exports present for component + module
- [ ] `playground/normalization-tracker.md` Angular column updated
- [ ] `<C>.figma-link.md` `last_synced` updated to today

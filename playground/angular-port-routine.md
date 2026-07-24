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

**SCRIPTED (S85):** run the readiness script from the `odyssey-one` repo root — it performs the entire gather checklist mechanically and prints the readiness report (props/defaults, state-rule + token inventory, missing `_tokens.scss` / `_typography.scss` entries, complexity flags → tier suggestion, demo section titles):

```bash
node tools/port-readiness.mjs <Component>
```

Read the report, sanity-check anything flagged, and paste it into the Phase 2 subagent prompt. Only fall back to the manual checklist below if the script errors on an unusual component shape.

<details><summary>Manual fallback checklist</summary>

1. Read `packages/ui/src/<C>.jsx` — props API, variant axes, slots, icons, conditional class logic.
2. Read the component's CSS blocks in `apps/odyssey-one/src/styles/components.css` — ALL state rules + every `var(--token)`.
3. Read `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` — `meta.figmaNode`, `meta.tier`, `props` array, `tokens` array, states grid.
4. Grep `_typography.scss` for missing `.text-*` classes (G1).
5. Grep `_tokens.scss` for missing tokens (G4).
6. Output a short readiness summary.

</details>

---

## Phase 2 — Generate

**SCRIPTED FIRST (S85):** for a NEW port, scaffold the boilerplate before dispatching the subagent:

```bash
node tools/scaffold-port.mjs <Component>        # from odyssey-one root; --dry-run to preview
```

This generates the full 10-file skeleton (component ts/html/scss/spec + module + figma-link.md + all 4 demo files with meta/props/tokens translated and the demo HTML section skeleton extracted from the React demo) AND applies the 4 wiring edits (public-api, OdysseyUiModule, demos.registry, app.module) — structurally satisfying G5/G8/G12 up front. The React CSS rules land as a commented reference block inside the component SCSS.

> Then delegate the FILL to the **`angular-porter` custom agent** (`.claude/agents/angular-porter.md`; Opus low for Tier 1–2; Fable low for Tier 3–4 — the readiness report suggests the tier). Provide it the Phase 1 readiness report; its job is now only the `TODO(port)` markers: component logic, template, SCSS translation-in-place, spec behavior cases, and demo playground interactivity. For UPDATE ports (twin already exists) skip the scaffold and delegate as before. The subagent applies all 12 gotcha rules.

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

**SCRIPTED (S85):** one command from the `odyssey-one` repo root runs the whole matrix (React tests+build, Angular parity-lint, demo-parity-lint, both ng builds, both Karma suites) and prints a compact scoreboard — read only the scoreboard, not raw build output:

```bash
node tools/verify-all.mjs                 # everything
node tools/verify-all.mjs --angular-only  # port-only cycles
```

The matrix includes **`demo-parity-lint`** (odyssey-one-library-ui/tools/) — the structural React↔Angular DSM drift check (meta fields, props/tokens sets, section titles, playground control counts). Demo drift is now a lint failure, not a two-window discovery.

All checks must be green. If any fail, fix and re-run — do not proceed to Phase 4 with a red check.

<details><summary>Individual commands (fallback, from odyssey-one-library-ui/)</summary>

```bash
node tools/angular-parity-lint.mjs <c>
npm run lint:demo-parity -- <c>
npx ng build odyssey-ui
npx ng build
npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless
npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless
```

</details>

**A port that fails lint or any build/test is not done.** Fix the underlying violation (not the lint), re-run. Common failure patterns:

- Lint: missing `className` input → add `@Input() className = ''` + class binding
- Lint: hardcoded hex in SCSS → replace with `var(--token)`
- Lint: missing `::ng-deep` for a slot → add scoped descendant rule
- Lint: `Odyssey<C>Module` not in `OdysseyUiModule` → add to imports + exports array
- Build: missing `public-api.ts` export → add both component + module exports
- Test: wrong import path → use public-api re-exports, not relative component paths

---

## Phase 3b — Functional QA / React parity (BLOCKING, added S89)

Builds and passing specs are NOT functional proof — the S89 batch shipped with green builds and 6 interaction bugs (checkbox clicks dead, DatePicker month un-editable, MultiSelect crashing the dev server, and 3 more found only under QA). For **every ported or modified component**, before Phase 4:

1. **Read the React contract first** — the component's `.jsx` + `.test.jsx` define the behavior spec (keyboard model, focus/blur, edge cases), not the Angular code you just wrote.
2. **Exercise every real interaction path** and assert parity: click/toggle, typing + deleting + retyping (controlled-input round-trip), keyboard (Arrow wrap/scroll-into-view, Enter, Escape, Tab), focus/blur open-close, disabled, bounds/edge cases.
3. **Specs must tick change detection between steps** — event-sequence specs without `detectChanges()` between keystrokes pass while the real app breaks. For extra confidence, drive the live DSM with headless Chrome (CDP); remember the DSM serves the BUILT lib — `npx ng build odyssey-ui` first (specs importing from `'odyssey-ui'` also test `dist/`, so **always rebuild before trusting the Karma suite**).
4. Every divergence found: root-cause, fix to match React, leave a permanent guarding spec.

Recurring Angular-twin bug classes to check explicitly (all found in real ports):

- **`@Output()` name colliding with a native bubbling DOM event** (`change`, `select`, …) when the template forwards that same native event → consumer handler fires twice. Swallow the native bubble (`stopPropagation`) before emitting, or rename the output.
- **Host-wide `focusin`/`focusout` listeners** where React binds the input only → popover reopens when tabbing to inner buttons. Gate on `e.target`.
- **Getters returning fresh arrays/objects each CD pass** feeding `ngOnChanges`-sensitive children (virtualizers) → infinite CD loop. Memoize keyed on inputs (the `useMemo` twin).
- **`[value]` binding ≠ React controlled input** — when a mask/filter rejects input, the bound expression doesn't change, so the DOM keeps the raw string and diverges from the model. Write the filtered value back to the DOM manually (+ caret restore).
- **Stale-measure invalidation keyed on the wrong signal** (row *count* vs row identity, `ngOnInit`-only derivations that ignore later input changes).

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

**SCRIPTED (S85):** from the `odyssey-one` repo root:

```bash
node tools/dsm-flags.mjs <ComponentA> <ComponentB> … --port    # --dry-run to preview
```

Sets `ported: true` in BOTH DSMs' metas (keeps `normalizing` + `approved`) and prints the per-repo field diffs. (Manual fallback: edit `<C>.demo.jsx` + `<c>.demo.meta.ts` metas by hand.)

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

### 1. Run the release closer — every component, BOTH DSMs

**SCRIPTED (S85):** from the `odyssey-one` repo root:

```bash
node tools/release.mjs <x.y.z> --components <A,B,C,…>    # --dry-run first, review the diff summary
```

The script does the mechanical closing: in BOTH DSMs' metas it removes `approved` + `ported`, sets `normalizing: false`, stamps `version` (advancing it for modified components — [[feedback_version_on_modification]]) and stamps `createdVersion` ONLY where absent/null (never overwrites — new-in-batch components only); bumps `projects/odyssey-ui/package.json`; inserts the CHANGELOG `## <version> — <date>` section with per-component TODO bullets sorted into Added (createdVersion stamped this run) vs Changed.

**Model then fills the prose:** CHANGELOG bullet descriptions + the tracker narrative.

### 2. Update `playground/normalization-tracker.md`

Add/update each row — Angular column `done` (batch date ISO), `figma-link.md` path, deviations, `@oneodyssey/ui` version. (Prose — not scripted.)

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

**Model scaling by tier (2026-07-15 policy):** Tier 1–2 generation uses Opus low (code output from clear spec, gated by lint + measure). Tier 3–4 uses Fable low — DOM and observer translation requires judgment no mechanical gate covers; escalate to Fable med only after a Fable-low failure.

---

## Throughput & Order

**First 2–3 ports: one-at-a-time.** Prove the routine, lint, and gotcha rules generalize before batching. Include at least one slotted molecule among the first 3 to validate G7/G9 in a real scenario. The HARD RULE: do not hand off to Cognizant until at least 2–3 ports have passed the full routine.

**Then batches of 3–5, tier-ordered.** The Angular DSM's Normalizing tab holds the cluster naturally. Run Phase 1 for all components in the batch, then a single Phase 2 `angular-porter` dispatch for the batch (Tier 1–2 batches together on Opus low; Tier 3–4 batches separately on Fable low), then Phase 3 sequentially per component, then Phase 4 two-window showing all in the Normalizing tab.

**Tier order within batches: Tier 1 → Tier 2 → Tier 3 → Tier 4.** Molecules and organisms compose atoms — atoms must land in the library before their dependents are ported.

---

## Model Gateway

> **Policy (2026-07-15):** ladder is Opus low → Fable low → Fable med. No Haiku, no Sonnet, no Opus high/xhigh/max. Escalate on failure only; never retry the same tier twice. Rule of thumb: a mechanical gate (lint / measure / tests) covers the phase's failure mode → Opus low; no gate (judgment) → Fable.

| Phase | Model | Reason |
|---|---|---|
| Phase 1 (Gather) | Opus low | Reads, diffs, checklist work |
| Phase 2 (Generate) — Tier 1–2 | Opus low subagent | Code generation from clear spec; gated by lint + measure |
| Phase 2 (Generate) — Tier 3–4 | Fable low subagent | DOM/observer translation is judgment-heavy; `@ViewChild`, RxJS, `@ContentChild` patterns |
| Phase 3 (Verify) | — | Mechanical (scripts: lint + build + test) |
| Phase 4 (Review) | Fable low | Drift/parity judgment across two live surfaces — no mechanical gate |
| Phase 5 (Pass) | Opus low | File updates, tracker entries (mostly scripts now) |

Default to Opus low. Escalate to Fable for: Phase 4 visual parity judgment; Tier 3–4 Phase 2 generation (DOM measurement, observer wiring, complex projection); any cross-file architectural decision; any component where an Opus-low attempt failed a gate twice. Fable med only when Fable low itself fails once.

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

# Angular Port Routine (`/port-to-angular`)

> Triggered by `/port-to-angular <Component>`. Also reached from `/normalize` Phase 3 after the React component is approved + Figma library published. Be **concise** — one short status line per phase, batch decisions, only block on genuinely unknown values.

**What this does:** ports an already-normalized React component to its Angular twin in the `odyssey-angular-dsm` workspace — correct-by-construction, two-window reviewed, and inserted into the library on pass.

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

**The canonical template is `projects/odyssey-ui/src/lib/button/` in `odyssey-angular-dsm`.** Copy its file/module/spec structure for every port.

**The parity-lint (`tools/angular-parity-lint.mjs`) mechanically enforces the machine-checkable subset below. A port that fails the lint is not done.**

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

4. **Check `.text-*` typography utilities** — grep `_typography.scss` in `odyssey-angular-dsm/projects/odyssey-ui/src/styles/` for every `.text-*` class referenced in the React component or its CSS. List any missing classes — they must be ported in Phase 2 before the component is generated (G1).

5. **Check `_tokens.scss`** — confirm every `var(--…)` in the component's CSS has a matching entry. List any missing tokens — they must be added in Phase 2 (G4).

6. **Output a short readiness summary:** prop count, state count, typography utilities to add (if any), tokens to add (if any). One short paragraph. Do not start Phase 2 without this summary.

---

## Phase 2 — Generate

> Delegate to a subagent (Sonnet). Provide it the Phase 1 readiness summary + the relevant source files. The subagent generates everything in the list below, applying all 12 gotcha rules.

The subagent produces, inside `odyssey-angular-dsm/`:

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

- **`<c>.demo.component.ts/.html/.scss`** — mirrors the React demo grid. Uses `Odyssey<C>Module` in the demo module (or declared in `AppModule` via the demo entry). Sets `meta.normalizing: true` in the meta file so the component surfaces in the Normalizing tab of the Angular DSM explorer (not promoted to its tier tab until GATE B passes).
- **`<c>.demo.meta.ts`** — `{ name, tier, figmaNode, normalizing: true }`. Mirrors the React `meta` object shape.
- **`demos.registry.ts`** — append the new demo entry.
- **`app.module.ts`** — declare/import the new demo component and `Odyssey<C>Module`.

**Typography utilities (if any were flagged in Phase 1):** port missing `.text-*` classes from `apps/odyssey-one/src/styles/components.css` into `projects/odyssey-ui/src/styles/_typography.scss` before the component SCSS references them (G1).

**Token additions (if any were flagged in Phase 1):** add missing `--token` entries to `projects/odyssey-ui/src/styles/_tokens.scss` (G4). Use the exact same name and value as in `packages/tokens/tokens.css` — no renames.

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

All commands run from the `odyssey-angular-dsm/` repo root.

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
# In odyssey-angular-dsm/
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

## Phase 5 — On Pass

Only enter after GATE B approval phrase received.

### Clear both `normalizing` flags

1. **React demo:** `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` — set `meta.normalizing` to `false` (or remove the property). This promotes the component out of the React DSM's Normalizing tab into its tier tab (Atoms/Molecules/Organisms).
2. **Angular demo:** `odyssey-angular-dsm/src/app/demos/<c>/<c>.demo.meta.ts` — set `normalizing: false`. Same promotion effect in the Angular DSM explorer.

### Finalize library export

Verify `public-api.ts` exports are present (should be set in Phase 2, confirm nothing was accidentally reverted during Phase 3 fixes).

### Update `playground/normalization-tracker.md`

Add or update the component's row with the Angular column filled in:
- Angular column: `done` (with the port date ISO)
- `figma-link.md` path (relative from repo root)
- Any deviations from the React spec noted in `<C>.figma-link.md`

### Update `figma-link.md` `last_synced`

Set `last_synced` to today's ISO date in `odyssey-angular-dsm/projects/odyssey-ui/src/lib/<c>/<C>.figma-link.md`.

### One-line confirmation

Output: `Port complete: <Component> (tier) — Angular twin in lib/<c>/, both DSMs promoted. Normalizing flags cleared.`

---

## Throughput & Order

**First 2–3 ports: one-at-a-time.** Prove the routine, lint, and gotcha rules generalize before batching. Include at least one slotted molecule among the first 3 to validate G7/G9 in a real scenario. The HARD RULE: do not hand off to Cognizant until at least 2–3 ports have passed the full routine.

**Then batches of 3–5.** The Angular DSM's Normalizing tab holds the cluster naturally. Run Phase 1 for all components in the batch, then a single Phase 2 subagent dispatch for the batch, then Phase 3 sequentially per component, then Phase 4 two-window showing all in the Normalizing tab.

**Tier order: atoms → molecules → organisms.** Molecules and organisms compose atoms — atoms must land in the library before their dependents are ported.

---

## Model Gateway

| Phase | Model | Reason |
|---|---|---|
| Phase 1 (Gather) | Sonnet | Reads, diffs, checklist work |
| Phase 2 (Generate) | Sonnet subagent | Code generation from clear spec |
| Phase 3 (Verify) | — | Mechanical (lint + build + test) |
| Phase 4 (Review) | Opus | Drift/parity judgment across two live surfaces |
| Phase 5 (Pass) | Sonnet | File updates, tracker entries |

Default to Sonnet. Escalate to Opus only for Phase 4 visual parity judgment and any cross-file architectural decision (e.g. "should this slot be projected content or a rendered child?"). Do not default to Opus for generation — Sonnet is the right tier for code output from a well-specified routine.

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

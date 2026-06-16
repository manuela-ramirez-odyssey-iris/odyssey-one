# Angular Port Gate (`/port-to-angular`) — Design (Sub-project B)

- **Date:** 2026-06-16
- **Status:** Approved (design); spec under user review
- **Author:** Claude (Opus 4.8, xhigh) + Manuela
- **Sources:** `docs/superpowers/specs/2026-06-15-angular-dsm-design.md` (sub-project A); memory `project_normalize_angular_skill_concept` (gotchas 1–12), `project_poc2_demo_project_location`, `feedback_design_system_scope_visual_only`, `project_poc_political_objective`; `playground/figma-component-routine.md` (the React `/normalize` routine); exploration of `linx-odyssey-usermanagement-ui` (Cognizant conventions, 2026-06-16); in-session decisions 2026-06-16.

---

## 1. Framing

Sub-project **A is done**: the `odyssey-angular-dsm` workspace exists — a self-contained `odyssey-ui` library (Button + token layer + fonts + lucide peer) and a DSM explorer mirroring the React `/design-system` route. **A proved one component end-to-end.**

Sub-project **B** (this spec) is the **gate that makes the remaining ~37 components scalable**: a routine that takes an *already-normalized React component* and produces its Angular twin — **correct-by-construction** (the per-port bugs from A's build are encoded as standing rules + mechanically enforced), reviewed two-window, and inserted into the library on pass. It also hooks into `/normalize` so *future* new components get a React + Angular twin in one flow.

This is **not** a migration of Odyssey to Angular. The React app stays canonical; the Angular library is the generated, Cognizant-facing deliverable (visual-only ownership).

### Settled decisions (from brainstorming, do not reopen)
1. **Form:** a standalone routine (`playground/angular-port-routine.md`), invocable on any already-normalized React component (clears the 37 backlog), **and** referenced by `/normalize` Phase 3 for new components.
2. **Enforcement:** a **parity-lint** (mechanical gotcha + Cognizant-conformance checks) that *blocks* a port that violates the rules — not a checklist-only.
3. **Review cadence:** first **2–3 ports one-at-a-time** (prove the routine + lint; satisfies the HARD RULE before any Cognizant handoff), then **batches of 3–5**. Tier order **atoms → molecules → organisms**.
4. **Per-component modules:** each component ships an `Odyssey<C>Module` (PrimeNG-style, matches the Cognizant POC), with `OdysseyUiModule` kept as a convenience aggregate that re-exports all. (Includes refactoring the existing Button to this pattern.)
5. **One change to `/normalize`:** Phase 3 no longer clears the React demo's `meta.normalizing` flag; it clears only when the Angular twin passes (so the two-window compare works).
6. **Cognizant conformance is mandatory** (see §7) — verified by the exploration of their app + the inserted Button POC.

---

## 2. Cognizant conformance (the target conventions)

From `linx-odyssey-usermanagement-ui` (their app) + the Button POC we inserted there:
- **Angular 17, NgModule** (standalone off). ✓ matches our library.
- **App** uses selector prefix `linx-usermanagement-*` for ITS components; **library** components keep the **`odyssey-*`** namespace (the POC's `odyssey-button` confirms this). Our `odyssey` prefix is correct and must be preserved.
- **Per-component `*.component.ts/.html/.scss` + a module** — their PrimeNG world imports per-component modules (`ButtonModule`, `DialogModule`); the POC used `OdysseyButtonModule`. → drives decision #4.
- **Tokens** as `:root{--token}` CSS custom properties consumed via `var(--…)`; they **coexist with** `@oneodyssey/components`/PrimeNG Sass `$vars` (no collision). The library deploys its tokens/typography into the consuming app's global styles — a consumer does `@use 'odyssey-ui/styles/index'` in `src/styles.scss` (or adds dist styles to `angular.json`). This is exactly how the POC wired it.
- **Font** `@fontsource/inter` (self-hosted), **icons** `lucide-angular` (`LucideAngularModule.pick({...})` per feature module, `<i-lucide slot="icon" name="…">`). ✓ matches.

**Caution (out of band):** the clone's git **push URL currently points at the live `github.com/OneOdyssey/…` repo** — the `no_push` guard isn't set at the git-config level. Re-set `git remote set-url --push origin no_push` before any work there. This spec does not modify their repo.

---

## 3. Form & invocation

A standalone routine doc **`playground/angular-port-routine.md`** (sibling to `figma-component-routine.md`). Invoked:
- **Standalone:** `/port-to-angular <Component>` — on an already-normalized React component (the 37 backlog).
- **Hooked into `/normalize`:** one-line handoff added to `figma-component-routine.md` **Phase 3, after the Figma library publish** (the point at which the React component is fully approved + published). The React `normalizing` flag clear (currently a Phase 3 step) **moves** into the Angular routine's pass step.

---

## 4. Inputs (per component)

The already-normalized React artifacts (read-only sources):
- `packages/ui/src/<C>.jsx` (+ `<C>.figma.tsx` for the Figma node + prop mapping).
- The component's CSS blocks in `apps/odyssey-one/src/styles/components.css` (verbatim port source).
- The demo `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` (`meta`/`props`/`tokens` + the states/variants grid to mirror).
- Referenced `.text-*` typography utilities (already global in the library — verify coverage).
- The Figma master node (from the demo `meta.figmaNode`).

---

## 5. The port phases (per component)

1. **Gather** — read the React canonical: component (props/variants/slots), its `components.css` blocks (all states), the demo `meta`/`props`/`tokens` + grid structure, and the typography utilities it references.
2. **Generate (subagent)** — emit, with `meta.normalizing: true`:
   - `projects/odyssey-ui/src/lib/<c>/` — `odyssey-<c>.component.ts/.html/.scss`, `odyssey-<c>.module.ts` (`Odyssey<C>Module`), `<C>.figma-link.md`, `odyssey-<c>.component.spec.ts`.
   - `OdysseyUiModule` updated to import/export `Odyssey<C>Module`.
   - `public-api.ts` updated to export the component + module.
   - The explorer demo `src/app/demos/<c>.demo.component.*` + `<c>.demo.meta.ts`, appended to `demos.registry.ts`, declared in `AppModule`.
   - **Applying the 12 gotchas as standing rules** (§6) — every component gets the `className` passthrough; every slotted component gets the projected-content styling pattern; icons use descendant selectors; tokens consumed as `var(--…)`; etc.
3. **Verify** — run the **parity-lint** (§6) + `ng build odyssey-ui` + `ng build` + `ng test odyssey-ui` + `ng test dsm-explorer`. All green or the port is **blocked** (fix, re-run).
4. **Two-window review** — build the library, (re)serve both DSMs, surface/open both URLs (§8). Both show the component in their Normalizing tabs. Manuela compares.
5. **Pass** → clear **both** `normalizing` flags (React demo + Angular demo), promote to tier in both explorers, finalize the library export, update `playground/normalization-tracker.md` (Angular column) + the component's `figma-link.md` `last_synced`. **Reject** → Manuela states what's wrong → re-run **step 2 only** (Angular stage; React is frozen — no rework cascade).

---

## 6. The encoded gotcha set + parity-lint (the scalability backbone)

The routine encodes all 12 gotchas (memory `project_normalize_angular_skill_concept`) as **mandatory generation rules**, and a **parity-lint** asserts them mechanically per component. Lint failure blocks the port.

**Generation rules (every port):**
- **G1 typography utilities:** the `.text-*` classes the component references exist in the library `_typography.scss` (port any missing).
- **G2/G3 fonts/smoothing:** already shipped in `styles/index` (library-level) — verify still present.
- **G4 tokens:** component SCSS consumes `var(--…)` only; any token it needs exists in `_tokens.scss` (1:1 from canonical).
- **G5 alignment artifact:** `<C>.figma-link.md` emitted (Figma node + canonical source + `last_synced` + deviations).
- **G7 projected content + encapsulation:** every `<ng-content>` slot has a matching `::ng-deep` (scoped under the slot) or the component sets `ViewEncapsulation.None` — no bare component-scoped `> svg`/slot selectors that can't reach projected content.
- **G8 className passthrough:** every component exposes `@Input() className = ''` merged into its class binding (React-faithful; required for modifier tones).
- **G9 icon wrapper:** descendant selectors (not direct-child) + wrapper normalization for projected lucide `<i-lucide><svg>`.
- **G10 packaging:** library stays self-contained — `@fontsource/inter` dep, `lucide-angular` optional peer, styles shipped in dist (don't regress).
- **G11 workspace/test config:** test target keeps `stylePreprocessorOptions.includePaths`; commands use `npx ng`; tests run project-specific.
- **Cognizant conformance:** selector is `odyssey-<c>` (kebab, `odyssey-` prefix); a per-component `Odyssey<C>Module` exists + is re-exported by `OdysseyUiModule`; `*.component.ts/.html/.scss` file convention.

**Parity-lint** — a Node script `tools/angular-parity-lint.mjs` in the `odyssey-angular-dsm` repo (run per component, and over all components in CI/pre-batch), asserts (machine-checkable subset): `className` input present + merged; no hardcoded hex in component SCSS (only `var(--…)`); every `select="[slot=…]"` has a corresponding `::ng-deep`/descendant rule; selector matches `odyssey-<kebab>`; `Odyssey<C>Module` present + in `OdysseyUiModule` + `public-api.ts`; `figma-link.md` present with a current `last_synced`; library `package.json`/`ng-package.json` self-contained (fonts dep + lucide peer + `allowedNonPeerDependencies`). The lint has its own unit test. **This is what stops the 37 from re-introducing A's bugs.**

---

## 7. Per-component module pattern

Each component ships `Odyssey<C>Module` (declares + exports its component + imports `CommonModule`), mirroring PrimeNG's per-component modules and the inserted Button POC. `OdysseyUiModule` becomes an **aggregate** that imports + re-exports every `Odyssey<C>Module` (so consumers can `imports: [OdysseyUiModule]` for everything, or `imports: [OdysseyButtonModule, OdysseyDialogModule]` for granular/tree-shaken use — the PrimeNG-native ergonomic). **Includes refactoring the existing Button** (currently only in the single `OdysseyUiModule`) to add `OdysseyButtonModule` + have `OdysseyUiModule` re-export it — this becomes the template all ports follow.

---

## 8. Two-window / DSM-open mechanism

At the review step the routine: `ng build odyssey-ui` → restart the Angular `ng serve` (`:4200`) on fresh dist → ensure the React DSM is up (`npm run dev:odyssey-one`) → surface + open both URLs (React `/design-system`, Angular `:4200`), each with the component in its Normalizing tab. One action, no manual server juggling (the "open each DS when convenient" ask). Note: the Angular dev server resolves the library from `dist/`, so a library change requires `ng build odyssey-ui` + serve restart to be visible.

---

## 9. Throughput & order

- **First 2–3 ports one-at-a-time** (e.g. a slotted molecule among them) to prove the routine + lint + the gotcha rules generalize — the HARD-RULE validation before any Cognizant handoff.
- **Then batches of 3–5** (the Normalizing tab holds the cluster; `collectNormalizing` already returns a sorted array).
- **Tier order atoms → molecules → organisms** (molecules/organisms compose atoms, so atoms must land in the library first).

---

## 10. Outputs per component

- Library: `projects/odyssey-ui/src/lib/<c>/` (`*.component.ts/.html/.scss`, `Odyssey<C>Module`, `figma-link.md`, `*.spec.ts`); `OdysseyUiModule` + `public-api.ts` updated.
- Explorer: `src/app/demos/<c>.demo.component.*` + meta, `demos.registry.ts` append, `AppModule` declaration.
- Tracker: `playground/normalization-tracker.md` Angular column/row.
- On pass: both `normalizing` flags cleared, component promoted to tier in both DSMs, library export finalized.

---

## 11. Scope boundaries

**In scope (B):** the `angular-port-routine.md` routine; the parity-lint (+ its test); the per-component-module pattern (incl Button refactor); the `/normalize` Phase 3 flag-defer + handoff; running the routine on the **first 2–3 proof ports** (the remaining batch is sub-project C / ongoing).

**Out of scope:** the full 37-component batch (C — runs *through* this gate after it's proven); publishing/registry decision; generalizing beyond lucide-angular; the React side of `/normalize` (unchanged except the flag-defer); the eventual **install-into-a-Cognizant-like-app integration test** (a later validation: `npm pack`/link `odyssey-ui` into a clone, swap a PrimeNG component, verify — flagged, not in B).

---

## 12. Testing

- The **parity-lint** has unit tests (passes on a conformant fixture, fails on each violation type).
- Each generated component gets a `*.component.spec.ts` (mirroring the Button spec).
- The routine itself is validated by the **first 2–3 proof ports** landing green (lint + builds + specs) and visually matched in the two-window review.
- `ng build odyssey-ui` + `ng build` + both `ng test` projects green after every port.

---

## 13. Open questions (non-blocking)
- **Token re-emit automation:** A ports `tokens.css` → `_tokens.scss` by hand; whether to add a generator is deferred (the lint catches missing tokens per component, which is enough for now).
- **Standalone `Odyssey<C>Module` vs folding into `OdysseyUiModule` only:** decided per-component modules (§7); revisit only if the module-per-component boilerplate proves not worth it after the first few ports.
- **Integration test harness:** the install-into-Cognizant-app validation (§11) — scope it as its own task when the first batch is ready to trial.

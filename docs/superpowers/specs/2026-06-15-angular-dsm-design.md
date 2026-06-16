# Angular DSM + `odyssey-ui` Library — Design (Sub-project A)

- **Date:** 2026-06-15
- **Status:** Approved (design); spec under user review
- **Author:** Claude (Opus 4.8, xhigh) + Manuela
- **Sources:** progress.md Session 56 §"What's Next" #1; memory `project_normalize_angular_skill_concept` (firmed 2026-06-15), `project_poc2_demo_project_location`, `project_react_dsm_explorer`, `feedback_design_system_scope_visual_only`, `project_poc_political_objective`; Manuela's phone planning (2026-06-15, pasted in-session — treated as *input*, not gospel); in-session clarifications on the normalize cycle (2026-06-15).

---

## 1. Framing — what this is and is NOT

This is **not** a migration of Odyssey-One to Angular. The React app remains the canonical source of every component. This work **complements the existing normalization process** with an *output gate* that emits Angular-tailored components for **Cognizant** to consume as a **versioned component library (`odyssey-ui`) plus a token layer** — a drop-in replacement for their current PrimeNG dependency. Ownership is **visual-only**: Cognizant keeps data binding, state, services, routing, forms, RxJS, and all app-level wiring (`feedback_design_system_scope_visual_only`, `project_poc_political_objective`).

The Session-57 goal decomposes into three dependent sub-projects:

- **A — this spec.** The Angular workspace: the shippable `odyssey-ui` library (components + token layer) **and** an Angular DSM explorer that visually mirrors the React `/design-system` route for side-by-side parity review.
- **B — later.** The `/normalize` Angular *gate*: the automation that, after a React component is approved + Figma-published, generates its Angular twin, drives the reject→retry review loop, and on approval fires the MD/tracker updates + library insertion.
- **C — later.** The 2–3 additional internal component ports the HARD RULE requires before any Cognizant handoff.

B depends on A existing as a target; C validates B and populates A. **This spec covers A only.** B and C are scoped here just enough to prove A's mechanisms are the right shape to support them.

### Settled findings (locked — do not reopen)
From Manuela's phone planning, accepted as-is:
1. The deliverable is a **versioned library that replaces PrimeNG**, not loose scaffolds.
2. **Code Connect is out of scope** for the conversion pipeline (it's a Figma↔code handoff/maintenance tool running the opposite direction; can be added later as a Dev-Mode nicety, orthogonal to building the library).
3. The **token layer ships inside the package** — no separate token handoff that can drift.
4. **Two environments is correct** — Angular components cannot render inside the React DSM without an Angular-Elements wrapper; parity at scaffold stage is validated as a **side-by-side visual + code review across two browser windows**, not a single shared render window.
5. **Versioning is library-level semver**, not per-component or per-token.
6. The Angular output is a **starting scaffold** the dev team finishes; the gate's responsibility is **parity** (every prop, variant, visual result matches the approved React component), not app wiring.

---

## 2. The operating model (the normalize cycle this enables)

This is the end-to-end cycle the workspace supports. **A builds the surfaces and mechanisms; B builds the automation.** Documented in full here so A's Normalizing-tab and library-insertion design are demonstrably the right shape.

1. A React component completes normalization → final check = **Figma publish** → Manuela confirms.
2. A **subagent generates the Angular twin** from the full context of the just-approved React component, and adds it to the **Angular DSM's Normalizing tab** (`normalizing: true`). *(B's automation; A provides the tab + registry the demo lands in.)*
3. The React component **remains in the React DSM's Normalizing tab**. Manuela opens **two browser windows** — React DSM ‖ Angular DSM — both showing the component in their Normalizing tabs, and compares.
4. **Pass** → the full normalization is complete:
   - **both** Normalizing tabs clear,
   - the component **promotes to its tier** with the NORMALIZED pill,
   - all MD/tracker updates fire (`Button.figma-link.md`, `playground/normalization-tracker.md`, decision log as applicable),
   - and the component is **added to the `odyssey-ui` library** (`public-api.ts` + `projects/odyssey-ui/src/lib/`).
   *(Promotion + library insertion mechanisms are A; the orchestration that triggers them is B.)*
5. **Reject** → Manuela states what's wrong; **only the Angular generation stage re-runs** (React is frozen — no rework cascade).

**Consequence for A:** the Normalizing tab is not cosmetic — it is the **shared staging gate**, and "approve" is the event that triggers *both* promotion-to-tier *and* library insertion. The React app itself is **not modified** by A; the only React-side change is *when* a component's `normalizing` flag is cleared (it now waits for the Angular twin), which is a **process change owned by B**, requiring no React code change in A.

---

## 3. Approach (chosen)

**Two-project Angular workspace — library + an explorer that consumes it.**

`odyssey-angular-dsm/` (renamed/restructured from the POC `odyssey-angular-button-demo/`, reusing its assets) contains:
- **`projects/odyssey-ui/`** — the shippable library (components + token layer + `public-api.ts`), built with `ng-packagr`.
- **the default app = the DSM explorer**, which imports `odyssey-ui` through a tsconfig path mapping — exactly the way the React DSM imports `@odyssey/ui`. That import boundary is itself a parity test: if the explorer can render it, a consumer can.

**Rejected alternatives:** *Single app, carve the library out later* — defers establishing the library (the whole point) and forces a painful re-carve. *Library + Storybook* — Storybook's chrome would not match the React DSM, defeating the side-by-side comparison requirement.

---

## 4. Workspace topology

```
odyssey-angular-dsm/                  (renamed from odyssey-angular-button-demo/; assets reused)
├── angular.json                      (two projects: odyssey-ui [library] + dsm-explorer [app])
├── package.json                      (workspace + explorer dev deps; Angular 17, Karma/Jasmine)
├── tsconfig.json                     (paths: "odyssey-ui" + "odyssey-ui/*" → projects/odyssey-ui/src/public-api.ts)
├── CHANGELOG.md                      (library changelog, per phone-plan Part 4)
├── projects/
│   └── odyssey-ui/                   (THE LIBRARY — the Cognizant deliverable)
│       ├── ng-package.json
│       ├── package.json              (name: "odyssey-ui", version: 0.1.0)
│       ├── README.md                 (consumption instructions)
│       └── src/
│           ├── public-api.ts         (exports OdysseyUiModule + components + styles entry)
│           ├── lib/
│           │   └── button/           (migrated odyssey-button: .component.ts/.html/.scss, .module.ts, .figma-link.md, .spec.ts)
│           └── styles/
│               ├── _tokens.scss      (Sass re-emitting :root{--token: value} — 1:1 from packages/tokens/tokens.css)
│               ├── _typography.scss  (ported .text-* utility classes from apps/odyssey-one/src/styles/components.css)
│               └── index.scss        (imports tokens + typography; the styles entry consumers @use)
└── src/                              (THE EXPLORER APP — faithful React /design-system analogue)
    ├── main.ts, index.html
    ├── styles.scss                   (@use 'odyssey-ui/styles/index'; body font-smoothing)
    └── app/
        ├── app.module.ts, app.component.*   (shell: header + tab nav + demo host)
        ├── dsm/                       (tab nav, demo-card, details toggle, props/tokens tables, normalizing pill)
        │   └── collect-demos.ts (+ .spec.ts)   (tier bucketing + normalizing filter, mirrors collectDemos.js)
        └── demos/
            ├── button.demo.ts         (meta + demo component)
            └── demos.registry.ts      (explicit array — the no-glob analogue of Vite import.meta.glob)
```

> **Repo placement:** `odyssey-angular-dsm/` is a **standalone sibling workspace with its own git repo** (at `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm/`), exactly like the POC it's derived from — **not** a folder inside the odyssey-one monorepo. The odyssey-one repo is the canonical React source it reads from; it is never modified by this work.

Angular **17 + NgModule** (matches Cognizant's stack per the POC), **Karma/Jasmine**. Carried over from the POC: the Button component, `_tokens.scss`, `_typography.scss`, `Button.figma-link.md`, `@fontsource/inter`, `lucide-angular`.

> **Rename note:** the POC project is `odyssey-angular-button-demo/`. We rename the directory to `odyssey-angular-dsm/` and restructure (add `projects/odyssey-ui/`, move the Button + styles into the library, repoint the app to consume the library). Git history is preserved where practical; the directory rename + restructure is one commit. Manuela confirmed the POC is no longer needed in its current form.

---

## 5. The library (`odyssey-ui`)

### 5.1 Token layer — Sass that re-emits CSS custom properties (1:1)
- `_tokens.scss` ports `packages/tokens/tokens.css` and **emits `:root { --token: value; }`** — *not* a parallel `$sass-variable` mirror. Components consume `var(--…)`, identical in intent to the React side.
- **Why:** this reconciles the phone-plan "Sass-native tokens" ask with gotcha #4 ("tokens port as 1:1 CSS-custom-property re-emit, not a parallel SCSS-variable mirror — a second representation doubles the drift surface"). It is authored in `.scss` (the dev team's requested authoring format) yet ships the canonical custom properties verbatim. Single source of truth, zero drift surface.
- Ships inside the package (`projects/odyssey-ui/src/styles/`), exported via `index.scss`. No standalone token handoff (locked finding #3).

### 5.2 Typography utilities (gotcha #1)
- `_typography.scss` ports the `.text-label-*` / `.text-*` utility classes the Button references, which live in `apps/odyssey-one/src/styles/components.css` (NOT in `Button.jsx` or its CSS — easily missed). Port **all** utility class definitions the migrated components reference.

### 5.3 Button migration + **re-validation**
- Migrate the POC `odyssey-button` into `projects/odyssey-ui/src/lib/button/`.
- **Re-validate against the *current* React canonical** `packages/ui/src/Button.jsx` (+ `Button.figma.tsx`) — the May POC port is ~3 weeks old and the React Button may have changed (the `.figma.tsx` is open in the IDE). Diff props, variants, sizes, states; reconcile any deviation; record every visual deviation in the diff section of `Button.figma-link.md`.
- Inputs/outputs follow the translation rules (§7).

### 5.4 Export surface + build
- `public-api.ts` exports `OdysseyUiModule`, each component, and the styles entry.
- Build = `ng build odyssey-ui` → `dist/odyssey-ui/` via `ng-packagr`. Build must be green.
- Consumption (documented in the library README, for Cognizant):
  ```scss
  // their app global styles
  @use 'odyssey-ui/styles/index' as *;
  ```
  ```ts
  // their app module
  import { OdysseyUiModule } from 'odyssey-ui';
  ```

### 5.5 Versioning seed (phone-plan Part 4)
- Library `package.json` starts at **`0.1.0`** (pre-1.0 while internal/pre-handoff).
- `CHANGELOG.md` created at workspace root with an initial entry.
- Semver discipline (patch/minor/major rules, deprecation two-step) is **documented** in the CHANGELOG/README but only *exercised* once components start landing via the gate.
- **Registry vs `dist/` handoff is explicitly deferred** — a Cognizant conversation (phone-plan step 7), not part of A.

---

## 6. The DSM explorer (faithful React analogue)

### 6.1 Visual fidelity (hard requirement)
The explorer must render **side-by-side-identical** to the React `/design-system` page so a two-window visual diff is meaningful. Implementation reads `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx` + `DesignSystem.css` **verbatim** and mirrors: header, tab nav (**Atoms / Molecules / Organisms / Normalizing**), demo cards, the **Details** toggle, the **props** and **tokens** tables, the Figma-node link construction, and the in-progress pill. Because both sides consume the same tokens, matching markup + the token layer should yield a pixel-faithful result; any residual deviation is logged.

### 6.2 Per-demo contract (mirrors React `meta`)
Each demo (`*.demo.ts`) declares:
```ts
export const meta = {
  name: 'Button',
  tier: 'atom' | 'molecule' | 'organism',   // required
  figmaNode?: '1307:333',
  codeConnect?: 'packages/ui/src/Button.figma.tsx',
  normalizing?: boolean,                      // optional, defaults false
};
export const props?: Array<{ name; type; desc }>;
export const tokens?: Array<{ token; resolves; usage }>;
// + the demo component (the Angular analogue of React's default-export render fn)
```

### 6.3 Demo discovery — explicit registry (no-glob analogue)
Angular has no Vite `import.meta.glob`. `demos/demos.registry.ts` is an **explicit array** of demo entries `{ meta, component }`. Adding a component = appending one line. `dsm/collect-demos.ts` (mirroring `collectDemos.js`) buckets by `meta.tier`, extracts `normalizing === true`, sorts alphabetically. Unit-tested in `collect-demos.spec.ts` mirroring `collectDemos.test.js` (tier bucketing, normalizing filter, alphabetic sort, meta validation).

### 6.4 Normalizing-tab mechanism (the shared staging gate)
- A demo with `normalizing: true` shows **only** in the Normalizing tab with the in-progress pill, and is **excluded from its tier bucket** — identical to React's dual-bucketing.
- "Approve" (a B-driven event) clears the flag → the component promotes to its tier with the NORMALIZED pill **and** is inserted into the library. A provides both mechanisms (the registry flag + the library `public-api.ts` insertion point); B provides the orchestration.
- **In A's deliverable:** Button ships approved → **Atoms** tab, NORMALIZED pill. The Normalizing tab ships **empty** (as the React DSM does when nothing is in flight). The halt logic is proven by a `collect-demos.spec.ts` fixture with `normalizing: true`, plus an optional throwaway fixture during dev to eyeball the pill (removed before commit).

---

## 7. React → Angular translation rules (reference; enforced by B, applied to Button in A)

| React | Angular |
|---|---|
| `interface ButtonProps` | `@Input()` decorators on the class |
| `variant?: 'primary' \| 'secondary'` | `@Input() variant: 'primary' \| 'secondary' = 'primary'` |
| `onClick: () => void` | `@Output() clicked = new EventEmitter<void>()` |
| `children: ReactNode` | `<ng-content>` |
| `disabled?: boolean` | `@Input() disabled = false` |
| conditional `className` | `[ngClass]` binding |

Determinism comes from the React side already being normalized. The output is a **starting scaffold** — parity is the contract; routing/forms/RxJS/app wiring are explicitly **not** the gate's job.

---

## 8. Parity & verification

- **Alignment artifact (gotcha #5):** `Button.figma-link.md` carried + updated — frontmatter pins Figma node + canonical React source (`packages/ui/src/Button.jsx`) + `last_synced: 2026-06-15`; body lists every visual deviation found during re-validation, however small.
- **Fonts (gotcha #2):** static-weight `@fontsource/inter`, never a Google-Fonts CDN variable subset.
- **Font-smoothing (gotcha #3):** `-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale` on `<body>` in the explorer's `styles.scss`.
- **Side-by-side instruction (gotcha #6) — definition of done:** a runnable instruction in the workspace README:
  - React DSM: `npm run dev:odyssey-one` → `/design-system` (Atoms → Button).
  - Angular DSM: `cd odyssey-angular-dsm && ng serve` → Atoms → Button.
  - Visually compare in two windows; Button must match.

---

## 9. Testing

- **Library:** `button.spec.ts` — renders; `variant`/`size`/`disabled` inputs apply the right classes; `clicked` `@Output` fires; `<ng-content>` projects.
- **Explorer:** `collect-demos.spec.ts` — tier bucketing, `normalizing` filtering (excluded from tier, present in normalizing bucket), alphabetic sort, meta validation.
- **Builds:** `ng build odyssey-ui` green; explorer build green; `ng test` green.

---

## 10. Scope boundaries

**In scope (A):**
- Rename/restructure POC → `odyssey-angular-dsm/` two-project workspace.
- `odyssey-ui` library: token layer (Sass→CSS-var), typography utilities, Button migrated + re-validated, `public-api.ts`, `ng-packagr` build, version `0.1.0`, `CHANGELOG.md`.
- DSM explorer: faithful React-DSM visual analogue, tab nav, explicit demo registry + `collect-demos` (+ tests), Normalizing-tab mechanism, library-insertion point.
- Parity artifacts: `Button.figma-link.md`, fonts/font-smoothing, runnable side-by-side instruction.

**Out of scope (documented, owned by B/C or Cognizant):**
- The `/normalize` Angular **gate automation**: subagent generation from React context, the two-window review loop, reject→retry, on-pass MD/tracker updates + library insertion orchestration, clearing both Normalizing tabs. **(B)**
- The 2–3 **validation ports** beyond Button. **(C)**
- **Registry/publishing** decision (GitHub Packages vs versioned `dist/` handoff). **(Cognizant conversation)**
- Any **React app changes** — the timing of when React's `normalizing` flag clears is a B-process concern, no A code change.
- **Code Connect** for the conversion pipeline (locked finding #2).
- App-level Angular concerns: routing, forms, RxJS, services, state. **(Cognizant)**

---

## 11. Open questions (non-blocking; resolve during/after A)
- **Token sync over time:** A ports `tokens.css` → `_tokens.scss` once, by hand. Whether B automates the re-emit (a generator) or it stays a manual gate step is a B decision. Flagged, not blocking.
- **Molecule/organism demos that reference multiple utility classes / nested primitives:** the typography-utility port (gotcha #1) must be re-swept per component as more land via B — noted for B's checklist.
- **Explorer routing:** A's explorer uses tab state (mirroring React, which is tab-state not routed). If deep-linking to a component is later wanted, add Angular Router then — YAGNI for A.

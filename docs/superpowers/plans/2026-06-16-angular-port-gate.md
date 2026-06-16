# Angular Port Gate (`/port-to-angular`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the gate that ports already-normalized React components to Angular twins correct-by-construction — a per-component-module pattern, a mechanical parity-lint that blocks gotcha violations, the routine doc, and the `/normalize` hook — then validate it end-to-end on one proof port.

**Architecture:** A standalone routine (`playground/angular-port-routine.md`) drives per-component porting; a Node parity-lint (`tools/angular-parity-lint.mjs`, pure-function core + disk/CLI wrapper) enforces the 12 gotchas + Cognizant conventions and exits non-zero on any violation; the existing single `OdysseyUiModule` becomes an aggregate over per-component `Odyssey<C>Module`s (PrimeNG-native, matches the Cognizant Button POC).

**Tech Stack:** Angular 17 + NgModule, ng-packagr, Node 18+ (`node:test`, `node:fs`), Karma/Jasmine. Two repos: **odyssey-angular-dsm** (the Angular workspace — where Tasks 1–3, 6 run; branch `build/angular-dsm`) and **odyssey-one** (docs — where Tasks 4–5 land; branch `design-system/angular-port-gate`).

**Spec:** `docs/superpowers/specs/2026-06-16-angular-port-gate-design.md`.

---

## Conventions for this plan
- **Angular workspace** = `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm` (branch `build/angular-dsm`). Use `npx ng …` (local CLI). Commit there for Tasks 1–3, 6.
- **odyssey-one repo** (this repo, branch `design-system/angular-port-gate`) holds the routine doc + the `/normalize` edit (Tasks 4–5).
- Each task leaves builds + tests green. Do NOT push.

---

## File structure (created/modified)

```
odyssey-angular-dsm/                                    (Angular workspace)
├── projects/odyssey-ui/src/
│   ├── lib/button/odyssey-button.module.ts             CREATE  (OdysseyButtonModule — the template)
│   ├── lib/odyssey-ui.module.ts                        MODIFY  (aggregate: import+re-export per-component modules)
│   └── public-api.ts                                   MODIFY  (export OdysseyButtonModule)
├── tools/
│   ├── angular-parity-lint.mjs                         CREATE  (pure checkComponent() + disk/CLI wrapper)
│   └── angular-parity-lint.test.mjs                    CREATE  (node:test over checkComponent)
└── package.json                                        MODIFY  (add "lint:parity" script)

odyssey-one/                                            (docs repo)
├── playground/angular-port-routine.md                 CREATE  (the gate routine)
└── playground/figma-component-routine.md              MODIFY  (Phase 3: defer React flag-clear + handoff)
```

---

## Task 1: Button → per-component module pattern (the template)

Establish the `Odyssey<C>Module` + aggregate `OdysseyUiModule` pattern on the existing Button, so every future port copies it.

**Files (in odyssey-angular-dsm):**
- Create: `projects/odyssey-ui/src/lib/button/odyssey-button.module.ts`
- Modify: `projects/odyssey-ui/src/lib/odyssey-ui.module.ts`, `projects/odyssey-ui/src/public-api.ts`

- [ ] **Step 1: Create `OdysseyButtonModule`**

```ts
// projects/odyssey-ui/src/lib/button/odyssey-button.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdysseyButtonComponent } from './odyssey-button.component';

@NgModule({
  declarations: [OdysseyButtonComponent],
  imports: [CommonModule],
  exports: [OdysseyButtonComponent],
})
export class OdysseyButtonModule {}
```

- [ ] **Step 2: Make `OdysseyUiModule` an aggregate**

Replace `projects/odyssey-ui/src/lib/odyssey-ui.module.ts` with:
```ts
// projects/odyssey-ui/src/lib/odyssey-ui.module.ts
// Aggregate module: import + re-export every per-component Odyssey<C>Module so
// consumers can `imports: [OdysseyUiModule]` for everything, or import a single
// Odyssey<C>Module for granular/tree-shaken use (PrimeNG-native ergonomics).
import { NgModule } from '@angular/core';
import { OdysseyButtonModule } from './button/odyssey-button.module';

@NgModule({
  imports: [OdysseyButtonModule],
  exports: [OdysseyButtonModule],
})
export class OdysseyUiModule {}
```

- [ ] **Step 3: Export the per-component module from public-api**

Edit `projects/odyssey-ui/src/public-api.ts` to add the module export. Final content:
```ts
/*
 * Public API surface of odyssey-ui.
 * The token + typography layer ships at 'odyssey-ui/styles/index' (Sass entry).
 */
export * from './lib/odyssey-ui.module';
export * from './lib/button/odyssey-button.module';
export * from './lib/button/odyssey-button.component';
```

- [ ] **Step 4: Build + test**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm && npx ng build odyssey-ui && npx ng build && npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless && npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless`
Expected: both builds green; lib 5/5, explorer 15/15 (the explorer imports `OdysseyUiModule`, which now re-exports the Button via `OdysseyButtonModule` — the `<odyssey-button>` in demos still resolves).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(odyssey-ui): per-component OdysseyButtonModule + OdysseyUiModule aggregate (PrimeNG-native pattern)"
```

---

## Task 2: Parity-lint core (TDD)

A pure function `checkComponent(input)` returning a list of violation strings — the mechanical enforcement of the gotchas + Cognizant conventions.

**Files (in odyssey-angular-dsm):**
- Create: `tools/angular-parity-lint.mjs`, `tools/angular-parity-lint.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tools/angular-parity-lint.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkComponent } from './angular-parity-lint.mjs';

// A fully-conformant component fixture (as in-memory file contents).
function conformant(overrides = {}) {
  return {
    comp: 'badge',
    pascal: 'Badge',
    ts: `
      import { Component, Input } from '@angular/core';
      @Component({ selector: 'odyssey-badge', templateUrl: './odyssey-badge.component.html', styleUrls: ['./odyssey-badge.component.scss'] })
      export class OdysseyBadgeComponent {
        @Input() className = '';
        get classes(): string { return ['badge', this.className || null].filter(Boolean).join(' '); }
      }`,
    html: `<span [class]="classes"><ng-content></ng-content></span>`,
    scss: `.badge { color: var(--text-primary); }`,
    mod: `
      import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { OdysseyBadgeComponent } from './odyssey-badge.component';
      @NgModule({ declarations: [OdysseyBadgeComponent], imports: [CommonModule], exports: [OdysseyBadgeComponent] })
      export class OdysseyBadgeModule {}`,
    figmaLinkExists: true,
    publicApi: `export * from './lib/badge/odyssey-badge.module';\nexport * from './lib/badge/odyssey-badge.component';`,
    aggregateModule: `import { OdysseyBadgeModule } from './badge/odyssey-badge.module';\n@NgModule({ imports: [OdysseyBadgeModule], exports: [OdysseyBadgeModule] }) export class OdysseyUiModule {}`,
    ...overrides,
  };
}

test('conformant component has no violations', () => {
  assert.deepEqual(checkComponent(conformant()), []);
});

test('flags wrong selector', () => {
  const v = checkComponent(conformant({ ts: conformant().ts.replace("'odyssey-badge'", "'app-badge'") }));
  assert.ok(v.some((m) => /selector/.test(m)), v.join('; '));
});

test('flags missing className input', () => {
  const v = checkComponent(conformant({ ts: conformant().ts.replace("@Input() className = '';", '') }));
  assert.ok(v.some((m) => /className/.test(m)), v.join('; '));
});

test('flags className not merged into classes', () => {
  const ts = conformant().ts.replace('this.className || null', "'x'");
  const v = checkComponent(conformant({ ts }));
  assert.ok(v.some((m) => /merged/.test(m)), v.join('; '));
});

test('flags hardcoded hex color in scss', () => {
  const v = checkComponent(conformant({ scss: `.badge { color: #ff0000; }` }));
  assert.ok(v.some((m) => /hex/.test(m)), v.join('; '));
});

test('flags projected slot with no ::ng-deep and no ViewEncapsulation.None', () => {
  const html = `<span [class]="classes"><ng-content select="[slot=icon]"></ng-content></span>`;
  const v = checkComponent(conformant({ html }));
  assert.ok(v.some((m) => /projected/.test(m)), v.join('; '));
});

test('accepts projected slot when ::ng-deep present', () => {
  const html = `<span [class]="classes"><ng-content select="[slot=icon]"></ng-content></span>`;
  const scss = `.badge { color: var(--text-primary); } .badge ::ng-deep svg { display: block; }`;
  assert.deepEqual(checkComponent(conformant({ html, scss })), []);
});

test('flags missing per-component module', () => {
  const v = checkComponent(conformant({ mod: 'export class NotAModule {}' }));
  assert.ok(v.some((m) => /OdysseyBadgeModule/.test(m)), v.join('; '));
});

test('flags missing figma-link', () => {
  const v = checkComponent(conformant({ figmaLinkExists: false }));
  assert.ok(v.some((m) => /figma-link/.test(m)), v.join('; '));
});

test('flags component missing from public-api', () => {
  const v = checkComponent(conformant({ publicApi: '' }));
  assert.ok(v.some((m) => /public-api/.test(m)), v.join('; '));
});

test('flags module missing from OdysseyUiModule aggregate', () => {
  const v = checkComponent(conformant({ aggregateModule: '@NgModule({}) export class OdysseyUiModule {}' }));
  assert.ok(v.some((m) => /aggregate/.test(m)), v.join('; '));
});
```

- [ ] **Step 2: Run it — expect FAIL (module not found)**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm && node --test tools/angular-parity-lint.test.mjs`
Expected: FAIL — `Cannot find module './angular-parity-lint.mjs'` / `checkComponent is not a function`.

- [ ] **Step 3: Implement the pure core**

```js
// tools/angular-parity-lint.mjs
// Parity-lint: mechanically enforces the React→Angular port rules (the 12 gotchas
// + Cognizant conventions) so the component batch can't re-introduce known bugs.
// `checkComponent` is a PURE function over file contents → trivially unit-testable.

/** @param {{comp:string,pascal:string,ts:string,html:string,scss:string,mod:string,figmaLinkExists:boolean,publicApi:string,aggregateModule:string}} c */
export function checkComponent(c) {
  const v = [];
  const ModName = `Odyssey${c.pascal}Module`;
  const CompName = `Odyssey${c.pascal}Component`;

  // Cognizant: selector must be odyssey-<kebab>
  const sel = c.ts.match(/selector:\s*['"]([^'"]+)['"]/);
  if (!sel || sel[1] !== `odyssey-${c.comp}`) {
    v.push(`selector must be 'odyssey-${c.comp}' (found ${sel ? `'${sel[1]}'` : 'none'})`);
  }

  // G8: className passthrough input present + merged into the class binding
  if (!/@Input\(\)\s+className\b/.test(c.ts)) {
    v.push('missing `@Input() className` passthrough (required for modifier tones)');
  } else if (!/this\.className/.test(c.ts)) {
    v.push('`className` input is declared but not merged into the classes getter/binding');
  }

  // G4: no hardcoded hex colors in component SCSS (tokens only). rgba()/hsl() tints allowed.
  const hex = c.scss.match(/#[0-9a-fA-F]{3,8}\b/g);
  if (hex) v.push(`hardcoded hex color(s) in SCSS: ${[...new Set(hex)].join(', ')} — use var(--token)`);

  // G7/G9: projected content needs ::ng-deep (or ViewEncapsulation.None) to be styleable
  if (/<ng-content\s+select=/.test(c.html)) {
    if (!/::ng-deep/.test(c.scss) && !/ViewEncapsulation\.None/.test(c.ts)) {
      v.push('component projects content (<ng-content select=…>) but SCSS has no ::ng-deep rule and the component is not ViewEncapsulation.None — projected-content styling will not apply');
    }
  }

  // Cognizant: per-component module exists, declares + exports the component
  if (!new RegExp(`class\\s+${ModName}\\b`).test(c.mod)) {
    v.push(`missing per-component ${ModName} (in odyssey-${c.comp}.module.ts)`);
  } else if (!c.mod.includes(CompName)) {
    v.push(`${ModName} does not reference ${CompName} in declarations/exports`);
  }

  // G5: alignment artifact present
  if (!c.figmaLinkExists) v.push(`missing ${c.pascal}.figma-link.md alignment artifact`);

  // Export surface: component + module exported from public-api
  if (!c.publicApi.includes(`lib/${c.comp}/odyssey-${c.comp}.module`)) {
    v.push(`${ModName} is not exported from public-api.ts`);
  }

  // Aggregate: module wired into OdysseyUiModule
  if (!c.aggregateModule.includes(ModName)) {
    v.push(`${ModName} is not imported/exported by the OdysseyUiModule aggregate`);
  }

  return v;
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm && node --test tools/angular-parity-lint.test.mjs`
Expected: all tests PASS (11 passing).

- [ ] **Step 5: Commit**

```bash
git add tools/angular-parity-lint.mjs tools/angular-parity-lint.test.mjs
git commit -m "feat(parity-lint): pure checkComponent() enforcing port gotchas + Cognizant conventions"
```

---

## Task 3: Parity-lint disk/CLI wrapper + npm script + Button passes

Wire the pure core to the filesystem so it can lint a real component (or all), and confirm the real Button passes.

**Files (in odyssey-angular-dsm):**
- Modify: `tools/angular-parity-lint.mjs` (append disk + CLI), `package.json`

- [ ] **Step 1: Append the disk reader + CLI to `angular-parity-lint.mjs`**

```js
// --- disk + CLI wrapper (append below checkComponent) ---
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LIB_DIR = 'projects/odyssey-ui/src/lib';
const PUBLIC_API = 'projects/odyssey-ui/src/public-api.ts';
const AGGREGATE = 'projects/odyssey-ui/src/lib/odyssey-ui.module.ts';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const pascalCase = (kebab) => kebab.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');

/** Read one component dir and run checkComponent over it. */
export function lintComponentDir(comp) {
  const dir = join(LIB_DIR, comp);
  const pascal = pascalCase(comp);
  return checkComponent({
    comp,
    pascal,
    ts: read(join(dir, `odyssey-${comp}.component.ts`)),
    html: read(join(dir, `odyssey-${comp}.component.html`)),
    scss: read(join(dir, `odyssey-${comp}.component.scss`)),
    mod: read(join(dir, `odyssey-${comp}.module.ts`)),
    figmaLinkExists: existsSync(join(dir, `${pascal}.figma-link.md`)),
    publicApi: read(PUBLIC_API),
    aggregateModule: read(AGGREGATE),
  });
}

/** All component dirs under lib/ (those with an odyssey-<c>.component.ts). */
export function allComponents() {
  if (!existsSync(LIB_DIR)) return [];
  return readdirSync(LIB_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(LIB_DIR, d.name, `odyssey-${d.name}.component.ts`)))
    .map((d) => d.name);
}

// CLI: `node tools/angular-parity-lint.mjs [comp]` — lints one component or all. Exit 1 on any violation.
if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2];
  const comps = only ? [only] : allComponents();
  let failed = 0;
  for (const comp of comps) {
    const violations = lintComponentDir(comp);
    if (violations.length) {
      failed++;
      console.error(`✖ ${comp}`);
      for (const m of violations) console.error(`    - ${m}`);
    } else {
      console.log(`✓ ${comp}`);
    }
  }
  if (failed) { console.error(`\nparity-lint: ${failed} component(s) failed`); process.exit(1); }
  console.log(`\nparity-lint: ${comps.length} component(s) passed`);
}
```

- [ ] **Step 2: Add the npm script**

Edit `package.json` `scripts`, add: `"lint:parity": "node tools/angular-parity-lint.mjs"`.

- [ ] **Step 3: Run the lint on the real Button — expect PASS**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm && node tools/angular-parity-lint.mjs button`
Expected: `✓ button` then `parity-lint: 1 component(s) passed`, exit 0. (The Button has the `className` input from the parity fixes, `::ng-deep` for the icon slot, `var(--…)` colors, `OdysseyButtonModule` from Task 1, `Button.figma-link.md`, and public-api/aggregate wiring.)
If it reports a violation, that's a real gap in the Button — fix the Button to conform (do NOT weaken the lint).

- [ ] **Step 4: Re-run the unit test (regression)**

Run: `node --test tools/angular-parity-lint.test.mjs`
Expected: still all PASS (the appended disk/CLI code didn't break the pure core).

- [ ] **Step 5: Commit**

```bash
git add tools/angular-parity-lint.mjs package.json
git commit -m "feat(parity-lint): disk/CLI wrapper + lint:parity script; Button passes"
```

---

## Task 4: The port routine doc

The markdown gate the routine follows per component.

**Files (in odyssey-one):**
- Create: `playground/angular-port-routine.md`

- [ ] **Step 1: Write `playground/angular-port-routine.md`**

Write a routine doc with these exact sections and content (mirror the style/specificity of `playground/figma-component-routine.md`):

1. **Header / when to use** — "Ports an already-normalized React component to its Angular twin in `odyssey-angular-dsm`. Invoke `/port-to-angular <Component>`, or reached from `/normalize` Phase 3 for new components. Inputs: `packages/ui/src/<C>.jsx`, its `components.css` blocks, `<C>.demo.jsx`, the Figma node."
2. **Hard rules** — "Conform to Cognizant conventions: selector `odyssey-<kebab>`, files `odyssey-<c>.component.ts/.html/.scss`, a per-component `Odyssey<C>Module` re-exported by `OdysseyUiModule`, tokens via `var(--token)` only. The Button at `projects/odyssey-ui/src/lib/button/` is the canonical template — copy its structure." + the 12 gotchas listed verbatim as MUST rules (copy from the spec §6 generation rules).
3. **Phase 1 — Gather** — read the React canonical (component, the `components.css` blocks for ALL states, the demo meta/props/tokens + grid, referenced `.text-*` utilities).
4. **Phase 2 — Generate (delegate to a subagent)** — produce, with `meta.normalizing: true`: `projects/odyssey-ui/src/lib/<c>/` (`odyssey-<c>.component.ts/.html/.scss`, `odyssey-<c>.module.ts` = `Odyssey<C>Module`, `<C>.figma-link.md`, `odyssey-<c>.component.spec.ts`); update `OdysseyUiModule` (import+export the new module) + `public-api.ts`; create the explorer demo `src/app/demos/<c>.demo.component.*` + `<c>.demo.meta.ts`, append to `demos.registry.ts`, declare in `AppModule`. Apply the gotcha rules (className passthrough; `::ng-deep` for any slot; descendant icon selectors; `var(--…)` only).
5. **Phase 3 — Verify (BLOCKING)** — run, in order, all must be green or fix + re-run:
   ```
   node tools/angular-parity-lint.mjs <c>
   npx ng build odyssey-ui
   npx ng build
   npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless
   npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless
   ```
6. **Phase 4 — Two-window review** — run the DSM-open block:
   ```
   npx ng build odyssey-ui
   (restart) npx ng serve --port 4200        # Angular DSM
   npm run dev:odyssey-one                    # React DSM (in odyssey-one) → /design-system
   ```
   open both; both show `<C>` in their Normalizing tabs; wait for the user's approval phrase (`go`/`yes`/`approved`/`looks good`/`ok`/`proceed`) — same as `/normalize` GATE B. Mid-stream feedback = not approved; on reject, re-run Phase 2 (Angular only; React frozen).
7. **Phase 5 — On pass** — clear BOTH `normalizing` flags (the React `<C>.demo.jsx` meta AND the Angular `<c>.demo.meta.ts`), so each promotes to its tier; finalize the library export; update `playground/normalization-tracker.md` (Angular column) + the component's `figma-link.md` `last_synced`.
8. **Throughput note** — first 2–3 ports one-at-a-time; then batches of 3–5; tier order atoms → molecules → organisms.
9. **Model-gateway note** — generation = subagent (Sonnet); drift/parity judgment + reviews = Opus; per `feedback_model_gateways`.

- [ ] **Step 2: Commit (odyssey-one)**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git add playground/angular-port-routine.md
git commit -m "docs: angular-port-routine — the /port-to-angular gate"
```

---

## Task 5: Hook into `/normalize` (defer React flag-clear + handoff)

**Files (in odyssey-one):**
- Modify: `playground/figma-component-routine.md`

- [ ] **Step 1: Defer the React `meta.normalizing` clear**

In `figma-component-routine.md` Phase 3 Step 7, the checklist item that says to remove/clear `meta.normalizing: true` from the React demo before the Phase 3 commit: change it so the flag is **NOT** cleared in Phase 3. Add the note: "**Do NOT clear `meta.normalizing` here.** The component stays in the React DSM's Normalizing tab until its Angular twin is approved — the Angular port routine clears BOTH flags together on pass. (Reason: enables the two-window React‖Angular side-by-side review.)"

- [ ] **Step 2: Add the handoff after Figma library publish**

In Phase 3, after Step 8c (Figma library publish reminder), add a final step: "**Step 9 — Hand off to the Angular port gate.** The React component is now approved + published. Run `playground/angular-port-routine.md` (`/port-to-angular <Component>`) to generate + review the Angular twin. The React `meta.normalizing` flag clears there, on Angular pass."

- [ ] **Step 3: Commit (odyssey-one)**

```bash
git add playground/figma-component-routine.md
git commit -m "docs(/normalize): defer React normalizing-flag clear + hand off to angular-port gate"
```

---

## Task 6: Validate the gate end-to-end on one proof port

Exercise the full machinery on a real atom (recommend **Badge** — an atom with a leading/right icon slot, exercising the projected-content + className paths). This validates the routine + lint produce conformant, building, tested output. Stops at the two-window review (a human step — not automated here).

**Files (in odyssey-angular-dsm):** generated by following the routine — `projects/odyssey-ui/src/lib/badge/**`, demo files, registry/module/public-api updates.

- [ ] **Step 1: Follow `angular-port-routine.md` Phases 1–2 for Badge**

Inputs (read-only, odyssey-one): `packages/ui/src/Badge.jsx`, its blocks in `apps/odyssey-one/src/styles/components.css`, `apps/odyssey-one/src/routes/design-system/demos/Badge.demo.jsx`. Generate the Angular Badge per the routine (component + `OdysseyBadgeModule` + figma-link + spec; demo + meta + registry + AppModule; `OdysseyUiModule` + public-api wiring), with `meta.normalizing: true`. Delegate generation to a subagent.

- [ ] **Step 2: Run the parity-lint on Badge — expect PASS**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm && node tools/angular-parity-lint.mjs badge`
Expected: `✓ badge`. If it fails, fix the generated Badge to conform (this is the lint doing its job — proof it catches gaps).

- [ ] **Step 3: Builds + tests green**

Run: `npx ng build odyssey-ui && npx ng build && npx ng test odyssey-ui --watch=false --browsers=ChromeHeadless && npx ng test dsm-explorer --watch=false --browsers=ChromeHeadless`
Expected: both builds green; lib specs include the new Badge spec; explorer specs green (Badge sits in the Normalizing tab, excluded from its tier — `collect-demos` already handles this).

- [ ] **Step 4: Commit the proof port**

```bash
git add -A
git commit -m "feat(odyssey-ui): port Badge (gate proof port 1) — in Normalizing tab pending two-window review"
```

- [ ] **Step 5: Hand to the user for the two-window review**

Run the Phase-4 DSM-open block; surface both URLs. Report: "Badge generated, lint + builds + tests green, in both Normalizing tabs — ready for your side-by-side review. On your approval I'll clear both flags + promote (Phase 5)." This is the gate's end-to-end validation; the remaining proof ports + the full batch are sub-project C, run through this same routine.

---

## Self-review notes (spec coverage)
- Spec §1 settled decisions → Task 1 (per-component modules), Task 2/3 (parity-lint), Task 4 (standalone routine), Task 5 (/normalize defer+handoff), Task 6 (proof port, one-at-a-time).
- Spec §6 gotcha set + lint → Task 2 (checks), Task 3 (Button passes). (G1/G2/G3/G10/G11 are workspace-level + were established in sub-project A; the lint focuses on the per-component machine-checkable rules — G4/G5/G7/G8/G9 + Cognizant conformance. G10/G11 regression-guarding is covered by the build/test commands in every port's Phase 3.)
- Spec §7 per-component modules + Button refactor → Task 1.
- Spec §8 DSM-open → Task 4 Phase 4.
- Spec §5/§9 phases + cadence → Task 4.
- Spec §12 testing → Task 2 (lint tests), Task 6 (component spec + proof port green).

**Deferred (C / later, correctly absent):** the remaining ~37 ports (run through this gate); the install-into-Cognizant-app integration test; publishing/registry.

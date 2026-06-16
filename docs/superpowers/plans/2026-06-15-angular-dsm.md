# Angular DSM + `odyssey-ui` Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the POC Angular Button project into a standalone `odyssey-angular-dsm/` workspace containing a shippable `odyssey-ui` library (Button + token layer) and a DSM explorer app that visually mirrors the React `/design-system` route for two-window parity review.

**Architecture:** Two-project Angular 17 workspace. `projects/odyssey-ui/` is the library (components + Sass-that-re-emits-CSS-custom-properties token layer + `public-api.ts`), built with `ng-packagr`. The default app is the DSM explorer, which imports `odyssey-ui` through a tsconfig path mapping — exactly as the React DSM imports `@odyssey/ui`. Demo discovery uses an explicit registry array (the no-glob analogue of React's Vite `import.meta.glob`). The Normalizing tab is the shared staging gate that, on approval, promotes a component to its tier and inserts it into the library.

**Tech Stack:** Angular 17 + NgModule pattern (matches Cognizant's stack), `ng-packagr`, Sass, Karma/Jasmine, `@fontsource/inter`, `lucide-angular`.

**Spec:** `docs/superpowers/specs/2026-06-15-angular-dsm-design.md` (in the odyssey-one repo). This plan covers **sub-project A only**; the `/normalize` Angular gate (B) and validation ports (C) are separate.

---

## Conventions for this plan

- **Two repos are in play:**
  - **odyssey-one** (this repo) — canonical React source, read-only for this work. Path: `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one`.
  - **odyssey-angular-dsm** (the workspace this plan builds) — a **standalone sibling git repo**, renamed from the POC `odyssey-angular-button-demo/`. Path after Task 1: `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-dsm`.
- **All `git`/`ng`/`npm` commands run from the `odyssey-angular-dsm/` workspace root** unless the command shows an explicit odyssey-one path. Commits land in the Angular repo, not odyssey-one.
- **"Port verbatim" tasks:** where a step says to port a file from odyssey-one, the React source IS the spec. Reproduce it faithfully using the React→Angular mapping in that task; do not invent structure. Log any unavoidable deviation in the relevant `.figma-link.md`.

---

## File structure (what gets created/modified in `odyssey-angular-dsm/`)

```
odyssey-angular-dsm/
├── angular.json                                   MODIFY  (two projects: odyssey-ui lib + dsm-explorer app)
├── package.json                                   MODIFY  (workspace name + scripts; add ng-packagr)
├── tsconfig.json                                  MODIFY  (paths: "odyssey-ui" → projects/odyssey-ui/src/public-api.ts)
├── CHANGELOG.md                                   CREATE  (library changelog)
├── projects/
│   └── odyssey-ui/
│       ├── ng-package.json                        CREATE
│       ├── package.json                           CREATE  (name odyssey-ui, version 0.1.0)
│       ├── README.md                              CREATE  (consumption instructions)
│       └── src/
│           ├── public-api.ts                      CREATE  (exports OdysseyUiModule + Button + types)
│           ├── lib/
│           │   ├── odyssey-ui.module.ts           CREATE  (OdysseyUiModule)
│           │   └── button/                        MOVE from POC + catch up to React canonical
│           │       ├── odyssey-button.component.ts        MOVE + MODIFY
│           │       ├── odyssey-button.component.html      MOVE
│           │       ├── odyssey-button.component.scss      MOVE + MODIFY (add error/icon/link-black)
│           │       ├── odyssey-button.component.spec.ts   CREATE
│           │       └── Button.figma-link.md               MOVE + MODIFY (add error/icon, bump last_synced)
│           └── styles/
│               ├── _tokens.scss                   MOVE from POC + reconcile 1:1 vs tokens.css
│               ├── _typography.scss               MOVE from POC
│               └── index.scss                     CREATE  (@forward tokens + typography)
└── src/                                           (the explorer app)
    ├── main.ts                                    keep
    ├── index.html                                 MODIFY  (title)
    ├── styles.scss                                MODIFY  (@use odyssey-ui/styles/index; body font-smoothing)
    └── app/
        ├── app.module.ts                          MODIFY  (declare explorer + demo components; import OdysseyUiModule)
        ├── app.component.ts/.html/.scss           REWRITE (the explorer shell — mirrors DesignSystem default export)
        ├── dsm/
        │   ├── demo.types.ts                      CREATE  (Tier, DemoMeta, DemoEntry, CollectedDemo, TierGroup)
        │   ├── collect-demos.ts                   CREATE  (TIERS, groupDemosByTier, collectNormalizing — TS port)
        │   ├── collect-demos.spec.ts              CREATE  (port of collectDemos.test.js, array input + jasmine)
        │   ├── figma-url.ts                        CREATE  (figmaUrl helper)
        │   ├── ds-details/ds-details.component.*  CREATE  (DetailsPanel analogue)
        │   └── ds-comp/ds-comp.component.*        CREATE  (DemoSection analogue)
        ├── design-system.css                      CREATE  (verbatim port of DesignSystem.css, 370 lines)
        └── demos/
            ├── button.demo.component.ts/.html     CREATE  (ButtonDemo analogue)
            ├── button.demo.meta.ts                CREATE  (meta + props + tokens for Button)
            └── demos.registry.ts                  CREATE  (explicit DemoEntry[] array)
```

---

## Task 1: Rename + restructure the workspace into two projects

**Files:**
- Rename dir: `odyssey-angular-button-demo/` → `odyssey-angular-dsm/`
- Create: `projects/odyssey-ui/` (via `ng generate library`)
- Modify: `angular.json`, `package.json`, `tsconfig.json`

- [ ] **Step 1: Rename the workspace directory and confirm git is intact**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments
git -C odyssey-angular-button-demo status --short   # confirm what's uncommitted before moving
mv odyssey-angular-button-demo odyssey-angular-dsm
cd odyssey-angular-dsm
git status --short && git log --oneline -1
```
Expected: directory moved; `git` still works (it's the same `.git`); HEAD = `5be0949 initial commit`.

- [ ] **Step 2: Commit the current uncommitted POC state first (clean baseline)**

The POC has uncommitted working-tree changes (the Button, styles, etc.). Commit them so the restructure starts from a clean tree and the diff is legible.

```bash
git add -A
git commit -m "chore: baseline POC Button demo before DSM restructure"
git status --short   # clean
```

- [ ] **Step 3: Rename the workspace package + the existing app project to `dsm-explorer`**

Edit `package.json`: set `"name": "odyssey-angular-dsm"`.
In `angular.json`: rename the existing project key (currently `odyssey-angular-button-demo`) to `dsm-explorer`, and update its `"sourceRoot"`/output paths if they reference the old name. Update `"defaultProject"` if present to `dsm-explorer`.

```bash
ng build   # the app still builds under its new project name
```
Expected: build succeeds.

- [ ] **Step 4: Generate the `odyssey-ui` library project**

```bash
ng generate library odyssey-ui --prefix=odyssey
```
Expected: creates `projects/odyssey-ui/` with `ng-package.json`, `package.json`, `src/public-api.ts`, a sample component/module, and adds the `odyssey-ui` project + the `"odyssey-ui"`/`"odyssey-ui/*"` `paths` entries to the root `tsconfig.json`. Delete the generated sample component/service (`projects/odyssey-ui/src/lib/odyssey-ui.component.*`, `*.service.*`) — we'll add our own.

- [ ] **Step 5: Set the library version + verify both projects build**

Edit `projects/odyssey-ui/package.json`: `"name": "odyssey-ui"`, `"version": "0.1.0"`.

```bash
ng build odyssey-ui
ng build
```
Expected: both succeed. `dist/odyssey-ui/` is produced by ng-packagr.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: restructure POC into odyssey-angular-dsm workspace (odyssey-ui library + dsm-explorer app)"
```

---

## Task 2: Move the token layer into the library + reconcile 1:1 with tokens.css

**Files:**
- Move: POC `src/styles/_tokens.scss`, `src/styles/_typography.scss` → `projects/odyssey-ui/src/styles/`
- Create: `projects/odyssey-ui/src/styles/index.scss`
- Reference (read-only): `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/packages/tokens/tokens.css` (276 lines), `apps/odyssey-one/src/styles/components.css` (typography utilities at ~lines 1029–1040)

- [ ] **Step 1: Move the two Sass partials into the library styles folder**

```bash
mkdir -p projects/odyssey-ui/src/styles
git mv src/styles/_tokens.scss projects/odyssey-ui/src/styles/_tokens.scss
git mv src/styles/_typography.scss projects/odyssey-ui/src/styles/_typography.scss
```

- [ ] **Step 2: Reconcile `_tokens.scss` against the canonical `tokens.css` (1:1 re-emit)**

`_tokens.scss` must emit `:root { --token: value; }` for **every** custom property in `packages/tokens/tokens.css`. The POC partial (263 lines) predates token additions (tokens.css is 276 lines) — it is likely missing tokens the new Button variants need (e.g. `--bg-error`, `--bittersweet-600`, `--carolina-blue-400`, `--text-primary`, `--text-link`, `--text-secondary`). Diff and add the missing ones, preserving values verbatim. Do **not** introduce `$sass-variables` — custom-property re-emit only (gotcha #4).

Verification — list every custom property in the canonical source, then confirm each appears in the partial:
```bash
grep -oE '^\s*--[a-z0-9-]+' /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/packages/tokens/tokens.css | sed 's/^ *//' | sort -u > /tmp/canon-tokens.txt
grep -oE '\--[a-z0-9-]+' projects/odyssey-ui/src/styles/_tokens.scss | sort -u > /tmp/angular-tokens.txt
comm -23 /tmp/canon-tokens.txt /tmp/angular-tokens.txt   # tokens in canon but MISSING from Angular — must be empty
```
Expected after reconciliation: the `comm` output is empty (no missing tokens).

- [ ] **Step 3: Create the styles entry `index.scss`**

```scss
// projects/odyssey-ui/src/styles/index.scss
// The single styles entry consumers @use. Re-emits the canonical CSS custom
// properties (1:1 from odyssey-one/packages/tokens/tokens.css) and the
// typography utility classes the components reference.
@forward 'tokens';
@forward 'typography';
```

- [ ] **Step 4: Ship the Sass with the built library (so Cognizant gets `odyssey-ui/styles/*`)**

ng-packagr does not copy non-component styles by default. Edit `projects/odyssey-ui/ng-package.json` to copy the styles folder into the dist as an asset:
```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/odyssey-ui",
  "assets": ["./src/styles"],
  "lib": { "entryFile": "src/public-api.ts" }
}
```
After `ng build odyssey-ui`, confirm `dist/odyssey-ui/src/styles/index.scss` exists (this is the path consumers reach as `odyssey-ui/styles/index` once installed).

- [ ] **Step 5: Point the explorer app's global styles at the library styles entry**

The explorer is in the same workspace, so it resolves the Sass via an includePath to the library source (it is NOT installed from node_modules). In `angular.json` under the `dsm-explorer` build options, add `"stylePreprocessorOptions": { "includePaths": ["projects/odyssey-ui/src"] }`. Then edit `src/styles.scss` to `@use 'styles/index' as *;` (replacing any old relative `@use './styles/tokens'`).

> Note: the in-repo explorer uses `@use 'styles/index'` (resolved via the includePath above). A published consumer uses `@use 'odyssey-ui/styles/index'` (resolved from `node_modules/odyssey-ui/`, shipped by Step 4). Both reach the same `index.scss`.

```bash
ng build
```
Expected: build succeeds; tokens + typography resolve.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(odyssey-ui): move token + typography layer into library, reconcile 1:1 with tokens.css, ship styles in dist"
```

---

## Task 3: Move the Button into the library + export surface

**Files:**
- Move: POC `src/app/components/odyssey-button/*` → `projects/odyssey-ui/src/lib/button/`
- Create: `projects/odyssey-ui/src/lib/odyssey-ui.module.ts`, edit `projects/odyssey-ui/src/public-api.ts`

- [ ] **Step 1: Move the Button files into the library**

```bash
mkdir -p projects/odyssey-ui/src/lib/button
git mv src/app/components/odyssey-button/odyssey-button.component.ts   projects/odyssey-ui/src/lib/button/odyssey-button.component.ts
git mv src/app/components/odyssey-button/odyssey-button.component.html projects/odyssey-ui/src/lib/button/odyssey-button.component.html
git mv src/app/components/odyssey-button/odyssey-button.component.scss projects/odyssey-ui/src/lib/button/odyssey-button.component.scss
git mv src/app/components/odyssey-button/Button.figma-link.md          projects/odyssey-ui/src/lib/button/Button.figma-link.md
# delete the now-empty POC module (we use OdysseyUiModule instead)
git rm src/app/components/odyssey-button/odyssey-button.module.ts
rmdir src/app/components 2>/dev/null || true
```

- [ ] **Step 2: Create `OdysseyUiModule`**

```ts
// projects/odyssey-ui/src/lib/odyssey-ui.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdysseyButtonComponent } from './button/odyssey-button.component';

@NgModule({
  declarations: [OdysseyButtonComponent],
  imports: [CommonModule],
  exports: [OdysseyButtonComponent],
})
export class OdysseyUiModule {}
```

- [ ] **Step 3: Set the public API surface**

```ts
// projects/odyssey-ui/src/public-api.ts
/*
 * Public API surface of odyssey-ui.
 * The token + typography layer ships at 'odyssey-ui/styles/index' (Sass entry).
 */
export * from './lib/odyssey-ui.module';
export * from './lib/button/odyssey-button.component';
```

- [ ] **Step 4: Rewire the explorer app to consume the library (keep the app green)**

The POC `src/app/app.module.ts` imports the now-deleted `OdysseyButtonModule`, and the POC `app.component.html` uses `<odyssey-button>`. Swap the import so the app keeps building on its existing flat demo (the full shell rewrite is Task 8):
- In `src/app/app.module.ts`: remove the `OdysseyButtonModule` import + declaration entry; add `import { OdysseyUiModule } from 'odyssey-ui';` and put `OdysseyUiModule` in `imports`.
- Confirm the tsconfig path mapping for `odyssey-ui` exists (added by `ng generate library` in Task 1, Step 4). If the app resolves `odyssey-ui` from source, no build of the library is needed first; if it resolves from `dist/`, run `ng build odyssey-ui` first.

- [ ] **Step 5: Build both projects**

```bash
ng build odyssey-ui
ng build
```
Expected: both succeed. `dist/odyssey-ui/` contains the compiled Button + `OdysseyUiModule`; the app renders its existing flat Button demo via the library.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(odyssey-ui): move Button into library, add OdysseyUiModule + public-api; rewire explorer to consume it"
```

---

## Task 4: Catch the Button up to the current React canonical

The POC Button has **drifted**: the current React `Button.jsx` (odyssey-one `packages/ui/src/Button.jsx`) has 7 variants — `primary, secondary, outline, ghost, error, link, icon` — plus a `link-black` tone and a `variant==='link'` typography rule. The POC Angular Button has only `primary, secondary, outline, ghost, link` and is missing the link-typography rule. This task reconciles it.

**Files:**
- Modify: `projects/odyssey-ui/src/lib/button/odyssey-button.component.ts`, `.scss`, `Button.figma-link.md`
- Reference (read-only): odyssey-one `packages/ui/src/Button.jsx`; `apps/odyssey-one/src/styles/components.css` blocks — `.btn--icon` (lines ~982–1015), `.btn--error` (~1069–1083), `.btn--link-black` (~1174–1182)

- [ ] **Step 1: Extend the variant union + fix the typography getter in the component**

Edit `odyssey-button.component.ts`:
- Extend `OdysseyButtonVariant` to `'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'link' | 'icon'`.
- Change the `textClass` line in the `classes` getter to mirror React (link is always sm typography):
```ts
const textClass =
  this.variant === 'link' || this.size === 'sm'
    ? 'text-label-sm-medium'
    : 'text-label-base-medium';
```
- Add an `@Input() ariaLabel?: string;` (the `icon` variant requires an aria-label — React passes `aria-label`). Bind it in the template (Step 2).

- [ ] **Step 2: Bind aria-label in the template for the icon variant**

Edit `odyssey-button.component.html`, add `[attr.aria-label]="ariaLabel || null"` to the `<button>`:
```html
<button [class]="classes" [disabled]="disabled" [type]="type" [attr.aria-label]="ariaLabel || null">
```
(Leave the existing `<ng-content>` slots unchanged.)

- [ ] **Step 3: Port the `error`, `icon`, and `link-black` CSS blocks verbatim**

Into `odyssey-button.component.scss`, append the `.btn--error`, `.btn--icon` (+ its sm-size geometry overrides), and `.btn--link-black` rule blocks, copied **verbatim** from odyssey-one `apps/odyssey-one/src/styles/components.css` at the line ranges above. Keep all token references and raw `rgba()` literals unchanged. Read the exact source ranges:
```bash
sed -n '978,1090p;1174,1185p' /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/src/styles/components.css
```
Place them following the existing variant blocks and **before** the trailing `.btn--link` padding-reset cascade block, matching the cascade-order reasoning documented in the existing SCSS comments.

- [ ] **Step 4: Update the alignment artifact**

Edit `Button.figma-link.md`:
- Bump `last_synced: 2026-06-15`.
- Add `error` and `icon` (and the `link-black` tone) to the "Master variant set" prop table + a short "## Re-validation 2026-06-15" section listing the deviations found and fixed (missing error/icon/link-black variants; link-typography rule). Note their Figma nodes if known; if not, mark `node: TBD-confirm-in-Figma` is **not** acceptable here — instead write "Figma node pending confirmation (variant exists in React canonical `Button.jsx`; node to be pinned during the gate's Figma-publish step)".

- [ ] **Step 5: Build + manual smoke**

```bash
ng build odyssey-ui
```
Expected: success. (Visual confirmation of the new variants happens in the explorer, Task 8.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(odyssey-ui): catch Button up to React canonical (add error/icon/link-black, fix link typography)"
```

---

## Task 5: Button unit test

**Files:**
- Create: `projects/odyssey-ui/src/lib/button/odyssey-button.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// projects/odyssey-ui/src/lib/button/odyssey-button.component.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdysseyButtonComponent } from './odyssey-button.component';

@Component({
  template: `<odyssey-button [variant]="variant" [size]="size" [disabled]="disabled">Label</odyssey-button>`,
})
class HostComponent {
  variant: any = 'primary';
  size: any = 'md';
  disabled = false;
}

describe('OdysseyButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const btn = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OdysseyButtonComponent, HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('applies base + variant + size + typography classes', () => {
    const cl = btn().className;
    expect(cl).toContain('btn');
    expect(cl).toContain('btn--primary');
    expect(cl).toContain('btn--md');
    expect(cl).toContain('text-label-base-medium');
  });

  it('uses sm typography for size sm', () => {
    host.size = 'sm';
    fixture.detectChanges();
    expect(btn().className).toContain('text-label-sm-medium');
  });

  it('uses sm typography for the link variant regardless of size', () => {
    host.variant = 'link';
    host.size = 'lg';
    fixture.detectChanges();
    expect(btn().className).toContain('text-label-sm-medium');
    expect(btn().className).toContain('btn--link');
  });

  it('reflects the disabled input on the native button', () => {
    host.disabled = true;
    fixture.detectChanges();
    expect(btn().disabled).toBe(true);
  });

  it('supports the error and icon variants', () => {
    host.variant = 'error';
    fixture.detectChanges();
    expect(btn().className).toContain('btn--error');
    host.variant = 'icon';
    fixture.detectChanges();
    expect(btn().className).toContain('btn--icon');
  });
});
```

- [ ] **Step 2: Run it — expect pass (component already implements this)**

```bash
ng test --watch=false --browsers=ChromeHeadless
```
Expected: all `OdysseyButtonComponent` specs PASS. (This is a characterization test confirming Task 4's behavior; if the link-typography or error/icon specs fail, Task 4 was incomplete — fix it, don't weaken the test.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(odyssey-ui): Button class/disabled/variant specs"
```

---

## Task 6: Port `collect-demos` to TypeScript (TDD)

**Files:**
- Create: `src/app/dsm/demo.types.ts`, `src/app/dsm/collect-demos.ts`, `src/app/dsm/collect-demos.spec.ts`
- Reference: odyssey-one `apps/odyssey-one/src/routes/design-system/collectDemos.js` + `collectDemos.test.js` (the React source being mirrored; array input instead of glob map)

- [ ] **Step 1: Define the demo types**

```ts
// src/app/dsm/demo.types.ts
import { Type } from '@angular/core';

export type Tier = 'atom' | 'molecule' | 'organism';

export interface DemoMeta {
  name: string;
  tier: Tier;
  figmaNode?: string;
  codeConnect?: string;
  normalizing?: boolean;
}

export interface DemoProp { name: string; type: string; desc: string; }
export interface DemoToken { token: string; resolves: string; usage: string; }

/** A registry entry — the Angular analogue of a React demo module. */
export interface DemoEntry {
  meta: DemoMeta;
  props?: DemoProp[];
  tokens?: DemoToken[];
  component: Type<unknown>;
}

/** A collected entry — props/tokens defaulted to []. */
export interface CollectedDemo {
  meta: DemoMeta;
  props: DemoProp[];
  tokens: DemoToken[];
  component: Type<unknown>;
}

export interface TierGroup { key: Tier; label: string; demos: CollectedDemo[]; }
```

- [ ] **Step 2: Write the failing spec (port of collectDemos.test.js, array input + jasmine)**

```ts
// src/app/dsm/collect-demos.spec.ts
import { Component } from '@angular/core';
import { TIERS, groupDemosByTier, collectNormalizing } from './collect-demos';
import { DemoEntry } from './demo.types';

@Component({ template: '' }) class Stub {}

function entry(name: string, tier: any, extra: Partial<DemoEntry> = {}): DemoEntry {
  return { meta: { name, tier }, component: Stub, ...extra };
}

describe('groupDemosByTier', () => {
  it('returns all three tiers in canonical order, even when empty', () => {
    const result = groupDemosByTier([]);
    expect(result.map((t) => t.key)).toEqual(['atom', 'molecule', 'organism']);
    expect(result.every((t) => t.demos.length === 0)).toBe(true);
  });

  it('buckets demos into their tier', () => {
    const result = groupDemosByTier([
      entry('Button', 'atom'),
      entry('FormField', 'molecule'),
      entry('Navbar', 'organism'),
    ]);
    expect(result.find((t) => t.key === 'atom')!.demos.map((d) => d.meta.name)).toEqual(['Button']);
    expect(result.find((t) => t.key === 'molecule')!.demos.map((d) => d.meta.name)).toEqual(['FormField']);
    expect(result.find((t) => t.key === 'organism')!.demos.map((d) => d.meta.name)).toEqual(['Navbar']);
  });

  it('sorts demos alphabetically by name within a tier', () => {
    const result = groupDemosByTier([entry('Radio', 'atom'), entry('Button', 'atom'), entry('Checkbox', 'atom')]);
    expect(result.find((t) => t.key === 'atom')!.demos.map((d) => d.meta.name)).toEqual(['Button', 'Checkbox', 'Radio']);
  });

  it('defaults missing props/tokens to empty arrays and carries the component', () => {
    const result = groupDemosByTier([{ meta: { name: 'Button', tier: 'atom' }, component: Stub }]);
    const demo = result.find((t) => t.key === 'atom')!.demos[0];
    expect(demo.props).toEqual([]);
    expect(demo.tokens).toEqual([]);
    expect(demo.component).toBe(Stub);
  });

  it('throws on an invalid tier', () => {
    expect(() => groupDemosByTier([entry('X', 'gizmo')])).toThrowError(/invalid meta\.tier/);
  });

  it('throws when meta.name is missing', () => {
    expect(() => groupDemosByTier([{ meta: { tier: 'atom' } as any, component: Stub }])).toThrowError(/missing a meta\.name/);
  });

  it('excludes a normalizing demo from its tier bucket', () => {
    const result = groupDemosByTier([
      entry('Button', 'atom'),
      entry('Badge', 'atom', { meta: { name: 'Badge', tier: 'atom', normalizing: true } }),
    ]);
    expect(result.find((t) => t.key === 'atom')!.demos.map((d) => d.meta.name)).toEqual(['Button']);
  });

  it('exposes the tier labels', () => {
    expect(TIERS).toEqual([
      { key: 'atom', label: 'Atoms' },
      { key: 'molecule', label: 'Molecules' },
      { key: 'organism', label: 'Organisms' },
    ]);
  });
});

describe('collectNormalizing', () => {
  it('returns demos flagged normalizing, in the collected shape', () => {
    const result = collectNormalizing([entry('Badge', 'atom', { meta: { name: 'Badge', tier: 'atom', normalizing: true } })]);
    expect(result.length).toBe(1);
    expect(result[0].meta.name).toBe('Badge');
    expect(result[0].props).toEqual([]);
    expect(result[0].tokens).toEqual([]);
    expect(result[0].component).toBe(Stub);
  });

  it('does not return a normal (non-normalizing) demo', () => {
    expect(collectNormalizing([entry('Button', 'atom')])).toEqual([]);
  });

  it('sorts normalizing demos alphabetically by name', () => {
    const result = collectNormalizing([
      entry('Radio', 'atom', { meta: { name: 'Radio', tier: 'atom', normalizing: true } }),
      entry('Badge', 'molecule', { meta: { name: 'Badge', tier: 'molecule', normalizing: true } }),
    ]);
    expect(result.map((d) => d.meta.name)).toEqual(['Badge', 'Radio']);
  });

  it('returns an empty array when nothing is in progress', () => {
    expect(collectNormalizing([entry('Button', 'atom'), entry('FormField', 'molecule')])).toEqual([]);
  });

  it('still validates meta on normalizing demos', () => {
    expect(() => collectNormalizing([{ meta: { tier: 'atom', normalizing: true } as any, component: Stub }]))
      .toThrowError(/missing a meta\.name/);
  });
});
```

- [ ] **Step 3: Run the spec — expect FAIL (module not found)**

```bash
ng test --watch=false --browsers=ChromeHeadless
```
Expected: FAIL — `collect-demos` has no exports yet.

- [ ] **Step 4: Implement `collect-demos.ts`**

```ts
// src/app/dsm/collect-demos.ts
import { DemoEntry, CollectedDemo, TierGroup, Tier } from './demo.types';

export const TIERS: { key: Tier; label: string }[] = [
  { key: 'atom', label: 'Atoms' },
  { key: 'molecule', label: 'Molecules' },
  { key: 'organism', label: 'Organisms' },
];

const TIER_KEYS = new Set<Tier>(TIERS.map((t) => t.key));

function toCollected(entry: DemoEntry): CollectedDemo {
  return {
    meta: entry.meta,
    props: entry.props ?? [],
    tokens: entry.tokens ?? [],
    component: entry.component,
  };
}

function assertValidMeta(entry: DemoEntry): void {
  const meta = entry && entry.meta;
  if (!meta || !meta.name) {
    throw new Error(`Demo (component ${entry?.component?.name ?? 'unknown'}) is missing a meta.name`);
  }
  if (!TIER_KEYS.has(meta.tier)) {
    throw new Error(`Demo "${meta.name}" has invalid meta.tier "${meta.tier}" (expected atom|molecule|organism)`);
  }
}

export function groupDemosByTier(entries: DemoEntry[]): TierGroup[] {
  const buckets = new Map<Tier, CollectedDemo[]>(TIERS.map((t) => [t.key, []]));
  for (const entry of entries) {
    assertValidMeta(entry);
    if (entry.meta.normalizing === true) continue;
    buckets.get(entry.meta.tier)!.push(toCollected(entry));
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
  }
  return TIERS.map((t) => ({ ...t, demos: buckets.get(t.key)! }));
}

export function collectNormalizing(entries: DemoEntry[]): CollectedDemo[] {
  const out: CollectedDemo[] = [];
  for (const entry of entries) {
    assertValidMeta(entry);
    if (entry.meta.normalizing === true) out.push(toCollected(entry));
  }
  out.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
  return out;
}
```

- [ ] **Step 5: Run the spec — expect PASS**

```bash
ng test --watch=false --browsers=ChromeHeadless
```
Expected: all `collect-demos` specs PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dsm): port collect-demos to TypeScript (registry-array input) + specs"
```

---

## Task 7: figmaUrl helper, Button demo component, and the registry

**Files:**
- Create: `src/app/dsm/figma-url.ts`, `src/app/demos/button.demo.component.ts`, `src/app/demos/button.demo.component.html`, `src/app/demos/button.demo.meta.ts`, `src/app/demos/demos.registry.ts`
- Reference: odyssey-one `apps/odyssey-one/src/routes/design-system/demos/Button.demo.jsx` (the meta/props/tokens + grid layout being mirrored)

- [ ] **Step 1: figmaUrl helper**

```ts
// src/app/dsm/figma-url.ts
const FIGMA_FILE = 'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP';

export function figmaUrl(node?: string): string | null {
  if (!node) return null;
  return `${FIGMA_FILE}?node-id=${node.replace(':', '-')}`;
}
```

- [ ] **Step 2: Button demo meta (props + tokens), ported from Button.demo.jsx**

```ts
// src/app/demos/button.demo.meta.ts
import { DemoMeta, DemoProp, DemoToken } from '../dsm/demo.types';

export const buttonMeta: DemoMeta = {
  name: 'Button',
  tier: 'atom',
  figmaNode: '1307:333',
  codeConnect: 'packages/ui/src/Button.figma.tsx',
};

export const buttonProps: DemoProp[] = [
  { name: 'variant', type: 'primary|secondary|outline|ghost|error|link|icon', desc: 'Visual style. outline/ghost are dark-surface variants. icon = icon-only, Secondary-styled (sm).' },
  { name: 'size', type: 'sm|md|lg', desc: 'Padding + label size. Default md.' },
  { name: 'disabled', type: 'boolean', desc: 'Native disabled; hover/active suppressed.' },
  { name: 'hasIcon / [slot=icon]', type: 'boolean + projection', desc: 'Leading icon slot (inherits currentColor).' },
  { name: 'hasIconRight / [slot=icon-right]', type: 'boolean + projection', desc: 'Trailing icon slot.' },
  { name: '<ng-content>', type: 'projection', desc: 'Button label.' },
  { name: 'type', type: 'string', desc: 'Native button type. Default "button".' },
];

export const buttonTokens: DemoToken[] = [
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'primary bg (idle/pressed)' },
  { token: '--deep-sea-neutral-600', resolves: 'DSN/600', usage: 'primary hover bg' },
  { token: '--deep-sea-neutral-700', resolves: 'DSN/700', usage: 'secondary label' },
  { token: '--deep-sea-neutral-300', resolves: 'DSN/300', usage: 'secondary border / disabled label' },
  { token: '--bg-error', resolves: 'Bittersweet/100', usage: 'error idle bg' },
  { token: '--bittersweet-600', resolves: 'Bittersweet/600', usage: 'error label' },
  { token: '--text-link', resolves: 'Carolina Blue/500', usage: 'link label' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'raised variants' },
];
```

- [ ] **Step 3: Button demo component (mirror Button.demo.jsx grid)**

Create `button.demo.component.ts` (selector `button-demo`, templateUrl) exposing arrays `variants = ['primary','secondary','outline','ghost','error','link']`, `sizes = ['sm','md','lg']`, `dark = new Set(['outline','ghost'])`. The template `button.demo.component.html` reproduces the four React demo sections (Variants × sizes grid; States row; Icon slots; variant="icon" row) using `<odyssey-button>` + `*ngFor`, mirroring `Button.demo.jsx`. Use the same `ds-demo-section`/`ds-demo-grid`/`ds-demo-cell`/`ds-demo-label`/`ds-demo-row` class names (these classes are defined in `design-system.css`, Task 8). Icons use `lucide-angular` (`<lucide-icon name="search">` etc.) projected into `[slot=icon]` / `[slot=icon-right]` with `[hasIcon]`/`[hasIconRight]`. For inline grid-template-columns, bind `[style.gridTemplateColumns]`.

Example of the first section (reproduce the rest the same way):
```html
<!-- src/app/demos/button.demo.component.html -->
<div class="ds-demo-section">
  <h4 class="ds-demo-section__title">Variants × sizes</h4>
  <div class="ds-demo-grid" [style.gridTemplateColumns]="'64px repeat(' + variants.length + ', minmax(0, 1fr))'">
    <div></div>
    <div *ngFor="let v of variants" class="ds-demo-label" style="text-align:center">{{ v }}</div>
    <ng-container *ngFor="let s of sizes">
      <div class="ds-demo-label" style="text-align:right">{{ s }}</div>
      <div *ngFor="let v of variants" class="ds-demo-cell" [class.ds-demo-cell--dark]="dark.has(v)">
        <odyssey-button [variant]="v" [size]="s">Label</odyssey-button>
      </div>
    </ng-container>
  </div>
</div>
<!-- ...States, Icon slots, variant="icon" sections mirror Button.demo.jsx lines 63–125... -->
```

- [ ] **Step 4: The registry**

```ts
// src/app/demos/demos.registry.ts
// Explicit array — the no-glob analogue of React's import.meta.glob('./demos/*.demo.jsx').
// Adding a component = appending one entry here (+ declaring its component in AppModule).
import { DemoEntry } from '../dsm/demo.types';
import { ButtonDemoComponent } from './button.demo.component';
import { buttonMeta, buttonProps, buttonTokens } from './button.demo.meta';

export const DEMOS: DemoEntry[] = [
  { meta: buttonMeta, props: buttonProps, tokens: buttonTokens, component: ButtonDemoComponent },
];
```

- [ ] **Step 5: Verify it builds (after AppModule wiring in Task 8 the demo renders; here just typecheck)**

```bash
ng build
```
Expected: success (or a "ButtonDemoComponent not declared" error surfaces only once referenced in a template — it's declared in Task 8; this step is a typecheck of the registry/meta/helper files).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dsm): figmaUrl helper, Button demo component + meta, demos registry"
```

---

## Task 8: The explorer shell (verbatim port of DesignSystem)

**Files:**
- Create: `src/app/dsm/ds-details/ds-details.component.ts/.html`, `src/app/dsm/ds-comp/ds-comp.component.ts/.html`, `src/app/design-system.css`
- Rewrite: `src/app/app.component.ts/.html/.scss`
- Modify: `src/app/app.module.ts`
- Reference: odyssey-one `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx` (186 lines) + `DesignSystem.css` (370 lines)

**React→Angular mapping for this port:**
| React | Angular |
|---|---|
| `useState(x)` | a component class property |
| `arr.map((x) => …)` | `*ngFor="let x of arr"` |
| conditional `className={`a${c?' b':''}`}` | `[class.b]="c"` or `[ngClass]` |
| `{cond && <X/>}` | `*ngIf="cond"` |
| `cond ? <A/> : <B/>` | `*ngIf="cond; else other"` + `<ng-template #other>` |
| `<Component />` (dynamic demo) | `<ng-container *ngComponentOutlet="demo.component">` |
| props passed to `DemoSection`/`DetailsPanel` | `@Input()` on `ds-comp`/`ds-details` |
| `onToggle` callback | `@Output() toggle` EventEmitter |

- [ ] **Step 1: Port `DesignSystem.css` verbatim**

```bash
cp /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/apps/odyssey-one/src/routes/design-system/DesignSystem.css \
   src/app/design-system.css
```
Reference it globally so the `ds-*` and `ds-demo-*` classes apply across the explorer + demo components: add `"src/app/design-system.css"` to the `dsm-explorer` build `"styles"` array in `angular.json`. (Global, not component-scoped — the demo components and dynamically-outletted components all use these classes, and ViewEncapsulation would scope them away otherwise.)

- [ ] **Step 2: `ds-details` component (port of DetailsPanel, lines 22–76)**

```ts
// src/app/dsm/ds-details/ds-details.component.ts
import { Component, Input } from '@angular/core';
import { DemoMeta, DemoProp, DemoToken } from '../demo.types';
import { figmaUrl } from '../figma-url';

@Component({
  selector: 'ds-details',
  templateUrl: './ds-details.component.html',
})
export class DsDetailsComponent {
  @Input() meta!: DemoMeta;
  @Input() props: DemoProp[] = [];
  @Input() tokens: DemoToken[] = [];
  get url(): string | null { return figmaUrl(this.meta?.figmaNode); }
}
```
Template `ds-details.component.html` mirrors DesignSystem.jsx lines 24–74: `.ds-details` > `.ds-details__refs` (Figma link via `url` + `meta.codeConnect` in a `<code>`), then `*ngIf="props.length"` Props `.ds-table`, then `*ngIf="tokens.length"` Token-contract `.ds-table`. Same `<th>`/`<td>` structure.

- [ ] **Step 3: `ds-comp` component (port of DemoSection, lines 79–104)**

```ts
// src/app/dsm/ds-comp/ds-comp.component.ts
import { Component, EventEmitter, Input, Output, Type } from '@angular/core';
import { DemoMeta, DemoProp, DemoToken } from '../demo.types';

@Component({
  selector: 'ds-comp',
  templateUrl: './ds-comp.component.html',
})
export class DsCompComponent {
  @Input() meta!: DemoMeta;
  @Input() props: DemoProp[] = [];
  @Input() tokens: DemoToken[] = [];
  @Input() component!: Type<unknown>;
  @Input() open = false;
  @Input() normalizing = false;
  @Output() toggle = new EventEmitter<void>();
}
```
Template `ds-comp.component.html` mirrors DesignSystem.jsx lines 81–102:
```html
<section class="ds-comp">
  <div class="ds-comp__head">
    <div class="ds-comp__heading">
      <h2 class="ds-comp__name">{{ meta.name }}</h2>
      <span *ngIf="normalizing" class="ds-comp__pill">NORMALIZING</span>
    </div>
    <button type="button" class="ds-comp__toggle" [attr.aria-expanded]="open" (click)="toggle.emit()">
      {{ open ? 'Hide details' : 'Details' }}
    </button>
  </div>
  <div class="ds-comp__demo">
    <ng-container *ngComponentOutlet="component"></ng-container>
  </div>
  <ds-details *ngIf="open" [meta]="meta" [props]="props" [tokens]="tokens"></ds-details>
</section>
```

- [ ] **Step 4: The explorer shell `app.component` (port of the DesignSystem default export, lines 106–186)**

```ts
// src/app/app.component.ts
import { Component } from '@angular/core';
import { TIERS, groupDemosByTier, collectNormalizing } from './dsm/collect-demos';
import { DEMOS } from './demos/demos.registry';
import { CollectedDemo, TierGroup } from './dsm/demo.types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly NORMALIZE_KEY = '__normalize__';
  readonly tiers: TierGroup[] = groupDemosByTier(DEMOS);
  readonly normalizing: CollectedDemo[] = collectNormalizing(DEMOS);
  readonly hasNormalizing = this.normalizing.length > 0;

  activeTier: string = this.hasNormalizing ? this.NORMALIZE_KEY : TIERS[0].key;
  openDetails: string | null = null;

  get onNormalize(): boolean { return this.activeTier === this.NORMALIZE_KEY; }
  get active(): TierGroup | undefined {
    return this.onNormalize ? undefined : this.tiers.find((t) => t.key === this.activeTier);
  }
  setTier(key: string): void { this.activeTier = key; }
  toggleDetails(name: string): void { this.openDetails = this.openDetails === name ? null : name; }
}
```
Template `app.component.html` mirrors DesignSystem.jsx lines 125–184: `.ds-root` > `.ds-page` > `.ds-header` (h1 "Odyssey Design System" + the descriptive `<p>` — keep wording but swap `@odyssey/ui` for `odyssey-ui`), then `.ds-tabs` (`*ngFor` over `tiers` with `.ds-tab--active` on match + `.ds-tab__count`, then the separate Normalizing tab button with `.ds-tab--pulse` when `hasNormalizing`), then `.ds-list` rendering either the `normalizing` list (or `.ds-empty` message) or `active.demos` (or `.ds-empty`). Each item is a `<ds-comp>` bound with `[meta]`/`[props]`/`[tokens]`/`[component]`/`[open]="openDetails === demo.meta.name"`/`[normalizing]="demo.meta.normalizing === true"` and `(toggle)="toggleDetails(demo.meta.name)"`. Use the exact empty-state strings from the React source (lines 168–169, 177). `app.component.scss` can be left empty (all styling is global in `design-system.css`).

- [ ] **Step 5: Wire `AppModule`**

```ts
// src/app/app.module.ts — declarations + imports
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, ArrowRight, Plus, MoreHorizontal } from 'lucide-angular';
import { OdysseyUiModule } from 'odyssey-ui';
import { AppComponent } from './app.component';
import { DsDetailsComponent } from './dsm/ds-details/ds-details.component';
import { DsCompComponent } from './dsm/ds-comp/ds-comp.component';
import { ButtonDemoComponent } from './demos/button.demo.component';

@NgModule({
  declarations: [AppComponent, DsDetailsComponent, DsCompComponent, ButtonDemoComponent],
  imports: [
    BrowserModule, CommonModule, OdysseyUiModule,
    LucideAngularModule.pick({ Search, ArrowRight, Plus, MoreHorizontal }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

- [ ] **Step 6: Build + run, verify the explorer renders**

```bash
ng build
ng serve   # open http://localhost:4200 — Atoms tab shows Button; Details toggles; Normalizing tab shows the empty-state message
```
Expected: the explorer renders Button under Atoms, the Details panel toggles props/tokens tables, and the Normalizing tab shows "Nothing in progress…". `ng build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dsm): explorer shell — verbatim Angular port of the React /design-system route"
```

---

## Task 9: Global styles — fonts + font-smoothing (POC-2 gotchas #2, #3)

**Files:**
- Modify: `src/styles.scss`, `src/index.html`

- [ ] **Step 1: Confirm static-weight Inter + add font-smoothing to body**

The POC already renders Inter via `@fontsource/inter` (static-weight files — gotcha #2; a POC dependency). **Preserve whatever import mechanism the POC `src/styles.scss` already uses** for the font (do not switch it to a Google-Fonts CDN `<link>` — gotcha #2). Then append the font-smoothing rules to `body`:
```scss
body {
  -webkit-font-smoothing: antialiased;   /* gotcha #3 — macOS subpixel AA reads heavier without this */
  -moz-osx-font-smoothing: grayscale;
}
```
If the POC didn't set `body { font-family: 'Inter', … }`, add that too. Verify after build that Inter renders (compare against the React DSM in Task 10).

- [ ] **Step 2: Set the page title**

Edit `src/index.html` `<title>` to `Odyssey Angular DSM`.

- [ ] **Step 3: Build**

```bash
ng build
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style(dsm): static Inter + body font-smoothing (POC-2 parity gotchas)"
```

---

## Task 10: Library README, CHANGELOG, workspace README, and final verification

**Files:**
- Create: `projects/odyssey-ui/README.md`, `CHANGELOG.md`, modify root `README.md`

- [ ] **Step 1: Library README (Cognizant consumption instructions)**

```markdown
<!-- projects/odyssey-ui/README.md -->
# odyssey-ui

Odyssey's canonical UI components + token layer for Angular, generated from the
React design system. Visual-only — data binding, state, services, routing, forms
and RxJS remain the consuming app's responsibility.

## Install / consume
```scss
// app global styles
@use 'odyssey-ui/styles/index' as *;
```
```ts
// app module
import { OdysseyUiModule } from 'odyssey-ui';

@NgModule({ imports: [OdysseyUiModule] })
export class AppModule {}
```
```html
<odyssey-button variant="primary" size="md">Save</odyssey-button>
```

## Versioning
Library-level semver (one version for components + tokens). See `../../CHANGELOG.md`.
```

- [ ] **Step 2: CHANGELOG**

```markdown
<!-- CHANGELOG.md (workspace root) -->
# Changelog — odyssey-ui

All notable changes to the `odyssey-ui` library. Library-level semver
(one version covers components + tokens). `^`-range consumers auto-adopt
patches/minors; majors are a conscious upgrade.

## 0.1.0 — 2026-06-15
### Added
- Initial library: `OdysseyButtonComponent` (7 variants × 3 sizes + states),
  token layer (`styles/index`, 1:1 re-emit of odyssey-one tokens), typography utilities.
- DSM explorer app (mirrors the React /design-system route) for side-by-side parity review.
```

- [ ] **Step 3: Workspace README — runnable side-by-side instruction (gotcha #6)**

Replace the root `README.md` body with workspace + side-by-side instructions:
```markdown
# odyssey-angular-dsm

Standalone Angular workspace: the `odyssey-ui` library (the Cognizant deliverable)
+ a DSM explorer that mirrors the React /design-system route for parity review.

## Develop
- `ng serve` — explorer at http://localhost:4200
- `ng build odyssey-ui` — build the library → `dist/odyssey-ui/`
- `ng test --watch=false --browsers=ChromeHeadless` — unit tests

## Side-by-side parity check
1. React DSM: in odyssey-one, `npm run dev:odyssey-one` → open `/design-system` → Atoms → Button.
2. Angular DSM: here, `ng serve` → Atoms → Button.
3. Compare the two windows. The Button must match (variants, sizes, states, typography).
```

- [ ] **Step 4: Full verification sweep**

```bash
ng build odyssey-ui
ng build
ng test --watch=false --browsers=ChromeHeadless
```
Expected: library build green; app build green; **all** specs pass (Button + collect-demos).

- [ ] **Step 5: Side-by-side visual parity (manual, the definition of done)**

Run both DSMs per the README. Confirm the Angular Button matches the React Button across all 7 variants × 3 sizes + states. Record any residual deviation in `Button.figma-link.md`'s re-validation section.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs(dsm): library README + CHANGELOG 0.1.0 + workspace side-by-side instructions"
```

---

## Self-review notes (spec coverage)

- Spec §4 workspace topology → Tasks 1, 8 (two projects, explorer mirrors React).
- Spec §5.1 token re-emit → Task 2 (1:1 reconcile, custom-property emit, no `$sass` mirror).
- Spec §5.2 typography utilities → Task 2 (moved with the partials; referenced by Button).
- Spec §5.3 Button migration + re-validation → Tasks 3, 4 (drift caught: error/icon/link-black + link typography).
- Spec §5.4 export surface + build → Task 3 (`public-api.ts`, `OdysseyUiModule`, `ng build odyssey-ui`).
- Spec §5.5 versioning seed → Tasks 1, 10 (0.1.0, CHANGELOG; registry/publishing deferred).
- Spec §6.1 visual fidelity → Task 8 (verbatim CSS + markup port).
- Spec §6.2 per-demo contract → Task 6 (DemoMeta) + Task 7 (button.demo.meta).
- Spec §6.3 demo discovery → Tasks 6, 7 (collect-demos + registry array).
- Spec §6.4 Normalizing-tab mechanism → Tasks 6, 8 (excluded-from-tier logic + pill + empty-state); library-insertion point = `public-api.ts` (Task 3) + registry append (Task 7).
- Spec §7 translation rules → applied in Tasks 4, 8.
- Spec §8 parity artifacts → Tasks 4 (figma-link), 9 (fonts/smoothing), 10 (side-by-side).
- Spec §9 testing → Tasks 5, 6, 10.

**Deferred (B/C — correctly absent from this plan):** the `/normalize` Angular gate automation; validation ports beyond Button; registry/publishing decision; any React-app change.

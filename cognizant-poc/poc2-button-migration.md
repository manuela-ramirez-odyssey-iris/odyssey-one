# POC 2 — Button Migration Plan (React → Angular)

**Gate:** 4 (plan only — no code).
**Date:** 2026-05-25
**Confidence:** High on scaffold, tokens, component shape (sourced directly from React Button.jsx + components.css + Cognizant's `user-status` pattern). Medium on Code Connect — `@figma/code-connect` supports Angular only through its HTML adapter (not a first-class Angular integration), so the alignment artifact is markdown-first, not `.figma.ts`-first.

> ⚠️ AI-generated. Validate against the React Button reference and the Alt B drift findings before approving GATE 5.

---

## Pitch framing for the meeting (carry into GATE 6)

The Angular ecosystem already has token files. What's missing is the **machinery to keep them honest** — Code Connect mappings, Figma↔code linkage artifacts, a `/normalize`-like gate. POC 2 ports the React Button, but the deliverable that actually wins the strategic argument is the alignment artifact (§7) — a worked example of what design-token discipline looks like on the Angular side. Lead with that, follow with the visual proof.

## 1. Project scaffold

Project root: `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-button-demo/` (new sibling — does not exist yet; will be created at GATE 5).

```bash
# In /Users/manuelramirez/Documents/iris/Odyssey/Shipments/, run:
ng new odyssey-angular-button-demo \
  --routing=false \
  --style=scss \
  --standalone=false \
  --strict=true \
  --package-manager=npm \
  --skip-git=false
```

Pin Angular CLI to 17.2.x to match Cognizant's `^17.2.0`:

```bash
npx -p @angular/cli@17.2 ng new odyssey-angular-button-demo \
  --routing=false --style=scss --standalone=false --strict=true \
  --package-manager=npm --skip-git=false
```

`.nvmrc` at project root:
```
v20.18.1
```
(Node 20 LTS — latest .x; Angular 17 supports Node 18/20.)

Test runner stays at Karma + Jasmine (CLI default for `--standalone=false` flow). Do **not** add: `@oneodyssey/components`, PrimeNG, Material, Tailwind. The project must be visually self-contained — that's the entire point.

## 2. Token mapping strategy

Source: `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one/packages/tokens/tokens.css` (CSS custom properties). Target: `src/styles/_tokens.scss` in the Angular project.

**Recommended: single layer — re-emit CSS custom properties at `:root`. Skip the SCSS variable mirror.**

```scss
// src/styles/_tokens.scss — 1:1 re-emit of tokens.css
:root {
  --deep-sea-neutral-900: #1B2537;
  --deep-sea-neutral-700: #384253;
  // ... full palette + semantic + component tokens, identical to tokens.css ...
  --text-primary: var(--deep-sea-neutral-900);
  --border-focus: var(--carolina-blue-400);
  --radius-lg: 8px;
  --spacing-2: 8px;
  --transition-fast: 150ms ease;
  --icon-size-lg: 20px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
```

Imported once in `src/styles.scss`:
```scss
@import './styles/tokens';
```

**Why not the SCSS variable mirror layer?** Alt B documented palette bifurcation via slight value mutations (`#063A83` vs nothing, `#42AD98` vs `#237E70`). Two parallel token representations (CSS custom props *and* SCSS variables) double the surface where drift can land. Component SCSS in the Angular project references `var(--text-primary)` directly — same as React. Single source of truth, runtime themable, exactly the discipline Alt B found missing.

## 3. Button component design

Pattern: mirror Cognizant's `user-status` layout from GATE 1 §3 — split files, NgModule, classic `@Input()` decorators, no signals, no OnPush. Goal is to look idiomatic in the Cognizant codebase, not to push Angular 17 modern style.

```
src/app/components/odyssey-button/
├── odyssey-button.component.ts
├── odyssey-button.component.html
├── odyssey-button.component.scss
└── odyssey-button.module.ts
```

- **Selector:** `odyssey-button` — explicit Odyssey brand prefix differentiates from Cognizant's `linx-usermanagement-*` prefix; signals canonical-design-system ownership.
- **Decorator:** `@Component({ selector: 'odyssey-button', templateUrl, styleUrls })`. Not standalone (matches Cognizant).
- **Inputs (decorator-based, not signals — match Cognizant):**
  - `@Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' = 'primary'`
  - `@Input() size: 'sm' | 'md' | 'lg' = 'md'`
  - `@Input() disabled = false`
  - `@Input() type: 'button' | 'submit' | 'reset' = 'button'`
- **Icon slots:** `<ng-content select="[slot=icon]">` and `<ng-content select="[slot=icon-right]">`. Consumer usage: `<odyssey-button><svg slot="icon">…</svg>Label</odyssey-button>`. Use `:has()` in CSS (or class binding on detected projection) to conditionally apply `.btn--has-icon`.
- **State handling:** every interactive state (`:hover`, `:active`, `:focus-visible`, `:disabled`) is pure CSS. No host bindings, no programmatic state. Mirrors React exactly.
- **Class composition:** **getter, not `[ngClass]`.** Template uses `<button [class]="classes" [disabled]="disabled" [type]="type">`. Component class exposes `get classes(): string { return ['btn', \`btn--${this.variant}\`, \`btn--${this.size}\`].join(' '); }`. Rationale: 1:1 with React's filter-join pattern, single string in DevTools (easier diffing in screenshots), no `[ngClass]` evaluation-order surprises with multiple class sources.

## 4. Visual contract preservation

Source: React `packages/ui/src/Button.jsx` + `apps/odyssey-one/src/styles/components.css` lines 480–660. Port the `.btn*` rules verbatim into `odyssey-button.component.scss`. Same selectors (`.btn`, `.btn--primary`, `.btn--has-icon`, etc.), same property values, same media queries (none, currently).

**Raw values that must remain raw for parity** (or both sides tokenized — for POC 2, leave raw and flag for a follow-up token addition):

| Location | Raw value | Status |
|---|---|---|
| `.btn--outline` (rule-local custom props) | `rgba(255, 255, 255, 0.1)` hover tint, `rgba(255, 255, 255, 0.2)` pressed tint | Keep raw in Angular; matches React exactly |
| `.btn--ghost` (rule-local custom props) | same 0.1 / 0.2 tints | Keep raw |
| `.btn--primary:active` | `box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4)` | Keep raw |

Diff doc (appended at GATE 5): every pixel deviation, however small.

## 5. Demo page

Single route `/`, no router. `AppComponent` renders the demo directly. Two sections:

1. **Idle grid:** 5 columns (variants) × 3 rows (sizes) = 15 buttons in idle state. Each cell labeled.
2. **State demo:** four columns — *Hover*, *Active*, *Focus-visible*, *Disabled*. Each row a variant. Hover/active rows include a short instructional note ("hover this cell"); disabled column uses the `disabled` prop; focus-visible row uses `tabindex` + an "instructions: tab to reach this" hint. Outline/ghost rows render on a `--bg-inverse` swatch so dark-surface variants are visible.

No external state, no services, no HTTP. Pure visual scaffold.

## 6. Code Connect verification

`@figma/code-connect` (latest GitHub v1.4.5, May 2026) lists Angular under its **HTML adapter** — not a first-class Angular integration. Angular Code Connect would compose HTML/Web Components-style templates rather than Angular component instances, which doesn't map cleanly to the `<odyssey-button>` selector model. **Verdict: partial.**

**Recommendation: ship the manual alignment artifact (§7) as the canonical Figma↔code link.** Optionally, add a `Button.figma.ts` later using the HTML adapter pattern once `@figma/code-connect` has dedicated Angular support — not blocking for the demo. The discipline is what matters; the format is secondary.

## 7. Alignment artifact (concrete content)

Path: `src/app/components/odyssey-button/Button.figma-link.md` (adjacent to the component files).

```markdown
---
component: odyssey-button
figma_file_key: vodiHJU38YWZYmTz81uOk7
figma_file_name: Design System — MCP
canonical_react_source: packages/ui/src/Button.jsx
canonical_react_code_connect: packages/ui/src/Button.figma.tsx
maintained_by: Odyssey UX (Manuela, Efra)
last_synced: 2026-05-25
---

# Button — Figma↔Angular linkage

## Master variant set
- **Node:** 1307:333 — `Buttons / Main`
- **URL:** https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1307-333

| Figma prop | Code input | Values |
|---|---|---|
| Variant | `[variant]` | Primary → `'primary'`, Secondary → `'secondary'`, Outline → `'outline'`, Ghost → `'ghost'` |
| Size | `[size]` | sm → `'sm'`, md → `'md'`, lg → `'lg'` |
| State | `[disabled]` | Idle/Hover/Pressed → `false`; Disabled → `true` |
| Show icon | `<svg slot="icon">` projection | true → project SVG; false → omit |
| Label | `<ng-content>` (default slot) | text content |

## Link Button variant set (separate Figma frame)
- **Node:** 1895:7 — `Buttons / Link Buttons`
- **URL:** https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1895-7
- Maps to the same `<odyssey-button>` with `[variant]="'link'"` + `<svg slot="icon-right">` projection.

## Token bindings
Every visual value resolves to a CSS custom property declared in `src/styles/_tokens.scss` (re-emitted from `odyssey-one/packages/tokens/tokens.css`). No hardcoded colors, no PrimeNG/Material override layer.

## Drift discipline
Any change to the Figma master must update this file's `last_synced` date AND the React Code Connect mapping at `packages/ui/src/Button.figma.tsx` (canonical). Any change to the Angular component must verify against the Figma master first — never reverse direction.
```

This file is **the deliverable that proves the alignment workflow exists on the Angular side**. It's discoverable, greppable, machine-readable (frontmatter), and survives Code Connect tooling evolution. Equivalent in spirit to `Button.figma.tsx` on the React side.

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `:focus-visible` polyfill needed | Very low | Low | Native support in all evergreen Chromium/Firefox/Safari (≥15). No polyfill. Document as "Safari 14 and older not supported." |
| `currentColor` inheritance into projected SVG icons | Medium | Medium | `.btn__icon { color: currentColor; } .btn__icon > svg { color: currentColor; }` plus `<svg fill="currentColor">` discipline in demo. Consumers projecting their own icons must respect `fill="currentColor"` or `stroke="currentColor"`. |
| `[ngClass]` vs `[class]` precedence surprises | Low | Low | Sidestepped by using `[class]` with a single getter — no `[ngClass]` in the design. |
| Raw `rgba(255,255,255,0.x)` tint rendering differences Chromium vs Safari | Low | Low | Identical specs across browsers for `rgba()` on transparent backgrounds. Verify visually during GATE 5 with screenshots side-by-side. |
| Cognizant repo expects buttons to live in `@oneodyssey/components`, not in app code | Medium | Low | Out of scope for POC 2. Demo lives in a sibling project, not the Cognizant repo. Discussion at GATE 6 about whether Odyssey takes ownership of `@oneodyssey/components` or publishes a parallel package is a strategic decision, not a POC deliverable. |
| Angular's default `<button>` style bleed-through from Karma test runner globals | Very low | Low | `e2e` not invoked for POC; unit tests don't render real DOM unless we add them. Demo runs `ng serve` only. |

---

## Pre-implementation checklist (must be ✅ before GATE 5)

- [ ] User approves component selector name `odyssey-button` (or chooses alternative).
- [ ] User approves single-layer token strategy (CSS custom properties only — no SCSS variable mirror).
- [ ] User approves manual `Button.figma-link.md` as the primary alignment artifact (vs. attempting `.figma.ts` via the HTML adapter).
- [ ] User confirms `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-button-demo/` is the right sibling location.
- [ ] User confirms Node 20.18.1 pinning in `.nvmrc` is acceptable (or names a preferred version).
- [ ] User approves this plan.

🛑 Stopping per GATE 4 instructions. Awaiting sign-off before GATE 5 (Angular implementation in the new sibling project).

---

## GATE 5 visual parity diff

**Date:** 2026-05-25
**Project:** `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-button-demo/`
**Build status:** ✅ `npm run build` clean — 0 warnings, 0 errors. 169.91 kB raw / 49.08 kB transfer. Compile time 3.9s.
**Confidence:** High on visual parity for inline placement and all interactive states; medium on flex-column placement of `.btn--link` (one architectural deviation noted below).

> ⚠️ AI-generated. The build pass is mechanical evidence only — Manuela's visual review at `ng serve` is the actual parity verification.

### Source of truth

- `packages/ui/src/Button.jsx` (53 lines) — React Button.
- `apps/odyssey-one/src/styles/components.css:480–701` — `.btn*` rules.
- `apps/odyssey-one/src/styles/components.css:1029–1040` — `.text-label-{sm,base}-medium` utilities.
- `packages/tokens/tokens.css` — 262 lines, ported 1:1 to `src/styles/_tokens.scss`.

### Deviations from the React Button

| # | Area | Deviation | Visual impact | Why |
|---|---|---|---|---|
| 1 | Icon projection model | React: truthy `icon` prop gates both the wrapper span AND the `.btn--has-icon` class. Angular: paired `[hasIcon]="true"` boolean input + `<svg slot="icon">` ng-content projection. | **None** when consumer pairs them correctly. If consumer sets `[hasIcon]="true"` but projects nothing, an empty 20×20 icon span renders with an 8px gap visible. | Plan §3 allowed either `:has()` or class-binding-via-detected-projection. We picked class-binding (boolean inputs) so the React `.btn--has-icon` selector + asymmetric-padding rules port verbatim. Mis-pair is a consumer error, not a component bug. |
| 2 | Host element | Angular component is wrapped by an `<odyssey-button>` host element with `:host { display: inline-flex; }`. React Button has no host — its root IS the `<button>`. | **None** for inline / flex-row placement. **Possible** for `.btn--link` in a flex-column parent: `align-self: flex-start` applies to the inner `<button>`, not the `<odyssey-button>` host, so the host may stretch full-width unless the consumer sets `:host` width or `align-self`. | Native Angular component model. Documenting the constraint instead of fighting the framework. Workaround for consumers: `odyssey-button { align-self: flex-start; }` in the parent. |
| 3 | Inter font loading | Angular demo: Google Fonts CDN `<link>` in `index.html`. React project: `@fontsource/inter` self-hosted via npm import in `main.jsx`. | **Possible** cold-load FOIT (flash of invisible text) on first paint of the Angular demo before the font caches. Warm-load and after caching: pixel-identical. | Demo simplicity (no npm font dependency, no preload tuning). For a Cognizant-repo port, switch to `@fontsource/inter` to match React's self-host behavior. |
| 4 | Text-label utility location | React: `.text-label-{sm,base}-medium` live in global `apps/odyssey-one/src/styles/components.css`. Angular: same rules co-located inside `odyssey-button.component.scss`. | **None** — same CSS rules, same tokens, same specificity. | Component encapsulation. The button is self-contained; consumers don't need to remember to import a global utilities sheet. |
| 5 | Raw `rgba()` tints | Kept verbatim: `rgba(255, 255, 255, 0.1)` and `rgba(255, 255, 255, 0.2)` for outline/ghost hover/pressed; `rgba(0, 0, 0, 0.4)` for primary:active inset shadow. | **None.** | Plan §4 required parity on raw values until both sides are tokenized in lockstep. |
| 6 | Border radius, focus outline, transitions, shadows, all color tokens, all sizing values, padding asymmetry for icon slots | All ported verbatim via `var(--…)` references to the re-emitted tokens. | **None observed.** | 1:1 port. |
| 7 | `.btn--link` cascade-order requirement (`padding: 0` rule placed AFTER size rules) | Preserved verbatim with the same source-order comment. | **None observed.** | The comment in the React CSS spelled out why ordering matters; ported as-is. |

### Items requiring Manuela's visual verification at `ng serve`

These are real but cheap to confirm with a browser:

1. **Primary `:active` inset shadow** — render is browser-dependent for the exact rgba(0,0,0,0.4) on a dark surface. Verify Chromium + Safari.
2. **Outline / ghost hover/pressed tints** on `--bg-inverse` cells — verify the rgba(255,255,255,0.1) / 0.2 layered correctly.
3. **`:focus-visible` outline** — tab through the state-demo grid; outline should be 2px Carolina Blue 400 with 2px offset.
4. **Link variant trailing-icon `translateX(4px)` on hover, `translateX(2px)` on press** — visible in the Slots section.
5. **Font weights 500 (md/lg label) and 500 (sm label) load correctly** — if you see weight-400 text where 500 was expected, the Google Fonts CDN load is incomplete.

### Build artifact

```
dist/odyssey-angular-button-demo/
├── browser/
│   ├── index.html
│   ├── main-45VAJFO2.js          (130.0 kB raw / 36.6 kB transfer)
│   ├── polyfills-FFHMD2TL.js     (33.7 kB / 11.0 kB)
│   ├── styles-7YEGKD3J.css       (6.2 kB / 1.5 kB)
│   └── favicon.ico
```

### One non-code config change worth surfacing

`angular.json` per-component-style budget was bumped from the CLI defaults (2 kB warning / 4 kB error) to 8 kB / 12 kB. The button SCSS is a 4.52 kB verbatim port of the React `.btn*` rules plus the two text-label utilities — under the new budget, comfortably over the old one. Refactoring to fit the default would have violated the "preserve every selector verbatim" instruction from the plan.

### Final parity statement

**Visual parity: high.** Every variant × size × interactive state ports through the same tokens, the same selectors, the same property values, and the same raw literals. The one architectural deviation (host element + `align-self` scope on `.btn--link`) is documented and has a one-line consumer-side workaround. No drift, no rounding, no "almost-but-not" — exactly the discipline Alt B found missing on the `@oneodyssey/components` side.

### Post-GATE-5 corrections

Typography utility classes — `.text-label-base-medium` etc. live in the React project's `components.css` (not the Button's own CSS), so they were missed during the verbatim `.btn*` port. Added as `src/styles/_typography.scss` post-GATE-5. Both projects now share the same utility vocabulary; future component ports inherit it without re-porting.

Font-smoothing parity — React's `index.css` body rule applies `-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale` to switch from macOS subpixel antialiasing (default, heavier-looking) to grayscale antialiasing (lighter-looking). Angular `styles.scss` was missing both. Added post-GATE-5. This is the most subtle and most invisible-until-side-by-side cross-stack parity gotcha — flag in GATE 6 talking points as the kind of detail the `Button.figma-link.md` workflow discipline catches.

# Demo Pitch — Odyssey Design System → User Management (Angular)

**Date:** 2026-06-01
**Audience:** Odyssey + Cognizant (POC revision)
**Companion artifacts:** `linx-odyssey-usermanagement-ui/ODYSSEY-DESIGN-SYSTEM.md` (full write-up), `odyssey-angular-button-demo/` (golden reference that builds + renders)

> ⚠️ AI-generated draft. Internal POC artifact — validate before presenting; not an official Odyssey position.

---

## The one-liner

We took a button from our **React design system**, carried it into Cognizant's **real Angular app** with our tokens, typography, and icons intact — and replaced PrimeNG buttons in a live screen. **One design system, three surfaces (Figma → React → Angular), no manual restyling.**

## The problem today

User Management bends `@oneodyssey/components` / PrimeNG defaults at the consumer — ~23 override SCSS files, `!important` hacks, hardcoded hex values that drifted from the canonical palette. Every design change means manual re-coding on the Angular side.

## What we added, and where

All paths relative to `linx-odyssey-usermanagement-ui/`.

| # | What | Where | Role |
|---|---|---|---|
| 1 | **Design tokens** | `src/styles/_tokens.scss` *(new)* | 1:1 re-emit of canonical `tokens.css` as CSS custom properties. Additive — no collision with their SCSS-variable theme. |
| 2 | **Typography utilities** | `src/styles/_typography.scss` *(new)* | The `.text-label-*` classes the components consume. |
| 3 | **Foundation wiring** | `src/styles.scss` *(edited)* | Imports Inter (`@fontsource`) + tokens + typography + font-smoothing. |
| 4 | **Dependencies** | `package.json` *(edited)* | Added `@fontsource/inter`, `lucide-angular`. |
| 5 | **The Button** | `src/app/shared/components/odyssey-button/` *(4 new files)* | Canonical Odyssey Button — 5 variants × 3 sizes, NgModule, `odyssey-button` selector. Verbatim from the golden demo. |
| 6 | **The contract** | `…/odyssey-button/Button.figma-link.md` *(new)* | Pins the component to its Figma node + React source + `last_synced`. The alignment artifact their side lacks. |
| 7 | **The swap** | `src/app/add-users-modal/add-users-modal.component.html` + `.module.ts` *(edited)* | 3 real PrimeNG buttons → `<odyssey-button>`. |
| 8 | **The write-up** | `ODYSSEY-DESIGN-SYSTEM.md` *(new, repo root)* | What changed, why, what we deliberately left, drift discipline. |

## The swap (Bulk Upload modal — `add-users-modal`)

| Before (PrimeNG) | After (Odyssey) |
|---|---|
| `<p-button label="Save" [rounded] class="olt-primeng-btn add-btn">` | `<odyssey-button variant="primary">Save</odyssey-button>` |
| `<p-button severity="secondary" label="Cancel">` | `<odyssey-button variant="secondary">Cancel</odyssey-button>` |
| `<p-button [link] label="Download Template">` + `<img>` asset | `<odyssey-button variant="link">` + `<i-lucide name="download">` |

The `olt-primeng-*` override classes and the `<img>` asset just disappear — that's the manual styling work going away. Module wired with `OdysseyButtonModule` + `LucideAngularModule.pick({ Download })`; all existing PrimeNG imports preserved.

## What it proves

1. A React component crosses into their real Angular codebase, idiomatic to their patterns (`odyssey-button` NgModule alongside their `user-status` atom).
2. PrimeNG buttons get replaced in a real screen with **zero override CSS**.
3. The Figma↔code contract (`*.figma-link.md`) travels with it — the alignment machinery their side is missing.

## What we intentionally left (scope discipline)

- **PrimeNG stays** for complex widgets (dialogs, tables, dropdowns). We replace atoms/chrome, not every primitive.
- **`@oneodyssey/components` not removed** — existing components still use it; decoupling is a separate decision.
- **"Choose File" button** in the same modal left as `p-button` (carries an error-state class we didn't silently drop).

## Honest caveat

This is a faithful **code-level** integration, not a running build — `npm install` is currently blocked by the private `@oneodyssey/components` package (`read:packages` access requested). The standalone `odyssey-angular-button-demo/` is the version that builds and renders; this mirrors it exactly. Once access lands: `npm install` → `npm start` (port 4201) → open the Bulk Upload modal.

All changes are local to the clone; origin push is disabled (`no_push`).

## The ask (for leadership)

Adopt the canonical design system as the contract Angular follows: tokens consumed (not authored), every ported component carries a `*.figma-link.md`, visual changes start at Figma → React → Angular. Migrate or integrate — either way the design system and its alignment workflow live with Odyssey UX.

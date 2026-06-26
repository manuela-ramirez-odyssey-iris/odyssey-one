# DSM Component Versioning — Badges, Header Version, "Latest Only" Toggle

**Date:** 2026-06-24
**Status:** Design approved (brainstorm) — pending spec review
**Scope:** React DSM (`apps/odyssey-one/src/routes/design-system/`) + Angular DSM (`odyssey-one-library-ui/src/app/`) + the `/normalize` and `/port-to-angular` routines.

---

## 1. Goal

Let a viewer of the Design System Map see **which `@oneodyssey/ui` version each component was created or last changed in**, see the **current library version**, and **filter to just the newest components**.

Three additions:

1. **Per-section version badge** — a small pill on every component section showing its library version. **Angular DSM only.**
2. **Current library version in the header** — a chip by the title. **Angular DSM only.**
3. **"Latest only" filter toggle** — next to the domain dropdown; ON ⇒ show only components on the latest version. **Both DSMs** (React benefits even though it isn't a published library).

The badge + header are Angular-only because versioning is a *library* concept and React isn't published as a library. The toggle is useful in both explorers, so the underlying `version` data is written to both repos' demo metas — React just doesn't render the badge/header.

These become part of the normalization process: `/port-to-angular`'s release step stamps the version; the badge/header/toggle render it.

---

## 2. Data model — one source of truth

A single optional field on each component's demo meta:

```ts
version?: string   // e.g. "0.2.0" — the @oneodyssey/ui release that CREATED or LAST CHANGED this component
```

- React: `apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx` → `meta.version`
- Angular: `src/app/demos/<c>.demo.meta.ts` → `version`
- The Angular `DemoMeta` interface (`src/app/dsm/demo.types.ts`) gains `version?: string`. React has no formal type; `collectDemos.js` simply reads `meta.version`.

**Semantics:** *last-touched.* When a component is re-normalized or changed in a later release, its `version` advances to that release. (Confirmed: Button and Badge were changed on top of 0.2.0, so they are 0.3.0 now.)

**Everything derives from this field** — no new generated files, no cross-project `package.json` import:

- **`latestVersion`** = semver-max across all demos' `version` values, computed client-side via a tiny helper.
- **Header library version** (Angular) = `latestVersion`. By process construction we stamp `version` at release time, when `projects/odyssey-ui/package.json` is bumped, so `latestVersion` always equals the published `@oneodyssey/ui` version. This avoids importing the library `package.json` across Angular project boundaries.
- **"Latest only" toggle** filters to `version === latestVersion`.

### Semver-max helper

Versions are plain `"x.y.z"`. Helper parses to `[major, minor, patch]` numbers and returns the max string. Added in both repos:

- React: `collectDemos.js` → `export function latestVersion(demos) { … }`
- Angular: `src/app/dsm/collect-demos.ts` → `export function latestVersion(demos) { … }`

A demo with no `version` never wins the max and never matches the "latest" filter.

---

## 3. UI additions

| Addition | React DSM | Angular DSM |
|---|---|---|
| Per-section version pill | ❌ | ✅ |
| Library version in header | ❌ | ✅ |
| "Latest only" toggle | ✅ | ✅ |

### 3a. Per-section version badge (Angular only)

In `src/app/dsm/ds-comp/ds-comp.component.html`, after the existing `NORMALIZING` / `DEPRECATED` pills:

```html
<span *ngIf="version" class="ds-comp__version" [class.ds-comp__version--latest]="isLatest">{{ version }}</span>
```

- `DsCompComponent` gains two `@Input()`s: `version?: string`, `isLatest = false`.
- `app.component.html` passes `[version]="demo.meta.version"` and `[isLatest]="demo.meta.version === latestVersion"`.
- **Styling** (`design-system.css`): `.ds-comp__version` is a subtle neutral pill (same shape as the existing pills, `var(--radius-full)`, muted bg/text tokens). `.ds-comp__version--latest` swaps to an accent token so the newest components pop. All values via existing tokens — no hardcoding.

### 3b. Library version in header (Angular only)

In `app.component.html` `.ds-header__row`, next to `<h1>`:

```html
<span class="ds-lib-version">@oneodyssey/ui v{{ latestVersion }}</span>
```

- `app.component.ts` computes `latestVersion` once from the full demo set (all tiers + normalizing).
- `.ds-lib-version` styled as a small monospace-ish chip consistent with the existing `<code>` styling in the subtitle.

### 3c. "Latest only" toggle (both DSMs)

In `.ds-header__row`, immediately after the domain `<select>`:

```html
<button type="button" class="ds-latest-toggle" [class.is-on]="latestOnly"
        [attr.aria-pressed]="latestOnly" (click)="toggleLatest()">Latest only</button>
```

(React: same markup as JSX with `aria-pressed`, `onClick`, `className`.)

- **State:** component-local boolean, default OFF, not persisted.
- **Behavior:** AND-filter layered on the existing domain + tier filtering. When ON, each tier's demo list is additionally filtered to `version === latestVersion`. Tier tabs remain; their counts update; empty tiers disable — identical to how the domain filter already behaves.
- **Scope:** applies to the tier views (Atoms / Molecules / Organisms). The **Normalizing tab is independent** (in-progress components have no released `version`, so the toggle does not gut it — the toggle simply doesn't apply to that tab).
- **Filter wiring:**
  - React (`DesignSystem.jsx`): after `filterTiersByDomain(...)`, apply `latestOnly ? filterTiersByLatest(tiers, latestVersion) : tiers`. Add `filterTiersByLatest` to `collectDemos.js`.
  - Angular (`app.component.ts`): the `filteredTiers` getter applies the same `latestOnly` predicate on top of the domain `inDomain` filter.

---

## 4. Backfill — exact version assignment

Derived from `CHANGELOG.md` (0.1.0 = Button only; 0.2.0 = the full 46) + the pending **S63/S64** batch (unreleased, will ship as **0.3.0**), under last-touched semantics.

### → 0.3.0 (created or changed in the pending S63/S64 batch) — 7 components

| Component | Tier | Why 0.3.0 |
|---|---|---|
| Badge | atom | S63 — selected-toggle change |
| Button | atom | S63 — per-variant disabled change |
| PaginationButton | atom | S63 — new |
| MenuRow | atom | S64 — re-normalized (molecule → atom) |
| DropdownMenu | molecule | S64 — new |
| DropdownButton | atom | S64 — new |
| Dropdown | molecule | S64 — new |

### → 0.2.0 (released in 0.2.0, unchanged since) — 43 Angular components

Accordion, AddSectionButton, AddSectionDivider, Alert, AuthContent, AuthModal, ButtonToggle, Checkbox, CustomerRow, EmptyState, FieldSelect, FilterButton, FilterSuggestions, FormField, GlobalSearch, IconButton *(deprecated, still versioned)*, IconButtonGhost, LeadNav, MatchRow, MenuDropdown, ModalLarge, ModalMedium, Navbar, OdysseyLogo, PageHeader, PillTab, Radio, SearchField, SearchPanel, SearchResults, SectionHeader, SectionLabel, Sidebar, SidebarButton, StepIndicator, Tab, TrailNav, Widget, WidgetCtaRow, WidgetMetricRow, WidgetPieChart, WidgetVariantPicker, WidgetsLeftMenu.

### → 0.1.0

**None.** Button was created in 0.1.0 but has since changed, so under last-touched it is 0.3.0. 0.1.0 retains no current component.

### React-only components (not in the library)

`Cell` and `EntityChip` exist in the React DSM but were never ported to `@oneodyssey/ui` (`EntityChip` is deprecating; `Cell` is React-side TanStack work). They are **not** assigned a `version` (no library release owns them). Consequence: they never appear under "Latest only" in the React DSM. This is intentional — the toggle means "latest *library* version."

### Pre-stamping the pending batch

0.3.0 is not yet published (it's the held S63+S64 release). We stamp the 7 components `0.3.0` **now** so the feature has something to demonstrate, consistent with the known next version. When 0.3.0 is actually cut, `projects/odyssey-ui/package.json` already matches.

---

## 5. Process / routine changes (the "part of normalization" ask)

Versioning is owned by the Angular-side release step, since the library version is only known at release and `/port-to-angular` Phase 5 already touches both demos (to clear `normalizing`).

### `/port-to-angular` (`playground/angular-port-routine.md`), Phase 5 "On Pass"

Add a checklist item where the version is bumped:

> **Stamp the release version on both demos.** When you bump `projects/odyssey-ui/package.json` (`x.y.z`), set `version: "x.y.z"` on **both** the React demo meta (`apps/odyssey-one/src/routes/design-system/demos/<C>.demo.jsx`) and the Angular demo meta (`src/app/demos/<c>.demo.meta.ts`). For a re-normalized/changed component, this *advances* its existing `version`. Mention the version in the tracker row.

### `/normalize` (`playground/figma-component-routine.md`), Phase 3 Step 7

Add a one-line note:

> The demo's `meta.version` is **not** set here — it is stamped by `/port-to-angular` at release time (the version isn't known until the library is bumped).

No new `npm run domain-usage` change; version is self-contained in the metas.

---

## 6. File-by-file change list

**React (`odyssey-one`):**
- `apps/odyssey-one/src/routes/design-system/collectDemos.js` — add `latestVersion(demos)` + `filterTiersByLatest(tiers, latest)`.
- `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx` — `latestOnly` state, toggle button in `.ds-header__row`, apply latest filter to `viewTiers`.
- `apps/odyssey-one/src/routes/design-system/DesignSystem.css` — `.ds-latest-toggle` styles.
- ~50 `demos/<C>.demo.jsx` — add `version` to each library component's meta (7 → 0.3.0, 43 → 0.2.0; `Cell`/`EntityChip` left unversioned).

**Angular (`odyssey-one-library-ui`):**
- `src/app/dsm/demo.types.ts` — add `version?: string` to `DemoMeta`.
- `src/app/dsm/collect-demos.ts` — add `latestVersion(demos)` + latest filter helper.
- `src/app/dsm/ds-comp/ds-comp.component.ts` — `@Input() version`, `@Input() isLatest`.
- `src/app/dsm/ds-comp/ds-comp.component.html` — version pill.
- `src/app/app.component.ts` — compute `latestVersion`, `latestOnly` state, `toggleLatest()`, apply latest filter in `filteredTiers`.
- `src/app/app.component.html` — header version chip + toggle button.
- `src/app/design-system.css` — `.ds-comp__version`, `.ds-comp__version--latest`, `.ds-lib-version`, `.ds-latest-toggle`.
- 50 `src/app/demos/<c>.demo.meta.ts` — add `version` (7 → 0.3.0, 43 → 0.2.0).
- `src/app/dsm/*.spec.ts` — extend DSM-explorer specs for the version-max helper, badge, and toggle.

**Routines (`odyssey-one`):**
- `playground/angular-port-routine.md` — Phase 5 stamp-version checklist item.
- `playground/figma-component-routine.md` — Phase 3 note.

---

## 7. Verification

- React build (`npm run build:odyssey-one`) green; visually confirm toggle filters and no badges/header-version leak into React.
- Angular library build + DSM build + parity-lint green; DSM-explorer specs green (current 17 + new cases).
- Two-window check: Angular shows per-section pills, `@oneodyssey/ui v0.3.0` header chip, working "Latest only" toggle showing exactly the 7 components; React shows a working toggle and no badge/header-version.
- `latestVersion` equals the package.json version at release by construction (assert in a spec).

---

## 8. Non-goals / deferred

- No separate "added-in vs updated-in" history (single last-touched field, per decision).
- No version badges or header version in the **React** DSM.
- No persistence of the toggle state.
- No automated backfill generator — the one-time stamping is manual/scripted within this work; ongoing stamping is the `/port-to-angular` step.
- Versioning React-only, non-library components (`Cell`, `EntityChip`) — intentionally unversioned.

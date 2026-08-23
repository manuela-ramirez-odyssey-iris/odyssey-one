# Dev Mode — Component Name Overlay Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Model tier (hard rule):** all code implementation by **Sonnet** subagents; the main (Fable) session plans and reviews only.

**Goal:** A toggleable **dev mode** that overlays each `@odyssey/ui` component's name on the live UI — switchable between **React and Angular mapping** (the two DSMs drift; React is usually ahead and Angular uses selector naming) — with a dev-relevant summary on hover and a full detail modal on chip click. Stories stay free of component names (Kathleen's ruling); the prototype itself becomes the component guide. Companion deliverable: the **Angular DSM published** as its own Vercel project so Angular devs can jump from the overlay to their DSM.

**Why this shape:** Component identification is done by **walking React's fiber tree from DOM nodes** (`__reactFiber$*` keys), NOT by tagging components with data attributes. Tagging would edit ~40 `@odyssey/ui` components, demoting all of them to NORMALIZING and owing Angular parity for a prototype-only inspection aid. The fiber walk is a React-internals hack, acceptable here because dev mode is prototype-only tooling that touches zero components. `// ponytail: fiber-key walk; if React 19 renames the key, update one regex in inspect.js`.

**Architecture:** Everything app-local in `apps/odyssey-one/src/devmode/`. No `@odyssey/ui` change, no DSM demotion, no Angular library code change. Overlay + toggle cluster mount once at the `App.jsx` root so every route (including the external bid page, which skips AppShell) is covered. Component metadata comes from the **existing DSM demo metas** (lazy-imported on first activation — dev mode is opt-in, so the chunk never taxes normal users); Angular-side metadata comes from a **generated, committed JSON** built from the sibling Angular repo's DSM metas.

**Tech Stack:** React 18, Vitest + Testing Library. No new dependencies.

**User's spec (2026-08-23, verbatim intent across two messages), gap-fills marked `[assumption]`:**
1. Mode toggled by URL parameter; colored overlay square + small label per component, not blocking interactions.
2. Floating/fixed toggle button, draggable through the corners; extension point for future dev features.
3. Hover-to-inspect default; "all on" secondary state labeling every visible outermost component (agreed in-session).
4. **Floating menu along the toggle** to choose **Angular mapping or React mapping** — the two DSMs differ in naming format and the React DSM is often ahead, so the display is per-framework.
5. **On hover:** the component's summary relevant to the dev. **On chip click:** a big modal overlapping everything with detailed information.
6. **Angular DSM published** so Angular devs reach their corresponding DSM from dev mode. Decision (delegated to us, taken): **separate Vercel project**, deployed from the Angular repo via CLI, `-stage` naming convention (`odyssey-dsm-angular-stage`). No npm publish, no git push — Cognizant's publishing ownership untouched.

`[assumption]` list: URL param `?dev=1`; state (+ mode + framework + toggle corner) persists in `localStorage('odyssey-devmode')`; toggle cluster renders only once dev mode has ever been activated via the param; Angular display shows the selector (`odyssey-badge`) and a clearly-marked **not ported** state; nested UI components never labeled in v1 (outermost wins); the chip is the ONLY interactive overlay surface — everything else `pointer-events: none`, resolving "click opens modal" vs "don't block interactions"; hover summary = name · tier · version · status (NORMALIZING/approved), per selected framework; detail modal = props table + description from the DSM demo meta, framework versions side by side, and a **link to the matching DSM page** (React → `/design-system` in-app; Angular → the published Angular DSM URL).

---

### Task 1: devmode state + URL param + persistence

**Files:**
- Create: `apps/odyssey-one/src/devmode/useDevMode.js`
- Test: `apps/odyssey-one/src/devmode/useDevMode.test.jsx`

Module-level store (tiny pub/sub + `useSyncExternalStore`, same synchronous-API pattern as `spotStore` — read it first) exposing `{ enabled, mode: 'hover' | 'all', framework: 'react' | 'angular', setEnabled, setMode, setFramework, everActivated }`.

- [ ] **Step 1: Failing tests** — `?dev=1` enables on first read; absence + empty localStorage leaves disabled; `setEnabled/setMode/setFramework` persist and a second hook instance sees them; `?dev=0` force-disables and clears persistence; framework defaults to `'react'`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Suite green.**

### Task 2: fiber inspector — DOM node → outermost @odyssey/ui component name

**Files:**
- Create: `apps/odyssey-one/src/devmode/inspect.js`
- Test: `apps/odyssey-one/src/devmode/inspect.test.jsx`

`uiNameSet` = `Object.keys(import * as UI from '@odyssey/ui')` — derived, never hand-typed. `findUiComponent(domNode)` → `{ name, element } | null`:

1. Find the node's fiber via the `__reactFiber$…` property key (regex `^__reactFiber\$`).
2. Walk `fiber.return` upward; collect fibers whose `type` name (`displayName ?? name`) is in `uiNameSet`.
3. Return the **topmost** match and its host DOM element (first `stateNode` that is an `Element` at/below that fiber).

- [ ] **Step 1: Failing tests** (jsdom CAN do this — fiber keys exist without layout): inner node of a rendered `Badge` → `'Badge'`; two nested real ui components → outermost wins; plain `<div>` → `null`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Suite green.**

### Task 3: metadata — React DSM metas (lazy) + generated Angular map

**Files:**
- Create: `apps/odyssey-one/src/devmode/componentInfo.js`
- Create: `apps/odyssey-one/tools/gen-angular-names.mjs`
- Create (generated + committed): `apps/odyssey-one/src/devmode/angular-map.json`
- Test: `apps/odyssey-one/src/devmode/componentInfo.test.js`

**React side:** reuse `routes/design-system/collectDemos.js` — the demo files already export `meta` (name/tier/version/normalizing) and `props`. `componentInfo.js` lazy-imports that module on first dev-mode activation and indexes by name. Do NOT duplicate meta content.

**Angular side:** `gen-angular-names.mjs` reads the sibling Angular repo's DSM demo metas (`angularName`, version, normalizing — see memory `project_angular_dsm_dual_name`; repo path argv, default `../OneOdyssey/odyssey-one-library-ui` — verify actual relative path first) and emits `angular-map.json`: `{ "Badge": { "selector": "odyssey-badge", "version": "0.14.0", "normalizing": false }, … }`. Committed, regenerated manually after ports — same posture as the Figma token snapshot. Missing key ⇒ **not ported**.

**DSM links:** `dsmUrl(name, framework)` — React: `/design-system` (+ component anchor if the route supports one; check `DesignSystem.jsx` — if it doesn't, plain route link, no anchor work in this plan). Angular: `ANGULAR_DSM_URL` constant (the Task 7 deploy URL) + the Angular explorer's own anchor scheme if it has one.

- [ ] **Step 1:** Write the generator; run against the sibling repo; commit the JSON. If the repo is absent on this machine, STOP and report — never hand-type the map.
- [ ] **Step 2: Tests** — JSON parses; every key ∈ `uiNameSet` (guards stale entries after renames); `componentInfo('Badge', 'angular')` merges selector + both versions; unported component reports `ported: false`.
- [ ] **Step 3: Suite green.**

### Task 4: overlay layer — outlines, chips, hover summary

**Files:**
- Create: `apps/odyssey-one/src/devmode/DevOverlay.jsx`, `devmode.css`
- Test: `apps/odyssey-one/src/devmode/DevOverlay.test.jsx`

One `position: fixed; inset: 0; pointer-events: none` layer above the top app z-index (read `components.css` for the current ceiling). Two modes:

- **hover:** rAF-throttled `pointermove` → `elementFromPoint` → `findUiComponent` → one outline + chip. Chip content per selected framework: `Badge · atom · 0.12.0` or `odyssey-badge · 0.12.0` / `Badge · not ported`. NORMALIZING renders as a small status dot/badge on the chip.
- **all:** on activation + throttled `scroll`/`resize`, walk the DOM from `#root`; a node resolving to an outermost UI component gets an outline + chip, subtree skipped; zero-size rects skipped.

Chips are the only interactive surface (`pointer-events: auto` on the chip element alone); chip click fires `onInspect(name)` (consumed in Task 5). Geometry from `getBoundingClientRect`, re-read on every pass, clamped into the viewport.

- [ ] **Step 1: Failing tests** (jsdom has no layout — memory `project_jsdom_test_ceilings` — test logic only): hover renders exactly one chip naming the component under a simulated target; framework switch re-renders the chip with the Angular selector, and with `not ported` for an unported name; all-mode renders one chip per outermost component, none nested; disabled renders nothing and detaches listeners (spy `removeEventListener`); chip click calls `onInspect` with the name.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Suite green.** Positioning is browser-QA'd in Task 6.

### Task 5: toggle cluster (button + menu) and detail modal

**Files:**
- Create: `apps/odyssey-one/src/devmode/DevToggle.jsx`, `apps/odyssey-one/src/devmode/DevDetailModal.jsx`
- Modify: `apps/odyssey-one/src/App.jsx` (mount `<DevToggle />` + `<DevOverlay />` + modal host once, root level)
- Test: `apps/odyssey-one/src/devmode/DevToggle.test.jsx`, `DevDetailModal.test.jsx`

**Toggle cluster:** fixed button (rendered only when `everActivated`) that toggles dev mode on/off. A small flyout menu opens from it (simple app-local popover — do not pull `DropdownMenu` into this; the menu itself must not be part of what it inspects) holding: mode (Hover / All) and framework (React / Angular). Pointer-drag with `setPointerCapture`; release snaps to the nearest of the 4 corners; corner persists. Menu opens toward the viewport center from whichever corner it's in.

**Detail modal:** full-viewport-overlapping modal (reuse `ModalMedium` as a consumer if its size fits "big"; else app-local `createPortal` following `ShipmentDetailsModal.jsx`'s precedent). Content for the inspected component: React + Angular names side by side · both versions + status · description from the demo meta comment/desc · the `props` table from the demo file · **"Open in React DSM" / "Open in Angular DSM"** links (Angular link disabled with `not ported` when unmapped). Escape/overlay-click closes; must compose with `useEscapeStack` (S119) so it doesn't steal Escape from app dialogs.

- [ ] **Step 1: Failing tests** — button toggles enabled; menu sets mode + framework; not rendered when never activated; drag end persists nearest corner (assert persisted key, not pixels); modal renders props rows from a stubbed meta; Angular link disabled for unported; Escape closes.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Suite green.**

### Task 6: browser QA + deliverables log

- [ ] **Step 1: Real-browser pass** (dev server, headless Chrome measure like S123): `?dev=1` on Shipments — hover names DataTable/Badge/FilterButton correctly; all-mode labels the visible set without labeling MenuRows inside an open Dropdown; underlying UI clickable THROUGH the overlay while chips remain clickable; framework switch flips every chip; chip click opens the modal with real props; toggle drags to all corners and survives reload; external bid page gets the cluster too; menu usable from every corner.
- [ ] **Step 2:** Update `progress-deliverables.md` (D-session entry).

### Task 7: publish the Angular DSM (separate Vercel project) — **user-gated**

**Repo:** sibling `OneOdyssey/odyssey-one-library-ui` (PROTECTED — no push involved; CLI deploy only).

- [ ] **Step 1:** Verify the Angular DSM explorer builds standalone (`ng build` the explorer app); identify its output dir.
- [ ] **Step 2:** **STOP — ask the user** before creating the Vercel project / first deploy (hard rule: no prod deploy without explicit permission for THAT deploy). Proposed: new project `odyssey-dsm-angular-stage`, Homebrew `vercel` CLI from the Angular repo root, SPA rewrite if the explorer routes client-side.
- [ ] **Step 3:** Deploy, verify by grepping the LIVE bundle for a string unique to the current explorer build (never asset hashes). Record the URL as `ANGULAR_DSM_URL` in Task 3's `componentInfo.js` and redeploy the React app's dev-mode link target when the user authorizes.

**Out of scope (add when asked):** per-component colors, token inspection in the overlay, live prop values, Figma links in the modal, nested-component inspection, auto-regeneration of `angular-map.json` in CI. New dev features land as new entries in the toggle menu — not new buttons.

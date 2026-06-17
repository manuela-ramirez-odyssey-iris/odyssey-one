# DSM upgrades: Details-in-modal + per-domain component filter

- **Date:** 2026-06-16
- **Status:** Approved (design)
- **Applies to:** BOTH design-system explorers — React (`apps/odyssey-one/src/routes/design-system/`) and Angular (`odyssey-angular-dsm/src/app/`).

## Goal

Two UX upgrades to the DSMs:

1. **Details in a modal.** The per-component "Details" button opens the props/tokens panel in a centered modal overlay instead of expanding inline at the bottom of the component section.
2. **Per-domain component filter.** A dropdown beside the "Odyssey Design System" header filters the Atoms/Molecules/Organisms tabs to the components a given domain actually uses — a "lego pieces" list per domain build. `All` = today's full list.

Both DSMs must behave identically; component names (React name = DSM `name` = Figma name) are the shared key.

## Part A — Details → modal

Today: `DemoSection`/`ds-comp` renders `DsDetails`/`ds-details` inline, gated by per-section `open` state.

New behavior:

- A **single modal per DSM**, lifted to the top level, driven by one piece of state `detailsFor: string | null` (the component `name`). The per-component "Details" button sets `detailsFor = meta.name`; closing clears it.
- The modal body renders the **existing** details content unchanged — props table, token contract, Figma/Code-Connect refs. Header shows the component name + a close (✕) button.
- Dismissal: ✕ button, backdrop click, and `Esc`.
- **Lightweight chrome modal** built into each DSM (overlay + centered panel with `max-height` + internal scroll). NOT the library `ModalLarge/ModalMedium` — keeps both DSMs self-contained and identical (the Angular DSM has no ported library modal).

### React
- `DesignSystem.jsx`: lift to a `detailsFor` state; render one `<DsDetailsModal>` (new) at the route root showing `DsDetails` for the matched demo. `DemoSection`'s Details button calls `onOpenDetails(meta.name)`; remove the inline `DsDetails` render + per-section open toggle.
- New `DsDetailsModal.jsx` + styles in `DesignSystem.css`. `Esc`/backdrop close.

### Angular
- `app.component`: reuse/relabel the existing `openDetails` as `detailsFor`; render one `<ds-modal>` (new) at the app root wrapping `<ds-details>` for the matched demo. `ds-comp`'s Details button emits `(openDetails)=…`; remove the inline `<ds-details>` from `ds-comp`.
- New `ds-modal` component (`src/app/dsm/ds-modal/`) — overlay + panel, `@Input() open/title`, `@Output() close`, `@HostListener('document:keydown.escape')`. Styles in `design-system.css`.

## Part B — Domain-usage scanner (data)

A Node script that derives the domain→component map from the **app source** (read-only).

- **Location:** `tools/domain-usage.mjs` (in `odyssey-one`). NPM script `domain-usage` (sibling to `tokens:audit`).
- **`DOMAIN_SOURCES` config** (the only hand-maintained piece — small, stable; domain → source globs under `apps/odyssey-one/src/`):
  - `orders`: `components/orders/**`, `routes/orders/**`
  - `shipments`: `components/shipments/**`, `components/detail/**`, `routes/shipments/**`
  - `global-search`: `components/global-search/**`
  - `home`: `routes/Home.jsx` (+ `components/home/**` if present)
  - `carriers`: `routes/Carriers.jsx`
  - `tracking`: `routes/Tracking.jsx`
  - `users`: `routes/Users.jsx` (+ `components/CustomersModal.jsx` if it belongs to Users — confirm during plan)
  - (Exact globs for the fuzzier domains — home, users — are finalized in the plan by inspecting the dirs. `routes/design-system/**` is NEVER a domain source.)
- **Algorithm:** for each domain, read its files, extract every `import { … } from '@odyssey/ui'` (handle multi-line braces), union the named identifiers. **Direct imports only — no descent into component internals** (Sidebar listed, its internal SidebarButton not). Filter to names that exist as DSM demos (guards against stale/renamed imports).
- **Output:** `domain-usage.json` — `{ "<domain>": ["CompA","CompB", …], … }`, alphabetized. Written to **both** DSM locations:
  - `apps/odyssey-one/src/routes/design-system/domain-usage.json`
  - `../odyssey-angular-dsm/src/app/dsm/domain-usage.json` (skipped with a logged notice if the sibling repo is absent)
- **Runs automatically on every app build** — a `prebuild` hook in `apps/odyssey-one` invokes the scanner before the Vite build. So `npm run build:odyssey-one` **and every `npx vercel --prod` deploy** regenerate `domain-usage.json` from the then-current source: the DSM domain lists always match what's actually deployed, with no manual step.
  - On the Vercel build environment the sibling `odyssey-angular-dsm` repo is absent → only the **React** DSM's JSON regenerates (the deployed artifact). The **Angular** DSM JSON refreshes on local builds / manual runs (it's a local review tool, not deployed).
  - `npm run domain-usage` remains for ad-hoc refresh (and to update the committed copies + the Angular sibling).
- The JSON is committed in both repos so imports always resolve even without a prior scan.

## Part C — Domain filter UI (both DSMs)

- A **native `<select>`** beside the "Odyssey Design System" `<h1>`, styled to chrome (identical markup/behavior in both DSMs; avoids depending on a library dropdown). Options in order: **All** (value `all`, default), Home, Orders, Shipments, Carriers, Tracking, Users, Global Search.
- State `activeDomain` (default `'all'`). Visibility predicate per demo: `activeDomain === 'all' || domainUsage[activeDomain]?.includes(meta.name)`.
- Applied to the **Atoms / Molecules / Organisms** tab lists AND the **Normalizing** list (consistency; usually moot). **Tab count badges reflect the filtered count.**
- `'all'` reproduces today's behavior exactly.
- Import `domain-usage.json` statically in each DSM (React: `import domainUsage from './domain-usage.json'`; Angular: `resolveJsonModule` import in the explorer app).

### Domain set (dropdown)
`All`, `Home`, `Orders`, `Shipments`, `Carriers`, `Tracking`, `Users`, `Global Search`.

## Edge cases
- **Component used in no domain** (e.g., normalized-but-not-yet-consumed) → appears only under `All`. Expected.
- **Empty filtered tier** → show the existing "No <tier> demos yet" empty state.
- **Domain missing from JSON** (config/scan gap) → treat as empty list (show nothing but `All` still works); the predicate's optional-chaining handles it.
- **Modal open while switching domain/tab** → closing on navigation is fine; keep it simple (modal is independent of the filter).

## Testing
- **Scanner:** a unit test over a small fixture (mock import lines incl. multi-line) asserting the extracted name set; assert `routes/design-system` is excluded and only existing demo names survive.
- **Angular DSM:** specs for `ds-modal` (open/close, Esc, backdrop) and the filter predicate (all vs a domain); update `app.component.spec` for the lifted details state. Keep `dsm-explorer`/`odyssey-ui` suites green.
- **React DSM:** no formal test harness today — verify by build + manual two-window check.
- **Both builds green** (`npm run build:odyssey-one`, `npx ng build`).

## Files touched (indicative)
- New: `tools/domain-usage.mjs`, `domain-usage.json` ×2, `DsDetailsModal.jsx`, `ds-modal/` (3–4 files), scanner test.
- Modified: `DesignSystem.jsx` + `.css`, `app.component.*`, `ds-comp.component.*`, `design-system.css`, `package.json` (script), the collect/tier helpers if the filter is applied there.

## Non-goals
- No change to component content or the dual-name/arrow/deprecation features.
- No live/transitive dependency graph — direct imports only, by design.
- Not wiring the DSM filter to the live app routing; it's a documentation/lego view.

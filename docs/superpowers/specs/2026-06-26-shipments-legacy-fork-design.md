# Shipments legacy fork — design

**Date:** 2026-06-26 (Session 69)
**Status:** approved (design) → spec for review
**Type:** structural fork / refactor (no new product behavior)

## Goal

The Shipments domain is being redesigned **from scratch** — table first, then everything else (tabs, detail panel, search). Before that work begins, freeze the **current** Shipments as a disposable, unchanging snapshot so it can be A/B-compared with the new design in front of stakeholders. Once the new design is approved, the snapshot is deleted.

Hard requirement from the user: the snapshot must stay **visually identical to today**, even as the new work edits shared things (design **tokens**, components). A plain file copy is not enough — global token edits/prunes would still move (or break) the snapshot.

## Decision — Approach 2: view-fork + frozen scoped tokens

Two other options were considered and rejected:
- **View-layer fork only** — copies the view files but leaves the snapshot on live global tokens; a token pass during the redesign would shift it. Rejected: fails the "stays identical" requirement.
- **Full vendored snapshot** — the snapshot vendors namespaced copies of every token *and* shared `@odyssey/ui` component it uses. Bulletproof but heavy for a throwaway. Rejected: overkill.

**Approach 2** copies the Shipments **view tree** into a self-contained, disposable directory, and pins today's **token values** under a scoped root so the snapshot is immune to later `tokens.css` edits. The canonical design system is **never touched**.

## Freeze set vs shared set

Determined by tracing the transitive app-local imports of `routes/shipments/ShipmentsRoute.jsx`.

**Frozen (copied into the snapshot):**
- `routes/shipments/ShipmentsRoute.jsx`
- `components/shipments/*` — ShipmentTable, FilterPanel, MonitorPanels, TableControls, ShipmentTabs, SearchChipPanel
- `components/detail/*` — BottomBar, ColumnPanel, and all 10 detail tabs (Order, Product, Stops, CostAllocation, Documents, Notes, RoutingGuide, History, Instructions, TenderHistory)
- `components/global-search/*` — ShipmentsGlobalSearch, NewGlobalSearch, ShipmentsFiltersView
- `components/ui/DarkTooltip` — the tooltip util used by ShipmentTable cells
- `search/shipments/*` — the shipments-specific search adapter + progression

**Shared (NOT copied — both designs use the canonical version):**
- `api/*` (queries, services, mappers) and `data/*` — the data layer is identical for both designs
- `components/layout/AppShell` (+ Sidebar/Navbar) — app chrome
- `search/useGlobalSearch` — the domain-agnostic search hook (infra)
- `@odyssey/ui`, `@odyssey/tokens` — the canonical design system

> Caveat: shared `api/data` changes during the redesign should be **additive**. A breaking change to a shared service the snapshot calls would affect it — backstopped by the milestone tag; fork that service too if it ever happens.

## Directory layout — one self-contained, disposable folder

```
apps/odyssey-one/src/shipments-legacy/
├── ShipmentsLegacyRoute.jsx          (copy of ShipmentsRoute, PRISTINE HEAD)
├── shipments-legacy.tokens.css       (NEW — frozen token values, scoped)
└── components/
    ├── shipments/   (6 files)
    ├── detail/      (12 files)
    ├── global-search/ (3 files)
    ├── ui/          (DarkTooltip)
    └── search/      (shipments adapter + progression)
```

- All internal imports in the copies are rewritten to resolve **inside** `shipments-legacy/`. Shared imports (`api`, `data`, `layout/AppShell`, `search/useGlobalSearch`, `@odyssey/*`) continue to point at the canonical locations.
- Disposal later = delete `shipments-legacy/` + one route line + one frozen-tokens import. Zero residue.

## Frozen tokens

`shipments-legacy.tokens.css` redeclares **today's** token values under a `.shipments-legacy-root` selector:

```css
.shipments-legacy-root {
  --text-primary: <today's value>;
  --bg-secondary: <today's value>;
  /* …every token the snapshot uses… */
}
```

`ShipmentsLegacyRoute` wraps its rendered content in `<div class="shipments-legacy-root">`. CSS variable cascade makes everything inside resolve to the **frozen** values — immune to any later `tokens.css` edit or prune. The canonical `tokens.css` and every `@odyssey/ui` component are **unchanged**.

> Portaled elements (DarkTooltip, ActionMenu menus) render at `document.body`, outside the wrapper, so they pick up live tokens — but the old tooltips already carry hardcoded color fallbacks, so they are effectively frozen too. Acceptable for a disposable artifact.

## Routing + sidebar

- `App.jsx`: add `<Route path="/shipments-legacy/*" element={<ShipmentsLegacyRoute />} />`. `/shipments` stays mapped to the canonical (evolving) `ShipmentsRoute`.
- `Sidebar.jsx`: **unchanged** — Shipments → `/shipments` (the new design). The snapshot is reachable only by direct URL (`/shipments-legacy`) for stakeholder A/B.

## Handling the current WIP

The Session-69 DataTable migration is uncommitted in `components/shipments/ShipmentTable.jsx` (working tree) — it is the **seed of the new design** and **stays** in the canonical tree.

The snapshot's `ShipmentTable` must be the **pristine pre-migration** version → copied from `git show HEAD:apps/odyssey-one/src/components/shipments/ShipmentTable.jsx` (HEAD is `85fda1e`, which still has the original react-window table). Every other view-tree file is identical at HEAD vs working tree, so those copy from either.

## Milestone

After the fork is in place and verified, tag the commit **`shipments-design-v1`** — the pristine old design preserved both as the live snapshot and as a git tag fallback.

## Out of scope

- Any new-design work (that begins after this fork lands).
- The normalized RightPanel (separate Figma-first arc).
- Touching the design system, `api/`, or `data/`.

## Verification

- `npm run build:odyssey-one` clean.
- `/shipments-legacy` renders **pixel-identical** to today's `/shipments` (visual diff via screenshot).
- A deliberate temporary edit to a `tokens.css` value visibly changes `/shipments` but **not** `/shipments-legacy` (proves the freeze); revert the probe after.
- `/shipments` still renders (now showing the WIP DataTable migration).
- Sidebar unchanged; `/shipments-legacy` reachable only by URL.

## Risks

- **Import-rewrite errors** in the ~25 copied files → caught by the build.
- **Missed token** in the frozen block → the snapshot drifts on that one var. Mitigation: copy the entire `:root` token block, not a hand-picked subset.
- **Breaking shared api/data change** later → affects the snapshot; backstopped by the tag, fork-on-demand if it occurs.

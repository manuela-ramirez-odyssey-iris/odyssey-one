# DataTable extensibility — column resize + per-cell click (+ TanStack as a dependency, Cognizant usage guide)

**Date:** 2026-06-26
**Status:** Design — approved in brainstorming, pending spec review
**Component:** `DataTable` (React `packages/ui/DataTable.jsx` → Angular twin `@oneodyssey/ui` `odyssey-data-table`)
**Related:** [[project_table_strategy_tanstack]], `2026-06-25-datatable-shell-design.md`

## Purpose

Add two genuinely-new, **opt-in** capabilities to the normalized `DataTable` shell, and make explicit two things that already work or already should ship:

1. **Column resize** — a drag-grip on the header edge, backed by TanStack `columnSizing`.
2. **Per-cell click** — an `onCellClick(cell, row)` handler, suppressed on interactive cells.
3. **Reorder + column visibility (add/remove)** — already supported by the shell; this spec proves it with a demo and documents it. The *driver* UI (a **RightPanel**) is a separate Figma-first normalization, **out of scope here**.
4. **TanStack becomes a declared (peer) dependency** of the library, so Cognizant doesn't install it separately and is steered to TanStack as the engine.
5. **A Cognizant-facing usage guide (MD)** ships in the library.

Each capability is **per-table opt-in**: Orders uses the shell bare; Shipments turns features on. The division of labor is unchanged — **engine (TanStack column features + state) = Cognizant; presentation (affordances + wiring) = us.**

## Background / current state

- The `DataTable` shell renders from `table.getHeaderGroups()`, `table.getVisibleLeafColumns()`, and `row.getVisibleCells()`. **These already honor `columnOrder` and `columnVisibility`**, so the shell already reflects reorder + show/hide.
- The R2 refinement re-measures column widths when the **column signature** (count *or* order) changes; the per-cell `trackBy` (added 2026-06-26) keeps each `<td>` identity stable as columns move.
- The shell is driven by a hand-written **structural interface** (`DataTableInstance`) — a small list of the methods the shell reads. **This stays** (Option 2, chosen): no coupling to TanStack's generic type tree, no rework of the shipped Paginator. The library *declares* TanStack as a peer dependency but does not type against `Table<TData>`.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| D1 | **Per-cell** click, payload `{ cell, row }` (not whole-row). |
| D2 | Reorder + add/remove live in a separate **RightPanel** component (own Figma-first arc); not on the headers; **out of scope** here. |
| D3 | This spec = DataTable **resize** + **per-cell click** + a demo proving reorder/visibility. |
| D4 | Clickable cells = **all except interactive cells**; a cell is "interactive" if the click originates inside **any** clickable element/component (runtime detection + a `[data-no-cell-click]` escape hatch for custom clickables). |
| D5 | **Keep the structural interface** (Option 2). Declare `@tanstack/angular-table` as a **peerDependency** (auto-installed by npm 7+, single shared copy, version-ranged). Do **not** retype against `Table<TData>`; do **not** touch the Paginator's typing. |
| D6 | Ship a **usage-guide MD** in the library for Cognizant. |
| D7 | **React canonical first**, then the Angular twin (the normal flow). Both Δ=0. |

## Architecture

### Opt-in model
Opt-in is **derived from the table / the wiring** rather than redundant boolean inputs:
- **Resize:** the grip renders for a header when `header.column.getCanResize()` is true — i.e. enabling resizing on the TanStack table *is* the switch. No separate `[resizable]` input.
- **Cell click:** wiring the `onCellClick` / `(cellClick)` handler *is* the switch (no handler → no pointer, no behavior).
- **Reorder/visibility:** already reflected from the table; the driver (RightPanel/any control) calls `setColumnOrder`/`setColumnVisibility`.

### Structural interface — additions (no `@tanstack` type import)
`DataTableInstance` (and the per-header/column shapes) grow only the reads the resize affordance needs:
- `header.column.getCanResize(): boolean`
- `header.getResizeHandler(): (event) => void`
- `header.getSize(): number` / `column.getSize(): number`
- `table.getState().columnSizingInfo` (for the active-resize visual state, if used)

A real `@tanstack/{react,angular}-table` table satisfies these structurally (documented in the interface doc + usage guide: *"this contract is satisfied by TanStack's `Table`."*).

### Feature 1 — Column resize
- **Cognizant (engine):** `enableColumnResizing: true`, `columnResizeMode: 'onChange'`; optional per-column `minSize` / `maxSize`.
- **Shell (us):**
  - Render a **resize grip** on the right edge of each header where `getCanResize()` is true, wired to `header.getResizeHandler()` (pointer + touch). A `data-resizing` attribute / class reflects the active drag for the grip's hover/active style.
  - **Colgroup integration (explicit policy):** a column's `<col>` width uses `column.getSize()` when the column is **user-sized** — its id appears in `table.getState().columnSizing` — **or** it declares an explicit `columnDef.size`; **otherwise** it falls back to the existing **two-pass auto-measure**. So resize overrides the measured width only for columns the user actually dragged (or that opt into a fixed `size`); everything else still auto-fits to content. A resize updates `columnSizing` → that column flips to the TanStack size on the next pass (auto-measure skipped for it).
  - Respect `minSize` (default a sensible floor, e.g. 60px) via TanStack's clamping; the shell doesn't re-implement clamping.
- **A11y:** the grip is a focusable element with an accessible name (e.g. `aria-label="Resize {column}"`); keyboard resize is a nice-to-have, not required for v1 (note in the guide).

### Feature 2 — Per-cell click ("all except interactive cells")
- **API:** React `onCellClick?: (cell, row) => void`; Angular `@Output() cellClick = new EventEmitter<{ cell, row }>()`.
- **Behavior:** a click on a body `<td>` fires the handler with `{ cell, row }` **unless** the click originated inside an interactive/clickable element. Interactive is detected at runtime via `event.target.closest(SELECTOR)` where `SELECTOR` covers native interactives + custom clickables:
  `button, a[href], input, select, textarea, label, [role="button"], [role="menuitem"], [role="link"], [contenteditable="true"], [data-no-cell-click]`.
  → The ActionMenu trigger, checkboxes, and links are excluded automatically; a custom clickable component (e.g. `ButtonLink`) is excluded by carrying `[data-no-cell-click]` (documented convention).
- **Affordance:** body cells get `cursor: pointer` when a cell-click handler is wired (a `.odyssey-data-table--cell-clickable` modifier or a per-cell rule); interactive content keeps its own cursor/behavior.
- **No per-column config required** — the rule is content-driven (D4).

### Feature 3 — Reorder + visibility (already supported; prove + document)
- **No new shell code.** The shell already reflects `columnOrder` + `columnVisibility`; R2 re-measures; `trackBy` preserves identity across moves.
- **Demo:** add **throwaway** controls in the DataTable demo (e.g. a couple of buttons that call `setColumnOrder` / `toggle a column's visibility`) to **prove** the table reflects them live. These are explicitly *not* the RightPanel and will be removed/replaced when the RightPanel lands.

### TanStack as a peer dependency
- Add `@tanstack/angular-table` to `@oneodyssey/ui` **`peerDependencies`** (pinned range) + `allowedNonPeerDependencies`/peer config in `ng-package.json` as needed so ng-packagr is happy. Auto-installed by npm 7+ → Cognizant never installs it manually; single shared copy → table instances cross the boundary safely.
- The **demo** switches from the hand-rolled mock to a **real** `@tanstack/angular-table` table (the dsm-explorer app gains it as a dev dependency). This removes the mock + its memoization workaround and proves real-engine integration.
- React canonical: `@tanstack/react-table` is already used in the React demo; the React `DataTable` keeps its structural (inlined-flexRender) approach.

### Cognizant usage guide (MD)
- A library-shipped Markdown integration guide (location: `projects/odyssey-ui/src/lib/data-table/DataTable.usage.md`, and/or surfaced from the library README). Contents:
  1. Install (`npm i @oneodyssey/ui` — TanStack comes via peer).
  2. Create the table with `@tanstack/angular-table`; enable the features you want (`enableColumnResizing`, `columnResizeMode`; pass `columnOrder`/`columnVisibility` state for reorder/visibility).
  3. Column-def example (incl. `meta.headClass`/`cellClass`/`sticky`/`fixedWidth`).
  4. The opt-ins: resize (enable on the table → grips appear), `(cellClick)` (+ the `[data-no-cell-click]` convention for custom clickable cell content), reorder/visibility (drive via `setColumnOrder`/`setColumnVisibility` — the RightPanel will do this).
  5. The `DataTableInstance` contract note ("satisfied by TanStack's `Table`").

## Components / units

- **React `DataTable.jsx`** (canonical): add resize grips + colgroup-from-`getSize`; add `onCellClick` + interactive-suppression; export any new helpers (e.g. `isInteractiveTarget(el)`); demo gains resize-enabled table + reorder/visibility buttons + cell-click.
- **Angular `odyssey-data-table`** (twin): mirror — grips + `getResizeHandler` wiring, colgroup-from-`getSize`, `(cellClick)` + suppression, demo on a **real** TanStack table.
- **Structural interface** (`data-table.types.ts`): add the resize reads.
- **Usage guide MD** in the library.
- **`peerDependencies`** update + `ng-package.json`.

## Testing

- **Resize:** grip present only where `getCanResize()`; clicking/dragging the grip calls `getResizeHandler`; colgroup `<col>` width uses `getSize()` for a sized column and auto-measure otherwise.
- **Cell click:** fires `{cell,row}` on a plain cell; **suppressed** when the target is inside `button` / `[role=menuitem]` (ActionMenu) / a checkbox / `[data-no-cell-click]`; pointer class applied only when a handler is wired.
- **Reorder/visibility:** changing `columnOrder` re-renders columns in the new order and re-measures (signature change); hiding a column removes it + re-measures; `trackBy` keeps cell element identity across a reorder.
- **Parity:** Angular twin Δ=0 vs React (two-window GATE).

## Out of scope

- The **RightPanel** (reorder + add/remove UI) — separate **Figma-first** normalization arc.
- **Resize persistence** (saving column sizes) — the consumer's state concern.
- **Whole-row** click (we chose per-cell, D1).
- Retyping against `Table<TData>` / changing the Paginator (Option 1 — rejected, D5).

## Build order

1. React canonical: resize + cell-click + demo (real `useReactTable`, resize enabled, reorder/visibility buttons). → **GATE.**
2. Angular twin: port via `/port-to-angular`; add the `@tanstack/angular-table` peer dep + real-table demo; usage guide. → **two-window GATE (Δ=0).**
3. Phase 5: promote, tracker, `domain-usage`, usage guide finalized.

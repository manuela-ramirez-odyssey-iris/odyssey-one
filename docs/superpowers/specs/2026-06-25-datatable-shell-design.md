# DataTable shell — design

**Date:** 2026-06-25 (Session 66)
**Status:** approved (brainstorm) — ready for implementation plan
**Owner:** Manuela
**Related:** `progress.md` S65 carry-forward · memory `project_table_strategy_tanstack` · Paginator (S65) · Cell contract (Figma `2714:505`)

---

## 1. Context & goal

The Orders table renders today via an inline-assembled component, `apps/odyssey-one/src/components/orders/OrdersTable.jsx`, which hand-rolls three things: a **split sticky header**, a **two-pass colgroup width-lock**, and **horizontal scroll sync**. That chrome is the reusable, un-componentized "layer 3" of the table strategy (engine = TanStack/Cognizant; presentation primitives = Cell + Paginator, done; **layout/chrome + scroll = this gap**).

**Goal:** extract that chrome verbatim into a normalized `@odyssey/ui` molecule, `DataTable`, then refactor `OrdersTable` to be its first consumer and wire the `@odyssey/ui` `Paginator` into it (retiring the app-local `OrdersTablePagination`). Then port to Angular for Cognizant and retro-sync a Figma master. The work folds into the held **0.3.0** release.

The Cell↔`.odyssey-table` reconcile (sequence step 1) is **done**: Figma Cell `2714:505` is a content-type catalog (Head, Head+Subtitle, Title, Text, Text/placeholder, Link, Badge ×1/×2, Input, Number+Select, Checkbox, Radio, Empty, Avatar — on White/Gray axes). The current `.odyssey-table` CSS contract honors the structural variants (`--title`, `--control`, `--gray`, `__th-sub`, base head/text, link-button override) and composes existing primitives for content. **No drift blocks us; no Cell-component extraction is needed** — the shell adopts the CSS contract as-is via `meta.cellClass` / `meta.headClass`.

---

## 2. Decision: a THIN shell

The shell owns **only** chrome + scroll. It renders the `<table>` markup from a TanStack instance, applies the `.odyssey-table` Cell contract, and provides the split sticky header. It owns **no** column logic, no pagination logic, no data/loading state.

**Why thin, not thick** (rejected: a shell that generates the selection column, auto-renders the Paginator, and takes `isLoading`/`emptyState`):

1. **The roadmap features are engine features, not shell features.** Column reorder, column resize, cell interaction, sorting, selection, pagination are all headless TanStack capabilities configured on the instance / in column defs. A thin shell that faithfully renders `getHeaderGroups()` / `getRowModel()` gets them for free as the consumer enables them. A thick shell needs a new prop per feature and becomes the bottleneck. **Thin is the more extensible choice.**
2. **Per-domain feature variation is free.** Features are enabled per consumer on each table instance — Shipments can turn on column reorder while Orders does not, using the same shell, no fork. (See §7.)
3. **Ownership boundary.** Cognizant owns engine + column defs + data/state; our scope is visual (`feedback_design_system_scope_visual_only`). Taking a `table` instance and rendering chrome maps cleanly onto "we own presentation, they own engine." A thick shell reaches into their territory.
4. **Δ=0 fidelity + smaller Angular twin.** "Extract verbatim" = lift, don't redesign. Thin keeps the GATE honest and the port small.
5. **Isolation.** One clear purpose (chrome+scroll), one well-defined interface (the table instance), independently testable.

---

## 3. Non-goals (out of scope for this build)

- **Virtualization.** With pagination the rendered row count is always one page; no virtualization in the shell. The old `ShipmentTable` `react-window` div-grid path is retired except for a rare unpaginated huge client-side list. (See §10.)
- **Column resize / reorder / cell-click features — not built now.** Their seams are documented as anticipated extension points (§7); they are enabled later per consumer.
- **Loading / empty / error states.** Stay in the consuming route (thin shell).
- **Moving the whole library to a CSS-in-package convention.** The library ships zero CSS today (inline token styles + app-global classes); changing that is a cross-cutting decision for all ~49 components, out of scope here. (See §8.)
- **A Cell React component.** Cell stays a CSS contract.

---

## 4. React API

```jsx
<DataTable
  table={table}        // required — TanStack v8 instance (structural interface; NO @tanstack dep in the lib)
  stickyTop={0}        // px offset where the sticky header parks (replaces the app-specific `.orders-toolbar` querySelector)
  footer={node}        // rendered in a sticky-left footer band — the consumer puts <Paginator table={table}/> here
  ariaLabel="Orders"   // optional <table aria-label>
  className             // merged onto the root wrapper
/>
```

Per-column configuration stays in the **consumer's** TanStack column defs via `column.meta` (thin shell — Cognizant keeps owning columns):

| `column.meta` key | Effect |
| --- | --- |
| `cellClass` | class(es) applied to the column's `<td>` — Cell contract (e.g. `odyssey-table__cell--title text-label-sm-medium`) |
| `headClass` | class(es) applied to the column's `<th>` |
| `sticky: 'right'` | the column's `<th>`/`<td>` get the sticky-right treatment (generalizes today's hardcoded `.orders-table__cell--action`) |
| `fixedWidth: true` | the column is excluded from flex-slack distribution in the measure pass (R1 — see §6). Default (absent) = flexible. |

---

## 5. Structural interface (no-dep)

The shell defines and documents `DataTableTable` — the methods/shape it reads — and types `table` against THAT, so `@odyssey/ui` takes **no `@tanstack` dependency** (a real `@tanstack/react-table` `Table` satisfies it structurally; same pattern as Paginator's `PaginatorTable`):

- `table.getHeaderGroups()` → header groups → headers → `{ id, column.columnDef.{header,meta}, getContext() }`
- `table.getRowModel().rows` → rows → `{ id, getIsSelected(), getVisibleCells() }`
- per cell → `{ id, column.columnDef.{cell,meta}, getContext() }`

`flexRender` is **inlined** (3-line equivalent: render a function renderer with its context, else return the value) so the shell does not import from `@tanstack/react-table`. The consuming **app** keeps its own `@tanstack/react-table` dependency (`useReactTable`, etc.) — only the library stays TanStack-free.

---

## 6. Extracted mechanisms (verbatim) + two refinements

Lifted from `OrdersTable.jsx:93–182` into the shell, unchanged in behavior:

- **Split sticky header** — a separate sticky `<thead>` table inside `__head-inner` (`overflow:hidden`); the body is a second table in `__body` (`overflow-x:auto`).
- **Two-pass colgroup width-lock** — pass 1 renders with `width:auto` to measure true content widths; pass 2 takes `max(headerWidth, firstRowWidth)` per column, distributes leftover container space to flex columns, locks via `<colgroup>` + `table-layout:fixed`; debounced re-measure on resize (150ms).
- **Scroll sync** — body `scroll` → `head.scrollLeft = body.scrollLeft` (passive). Both colgroups read one shared width source, so header and body stay aligned.

**De-coupling:** the app-specific `.orders-toolbar` querySelector (which computed where the header parks) becomes the `stickyTop` **number** prop. The consumer measures its own toolbar and passes the px down.

**Refinement R1 — flex-width by meta, not by index.** Today the measure pass distributes slack to "every column except index 0 and the last" (assumes col 0 = select, last = action). That breaks the moment columns reorder. **Fix:** distribute slack to columns *not* flagged `meta.fixedWidth`, by column identity, never by position.

**Refinement R2 — re-measure on column changes, not just rows.** Today the measure resets only when `rows` change. Since columns are data-driven and may be added/removed/reordered at runtime, **the reset keys on a column signature (visible column count + order) in addition to `rows`.** This is what makes dynamic column sets and per-domain reorder safe.

---

## 7. Data-driven, and anticipated extension points

**Data-driven (not hardcoded):** `columns` and `data` are runtime inputs the consumer passes to `useReactTable`; the shell renders whatever `getHeaderGroups()` / `getRowModel()` produce and never references a specific column or row. A consumer may **generate columns from data/schema/API-shape/user-prefs/feature-flags**; the shell renders them identically. `OrdersTable.COLUMNS` is just one consumer's config.

**Per-domain feature opt-in:** each domain configures its own TanStack instance. Shipments may enable `columnOrder` + header DnD; Orders may not — same shell, no fork. R1/R2 are what guarantee the shell never assumes a fixed arrangement.

**Extension points (documented now, built later, all additive / non-breaking):**

| Future feature | Seam |
| --- | --- |
| **Column resize** | The `<colgroup>` is the single width seam. Today widths come from the measure pass; when `enableColumnResizing` is on, the same colgroup reads `column.getSize()` instead. Both split tables read one shared source → stays consistent. Resize handle lives in the header renderer (consumer) or is added by the shell when `column.getCanResize()`. |
| **Column reorder** | TanStack `columnOrder` state + header DnD. The shell already renders headers in `getHeaderGroups()` order (= ordered set), so it "just works" once the consumer wires DnD + state. R1/R2 keep the measure pass order-safe. |
| **Cell click / hover to access data** | Lives in the column def's `cell` renderer (consumer-owned, rendered via the inlined flexRender) — any `onClick`/`onMouseEnter` works today. For a cross-cutting need, add an optional `onRowClick(row)` / `onCellClick(cell)` prop later (additive). Hover *styling* is already in the `.odyssey-table` contract. |

---

## 8. CSS

The library ships no CSS; components style via inline token styles + app-global classes. The shell follows that model — a new **global `.odyssey-data-table*` contract** in `apps/odyssey-one/src/styles/components.css`, beside the existing `.odyssey-table` Cell contract. Renames (generalize away "orders"):

| Today (`orders.css`) | Shell contract (`components.css`) |
| --- | --- |
| `.orders-table-card` | `.odyssey-data-table` (`overflow:clip`, radius, border) |
| `.orders-table-head` / `__inner` | `.odyssey-data-table__head` / `__head-inner` (sticky; `top` set inline from `stickyTop`) |
| `.orders-table-wrap` | `.odyssey-data-table__body` (`overflow-x:auto`) |
| `.orders-pagination` positioning | `.odyssey-data-table__footer` (sticky-left band wrapping the `footer` slot) |
| `.orders-table__cell--action` | `.odyssey-table__cell--sticky-right` (generic; applied when `meta.sticky==='right'`) |

`orders.css` keeps only genuinely Orders-specific rules (the toolbar, the row-action menu). The Angular twin produces the real component-scoped SCSS — that is where "CSS ships with the component" is satisfied for Cognizant.

---

## 9. OrdersTable refactor (first consumer) + Paginator wiring

`OrdersTable.jsx` collapses to: the `COLUMNS` defs (add `meta.sticky:'right'` to the action column; mark fixed-width columns with `meta.fixedWidth`) + `useReactTable` + the toolbar-measuring effect → renders `<DataTable table={table} stickyTop={stickyTop} footer={<Paginator table={table} pageSizeOptions={[20,50,100]} />} />`.

**Retire `OrdersTablePagination`.** Migrate pagination onto the table instance so `<Paginator>` drives it:

- `OrdersRoute` replaces `pageNumber`/`pageSize` state with a single TanStack `pagination = { pageIndex, pageSize }` state + `onPaginationChange`.
- `useReactTable` gets `manualPagination: true`, `state.pagination`, `onPaginationChange`, and **`rowCount` fed from the server `totalCount`** (so `getPageCount()` / `getRowCount()` are correct).
- **0-based ↔ 1-based mapping:** TanStack `pageIndex` is 0-based; the server/LLD uses 1-based `pageNumber`. The request derives `pageNumber = pageIndex + 1`.
- Preserve current behaviors: **reset to first page on page-size change and on sort change**; `keepPreviousData` stays (previous page visible while fetching); the Next/Prev disable logic now comes from `getCanNextPage()`/`getCanPreviousPage()`.
- `pageSizeOptions={[20,50,100]}` to match today (Paginator's own default is `[10,25,50,100]`).

Loading / empty / error stay in `OrdersRoute`.

---

## 10. Performance rationale (recorded so it is not re-litigated)

Pagination **is** the performance strategy:

- `manualPagination` (Orders) → the DOM holds **one server page** (~20–100 rows); scaling = fetch next page, not render more rows.
- Client `getPaginationRowModel` → TanStack slices to the current page; again one page renders.
- The Paginator is ≤7 buttons + a dropdown + a label — re-render is free. TanStack renders no paginator UI (headless); Paginator is its view, the shared `table` instance is the single source of truth.
- The measure pass runs only over the rendered page (small, bounded), debounced on resize.

→ Small rendered row count by construction → no virtualization needed → no perf compromise. The only case needing virtualization is a huge **unpaginated** client list, which is out of scope (old `react-window` path retained for it).

---

## 11. Testing & GATE

- **Vitest (jsdom):** renders headers/rows from a mock `DataTableTable`; applies `cellClass`/`headClass`/`sticky` from `meta`; sets `stickyTop`; `data-selected` on selected rows; renders the `footer`; inlined flexRender handles function vs value renderers. (Layout-dependent measure/scroll-sync is not jsdom-testable — covered by the GATE.)
- **GATE = Δ=0.** Computed-style + screenshot of OrdersTable before vs after the refactor; confirm horizontal scroll, sticky header parking, sticky-right action column, and footer behavior are identical. This is the explicit "preserve scroll behavior" requirement.

---

## 12. Sequence tail (after GATE)

1. **Angular twin** `odyssey-data-table` in `odyssey-one-library-ui` (`@oneodyssey/ui`) — structural `DataTableTable`, component SCSS, Δ=0 vs React, via `/port-to-angular`.
2. **Figma retro-sync** — assemble a `DataTable` master (Cell + Paginator + header/row structure) from the code (deliberate Figma-first exception — engineering pattern, not pixel design) + Code Connect.
3. **Folds into the held 0.3.0 release** (dropdown stack + DSM versioning + Paginator + DataTable).

---

## 13. Files touched (React phase)

- **New:** `packages/ui/src/DataTable.jsx` (+ `index.js` export) · `packages/ui/src/DataTable.figma.tsx` (after Figma retro-sync) · `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` · vitest spec.
- **Edited:** `apps/odyssey-one/src/styles/components.css` (new `.odyssey-data-table*` contract + `--sticky-right`) · `apps/odyssey-one/src/components/orders/orders.css` (drop table-chrome rules; keep toolbar/menu) · `apps/odyssey-one/src/components/orders/OrdersTable.jsx` (consume `DataTable`) · `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx` (pagination → table instance) · normalization-tracker.
- **Removed:** `apps/odyssey-one/src/components/orders/OrdersTablePagination.jsx`.

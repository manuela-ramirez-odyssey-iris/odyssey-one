# DataTable — usage

Presentation shell for a TanStack v8 table. The consumer owns columns, data, and
state; `@odyssey/ui` takes **no TanStack dependency** (the `table` prop is duck-typed).
React twin of the Angular `lib/data-table/DataTable.usage.md`.

## Minimal table

```jsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { DataTable } from '@odyssey/ui'

const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
return <DataTable table={table} ariaLabel="Shipments" />
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `table` | TanStack v8 instance | required | Source of headers/rows/state. Duck-typed. |
| `sortable` | boolean | `false` | Feature switch: header sort buttons (see Sorting). |
| `truncationTooltip` | boolean | `false` | Feature switch: full-text Tooltip on truncated cells (see Truncation tooltip). |
| `loadingRows` | boolean | `false` | Feature switch: data cells (accessor columns) render "Loading…" instead of their value — pass while stale placeholder rows are showing (TanStack Query `keepPreviousData` + `isPlaceholderData`). Display columns (select/actions) keep rendering. Chrome + rows are already on screen — only the values are stale (tab-change/refetch). |
| `loading` | boolean | `false` | Feature switch: whole-table mode for the first mount, before anything has loaded. Rows are suppressed entirely and a centered Spinner (32px, no text) covers the BODY area only — the sticky header stays fully visible, never covered (S108) — use this instead of `loadingRows` when there's nothing to show yet (mutually exclusive with `loadingRows` in practice). |
| `onCellClick` | `(cell, row) => void` | — | Per-cell click; suppressed on interactive cells (buttons, links, inputs, `[data-no-cell-click]`). |
| `onRowClick` | `(row) => void` | — | Row-level click on any non-interactive part of the row (interactive elements keep native behavior). Fires after `onCellClick` when both are provided — most consumers pick one. |
| `scrollSelectedIntoView` | boolean \| options | `false` | Keep the selected row (TanStack `rowSelection`) visible between the sticky header and a bottom boundary. Options: `bottomBoundary?: () => px` (default viewport bottom — pass e.g. an open detail bar's top edge), `freshDelay?: ms` (default 600, empty→selected — lets consumer open-animations land), `switchDelay?: ms` (default 50, selection switches like prev/next arrows). Scrolls the nearest scrollable ancestor. |
| `stickyTop` | number \| CSS length | `0` | Where the sticky header parks. Padded page scrollers compensate with a negative `calc()`. |
| `footer` | ReactNode | — | Rendered below the bordered card (put `<Paginator table={table} />` here). |
| `ariaLabel` | string | — | `aria-label` on the body `<table>`. |
| `className` | string | — | Merged onto the root. |

Feature switches are **per instance** — one table can be plain, another `sortable`,
another `truncationTooltip`, another both.

## Loading states (`loading` vs `loadingRows`)

Two distinct modes, picked by what's already on screen:

- **`loading`** — first mount, nothing to show yet (e.g. `isPending`/`isLoading` on
  the query). Rows are suppressed; a centered Spinner covers the body area only —
  the header stays visible and uncovered (S108).
- **`loadingRows`** — chrome + a page of rows are already visible and the values
  are stale (tab switch, background refetch with `keepPreviousData`). Data cells
  render "Loading…" in place of the stale value; select/action columns keep
  rendering normally.

```jsx
<DataTable table={table} loading={isPending} loadingRows={isFetching} />
```

## Sorting (`sortable`)

- Headers become toggle buttons flipping **asc ↔ desc — never unsorted**: one column
  always drives. Clicking another column moves the driver there (asc first).
- Icons: `arrow-up-down` neutral (another column drives, DSN/400) · `move-up` asc ·
  `move-down` desc (driving/hover = `--text-primary`). `aria-sort` is set on the `<th>`.
- The shell **auto-seeds** the first sortable column asc when the sorting state is
  empty — no consumer wiring needed for a default driver.
- Per-column opt-out: `enableSorting: false` on the columnDef (system columns:
  select/action).

**Client-side data** — two touches total:

```jsx
const table = useReactTable({ ..., getSortedRowModel: getSortedRowModel() })
<DataTable table={table} sortable />
```

**Server-side data** — set `manualSorting: true`, control the state, and map it to
your query (the ShipmentsRoute pattern):

```jsx
const [sorting, setSorting] = useState([{ id: 'sellShipment', desc: false }])
const table = useReactTable({ ..., state: { sorting }, onSortingChange: setSorting, manualSorting: true })
// query params: sortBy: sorting[0]?.id, orderBy: sorting[0]?.desc ? 'desc' : 'asc'
// (sort the FULL dataset before pagination; reset to page 0 on sort change)
```

## Truncation tooltip (`truncationTooltip`)

Hovering a body cell whose ellipsis hides **any content** (S93 — was more than one word) shows the normalized
`Tooltip` with the full text. Checked at hover time (never stale after a column drag);
inner wrappers that own their own overflow are detected too.

Cells that bring their **own** tooltip (complementary data — e.g. the Shipments
date/status cells) are skipped: wrap them in a trigger that stamps
`data-tooltip-trigger` (the app-local `TooltipTrigger` does).

## Column widths

- **Default**: `max(header label, cell content)`, body-driven part capped at
  `MAX_COL_WIDTH` (290px). The full column name is always visible; content past the
  cap ellipsizes. Widths re-measure on font load, window resize, and row/column changes.
- **Drag** (TanStack `enableColumnResizing: true` on the table): starts from the
  visible width; floors at `MIN_COL_WIDTH` (54px ≈ 1 char + ellipsis) or
  `SORT_MIN_WIDTH` (74px, adds the sort icon) so the header never crushes. A drag may
  exceed the 290px cap. Pinned system columns set `enableResizing: false`.

## Per-column `meta` contract

| Key | Effect |
|---|---|
| `headClass` / `cellClass` | Cell contract classes (cellClass replaces the default). |
| `sticky: 'right'` | Pins the column right (action column). |
| `fixedWidth: true` | Excluded from leftover-width flex distribution. |
| `forwardClick: true` | Whole-cell click forwards to the cell's first interactive element (the ⋮ trigger). |

## Reference consumers

- `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx` — sortable (server-side) + truncationTooltip + resize + cell-click.
- `apps/odyssey-one/src/components/orders/OrdersTable.jsx` — resize + cell-click.
- `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` — live playground (client-side sorting, auto-seed).

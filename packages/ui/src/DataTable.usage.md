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
| `actionsRow` | `{ count, trailing, stickyTop }` | — | S116: the **Table Actions** row above the card (see below). Absent → no row. Independent of `composeRows`. |
| `error` | `{ message, detail, onRetry, retryLabel }` | — | S116: the **error** body state (see below). Rows suppressed, chrome kept. |
| `composeRows` | `{ text, actionLabel, onAction }` | — | S116: **compose mode** — the zero-row body state (see below). Absent → not rendered. |
| `stickyTop` | number \| CSS length | `0` | Where the sticky header parks. Padded page scrollers compensate with a negative `calc()`. |
| `footer` | ReactNode | — | Rendered below the bordered card (put `<Paginator table={table} />` here). |
| `ariaLabel` | string | — | `aria-label` on the body `<table>`. |
| `className` | string | — | Merged onto the root. |

Feature switches are **per instance** — one table can be plain, another `sortable`,
another `truncationTooltip`, another both.

## Table Actions (`actionsRow`)

The row above the card — item count on the left, actions on the right. Figma
`Table Container` 5057:8509.

```jsx
<DataTable
  table={table}
  actionsRow={{
    count: totalCount,          // number|null → "1,284 items" / "—"
    stickyTop: 0,               // present → pinned at this offset; omit → scrolls away
    trailing: (
      <>
        <Button variant="secondary" size="sm" icon={<SlidersHorizontal {...ICON_MD} />}>Filters</Button>
        <Button variant="secondary" size="sm" icon={<Upload {...ICON_MD} />}>Export</Button>
      </>
    ),
  }}
/>
```

**Where it lives.** A sibling **above the card**, on the page canvas — not a row
inside `<table>`. So it never participates in the **horizontal** scroll, needs no
`colSpan`, and needs no scroll-sync.

**`stickyTop` is a value, not a flag** (number px, or any CSS length):

| `actionsRow.stickyTop` | Behavior |
|---|---|
| omitted | The row scrolls away with the page. |
| `0`, `64`, `calc(-1 * var(--spacing-8))` | The row leaves the vertical scroll and parks at that offset. |

`0` is a real offset, so presence is tested with `!= null` — never truthiness. Both
behaviors already existed in the app (Orders' toolbar stuck; Shipments' scrolls away
since S82), so this is an observed axis, not a speculative one.

**`trailing` is a slot, not typed button props.** The three toolbars this replaces
needed one primary, one secondary, and *two* secondaries respectively — a
`primaryAction`/`secondaryAction` pair can express none of them. Toggling a button
off is the consumer's own `{cond && <Button/>}`.

**A sticky row anchors the whole band.** The h-scroll track and the column header
park at `actionsRow.stickyTop` **+ the row's measured height** (`ResizeObserver` — the
height follows the consumer's buttons). The table-level `stickyTop` does not apply in
that case: the header cannot park above a row pinned over it. Measuring here is why
consumers no longer measure a toolbar themselves to compute an offset.

## Compose mode (`composeRows`)

For tables built by hand, row by row, instead of fetched. Figma
`Fourth Content State`.

```jsx
<DataTable
  table={table}
  composeRows={{
    text: 'No domains have been created', // supporting copy
    actionLabel: 'New Domain',            // secondary "+" button
    onAction: startAddRowFlow,
  }}
/>
```

**It is the zero-row case only.** While the table has no rows it renders centered
supporting text over a secondary `+` button; the first row added retires it. Opting
in is manual — an empty *fetched* table never falls into this state just by having
no rows, which stays the consumer's own empty state.

**It does not touch the actions row.** Getting from row 1 to row 2 is the consumer's
own affordance, wired to any button it likes — typically one in `actionsRow.trailing`,
but equally a control anywhere else on the page:

```jsx
<DataTable
  table={table}
  composeRows={rows.length ? undefined : { text: '…', actionLabel: 'New Domain', onAction: startAddRowFlow }}
  actionsRow={{ count: rows.length, trailing: (
    <Button variant="primary" size="sm" icon={<Plus {...ICON_MD} />} onClick={startAddRowFlow}>Create Domain</Button>
  )}}
/>
```

The two are deliberately uncoupled: **adding a row is a flow** — a modal, a stepper,
a route, a validation pass — not a single callback this component should dictate, and
the actions row has its own reasons to be shown or hidden that have nothing to do
with composing.

The block renders as a sibling of the horizontal scroller (inside the card, outside
the scroll container) so a table wider than the viewport can't drag the centered
block sideways — the same reasoning as the `loading` overlay. It yields to `loading`,
where the Spinner remains the single signal.

## The error state (`error`)

Figma `Table Container Error` 5065:8602.

```jsx
<DataTable
  table={table}
  error={isError ? { message: "Couldn't load shipments.", onRetry: refetch } : undefined}
/>
```

Two lines of `label/xs` in `--text-error` over a secondary **Reload** button
(lucide `refresh-cw`), announced with `role="alert"`. **No icon** — the Figma error
state has none, unlike the app-local stopgap it replaces.

`onRetry` is optional: omit it and no button renders. `retryLabel` overrides the
default `Reload`.

**Rows are suppressed; the chrome is not.** Stale values sitting under an error
message read as current data, so the rows go — but the header and the actions row
stay, so the user keeps the table's context instead of watching it vanish.

**Precedence, in one place:** `loading` → `error` → `composeRows` → rows. `loading`
outranks the error because a request still in flight hasn't failed yet; the error
outranks compose because a failed load is not an invitation to start composing.

Owning this here is what stops a consumer rendering an error surface *instead of*
the table. `ShipmentTable` now passes this prop rather than reaching around the
shell — which also unblocks migrating the domain toolbars onto `actions`, since an
error no longer takes the table (and its count and buttons) off screen.

The Shipments detail **tabs** are panes, not tables, so they can't use this prop —
they carry the identical treatment through the app-local `ErrorState`.

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

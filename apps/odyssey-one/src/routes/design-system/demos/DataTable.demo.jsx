import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { DataTable, Paginator, Checkbox, Badge, ActionMenu } from '@odyssey/ui'

export const meta = {
  name: 'DataTable',
  tier: 'organism',
  version: '0.8.0',
  createdVersion: '0.3.0',
  codeOnly: true,
  // Code-first (composes Cell + Paginator + ActionMenu — no standalone Figma master).
  // S81 mods (approved + ported S81): isInteractiveTarget portal guard (out-of-cell
  // DOM targets are interactive — React portals bubble synthetic events through the
  // React tree, double-firing onCellClick) + `meta.forwardClick` whole-cell click
  // forwarding to the first interactive element (⋮ trigger alone is too small).
  // S82 mod: built-in custom horizontal scrollbar (sticky track + draggable thumb
  // above the header, renders only on column overflow — macOS overlay scrollbars
  // hide the body's native bar). Back to NORMALIZING until re-approval.
  // S85 mod: opt-in column SORTING (`enableSorting: true` + getSortedRowModel on the
  // consumer's table, mirroring the resize opt-in) — header becomes an asc↔desc toggle
  // (one column ALWAYS drives — no unsorted step; consumers seed `sorting` with their
  // first column) with lucide arrow-up-down (neutral) / move-up (asc) / move-down (desc),
  // aria-sort, and a SORT_MIN_WIDTH resize floor (1 char + ellipsis + icon stay visible).
  // Resize drag also reworked: shell-owned, starts from the VISIBLE colgroup width
  // (TanStack's getResizeHandler started from the injected default 150 → jump).
  normalizing: true,
}

export const props = [
  { name: 'table', type: 'Table (TanStack v8)', desc: 'A TanStack table instance — duck-typed (the library takes no TanStack dependency). The shell renders headers/rows from it; the consumer owns columns, data, and state.' },
  { name: 'stickyTop', type: 'number | string', desc: 'Offset where the sticky header parks — px number or any CSS length (the consumer measures its own toolbar/header, or compensates a padded page scroller with a negative calc()). Default 0.' },
  { name: 'footer', type: 'ReactNode', desc: 'Rendered BELOW the bordered card, transparent on the page canvas (S79b) — put a <Paginator table={table}/> here.' },
  { name: 'ariaLabel', type: 'string', desc: 'Optional aria-label applied to the body <table> element (per ARIA table semantics).' },
  { name: 'sortable', type: 'boolean', desc: 'Feature switch (default false): header sort buttons, asc ↔ desc, one column always drives (the shell auto-seeds the first sortable column when the consumer hasn\'t). Client tables also pass getSortedRowModel() to the engine; server tables set manualSorting and map the sorting state to their query. Per-column opt-out: enableSorting: false on the columnDef.' },
  { name: 'onRowClick', type: '(row) => void', desc: 'S93: row-level click on any non-interactive part of the row (interactive elements keep native behavior). Fires after onCellClick when both are provided — most consumers pick one.' },
  { name: 'scrollSelectedIntoView', type: 'boolean | { bottomBoundary?, freshDelay?, switchDelay? }', desc: "S93: keep the selected row (TanStack rowSelection) visible between the sticky header and a bottom boundary. bottomBoundary() defaults to the viewport bottom (Shipments passes the open detail bar's top edge); freshDelay (600ms) applies empty→selected so consumer open-animations land first; switchDelay (50ms) on selection switches (prev/next arrows). Scrolls the nearest scrollable ancestor." },
  { name: 'loadingRows', type: 'boolean', desc: 'Feature switch (default false): data cells (accessor columns) render "Loading…" instead of their value — pass while stale placeholder rows are showing (TanStack Query keepPreviousData + isPlaceholderData). Display columns (select/actions) keep rendering.' },
  { name: 'truncationTooltip', type: 'boolean', desc: 'Feature switch (default false): hovering any ellipsis-truncated body cell shows the normalized Tooltip (S93 — was >1 hidden word) with the full text (inner-wrapper truncation detected too). Cells wrapped in their own [data-tooltip-trigger] (complementary-data tooltips, e.g. dates) are left alone. Default column widths = max(header label, cell content) capped at MAX_COL_WIDTH (290px) — past the cap content ellipsizes.' },
  { name: 'onCellClick', type: '(cell, row) => void', desc: 'Per-cell click (opt-in): fires on a body-cell click, suppressed when the click is inside an interactive element (button/ActionMenu, checkbox, link, [role=menuitem], [data-no-cell-click]). Providing it also adds the pointer affordance.' },
  { name: 'resize', type: '(engine)', desc: 'Column resize: enable enableColumnResizing + columnResizeMode on the TanStack table → a drag-grip renders in each resizable header; the colgroup uses the user-dragged size.' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
  { name: 'selectable', type: 'boolean (consumer/demo control — not a shell prop)', desc: 'The leading selection-checkbox column is CONSUMER-OWNED: the DataTable shell renders no checkbox itself, so selection is opt-in/out by including or omitting the select column in the table\'s column array (the shell has nothing to gate). This Playground exposes it as a `selectable` toggle; default on. Product consumers add/drop the column directly (ShipmentTable uses single-row selection with no checkbox column; OrdersTable includes one).' },
]

export const tokens = [
  { token: '--radius-2xl', resolves: '16px', usage: 'card radius + the header strip top corners' },
  { token: '--deep-sea-neutral-400', resolves: '#939DAB', usage: 'NEUTRAL sort icon (one tone below --text-tertiary; driving/hover icon = --text-primary)' },
  { token: '--bg-primary', resolves: 'White', usage: 'card / header-inner / body background' },
  { token: '--bg-secondary', resolves: 'Deep Sea Neutral/50', usage: 'sticky header strip background' },
]

// Per-column behavior is set on the consumer's TanStack column.meta:
//   cellClass / headClass → Cell contract classes
//   sticky: 'right'       → pinned action column
//   fixedWidth: true      → excluded from flex-width distribution (stays snug)
//   forwardClick: true    → whole-cell click target — non-interactive clicks forward
//                           to the cell's first interactive element (⋮ trigger)

// Per-table row actions — the option SET is the consumer's (Orders ~3, Shipments ~5).
const ROW_ACTIONS = ['View', 'Edit', 'Duplicate', 'Delete'].map((label) => ({ label, onSelect: () => {} }))

const columnHelper = createColumnHelper()

// The leading selection-checkbox column is CONSUMER-OWNED (the DataTable shell renders no
// checkbox of its own — it just renders whatever columns the table instance carries). So
// `selectable` is a consumer/demo concern: include this column to opt IN, omit it to opt OUT.
// Exposed as a Playground control here; product consumers simply add/drop it in their own arrays.
const SELECT_COLUMN = columnHelper.display({
  id: 'select',
  enableResizing: false, // pinned system column — never resized, reordered, or sorted
  enableSorting: false,
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllRowsSelected()}
      indeterminate={table.getIsSomeRowsSelected()}
      onChange={table.getToggleAllRowsSelectedHandler()}
      showLabel={false}
      aria-label="Select all rows"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onChange={row.getToggleSelectedHandler()}
      showLabel={false}
      aria-label={`Select ${row.original.name}`}
    />
  ),
  meta: { headClass: 'odyssey-table__cell--control', cellClass: 'odyssey-table__cell--control', fixedWidth: true },
})

const DATA_COLUMNS = [
  columnHelper.accessor('name', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  columnHelper.accessor('origin', { header: 'Origin' }),
  columnHelper.accessor('destination', { header: 'Destination' }),
  columnHelper.accessor('weight', { header: 'Weight' }),
  columnHelper.accessor('commodity', { header: 'Commodity' }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'Active' ? 'green' : 'gray'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'action',
    enableResizing: false, // pinned system column — never resized, reordered, or sorted
    enableSorting: false,
    header: 'Action',
    // Row-action menu — the normalized ActionMenu. align="left" here because the
    // demo table is centered in a 720px frame (not flush to the viewport's right
    // edge like Orders, which uses align="right").
    cell: () => (
      <ActionMenu icon={<EllipsisVertical {...ICON_MD} />} options={ROW_ACTIONS} align="left" ariaLabel="Row actions" />
    ),
    // forwardClick (S81): clicking anywhere in the cell forwards to the ⋮ trigger.
    meta: { sticky: 'right', fixedWidth: true, forwardClick: true },
  }),
]

const CITIES = ['Atlanta', 'Dallas', 'Chicago', 'Denver', 'Newark', 'Seattle', 'Miami', 'Phoenix']
// Verbose variants exercise the 290px default-width cap + the truncation tooltip.
const LONG_CITIES = [
  'Atlanta Fulton County Intermodal Ramp GA US 30301',
  'Dallas Fort Worth Alliance Gateway Terminal TX US 75201',
  'Chicago Cicero Rail Yard Distribution Center IL US 60601',
  'Denver Rocky Mountain Consolidation Facility CO US 80201',
]
const GOODS = ['Electronics', 'Produce', 'Steel Coil', 'Apparel', 'Auto Parts']

// Data population is a Playground control — n rows; `longContent` swaps ONE column
// (Origin) to verbose terminal names so the 290px cap + tooltip show against
// normal-width neighbors.
function makeData(n, longContent) {
  const originCities = longContent ? LONG_CITIES : CITIES
  return Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    name: `Customer ${String.fromCharCode(65 + (i % 26))}${i}`,
    origin: originCities[i % originCities.length],
    destination: CITIES[(i + 3) % CITIES.length],
    weight: `${(i + 1) * 120} lb`,
    commodity: GOODS[i % GOODS.length],
    status: i % 4 === 0 ? 'Draft' : 'Active',
  }))
}

const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }
const labelStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)', cursor: 'pointer' }

// Playground: the API's feature switches + data population, live.
function LiveDataTable() {
  const [sortable, setSortable] = useState(true)
  const [truncationTooltip, setTruncationTooltip] = useState(true)
  const [selectable, setSelectable] = useState(true)
  const [rowCount, setRowCount] = useState(32)
  const [longContent, setLongContent] = useState(false)
  const data = useMemo(() => makeData(rowCount, longContent), [rowCount, longContent])
  // selectable → include the leading checkbox column (consumer-owned; opt in/out by add/drop).
  const columns = useMemo(() => (selectable ? [SELECT_COLUMN, ...DATA_COLUMNS] : DATA_COLUMNS), [selectable])

  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [columnOrder, setColumnOrder] = useState([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnSizing, setColumnSizing] = useState({})
  // Starts empty — the shell auto-seeds the FIRST sortable column asc ('name')
  // via setSorting, so one column always drives without consumer wiring.
  const [sorting, setSorting] = useState([])
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection, pagination, columnOrder, columnVisibility, columnSizing, sorting },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={labelStyle}>
          <input type="checkbox" checked={sortable} onChange={(e) => setSortable(e.target.checked)} />
          sortable
        </label>
        <label style={labelStyle}>
          <input type="checkbox" checked={truncationTooltip} onChange={(e) => setTruncationTooltip(e.target.checked)} />
          truncationTooltip
        </label>
        <label style={labelStyle}>
          <input type="checkbox" checked={selectable} onChange={(e) => setSelectable(e.target.checked)} />
          selectable
        </label>
        <label style={labelStyle}>
          rows
          <select value={rowCount} onChange={(e) => setRowCount(Number(e.target.value))} style={inputStyle}>
            {[32, 200, 1000, 5000].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          <input type="checkbox" checked={longContent} onChange={(e) => setLongContent(e.target.checked)} />
          long content (290px cap + tooltip)
        </label>
      </div>
      <DataTable
        table={table}
        sortable={sortable}
        truncationTooltip={truncationTooltip}
        ariaLabel="Sample data"
        onCellClick={(cell, row) => console.log('cell click →', cell.column.id, '·', row.original.name)}
        footer={<Paginator table={table} />}
      />
    </div>
  )
}

// ── Anatomy legend + API doc (S85) — doc-only, the Live table above is the playground ──
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Anatomy() {
  return (
    <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0, width: '100%' }}>
      <LegendRow part="root" tier="organism">Transparent wrapper: bordered white card (table only) + <code>footer</code> slot BELOW it on the page canvas (S79b).</LegendRow>
      <LegendRow part="hscroll bar" nested>Custom sticky horizontal scrollbar ABOVE the header — renders only on column overflow (S82).</LegendRow>
      <LegendRow part="header strip" nested>Split sticky header (<code>stickyTop</code> offset), scroll-synced to the body; colgroup width-lock shared with the body table.</LegendRow>
      <LegendRow part="sort button" nested>Per header when <code>sortable</code>: label + icon, asc ↔ desc, one column always drives. Neutral icon DSN/400; driving/hover <code>--text-primary</code>; <code>aria-sort</code> on the th.</LegendRow>
      <LegendRow part="resize grip" nested>8px hit-area on the header's right edge (TanStack <code>enableColumnResizing</code>); drag starts from the VISIBLE width, floors at 54px (74px sortable); the last data column's grip insets 6px clear of the action column.</LegendRow>
      <LegendRow part="body cells" nested>Default width = max(header label, cell content) capped at 290px; past the cap content ellipsizes — with <code>truncationTooltip</code>, a &gt;1-word ellipsis raises the Tooltip on hover.</LegendRow>
      <LegendRow part="action column" nested>Pinned right via <code>meta.sticky: 'right'</code>; <code>meta.forwardClick</code> makes the whole cell the ⋮ tap target.</LegendRow>
      <LegendRow part="footer" tier="slot" nested>The Paginator lives here — transparent on the canvas below the card.</LegendRow>
    </ul>
  )
}

// Rendered in the details modal's API tab (see collectDemos toEntry / DetailsPanel).
export const apiDoc = `// Feature switches — per instance, all default OFF, mix freely:
<DataTable table={table} />                             // plain
<DataTable table={table} sortable />                    // sorting
<DataTable table={table} truncationTooltip />           // truncation tooltip
<DataTable table={table} sortable truncationTooltip />  // both

// sortable, client-side data (two touches — the shell auto-seeds the first
// sortable column asc, so one column always drives):
const table = useReactTable({ ...config, getSortedRowModel: getSortedRowModel() })
<DataTable table={table} sortable />

// sortable, server-side data (control the state, map it to the query):
const [sorting, setSorting] = useState([{ id: 'firstCol', desc: false }])
useReactTable({ ...config, state: { sorting }, onSortingChange: setSorting, manualSorting: true })
// query: sortBy = sorting[0]?.id · orderBy = sorting[0]?.desc ? 'desc' : 'asc'

// per-column opt-outs (system columns): enableSorting: false, enableResizing: false
// own-tooltip cells: wrap in a [data-tooltip-trigger] element — truncationTooltip skips them`

export default function DataTableDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Thin chrome over a <code>@tanstack/react-table</code> instance: split sticky header,
        colgroup width-lock, horizontal scroll-sync, a <strong>sticky-right</strong> action column
        (<code>meta.sticky:'right'</code>), and a <strong>Paginator</strong> footer rendered
        <strong> below the bordered card</strong>, transparent on the page canvas (S79b). The consumer
        owns columns / data / state. Scroll the table horizontally — the header tracks the body and
        the Action column stays pinned. Each row's action cell is the normalized <strong>ActionMenu</strong>
        molecule (ellipsis trigger + anchored <code>DropdownMenu</code> + <code>MenuRow</code> options —
        composes library primitives internally) with a per-table option set. It inherits the Dropdown
        <strong> boundary flip</strong>: open a menu on a low row (or the rows-per-page menu near the
        viewport bottom) and it opens upward instead of clipping.
        <strong> Sorting</strong> (S85) is a per-table opt-in like resize (<code>enableSorting: true</code> +
        <code>getSortedRowModel()</code>): each data-column header is a toggle button flipping
        asc ↔ desc — <strong>one column always drives the sort</strong> (no unsorted third step;
        clicking another column moves the driver there, asc first) — with <code>arrow-up-down</code>
        (neutral — another column drives), <code>move-up</code> (asc), <code>move-down</code> (desc)
        and <code>aria-sort</code>. Drag a sortable
        column narrow — it floors at one character + ellipsis + the sort icon.
      </p>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — feature switches · data population · selection · sticky action · pagination</h4>
        {/* Resize harness — demo scaffolding only. Deliberately styled as a gray
            backdrop (NOT a border on the card): the DataTable card itself has no
            outer border, and a flush border here previously read as component
            chrome and leaked into the Angular port. */}
        <div style={{ resize: 'horizontal', overflow: 'hidden', maxWidth: '100%', width: 752, background: 'var(--bg-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
          <LiveDataTable />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Anatomy</h4>
        <Anatomy />
      </div>
    </div>
  )
}

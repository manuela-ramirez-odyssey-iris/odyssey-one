import { useCallback, useMemo, useRef, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical, Columns3Cog, Info, TriangleAlert } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Badge, Button, DataTable, Paginator, ActionMenu } from '@odyssey/ui'
import TooltipTrigger from '../ui/TooltipTrigger'
import { ALL_COLUMNS } from '../detail/ColumnPanel'
import { CELL_TAB_MAP } from './cellTabMap'
import { getErrorDetail } from '../common/errorDetail.js'

/**
 * ShipmentTable — Shipments configuration of the normalized @odyssey/ui DataTable
 * shell (S69 QA migration off the retired react-window two-panel grid). The shell
 * owns the chrome (split sticky header + colgroup width-lock + horizontal scroll
 * sync + sticky-right column); this file owns the column defs + the TanStack
 * instance (single-row selection + server-side pagination + opt-in column resize).
 *
 * Server-paginated: `shipments` is one page (25/50/100 rows) — small enough to
 * render without virtualization (the DataTable design assumption). Selection is
 * single-row, CONTROLLED by the parent's `selectedId`: clicking a row fires
 * onCellClick → onRowSelect (toggle lives in the parent). The decorative radio is
 * a non-input visual on purpose — a real <input> would count as an interactive
 * cell and suppress the row's onCellClick. (Gap: DataTable has no built-in
 * accessible single-select/radio pattern — hand-rolled here for the QA pass.)
 */

function formatDateOnly(raw) {
  if (!raw) return '--'
  // raw format: "05/08/2026 06:30 CST"
  const parts = raw.split(' ')
  const datePart = parts[0] // "05/08/2026"
  const [mm, dd, yyyy] = datePart.split('/')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}, ${yyyy}`
}

const BADGE_COLORS = ['amber', 'blue', 'green', 'red', 'purple']

// Orders tooltip: shows all order badges on hover/focus.
function OrdersTooltip({ orders, children }) {
  if (!orders.length) return children
  const content = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {orders.map((ord, i) => (
        <Badge key={ord} variant={BADGE_COLORS[i % BADGE_COLORS.length]}>{ord}</Badge>
      ))}
    </div>
  )
  return (
    <TooltipTrigger tooltipProps={{ label: 'Order numbers on this shipment:', groups: [{ content }] }}>
      {children}
    </TooltipTrigger>
  )
}

// Per-column custom cell renderers, keyed by column key. Each receives the raw
// shipment row. Columns without an entry render the plain accessor value — the
// DataTable `truncationTooltip` feature owns overflow tooltips at hover time
// (the old app-local TruncatedText wrapper had a stale overflow state: it checked
// only on mount/window-resize, so column drags never re-armed its tooltip; deleted S85).
export const COLUMN_CONFIG = [
  { key: 'sellShipment', label: 'Sell Shipment' },
  { key: 'buyShipment', label: 'Buy Shipment' },
  { key: 'customerId', label: 'Customer ID(s)' },
  {
    key: 'shipmentStatus',
    label: 'Shipment Status',
    render: (s) => {
      const badge = s.shipmentStatus ? (
        <Badge variant={s.shipmentStatus === 'Done' ? 'green' : 'red'} rightIcon={<Info {...ICON_MD} />}>{s.shipmentStatus}</Badge>
      ) : '—'
      if (!s.tenderStatus) return <span>{badge}</span>
      return (
        <TooltipTrigger tooltipProps={{ groups: [{ subtitle: 'Tender Status', content: s.tenderStatus }] }}>
          <span>{badge}</span>
        </TooltipTrigger>
      )
    },
  },
  {
    key: 'orders',
    label: 'Order #',
    render: (s) => (
      <OrdersTooltip orders={s.orders}>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, overflow: 'hidden', maxWidth: 192 }}>
          {s.orders.map((ord, i) => (
            <Badge key={ord} variant={BADGE_COLORS[i]}>{ord}</Badge>
          ))}
        </div>
      </OrdersTooltip>
    ),
  },
  {
    // A shipment consolidates N orders, each carrying its own customer-provided
    // pickup reference (R2-2 / D3) — so this cell is a LIST, not a scalar.
    // Not default-visible: it is a lookup reference, and presets can carry it
    // (user, 2026-08-02).
    key: 'pickupNumbers',
    label: 'Pickup #',
    render: (s) => (s.pickupNumbers?.length ? s.pickupNumbers.join(', ') : '—'),
  },
  {
    // Mirrors pickupNumbers: a shipment consolidates N orders, each with its
    // own PO number (LINX-12039). Not default-visible (same 2026-08-02 ruling
    // as Pickup #).
    key: 'poNumbers',
    label: 'PO #',
    render: (s) => (s.poNumbers?.length ? s.poNumbers.join(', ') : '—'),
  },
  {
    key: 'orderCount',
    label: 'Order Count',
    render: (s) => (
      <OrdersTooltip orders={s.orders}>
        <span>{s.orderCount}</span>
      </OrdersTooltip>
    ),
  },
  { key: 'pickupDate', label: 'Pickup Date', render: (s) => {
    const formatted = formatDateOnly(s.pickupDate)
    if (!s.pickupDate) return <span>{formatted}</span>
    return (
      <TooltipTrigger tooltipProps={{ badgeVariant: 'time', label: 'Pickup Date', groups: [{ content: s.pickupDate }] }}>
        <span>{formatted}</span>
      </TooltipTrigger>
    )
  }},
  { key: 'deliveryDate', label: 'Delivery Date', render: (s) => {
    const formatted = formatDateOnly(s.deliveryDate)
    if (!s.deliveryDate) return <span>{formatted}</span>
    return (
      <TooltipTrigger tooltipProps={{ badgeVariant: 'time', label: 'Delivery Date', groups: [{ content: s.deliveryDate }] }}>
        <span>{formatted}</span>
      </TooltipTrigger>
    )
  }},
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  {
    key: 'grossWeight',
    label: 'Gross Weight',
    render: (s) => (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {s.grossWeight ? `${Number(s.grossWeight).toLocaleString()} LB` : '--'}
      </span>
    ),
  },
  { key: 'mode', label: 'Mode' },
  { key: 'equipmentCode', label: 'Equipment' },
  { key: 'scac', label: 'SCAC' },
  // LINX-11597 — Direct (1 mapped order) vs Consolidation (>1). Not
  // default-visible; plain text is enough for a 2-value enum.
  { key: 'shipmentType', label: 'Shipment Type' },
  // LINX-12902 — RDD if ANY mapped order is RDD, else SSD. Not default-visible.
  { key: 'planningType', label: 'Planning Type' },
  // 007_multileg_chains.sql — Pooling/Rule 11 (or empty for the vast majority
  // of single-leg shipments). Distinct field from shipmentType above despite
  // the shared CSV label — see ColumnPanel.jsx ALL_COLUMNS comment. Not
  // default-visible; shipmentSequenceLeg/nextShipmentId (already in
  // ALL_COLUMNS) round out the linkage triplet and need no render override.
  { key: 'legType', label: 'Leg Type' },
  {
    key: 'apFreightCost',
    label: 'AP Freight Cost',
    render: (s) => (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {s.apFreightCost ? `$${Number(s.apFreightCost.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
      </span>
    ),
  },
  { key: 'hazardous', label: 'Hazardous', render: (s) => {
    const val = s.hazardous
    if (val === true || val === 'Yes' || val === 'Y') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 600, padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(245, 158, 11, 0.12)', color: 'rgb(180, 110, 5)',
        }}>
          <TriangleAlert size={12} />
          Hazmat
        </span>
      )
    }
    return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
  }},
  {
    key: 'validationMessage',
    label: 'Message',
    render: (s) => s.validationMessage || '',
  },
]

const COLUMN_CONFIG_MAP = Object.fromEntries(COLUMN_CONFIG.map(c => [c.key, c]))

// Cell→tab mapping — extracted to cellTabMap.js, shared with global search
// (match-row click navigates by the same map).

const columnHelper = createColumnHelper()

// Inert until each wires to its feature (carried verbatim from the old menu).
const SHIPMENT_ACTIONS = [
  { label: 'Edit', onSelect: () => {} },
  { label: 'Tender by Preferred Carrier', onSelect: () => {} },
]

const ALL_KEYS = ALL_COLUMNS.map((c) => c.key)
const colLabel = (key) => COLUMN_CONFIG_MAP[key]?.label ?? ALL_COLUMNS.find((c) => c.key === key)?.label ?? key

// Translate the ColumnPanel's ordered `visibleColumns` into TanStack column state:
// which columns show (columnVisibility) and in what order (columnOrder). This is
// the SAME state the future RightPanel will drive — the old panel is just an early
// driver of it. The column SET is stable (see the master `columns` below); only
// visibility + order change.
function deriveColumnState(visibleColumns) {
  const visibleKeys = (visibleColumns && visibleColumns.length)
    ? visibleColumns.filter((k) => ALL_KEYS.includes(k))
    : COLUMN_CONFIG.map((c) => c.key)

  const columnVisibility = {}
  for (const k of ALL_KEYS) columnVisibility[k] = visibleKeys.includes(k)
  const hidden = ALL_KEYS.filter((k) => !visibleKeys.includes(k))
  const columnOrder = [...visibleKeys, ...hidden, 'action']
  return { columnVisibility, columnOrder }
}

export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns, pageNumber = 0, pageSize = 25, totalCount = 0, onPageChange, onPageSizeChange, sorting, onSortingChange, isLoading = false, isFetchingRows = false, isError = false, error, onRetry }) {
  const containerRef = useRef(null)
  const [columnSizing, setColumnSizing] = useState({})

  // Stable master column set — select + every possible data column (ALL_COLUMNS) +
  // the sticky-right action column. The SET never changes; the ColumnPanel only
  // toggles visibility + order (derived below). Built once (depends only on the panel toggle).
  const columns = useMemo(() => {
    const dataCols = ALL_COLUMNS.map((col) => {
      const cfg = COLUMN_CONFIG_MAP[col.key]
      const label = colLabel(col.key)
      const cellClasses = []
      if (col.key === 'sellShipment' || col.key === 'buyShipment') {
        cellClasses.push('odyssey-table__cell--title', 'text-label-sm-medium')
      }
      // Mapped cells open a specific bar tab (CELL_TAB_MAP) — hover tint
      // signals the link (S82).
      if (CELL_TAB_MAP[col.key]) cellClasses.push('odyssey-table__cell--tab-link')
      // DataTable contract: meta.cellClass REPLACES the text-label-sm-regular
      // default entirely — any custom class list must restore the typography
      // (S93 audit: tab-link-only cells were falling back to the 16px body font).
      if (cellClasses.length && !cellClasses.some((c) => c.startsWith('text-'))) {
        cellClasses.unshift('text-label-sm-regular')
      }
      const meta = cellClasses.length ? { cellClass: cellClasses.join(' ') } : {}
      return columnHelper.accessor(col.key, {
        id: col.key,
        header: label,
        cell: cfg?.render
          ? ({ row }) => cfg.render(row.original)
          : ({ getValue }) => getValue() ?? '—',
        meta,
      })
    })

    const actionColumn = columnHelper.display({
      id: 'action',
      enableResizing: false, // pinned system column — never resized or sorted
      enableSorting: false,
      header: () => (
        <Button
          variant="icon"
          size="sm"
          icon={<Columns3Cog size={18} />}
          aria-label="Column arrangement"
          onClick={onToggleColumnPanel}
        />
      ),
      cell: () => (
        <ActionMenu
          icon={<EllipsisVertical {...ICON_MD} />}
          options={SHIPMENT_ACTIONS}
          align="right"
          ariaLabel="Shipment actions"
        />
      ),
      // forwardClick: the ⋮ trigger alone is too small a target — clicking anywhere
      // in the cell forwards to it (DataTable whole-cell click delegation, S81).
      meta: { sticky: 'right', fixedWidth: true, forwardClick: true },
    })

    return [...dataCols, actionColumn]
  }, [onToggleColumnPanel])

  // The ColumnPanel (and, later, the RightPanel) drives WHICH columns show + their
  // ORDER via TanStack column state — the column SET above stays stable.
  const { columnVisibility, columnOrder } = useMemo(
    () => deriveColumnState(visibleColumns),
    [visibleColumns]
  )

  // Selection is CONTROLLED by the parent: rowSelection mirrors selectedId, and
  // the click path (onCellClick → onRowSelect) drives the parent's toggle. We pass
  // a no-op onRowSelectionChange so TanStack treats the state as controlled.
  const rowSelection = useMemo(() => (selectedId ? { [selectedId]: true } : {}), [selectedId])
  const pagination = useMemo(() => ({ pageIndex: pageNumber, pageSize }), [pageNumber, pageSize])

  const handlePaginationChange = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater({ pageIndex: pageNumber, pageSize }) : updater
    if (next.pageSize !== pageSize) onPageSizeChange?.(next.pageSize)
    else if (next.pageIndex !== pageNumber) onPageChange?.(next.pageIndex)
  }, [pageNumber, pageSize, onPageChange, onPageSizeChange])

  const table = useReactTable({
    data: shipments,
    columns,
    state: { rowSelection, pagination, columnSizing, columnVisibility, columnOrder, sorting },
    onRowSelectionChange: () => {},
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: () => {}, // controlled by the ColumnPanel via visibleColumns
    onColumnOrderChange: () => {},      // controlled by the ColumnPanel via visibleColumns
    onPaginationChange: handlePaginationChange,
    onSortingChange,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
  })

  const handleCellClick = useCallback((cell, row) => {
    const mapping = CELL_TAB_MAP[cell.column.id]
    const tab = typeof mapping === 'object' ? mapping?.tab : mapping
    const expandGeneral = typeof mapping === 'object' ? mapping?.expandGeneral : false
    onRowSelect(row.original.id, tab, expandGeneral)
  }, [onRowSelect])

  return (
    <div
      ref={containerRef}
      className="shipment-table"
      // DataTable owns its own chrome/scroll — no fixed-height accommodation. Only
      // reserve clearance so the collapsed BottomBar (detail panel) doesn't cover the
      // Paginator.
      // Expand bottom padding to the partial bar height when a row is selected so
      // the auto-scroll (600ms after open) has room to pull a bottom row into the
      // visible gap above the bar. Without it the page is already at max-scroll and
      // scrollBy() is a no-op. Collapses back to the strip height on deselect (S82).
      style={{ paddingBottom: selectedId ? 'var(--bottombar-partial)' : 'var(--bottombar-collapsed)' }}
    >
      {shipments.length === 0 && !isLoading && !isError ? (
        <div className="flex items-center justify-center" style={{ padding: '48px 0', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          No shipments found
        </div>
      ) : (
        <>
          {/* Gap filler: replaces the toolbar's paddingBottom (--spacing-3) that
              used to paint bg-secondary over this 12px slot. Sticks at the content
              edge so it stays flush above the scrollbar+header when scrolled. */}
          <div style={{
            position: 'sticky',
            top: 'calc(-1 * var(--spacing-8))',
            height: 'var(--spacing-3)',
            background: 'var(--bg-secondary)',
            zIndex: 5,
          }} />
          <DataTable
          table={table}
          // Feature switches: truncationTooltip = Tooltip on >1-word ellipsis.
          // `sortable` OFF (S85 test) — the sorting plumbing (state → gridService
          // sortBy/orderBy) stays wired; re-adding the prop turns the buttons back on.
          truncationTooltip
          // First mount, no data at all yet — whole-table Spinner (no rows).
          loading={isLoading && shipments.length === 0}
          // Stale placeholder pages (TanStack keepPreviousData) render Loading… cells.
          loadingRows={isFetchingRows}
          // Keep the selected row visible between the sticky header and the open
          // detail bar (S82 origin-row rule, componentized S93). freshDelay lets
          // the bar's open animation land before its top is measured.
          scrollSelectedIntoView={{
            bottomBoundary: () => (document.querySelector('[data-bottombar]')?.getBoundingClientRect().top ?? window.innerHeight) - 12,
          }}
          // AppShell's <main> has --spacing-8 (32px) padding-top; sticky insets resolve
          // against the content edge, not the viewport edge (S79b header-gap fix).
          // S82: toolbar no longer sticky — scrolls away. Header sticks at spacing-3
          // (12px) below the content edge; the gap filler above covers that slot.
          stickyTop="calc(-1 * var(--spacing-8) + var(--spacing-3))"
          ariaLabel="Shipments"
          onCellClick={handleCellClick}
          // S116: the grid error is now the SHELL's third body state (Figma
          // `Table Container Error`), not a surface rendered instead of the table.
          // The header + chrome survive the failure, which is what S114 said this
          // should become once a Figma error state existed.
          // User ruling (2026-08-14): Figma draws exactly two SHORT lines — a
          // headline (message) and a brief reason (detail) — never a long/raw
          // server string. getErrorDetail maps the real query error to that
          // brief reason; see src/components/common/errorDetail.js.
          error={isError ? {
            message: "Couldn't load shipments.",
            detail: getErrorDetail(error),
            onRetry: onRetry || undefined,
          } : undefined}
          footer={<Paginator table={table} />}
        />
        </>
      )}
    </div>
  )
}

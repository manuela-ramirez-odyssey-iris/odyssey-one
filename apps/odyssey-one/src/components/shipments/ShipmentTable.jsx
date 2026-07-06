import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical, Columns3Cog, Info, TriangleAlert } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Badge, Button, DataTable, Paginator, ActionMenu } from '@odyssey/ui'
import TooltipTrigger from '../ui/TooltipTrigger'
import { ALL_COLUMNS } from '../detail/ColumnPanel'
import { SEARCH_ATTRIBUTES } from '../../data'

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

// Truncated cell text: shows full value tooltip only when text overflows.
function TruncatedText({ value }) {
  const ref = useRef(null)
  const [overflow, setOverflow] = useState(false)

  // Check overflow on mount and window resize
  const checkOverflow = useCallback(() => {
    const el = ref.current
    if (!el) return
    const isOverflowing = el.scrollWidth > el.clientWidth
    const text = String(value || '')
    const words = text.split(/\s+/)
    setOverflow(isOverflowing && words.length >= 3)
  }, [value])

  useEffect(() => {
    checkOverflow()
    window.addEventListener('resize', checkOverflow, { passive: true })
    return () => window.removeEventListener('resize', checkOverflow)
  }, [checkOverflow])

  const inner = (
    <span ref={ref} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {value ?? '—'}
    </span>
  )

  if (!overflow) return inner

  return (
    <TooltipTrigger
      asSpan
      tooltipProps={{ groups: [{ content: value }] }}
    >
      {inner}
    </TooltipTrigger>
  )
}

// Per-column custom cell renderers, keyed by column key. Each receives the raw
// shipment row. Columns without an entry fall back to <TruncatedText> over the
// accessor value.
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

const columnHelper = createColumnHelper()

// Inert until each wires to its feature (carried verbatim from the old menu).
const SHIPMENT_ACTIONS = [
  { label: 'Edit', onSelect: () => {} },
  { label: 'Tender by Preferred Carrier', onSelect: () => {} },
]

const ALL_KEYS = ALL_COLUMNS.map((c) => c.key)
const colLabel = (key) => COLUMN_CONFIG_MAP[key]?.label ?? ALL_COLUMNS.find((c) => c.key === key)?.label ?? key

// Translate the ColumnPanel's ordered `visibleColumns` (+ the SHP-33 active-search
// promotion) into TanStack column state: which columns show (columnVisibility) and
// in what order (columnOrder). This is the SAME state the future RightPanel will
// drive — the old panel is just an early driver of it. The column SET is stable
// (see the master `columns` below); only visibility + order change.
function deriveColumnState(visibleColumns, activeChipKey) {
  let visibleKeys = (visibleColumns && visibleColumns.length)
    ? visibleColumns.filter((k) => ALL_KEYS.includes(k))
    : COLUMN_CONFIG.map((c) => c.key)

  // SHP-33: promote the active search column to position 2 (after the first column),
  // making it visible if it wasn't.
  let promotedKey = null
  if (activeChipKey) {
    const attr = SEARCH_ATTRIBUTES.find((a) => a.key === activeChipKey)
    if (attr && ALL_KEYS.includes(attr.dataKey)) {
      promotedKey = attr.dataKey
      visibleKeys = visibleKeys.filter((k) => k !== promotedKey)
      visibleKeys.splice(1, 0, promotedKey)
    }
  }

  const columnVisibility = {}
  for (const k of ALL_KEYS) columnVisibility[k] = visibleKeys.includes(k)
  const hidden = ALL_KEYS.filter((k) => !visibleKeys.includes(k))
  const columnOrder = [...visibleKeys, ...hidden, 'action']
  return { columnVisibility, columnOrder, promotedKey }
}

export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns, onScrollStart, activeChipKey, pageNumber = 0, pageSize = 25, totalCount = 0, onPageChange, onPageSizeChange, isLoading = false, isError = false, onRetry }) {
  const containerRef = useRef(null)
  const [columnSizing, setColumnSizing] = useState({})

  // Stable master column set — select + every possible data column (ALL_COLUMNS) +
  // the sticky-right action column. The SET never changes; the ColumnPanel only
  // toggles visibility + order (derived below). Built once (depends only on the panel toggle).
  const columns = useMemo(() => {
    const dataCols = ALL_COLUMNS.map((col) => {
      const cfg = COLUMN_CONFIG_MAP[col.key]
      const label = colLabel(col.key)
      const meta = (col.key === 'sellShipment' || col.key === 'buyShipment')
        ? { cellClass: 'odyssey-table__cell--title text-label-sm-medium' }
        : {}
      return columnHelper.accessor(col.key, {
        id: col.key,
        // Promoted (SHP-33) header reads the live promotedKey from table meta so the
        // column def itself stays stable.
        header: ({ table }) =>
          table.options.meta?.promotedKey === col.key
            ? <span style={{ color: 'var(--deep-sea-neutral-700, #384253)', fontWeight: 700 }}>{label}</span>
            : label,
        cell: cfg?.render
          ? ({ row }) => cfg.render(row.original)
          : ({ getValue }) => <TruncatedText value={getValue()} />,
        meta,
      })
    })

    const actionColumn = columnHelper.display({
      id: 'action',
      enableResizing: false, // pinned system column
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
      meta: { sticky: 'right', fixedWidth: true },
    })

    return [...dataCols, actionColumn]
  }, [onToggleColumnPanel])

  // The ColumnPanel (and, later, the RightPanel) drives WHICH columns show + their
  // ORDER via TanStack column state — the column SET above stays stable.
  const { columnVisibility, columnOrder, promotedKey } = useMemo(
    () => deriveColumnState(visibleColumns, activeChipKey),
    [visibleColumns, activeChipKey]
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
    state: { rowSelection, pagination, columnSizing, columnVisibility, columnOrder },
    onRowSelectionChange: () => {},
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: () => {}, // controlled by the ColumnPanel via visibleColumns
    onColumnOrderChange: () => {},      // controlled by the ColumnPanel via visibleColumns
    onPaginationChange: handlePaginationChange,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    meta: { promotedKey },
  })

  const handleCellClick = useCallback((_cell, row) => {
    onRowSelect(row.original.id)
  }, [onRowSelect])

  // Collapse the metrics strip the first time the page is scrolled (parity with
  // the old internal-list onScrollStart). The shipments page scrolls in <main>.
  useEffect(() => {
    if (!onScrollStart) return
    const main = containerRef.current?.closest('main')
    if (!main) return
    let notified = false
    const onScroll = () => {
      if (main.scrollTop > 0 && !notified) { notified = true; onScrollStart() }
      else if (main.scrollTop === 0) notified = false
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [onScrollStart])

  // Auto-scroll the selected row into view (above the BottomBar) — parity with the
  // old virtual-list scrollToRow, now over real DOM rows.
  useEffect(() => {
    if (!selectedId || !containerRef.current) return
    const t = setTimeout(() => {
      const row = containerRef.current?.querySelector('tr[data-selected]')
      if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 600)
    return () => clearTimeout(t)
  }, [selectedId])

  return (
    <div
      ref={containerRef}
      className="shipment-table"
      // DataTable owns its own chrome/scroll — no fixed-height accommodation. Only
      // reserve clearance so the collapsed BottomBar (detail panel) doesn't cover the
      // Paginator.
      style={{ paddingBottom: 'var(--bottombar-collapsed)' }}
    >
      {isError ? (
        <div className="flex flex-col items-center justify-center gap-2" style={{ padding: '48px 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          <TriangleAlert size={24} style={{ color: 'var(--text-placeholder)' }} />
          <div>Couldn't load shipments.</div>
          {onRetry && (
            <button type="button" onClick={onRetry}
              className="cursor-pointer"
              style={{ marginTop: 4, padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
              Retry
            </button>
          )}
        </div>
      ) : isLoading && shipments.length === 0 ? (
        <div className="flex items-center justify-center" style={{ padding: '48px 0', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          Loading shipments…
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex items-center justify-center" style={{ padding: '48px 0', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          No shipments found
        </div>
      ) : (
        <DataTable
          table={table}
          // AppShell's <main> has --spacing-8 (32px) padding-top; sticky insets resolve
          // against the content edge, not the viewport edge (S79b header-gap fix).
          // S79c decision 11: TableControls is now a sticky toolbar that occupies 48px
          // (36px controls row + 12px paddingBottom / --spacing-3). The header must sit
          // below the toolbar, so we add those 48px back: -32px + 48px = +16px.
          stickyTop="calc(-1 * var(--spacing-8) + 48px)"
          ariaLabel="Shipments"
          onCellClick={handleCellClick}
          footer={<Paginator table={table} pageSizeOptions={[25, 50, 100]} />}
        />
      )}
    </div>
  )
}

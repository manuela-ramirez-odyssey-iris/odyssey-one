import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ClipboardList,
  Container,
  Download,
  Handshake,
  Plus,
  Route,
  TriangleAlert,
  Truck,
  UserCog,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ICON_LG } from '@odyssey/tokens'
import {
  AddSectionButton,
  AddSectionDivider,
  Button,
  CustomerRow,
  EmptyState,
  EntityChip,
  ModalLarge,
  ModalMedium,
  PageHeader,
  SearchField,
  SectionHeader,
  SectionLabel,
  Widget,
  WidgetVariantPicker,
  WidgetsLeftMenu,
} from '@odyssey/ui'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import AppShell from '../components/layout/AppShell'
import { useEditMode } from '../contexts/EditModeContext.jsx'
import './Home.css'

const domainIcon = <TriangleAlert {...ICON_LG} />

const handleRow = (label) => () => console.log('drill into', label)

const exceptionRows = [
  { label: 'Date issues', value: '23', onClick: handleRow('date-issues') },
  { label: 'Missing documents', value: '17', onClick: handleRow('missing-docs') },
  { label: 'Stops at risk', value: '12', onClick: handleRow('stops-at-risk') },
  { label: 'Tender rejections', value: '8', onClick: handleRow('tender-rej') },
]

const chartRows = [
  { label: 'Carrier delay', value: '42%', indicatorColor: 'var(--chart-1)', onClick: handleRow('carrier-delay') },
  { label: 'Customer hold', value: '28%', indicatorColor: 'var(--chart-2)', onClick: handleRow('customer-hold') },
  { label: 'Document missing', value: '18%', indicatorColor: 'var(--chart-3)', onClick: handleRow('doc-missing') },
  { label: 'Other', value: '12%', indicatorColor: 'var(--chart-4)', onClick: handleRow('other') },
]

const chartSegments = [
  { value: 42, color: 'var(--chart-1)' },
  { value: 28, color: 'var(--chart-2)' },
  { value: 18, color: 'var(--chart-3)' },
  { value: 12, color: 'var(--chart-4)' },
]

const singleChartSegment = [{ value: 42, color: 'var(--chart-1)' }]

function previewWidgetProps(variant, itemLabel) {
  const base = {
    title: itemLabel,
    domainIcon,
    goToLabel: `Go to ${itemLabel}`,
    onGoToClick: () => {},
  }
  if (variant === '1x') {
    return { ...base, value: '12', label: 'Across all customers' }
  }
  if (variant === '2x') {
    return {
      ...base,
      value: '12',
      label: 'Need action today',
      percentage: '42%',
      chartSegments: singleChartSegment,
      chartTotal: 100,
    }
  }
  if (variant === '3x') {
    return { ...base, rows: exceptionRows }
  }
  if (variant === '3xChart') {
    return {
      ...base,
      value: '156',
      label: 'Total this week',
      chartSegments,
      rows: chartRows,
    }
  }
  return base
}

const widgetGoToPaths = {
  'order-exceptions': '/orders',
  'carriers-active': '/tracking',
  'um-locked': '/users',
  'um-pending': '/users',
  'shipments-exceptions': '/shipments',
  'tracking-total': '/tracking',
}

const ctaRowsStub = [
  { icon: <Plus size={20} />, label: 'Go to Create a New Order', onClick: () => {} },
  { icon: <Route size={20} />, label: 'Track a Shipment', onClick: () => {} },
  { icon: <UserCog size={20} />, label: 'Management Users', onClick: () => {} },
  { icon: <Download size={20} />, label: 'Invoices', onClick: () => {} },
]

const orderIcon = <ClipboardList {...ICON_LG} />
const carriersIcon = <Truck {...ICON_LG} />
const userMgmtIcon = <UserCog {...ICON_LG} />
const shipmentsIcon = <Container {...ICON_LG} />
const trackingIcon = <Route {...ICON_LG} />

const shipmentsExceptionsRows = [
  { label: 'Date Issues', value: '99 (26.33%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('date-issues') },
  { label: 'Routing Review', value: '72 (19.15%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('routing-review') },
  { label: 'Tender Issues', value: '161 (42.82%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('tender-issues') },
  { label: 'Bid Review', value: '44 (11.70%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('bid-review') },
]

const shipmentsExceptionsSegments = [
  { value: 99, color: 'var(--chart-1)' },
  { value: 72, color: 'var(--chart-2)' },
  { value: 161, color: 'var(--chart-3)' },
  { value: 44, color: 'var(--chart-4)' },
]

const trackingRows = [
  { label: 'At Risk Pickup', value: '0 (0%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('at-risk-pickup') },
  { label: 'At Risk Delivery', value: '34 (0.05%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('at-risk-delivery') },
  { label: 'Picked Up - On Time', value: '32 (0.05%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('picked-on-time') },
  { label: 'Picked Up - Late', value: '15 (0.02%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('picked-late') },
]

const trackingSegments = [
  { value: 1, color: 'var(--chart-1)' },
  { value: 34, color: 'var(--chart-2)' },
  { value: 32, color: 'var(--chart-3)' },
  { value: 15, color: 'var(--chart-4)' },
]

const initialWidgets = [
  {
    id: 'order-exceptions',
    variant: '2x',
    props: {
      title: 'Order',
      domainIcon: orderIcon,
      value: '99',
      label: 'Order Exceptions',
      percentage: '25%',
      chartSegments: [{ value: 25, color: 'var(--chart-1)' }],
      chartTotal: 100,
      goToLabel: 'Go to Order',
      onGoToClick: handleRow('order-exceptions'),
    },
  },
  {
    id: 'carriers-active',
    variant: '2x',
    props: {
      title: 'Carriers',
      domainIcon: carriersIcon,
      value: '5269',
      label: 'Active',
      percentage: '89%',
      chartSegments: [{ value: 89, color: 'var(--chart-1)' }],
      chartTotal: 100,
      goToLabel: 'Go to Tracking',
      onGoToClick: handleRow('carriers-active'),
    },
  },
  {
    id: 'um-locked',
    variant: '1x',
    props: {
      title: 'User Management',
      domainIcon: userMgmtIcon,
      value: '8',
      label: 'Locked',
      onGoToClick: handleRow('um-locked'),
    },
  },
  {
    id: 'um-pending',
    variant: '1x',
    props: {
      title: 'User Management',
      domainIcon: userMgmtIcon,
      value: '10',
      label: 'Pending',
      onGoToClick: handleRow('um-pending'),
    },
  },
  {
    id: 'shipments-exceptions',
    variant: '3xChart',
    props: {
      title: 'Shipments - Exceptions',
      domainIcon: shipmentsIcon,
      value: '376',
      label: 'Total Shipments Exceptions',
      chartSegments: shipmentsExceptionsSegments,
      rows: shipmentsExceptionsRows,
      goToLabel: 'Go to Shipments Exceptions',
      onGoToClick: handleRow('shipments-exceptions'),
    },
  },
  {
    id: 'tracking-total',
    variant: '3xChart',
    props: {
      title: 'Tracking',
      domainIcon: trackingIcon,
      value: '57897',
      label: 'Total Trackings',
      chartSegments: trackingSegments,
      rows: trackingRows,
      goToLabel: 'Go to Tracking',
      onGoToClick: handleRow('tracking-total'),
    },
  },
  {
    id: 'home-quick-actions',
    variant: '3xCta',
    props: {
      title: 'What would you like to do?',
      ctaRows: ctaRowsStub,
    },
  },
]

// Default sections seed — groups initial widgets by domain. The user can
// rename, delete, and re-order via edit mode; this is just the on-mount state.
// `widgetIds` is converted to `placements` lazily on Home mount via auto-pack
// (see the useState init), so the file-level constant stays declarative.
const initialSections = [
  { id: 'sec-orders', name: 'Orders', widgetIds: ['order-exceptions'] },
  { id: 'sec-carriers', name: 'Carriers', widgetIds: ['carriers-active'] },
  { id: 'sec-um', name: 'User Management', widgetIds: ['um-locked', 'um-pending'] },
  { id: 'sec-shipments', name: 'Shipments', widgetIds: ['shipments-exceptions'] },
  { id: 'sec-tracking', name: 'Tracking', widgetIds: ['tracking-total'] },
  { id: 'sec-quick-actions', name: 'Quick Actions', widgetIds: ['home-quick-actions'] },
]

const initialCatalog = [
  {
    id: 'misc',
    title: 'Misc',
    items: [{ id: 'misc-quick-actions', label: 'What would you like to do?', cta: true }],
  },
  {
    id: 'orders',
    title: 'Orders',
    items: [
      { id: 'orders-total', label: 'Total Orders' },
      { id: 'orders-exceptions', label: 'Order Exceptions' },
      { id: 'orders-canceled', label: 'Canceled' },
      { id: 'orders-data-validation', label: 'Data Validation' },
      { id: 'orders-interface-failures', label: 'Interface Failures' },
    ],
  },
  {
    id: 'shipments',
    title: 'Shipments',
    items: [
      { id: 'shipments-total', label: 'Total Shipments' },
      { id: 'shipments-date-issues', label: 'Date Issues' },
      { id: 'shipments-routing-review', label: 'Routing Review' },
      { id: 'shipments-tender-issues', label: 'Tender Issues' },
      { id: 'shipments-pgi-pgr', label: 'PGI/PGR' },
      { id: 'shipments-bid-review', label: 'Bid Review' },
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking',
    items: [
      { id: 'tracking-total', label: 'Total Trackings' },
      { id: 'tracking-enroute', label: 'EnRoute' },
      { id: 'tracking-at-risk-pickup', label: 'At Risk Pickup' },
      { id: 'tracking-at-risk-delivery', label: 'At Risk Delivery' },
      { id: 'tracking-picked-up-on-time', label: 'Picked Up - On Time' },
      { id: 'tracking-delivered-on-time', label: 'Delivered - On-Time' },
      { id: 'tracking-delivered-late', label: 'Delivered - Late' },
    ],
  },
  {
    id: 'carriers',
    title: 'Carriers',
    items: [
      { id: 'carriers-total', label: 'Total Carriers' },
      { id: 'carriers-not-started', label: 'Not Started' },
      { id: 'carriers-delivered', label: 'Delivered' },
    ],
  },
  {
    id: 'user-management',
    title: 'User Management',
    items: [
      { id: 'users-total', label: 'Total Users' },
      { id: 'users-active', label: 'Active' },
      { id: 'users-locked', label: 'Locked' },
      { id: 'users-suspended', label: 'Suspended' },
      { id: 'users-inactive', label: 'Inactive' },
      { id: 'users-deleted', label: 'Deleted' },
      { id: 'users-new-account-review', label: 'New Account Review' },
      { id: 'users-rejected-request', label: 'Rejected Request' },
    ],
  },
]

// Column-span per variant. 1x = 1 col, everything else = 2 cols.
const VARIANT_COLS = { '1x': 1, '2x': 2, '3x': 2, '3xChart': 2, '3xCta': 2 }
// Row-span per variant.
const VARIANT_ROWS = { '1x': 1, '2x': 1, '3x': 2, '3xChart': 2, '3xCta': 2 }
const GRID_COLS = 6
const KEY = (r, c) => `${r}:${c}`

// Build a (row,col) → widgetId map from a section's placements, accounting for
// widgets that span multiple cells.
function buildOccupied(placements, widgetsById) {
  const occupied = new Map()
  for (const p of placements) {
    const w = widgetsById[p.id]
    if (!w) continue
    const cw = VARIANT_COLS[w.variant] || 1
    const rh = VARIANT_ROWS[w.variant] || 1
    for (let dr = 0; dr < rh; dr++) {
      for (let dc = 0; dc < cw; dc++) {
        occupied.set(KEY(p.row + dr, p.col + dc), p.id)
      }
    }
  }
  return occupied
}

// Maximum row index used by any widget (0-based, inclusive). Empty sections
// still render 1 row of placeholders so users have somewhere to drop into.
function computeGridRows(placements, widgetsById) {
  if (placements.length === 0) return 1
  let max = 0
  for (const p of placements) {
    const w = widgetsById[p.id]
    if (!w) continue
    const rh = VARIANT_ROWS[w.variant] || 1
    if (p.row + rh > max) max = p.row + rh
  }
  return Math.max(max, 1)
}

// List of (row, col) positions inside the section's grid that aren't occupied
// by any widget. Each one renders as a droppable placeholder cell.
function computeEmptyCells(placements, widgetsById) {
  const rows = computeGridRows(placements, widgetsById)
  const occupied = buildOccupied(placements, widgetsById)
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!occupied.has(KEY(r, c))) cells.push({ row: r, col: c })
    }
  }
  return cells
}

// First (row, col) that fits a widget of the given variant. Walks left→right,
// top→bottom and extends the grid downward indefinitely (sections grow as
// widgets are added). Used when seeding initial placements + when inserting
// new widgets via the configurator.
function findFirstFreePosition(placements, widgetsById, variant) {
  const cw = VARIANT_COLS[variant] || 1
  const rh = VARIANT_ROWS[variant] || 1
  const occupied = buildOccupied(placements, widgetsById)
  for (let r = 0; r < 100; r++) {
    for (let c = 0; c <= GRID_COLS - cw; c++) {
      let fits = true
      for (let dr = 0; dr < rh && fits; dr++) {
        for (let dc = 0; dc < cw && fits; dc++) {
          if (occupied.has(KEY(r + dr, c + dc))) fits = false
        }
      }
      if (fits) return { row: r, col: c }
    }
  }
  return { row: 0, col: 0 } // shouldn't reach — fallback
}

// Seed a placements array from an ordered list of widget ids using auto-pack.
// Used once at mount to convert the legacy widgetIds-style initialSections.
function autoPackFromWidgetIds(widgetIds, widgetsById) {
  const placements = []
  for (const id of widgetIds) {
    const w = widgetsById[id]
    if (!w) continue
    const pos = findFirstFreePosition(placements, widgetsById, w.variant)
    placements.push({ id, row: pos.row, col: pos.col })
  }
  return placements
}

// Inline style for a cell at the given placement, spanning its variant's
// col/row count. Grid lines are 1-indexed.
function gridStyleFor(row, col, colSpan = 1, rowSpan = 1) {
  return {
    gridColumn: `${col + 1} / span ${colSpan}`,
    gridRow: `${row + 1} / span ${rowSpan}`,
  }
}

// Place a widget so it COVERS the target (row, col) with minimal slide from
// its current position. The widget keeps its full size; only the anchor moves.
//
// Two constraints:
//   1. The widget must cover the target cell — i.e. target ∈ [anchor, anchor+span)
//      So the anchor's valid range is [target - span + 1, target].
//   2. The widget must stay inside the grid (cols 0..GRID_COLS-cw, rows ≥ 0).
//
// Within the intersection of those two ranges, we pick the position CLOSEST
// to the widget's current anchor — so a 2x widget at cols 0-1 dropped on
// placeholder col 2 lands at cols 1-2 (slide of +1, covers col 2), not at
// cols 2-3 (which would skip col 1). For drops further away, the slide grows
// until the widget reaches the edge.
//
// `currentRow` / `currentCol` are the widget's pre-drop position (in any
// section). If undefined (rare), default to the leftmost / topmost valid
// anchor.
function clampPlacement(targetRow, targetCol, variant, currentCol, currentRow) {
  const cw = VARIANT_COLS[variant] || 1
  const rh = VARIANT_ROWS[variant] || 1
  // Column anchor must satisfy: anchor ≤ targetCol < anchor + cw,
  // i.e. anchor ∈ [targetCol - cw + 1, targetCol], clamped to [0, GRID_COLS - cw].
  const colMin = Math.max(0, targetCol - cw + 1)
  const colMax = Math.min(GRID_COLS - cw, targetCol)
  const colAnchor = colMin > colMax ? colMin : colMax // safety; should never invert
  const col = currentCol !== undefined
    ? Math.max(colMin, Math.min(currentCol, colMax))
    : colAnchor
  // Row anchor: same logic, but no upper grid bound (sections grow downward).
  const rowMin = Math.max(0, targetRow - rh + 1)
  const rowMax = Math.max(rowMin, targetRow)
  const row = currentRow !== undefined
    ? Math.max(rowMin, Math.min(currentRow, rowMax))
    : rowMin
  return { row, col }
}

// Droppable placeholder cell — empty grid slot inside a section that accepts a
// dragged widget. The placeholder owns an explicit (row, col); dropping a
// widget on it sets the widget's placement to that exact cell.
function PlaceholderCell({ sectionId, row, col }) {
  const { setNodeRef, isOver } = useDroppable({ id: `placeholder:${sectionId}:${row}:${col}` })
  const classes = [
    'home-widget-cell',
    'home-widget-cell--1x',
    'home-widget-cell--ghost',
    isOver && 'home-widget-cell--ghost-over',
  ].filter(Boolean).join(' ')
  return (
    <div
      ref={setNodeRef}
      className={classes}
      style={gridStyleFor(row, col)}
      aria-hidden="true"
    />
  )
}

// Decorative-only placeholder cell — same look as PlaceholderCell but with no
// useDroppable wiring. Used inside the AddSection preview row (the new section
// hasn't been created yet, so there's no section id to drop into).
function GhostCell() {
  return (
    <div
      className="home-widget-cell home-widget-cell--1x home-widget-cell--ghost"
      aria-hidden="true"
    />
  )
}

function SortableWidget({ widget, placement, sectionId, isEditMode, onRemove, justInserted = false }) {
  const cellRef = useRef(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section:${sectionId}:${widget.id}`,
    disabled: !isEditMode,
    animateLayoutChanges: () => false,
  })

  useEffect(() => {
    if (justInserted && cellRef.current) {
      cellRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [justInserted])

  const mergedRef = (node) => {
    setNodeRef(node)
    cellRef.current = node
  }
  const cw = VARIANT_COLS[widget.variant] || 1
  const rh = VARIANT_ROWS[widget.variant] || 1
  // While dragging, the actual cell becomes a "ghost" (low opacity) so the
  // grid layout stays stable. The visible representation of the dragged
  // widget lives in the parent <DragOverlay> below. No `transform` here —
  // the overlay handles the visual translation, the cell stays put.
  const style = {
    ...gridStyleFor(placement.row, placement.col, cw, rh),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }
  const dragProps = isEditMode ? { ...attributes, ...listeners } : {}
  return (
    <div
      ref={mergedRef}
      style={style}
      className={`home-widget-cell home-widget-cell--${widget.variant}`}
      data-just-inserted={justInserted || undefined}
      {...dragProps}
    >
      <Widget
        variant={widget.variant}
        editMode={isEditMode}
        onRemove={() => onRemove(widget.id)}
        {...widget.props}
      />
    </div>
  )
}

function SortablePanelItem({ item, group, defaultNode, disabled = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `panel:${group.id}:${item.id}`,
    disabled,
  })
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    background: isDragging ? 'var(--deep-sea-neutral-200)' : undefined,
  }
  const dragProps = disabled ? {} : { ...attributes, ...listeners }
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? 'true' : undefined}
      {...dragProps}
    >
      {defaultNode}
    </div>
  )
}

// Inline rename input — replaces the SectionLabel while editing. The pencil
// + trash actions are replaced by a "Done" Button (link variant, sm) that
// commits the rename.
function SectionRenameInput({ initialValue, onSave, onCancel }) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])
  const commit = () => {
    const trimmed = value.trim()
    if (trimmed) onSave(trimmed)
    else onCancel()
  }
  return (
    <div className="section-label section-label--edit home-section-rename">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
        className="home-section-rename__input text-label-sm-medium"
        aria-label="Section name"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={commit}
        className="home-section-rename__done"
      >
        Done
      </Button>
    </div>
  )
}

export default function Home() {
  const { isEditMode, enterEditMode } = useEditMode()
  const navigate = useNavigate()

  const ctaRows = useMemo(
    () => [
      { icon: <Plus size={20} />, label: 'Go to Create a New Order', onClick: () => navigate('/orders') },
      { icon: <Route size={20} />, label: 'Track a Shipment', onClick: () => navigate('/tracking') },
      { icon: <UserCog size={20} />, label: 'Management Users', onClick: () => navigate('/users') },
      { icon: <Download size={20} />, label: 'Invoices', onClick: () => {} },
    ],
    [navigate],
  )

  const [widgets, setWidgets] = useState(() =>
    initialWidgets.map((w) => {
      if (w.id === 'home-quick-actions') {
        return { ...w, props: { ...w.props, ctaRows } }
      }
      const target = widgetGoToPaths[w.id]
      if (target) {
        return { ...w, props: { ...w.props, onGoToClick: () => navigate(target) } }
      }
      return w
    }),
  )
  // Sections seeded from initialSections — widgetIds auto-packed into
  // explicit (row, col) placements so the grid layout is position-aware
  // from the start (vs. CSS auto-flow packing).
  const [sections, setSections] = useState(() => {
    const widgetsById = {}
    for (const w of initialWidgets) widgetsById[w.id] = w
    return initialSections.map((s) => ({
      id: s.id,
      name: s.name,
      placements: autoPackFromWidgetIds(s.widgetIds, widgetsById),
    }))
  })
  const [renamingSectionId, setRenamingSectionId] = useState(null)
  const [deletingSectionId, setDeletingSectionId] = useState(null)
  const [catalog, setCatalog] = useState(initialCatalog)
  const [searchValue, setSearchValue] = useState('')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(new Set())
  const [gridKey, setGridKey] = useState(0)
  const [customers, setCustomers] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: `c${i + 1}`,
      label: `Customer ${i + 1}`,
      favorite: i < 3,
    })),
  )
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [customersModalOpen, setCustomersModalOpen] = useState(false)
  const [customersFilter, setCustomersFilter] = useState('')
  const [customersResultsOpen, setCustomersResultsOpen] = useState(false)
  const customersSearchRef = useRef(null)

  useEffect(() => {
    if (!customersResultsOpen) return
    function onMouseDown(e) {
      if (customersSearchRef.current && !customersSearchRef.current.contains(e.target)) {
        setCustomersResultsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [customersResultsOpen])

  // Configurator modal — also tracks which section the new widget should land in.
  const [configurator, setConfigurator] = useState(null)
  const [lastInsertedId, setLastInsertedId] = useState(null)
  const [scrollToSectionId, setScrollToSectionId] = useState(null)
  // Active drag — widget id of the currently-dragged widget (for DragOverlay).
  const [activeDragWidgetId, setActiveDragWidgetId] = useState(null)
  // Per-section refs for scroll-into-view on add/rename.
  const sectionRefs = useRef({})
  const registerSectionRef = useCallback((id, node) => {
    if (node) sectionRefs.current[id] = node
    else delete sectionRefs.current[id]
  }, [])

  useEffect(() => {
    if (!lastInsertedId) return
    const t = setTimeout(() => setLastInsertedId(null), 900)
    return () => clearTimeout(t)
  }, [lastInsertedId])

  useEffect(() => {
    if (!scrollToSectionId) return
    const node = sectionRefs.current[scrollToSectionId]
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setScrollToSectionId(null)
  }, [scrollToSectionId])

  const hasCtaWidget = useMemo(
    () => widgets.some((w) => w.variant === '3xCta'),
    [widgets],
  )
  const isItemDisabled = useCallback(
    (item) => Boolean(item?.cta && hasCtaWidget),
    [hasCtaWidget],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Cursor-driven collision detection — the drop target is the cell the
  // CURSOR is inside, not the cell closest to the dragged widget's center.
  // This matters for multi-col widgets: closestCenter measures the active
  // rect's center, which for a 2x widget grabbed near its left edge sits
  // ~one cell to the right of the cursor — causing right-drags to land one
  // cell beyond the visually highlighted target. pointerWithin solves this
  // by tracking the pointer directly. Falls back to closestCorners when the
  // pointer is in the grid gap (no droppable directly under it).
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return closestCorners(args)
  }, [])

  const widgetsById = useMemo(() => {
    const m = {}
    for (const w of widgets) m[w.id] = w
    return m
  }, [widgets])

  // Zero-out widget data when no customers are selected (CTA widgets pass through).
  const hasCustomers = selectedIds.size > 0
  const widgetsById_render = useMemo(() => {
    if (hasCustomers) return widgetsById
    const out = {}
    for (const w of widgets) {
      if (w.variant === '3xCta') { out[w.id] = w; continue }
      const p = { ...w.props }
      if ('value' in p) p.value = '0'
      if ('percentage' in p) p.percentage = '0%'
      if (Array.isArray(p.chartSegments)) p.chartSegments = []
      if (Array.isArray(p.rows)) p.rows = p.rows.map((r) => ({ ...r, value: '0' }))
      out[w.id] = { ...w, props: p }
    }
    return out
  }, [widgets, widgetsById, hasCustomers])

  // Flat list of sortable IDs for the cross-section widget DndContext.
  const widgetSortIds = useMemo(
    () => sections.flatMap((s) => s.placements.map((p) => `section:${s.id}:${p.id}`)),
    [sections],
  )

  const panelItemIds = useMemo(
    () => catalog.flatMap((g) => g.items.map((it) => `panel:${g.id}:${it.id}`)),
    [catalog],
  )

  const handleAddWidgets = () => {
    const widgetsSnapshot = widgets
    const sectionsSnapshot = sections
    const catalogSnapshot = catalog
    enterEditMode({
      onSave: () => {
        setGridKey((k) => k + 1)
      },
      onCancel: () => {
        setWidgets(widgetsSnapshot)
        setSections(sectionsSnapshot)
        setCatalog(catalogSnapshot)
      },
    })
  }

  const handleRemoveWidget = useCallback((id) => {
    setWidgets((current) => current.filter((w) => w.id !== id))
    setSections((current) =>
      current.map((s) => ({ ...s, placements: s.placements.filter((p) => p.id !== id) })),
    )
  }, [])

  // --- Section CRUD --------------------------------------------------------

  const generateSectionId = () => `sec-${Date.now()}`

  const handleAddSectionAtEnd = useCallback(() => {
    const id = generateSectionId()
    setSections((current) => [...current, { id, name: 'New section', placements: [] }])
    setRenamingSectionId(id)
    setScrollToSectionId(id)
  }, [])

  const handleStartRename = useCallback((sectionId) => {
    setRenamingSectionId(sectionId)
  }, [])
  const handleSaveRename = useCallback((sectionId, newName) => {
    setSections((current) => current.map((s) => (s.id === sectionId ? { ...s, name: newName } : s)))
    setRenamingSectionId(null)
  }, [])
  const handleCancelRename = useCallback(() => {
    setRenamingSectionId(null)
  }, [])

  const handleDeleteSectionRequest = useCallback((sectionId) => {
    setDeletingSectionId(sectionId)
  }, [])
  const handleConfirmDeleteSection = useCallback(() => {
    if (!deletingSectionId) return
    setSections((current) => {
      const target = current.find((s) => s.id === deletingSectionId)
      if (!target) return current
      // Cascade-delete every widget that belonged to the section.
      const idsToRemove = new Set(target.placements.map((p) => p.id))
      setWidgets((ws) => ws.filter((w) => !idsToRemove.has(w.id)))
      return current.filter((s) => s.id !== deletingSectionId)
    })
    setDeletingSectionId(null)
  }, [deletingSectionId])

  // --- Customers (unchanged) ----------------------------------------------

  const handleOpenCustomersModal = useCallback(() => {
    setCustomersFilter('')
    setCustomersModalOpen(true)
  }, [])
  const handleCloseCustomersModal = useCallback(() => {
    setCustomersModalOpen(false)
  }, [])
  const handleToggleCustomerFavorite = useCallback((id) => {
    setCustomers((cs) => cs.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)))
  }, [])
  const handleToggleCustomerSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const handleDeleteCustomer = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])
  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.has(c.id)),
    [customers, selectedIds],
  )
  const searchMatches = useMemo(() => {
    const q = customersFilter.trim().toLowerCase()
    const available = customers.filter((c) => !selectedIds.has(c.id))
    if (!q) return available
    return available.filter((c) => c.label.toLowerCase().includes(q))
  }, [customers, customersFilter, selectedIds])

  // --- Panel + item picker -------------------------------------------------

  const handleToggleGroup = useCallback((groupId) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const handleItemClick = useCallback((itemId, groupId) => {
    const group = catalog.find((g) => g.id === groupId)
    const item = group?.items.find((it) => it.id === itemId)
    if (!item) return
    // Default destination: last section. If no sections exist, the configurator
    // disables the Insert button.
    const lastSectionId = sections.length > 0 ? sections[sections.length - 1].id : null
    if (item.cta) {
      if (hasCtaWidget) {
        const existing = widgets.find((w) => w.variant === '3xCta')
        if (existing) setLastInsertedId(existing.id)
        return
      }
      // CTA bypasses the variant picker (only one variant) and starts
      // directly at step 2 — the section selector.
      setConfigurator({
        itemId: item.id,
        itemLabel: item.label,
        groupTitle: group.title,
        variant: '3xCta',
        cta: true,
        sectionId: lastSectionId,
        step: 2,
      })
      return
    }
    // Non-CTA: step 1 = variant picker, step 2 = section selector.
    setConfigurator({
      itemId: item.id,
      itemLabel: item.label,
      groupTitle: group.title,
      variant: '1x',
      cta: false,
      sectionId: lastSectionId,
      step: 1,
    })
  }, [catalog, hasCtaWidget, widgets, sections])

  const handleInsertWidget = useCallback(() => {
    if (!configurator) return
    const { itemId, itemLabel, variant, cta, sectionId } = configurator
    if (!sectionId) return
    const placeholderProps = cta
      ? { title: itemLabel, ctaRows }
      : variant === '3xChart'
        ? { title: itemLabel, domainIcon, value: '0', label: 'No data yet', rows: chartRows, chartSegments }
        : variant === '3x'
          ? { title: itemLabel, domainIcon, rows: exceptionRows, goToLabel: `Go to ${itemLabel}`, onGoToClick: () => {} }
          : variant === '2x'
            ? { title: itemLabel, domainIcon, value: '0', label: 'No data yet', percentage: '0%', chartSegments: singleChartSegment, chartTotal: 100, goToLabel: `Go to ${itemLabel}`, onGoToClick: () => {} }
            : { title: itemLabel, domainIcon, value: '0', label: 'No data yet', onGoToClick: () => {} }
    const newWidget = {
      id: `${itemId}-${Date.now()}`,
      variant,
      props: placeholderProps,
    }
    setWidgets((current) => [...current, newWidget])
    // Auto-pack the new widget into the first free position of the target section.
    setSections((current) =>
      current.map((s) => {
        if (s.id !== sectionId) return s
        const widgetsById = {}
        // Build local lookup including the new widget so findFirstFreePosition
        // can read its variant.
        for (const w of widgets) widgetsById[w.id] = w
        widgetsById[newWidget.id] = newWidget
        const pos = findFirstFreePosition(s.placements, widgetsById, newWidget.variant)
        return {
          ...s,
          placements: [...s.placements, { id: newWidget.id, row: pos.row, col: pos.col }],
        }
      }),
    )
    setLastInsertedId(newWidget.id)
    setConfigurator(null)
  }, [configurator, ctaRows, widgets])

  // --- Drag start / end ----------------------------------------------------

  const handleDragStart = (event) => {
    const id = String(event.active.id)
    if (id.startsWith('section:')) {
      const [, , widgetId] = id.split(':')
      setActiveDragWidgetId(widgetId)
    }
  }

  const handleDragCancel = () => setActiveDragWidgetId(null)

  const handleDragEnd = (event) => {
    setActiveDragWidgetId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Widget drag → widget drag (swap positions).
    // IDs: `section:<sectionId>:<widgetId>`.
    if (activeId.startsWith('section:') && overId.startsWith('section:')) {
      const [, aSec, aWid] = activeId.split(':')
      const [, oSec, oWid] = overId.split(':')
      setSections((current) => {
        if (aSec === oSec) {
          // Reorder within the same section — swap the two widgets' (row, col).
          return current.map((s) => {
            if (s.id !== aSec) return s
            const ai = s.placements.findIndex((p) => p.id === aWid)
            const oi = s.placements.findIndex((p) => p.id === oWid)
            if (ai === -1 || oi === -1) return s
            const next = s.placements.map((p) => p)
            const a = next[ai], o = next[oi]
            next[ai] = { ...a, row: o.row, col: o.col }
            next[oi] = { ...o, row: a.row, col: a.col }
            return { ...s, placements: next }
          })
        }
        // Cross-section drop on a widget — take the target widget's position
        // and push the target to the next free cell.
        return current.map((s) => {
          if (s.id === aSec) {
            return { ...s, placements: s.placements.filter((p) => p.id !== aWid) }
          }
          if (s.id === oSec) {
            const tIdx = s.placements.findIndex((p) => p.id === oWid)
            if (tIdx === -1) return s
            const targetPos = { row: s.placements[tIdx].row, col: s.placements[tIdx].col }
            // Build widgetsById lookup (closure access to widgets state).
            const wbi = {}
            for (const w of widgets) wbi[w.id] = w
            // Remove the active id from anywhere in placements (defensive).
            const remaining = s.placements.filter((p) => p.id !== aWid)
            // Find where the displaced target should go (next free cell after the move).
            const tempWithoutTarget = remaining.filter((p) => p.id !== oWid)
            const newTargetPos = findFirstFreePosition(
              [...tempWithoutTarget, { id: aWid, row: targetPos.row, col: targetPos.col }],
              wbi,
              wbi[oWid]?.variant || '1x',
            )
            const nextPlacements = [
              ...tempWithoutTarget,
              { id: aWid, row: targetPos.row, col: targetPos.col },
              { id: oWid, row: newTargetPos.row, col: newTargetPos.col },
            ]
            return { ...s, placements: nextPlacements }
          }
          return s
        })
      })
      return
    }

    // Widget dropped onto a placeholder cell — IDs are `placeholder:<sectionId>:<row>:<col>`.
    if (activeId.startsWith('section:') && overId.startsWith('placeholder:')) {
      const [, aSec, aWid] = activeId.split(':')
      const [, targetSec, rowStr, colStr] = overId.split(':')
      const draggedWidget = widgets.find((w) => w.id === aWid)
      if (!draggedWidget) return
      // Find the widget's current placement so we can compute a minimal slide
      // toward the target cell (see clampPlacement docs).
      const sourceSection = sections.find((s) => s.id === aSec)
      const sourcePlacement = sourceSection?.placements.find((p) => p.id === aWid)
      const { row: targetRow, col: targetCol } = clampPlacement(
        Number(rowStr),
        Number(colStr),
        draggedWidget.variant,
        sourcePlacement?.col,
        sourcePlacement?.row,
      )
      setSections((current) => {
        // Same-section: just move the widget to the (clamped) drop position.
        if (aSec === targetSec) {
          return current.map((s) => {
            if (s.id !== aSec) return s
            return {
              ...s,
              placements: s.placements.map((p) =>
                p.id === aWid ? { ...p, row: targetRow, col: targetCol } : p,
              ),
            }
          })
        }
        // Cross-section: remove from source, add to target at the clamped position.
        return current.map((s) => {
          if (s.id === aSec) {
            return { ...s, placements: s.placements.filter((p) => p.id !== aWid) }
          }
          if (s.id === targetSec) {
            return {
              ...s,
              placements: [...s.placements, { id: aWid, row: targetRow, col: targetCol }],
            }
          }
          return s
        })
      })
      return
    }

    // Panel item drag — IDs are `panel:<groupId>:<itemId>`.
    if (activeId.startsWith('panel:') && overId.startsWith('panel:')) {
      const [, activeGroupId] = activeId.split(':')
      const [, overGroupId] = overId.split(':')
      if (activeGroupId !== overGroupId) return
      setCatalog((current) =>
        current.map((group) => {
          if (group.id !== activeGroupId) return group
          const itemIds = group.items.map((it) => `panel:${group.id}:${it.id}`)
          const from = itemIds.indexOf(activeId)
          const to = itemIds.indexOf(overId)
          if (from === -1 || to === -1) return group
          return { ...group, items: arrayMove(group.items, from, to) }
        }),
      )
    }
  }

  const deletingSection = useMemo(
    () => sections.find((s) => s.id === deletingSectionId) || null,
    [sections, deletingSectionId],
  )

  return (
    <AppShell>
      {!isEditMode && (
        <>
          <PageHeader title="Home" className="home-page-header" />
          <SectionHeader
            title="Welcome Amy!"
            supportingText="Last update: 04/24/2026 03:51 PM"
            leadingActions={
              <Button
                variant="primary"
                size="md"
                icon={<Plus />}
                onClick={handleAddWidgets}
              >
                {widgets.length === 0 ? 'Add Widgets' : 'Edit Dashboard View'}
              </Button>
            }
            trailingActions={
              <EntityChip
                name={selectedIds.size === 0 ? 'Add Customers' : 'Customers'}
                count={selectedIds.size}
                showAddButton={selectedIds.size === 0}
                onAddClick={() => {
                  handleAddWidgets()
                  handleOpenCustomersModal()
                }}
              />
            }
          />
        </>
      )}
      {isEditMode && (
        <div className="home-edit-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={handleAddSectionAtEnd}
          >
            Add Section
          </Button>
          <EntityChip
            name="Add Customers"
            count={selectedIds.size}
            onAddClick={handleOpenCustomersModal}
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={widgetSortIds} strategy={rectSortingStrategy}>
          <div
            key={gridKey}
            className={`home-sections ${isEditMode ? 'home-sections--edit' : ''}`.trim()}
          >
            {sections.length === 0 && !isEditMode && (
              <EmptyState
                className="home-sections-empty"
                icon={<Plus size={32} />}
                message="No sections yet. Switch to edit mode to add one."
              />
            )}
            {sections.map((section) => {
              const isRenaming = renamingSectionId === section.id
              // Resolve placements → render data (widget + placement).
              const placedWidgets = section.placements
                .map((p) => {
                  const widget = widgetsById_render[p.id]
                  return widget ? { widget, placement: p } : null
                })
                .filter(Boolean)
              // Empty (row, col) cells inside the section's grid extent.
              const emptyCells = isEditMode
                ? computeEmptyCells(section.placements, widgetsById_render)
                : []
              // Default mode shows just enough rows to fit the widgets; edit
              // mode also uses the same rows count so placeholders + widgets
              // align in the same grid.
              const gridRows = computeGridRows(section.placements, widgetsById_render)
              return (
                <div
                  key={section.id}
                  ref={(node) => registerSectionRef(section.id, node)}
                  className="home-section"
                >
                  {isRenaming ? (
                    <SectionRenameInput
                      initialValue={section.name}
                      onSave={(name) => handleSaveRename(section.id, name)}
                      onCancel={handleCancelRename}
                    />
                  ) : (
                    <SectionLabel
                      label={section.name}
                      mode={isEditMode ? 'edit' : 'default'}
                      onEdit={isEditMode ? () => handleStartRename(section.id) : undefined}
                      onDelete={isEditMode ? () => handleDeleteSectionRequest(section.id) : undefined}
                    />
                  )}
                  <div
                    className="home-widget-grid"
                    style={{
                      gridTemplateRows: `repeat(${gridRows}, minmax(var(--home-grid-row-min-height), auto))`,
                    }}
                  >
                    {placedWidgets.map(({ widget, placement }) => (
                      <SortableWidget
                        key={widget.id}
                        widget={widget}
                        placement={placement}
                        sectionId={section.id}
                        isEditMode={isEditMode}
                        onRemove={handleRemoveWidget}
                        justInserted={widget.id === lastInsertedId}
                      />
                    ))}
                    {emptyCells.map((cell) => (
                      <PlaceholderCell
                        key={`empty-${cell.row}-${cell.col}`}
                        sectionId={section.id}
                        row={cell.row}
                        col={cell.col}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            {isEditMode && (
              <>
                <AddSectionDivider />
                {/* Preview row of 6 placeholder cells — shows what the new
                    section's grid space will look like. Decorative only;
                    these cells aren't droppable since the section doesn't
                    exist yet (use the AddSectionButton to create it first). */}
                <div className="home-widget-grid home-add-section-preview">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <GhostCell key={`preview-${i}`} />
                  ))}
                </div>
                <AddSectionButton onClick={handleAddSectionAtEnd} />
              </>
            )}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} className="home-widget-drag-overlay">
          {activeDragWidgetId && widgetsById_render[activeDragWidgetId] ? (
            <Widget
              variant={widgetsById_render[activeDragWidgetId].variant}
              editMode={isEditMode}
              {...widgetsById_render[activeDragWidgetId].props}
            />
          ) : null}
        </DragOverlay>

        <aside
          className={`home-edit-panel ${isEditMode ? 'home-edit-panel--visible' : ''}`.trim()}
          aria-hidden={!isEditMode}
        >
          <SortableContext items={panelItemIds} strategy={verticalListSortingStrategy}>
            <WidgetsLeftMenu
              groups={catalog}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              collapsedGroupIds={collapsedGroupIds}
              onToggleGroup={handleToggleGroup}
              onItemClick={handleItemClick}
              isItemDisabled={isItemDisabled}
              renderItem={(item, group, defaultNode, meta) => (
                <SortablePanelItem
                  item={item}
                  group={group}
                  defaultNode={defaultNode}
                  disabled={meta?.disabled}
                />
              )}
            />
          </SortableContext>
        </aside>
      </DndContext>

      {configurator && configurator.step === 1 && (
        <ModalLarge
          title={configurator.itemLabel}
          subtitle={configurator.groupTitle}
          onClose={() => setConfigurator(null)}
          footer={
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                setConfigurator((prev) => (prev ? { ...prev, step: 2 } : prev))
              }
              className="home-configurator__insert"
            >
              Continue
            </Button>
          }
        >
          <WidgetVariantPicker
            variant={configurator.variant}
            onVariantChange={(next) =>
              setConfigurator((prev) => (prev ? { ...prev, variant: next } : prev))
            }
            widgetProps={previewWidgetProps(configurator.variant, configurator.itemLabel)}
          />
        </ModalLarge>
      )}
      {configurator && configurator.step === 2 && (() => {
        const selectedSection = sections.find((s) => s.id === configurator.sectionId)
        const addLabel = selectedSection ? `Add to ${selectedSection.name}` : 'Add to section'
        return (
        <ModalLarge
          title={configurator.itemLabel}
          subtitle={configurator.groupTitle}
          onClose={() => setConfigurator(null)}
          footer={
            <div className="home-configurator__step2-actions">
              {!configurator.cta && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() =>
                    setConfigurator((prev) => (prev ? { ...prev, step: 1 } : prev))
                  }
                >
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={handleInsertWidget}
                disabled={!configurator.sectionId}
                className="home-configurator__insert"
              >
                {addLabel}
              </Button>
            </div>
          }
        >
          {sections.length === 0 ? (
            <EmptyState
              icon={<Plus size={32} />}
              message="No sections yet. Close this modal and add one first."
            />
          ) : (
            <div
              className="home-section-picker"
              role="radiogroup"
              aria-label="Section"
            >
              {sections.map((s) => {
                const selected = configurator.sectionId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`home-section-picker__row ${selected ? 'home-section-picker__row--selected' : ''}`.trim()}
                    onClick={() =>
                      setConfigurator((prev) => (prev ? { ...prev, sectionId: s.id } : prev))
                    }
                  >
                    <span className="text-label-sm-medium">{s.name}</span>
                    {selected && <Check size={20} />}
                  </button>
                )
              })}
            </div>
          )}
        </ModalLarge>
        )
      })()}
      {deletingSection && (
        <ModalMedium
          title="Delete section?"
          onClose={() => setDeletingSectionId(null)}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setDeletingSectionId(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" onClick={handleConfirmDeleteSection}>
                Delete section
              </Button>
            </>
          }
        >
          <p className="home-section-delete-copy text-label-sm-regular">
            Deleting <strong>{deletingSection.name}</strong> will also remove{' '}
            <strong>{deletingSection.placements.length}</strong>{' '}
            {deletingSection.placements.length === 1 ? 'widget' : 'widgets'} inside it. This cannot be undone.
          </p>
        </ModalMedium>
      )}
      {customersModalOpen && (
        <ModalMedium
          title="Add Customers"
          onClose={handleCloseCustomersModal}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={handleCloseCustomersModal}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" onClick={handleCloseCustomersModal}>
                Save
              </Button>
            </>
          }
        >
          <div
            ref={customersSearchRef}
            onFocus={() => setCustomersResultsOpen(true)}
          >
          <SearchField
            value={customersFilter}
            onChange={(v) => { setCustomersFilter(v); setCustomersResultsOpen(true) }}
            onClear={() => { setCustomersFilter(''); setCustomersResultsOpen(false) }}
            placeholder="Search Customers"
            showLabel
            showInfoIcon
            label="Set your Customers"
            results={
              customersResultsOpen ? (
                <>
                  <div className="search-field__results-header text-label-sm-medium">
                    All Customers
                  </div>
                  {searchMatches.length === 0 ? (
                    <div className="search-field__results-empty text-label-sm-regular">
                      No matches
                    </div>
                  ) : (
                    searchMatches.map((c) => (
                      <CustomerRow
                        key={c.id}
                        mode="result"
                        label={c.label}
                        favorite={c.favorite}
                        onClick={() => handleToggleCustomerSelect(c.id)}
                        onFavoriteToggle={() => handleToggleCustomerFavorite(c.id)}
                      />
                    ))
                  )}
                </>
              ) : null
            }
          />
          </div>
          <div className="home-customers-list">
            {selectedCustomers.length === 0 ? (
              <EmptyState
                className="home-customers-empty"
                icon={<Handshake size={32} />}
                message="No customer has been selected yet."
              />
            ) : (
              selectedCustomers.map((c) => (
                <CustomerRow
                  key={c.id}
                  mode="list"
                  label={c.label}
                  favorite={c.favorite}
                  onDelete={() => handleDeleteCustomer(c.id)}
                />
              ))
            )}
          </div>
        </ModalMedium>
      )}
    </AppShell>
  )
}

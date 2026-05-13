import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardList,
  Container,
  Download,
  Plus,
  Route,
  TriangleAlert,
  Truck,
  UserCog,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ICON_LG } from '@odyssey/tokens'
import {
  Button,
  CustomerRow,
  EntityChip,
  ModalLarge,
  ModalMedium,
  PageHeader,
  SearchField,
  SectionHeader,
  Widget,
  WidgetVariantPicker,
  WidgetsLeftMenu,
} from '@odyssey/ui'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
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

// Demo content fed to the inner Widget inside the configurator picker so each
// variant preview reads as a real widget instead of an empty shell. Mirrors
// the data shape of the initialWidgets entries — values are placeholders.
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

// Stub ctaRows for the module-level initialWidgets seed — handlers are no-op
// here so initialization stays pure. The Home component overrides this with
// navigation-bound handlers via useState's lazy initializer.
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
  // Row 1
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
  // Row 2 (3xChart + 3xChart + 3xCta — each spans 2 cols × 2 rows)
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

function SortableWidget({ widget, isEditMode, onRemove, justInserted = false }) {
  const cellRef = useRef(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
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
  // Variable-span grid cells (1x/2x/3x). rectSortingStrategy includes a scaleX/scaleY
  // in `transform` to fit the dragged item into the target's footprint — strip the
  // scale so the widget keeps its native size while moving.
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    zIndex: isDragging ? 1 : 'auto',
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
    id: `${group.id}:${item.id}`,
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

export default function Home() {
  const { isEditMode, enterEditMode } = useEditMode()
  const navigate = useNavigate()

  // Navigation-bound CTA rows for the "What would you like to do?" widget.
  // Invoices intentionally has no route (stub).
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
    initialWidgets.map((w) =>
      w.id === 'home-quick-actions'
        ? { ...w, props: { ...w.props, ctaRows } }
        : w,
    ),
  )
  const [catalog, setCatalog] = useState(initialCatalog)
  const [searchValue, setSearchValue] = useState('')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(new Set())
  const [gridKey, setGridKey] = useState(0)
  // Customers state — drives the EntityChip count and the Add Customers modal.
  // List size simulates the realistic ~100-customer scenario (list scrolls).
  const [customers, setCustomers] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `c${i + 1}`,
      label: `Customer ${i + 1}`,
      favorite: i === 0,
    })),
  )
  const [customersModalOpen, setCustomersModalOpen] = useState(false)
  const [customersFilter, setCustomersFilter] = useState('')
  // Configurator modal state: null when closed, else { itemId, itemLabel, groupTitle, variant }
  const [configurator, setConfigurator] = useState(null)
  // ID of the widget to pulse + scroll into view after insert (or after re-clicking
  // a panel item whose widget already exists in the grid). Cleared after the
  // CSS animation finishes (~900ms).
  const [lastInsertedId, setLastInsertedId] = useState(null)

  useEffect(() => {
    if (!lastInsertedId) return
    const t = setTimeout(() => setLastInsertedId(null), 900)
    return () => clearTimeout(t)
  }, [lastInsertedId])

  // Only one "What would you like to do?" (3xCta) widget can exist at a time.
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

  const widgetIds = useMemo(() => widgets.map((w) => w.id), [widgets])
  const panelItemIds = useMemo(
    () => catalog.flatMap((g) => g.items.map((it) => `${g.id}:${it.id}`)),
    [catalog],
  )

  const handleAddWidgets = () => {
    const widgetsSnapshot = widgets
    const catalogSnapshot = catalog
    enterEditMode({
      onSave: () => {
        setGridKey((k) => k + 1)
      },
      onCancel: () => {
        setWidgets(widgetsSnapshot)
        setCatalog(catalogSnapshot)
      },
    })
  }

  const handleRemoveWidget = useCallback((id) => {
    setWidgets((current) => current.filter((w) => w.id !== id))
  }, [])

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
  const handleDeleteCustomer = useCallback((id) => {
    setCustomers((cs) => cs.filter((c) => c.id !== id))
  }, [])
  const filteredCustomers = useMemo(() => {
    const q = customersFilter.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => c.label.toLowerCase().includes(q))
  }, [customers, customersFilter])

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
    // CTA items are single-shape (3xCta) and bypass the variant picker.
    if (item.cta) {
      // Only one CTA widget allowed — if already present, pulse-scroll the existing one
      // instead of inserting a duplicate. (Item is also visually disabled in the panel.)
      if (hasCtaWidget) {
        const existing = widgets.find((w) => w.variant === '3xCta')
        if (existing) setLastInsertedId(existing.id)
        return
      }
      const newWidget = {
        id: `${item.id}-${Date.now()}`,
        variant: '3xCta',
        props: { title: item.label, ctaRows },
      }
      setWidgets((current) => [...current, newWidget])
      setLastInsertedId(newWidget.id)
      return
    }
    setConfigurator({
      itemId: item.id,
      itemLabel: item.label,
      groupTitle: group.title,
      variant: '1x',
    })
  }, [catalog, hasCtaWidget, widgets, ctaRows])

  const handleInsertWidget = useCallback(() => {
    if (!configurator) return
    const { itemId, itemLabel, variant } = configurator
    const placeholderProps =
      variant === '3xChart'
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
    setLastInsertedId(newWidget.id)
    setConfigurator(null)
  }, [configurator])

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Widget grid drag — both ids are plain widget ids
    if (widgetIds.includes(activeId) && widgetIds.includes(overId)) {
      setWidgets((current) => {
        const from = current.findIndex((w) => w.id === activeId)
        const to = current.findIndex((w) => w.id === overId)
        if (from === -1 || to === -1) return current
        return arrayMove(current, from, to)
      })
      return
    }

    // Panel item drag — composite ids "groupId:itemId"
    if (activeId.includes(':') && overId.includes(':')) {
      const [activeGroupId] = activeId.split(':')
      const [overGroupId] = overId.split(':')
      if (activeGroupId !== overGroupId) return
      setCatalog((current) =>
        current.map((group) => {
          if (group.id !== activeGroupId) return group
          const itemIds = group.items.map((it) => `${group.id}:${it.id}`)
          const from = itemIds.indexOf(activeId)
          const to = itemIds.indexOf(overId)
          if (from === -1 || to === -1) return group
          return { ...group, items: arrayMove(group.items, from, to) }
        }),
      )
    }
  }

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
                Add Widgets
              </Button>
            }
            trailingActions={
              <EntityChip
                name="Customers"
                count={customers.length}
                showAddButton={false}
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
            onClick={() => console.log('add section')}
          >
            Add Section
          </Button>
          <EntityChip
            name="Add Customers"
            count={customers.length}
            onAddClick={handleOpenCustomersModal}
          />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          <div key={gridKey} className="home-widget-grid">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onRemove={handleRemoveWidget}
                justInserted={widget.id === lastInsertedId}
              />
            ))}
          </div>
        </SortableContext>

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

      {configurator && (
        <ModalLarge
          title={configurator.itemLabel}
          subtitle={configurator.groupTitle}
          onClose={() => setConfigurator(null)}
          footer={
            <Button
              variant="primary"
              size="lg"
              onClick={handleInsertWidget}
              className="home-configurator__insert"
            >
              Insert widget
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
          <SearchField
            value={customersFilter}
            onChange={setCustomersFilter}
            onClear={() => setCustomersFilter('')}
            placeholder="Search Customers"
            showLabel
            showInfoIcon
            label="Add Customers"
          />
          <div className="home-customers-list">
            {filteredCustomers.map((c) => (
              <CustomerRow
                key={c.id}
                label={c.label}
                favorite={c.favorite}
                onFavoriteToggle={() => handleToggleCustomerFavorite(c.id)}
                onDelete={() => handleDeleteCustomer(c.id)}
              />
            ))}
          </div>
        </ModalMedium>
      )}
    </AppShell>
  )
}

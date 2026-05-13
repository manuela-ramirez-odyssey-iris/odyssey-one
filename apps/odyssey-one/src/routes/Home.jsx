import { useCallback, useMemo, useState } from 'react'
import { Download, Plus, Route, TriangleAlert, UserCog } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Button, EntityChip, PageHeader, SectionHeader, Widget, WidgetsLeftMenu } from '@odyssey/ui'
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
import ComingSoonModal from '../components/ComingSoonModal'
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

const ctaRows = [
  { icon: <Plus size={20} />, label: 'Create a New Order', onClick: handleRow('create-order') },
  { icon: <Route size={20} />, label: 'Track a Shipment', onClick: handleRow('track-shipment') },
  { icon: <UserCog size={20} />, label: 'Manage Users', onClick: handleRow('manage-users') },
  { icon: <Download size={20} />, label: 'Invoices', onClick: handleRow('invoices') },
]

const initialWidgets = [
  {
    id: 'open-exceptions',
    variant: '1x',
    props: {
      title: 'Open Exceptions',
      domainIcon,
      value: '83',
      label: 'Across all customers',
      onGoToClick: () => console.log('go to exceptions'),
    },
  },
  {
    id: 'critical-exceptions',
    variant: '2x',
    props: {
      title: 'Critical Exceptions',
      domainIcon,
      value: '12',
      label: 'Need action today',
      percentage: '42%',
      chartSegments: singleChartSegment,
      chartTotal: 100,
      goToLabel: 'Go to Exceptions',
      onGoToClick: () => console.log('go to exceptions'),
    },
  },
  {
    id: 'exceptions-by-type',
    variant: '3x',
    props: {
      title: 'Exceptions by Type',
      domainIcon,
      rows: exceptionRows,
      goToLabel: 'Go to Exceptions',
      onGoToClick: () => console.log('go to exceptions'),
    },
  },
  {
    id: 'exception-causes-7d',
    variant: '3xChart',
    props: {
      title: 'Exception Causes (7d)',
      domainIcon,
      value: '156',
      label: 'Total this week',
      chartSegments,
      rows: chartRows,
      goToLabel: 'Go to Exceptions',
      onGoToClick: () => console.log('go to exceptions'),
    },
  },
  {
    id: 'home-quick-actions',
    variant: '3xCta',
    props: {
      title: 'What would you like to do?',
      ctaRows,
    },
  },
]

const initialCatalog = [
  {
    id: 'quick-action',
    title: 'Quick action',
    items: [{ id: 'qa-what-to-do', label: 'What would you like to do?' }],
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

function SortableWidget({ widget, isEditMode, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
    animateLayoutChanges: () => false,
  })
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
      ref={setNodeRef}
      style={style}
      className={`home-widget-cell home-widget-cell--${widget.variant}`}
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

function SortablePanelItem({ item, group, defaultNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${group.id}:${item.id}`,
  })
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    background: isDragging ? 'var(--deep-sea-neutral-200)' : undefined,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? 'true' : undefined}
      {...attributes}
      {...listeners}
    >
      {defaultNode}
    </div>
  )
}

export default function Home() {
  const { isEditMode, enterEditMode } = useEditMode()

  const [widgets, setWidgets] = useState(initialWidgets)
  const [catalog, setCatalog] = useState(initialCatalog)
  const [searchValue, setSearchValue] = useState('')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(new Set())
  const [gridKey, setGridKey] = useState(0)
  const [selectedWidgetLabel, setSelectedWidgetLabel] = useState(null)

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
    if (item) setSelectedWidgetLabel(item.label)
  }, [catalog])

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
            disabled={isEditMode}
          >
            Add Widgets
          </Button>
        }
        trailingActions={
          <EntityChip
            name="Customers"
            count={5}
            onAddClick={() => console.log('add customer')}
          />
        }
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          <div key={gridKey} className="home-widget-grid">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onRemove={handleRemoveWidget}
              />
            ))}
          </div>
        </SortableContext>

        {isEditMode && (
          <aside className="home-edit-panel">
            <SortableContext items={panelItemIds} strategy={verticalListSortingStrategy}>
              <WidgetsLeftMenu
                groups={catalog}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                collapsedGroupIds={collapsedGroupIds}
                onToggleGroup={handleToggleGroup}
                onItemClick={handleItemClick}
                renderItem={(item, group, defaultNode) => (
                  <SortablePanelItem item={item} group={group} defaultNode={defaultNode} />
                )}
              />
            </SortableContext>
          </aside>
        )}
      </DndContext>

      <ComingSoonModal
        widgetLabel={selectedWidgetLabel}
        onClose={() => setSelectedWidgetLabel(null)}
      />
    </AppShell>
  )
}

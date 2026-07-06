import React, { useState, useEffect, useCallback, useMemo, useTransition, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge, ShipmentsBar } from '@odyssey/ui'

const BADGE_COLORS = ['amber', 'blue', 'green', 'red', 'purple']

const OrderTab = React.lazy(() => import('./OrderTab'))
const StopsTab = React.lazy(() => import('./StopsTab'))
const ProductTab = React.lazy(() => import('./ProductTab'))
const RoutingGuideTab = React.lazy(() => import('./RoutingGuideTab'))
const CostAllocationTab = React.lazy(() => import('./CostAllocationTab'))
const InstructionsTab = React.lazy(() => import('./InstructionsTab'))
const DocumentsTab = React.lazy(() => import('./DocumentsTab'))
const NotesTab = React.lazy(() => import('./NotesTab'))
const HistoryTab = React.lazy(() => import('./HistoryTab'))
const TenderHistoryTab = React.lazy(() => import('./TenderHistoryTab'))

function TabLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-12)', color: 'var(--text-placeholder)' }}>
      <Loader2 size={24} className="animate-spin" />
    </div>
  )
}

// Tab order + labels follow the Figma ShipmentsBar master (4106:1765):
// Orders first, History before Tender History. Keys are the pane ids.
// Exported for TabArrangementPanel (the arrange feature's item source).
export const TABS = [
  { key: 'order', label: 'Orders' },
  { key: 'product', label: 'Product' },
  { key: 'stops', label: 'Stops' },
  { key: 'routing', label: 'Tender' },
  { key: 'cost', label: 'Cost Allocation' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'History' },
  { key: 'tender', label: 'Tender History' },
]

export const DEFAULT_TAB_ORDER = TABS.map(t => t.key)

// Shipments detail bar — composes the normalized ShipmentsBar shell (strip +
// expansion + controls) and keeps the app wiring: lazy panes per tab slot, the
// multi-order switcher inside the Orders tab, loading/error/retry states.
export default function BottomBar({
  selectedShipmentId,
  shipmentDetails,
  shipment,
  rightOffset = 0,
  onToggleColumnPanel,
  onTabArrangement,
  tabOrder = DEFAULT_TAB_ORDER,
  detailsLoading,
  detailsError,
  onRetryDetails,
  onPrevShipment,
  onNextShipment,
  prevDisabled,
  nextDisabled,
  onClose,
}) {
  // Expansion is derived: selection ⇒ open. Close = deselect (`onClose`, wired
  // upstream to clear the selected row) — the 'collapsed with selection' state
  // no longer exists (S79c decision 4).
  const expanded = !!selectedShipmentId
  const [activeTab, setActiveTab] = useState('order')
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (selectedShipmentId) setActiveTab('order')
  }, [selectedShipmentId])

  // Tab switches ride a transition so the PREVIOUS pane stays mounted while
  // the next lazy chunk loads — the auto-height bar never collapses to the
  // Suspense fallback mid-switch (S79c decision 3). The fallback still covers
  // the FIRST pane after a row select (fresh mount via key={selectedShipmentId}).
  // ponytail: upgrade path = measure old→new pane heights and transition
  // between the two for an animated height change on tab switch.
  const handleTabChange = useCallback((key) => {
    startTransition(() => setActiveTab(key))
  }, [])

  // Click-outside closes (S79c decision 5) — document-level mousedown, active
  // only while a shipment is selected. Exempt (do NOT deselect): the bar
  // itself, table rows (they own selection toggling), right panels, inline
  // modal dialogs/overlays, and anything portaled to document.body outside
  // <main> (dropdown menus, popovers, tooltips, navbar/sidebar chrome).
  // Escape also closes — unless a modal is open (its own Escape wins) or focus
  // sits in an overlay/chrome region outside <main>.
  useEffect(() => {
    if (!selectedShipmentId || !onClose) return
    const EXEMPT = '[data-bottombar], .shipment-table tr, .right-panel, [aria-modal="true"], .modal-medium-overlay, .modal-large-overlay'
    const inChrome = (t) =>
      !t.closest('main') && t !== document.body && t !== document.documentElement
    const onDown = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest(EXEMPT) || inChrome(t)) return
      onClose()
    }
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[aria-modal="true"]')) return
      const t = e.target
      if (t instanceof Element && inChrome(t)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [selectedShipmentId, onClose])

  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0)

  const orders = useMemo(() => {
    if (!shipmentDetails?.orderDetails) return []
    return shipmentDetails.orderDetails.map(od => od.orderNumber)
  }, [shipmentDetails])

  // Reset selected order when shipment changes
  useEffect(() => {
    setSelectedOrderIndex(0)
  }, [selectedShipmentId])

  // Strip tabs follow the user's arrangement (`tabOrder` = ordered visible keys,
  // owned by ShipmentsRoute / TabArrangementPanel). The Orders tab is pinned:
  // if an order array somehow omits it, it's restored to the first position.
  const orderedTabs = useMemo(() => {
    const keys = tabOrder.includes('order') ? tabOrder : ['order', ...tabOrder]
    return keys.map(k => TABS.find(t => t.key === k)).filter(Boolean)
  }, [tabOrder])

  // If the active pane's tab was hidden by the arrangement, fall back to Orders.
  const shownTab = orderedTabs.some(t => t.key === activeTab) ? activeTab : 'order'

  // The Orders tab is the multi-order switcher: a ShipmentsBar DROPDOWN TAB —
  // prelabel "Order" over the selected order number; its DropdownMenu lists the
  // shipment's orders as preset values (badge + route + weight rows).
  const tabs = useMemo(() => {
    if (orders.length === 0) return orderedTabs
    return orderedTabs.map(tab => (tab.key === 'order' ? {
      ...tab,
      dropdown: {
        prelabel: 'Order',
        value: orders[selectedOrderIndex],
        menu: ({ close }) => orders.map((ord, i) => {
          const orderDetail = shipmentDetails?.orderDetails?.[i]
          const originLoc = orderDetail?.shipFrom?.location || ''
          const destLoc = orderDetail?.shipTo?.location || ''
          const origin = originLoc.split(', ')[1] || '—'
          const dest = destLoc.split(', ')[1] || '—'
          const weightDisplay = orderDetail?.grossWeight || ''
          return (
            <button
              key={ord}
              type="button"
              role="menuitem"
              onClick={() => { setSelectedOrderIndex(i); close() }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: selectedOrderIndex === i ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-primary)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { if (selectedOrderIndex !== i) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
              onMouseLeave={(e) => { if (selectedOrderIndex !== i) e.currentTarget.style.background = 'transparent' }}
            >
              <Badge variant={BADGE_COLORS[i]}>{ord}</Badge>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {origin} → {dest}
              </span>
              {weightDisplay && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {weightDisplay}
                </span>
              )}
            </button>
          )
        }),
      },
    } : tab))
  }, [orderedTabs, orders, selectedOrderIndex, shipmentDetails])

  const renderTabContent = () => {
    if (detailsError) {
      return (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 'var(--spacing-3)',
            padding: 'var(--spacing-6)', color: 'var(--text-secondary)',
          }}
        >
          <span>Couldn't load shipment details.</span>
          <button
            type="button"
            onClick={onRetryDetails}
            style={{
              padding: '0 var(--spacing-3)',
              height: 28,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              fontWeight: 500,
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
          >
            Retry
          </button>
        </div>
      )
    }
    if (detailsLoading && !shipmentDetails) {
      return <TabLoader />
    }
    if (!shipmentDetails) return null
    switch (shownTab) {
      case 'order': return (
        <OrderTab
          data={shipmentDetails.orderDetails?.[selectedOrderIndex]}
          orders={orders}
          selectedOrderIndex={selectedOrderIndex}
          onSelectOrder={setSelectedOrderIndex}
          // slices are index-aligned with orderDetails (all map over the same orderList)
          instructions={shipmentDetails.instructionsData?.orders?.[selectedOrderIndex]?.instructions ?? []}
          productLines={shipmentDetails.productData?.orders?.[selectedOrderIndex]?.lines ?? []}
        />
      )
      case 'stops': return <StopsTab data={shipmentDetails.stopsData} />
      case 'product': return <ProductTab data={shipmentDetails.productData} />
      case 'routing': return <RoutingGuideTab data={shipmentDetails.routingData} shipmentDetails={shipmentDetails} shipment={shipment} onToggleColumnPanel={onToggleColumnPanel} />
      case 'cost': return <CostAllocationTab data={shipmentDetails.costData} selectedOrderIdx={selectedOrderIndex} />
      case 'instructions': return <InstructionsTab data={shipmentDetails.instructionsData} />
      case 'documents': return <DocumentsTab data={shipmentDetails.documentsData} />
      case 'notes': return <NotesTab data={shipmentDetails.notesData} />
      case 'history': return <HistoryTab data={shipmentDetails.historyData} />
      case 'tender': return <TenderHistoryTab />
      default: return null
    }
  }

  return (
    <ShipmentsBar
        shipmentId={selectedShipmentId}
        onPrevShipment={onPrevShipment}
        onNextShipment={onNextShipment}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        tabs={tabs}
        activeTab={selectedShipmentId ? shownTab : null}
        onTabChange={handleTabChange}
        expanded={expanded}
        onClose={onClose}
        onTabArrangement={onTabArrangement}
        rightOffset={rightOffset}
      >
        <div key={selectedShipmentId}>
          <Suspense fallback={<TabLoader />}>
            {renderTabContent()}
          </Suspense>
        </div>
    </ShipmentsBar>
  )
}

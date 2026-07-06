import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, Suspense } from 'react'
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

// Loader fills the full expanded canvas so the bar animates once (48→cap) and
// the spinner sits centered in the available height. height:100% resolves
// because the pane wrapper below is absolutely pinned to the content area
// while loading (S79f) — definite both mid-animation (inline px height on
// the bar) and after release (auto + min-height ratchet at the cap).
function TabLoader() {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-placeholder)' }}>
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

  // Only a FRESH open (null → id) resets to the Orders tab; a selected →
  // selected switch (prev/next arrows, row-to-row click) keeps the bar open on
  // the same tab (S79d — resetting on every id change lost the user's tab).
  const prevIdRef = useRef(null)
  useEffect(() => {
    const fresh = selectedShipmentId && !prevIdRef.current
    prevIdRef.current = selectedShipmentId
    if (!fresh) return
    setActiveTab('order')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shipmentDetails read once at open
  }, [selectedShipmentId])

  // Stale-while-loading: across a selected → selected switch the detail query
  // drops to null while the new shipment loads — hold the LAST shipment's
  // details so the pane shows stale content instead of flashing the loader
  // (the ratchet keeps the height; data swaps in place when it lands). Cleared
  // on close so a fresh open still gets the loader pane, never another
  // shipment's data (S79d).
  const lastDetailsRef = useRef(null)
  if (shipmentDetails) lastDetailsRef.current = shipmentDetails
  else if (!selectedShipmentId) lastDetailsRef.current = null
  const shownDetails = shipmentDetails ?? lastDetailsRef.current

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
    if (!shownDetails?.orderDetails) return []
    return shownDetails.orderDetails.map(od => od.orderNumber)
  }, [shownDetails])

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
          const orderDetail = shownDetails?.orderDetails?.[i]
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
  }, [orderedTabs, orders, selectedOrderIndex, shownDetails])

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
    if (detailsLoading && !shownDetails) {
      return <TabLoader />
    }
    if (!shownDetails) return null
    switch (shownTab) {
      case 'order': return (
        <OrderTab
          data={shownDetails.orderDetails?.[selectedOrderIndex]}
          orders={orders}
          selectedOrderIndex={selectedOrderIndex}
          onSelectOrder={setSelectedOrderIndex}
          // slices are index-aligned with orderDetails (all map over the same orderList)
          instructions={shownDetails.instructionsData?.orders?.[selectedOrderIndex]?.instructions ?? []}
          productLines={shownDetails.productData?.orders?.[selectedOrderIndex]?.lines ?? []}
        />
      )
      case 'stops': return <StopsTab data={shownDetails.stopsData} />
      case 'product': return <ProductTab data={shownDetails.productData} />
      case 'routing': return <RoutingGuideTab data={shownDetails.routingData} shipmentDetails={shownDetails} shipment={shipment} onToggleColumnPanel={onToggleColumnPanel} />
      case 'cost': return <CostAllocationTab data={shownDetails.costData} selectedOrderIdx={selectedOrderIndex} />
      case 'instructions': return <InstructionsTab data={shownDetails.instructionsData} />
      case 'documents': return <DocumentsTab data={shownDetails.documentsData} />
      case 'notes': return <NotesTab data={shownDetails.notesData} />
      case 'history': return <HistoryTab data={shownDetails.historyData} />
      case 'tender': return <TenderHistoryTab />
      default: return null
    }
  }

  // openToCapHeight: true while no data is available for the current shipment
  // (fresh open with loading content). Computed synchronously from props so
  // ShipmentsBar's useLayoutEffect captures the correct value in the same
  // render that expanded first becomes true — no useEffect timing gap (S79e).
  const openToCapHeight = detailsLoading && !shownDetails

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
        openToCapHeight={openToCapHeight}
      >
        {/* key stays for data freshness (pane-local state resets per shipment)
            — on a switch it remounts SYNCHRONOUSLY with the held stale details
            (chunks already loaded), so no loader flash and, with the bar's
            ratchet, no height dip (S79d). While the fresh-open loader shows,
            the wrapper is absolutely pinned to the content area (position:
            relative on .shipments-bar__content) so TabLoader's height:100%
            resolves and the spinner centers in the growing canvas — absolute
            inset works in BOTH phases, unlike height:100%, which loses its
            definite chain once the bar releases to auto + min-height (S79f);
            real panes go back to normal flow (they own their canvas/scroll). */}
        <div key={selectedShipmentId} style={openToCapHeight ? { position: 'absolute', inset: 0 } : undefined}>
          <Suspense fallback={<TabLoader />}>
            {renderTabContent()}
          </Suspense>
        </div>
    </ShipmentsBar>
  )
}

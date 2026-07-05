import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
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
const TABS = [
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

// Shipments detail bar — composes the normalized ShipmentsBar shell (strip +
// expansion + controls) and keeps the app wiring: lazy panes per tab slot, the
// multi-order switcher inside the Orders tab, loading/error/retry states.
export default function BottomBar({
  selectedShipmentId,
  shipmentDetails,
  shipment,
  rightOffset = 0,
  onToggleColumnPanel,
  detailsLoading,
  detailsError,
  onRetryDetails,
  onPrevShipment,
  onNextShipment,
  prevDisabled,
  nextDisabled,
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('order')

  useEffect(() => {
    if (selectedShipmentId) {
      setExpanded(true)
      setActiveTab('order')
    } else {
      setExpanded(false)
    }
  }, [selectedShipmentId])

  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0)

  const orders = useMemo(() => {
    if (!shipmentDetails?.orderDetails) return []
    return shipmentDetails.orderDetails.map(od => od.orderNumber)
  }, [shipmentDetails])

  // Reset selected order when shipment changes
  useEffect(() => {
    setSelectedOrderIndex(0)
  }, [selectedShipmentId])

  // The Orders tab is the multi-order switcher: a ShipmentsBar DROPDOWN TAB —
  // prelabel "Order" over the selected order number; its DropdownMenu lists the
  // shipment's orders as preset values (badge + route + weight rows).
  const tabs = useMemo(() => {
    if (orders.length === 0) return TABS
    return TABS.map(tab => (tab.key === 'order' ? {
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
  }, [orders, selectedOrderIndex, shipmentDetails])

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
    switch (activeTab) {
      case 'order': return <OrderTab data={shipmentDetails.orderDetails?.[selectedOrderIndex]} />
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
        activeTab={selectedShipmentId ? activeTab : null}
        onTabChange={setActiveTab}
        expanded={expanded}
        onExpandedChange={setExpanded}
        onTabArrangement={onToggleColumnPanel}
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

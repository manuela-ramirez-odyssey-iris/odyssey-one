import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, Maximize2, Minimize2, X, Columns3Cog } from 'lucide-react'
import Badge from '../ui/Badge'

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
      <span style={{ fontSize: 'var(--font-size-sm)' }}>Loading...</span>
    </div>
  )
}

const TABS = [
  { key: 'order', label: 'Order' },
  { key: 'product', label: 'Product' },
  { key: 'routing', label: 'Routing guide' },
  { key: 'tender', label: 'Tender History' },
  { key: 'cost', label: 'Cost Allocation' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'history', label: 'History' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'stops', label: 'Stops' },
]

const STATES = {
  collapsed: 'var(--bottombar-collapsed)',
  expanded: '50vh',
  fullscreen: 'calc(100vh - var(--navbar-height))',
}

export default function BottomBar({ selectedShipmentId, shipmentDetails, onClose, rightOffset = 0, onToggleColumnPanel }) {
  const [barState, setBarState] = useState('collapsed')
  const [activeTab, setActiveTab] = useState('order')
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ left: 0, width: 240 })
  const tabsRef = useRef(null)
  const orderTabRef = useRef(null)
  const contentRef = useRef(null)

  const isExpanded = barState === 'expanded' || barState === 'fullscreen'
  const isDisabled = !selectedShipmentId

  useEffect(() => {
    if (selectedShipmentId && barState === 'collapsed') {
      setBarState('expanded')
      setActiveTab('order')
    }
    if (!selectedShipmentId) {
      setBarState('collapsed')
    }
  }, [selectedShipmentId])

  const handleTabClick = useCallback((key) => {
    if (isDisabled) return
    setActiveTab(key)
    if (key !== 'order') setOrderDropdownOpen(false)
  }, [isDisabled])

  const scrollTabs = useCallback((direction) => {
    if (!tabsRef.current) return
    tabsRef.current.scrollBy({ left: direction * 150, behavior: 'smooth' })
  }, [])

  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0)

  const orders = useMemo(() => {
    if (!shipmentDetails?.orderDetails) return []
    return shipmentDetails.orderDetails.map(od => od.orderNumber)
  }, [shipmentDetails])

  // Reset selected order when shipment changes
  useEffect(() => {
    setSelectedOrderIndex(0)
    setOrderDropdownOpen(false)
  }, [selectedShipmentId])

  const height = STATES[barState]

  const renderTabContent = () => {
    if (!shipmentDetails) return null
    switch (activeTab) {
      case 'order': return <OrderTab data={shipmentDetails.orderDetails?.[selectedOrderIndex]} />
      case 'stops': return <StopsTab data={shipmentDetails.stopsData} />
      case 'product': return <ProductTab data={shipmentDetails.productData} />
      case 'routing': return <RoutingGuideTab data={shipmentDetails.routingData} />
      case 'cost': return <CostAllocationTab data={shipmentDetails.costData} />
      case 'instructions': return <InstructionsTab data={shipmentDetails.instructionsData} />
      case 'documents': return <DocumentsTab data={shipmentDetails.documentsData} />
      case 'notes': return <NotesTab data={shipmentDetails.notesData} />
      case 'history': return <HistoryTab />
      case 'tender': return <TenderHistoryTab />
      default: return null
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 'var(--sidebar-width)',
        right: rightOffset,
        height,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
        transition: 'height var(--transition-slow), right var(--transition-base)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isExpanded ? 'var(--shadow-up-md)' : 'none',
      }}
    >
      {/* Header — always shows tabs */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 'var(--bottombar-collapsed)',
          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
        }}
      >
        {/* Left: Shipment ID or "Select a Shipment" */}
        <div
          className="text-sm font-semibold shrink-0"
          style={{
            color: isDisabled ? 'var(--text-placeholder)' : 'var(--text-primary)',
            padding: '0 var(--spacing-4)',
            borderRight: '1px solid var(--border-subtle)',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {isDisabled ? 'Select a Shipment' : selectedShipmentId}
        </div>

        {/* Tabs — always visible, scrollable, disabled when no shipment */}
        <div
          ref={tabsRef}
          className="flex items-center flex-1 min-w-0"
          style={{ height: '100%', overflow: 'hidden' }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key && !isDisabled
            const isOrderTab = tab.key === 'order'

            return (
              <div key={tab.key} ref={isOrderTab ? orderTabRef : undefined} className="relative shrink-0" style={{ height: '100%' }}>
                <button
                  onClick={() => {
                    handleTabClick(tab.key)
                    if (tab.key === 'order' && !isDisabled) {
                      setOrderDropdownOpen((prev) => {
                        const willOpen = activeTab === 'order' ? !prev : false
                        if (willOpen && orderTabRef.current && contentRef.current) {
                          const tabRect = orderTabRef.current.getBoundingClientRect()
                          const contentRect = contentRef.current.getBoundingClientRect()
                          setDropdownPos({
                            left: tabRect.left - contentRect.left,
                            width: tabRect.width,
                          })
                        }
                        return willOpen
                      })
                    }
                  }}
                  className="border-none whitespace-nowrap flex items-center gap-1"
                  style={{
                    padding: '0 var(--spacing-4)',
                    height: '100%',
                    cursor: isDisabled ? 'default' : 'pointer',
                    background: isActive ? 'var(--bg-secondary)' : 'transparent',
                    borderRight: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-primary)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: isDisabled ? 'var(--text-placeholder)' : isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    transition: 'background var(--transition-fast), color var(--transition-fast)',
                    opacity: isDisabled ? 0.6 : 1,
                  }}
                >
                  {isOrderTab && isActive && orders.length > 0 ? (
                    <div className="flex items-center gap-2" style={{ textAlign: 'left' }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', textAlign: 'left' }}>Order</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>{orders[selectedOrderIndex]}</div>
                      </div>
                      <ChevronUp
                        size={14}
                        style={{
                          color: 'var(--text-placeholder)',
                          transform: orderDropdownOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                          transition: 'transform var(--transition-fast)',
                        }}
                      />
                    </div>
                  ) : (
                    tab.label
                  )}
                </button>

              </div>
            )
          })}
        </div>

        {/* Right: Scroll arrows + Expand/Shrink + Column config + Close */}
        <div className="flex items-center shrink-0" style={{ padding: '0 8px', gap: 4 }}>
          {/* Scroll tabs left */}
          <button
            onClick={() => scrollTabs(-1)}
            className="flex items-center justify-center"
            style={{
              width: 26, height: 26,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)'; e.currentTarget.style.background = 'transparent' }}
            title="Scroll tabs left"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Scroll tabs right */}
          <button
            onClick={() => scrollTabs(1)}
            className="flex items-center justify-center"
            style={{
              width: 26, height: 26,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)'; e.currentTarget.style.background = 'transparent' }}
            title="Scroll tabs right"
          >
            <ChevronRight size={14} />
          </button>

          {/* Expand / Shrink toggle */}
          <button
            onClick={() => {
              if (isDisabled) return
              if (barState === 'collapsed') setBarState('expanded')
              else if (barState === 'expanded') setBarState('fullscreen')
              else setBarState('expanded')
            }}
            className="flex items-center justify-center"
            style={{
              width: 26, height: 26,
              cursor: isDisabled ? 'default' : 'pointer',
              color: 'var(--text-placeholder)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              opacity: isDisabled ? 0.4 : 1,
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!isDisabled) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)'; e.currentTarget.style.background = 'transparent' }}
            title={barState === 'fullscreen' ? 'Shrink' : 'Expand'}
          >
            {barState === 'fullscreen' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          {/* Close button */}
          <button
            onClick={() => {
              setBarState('collapsed')
              onClose()
            }}
            className="flex items-center justify-center"
            style={{
              width: 26, height: 26,
              cursor: isDisabled ? 'default' : 'pointer',
              color: 'var(--text-placeholder)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              opacity: isDisabled ? 0.4 : 1,
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!isDisabled) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)'; e.currentTarget.style.background = 'transparent' }}
            title="Close"
          >
            <X size={12} />
          </button>

          {/* Column arrangement button */}
          <button
            onClick={() => { if (onToggleColumnPanel) onToggleColumnPanel() }}
            className="flex items-center justify-center"
            style={{
              width: 28, height: 28,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)'; e.currentTarget.style.background = 'transparent' }}
            title="Column arrangement"
          >
            <Columns3Cog size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div ref={contentRef} key={selectedShipmentId} className="flex-1 min-h-0 overflow-auto relative" style={{ padding: 'var(--spacing-4) var(--spacing-5)' }}>
          {/* Order dropdown overlay */}
          {activeTab === 'order' && orderDropdownOpen && orders.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: dropdownPos.left,
                width: dropdownPos.width,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 10,
                overflow: 'hidden',
              }}
            >
              {orders.map((ord, i) => (
                <button
                  key={ord}
                  className="flex items-center justify-center w-full border-none cursor-pointer"
                  style={{
                    padding: '10px 16px',
                    background: i === selectedOrderIndex ? 'var(--bg-secondary)' : 'transparent',
                    borderBottom: i < orders.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    fontFamily: 'var(--font-primary)',
                  }}
                  onMouseEnter={(e) => { if (i !== selectedOrderIndex) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseLeave={(e) => { if (i !== selectedOrderIndex) e.currentTarget.style.background = 'transparent' }}
                  onClick={() => {
                    setSelectedOrderIndex(i)
                    setOrderDropdownOpen(false)
                  }}
                >
                  <Badge variant={BADGE_COLORS[i]}>{ord}</Badge>
                </button>
              ))}
            </div>
          )}
          <Suspense fallback={<TabLoader />}>
            {renderTabContent()}
          </Suspense>
        </div>
      )}
    </div>
  )
}

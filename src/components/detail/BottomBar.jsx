import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Maximize2, Minimize2, X, Columns3Cog } from 'lucide-react'
import OrderTab from './OrderTab'
import StopsTab from './StopsTab'
import ProductTab from './ProductTab'
import RoutingGuideTab from './RoutingGuideTab'
import CostAllocationTab from './CostAllocationTab'
import InstructionsTab from './InstructionsTab'
import DocumentsTab from './DocumentsTab'
import NotesTab from './NotesTab'
import HistoryTab from './HistoryTab'
import TenderHistoryTab from './TenderHistoryTab'

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
  const tabsRef = useRef(null)

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

  const orders = useMemo(() => {
    if (!shipmentDetails?.orderDetail) return []
    const od = shipmentDetails.orderDetail
    return od.orderNumber ? [od.orderNumber] : []
  }, [shipmentDetails])

  const height = STATES[barState]

  const renderTabContent = () => {
    if (!shipmentDetails) return null
    switch (activeTab) {
      case 'order': return <OrderTab data={shipmentDetails.orderDetail} />
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
            const isOrderTab = tab.key === 'order' && isActive

            return (
              <div key={tab.key} className="relative shrink-0" style={{ height: '100%' }}>
                <button
                  onClick={() => {
                    handleTabClick(tab.key)
                    if (tab.key === 'order' && !isDisabled) {
                      setOrderDropdownOpen((prev) => activeTab === 'order' ? !prev : false)
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
                  {tab.label}
                  {isOrderTab && orders.length > 0 && (
                    <>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>
                        {orders[0]}
                      </span>
                      <ChevronDown size={14} style={{ color: 'var(--text-placeholder)', marginLeft: 2 }} />
                    </>
                  )}
                </button>

                {/* Order dropdown */}
                {isOrderTab && orderDropdownOpen && orders.length > 0 && (
                  <div
                    className="absolute z-50"
                    style={{
                      top: '100%',
                      left: 0,
                      minWidth: 200,
                      background: 'var(--dropdown-bg)',
                      border: '1px solid var(--dropdown-border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                      padding: '4px 0',
                    }}
                  >
                    {orders.map((ord) => (
                      <button
                        key={ord}
                        className="flex items-center w-full text-left text-sm border-none cursor-pointer"
                        style={{
                          padding: '8px 12px',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-primary)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setOrderDropdownOpen(false)}
                      >
                        {ord}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Scroll arrows + Expand/Shrink + Column config + Close */}
        <div className="flex items-center shrink-0" style={{ padding: '0 8px', gap: 6 }}>
          {/* Scroll tabs left */}
          <button
            onClick={() => scrollTabs(-1)}
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
            }}
            title="Scroll tabs left"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Scroll tabs right */}
          <button
            onClick={() => scrollTabs(1)}
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
            }}
            title="Scroll tabs right"
          >
            <ChevronRight size={16} />
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
              width: 32, height: 32,
              cursor: isDisabled ? 'default' : 'pointer',
              color: 'var(--text-placeholder)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              opacity: isDisabled ? 0.4 : 1,
            }}
            title={barState === 'fullscreen' ? 'Shrink' : 'Expand'}
          >
            {barState === 'fullscreen' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close button */}
          <button
            onClick={() => {
              setBarState('collapsed')
              onClose()
            }}
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32,
              cursor: isDisabled ? 'default' : 'pointer',
              color: 'var(--text-placeholder)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              opacity: isDisabled ? 0.4 : 1,
            }}
            title="Close"
          >
            <X size={14} />
          </button>

          {/* Column arrangement button */}
          <button
            onClick={() => { if (onToggleColumnPanel) onToggleColumnPanel() }}
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
            title="Column arrangement"
          >
            <Columns3Cog size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div key={selectedShipmentId} className="flex-1 min-h-0 overflow-auto" style={{ padding: 'var(--spacing-4) var(--spacing-5)' }}>
          {renderTabContent()}
        </div>
      )}
    </div>
  )
}

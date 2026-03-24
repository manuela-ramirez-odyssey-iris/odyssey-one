import { useState, useEffect, useCallback } from 'react'
import { Maximize2, Minimize2, Settings, X } from 'lucide-react'
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
  { key: 'stops', label: 'Stops' },
  { key: 'product', label: 'Product' },
  { key: 'routing', label: 'Routing' },
  { key: 'cost', label: 'Cost Allocation' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'History' },
  { key: 'tender', label: 'Tender History' },
]

const STATES = {
  collapsed: 48,
  expanded: '50vh',
  fullscreen: 'calc(100vh - 64px)',
}

export default function BottomBar({ selectedShipmentId, shipmentDetails, onClose }) {
  const [barState, setBarState] = useState('collapsed')
  const [activeTab, setActiveTab] = useState('order')

  useEffect(() => {
    if (selectedShipmentId && barState === 'collapsed') {
      setBarState('expanded')
      setActiveTab('order')
    }
    if (!selectedShipmentId) {
      setBarState('collapsed')
    }
  }, [selectedShipmentId])

  const handleToggleFullscreen = useCallback(() => {
    setBarState((prev) => (prev === 'fullscreen' ? 'expanded' : 'fullscreen'))
  }, [])

  const handleClose = useCallback(() => {
    setBarState('collapsed')
    onClose()
  }, [onClose])

  const isExpanded = barState === 'expanded' || barState === 'fullscreen'

  const height = STATES[barState]

  const renderTabContent = () => {
    if (!shipmentDetails) return null
    switch (activeTab) {
      case 'order':
        return <OrderTab data={shipmentDetails.orderDetail} />
      case 'stops':
        return <StopsTab data={shipmentDetails.stopsData} />
      case 'product':
        return <ProductTab data={shipmentDetails.productData} />
      case 'routing':
        return <RoutingGuideTab data={shipmentDetails.routingData} />
      case 'cost':
        return <CostAllocationTab data={shipmentDetails.costData} />
      case 'instructions':
        return <InstructionsTab data={shipmentDetails.instructionsData} />
      case 'documents':
        return <DocumentsTab data={shipmentDetails.documentsData} />
      case 'notes':
        return <NotesTab data={shipmentDetails.notesData} />
      case 'history':
        return <HistoryTab />
      case 'tender':
        return <TenderHistoryTab />
      default:
        return null
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 64,
        right: 0,
        height,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
        transition: 'height 0.3s ease',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isExpanded ? '0 -4px 16px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 48,
          padding: '0 16px',
          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
          cursor: !isExpanded ? 'default' : 'default',
        }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: isExpanded ? 'var(--text-primary)' : 'var(--text-placeholder)' }}
        >
          {isExpanded && selectedShipmentId ? selectedShipmentId : 'Select a Shipment'}
        </span>

        {isExpanded && (
          <div className="flex items-center gap-1">
            {/* Tab bar */}
            <div className="flex items-center gap-0 mr-4">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="border-none cursor-pointer whitespace-nowrap text-xs font-medium"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'var(--tab-active-bg)' : 'transparent',
                      color: isActive ? 'var(--tab-active-text)' : 'var(--tab-inactive-text)',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Action buttons */}
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center justify-center border-none cursor-pointer bg-transparent"
              style={{ width: 32, height: 32, color: 'var(--text-placeholder)' }}
              title={barState === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {barState === 'fullscreen' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              className="flex items-center justify-center border-none cursor-pointer bg-transparent"
              style={{ width: 32, height: 32, color: 'var(--text-placeholder)' }}
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleClose}
              className="flex items-center justify-center border-none cursor-pointer bg-transparent"
              style={{ width: 32, height: 32, color: 'var(--text-placeholder)' }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 min-h-0 overflow-auto" style={{ padding: '16px 20px' }}>
          {renderTabContent()}
        </div>
      )}
    </div>
  )
}

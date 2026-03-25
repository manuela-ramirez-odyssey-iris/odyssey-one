import { MoreVertical } from 'lucide-react'
import Badge from '../ui/Badge'

export default function ShipmentTable({ shipments, onRowSelect, selectedId }) {
  const handleSelect = (shipment) => {
    onRowSelect(selectedId === shipment.buyShipment ? null : shipment.buyShipment)
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto"
      style={{ borderRadius: 'var(--radius-lg)', paddingBottom: 'var(--bottombar-collapsed)', minHeight: 560 }}>
      <table className="w-full border-collapse text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-primary)' }}>
        <thead>
          <tr>
            <th className="sticky top-0 z-2"
              style={{ width: 48, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            </th>
            {['Buy Shipment', 'Customer ID(s)', 'Order #', 'Order Count', 'Pickup Date', 'Delivery Date', 'Origin'].map(col => (
              <th key={col} className="sticky top-0 z-2 text-left whitespace-nowrap"
                style={{ padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-placeholder)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                {col}
              </th>
            ))}
            <th className="sticky top-0 z-2" style={{ width: 76, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }} />
          </tr>
        </thead>
        <tbody>
          {shipments.map((s) => {
            const isSelected = selectedId === s.buyShipment
            return (
              <tr key={s.buyShipment}
                className="transition-colors duration-150 cursor-pointer"
                style={{
                  background: isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)' }}
                onClick={() => handleSelect(s)}
              >
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleSelect(s) }}>
                  <input
                    type="radio"
                    name="shipment-select"
                    checked={isSelected}
                    readOnly
                    style={{ accentColor: 'var(--border-focus)', width: 16, height: 16, cursor: 'pointer', pointerEvents: 'none' }}
                  />
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {s.buyShipment}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap' }}>
                  {s.customerId}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap', minWidth: 190 }}>
                  {s.orders.map((ord, i) => (
                    <Badge key={ord} variant={i % 2 === 0 ? 'amber' : 'blue'}>{ord}</Badge>
                  ))}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', minWidth: 80 }}>
                  {s.orderCount}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap', minWidth: 170 }}>
                  {s.pickupDate}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap', minWidth: 170 }}>
                  {s.deliveryDate}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap', minWidth: 180 }}>
                  {s.origin}
                </td>
                <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', width: 76 }}>
                  <button className="flex items-center justify-center mx-auto bg-transparent border-none cursor-pointer p-1">
                    <MoreVertical size={16} style={{ color: 'var(--text-placeholder)' }} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

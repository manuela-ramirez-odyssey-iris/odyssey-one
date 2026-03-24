import { useState } from 'react'
import AppShell from './components/layout/AppShell'
import ShipmentTable from './components/shipments/ShipmentTable'

function App() {
  const [selectedShipmentId, setSelectedShipmentId] = useState(null)

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold mb-6" style={{ color: 'var(--text-primary)', lineHeight: '32px' }}>
        Shipments
      </h1>
      <ShipmentTable
        selectedId={selectedShipmentId}
        onRowSelect={setSelectedShipmentId}
      />
    </AppShell>
  )
}

export default App

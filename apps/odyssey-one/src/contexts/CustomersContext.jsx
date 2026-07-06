import { createContext, useContext, useState, useCallback, useMemo } from 'react'
// Shared master-data customer pool (tools/data-pools.mjs re-exported through
// src/data/master-data.js) — the SAME 25 customers the shipment generator
// stamps onto rows as customerId/customerName.
import { CUSTOMERS as DATA_CUSTOMERS } from '../data/master-data.js'

const CustomersContext = createContext(null)

// Planner's book — the original partial customer list (S-Home). Every entry is
// now data-backed (S79 data fix — 10 new ids added to CUSTOMERS pool).
const LEGACY_NAMES = [
  'Kemira NA', 'Kemira EU', 'Geon', 'Valtris', 'USALCO',
  'Dubois', 'Solenis', 'Etex', 'Monument', 'Grace', 'IMCD',
]

// Legacy label → data-pool id. All 11 entries are now mapped (S79 data fix).
const LEGACY_TO_DATA = {
  'Kemira NA': 'KEMIRA_NA_01',
  'Kemira EU': 'KEMIRA_EU_01',
  'Geon':      'GEON_01',
  'Valtris':   'VALTRIS_01',
  'USALCO':    'USALCO_SYS_01',
  'Dubois':    'DUBOIS_01',
  'Solenis':   'SOLENIS_01',
  'Etex':      'ETEX_01',
  'Monument':  'MONUMENT_01',
  'Grace':     'GRACE_01',
  'IMCD':      'IMCD_01',
}

// Union of the planner's book + the data-pool customers, deduped (S79c decision
// 10). All legacy entries are now data-backed (S79 data fix), so every entry
// carries `dataId` — the customerId stamped on shipment rows — which is what
// the grid/search scoping filters on.
function initialCustomers() {
  const list = []
  const merged = new Set()
  LEGACY_NAMES.forEach((label, i) => {
    const dataId = LEGACY_TO_DATA[label]
    const data = dataId ? DATA_CUSTOMERS.find((c) => c.id === dataId) : null
    if (data) {
      merged.add(data.id)
      // Keep the short legacy label ("Kemira NA") in the popover; dataId links to pool rows.
      list.push({ id: data.id, label, dataId: data.id, favorite: i < 3 })
    } else {
      list.push({ id: `c${i + 1}`, label, favorite: i < 3 })
    }
  })
  for (const c of DATA_CUSTOMERS) {
    if (merged.has(c.id)) continue
    // Assigned/favorited: the 3 legacy favorites above + ERCO (explicit ask).
    list.push({ id: c.id, label: c.name, dataId: c.id, favorite: c.id === 'ERCO_SYS_01' })
  }
  return list
}

export function CustomersProvider({ children }) {
  const [customers, setCustomers] = useState(initialCustomers)
  // Default selection = Kemira NA, Kemira EU, Geon + ERCO — all now data-backed
  // (S79 data fix), so the default Shipments table shows rows for all four.
  const [selectedIds, setSelectedIds] = useState(() => new Set(['KEMIRA_NA_01', 'KEMIRA_EU_01', 'GEON_01', 'ERCO_SYS_01']))
  const [modalOpen, setModalOpen] = useState(false)

  const openModal = useCallback(() => {
    setModalOpen(true)
  }, [])
  const closeModal = useCallback(() => {
    setModalOpen(false)
  }, [])
  const toggleModal = useCallback(() => {
    setModalOpen((v) => !v)
  }, [])
  const toggleFavorite = useCallback((id) => {
    setCustomers((cs) => cs.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)))
  }, [])
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const deleteCustomer = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // The selected customers' shipment-data ids — the first-order scope the grid
  // service, category counts and search glimpse all pre-filter on (S79c decision
  // 10). Sorted so query keys built from it are order-stable. Data-less selected
  // customers contribute nothing here (honestly: they have no rows).
  const selectedDataIds = useMemo(
    () => customers.filter((c) => c.dataId && selectedIds.has(c.id)).map((c) => c.dataId).sort(),
    [customers, selectedIds],
  )

  return (
    <CustomersContext.Provider
      value={{ customers, selectedIds, selectedDataIds, modalOpen, openModal, closeModal, toggleModal, toggleFavorite, toggleSelect, deleteCustomer }}
    >
      {children}
    </CustomersContext.Provider>
  )
}

export function useCustomers() {
  const ctx = useContext(CustomersContext)
  if (!ctx) throw new Error('useCustomers must be used inside CustomersProvider')
  return ctx
}

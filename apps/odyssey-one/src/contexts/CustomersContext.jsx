import { createContext, useContext, useState, useCallback, useMemo } from 'react'
// Shared master-data customer pool (tools/data-pools.mjs re-exported through
// src/data/master-data.js) — the SAME 15 customers the shipment generator
// stamps onto rows as customerId/customerName.
import { CUSTOMERS as DATA_CUSTOMERS } from '../data/master-data.js'

const CustomersContext = createContext(null)

// Planner's book — the original partial customer list (S-Home). These names have
// no shipment data behind them; selecting one legitimately contributes 0 rows to
// the Shipments grid (S79c decision 10 — that IS the feature, not a bug).
const LEGACY_NAMES = [
  'Kemira NA', 'Kemira EU', 'Geon', 'Valtris', 'USALCO',
  'Dubois', 'Solenis', 'Etex', 'Monument', 'Grace', 'IMCD',
]

// Legacy label → data-pool id, for entries that exist in BOTH lists. The merged
// entry becomes the data-backed one (keeps its favorite/selection slot).
const LEGACY_TO_DATA = { USALCO: 'USALCO_SYS_01' }

// Union of the planner's book + the data-pool customers, deduped (S79c decision
// 10). Data-backed entries carry `dataId` — the customerId stamped on shipment
// rows — which is what the grid/search scoping filters on. Entries without a
// dataId are selectable but data-less.
function initialCustomers() {
  const list = []
  const merged = new Set()
  LEGACY_NAMES.forEach((label, i) => {
    const dataId = LEGACY_TO_DATA[label]
    const data = dataId ? DATA_CUSTOMERS.find((c) => c.id === dataId) : null
    if (data) {
      merged.add(data.id)
      list.push({ id: data.id, label: data.name, dataId: data.id, favorite: i < 3 })
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
  // Default selection = the original c1/c2/c3 (Kemira NA/EU, Geon — data-less)
  // + ERCO (data-backed), so the default Shipments table shows ERCO's rows.
  const [selectedIds, setSelectedIds] = useState(() => new Set(['c1', 'c2', 'c3', 'ERCO_SYS_01']))
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

import { createContext, useContext, useState, useCallback } from 'react'

const CustomersContext = createContext(null)

export function CustomersProvider({ children }) {
  const [customers, setCustomers] = useState(() => {
    // Partial customer list — full list will be provided later.
    const names = [
      'Kemira NA', 'Kemira EU', 'Geon', 'Valtris', 'USALCO',
      'Dubois', 'Solenis', 'Etex', 'Monument', 'Grace', 'IMCD',
    ]
    return names.map((label, i) => ({
      id: `c${i + 1}`,
      label,
      favorite: i < 3,
    }))
  })
  const [selectedIds, setSelectedIds] = useState(() => new Set(['c1', 'c2', 'c3']))
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

  return (
    <CustomersContext.Provider
      value={{ customers, selectedIds, modalOpen, openModal, closeModal, toggleModal, toggleFavorite, toggleSelect, deleteCustomer }}
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

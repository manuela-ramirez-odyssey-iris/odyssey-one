import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { ComboBox } from '@odyssey/ui'
import ColumnPanel from '../../../detail/ColumnPanel.jsx'
import ProductGrid from '../ProductGrid.jsx'
import { useResolveMode } from '../../resolve/ResolveModeContext.jsx'
import { PRODUCT_COLUMNS, EQUIPMENT_CASE, columnsForEquipment } from '../productColumns'

/**
 * Product Information — rebuilt 2026-07-28 (Figma 5347:10752 / 6025:28087;
 * plan 2026-07-28-orders-product-information.md). Toolbar per the FILLED
 * mock's layout in both states (user ruling): "N products added" left,
 * Search right. Columns are equipment-driven (LINX-13893 cases) and
 * user-arrangeable via the generalized shipments ColumnPanel — arrangement
 * state persists section-locally (Accordion keeps children mounted), the
 * same lifespan the Shipments panel has. Changing the equipment CASE resets
 * the arrangement (different column universe).
 */
export default function ProductInformationSection() {
  const { control } = useFormContext()
  const locked = !!useResolveMode() // product fields are never in the error pool
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef(null)
  const rootRef = useRef(null)

  // Push model (user directive 2026-07-29, Shipments parity): while the panel
  // is open the whole create page shifts left by the panel width instead of
  // being overlaid. The page container lives above this section, so the class
  // is toggled on the nearest .create-order-page ancestor.
  // ponytail: DOM class toggle, lift panel state to the route if a second
  // section ever needs the dock.
  useEffect(() => {
    const pageEl = rootRef.current?.closest('.create-order-page')
    if (!pageEl) return
    pageEl.classList.toggle('co-panel-pushed', panelOpen)
    return () => pageEl.classList.remove('co-panel-pushed')
  }, [panelOpen])

  const products = useWatch({ control, name: 'products' }) ?? []
  const equipment = useWatch({ control, name: 'general.equipment' })
  const caseId = EQUIPMENT_CASE[equipment] ?? 1
  const caseColumns = columnsForEquipment(equipment)

  // Arrangement state — reset when the equipment case changes (new universe)
  const [visibleColumns, setVisibleColumns] = useState(caseColumns)
  const caseRef = useRef(caseId)
  if (caseRef.current !== caseId) {
    caseRef.current = caseId
    setVisibleColumns(caseColumns)
  }

  const allColumns = useMemo(
    () => caseColumns.map((k) => ({ key: k, label: PRODUCT_COLUMNS[k].label })),
    [caseColumns],
  )
  const presets = useMemo(() => ({
    custom: [{ id: 'default-products', name: 'Default Columns', columns: caseColumns }],
    odyssey: [],
  }), [caseColumns])

  // Default = header-only table, NO pending row (Figma 5368:14750 — user
  // correction 2026-07-28); Add Product creates the first row.
  // Counter tracks ROWS added (user ruling 2026-07-28): bumps the moment
  // Add Product creates a line, blank or not — earlier committed-value
  // definitions read "0 products added" against visible rows.
  const addedCount = products.length

  return (
    <div className="co-section-body" ref={rootRef}>
      {/* 18px rhythm: toolbar → table → Add Product (mock measure) */}
      <div className="co-prod-stack">
        <div className="co-product-toolbar">
          <p className="co-product-count text-label-sm-regular">{addedCount} products added</p>
          <ComboBox
            className="co-product-search"
            disabled={locked}
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search"
          />
        </div>

        <ProductGrid
          disabled={locked}
          columnKeys={visibleColumns}
          equipment={equipment}
          search={search}
          onOpenColumns={() => setPanelOpen(true)}
        />
      </div>

      {/* Overlay drawer (fixed dock below the navbar) — the create page has no
          flex dock like ShipmentsRoute; dismissals route through requestClose()
          so unsaved arrangement changes can intercept (same guard as Shipments) */}
      {panelOpen && (
        <div
          className="right-panel-scrim"
          onMouseDown={() => { panelRef.current?.requestClose() }}
        />
      )}
      <div className={`co-product-panel-dock right-panel-dock${panelOpen ? ' right-panel-dock--open' : ''}`}>
        <ColumnPanel
          key={caseId}
          ref={panelRef}
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          visibleColumns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          allColumns={allColumns}
          presets={presets}
          defaultPresetId="default-products"
        />
      </div>
    </div>
  )
}

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { RightPanel, MenuRowRadio, MenuRowCheckbox, SearchField, IconButtonGhost, DropdownMenu, MenuRow } from '@odyssey/ui'
import { EllipsisVertical } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

export const ALL_COLUMNS = [
  { key: 'buyShipment', label: 'Buy Shipment #' },
  { key: 'sellShipment', label: 'Sell Shipment #' },
  { key: 'orders', label: 'Order #' },
  { key: 'orderCount', label: 'Order Count' },
  { key: 'proBookingNumber', label: 'Pro#/Booking #' },
  { key: 'customerId', label: 'Customer ID' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'consignor', label: 'Consignor' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'distance', label: 'Distance' },
  { key: 'stops', label: 'Stops' },
  { key: 'shipDirection', label: 'Ship Direction' },
  { key: 'pickupDate', label: 'Pickup Date' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'earliestPickupDate', label: 'Earliest Pickup Date' },
  { key: 'latestPickupDate', label: 'Latest Pickup Date' },
  { key: 'earliestDeliveryDate', label: 'Earliest Delivery Date' },
  { key: 'latestDeliveryDate', label: 'Latest Delivery Date' },
  { key: 'mode', label: 'Mode' },
  { key: 'equipmentCode', label: 'Equipment Code' },
  { key: 'equipmentNumber', label: 'Equipment #' },
  { key: 'sealNumber', label: 'Seal Number' },
  { key: 'incotermInfo', label: 'Incoterm Info' },
  { key: 'freightTerms', label: 'Freight Terms' },
  { key: 'scac', label: 'SCAC' },
  { key: 'tenderStatus', label: 'Tender Status' },
  { key: 'shipmentStatus', label: 'Shipment Status' },
  { key: 'grossWeight', label: 'Gross Weight' },
  { key: 'netWeight', label: 'Net Weight' },
  { key: 'tareWeight', label: 'Tare Weight' },
  { key: 'pkgCount', label: 'Pkg Count' },
  { key: 'hazardous', label: 'Hazardous' },
  { key: 'apFreightCost', label: 'AP Freight Cost' },
  { key: 'preferredApDirectCost', label: 'Preferred AP Direct Cost' },
  { key: 'arFreightCost', label: 'AR Freight Cost' },
  { key: 'preferredArDirectCost', label: 'Preferred AR Direct Cost' },
  { key: 'loadNumber', label: 'Load #' },
  { key: 'loadCount', label: 'Load Count' },
  { key: 'loadStatus', label: 'Load Status' },
  { key: 'shipmentType', label: 'Shipment Type' },
  { key: 'shipmentSequenceLeg', label: 'Shipment Sequence Leg' },
  { key: 'nextShipmentId', label: 'Next Shipment ID' },
  { key: 'validationMessage', label: 'Validation Message' },
]

// Sell Shipment # leads the default profiles, Buy Shipment # second. Sell is the
// contract identity (grid row → detail link key = sellShipment); surfacing it first
// is a deliberate reminder of that data decision. Buy stays prominent (second) since
// it's the number users actually care about. See progress.md Session 43.
const DEFAULT_COLUMNS = [
  'sellShipment', 'buyShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost', 'validationMessage',
]

export const EXCEPTIONS_DEFAULT_COLUMNS = [
  'sellShipment', 'buyShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost', 'validationMessage',
]

export const MONITORING_DEFAULT_COLUMNS = [
  'sellShipment', 'buyShipment', 'customerId', 'shipmentStatus', 'tenderStatus', 'scac',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'stops',
  'grossWeight', 'mode', 'equipmentCode',
]

export const PRESETS = {
  custom: [
    { id: 'default-exceptions', name: 'Default Exceptions', columns: EXCEPTIONS_DEFAULT_COLUMNS },
    { id: 'default-monitoring', name: 'Default Monitoring', columns: MONITORING_DEFAULT_COLUMNS },
  ],
  odyssey: [
    { id: 'logistics', name: 'Logistics View', columns: ['buyShipment', 'customerId', 'shipmentStatus', 'origin', 'destination', 'mode', 'equipmentCode', 'grossWeight', 'pickupDate', 'deliveryDate'] },
    { id: 'financial', name: 'Financial View', columns: ['buyShipment', 'customerId', 'shipmentStatus', 'orders', 'apFreightCost', 'grossWeight', 'mode', 'scac'] },
    { id: 'carrier', name: 'Carrier View', columns: ['buyShipment', 'shipmentStatus', 'scac', 'mode', 'equipmentCode', 'pickupDate', 'deliveryDate', 'origin', 'destination', 'apFreightCost'] },
  ],
}

export { DEFAULT_COLUMNS }

function getPresetById(id) {
  const all = [...PRESETS.custom, ...PRESETS.odyssey]
  return all.find(p => p.id === id)
}

function getPresetByColumns(columns) {
  const all = [...PRESETS.custom, ...PRESETS.odyssey]
  return all.find(p => {
    if (p.columns.length !== columns.length) return false
    return p.columns.every((c, i) => c === columns[i])
  })
}

const arraysEqual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

/** Uppercase section label — matches the RightPanel preset-group header style.
 *  Optional `action` renders on the trailing side (e.g. the ⋮ preset-actions menu). */
function GroupLabel({ children, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--spacing-2)',
      minHeight: 28,
      padding: 'var(--spacing-1) 0',
      marginBottom: 'var(--spacing-1)',
    }}>
      <span style={{
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-primary)',
        fontSize: 'var(--font-size-xs)',
        lineHeight: 'var(--line-height-xs)',
        fontWeight: 'var(--font-weight-medium)',
        letterSpacing: 'var(--letter-spacing-wide)',
        textTransform: 'uppercase',
      }}>
        {children}
      </span>
      {action}
    </div>
  )
}

/**
 * PresetActionsMenu — the ⋮ IconButtonGhost in the Custom Presets header. Opens an
 * anchored DropdownMenu of preset actions (right-aligned to the trigger, flips up near
 * the viewport bottom). Composes IconButtonGhost + DropdownMenu + MenuRow; closes on
 * select / outside-click / scroll / resize.
 */
function PresetActionsMenu({ options }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const t = triggerRef.current
    const m = menuRef.current
    if (!t || !m) return
    const r = t.getBoundingClientRect()
    const gap = 4
    const mh = m.offsetHeight
    const openUp = r.bottom + gap + mh > window.innerHeight && r.top - gap - mh > 0
    setPos({
      top: openUp ? r.top - gap - mh : r.bottom + gap,
      left: r.right - m.offsetWidth, // right-align the menu to the trigger
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScrollResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }, [open])

  return (
    <>
      <span ref={triggerRef} style={{ display: 'inline-flex' }}>
        <IconButtonGhost
          icon={<EllipsisVertical {...ICON_LG} aria-hidden="true" />}
          ariaLabel="Preset actions"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        />
      </span>
      {open && createPortal(
        <div
          ref={menuRef}
          style={pos
            ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }
            : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 200 }}
        >
          <DropdownMenu>
            {options.map((opt) => (
              <MenuRow
                key={opt.label}
                label={opt.label}
                variant="select"
                role="menuitem"
                tabIndex={0}
                onClick={() => { opt.onSelect?.(); setOpen(false) }}
              />
            ))}
          </DropdownMenu>
        </div>,
        document.body,
      )}
    </>
  )
}

/**
 * ColumnPanel — Shipments data-column arrange feature, built on the normalized RightPanel
 * shell + Row-family controls (MenuRowRadio / MenuRowCheckbox) + SearchField + Button.
 *
 * Two views inside the same RightPanel (a directional slide animates the transition):
 *  - **presets**: Custom + Odyssey preset groups. The radio area selects/applies a preset
 *    (live); the row body (chevron) opens that preset for editing → arrangement.
 *  - **arrangement (editing a preset)**: the header title becomes the preset name + a
 *    pencil to rename it. "Selected columns" (drag-reorder, uncheck-remove) + "Available
 *    columns" (search, check-add) edit a DRAFT. Any pending change (column toggle/move OR
 *    a name edit) raises the RightPanel footer with Cancel / Save — Save commits the draft
 *    to the table (+ the new name), Cancel reverts.
 *
 * Public API unchanged (drop-in for ShipmentsRoute): `{ isOpen, onClose, visibleColumns,
 * onColumnsChange }` + the exported column/preset constants.
 */
export default function ColumnPanel({ isOpen, onClose, visibleColumns, onColumnsChange }) {
  const [view, setView] = useState('presets')
  const [activePresetId, setActivePresetId] = useState('default-exceptions')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [slideDir, setSlideDir] = useState('forward')

  // Editing session drafts — staged until Save (the ModalFooter).
  const [draftColumns, setDraftColumns] = useState(visibleColumns)
  const [presetNames, setPresetNames] = useState(() => {
    const m = {}
    ;[...PRESETS.custom, ...PRESETS.odyssey].forEach(p => { m[p.id] = p.name })
    return m
  })
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')

  const activePreset = getPresetById(activePresetId)
  const currentName = presetNames[activePresetId] || (activePreset ? activePreset.name : 'Preset')

  const columnsDirty = !arraysEqual(draftColumns, visibleColumns)
  const showFooter = view === 'arrangement' && (columnsDirty || editingName)

  // Arrangement lists reflect the DRAFT (pending) columns, not the committed table.
  const selectedColumns = useMemo(
    () => draftColumns.map(key => ALL_COLUMNS.find(c => c.key === key)).filter(Boolean),
    [draftColumns],
  )
  const availableColumns = useMemo(() => {
    const draftSet = new Set(draftColumns)
    let cols = ALL_COLUMNS.filter(c => !draftSet.has(c.key))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      cols = cols.filter(c => c.label.toLowerCase().includes(q))
    }
    return cols
  }, [draftColumns, searchQuery])

  const handlePresetSelect = (presetId) => {
    setActivePresetId(presetId)
    const preset = getPresetById(presetId)
    if (preset) onColumnsChange(preset.columns)
  }

  const handleNavigateToArrangement = (presetId) => {
    setActivePresetId(presetId)
    const preset = getPresetById(presetId)
    const cols = preset ? preset.columns : visibleColumns
    if (preset) onColumnsChange(preset.columns) // opening a preset loads it
    setDraftColumns(cols)
    setEditingName(false)
    setSearchQuery('')
    setSlideDir('forward')
    setView('arrangement')
  }

  const handleBack = () => {
    setDraftColumns(visibleColumns)
    setEditingName(false)
    setSearchQuery('')
    setSlideDir('back')
    setView('presets')
  }

  const handleToggleColumn = (key, checked) => {
    setDraftColumns(checked ? [...draftColumns, key] : draftColumns.filter(k => k !== key))
  }

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    setDragOverIndex(null)
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(fromIndex) || fromIndex === toIndex) return
    const newCols = [...draftColumns]
    const [moved] = newCols.splice(fromIndex, 1)
    newCols.splice(toIndex, 0, moved)
    setDraftColumns(newCols)
  }

  const handleEditName = () => {
    setDraftName(currentName)
    setEditingName(true)
  }

  const handleSave = () => {
    if (editingName) {
      setPresetNames(prev => ({ ...prev, [activePresetId]: draftName.trim() || currentName }))
      setEditingName(false)
    }
    if (columnsDirty) onColumnsChange(draftColumns)
  }

  const handleCancel = () => {
    setDraftColumns(visibleColumns)
    setEditingName(false)
    setDraftName('')
  }

  // Closing always returns to the presets list and cancels any in-flight title edit.
  // Deferred past the slide-out so the view doesn't visibly swap while the panel closes;
  // activePresetId is intentionally NOT reset, so the same preset stays selected on reopen.
  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setView('presets')
      setSearchQuery('')
      setSlideDir('back')
      setEditingName(false)
      setDraftName('')
    }, 320)
  }

  // Custom-preset actions (UI only — behaviour to be specced next session).
  const presetMenuOptions = [
    { label: 'New Preset', onSelect: () => {} },
    { label: 'Delete Presets', onSelect: () => {} },
  ]

  const presetsView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
      <div>
        <GroupLabel action={<PresetActionsMenu options={presetMenuOptions} />}>Custom Presets</GroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          {PRESETS.custom.map(preset => (
            <MenuRowRadio
              key={preset.id}
              label={presetNames[preset.id]}
              selected={preset.id === activePresetId}
              onSelect={() => handlePresetSelect(preset.id)}
              onNavigate={() => handleNavigateToArrangement(preset.id)}
            />
          ))}
        </div>
      </div>
      <div>
        <GroupLabel>Odyssey Presets</GroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          {PRESETS.odyssey.map(preset => (
            <MenuRowRadio
              key={preset.id}
              label={presetNames[preset.id]}
              selected={preset.id === activePresetId}
              onSelect={() => handlePresetSelect(preset.id)}
              onNavigate={() => handleNavigateToArrangement(preset.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )

  const arrangementView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
      {/* Selected columns — drag to reorder, uncheck to remove */}
      <div>
        <GroupLabel>Selected columns ({selectedColumns.length})</GroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          {selectedColumns.map((col, index) => (
            <div
              key={col.key}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(index))
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverIndex(index)
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                borderTop: dragOverIndex === index ? '2px solid var(--border-focus)' : '2px solid transparent',
                transition: 'border-top-color var(--transition-fast)',
              }}
            >
              <MenuRowCheckbox
                label={col.label}
                checked
                draggable
                value={col.key}
                onToggle={() => handleToggleColumn(col.key, false)}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      {/* Available columns — search + check to add */}
      <div>
        <GroupLabel>Available columns</GroupLabel>
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <SearchField
            value={searchQuery}
            placeholder="Search columns"
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          {availableColumns.map(col => (
            <MenuRowCheckbox
              key={col.key}
              label={col.label}
              checked={false}
              draggable={false}
              value={col.key}
              onToggle={() => handleToggleColumn(col.key, true)}
            />
          ))}
        </div>
        {availableColumns.length === 0 && searchQuery.trim() && (
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)', padding: 'var(--spacing-2) var(--spacing-3)' }}>
            No columns match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  )

  // In arrangement the title shows the (draft) preset name; the shell renders the in-place
  // editable title + pencil + slide-in. The name value lives here (draftName/currentName)
  // and is handed to the shell via title/onTitleChange.
  const headerTitle = view !== 'arrangement'
    ? 'Fixed columns'
    : (editingName ? draftName : currentName)

  return (
    <RightPanel
      open={isOpen}
      title={headerTitle}
      subtitle="Column Arrangement"
      editableTitle={view === 'arrangement'}
      editingTitle={editingName}
      onEditTitle={handleEditName}
      onTitleChange={setDraftName}
      onTitleCommit={handleSave}
      onTitleCancel={handleCancel}
      onClose={handleClose}
      onBack={view === 'arrangement' ? handleBack : undefined}
      footer={showFooter}
      onCancel={handleCancel}
      onSave={handleSave}
    >
      <div key={view} className={`column-arrange-view column-arrange-view--${slideDir}`}>
        {view === 'presets' ? presetsView : arrangementView}
      </div>
    </RightPanel>
  )
}

import { useState, useMemo, useRef, useEffect, useLayoutEffect, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { RightPanel, MenuRowRadio, MenuRowCheckbox, ComboBox, IconButtonGhost, DropdownMenu, MenuRow, ModalMedium, Button } from '@odyssey/ui'
import { EllipsisVertical } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

// Open width (px) of the right-side arrangement panels (Column + Tab).
// Must stay in sync with --right-panel-width in packages/tokens/tokens.css,
// which sizes .right-panel / .right-panel-dock in CSS.
export const RIGHT_PANEL_WIDTH = 343

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

// Buy Shipment # leads the default profiles — the team decided buyShipment is THE
// shipment ID users work with (LINX-11591 approved grid field list, LINX-12490
// buy-keyed orders endpoint, LINX-13023). Sell Shipment # stays second: it remains
// the internal wire key (grid row → detail link = sell-shipment-out/{sellShipment}).
// Supersedes the S43 sell-first ordering; see decision-log DEC entry.
const DEFAULT_COLUMNS = [
  'buyShipment', 'sellShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost', 'validationMessage',
]

export const EXCEPTIONS_DEFAULT_COLUMNS = [
  'buyShipment', 'sellShipment', 'customerId', 'shipmentStatus', 'orderCount',
  'pickupDate', 'deliveryDate', 'origin', 'destination', 'grossWeight',
  'mode', 'equipmentCode', 'scac', 'orders', 'apFreightCost', 'validationMessage',
]

export const MONITORING_DEFAULT_COLUMNS = [
  'buyShipment', 'sellShipment', 'customerId', 'shipmentStatus', 'tenderStatus', 'scac',
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
 *  Optional `action` renders on the trailing side (e.g. the ⋮ preset-actions menu).
 *  Exported for sibling arrangement panels (TabArrangementPanel). */
export function GroupLabel({ children, action }) {
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

// Built-in preset ids — the shipped presets (both groups). Used by the empty-preset
// prune (shipped presets are never pruned) and to detect a brand-new user preset. In delete
// mode EVERY row in the Custom Presets group gets a checkbox (Figma 4301:19405 — including
// the shipped Default Exceptions / Default Monitoring); the Odyssey group renders disabled.
const builtInPresetIds = (presets) => new Set([
  ...presets.custom.map(p => p.id),
  ...presets.odyssey.map(p => p.id),
])

/**
 * ColumnPanel — Shipments data-column arrange feature, built on the normalized RightPanel
 * shell + Row-family controls (MenuRowRadio / MenuRowCheckbox) + ComboBox + Button.
 *
 * Two views inside the same RightPanel (a directional slide animates the transition):
 *  - **presets**: Custom + Odyssey preset groups. The radio area selects/applies a preset
 *    (live); the row body (chevron) opens that preset for editing → arrangement. The ⋮
 *    menu offers **New Preset** (creates an empty user preset and jumps straight into its
 *    arrangement with the title edit active — content stays interactive, no scrim; Figma
 *    4301:18937) and **Delete Presets** (batch delete mode, Figma 4301:19405: every Custom
 *    Presets row swaps its radio for a bordered Checkbox, the Odyssey group disables, and
 *    the footer becomes Cancel / "Delete (n)"; Delete asks for confirmation in a
 *    ModalMedium).
 *  - **arrangement (editing a preset)**: the header title becomes the preset name + a
 *    pencil to rename it. "Selected columns" (drag-reorder, uncheck-remove) + "Available
 *    columns" (search, check-add) edit a DRAFT. Any pending change (column toggle/move OR
 *    a name change) raises the RightPanel footer with Cancel / Save — Save commits the
 *    draft to the preset + the table (+ the new name), Cancel reverts. An EMPTY draft
 *    (zero columns) shows the centered "No columns selected yet." placeholder; an empty
 *    preset cannot be saved — a brand-new preset keeps its footer visible ("Save New
 *    Preset", Figma 4301:18937) with Save disabled until a column is added, while an
 *    existing preset hides the footer when emptied.
 *
 * Closing (X or the route's outside-click) is guarded: with pending changes the panel
 * shows an exit confirmation ModalMedium — Confirm discards + closes, Cancel stays and
 * pulses the footer buttons (carolina-blue border) to point at Save/Cancel. The route
 * reaches the guard through the imperative `requestClose()` handle (forwardRef); it
 * returns `false` when the close was intercepted.
 *
 * Persistence follows the existing mechanism — component state, route lifespan (same as
 * `presetNames` before this change): `customPresets` (user preset list) + `presetColumns`
 * (committed column overrides per preset id).
 *
 * Public API otherwise unchanged (drop-in for ShipmentsRoute): `{ isOpen, onClose,
 * visibleColumns, onColumnsChange }` + the exported column/preset constants.
 *
 * Generalized 2026-07-28 (Product Information reuse): `allColumns` / `presets` /
 * `defaultPresetId` are props defaulting to the Shipments constants — Shipments
 * call sites are byte-identical. An empty `presets.odyssey` hides that group.
 */
const ColumnPanel = forwardRef(function ColumnPanel({
  isOpen,
  onClose,
  visibleColumns,
  onColumnsChange,
  allColumns = ALL_COLUMNS,
  presets = PRESETS,
  defaultPresetId = 'default-exceptions',
  // Persistence seam (S101): a previously saved preset-store snapshot to hydrate
  // from, and a callback fired at COMMIT points only (Save / confirmed delete)
  // with the next snapshot — the owner persists it (user_preferences API).
  initialPresetState = null,
  onPresetStateChange,
}, ref) {
  const BUILT_IN_PRESET_IDS = useMemo(() => builtInPresetIds(presets), [presets])
  const [view, setView] = useState('presets')
  const [activePresetId, setActivePresetId] = useState(initialPresetState?.activePresetId ?? defaultPresetId)
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [slideDir, setSlideDir] = useState('forward')

  // Preset store — extends the pre-existing state mechanism (route lifespan, no new
  // storage): the user-editable preset list + committed column overrides + names.
  const [customPresets, setCustomPresets] = useState(initialPresetState?.customPresets ?? presets.custom)
  const [presetColumns, setPresetColumns] = useState(initialPresetState?.presetColumns ?? {})
  const [presetNames, setPresetNames] = useState(() => {
    const m = {}
    ;[...presets.custom, ...presets.odyssey].forEach(p => { m[p.id] = p.name })
    return { ...m, ...initialPresetState?.presetNames }
  })

  // Editing session drafts — staged until Save (the ModalFooter).
  const [draftColumns, setDraftColumns] = useState(visibleColumns)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')

  // Batch delete mode (presets view) + the two confirmation dialogs + footer pulse.
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteSelection, setDeleteSelection] = useState(() => new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [footerPulse, setFooterPulse] = useState(false)

  const editStartNameRef = useRef('') // title value when the edit began (Escape revert)
  const prevPresetIdRef = useRef(null) // preset active before New Preset (restored on prune)
  const pulseTimerRef = useRef(null)
  const exitIntentRef = useRef('close') // what raised the unsaved dialog: 'close' (X/outside) or 'back'

  const findPreset = (id) => customPresets.find(p => p.id === id) || presets.odyssey.find(p => p.id === id)
  // Committed columns for a preset — the saved override, else the shipped definition.
  const committedColumnsFor = (id) => presetColumns[id] ?? findPreset(id)?.columns ?? []

  const activePreset = findPreset(activePresetId)
  const currentName = presetNames[activePresetId] || (activePreset ? activePreset.name : 'Preset')

  const baseColumns = committedColumnsFor(activePresetId)
  const columnsDirty = view === 'arrangement' && !arraysEqual(draftColumns, baseColumns)
  const nameDirty = view === 'arrangement' && draftName.trim() !== currentName
  const hasPendingChanges = columnsDirty || nameDirty
  // A brand-new user preset = user-created and never saved (no committed override yet).
  const isNewPreset = !BUILT_IN_PRESET_IDS.has(activePresetId) && presetColumns[activePresetId] === undefined
  // Footer: a NEW preset always shows it ("Save New Preset", Figma 4301:18937) with Save
  // disabled while the draft is empty — an empty preset cannot be saved. An existing preset
  // shows it only with pending changes, and hides it entirely when emptied. In the presets
  // view it doubles as the delete-mode Cancel / "Delete (n)" bar (Figma 4301:19405).
  const showFooter = view === 'arrangement'
    ? (isNewPreset || (draftColumns.length > 0 && (columnsDirty || nameDirty || editingName)))
    : deleteMode
  const footerSaveLabel = view === 'presets' && deleteMode
    ? `Delete (${deleteSelection.size})`
    : isNewPreset ? 'Save New Preset' : 'Save'
  const footerSaveDisabled = view === 'arrangement' && draftColumns.length === 0

  // Arrangement lists reflect the DRAFT (pending) columns, not the committed table.
  const selectedColumns = useMemo(
    () => draftColumns.map(key => allColumns.find(c => c.key === key)).filter(Boolean),
    [draftColumns, allColumns],
  )
  const availableColumns = useMemo(() => {
    const draftSet = new Set(draftColumns)
    let cols = allColumns.filter(c => !draftSet.has(c.key))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      cols = cols.filter(c => c.label.toLowerCase().includes(q))
    }
    return cols
  }, [draftColumns, searchQuery])

  const handlePresetSelect = (presetId) => {
    setActivePresetId(presetId)
    const cols = committedColumnsFor(presetId)
    if (cols.length) onColumnsChange(cols)
  }

  const handleNavigateToArrangement = (presetId) => {
    setActivePresetId(presetId)
    const cols = committedColumnsFor(presetId)
    if (cols.length) onColumnsChange(cols) // opening a preset loads it (never an empty set)
    setDraftColumns(cols)
    setDraftName(presetNames[presetId] ?? findPreset(presetId)?.name ?? 'Preset')
    setEditingName(false)
    setSearchQuery('')
    setSlideDir('forward')
    setView('arrangement')
  }

  // A user preset with zero COMMITTED columns was never saved — drop it when its
  // arrangement view is left (back / close / discard), restoring the prior selection.
  // Guarantees the presets list never contains an empty (un-applyable) preset.
  const pruneEmptyPreset = (id) => {
    if (BUILT_IN_PRESET_IDS.has(id)) return
    if ((presetColumns[id] ?? []).length > 0) return
    setCustomPresets(prev => prev.filter(p => p.id !== id))
    setActivePresetId(prevPresetIdRef.current ?? defaultPresetId)
    prevPresetIdRef.current = null
  }

  // Leave the arrangement view for the presets list, discarding the draft.
  // (`handleBack` below guards this behind the unsaved-changes dialog.)
  const performBack = () => {
    revertAppliedColumns() // live-applied draft edits roll back with the draft
    pruneEmptyPreset(activePresetId)
    setDraftColumns(baseColumns)
    setDraftName(currentName)
    setEditingName(false)
    setSearchQuery('')
    setSlideDir('back')
    setView('presets')
  }

  // Back honors the same unsaved-changes guard as closing: pending draft changes
  // raise the exit-confirmation dialog (confirm → discard + go to list; cancel →
  // stay + footer pulse) instead of silently discarding.
  const handleBack = () => {
    if (hasPendingChanges) {
      exitIntentRef.current = 'back'
      setShowExitConfirm(true)
      return
    }
    performBack()
  }

  // Live-apply (user 2026-07-29): draft edits render on the table IMMEDIATELY —
  // dragging reorders live, toggles show/hide live. Save only makes the draft
  // durable (preset commit + persistence); Cancel/Back/discard revert the table
  // to the committed columns via revertAppliedColumns.
  const handleToggleColumn = (key, checked) => {
    const next = checked ? [...draftColumns, key] : draftColumns.filter(k => k !== key)
    setDraftColumns(next)
    if (next.length) onColumnsChange(next) // empty draft: table keeps last state (Save is disabled anyway)
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
    onColumnsChange(newCols)
  }

  // Restore the last COMMITTED columns after a discard. A pruned brand-new
  // preset has no committed columns — fall back to the previously selected
  // (or default) preset, mirroring pruneEmptyPreset's selection restore.
  const revertAppliedColumns = () => {
    let cols = committedColumnsFor(activePresetId)
    if (!cols.length) cols = committedColumnsFor(prevPresetIdRef.current ?? defaultPresetId)
    if (cols.length) onColumnsChange(cols)
  }

  // Title edit lifecycle — the edited value stays a PENDING draft (draftName) after
  // Enter; only Save commits it. Escape reverts to the value the edit started from.
  const handleEditName = () => {
    editStartNameRef.current = draftName
    setEditingName(true)
  }
  const handleTitleCommit = () => setEditingName(false)
  const handleTitleCancel = () => {
    setEditingName(false)
    setDraftName(editStartNameRef.current || currentName)
  }

  const handleSave = () => {
    if (draftColumns.length === 0) return // empty preset is unsavable (footer Save is disabled)
    const wasNew = isNewPreset // capture before the commit flips it
    const name = draftName.trim() || currentName
    const nextNames = { ...presetNames, [activePresetId]: name }
    setPresetNames(nextNames)
    setDraftName(name)
    setEditingName(false)
    let nextColumns = presetColumns
    if (columnsDirty) {
      nextColumns = { ...presetColumns, [activePresetId]: draftColumns }
      setPresetColumns(nextColumns)
      onColumnsChange(draftColumns)
    }
    // Persistence commit point — Save is the only place edits become durable.
    onPresetStateChange?.({ customPresets, presetColumns: nextColumns, presetNames: nextNames, activePresetId })
    // Saving a brand-new preset closes the whole panel (preset persisted + applied).
    // Skip the deferred prune — this render's presetColumns closure predates the
    // commit above and would wrongly see the just-saved preset as empty.
    if (wasNew) doClose({ prune: false })
  }

  const handleCancel = () => {
    // Footer Cancel on a brand-new (never-committed) preset saves nothing: the
    // empty/unsaved preset is pruned (doClose's deferred cleanup) and the WHOLE
    // panel closes — an explicit discard, so no unsaved-changes dialog.
    if (isNewPreset) {
      setDraftColumns([])
      setEditingName(false)
      revertAppliedColumns()
      doClose()
      return
    }
    setDraftColumns(baseColumns)
    setDraftName(currentName)
    setEditingName(false)
    revertAppliedColumns()
  }

  // Closing always returns to the presets list and cancels any in-flight title edit.
  // Deferred past the slide-out so the view doesn't visibly swap while the panel closes;
  // activePresetId is intentionally NOT reset, so the same preset stays selected on reopen
  // (unless it was an unsaved empty preset, which is pruned).
  const doClose = ({ prune = true } = {}) => {
    onClose()
    setTimeout(() => {
      if (prune) pruneEmptyPreset(activePresetId)
      setView('presets')
      setSearchQuery('')
      setSlideDir('back')
      setEditingName(false)
      setDraftName('')
      setDeleteMode(false)
      setDeleteSelection(new Set())
    }, 320)
  }

  // Close guard — every dismissal (X, outside click, panel toggle) funnels here. With
  // pending changes the exit-confirmation dialog intercepts; returns false so the caller
  // knows the panel stayed open. Delete-mode selection is not "pending" — it discards.
  const requestClose = () => {
    if (hasPendingChanges) {
      exitIntentRef.current = 'close'
      setShowExitConfirm(true)
      return false
    }
    doClose()
    return true
  }
  useImperativeHandle(ref, () => ({ requestClose }))

  // Footer attention pulse — after "stay" in the exit dialog, the Save/Cancel borders
  // flash carolina blue (2 pulses; see .column-panel--footer-pulse in components.css).
  const triggerFooterPulse = () => {
    clearTimeout(pulseTimerRef.current)
    setFooterPulse(true)
    pulseTimerRef.current = setTimeout(() => setFooterPulse(false), 1500)
  }
  useEffect(() => () => clearTimeout(pulseTimerRef.current), [])

  const handleExitConfirmStay = () => {
    setShowExitConfirm(false)
    triggerFooterPulse()
  }
  // Discard routes by what raised the dialog: Back returns to the presets list
  // (draft dropped, panel stays open); Close dismisses the whole panel.
  const handleExitConfirmDiscard = () => {
    setShowExitConfirm(false)
    setDraftColumns(baseColumns)
    setDraftName(currentName)
    setEditingName(false)
    if (exitIntentRef.current === 'back') {
      performBack() // performBack reverts the live-applied draft itself
    } else {
      revertAppliedColumns()
      doClose()
    }
  }

  // New Preset — an empty user preset; jump straight into its arrangement with the
  // title edit active so naming comes first (content stays interactive — Figma 4301:18937).
  // Not applied to the table (it's empty). Leaves delete mode if it was active.
  const handleNewPreset = () => {
    const id = `user-${Date.now()}`
    const name = 'New preset'
    setDeleteMode(false)
    setDeleteSelection(new Set())
    prevPresetIdRef.current = activePresetId
    setCustomPresets(prev => [...prev, { id, name, columns: [] }])
    setPresetNames(prev => ({ ...prev, [id]: name }))
    setActivePresetId(id)
    setDraftColumns([])
    setDraftName(name)
    editStartNameRef.current = name
    setEditingName(true)
    setSearchQuery('')
    setSlideDir('forward')
    setView('arrangement')
  }

  // Delete Presets — batch mode in the presets view (Figma 4301:19405). Every Custom
  // Presets row swaps radio → bordered Checkbox (multi-select); the Odyssey group
  // disables. "Delete (n)" (with a selection) confirms via ModalMedium.
  const handleEnterDeleteMode = () => {
    setDeleteMode(true)
    setDeleteSelection(new Set())
  }
  const handleExitDeleteMode = () => {
    setDeleteMode(false)
    setDeleteSelection(new Set())
  }
  const toggleDeleteSelection = (id) => {
    setDeleteSelection(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const handleDeleteSave = () => {
    if (deleteSelection.size === 0) { handleExitDeleteMode(); return } // nothing selected
    setShowDeleteConfirm(true)
  }
  const handleConfirmDelete = () => {
    const remaining = customPresets.filter(p => !deleteSelection.has(p.id))
    setCustomPresets(remaining)
    let nextActiveId = activePresetId
    if (deleteSelection.has(activePresetId)) {
      // The applied preset was deleted — fall back to the first surviving custom preset
      // (or the first Odyssey preset if the custom group was emptied) and apply it.
      // Both groups emptied (possible with a props-supplied preset set): keep the
      // current table columns, just clear the selection.
      const fallback = remaining[0] ?? presets.odyssey[0]
      if (fallback) {
        nextActiveId = fallback.id
        setActivePresetId(fallback.id)
        onColumnsChange(presetColumns[fallback.id] ?? fallback.columns)
      }
    }
    // Persistence commit point — a confirmed delete is durable, like Save.
    onPresetStateChange?.({ customPresets: remaining, presetColumns, presetNames, activePresetId: nextActiveId })
    setShowDeleteConfirm(false)
    handleExitDeleteMode()
  }

  const presetMenuOptions = [
    { label: 'New Preset', onSelect: handleNewPreset },
    { label: 'Delete Presets', onSelect: handleEnterDeleteMode },
  ]

  const presetsView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
      <div>
        <GroupLabel action={<PresetActionsMenu options={presetMenuOptions} />}>
          Custom Presets
        </GroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          {customPresets.map(preset => {
            const label = presetNames[preset.id] ?? preset.name
            // Delete mode (Figma 4301:19405): EVERY custom row swaps the radio for a
            // bordered Checkbox (batch multi-select for deletion).
            if (deleteMode) {
              return (
                <MenuRowCheckbox
                  key={preset.id}
                  label={label}
                  checked={deleteSelection.has(preset.id)}
                  bordered
                  draggable={false}
                  value={preset.id}
                  onToggle={() => toggleDeleteSelection(preset.id)}
                  aria-label={`Select ${label} for deletion`}
                />
              )
            }
            return (
              <MenuRowRadio
                key={preset.id}
                label={label}
                selected={preset.id === activePresetId}
                onSelect={() => handlePresetSelect(preset.id)}
                onNavigate={() => handleNavigateToArrangement(preset.id)}
              />
            )
          })}
        </div>
      </div>
      {presets.odyssey.length > 0 && <div>
        <GroupLabel>Odyssey Presets</GroupLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          {presets.odyssey.map(preset => (
            <MenuRowRadio
              key={preset.id}
              label={presetNames[preset.id]}
              selected={preset.id === activePresetId}
              disabled={deleteMode}
              onSelect={() => handlePresetSelect(preset.id)}
              onNavigate={deleteMode ? undefined : () => handleNavigateToArrangement(preset.id)}
            />
          ))}
        </div>
      </div>}
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
        {selectedColumns.length === 0 && (
          // Empty-draft placeholder — centered supporting text (Figma 4301:18946):
          // label/xs regular, text-tertiary, spacing-6 vertical / spacing-4 horizontal.
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 'var(--spacing-6) var(--spacing-4)',
          }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              lineHeight: 'var(--line-height-xs)',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
            }}>
              No columns selected yet.
            </span>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      {/* Available columns — search + check to add */}
      <div>
        <GroupLabel>Available columns</GroupLabel>
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <ComboBox
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
  // editable title + pencil + slide-in. The name value lives here (draftName is the pending
  // value — it tracks the committed name while clean) and is handed to the shell via
  // title/onTitleChange.
  const headerTitle = view !== 'arrangement' ? 'Fixed columns' : draftName

  return (
    <>
      <RightPanel
        open={isOpen}
        className={footerPulse ? 'column-panel--footer-pulse' : ''}
        title={headerTitle}
        subtitle="Column Arrangement"
        editableTitle={view === 'arrangement'}
        editingTitle={editingName}
        onEditTitle={handleEditName}
        onTitleChange={setDraftName}
        onTitleCommit={handleTitleCommit}
        onTitleCancel={handleTitleCancel}
        onClose={requestClose}
        onBack={view === 'arrangement' ? handleBack : undefined}
        footer={showFooter}
        saveLabel={footerSaveLabel}
        saveDisabled={footerSaveDisabled}
        onCancel={deleteMode && view === 'presets' ? handleExitDeleteMode : handleCancel}
        onSave={deleteMode && view === 'presets' ? handleDeleteSave : handleSave}
      >
        <div key={view} className={`column-arrange-view column-arrange-view--${slideDir}`}>
          {view === 'presets' ? presetsView : arrangementView}
        </div>
      </RightPanel>

      {/* Exit-without-save confirmation — raised by the close guard while changes are
          pending. Confirm discards + closes; Cancel stays and pulses the footer. */}
      {showExitConfirm && (
        <ModalMedium
          title="Unsaved changes"
          onClose={handleExitConfirmStay}
          ariaLabel="Unsaved changes"
          footer={
            <>
              {/* Staying (Cancel) is the emphasized/safe action — primary; the
                  destructive discard is de-emphasized as secondary. */}
              <Button variant="secondary" size="lg" onClick={handleExitConfirmDiscard}>
                Close without saving
              </Button>
              <Button variant="primary" size="lg" onClick={handleExitConfirmStay}>
                Cancel
              </Button>
            </>
          }
        >
          <p className="text-label-sm-regular" style={{ margin: 0 }}>
            You have unsaved changes to "{(draftName || currentName).trim() || currentName}".
          </p>
          <p className="text-label-sm-regular" style={{ margin: 0 }}>
            Close the panel without saving them?
          </p>
        </ModalMedium>
      )}

      {/* Batch-delete confirmation — raised by Save in delete mode. */}
      {showDeleteConfirm && (
        <ModalMedium
          title="Delete presets"
          onClose={() => setShowDeleteConfirm(false)}
          ariaLabel="Delete presets"
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-label-sm-regular" style={{ margin: 0 }}>
            Delete {deleteSelection.size} selected preset{deleteSelection.size === 1 ? '' : 's'}? This can't be undone.
          </p>
        </ModalMedium>
      )}
    </>
  )
})

export default ColumnPanel

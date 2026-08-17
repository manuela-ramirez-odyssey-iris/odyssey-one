import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TruckElectric, FoldHorizontal, UnfoldHorizontal, Columns3Cog } from 'lucide-react'
import { ICON_MD, ICON_LG } from '@odyssey/tokens'
import { Badge, Button, ModalMedium, Tab } from '@odyssey/ui'
import ColumnPanel from './ColumnPanel.jsx'
import { saveTenderOption } from '../../api/services/shipmentService'
import { parseDollar, fmtDollar } from '../../utils/money'
import { routingOptionVmToDto } from '../../api/mappers/mapSellShipmentOutToDetail'
import { QuoteModal } from './QuoteModal.jsx'
import DroppedCarrierSection from './DroppedCarrierSection'
import { useCurrentUser } from '../../data/sso-mock.js'
import { formatDateTimeMDYHM } from '../../lib/dates.js'

/* ═══════════════════════════════════════════════════════════
   Section 1 — Constants
   ═══════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  Accepted: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  Sent: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  Declined: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  Cancelled: { bg: 'var(--bg-tertiary)', color: 'var(--text-placeholder)' },
}

const LOCKED_COLUMNS = [
  { key: 'routeRank', label: 'Route Rank', primary: true, narrow: true },
  { key: 'rank', label: 'Rank', primary: true, narrow: true },
  { key: 'scac', label: 'SCAC', narrow: true },
  { key: 'carrierName', label: 'Carrier Name', primary: true },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost', narrow: true },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

const NEVER_COLLAPSE_KEYS = ['routeRank', 'rank', 'status']
const COLLAPSIBLE_KEYS = ['scac', 'carrierName', 'equipment', 'cost', 'pickupDateTime', 'deliveryDateTime']


const TAB_COLUMNS = {
  'routing-options': [
    { key: 'transit', label: 'Transit Time' },
    { key: 'distance', label: 'Distance' },
    { key: 'api', label: 'Notify Method' },
    { key: 'notifyDateTime', label: 'Notify Date' },
    { key: 'responseMethod', label: 'Response Method' },
    { key: 'responseDateTime', label: 'Response Date' },
    { key: 'responseUser', label: 'Response User' },
    { key: 'carrierQuoted', label: 'Carrier Quoted', narrow: true },
    { key: 'networkLeverage', label: 'Network Leverage', narrow: true },
  ],
  'notify-response': [
    { key: 'proNumber', label: 'Pro #' },
    { key: 'transportingCarrier', label: 'Transporting Carrier' },
    { key: 'equipNumber', label: 'Equip #' },
    { key: 'routeGroup', label: 'Route Group' },
  ],
  'volume-commitment': [
    { key: 'commitment', label: 'Commitment', narrow: true },
    { key: 'uom', label: 'UOM', narrow: true },
    { key: 'vcEquipNumber', label: 'Equip #' },
    { key: 'vcOpen', label: 'Open', narrow: true },
    { key: 'vcAccept', label: 'Accept', narrow: true },
    { key: 'vcDecline', label: 'Decline', narrow: true },
  ],
  'additional-info': [
    { key: 'carrierPickup', label: 'Carrier Pickup #' },
    { key: 'carrierApiTenderId', label: 'Carrier API Tender ID' },
    { key: 'breakPoint', label: 'Break Point' },
    { key: 'rateSource', label: 'Rate Source' },
    { key: 'distanceSource', label: 'Distance Source' },
    { key: 'description', label: 'Description' },
    { key: 'transitTimeSource', label: 'Transit Time Source' },
    { key: 'transitTimeId', label: 'Transit Time ID' },
    { key: 'loadboardExpiry', label: 'Loadboard Expiry' },
    { key: 'rcpId', label: 'RCP ID' },
    { key: 'lcePkId', label: 'LCE PK_ID' },
  ],
  others: [
    { key: 'modifyUser', label: 'Modify User' },
    { key: 'modifyDate', label: 'Modify Date' },
    { key: 'indirectPoint', label: 'Indirect Point' },
    { key: 'roundTrip', label: 'Round Trip', narrow: true },
    { key: 'customerPreferred', label: 'Customer Preferred', narrow: true },
    { key: 'orderEquip', label: 'Order Equip' },
    { key: 'contactExped', label: 'Contact Exped' },
    { key: 'note', label: 'Note' },
  ],
}

const SUB_TABS = [
  { key: 'routing-options', label: 'Routing Options' },
  { key: 'notify-response', label: 'Notify & Response Method' },
  { key: 'volume-commitment', label: 'View Volume Commitment' },
  { key: 'additional-info', label: 'Additional Info' },
  { key: 'others', label: 'Others' },
]

const TENDER_ACTIONS = {
  null: ['Tender'],
  Sent: ['Accept', 'Decline', 'Cancel'],
  Accepted: ['Cancel'],
  Declined: ['Re-Tender'],
  Cancelled: ['Re-Tender'],
}

const STATUS_AFTER_ACTION = {
  Tender: 'Sent',
  Accept: 'Accepted',
  Decline: 'Declined',
  Cancel: 'Cancelled',
  'Re-Tender': 'Sent',
}

/* Restyled 2026-08-17 against the Tender Table mock (Figma 1596:21526). Every
   visual property of a cell now comes from the CANONICAL Cell contract —
   `.odyssey-table` + the `.text-label-sm-*` utilities (components.css "TABLE —
   Cell contract"), normalized from the same Figma Cell master the mock is built
   from: white 48px cells, 14px/16px padding, border-subtle hairlines, semibold
   text-primary heads (NOT the old 12px uppercase tertiary), regular data cells.
   Only what the canon cannot know stays inline: the sticky header offset, the
   collapse-animation widths, and the per-row status tint. */
const thSticky = { position: 'sticky', top: 0, zIndex: 2 }

// Emphasis columns (Cell Variant=Title) vs plain data cells (Variant=Text).
const cellTypeClass = (emphasis) =>
  emphasis ? 'odyssey-table__cell--title text-label-sm-medium' : 'text-label-sm-regular'

const stickyLastCol = {
  position: 'sticky',
  right: 0,
  zIndex: 3,
  background: 'var(--bg-primary)',
  boxShadow: '-2px 0 4px rgba(0,0,0,0.06)',
}

/* The pinned action lane. 68px is GroupTable's pinned-column floor, reused so the
   two tables' action lanes line up on a page carrying both — and it has to be at
   least that: at the old 50px with 16px side padding the content box was 18px and
   clipped the 38px column-arrange Button (user, 2026-08-17). Padding drops to 8px
   for the same reason. */
const ACTION_LANE = { width: 68, minWidth: 68, maxWidth: 68, padding: '0 var(--spacing-2)', textAlign: 'center' }

/* A `narrow` column's header. Center-aligned like its cells, but NOT wrapped: the
   old two-line labels ("Carrier Quoted", "Network Leverage") made the right half's
   header row 65px against the left half's 48, so the two halves of one split table
   disagreed on where the header ended (user, 2026-08-17). Every cell in the Cell
   contract is nowrap and 48px; a header is not the exception. No width hint either
   — 64px + nowrap would just ellipsize the label it is meant to show. */
const NARROW_TH = { textAlign: 'center' }

const DASH = '--' // LINX-13590 — empty optional values read '--'

/**
 * Apply a column arrangement to a sub-tab's column definitions: ORDER comes from
 * `visibleKeys` (the panel's list), and anything not in it is hidden. A key with
 * no definition is dropped rather than rendered as a blank column — that happens
 * for one render right after a sub-tab switch, while the arrangement still holds
 * the previous tab's keys.
 */
export function orderedTabColumns(defs, visibleKeys) {
  return visibleKeys.map((key) => defs.find((c) => c.key === key)).filter(Boolean)
}

/* ═══════════════════════════════════════════════════════════
   Section 2 — Helper Components
   ═══════════════════════════════════════════════════════════ */

export function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: 1.3, marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {value == null || value === undefined ? '\u2014' : value}
      </div>
    </div>
  )
}

export function SectionHeader({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        paddingBottom: 6,
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function CheckboxField({ label, checked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <input type="checkbox" checked={checked} disabled style={{ accentColor: 'var(--border-focus)', width: 14, height: 14 }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
  const style = STATUS_STYLES[status] || STATUS_STYLES.Declined
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-primary)',
        fontSize: '12px',
        fontWeight: 600,
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        color: style.color,
      }}
    >
      {status}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 5 — ActionDropdown
   ═══════════════════════════════════════════════════════════ */

function ActionDropdown({ option, position, onAction, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const actions = TENDER_ACTIONS[option.status] || TENDER_ACTIONS[null] || []

  // LINX-13894 — Add Quote and Edit Quote are mutually exclusive per option,
  // keyed on whether a USER-entered quote exists. That is exactly what
  // quoteFlag means: LINX-13896 sets 'Y' on save, LINX-13897 sets 'N' on
  // delete, and a contracted-rate option carries neither.
  //
  // This used to read `rateDetails.apTotal > 0`, which was wrong in kind — a
  // CONTRACTED rate also has a positive apTotal, and generate.mjs seeds one on
  // every option (tools/generate.mjs:770). So hasQuote was true for every row
  // in the app: "Add Quote" never rendered, and the contracted-rate confirm
  // below was unreachable dead code.
  const hasQuote = option.quoteFlag === 'Y'

  // LINX-13897 says hide Delete when tender status is Sent/Accepted; LINX-13894's
  // table offers Delete whenever a quote exists with no status condition at all.
  // Both tickets were approved the same day, so this was a genuine conflict.
  // SETTLED 2026-08-16 (user ruling, DEC-102): follow 13897. A quoted option in
  // Sent/Accepted offers Edit only — which is why some quoted rows correctly
  // show no Delete.
  //
  // No separate "is it user-entered" test any more: hasQuote already means
  // that, which retires the `rateSource === 'Manual'` inference S120 flagged as
  // ours rather than Jira's.
  const tenderIsLocked = option.status === 'Sent' || option.status === 'Accepted'
  const canDeleteQuote = hasQuote && !tenderIsLocked

  const btnStyle = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--font-primary)',
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.1s ease',
  }

  return createPortal(
    <div
      ref={ref}
      data-tender-dropdown
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-100%)',
        minWidth: 220,
        zIndex: 9999,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '6px',
      }}
    >
      {/* Tender Actions group */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 12px 4px' }}>
        Tender Actions
      </div>
      {actions.map((action) => (
        <button
          key={action}
          style={btnStyle}
          onClick={() => onAction(action)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {action}
        </button>
      ))}

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

      {/* Rate Details group */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 12px 4px' }}>
        Rate Details
      </div>
      <button
        style={btnStyle}
        onClick={() => { onAction(hasQuote ? 'EditQuote' : 'AddQuote') }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {hasQuote ? 'Edit Quote' : 'Add Quote'}
      </button>
      <button
        style={btnStyle}
        onClick={() => { onAction('ShowRateDetails') }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        Show Rate Details
      </button>
      {canDeleteQuote && (
        <button
          style={{ ...btnStyle, color: 'var(--text-error)' }}
          onClick={() => { onAction('DeleteQuote') }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          Delete Quote
        </button>
      )}
    </div>,
    document.body,
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 5b — Confirm dialogs (contracted-rate guard LINX-13894;
   delete-quote guard LINX-13897)
   ═══════════════════════════════════════════════════════════ */

// Shared shell — both confirms below are a one-line message + Cancel/OK-style
// footer over ModalMedium, same composition as DiscardChangesModal. Replaces
// the hand-rolled createPortal dialog this used to be (S119): that version had
// its own inline-styled overlay/box and NO Escape handling — ModalMedium's
// useEscapeStack (packages/ui/src/useEscapeStack.js) is the actual fix.
// cancelLabel is optional — omit it for a single-button (OK-only) dialog like
// LINX-13895's dates-unavailable notice below, which has nothing to cancel
// out of. Kept on this one shell rather than a second hand-rolled portal.
function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return createPortal(
    <ModalMedium
      title={title}
      onClose={onCancel}
      ariaLabel={title}
      /* `.modal-medium` is deliberately content-sized (width:auto, max 920px —
         the Shipment Details 4-column grid needs the room, S102). A confirm is
         one short paragraph, so without a cap it stretches toward 920px and a
         yes/no prompt renders as wide as a full data modal. Narrowing HERE via
         the className hook ModalMedium already exposes, rather than touching
         the shared component. */
      className="confirm-dialog"
      footer={
        <>
          {cancelLabel && <Button variant="secondary" size="lg" onClick={onCancel}>{cancelLabel}</Button>}
          <Button variant="primary" size="lg" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-label-sm-regular">{message}</p>
    </ModalMedium>,
    document.body,
  )
}

// LINX-13894 — message is VERBATIM from the ticket. S119's "don't overwhelm the
// user" ruling shortened the tab ERROR surfaces; it does not reach here. This
// is a destructive-override confirm whose second sentence carries the actual
// consequence ("will override the existing contracted rate") — cutting it
// leaves the user confirming something the dialog never told them.
function AddQuoteConfirm({ onContinue, onCancel }) {
  return (
    <ConfirmDialog
      title="Confirm Add Quote"
      message="A contracted rate already exists for this routing option. Entering a quote will override the existing contracted rate. Do you want to continue?"
      confirmLabel="OK"
      onConfirm={onContinue}
      onCancel={onCancel}
    />
  )
}

// LINX-13897 — Yes/No copy is verbatim from the ticket; No is the default/
// safe exit (ModalMedium routes the header X and overlay-click to it too).
function DeleteQuoteConfirm({ onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      title="Delete Quote"
      message="This quote will be permanently removed from this routing option. This action cannot be undone. Do you want to continue?"
      confirmLabel="Yes"
      cancelLabel="No"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

// LINX-13895 — "Quote Entry shall not be allowed when: Pickup Date is
// unavailable. / Delivery Date is unavailable." A notice, not a choice: single
// OK button (cancelLabel omitted), and OK does the same thing overlay-click/
// Escape/the header X already do via ModalMedium's onClose — dismiss, stay on
// Tender → Routing Options, Quote Entry never opens. Message is VERBATIM from
// the ticket.
function DatesUnavailableConfirm({ onDismiss }) {
  return (
    <ConfirmDialog
      title="Quote Entry Unavailable"
      message="Quote cannot be entered because Pickup and Delivery information is not available for the selected routing option."
      confirmLabel="OK"
      cancelLabel={null}
      onConfirm={onDismiss}
      onCancel={onDismiss}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 5c — CostTooltip (AP cost hover in routing table)
   ═══════════════════════════════════════════════════════════ */

function CostTooltip({ carrier, onViewDetails }) {
  const [show, setShow] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    setShow(true)
    setHovered(true)
  }

  // AP is already the cell's own text — correct as-is. AR used to read
  // arCost/arFreightCost, copy-pasted from CostOrderVM (Cost Allocation's
  // shape); neither key exists on RoutingOptionVM, so AR Total rendered '--'
  // forever and the Margin row (gated on both parsing) never rendered (Fix 1,
  // 2026-08-10). The real figure is rateDetails.arTotal — a NUMBER, not a
  // formatted string.
  const apTotal = carrier.cost || '--'
  const apNum = parseDollar(apTotal)
  // mapSellShipmentOutToDetail.ts substitutes a ZEROED rateDetails when the DTO
  // omits it — a falsy/zero arTotal means "no rate details", not "$0.00 AR".
  // Keep it '--' (and the Margin row hidden) rather than ever showing $0.00.
  const arNum = carrier.rateDetails?.arTotal || null
  // Fix 8 (2026-08-10): apTotal's " USD" comes from the mapper HARDCODING it
  // onto `cost` (mapSellShipmentOutToDetail.ts:270 — it never reads the DTO's
  // totalCostCurrency; a known, separately-tracked gap from the 2026-08-10
  // tender audit, not fixed here, mapper untouched). arTotal is the raw
  // rateDetails number with no such mapper step, so leaving it unsuffixed
  // made the tooltip read "AP ... USD / AR ..." with only one side labeled.
  // Match the AP side's shape, sourced from rateDetails.currency itself.
  const arTotal = arNum != null ? `${fmtDollar(arNum)} ${carrier.rateDetails?.currency || 'USD'}` : '--'
  const margin = (apNum != null && arNum != null) ? arNum - apNum : null
  const marginPct = (margin != null && apNum > 0) ? ((margin / apNum) * 100).toFixed(1) : null

  return (
    <span
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => { setShow(false); setHovered(false) }}
      onClick={(e) => { e.stopPropagation(); onViewDetails() }}
      style={{ cursor: 'pointer', color: hovered ? 'var(--carolina-blue-400)' : 'inherit', transition: 'color var(--transition-fast)' }}
    >
      {apTotal}
      {show && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            background: 'var(--deep-sea-neutral-900, #1B2537)',
            color: 'var(--deep-sea-neutral-300, #D0D4DB)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 99999,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <div>AP Total: <strong>{apTotal}</strong></div>
          <div>AR Total: <strong>{arTotal}</strong></div>
          {margin != null && (
            <div style={{ color: margin >= 0 ? '#34d399' : '#f87171' }}>
              Margin: ${Math.abs(margin).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct}%)
            </div>
          )}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', color: 'var(--carolina-blue-400)', fontSize: 12 }}>
            Click to view details
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 6 — RoutingTable
   ═══════════════════════════════════════════════════════════ */

function RoutingTable({ options, tabColumns, highlightedRank, openMenuRank, onOpenMenu, onCloseMenu, onAction, isCollapsed, columnsCollapsed, collapsedWidths, onCollapse, onExpand, onViewRateDetails, onOpenColumns }) {
  const [hoveredRank, setHoveredRank] = useState(null)
  const [showToggle, setShowToggle] = useState(false)
  const rightTableRef = useRef(null)

  useEffect(() => {
    const el = rightTableRef.current
    if (!el) return
    const check = () => {
      const hiddenRatio = el.scrollWidth > 0 ? 1 - (el.clientWidth / el.scrollWidth) : 0
      setShowToggle(hiddenRatio >= 0.4)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [tabColumns])

  if (!options || options.length === 0) {
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)', padding: 16 }}>
        No routing options available.
      </div>
    )
  }

  const getCellValue = (option, col) => {
    const dataKey = col.dataKey || col.key
    return option[dataKey] ?? '--'
  }

  const getRowBg = (option) => {
    const isHighlighted = highlightedRank === option.rank
    const isHovered = hoveredRank === option.rank
    if (isHighlighted) return STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)'
    if (isHovered) return 'var(--bg-secondary)'
    return 'var(--bg-primary)'
  }

  return (
    /* No border/radius of its own: .tender-pane__table-card already IS the white
       surface (2xl + shadow-sm), and the mock shows one frame, not two. */
    <div data-routing-container style={{ display: 'flex', marginBottom: 24, overflow: 'hidden' }}>
      {/* ── LEFT TABLE + TOGGLE: fixed container with shadow ── */}
      <div style={{ flexShrink: 0, display: 'flex', boxShadow: '2px 0 4px rgba(0,0,0,0.06)', zIndex: 3 }}>
      <div data-left-table style={{ flexShrink: 0 }}>
        <table className="odyssey-table">
          <thead>
            <tr>
              {LOCKED_COLUMNS.map((col) => {
                const collapsed = isCollapsed(col.key)
                const hasWidth = collapsedWidths && COLLAPSIBLE_KEYS.includes(col.key)
                const w = hasWidth ? collapsedWidths[col.key] : null
                const wrapWhenCollapsed = columnsCollapsed && !col.narrow ? { whiteSpace: 'normal', lineHeight: 1.3 } : {}
                const statusNarrow = columnsCollapsed && col.key === 'status' ? { width: 78, maxWidth: 78 } : {}
                return (
                  <th key={col.key} className="text-label-sm-semibold" style={{
                    ...thSticky,
                    ...(col.narrow ? NARROW_TH : {}),
                    ...wrapWhenCollapsed,
                    ...statusNarrow,
                    ...(hasWidth ? { width: w, maxWidth: w, overflow: 'hidden' } : {}),
                    ...(collapsed ? { padding: '10px 4px' } : {}),
                    transition: 'width var(--transition-base), max-width var(--transition-base), padding var(--transition-base)',
                  }} title={col.label}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap', ...(collapsed ? { fontSize: 11, color: 'var(--text-placeholder)' } : {}) }}>
                      {col.label}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {options.map((option) => {
              const isHighlighted = highlightedRank === option.rank
              return (
                <tr
                  key={option.rank}
                  style={{ cursor: 'default' }}
                  onMouseEnter={() => setHoveredRank(option.rank)}
                  onMouseLeave={() => setHoveredRank(null)}
                >
                  {LOCKED_COLUMNS.map((col) => {
                    const collapsed = isCollapsed(col.key)
                    const isPrimary = col.primary
                    const hasWidth = collapsedWidths && COLLAPSIBLE_KEYS.includes(col.key)
                    const w = hasWidth ? collapsedWidths[col.key] : null

                    const cellStyle = {
                      // The tint lives on the CELL, not the row: the Cell contract paints
                      // every td white, so a row-level background would be covered. This
                      // is also what keeps hover synced across the two split tables —
                      // CSS :hover cannot reach a sibling table's row.
                      background: getRowBg(option),
                      ...(col.narrow ? { width: 64, textAlign: 'center' } : {}),
                      ...(columnsCollapsed && col.key === 'status' ? { width: 78, maxWidth: 78 } : {}),
                      ...(hasWidth ? { width: w, maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
                      ...(collapsed ? { padding: '10px 4px', fontSize: 12 } : {}),
                      transition: 'width var(--transition-base), max-width var(--transition-base), padding var(--transition-base)',
                    }

                    const content = col.key === 'status' ? <StatusBadge status={option.status} />
                      : col.key === 'cost' ? <CostTooltip carrier={option} onViewDetails={() => onViewRateDetails(option)} />
                      : col.key === 'carrierName' && option.spotRate ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {getCellValue(option, col)}
                          <Badge variant="amber">SPOT RATE</Badge>
                        </span>
                      )
                      : getCellValue(option, col)

                    return (
                      <td key={col.key} className={cellTypeClass(isPrimary || isHighlighted)} style={cellStyle}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                          {content}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── CENTER TOGGLE (only shows when right table is >40% hidden) ── */}
      {(showToggle || columnsCollapsed) && (
        <div
          onClick={() => columnsCollapsed ? onExpand() : onCollapse()}
          title={columnsCollapsed ? 'Expand columns' : 'Collapse columns'}
          style={{
            /* 36px lane, white, 20px glyph — the mock's Right Table Expander
               (Figma 1596:21583). It was a 20px gray lane with a 14px icon: at
               that size the glyph cannot sit in it without touching both edges,
               and the gray fill read as a third table rather than a seam. */
            width: 36,
            minWidth: 36,
            maxWidth: 36,
            flexShrink: 0,
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
        >
          {columnsCollapsed ? <UnfoldHorizontal {...ICON_LG} /> : <FoldHorizontal {...ICON_LG} />}
        </div>
      )}
      </div>

      {/* ── RIGHT TABLE: tab-specific columns + actions ── */}
      <div ref={rightTableRef} data-right-table style={{ flex: 1, overflowX: 'auto', minWidth: 100 }}>
        <table className="odyssey-table">
          <thead>
            <tr>
              {tabColumns.map((col) => (
                <th key={col.key} className="text-label-sm-semibold" style={{ ...thSticky, ...(col.narrow ? NARROW_TH : {}) }}>
                  {col.label}
                </th>
              ))}
              <th className="sticky top-0" style={{ ...stickyLastCol, ...ACTION_LANE, zIndex: 5, borderBottom: '1px solid var(--border-subtle)' }}>
                {/* Column arrangement (mock 1596:21526 puts it exactly here, in the pinned
                    action lane's header). Restored 2026-08-17 with the thing that was
                    missing when it was pulled on 2026-08-10: a panel of its OWN. It no
                    longer borrows ShipmentTable's onToggleColumnPanel — that handler opened
                    the shipments-LIST panel, which is why the control was worse than
                    nothing. Same canonical control ShipmentTable uses. */}
                <Button
                  variant="icon"
                  size="sm"
                  icon={<Columns3Cog size={18} />}
                  aria-label="Column arrangement"
                  onClick={onOpenColumns}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => {
              const isHighlighted = highlightedRank === option.rank
              return (
                <tr
                  key={option.rank}
                  style={{ cursor: 'default' }}
                  onMouseEnter={() => setHoveredRank(option.rank)}
                  onMouseLeave={() => setHoveredRank(null)}
                >
                  {tabColumns.map((col) => {
                    const cellStyle = {
                      background: getRowBg(option), // see the left table — tint on the cell
                      ...(col.narrow ? { width: 64, textAlign: 'center' } : {}),
                    }
                    return (
                      <td key={col.key} className={cellTypeClass(isHighlighted)} style={cellStyle}>
                        {getCellValue(option, col)}
                      </td>
                    )
                  })}
                  <td
                    style={{ ...stickyLastCol, ...ACTION_LANE, borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: STATUS_STYLES[option.status]?.bg ?? 'var(--bg-primary)' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = e.currentTarget.getBoundingClientRect()
                      const dropdownHeight = 200
                      const spaceBelow = window.innerHeight - rect.bottom
                      const top = spaceBelow < dropdownHeight
                        ? Math.max(8, rect.top - dropdownHeight)
                        : rect.bottom + 4
                      onOpenMenu(option.rank, { top, left: rect.right })
                    }}
                  >
                    <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                      <TruckElectric {...ICON_MD} style={{ color: option.status && STATUS_STYLES[option.status] ? STATUS_STYLES[option.status].color : 'var(--text-placeholder)' }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {openMenuRank != null && (() => {
        const activeOption = options.find(o => o.rank === openMenuRank)
        if (!activeOption) return null
        const pos = activeOption._menuPos || { top: 0, left: 0 }
        return (
          <ActionDropdown
            option={activeOption}
            position={pos}
            onAction={(action) => onAction(openMenuRank, action)}
            onClose={onCloseMenu}
          />
        )
      })()}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 7 — RoutingSubTabs
   ═══════════════════════════════════════════════════════════ */

function RoutingSubTabs({ activeSubTab, onTabChange }) {
  return (
    <div className="flex" style={{ gap: 'var(--spacing-6)', borderBottom: '1px solid var(--border-subtle)' }}>
      {SUB_TABS.map((tab) => {
        const isActive = tab.key === activeSubTab
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="whitespace-nowrap bg-transparent border-none cursor-pointer text-sm font-bold"
            style={{
              padding: '8px 0',
              fontFamily: 'var(--font-primary)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--text-tertiary)' : 'transparent'}`,
              marginBottom: -1,
              transition: 'color var(--transition-fast), border-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 8 — Main Component
   ═══════════════════════════════════════════════════════════ */

export default function RoutingGuideTab({ data, shipmentDetails, shipment }) {
  const currentUser = useCurrentUser()
  const [activeSubTab, setActiveSubTab] = useState('routing-options')
  const [highlightedRank, setHighlightedRank] = useState(null)
  const [openMenuRank, setOpenMenuRank] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [options, setOptions] = useState(data?.options || [])
  const [quoteModal, setQuoteModal] = useState({ isOpen: false, mode: 'add', carrierData: null })
  // LINX-13894 — rank pending the "contracted rate already exists" confirm,
  // or null when no confirm is showing.
  const [confirmAddQuoteRank, setConfirmAddQuoteRank] = useState(null)
  // LINX-13897 — rank pending the "delete this quote" confirm, or null.
  const [confirmDeleteQuoteRank, setConfirmDeleteQuoteRank] = useState(null)
  // LINX-13895 — true while the "dates unavailable" notice is showing. No rank
  // to remember: OK/Escape/overlay-click all just dismiss it, there's no
  // "continue" path out the other side the way the two confirms above have.
  const [datesUnavailable, setDatesUnavailable] = useState(false)
  const [collapsedWidths, setCollapsedWidths] = useState(null)
  const [expandedWidths, setExpandedWidths] = useState(null)
  const tableRef = useRef(null)

  // Column arrangement for the RIGHT (tab-specific) half of the tender table —
  // the mock's pinned-header control (Figma 1596:21526). Universe = the ACTIVE
  // sub-tab's columns: the sub-tabs are themselves column groups, so arranging
  // within one is the only reading that doesn't make them meaningless. Same
  // generalized ColumnPanel Product Information reuses; state is per-tab
  // (`key`), pane-lifespan, no persistence — matching that call site.
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(() => TAB_COLUMNS[activeSubTab].map((c) => c.key))
  const columnPanelRef = useRef(null)

  // Switching sub-tab switches the whole column universe, so the arrangement
  // resets with it (same rule as Product Information's equipment case).
  const subTabRef = useRef(activeSubTab)
  if (subTabRef.current !== activeSubTab) {
    subTabRef.current = activeSubTab
    setVisibleColumns(TAB_COLUMNS[activeSubTab].map((c) => c.key))
  }

  /* Reset all state when data changes (new shipment selected) */
  useEffect(() => {
    setActiveSubTab('routing-options')
    setHighlightedRank(null)
    setOpenMenuRank(null)
    setMenuPos({ top: 0, left: 0 })
    setOptions(data?.options || [])
    setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })
    setConfirmAddQuoteRank(null)
    setConfirmDeleteQuoteRank(null)
    setDatesUnavailable(false)

    setCollapsedWidths(null)

  }, [data])

  /* Note: collapse useEffect is placed after handleCollapse/handleExpand definitions below */

  /* Click-outside listener: clicks outside tableRef and not inside [data-tender-dropdown] */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target) && !e.target.closest('[data-tender-dropdown]')) {
        setHighlightedRank(null)
        setOpenMenuRank(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpenMenu = useCallback((rank, pos) => {
    setHighlightedRank(rank)
    setOpenMenuRank((prev) => (prev === rank ? null : rank))
    setMenuPos(pos)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setOpenMenuRank(null)
  }, [])

  // LINX-13894 — contracted-rate confirm: OK proceeds to Add Quote, Cancel
  // does nothing (no scaffolding for anything beyond that binary choice).
  const handleConfirmAddQuote = useCallback(() => {
    const carrier = options.find((o) => o.rank === confirmAddQuoteRank)
    setConfirmAddQuoteRank(null)
    setQuoteModal({ isOpen: true, mode: 'add', carrierData: carrier || null })
  }, [confirmAddQuoteRank, options])

  const handleCancelAddQuote = useCallback(() => {
    setConfirmAddQuoteRank(null)
  }, [])

  // LINX-13895 — dismiss the dates-unavailable notice. OK, Escape, and the
  // overlay/header-X all route here (ModalMedium's onClose === onCancel);
  // there is nothing to branch on, the user just stays put.
  const handleDismissDatesUnavailable = useCallback(() => {
    setDatesUnavailable(false)
  }, [])

  const isCollapsed = useCallback((key) => {
    if (!collapsedWidths || !COLLAPSIBLE_KEYS.includes(key)) return false
    // Not visually collapsed if width matches expanded width (transitioning back)
    if (expandedWidths && collapsedWidths[key] >= expandedWidths[key]) return false
    return true
  }, [collapsedWidths, expandedWidths])

  const handleCollapse = useCallback(() => {
    const container = document.querySelector('[data-routing-container]')
    const leftTable = document.querySelector('[data-left-table] table')
    const rightEl = document.querySelector('[data-right-table]')
    const rightTable = rightEl?.querySelector('table')
    if (!container || !leftTable || !rightEl || !rightTable) return

    const containerWidth = container.clientWidth

    const rightContentWidth = rightTable.scrollWidth
    const targetLeftWidth = Math.max(200, containerWidth - rightContentWidth)

    const leftCurrentWidth = leftTable.getBoundingClientRect().width
    if (targetLeftWidth >= leftCurrentWidth) return

    const headerCells = [...leftTable.querySelectorAll('thead th')]
    const neverCollapseWidth = NEVER_COLLAPSE_KEYS.reduce((sum, key) => {
      const idx = LOCKED_COLUMNS.findIndex(c => c.key === key)
      return sum + (headerCells[idx]?.getBoundingClientRect().width || 0)
    }, 0)

    const collapsibleCurrentWidths = {}
    let totalCollapsibleWidth = 0
    COLLAPSIBLE_KEYS.forEach(key => {
      const idx = LOCKED_COLUMNS.findIndex(c => c.key === key)
      const w = headerCells[idx]?.getBoundingClientRect().width || 80
      collapsibleCurrentWidths[key] = w
      totalCollapsibleWidth += w
    })

    // Save expanded widths for smooth expand animation later
    setExpandedWidths({ ...collapsibleCurrentWidths })

    const targetCollapsibleWidth = targetLeftWidth - neverCollapseWidth
    const scaleFactor = Math.max(0.2, targetCollapsibleWidth / totalCollapsibleWidth)
    const MIN_COL_WIDTH = 40

    const newWidths = {}
    COLLAPSIBLE_KEYS.forEach(key => {
      newWidths[key] = Math.max(MIN_COL_WIDTH, Math.round(collapsibleCurrentWidths[key] * scaleFactor))
    })

    setCollapsedWidths(newWidths)
  }, [])

  const handleExpand = useCallback(() => {
    if (expandedWidths) {
      // Transition to saved full widths, then clear
      setCollapsedWidths(expandedWidths)
      setTimeout(() => setCollapsedWidths(null), 250)
    } else {
      setCollapsedWidths(null)
    }
  }, [expandedWidths])

  /* Re-collapse when switching sub-tabs (columns change per tab) */
  useEffect(() => {
    setCollapsedWidths(null)
    const timer = setTimeout(() => handleCollapse(), 100)
    return () => clearTimeout(timer)
  }, [activeSubTab, handleCollapse])


  // Quotes are durable: every add / edit / tender-status change writes the option
  // back to the shipment's `tenders` rows, so it survives a reload instead of
  // living only in this component's state (S102). Optimistic — the local update
  // lands immediately and a failed write is logged, not rolled back.
  const persistTender = useCallback((option) => {
    const id = shipment?.sellShipment
    if (!id || !option) return
    // VM → DTO at the ONE choke point before the write (2026-08-10 fix) — the
    // local `options` state is VM-shaped (mapRoutingOption's output); writing
    // it verbatim silently degrades equipment/cost/distance/transit/api to
    // '--' on the next load, since the reader expects DTO key names.
    saveTenderOption(id, routingOptionVmToDto(option)).catch((e) => console.error('tender save failed', e))
  }, [shipment])

  // LINX-13897 — Yes clears the QUOTE, not the routing option: scac/carrierName/
  // equipment/pickup/delivery stay (they identify the option itself, not the
  // rate), while rate/cost/rateDetails reset to the same "no rate details" shape
  // mapRoutingOption itself defaults an omitted quote to (mapSellShipmentOutToDetail.ts:301)
  // — that's what makes hasQuote false again and reverts the menu to Add Quote.
  // quoteFlag is a NEW field (not read anywhere else in this codebase today,
  // same as the skipped Carrier Quoted checkbox below) — added because Jira
  // names it explicitly; persisted verbatim through the tenders.option JSON
  // blob, no schema migration needed.
  const handleConfirmDeleteQuote = useCallback(() => {
    const rank = confirmDeleteQuoteRank
    setConfirmDeleteQuoteRank(null)
    const target = options.find((o) => o.rank === rank)
    if (!target) return
    const cleared = {
      ...target,
      rate: DASH,
      cost: DASH,
      rateDetails: { baseRate: 0, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 0, arTotal: 0 },
      quoteFlag: 'N',
      // LINX-13897 "Set Carrier Quoted = Unchecked" — the counterpart to the
      // save's 'Yes'. Skipped in S120 because LINX-12581 isn't built; the
      // FIELD still has to be right whether or not a checkbox reads it.
      carrierQuoted: 'No',
      // quoteAudit is deliberately RETAINED: 13897 nulls the quote's own
      // fields, and an audit trail that vanishes with the thing it audits is
      // not an audit trail.
    }
    setOptions((prev) => prev.map((opt) => (opt.rank === rank ? cleared : opt)))
    persistTender(cleared)
  }, [confirmDeleteQuoteRank, options, persistTender])

  const handleCancelDeleteQuote = useCallback(() => {
    setConfirmDeleteQuoteRank(null)
  }, [])

  // LINX-13894/13895/13896 — Add and Edit are ONE operation on the SELECTED
  // routing option: "Quote information shall be maintained independently for
  // each Routing Option" (13894), and the Quote Entry Page's Carrier Option
  // section is read-only, sourced from that option (13895). Add differs from
  // Edit only in whether a quote was there before.
  //
  // Until 2026-08-16 the 'add' branch instead APPENDED a brand-new routing
  // option at maxRank+1, synthesising ~50 placeholder fields for a carrier the
  // routing guide never returned. That was left over from the page-level "Add
  // Quote" button S120 deleted when Jana moved the action into the per-row
  // menu ("quote is being added for every option").
  const handleQuoteSave = useCallback((formData) => {
    const target = options.find((o) => o.rank === quoteModal.carrierData?.rank)
    if (!target) return
    const now = formatDateTimeMDYHM(new Date())
    const prior = target.quoteAudit
    const updated = {
      ...target,
      // Carrier identity is read-only on the entry page, so these come back
      // unchanged; kept defensive in case a mode ever unlocks one.
      scac: formData.scac || target.scac,
      carrierName: formData.carrierName || target.carrierName,
      equipment: formData.equipment || target.equipment,
      pickupDateTime: formData.pickupDateTime || target.pickupDateTime,
      deliveryDateTime: formData.deliveryDateTime || target.deliveryDateTime,
      // Fix 2 (2026-08-10): this used to recompute `cost` from apTotal but
      // never touch `rate`, so an edited Base Rate never left this component —
      // persistTender/routingOptionVmToDto reads `rate` back into rateAmount,
      // so the stale value would round-trip forever.
      rate: `$${formData.rateDetails.baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cost: `$${formData.rateDetails.apTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
      rateDetails: formData.rateDetails,
      // LINX-13896 save behaviour — both flags, on add AND on edit.
      quoteFlag: 'Y',
      carrierQuoted: 'Yes',
      // The rate on this option is now the user's, not the contract's — the
      // Rate Source column would otherwise still read "Contract". No longer
      // load-bearing for the menu (that's quoteFlag now), just truthful.
      rateSource: 'Manual',
      quoteAudit: {
        // Created* survives an edit; only Updated* moves.
        createdBy: prior?.createdBy ?? currentUser.name,
        createdDate: prior?.createdDate ?? now,
        updatedBy: currentUser.name,
        updatedDate: now,
        // "Initial Cost (either null or cost/total exist from the initial
        // quote)" — the AP total as it stood before the FIRST user quote, i.e.
        // the contracted rate being overridden. Null when there was none.
        initialApAmount: prior
          ? prior.initialApAmount
          : (target.rateDetails?.apTotal || null),
        finalApAmount: formData.rateDetails.apTotal,
      },
      // Fix 4/5 (2026-08-10): useCurrentUser() over the 'Current User' literal,
      // and formatDateTimeMDYHM over toLocaleString() — the platform date canon
      // (src/lib/dates.js, S107) is padded "MM/DD/YYYY HH:MM". Known delta:
      // seeded rows carry a trailing TZ abbreviation (generate.mjs) that this
      // does not — we don't know the acting user's zone, so it's left off
      // rather than hardcoding one.
      modifyUser: currentUser.name,
      modifyDate: now,
    }
    setOptions((prev) => prev.map((opt) => (opt.rank === updated.rank ? updated : opt)))
    persistTender(updated)
    setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })
  }, [quoteModal, options, persistTender, currentUser])

  const handleAction = useCallback((rank, action) => {
    if (action === 'ShowRateDetails') {
      const carrier = options.find(o => o.rank === rank)
      setQuoteModal({ isOpen: true, mode: 'view', carrierData: carrier || null })
      setOpenMenuRank(null)
      return
    }

    if (action === 'EditQuote') {
      const carrier = options.find(o => o.rank === rank)
      setQuoteModal({ isOpen: true, mode: 'edit', carrierData: carrier || null })
      setOpenMenuRank(null)
      return
    }

    if (action === 'DeleteQuote') {
      // LINX-13897 — ActionDropdown already gates this action to a quoted
      // option (quoteFlag 'Y') on an unlocked tender; just open the confirm.
      setOpenMenuRank(null)
      setConfirmDeleteQuoteRank(rank)
      return
    }

    if (action === 'AddQuote') {
      const carrier = options.find(o => o.rank === rank)
      setOpenMenuRank(null)

      // LINX-13895 — Quote Entry is blocked outright when either date is
      // missing, BEFORE the contracted-rate confirm below (AC 3 is about
      // overriding a rate; there's no rate override question worth asking on
      // an option the Quote Entry Page can't even open for). Scoped to Add
      // Quote only, per the ticket's own wording — Edit Quote isn't gated:
      // an existing quote already implies both dates were present when it
      // was entered.
      const isUnavailable = (v) => v == null || v === '' || v === DASH
      if (isUnavailable(carrier?.pickupDateTime) || isUnavailable(carrier?.deliveryDateTime)) {
        setDatesUnavailable(true)
        return
      }

      // AC 3 (LINX-13894): AP Cost (Carrier) non-blank means a contracted
      // rate already exists for this option — confirm before opening the
      // quote entry dialog. Blank ('--' or absent) skips the confirm.
      const hasApCost = !!(carrier?.cost && carrier.cost !== DASH)
      if (hasApCost) {
        setConfirmAddQuoteRank(rank)
      } else {
        // carrierData is the SELECTED option, not null: the quote attaches to
        // this option, and its Carrier Option section is read-only off it.
        setQuoteModal({ isOpen: true, mode: 'add', carrierData: carrier || null })
      }
      return
    }

    // Fix 4 (2026-08-10): Accept/Decline/Cancel used to persist ONLY `status`,
    // leaving the audit/response fields stale/null forever. A click on any of
    // the three IS a genuine response to the tender (a Decline is a response,
    // not a non-event) — generate.mjs only seeds responseDateTime on Accepted
    // rows, which is a generator gap (no seeded case for a Declined-with-
    // response carrier), not a rule for live user actions to copy.
    const now = formatDateTimeMDYHM(new Date())
    const isResponseAction = action === 'Accept' || action === 'Decline' || action === 'Cancel'
    // Fix 6 (2026-08-10): Tender/Re-Tender used to record NOTHING — not
    // notifyDateTime, not modifyUser/modifyDate — even though a manual click
    // and the Decline/Cancel cascade below (which already stamps both) are
    // the SAME event: being tendered. isResponseAction correctly keeps them
    // OUT of the response fields (they're notify events, not responses);
    // this only adds the notify-side fields they were missing.
    const isNotifyAction = action === 'Tender' || action === 'Re-Tender'

    let updated = options.map((opt) => {
      if (opt.rank !== rank) return opt
      // modifyUser/modifyDate are the audit trail — every action sets them,
      // not just the response ones, so no action is invisible to it.
      const next = { ...opt, status: STATUS_AFTER_ACTION[action] || opt.status, modifyUser: currentUser.name, modifyDate: now }
      if (isResponseAction) {
        next.responseDateTime = now
        next.responseUser = currentUser.name
        next.responseMethod = 'Manual Update' // RESPONSE_METHODS literal (generate.mjs) — a UI click genuinely is one, not fabricated.
        // proNumber / carrierPickup are CARRIER-supplied identifiers that only
        // arrive from the carrier's actual response — inventing them here
        // would be the same "~40 hardcoded fields" problem already flagged as
        // its own product conversation. Left untouched, deliberately.
      }
      if (isNotifyAction) {
        next.notifyDateTime = now
      }
      if (action === 'Re-Tender') {
        // Fix 7 (2026-08-10): a Re-Tender fires on a Declined/Cancelled row
        // that still carries the PREVIOUS cycle's response — left in place,
        // the row would read "Declined by Amy Cook at 08/10/2026 14:23"
        // while status says Sent (awaiting a fresh response). Cleared to the
        // shape mapRoutingOption itself produces for an empty value
        // (mapSellShipmentOutToDetail.ts), so a save-then-reload round-trips
        // identically: responseDateTime/responseMethod go through
        // orDash(...) there -> '--'; responseUser goes through `?? null` ->
        // null. proNumber/carrierPickup are NOT cleared — carrier-supplied
        // identifiers from the prior cycle; whether a re-tender voids them is
        // a product question, not ours to decide.
        next.responseDateTime = DASH
        next.responseMethod = DASH
        next.responseUser = null
      }
      return next
    })
    const touched = [rank]

    /* CASCADE: on Decline or Cancel, auto-tender next null-status carrier by rank ascending */
    if (action === 'Decline' || action === 'Cancel') {
      const sortedByRank = [...updated].sort((a, b) => a.rank - b.rank)
      const nextNull = sortedByRank.find((opt) => opt.status === null || opt.status === undefined)
      if (nextNull) {
        updated = updated.map((opt) =>
          opt.rank === nextNull.rank
            // Being auto-tendered is a NOTIFY, not a RESPONSE — only
            // notifyDateTime moves here. responseDateTime/responseUser/
            // responseMethod stay untouched until THIS carrier is itself
            // clicked; getting that distinction right is the point of Fix 4.
            ? { ...opt, status: 'Sent', notifyDateTime: now, modifyUser: currentUser.name, modifyDate: now }
            : opt,
        )
        touched.push(nextNull.rank)
      }
    }

    setOptions(updated)
    // The cascade changes TWO rows — persist both, not just the clicked one.
    touched.forEach((r) => persistTender(updated.find((o) => o.rank === r)))

    setOpenMenuRank(null)
  }, [options, persistTender, currentUser])

  // Every option on a shipment shares its pickup/delivery timezone — take the
  // first one that actually carries a value as the shipment's TZ, so a NEW quote
  // (no carrierData) still gets the right one.
  const shipmentTz = {
    pickup: options.find((o) => o.pickupTZ && o.pickupTZ !== DASH)?.pickupTZ,
    delivery: options.find((o) => o.deliveryTZ && o.deliveryTZ !== DASH)?.deliveryTZ,
  }

  // What the right table renders: the arrangement's ORDER + visibility applied to
  // the active sub-tab's definitions (which carry `narrow`/`dataKey`, so the panel
  // only ever hands back keys).
  const tabColumnDefs = TAB_COLUMNS[activeSubTab] || []
  const activeTabColumns = orderedTabColumns(tabColumnDefs, visibleColumns)
  const columnPanelColumns = tabColumnDefs.map(({ key, label }) => ({ key, label }))
  const columnPanelPresets = {
    custom: [{ id: 'default-tender', name: 'Default Columns', columns: tabColumnDefs.map((c) => c.key) }],
    odyssey: [],
  }

  /* Attach _menuPos to the option that has its menu open */
  const optionsWithPos = options.map((opt) =>
    opt.rank === openMenuRank ? { ...opt, _menuPos: menuPos } : opt,
  )

  return (
    <div className="pane-canvas tender-pane">
      {/* Row 1: full-width tabs band (official ShipmentsBar tab-content styling)
          — underline sub-tabs left, actions right, content aligned to the wide column */}
      <div className="pane-tabs-band">
        <div className="pane-band-inner pane-band-inner--wide tender-pane__tab-row">
          <div className="tab-group">
            {SUB_TABS.map((tab) => (
              <Tab
                key={tab.key}
                label={tab.label}
                current={activeSubTab === tab.key}
                onClick={() => setActiveSubTab(tab.key)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pane-col pane-col--wide tender-pane__col">
        {/* Row 2: table in a wide bordered container directly on canvas */}
        <div className="tender-pane__table-card">
          <div ref={tableRef}>
            <RoutingTable
          options={optionsWithPos}
          tabColumns={activeTabColumns}
          highlightedRank={highlightedRank}
          openMenuRank={openMenuRank}
          onOpenMenu={handleOpenMenu}
          onCloseMenu={handleCloseMenu}
          onAction={handleAction}
          isCollapsed={isCollapsed}
          columnsCollapsed={collapsedWidths !== null}
          collapsedWidths={collapsedWidths}
          onCollapse={handleCollapse}
          onExpand={handleExpand}
          onViewRateDetails={(carrier) => setQuoteModal({ isOpen: true, mode: 'view', carrierData: carrier })}
          onOpenColumns={() => setColumnPanelOpen(true)}
        />
          </div>
        </div>{/* /tender-pane__table-card */}

        {/* LINX-13953 — its own card: GroupTable owns horizontal scroll and
            .tender-pane__table-card is overflow:hidden. Rendered regardless of
            activeSubTab: the sub-tabs only switch which COLUMNS the tender
            table shows, not which entity is on screen. */}
        <div className="tender-pane__table-card">
          <DroppedCarrierSection carriers={shipmentDetails?.droppedCarriers || []} />
        </div>
      </div>{/* /pane-col */}

      {quoteModal.isOpen && (
        <QuoteModal
          mode={quoteModal.mode}
          carrierData={quoteModal.carrierData}
          shipmentTz={shipmentTz}
          onSave={handleQuoteSave}
          onClose={() => setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })}
        />
      )}

      {confirmAddQuoteRank != null && (
        <AddQuoteConfirm onContinue={handleConfirmAddQuote} onCancel={handleCancelAddQuote} />
      )}

      {confirmDeleteQuoteRank != null && (
        <DeleteQuoteConfirm onConfirm={handleConfirmDeleteQuote} onCancel={handleCancelDeleteQuote} />
      )}

      {datesUnavailable && (
        <DatesUnavailableConfirm onDismiss={handleDismissDatesUnavailable} />
      )}

      {/* Portaled to <body> on purpose: the expanded ShipmentsBar carries a
          `clip-path`, which makes it the containing block for position:fixed
          descendants AND clips them — a dock rendered in place would be cut to
          the bar's box (and to nothing at all in the partial stage). Body-level
          also lands it outside <main>, which BottomBar's outside-click rule
          already treats as exempt, so opening the panel can't collapse the bar. */}
      {createPortal(
        <>
          {columnPanelOpen && (
            <div
              className="right-panel-scrim"
              onMouseDown={() => { columnPanelRef.current?.requestClose() }}
            />
          )}
          <div className={`tender-panel-dock right-panel-dock${columnPanelOpen ? ' right-panel-dock--open' : ''}`}>
            <ColumnPanel
              key={activeSubTab}
              ref={columnPanelRef}
              isOpen={columnPanelOpen}
              onClose={() => setColumnPanelOpen(false)}
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
              allColumns={columnPanelColumns}
              presets={columnPanelPresets}
              defaultPresetId="default-tender"
            />
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}

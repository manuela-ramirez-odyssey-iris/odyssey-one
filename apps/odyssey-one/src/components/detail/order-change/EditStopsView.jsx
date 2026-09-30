import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ArrowDown, CalendarDays, ChevronsLeft, ChevronsRight, GripVertical, Info, TriangleAlert } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { Alert, Badge, Button, DatePicker, SubAccordion, TitleSubtitle, Timeline, TimePicker, StepperButtonsFooter, Tooltip } from '@odyssey/ui'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import TimezoneSelect from '../../orders/create/fields/TimezoneSelect'
import { tzAbbrev } from '../../../data/master-data'
import PlanningDatesModal from './PlanningDatesModal.jsx'
import ViewRoutingModal from './ViewRoutingModal.jsx'
import AddOrdersModal from './AddOrdersModal.jsx'
import { getSellShipmentDetail } from '../../../api/services/shipmentService'
import { DiffValue, val } from '../../shipments/order-change/comparisonHelpers.jsx'
import ReviewKpiStrip from './ReviewKpiStrip.jsx'
import { orderTooltipProps } from './orderTooltip.js'
import {
  initSandbox, labelsOf, canMoveStop, moveStop, canReorderStop, reorderStop, moveToPending, addToStop, addPending,
  isRoutable, routeBlocker, firstSequenceViolation, confirmStop, totals, priorDiff, toDto,
  parseStamp, formatStopDate, setStopDate, windowViolations, plannedDates, legDistances,
} from './stopsSandbox.js'
import './edit-stops.css'

// User 2026-09-28: the New plan has a collapsed (drag) mode and an edit
// (arrows, dates, set-aside) mode — same Edit → Reset/Discard/Save pattern
// as Consolidation's Planned Stops.
const HINT = {
  collapsed: 'Drag a stop to move it with all its orders. Select Edit to change dates or set orders aside.',
  editing: "Use the arrows to move a stop with all its orders, set dates, or set orders aside. Save when you're done.",
}
const EDITING_TOOLTIP = 'Save or discard your stop edits first'
// Structural compare for Discard's "anything changed?" and Reset's disabled
// state — reference inequality would count a move-and-move-back as a change.
const sigOf = (sb) => JSON.stringify([sb.stops, sb.pending])
const LAST_ORDER_TOOLTIP = 'The last remaining order cannot be removed from the shipment.'
// DEC-207 (T2) — Evaluate's disabled tooltip, keyed off routeBlocker's reason.
// C7's 'sequence' names the order, so it's built at the call site.
const BLOCKER_TOOLTIP = {
  unsequenced: 'Place every P? / D? stop first',
  undated: 'Set a date, time and time zone on every stop', // C16
}
const CONFIRM_TITLE = 'Approve Shipment Change'
// DEC-205 (LINX-15869) — a pending order isn't dropped: Save moves it to a
// new single-order shipment (C3).
const CONFIRM_BODY = 'Orders left in Orders Pending To Assign will each be moved to a new shipment of their own when you approve it.'

// LINX-15667…15671/15869/15871, VD x38TOJGsNryYl3LsKhCtSc node 2134-53584.
// Editor over the pure stopsSandbox model — every mutation here goes through
// the sandbox's own functions so the reducer logic stays independently tested.
// DEC-199 / LINX-15669 §3–5: the stop's own planned date, time and zone.
// Controlled off the stop's date string; every edit writes the same long
// shape back ("June 4, 2026 08:00 CDT") so save-stops and the cards agree.
// The zone select lists standard abbreviations only, so a DST label maps to
// its standard twin for display.
const STD_TZ = { CDT: 'CST', EDT: 'EST', MDT: 'MST', PDT: 'PST', AKDT: 'AKST', HDT: 'HST' }
// C23 — a picked zone is stamped as that zone's abbreviation ON the stop's
// date (PST picked for a June stop writes PDT), so picking never shifts the
// stop by an hour. Re-picking the stop's own zone keeps its stamp as is.
// ponytail: one IANA zone per option — MST means Denver, so a July pick of
// MST writes MDT (Arizona would need the stop's own IANA zone).
const IANA_OF = { EST: 'America/New_York', CST: 'America/Chicago', MST: 'America/Denver', PST: 'America/Los_Angeles', AKST: 'America/Anchorage', HST: 'Pacific/Honolulu' }
export const zoneOn = (picked, p) => (picked === (STD_TZ[p.tz] ?? p.tz)
  ? p.tz
  : (p.y != null && tzAbbrev(IANA_OF[picked], new Date(Date.UTC(p.y, p.mo, p.d, 12)))) || picked)
const pad2 = (n) => String(n).padStart(2, '0')

// D4 — also the Direct review's required Pickup/Delivery pair (OrderChangeActionsCard).
export function StopDateField({ id, label, value, onChange }) {
  // D4 (S163) — a time/zone picked BEFORE any date has no stamp to live in
  // (the value is one string); held here until the date arrives, else the
  // blank Direct-review fields silently dropped them.
  const [draft, setDraft] = useState({ time: '', tz: '' })
  const [dh, dmi] = draft.time.split(':').map(Number)
  const p = parseStamp(value) ?? { y: null, mo: 0, d: 1, h: Number.isFinite(dh) ? dh : 0, mi: Number.isFinite(dmi) ? dmi : 0, tz: '' }
  const dated = p.y != null
  const date = dated ? new Date(p.y, p.mo, p.d) : null
  const time = dated ? `${pad2(p.h)}:${pad2(p.mi)}` : draft.time
  const emit = (next) => { if (next.y != null) onChange(formatStopDate(next)) }
  return (
    <div className="edit-stops__date">
      <DatePicker
        id={`${id}-date`}
        label={label}
        value={date}
        onChange={(d) => {
          if (!d) return
          const next = { ...p, y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() }
          emit(!dated && draft.tz ? { ...next, tz: zoneOn(draft.tz, next) } : next)
        }}
      />
      <TimePicker
        id={`${id}-time`}
        label="Time"
        value={time}
        onChange={(t) => {
          const [h, mi] = (t || '').split(':').map(Number)
          if (!Number.isFinite(h) || !Number.isFinite(mi)) return
          if (dated) emit({ ...p, h, mi })
          else setDraft((dr) => ({ ...dr, time: t }))
        }}
      />
      <TimezoneSelect id={`${id}-tz`} label="Time Zone" value={dated ? (STD_TZ[p.tz] ?? p.tz) : draft.tz} onChange={(tz) => (dated ? emit({ ...p, tz: zoneOn(tz, p) }) : setDraft((dr) => ({ ...dr, tz })))} short />
    </div>
  )
}

// Collapsed-mode row: the whole stop drags (Consolidation's SortableStop —
// useSortable's own transform, no custom ghost). The row is also the
// activator node, so Enter/Space on a button INSIDE it (Keep here, an order
// link) presses that button instead of starting a keyboard drag.
function SortableStop({ id, className, children, ...rest }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={(n) => { setNodeRef(n); setActivatorNodeRef(n) }}
      style={{ transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined, transition }}
      className={className}
      data-dragging={isDragging ? 'true' : undefined}
      {...rest}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export default function EditStopsView({ stops, consolidation, orders, orderChange, summary, saving, saveError, onApprove, onCancel, cancelRef, sellShipment, customerId, customerName }) {
  // A useState initializer only runs once for a given component INSTANCE —
  // it never reruns on a re-render with new `stops`. The route
  // (OrderChangeEditStopsRoute.jsx) mounts this with `key={sellShipment}`,
  // so a new shipment gets a fresh instance (and a fresh sandbox) instead of
  // this one re-initializing mid-life.
  const [initial] = useState(() => initSandbox({ stops, consolidation, orders }))
  // D7 — orders pulled in via Add New Order (OrderDetailVM + sourceSellShipment,
  // read off the SOURCE shipment's own detail so they carry the same shape
  // as this shipment's own orders).
  const [extraOrders, setExtraOrders] = useState([])
  const allOrders = useMemo(() => [...orders, ...extraOrders], [orders, extraOrders])
  const orderById = useMemo(() => new Map(allOrders.map((o) => [o.orderNumber, o])), [allOrders])
  const [sb, setSb] = useState(initial)
  const [errorMsg, setErrorMsg] = useState(null)
  const [modal, setModal] = useState(null) // 'planning' | 'routing' | 'discard' | 'add-orders'
  // DEC-207 (T2) — the "Approve Shipment Change" confirm stacks ABOVE the
  // routing modal (both portal to body), so it's its own boolean rather than
  // a `modal` value — closing it must NOT also close the routing modal
  // underneath (Approve fails → planner lands back on the routing modal,
  // which is still showing the error, not back on the bare editor).
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Edit mode (user 2026-09-28): `snapshot` is the sandbox when Edit was
  // pressed — Discard returns to it; Reset returns to `initial`.
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [stopsPrompt, setStopsPrompt] = useState(null) // 'discard' | 'reset'
  // S164 F1 (Jana 09-29 @03:30): Edit collapses Prior to a marker rail so the
  // planner gets the room; leaving edit mode (Save/Discard/Reset) re-expands.
  const [priorCollapsed, setPriorCollapsed] = useState(false)

  const initialTotals = useMemo(() => totals(initial, orders), [initial, orders])
  const curTotals = totals(sb, allOrders)
  const diff = priorDiff(sb)

  const allOrderIds = new Set()
  sb.stops.forEach((s) => s.orderIds.forEach((id) => allOrderIds.add(id)))
  const singleOrderLeft = allOrderIds.size <= 1

  // Motion (user 2026-09-24: "otherwise user don't realize what happened").
  // A moved stop SLIDES from where it was (FLIP over the New plan's rows,
  // keyed by stop), and whatever an action touched pulses once where it
  // landed (the table's odyssey-row-highlight), scrolled into view.
  // Reduced motion: no slide, no pulse (CSS + the guard below).
  const newPlanRef = useRef(null)
  // The pending column docks just below the page's anchored KPI strip
  // (user 2026-09-24) — the strip shrinks to Mini when stuck, so its height
  // is measured, not guessed, and fed to CSS as --edit-stops-strip-h.
  const rootRef = useRef(null)
  useEffect(() => {
    const strip = rootRef.current?.closest('.order-change')?.querySelector('.summary-strip--sticky')
    if (!strip || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => rootRef.current?.style.setProperty('--edit-stops-strip-h', `${strip.offsetHeight}px`))
    ro.observe(strip)
    return () => ro.disconnect()
  }, [])
  const prevTops = useRef(null)
  const [flash, setFlash] = useState([])
  const flashTimer = useRef(null)
  const flashOn = (keys) => {
    clearTimeout(flashTimer.current)
    setFlash(keys)
    flashTimer.current = setTimeout(() => setFlash([]), 2400)
  }
  useEffect(() => () => clearTimeout(flashTimer.current), [])
  const snapshotTops = () => {
    // Rows are keyed by stop but carry no key attribute (Timeline is a
    // normalized @odyssey/ui component) — the stop row carries data-stop-key.
    const cards = newPlanRef.current?.querySelectorAll('[data-stop-key]') ?? []
    prevTops.current = new Map([...cards].map((c) => [c.dataset.stopKey, c.closest('.odyssey-timeline__row').getBoundingClientRect().top]))
  }
  useLayoutEffect(() => {
    const prev = prevTops.current
    prevTops.current = null
    if (!prev || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    newPlanRef.current?.querySelectorAll('[data-stop-key]').forEach((card) => {
      const row = card.closest('.odyssey-timeline__row')
      const was = prev.get(card.dataset.stopKey)
      const dy = was == null ? 0 : was - row.getBoundingClientRect().top
      if (dy) row.animate?.([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    })
  }, [sb.stops])
  useEffect(() => {
    if (flash.length) document.querySelector('.edit-stops [data-flash]')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [flash])
  const flashes = (k) => flash.includes(k) || undefined

  // Leg distance tooltip (user 2026-09-28): replaces the "Distance: …" line.
  // Pinned just right of the row's rail line, it slides along the line with
  // the pointer's y (clamped to the row). Body portal + fixed + no pointer
  // events, like SummaryStrip's truncation tooltip, so it never takes a
  // hover/drag away from the row. No transition, so nothing to reduce.
  const [tip, setTip] = useState(null)
  const dragging = useRef(false)
  // User 2026-09-28: the distance shows only while the pointer is over a
  // stop's RAIL (its badge + the line below it), one delegated handler per
  // panel. The line below stop i draws the leg to stop i+1, so that's the
  // leg shown; the last stop has no line and no tip. Keyed by stop in
  // legTips (filled by buildItems).
  const legTips = { prior: {}, new: {} }
  const showRailTip = (e, panel) => {
    const rail = dragging.current ? null : e.target.closest?.('.odyssey-timeline__rail')
    const row = rail?.closest('.odyssey-timeline__row')
    const key = row?.querySelector('[data-stop-key]')?.dataset.stopKey
    const info = key && legTips[panel][key]
    if (!info) { setTip(null); return }
    const rr = rail.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    // User 2026-09-28: the card opens to the LEFT of the line (right edge
    // 8px short of it), clear of the stop's content.
    setTip({ key: `${panel}:${key}`, x: rr.left + rr.width / 2 - 8, y: Math.min(Math.max(e.clientY, r.top), r.bottom), ...info })
  }
  // A move/aside re-lays the rows under a still pointer — drop the stale tip.
  useEffect(() => setTip(null), [sb.stops])

  const handleMove = (i, dir) => {
    const check = canMoveStop(sb, i, dir)
    if (!check.ok) { setErrorMsg(check.reason); return }
    setErrorMsg(null)
    snapshotTops()
    setSb((s) => moveStop(s, i, dir))
  }
  // Collapsed-mode drop: same LINX-15669 gate + message as the arrows
  // (canReorderStop). A refused drop just doesn't apply — dnd-kit snaps the
  // row back. No FLIP here: dnd-kit already slid the row to its new slot,
  // a FLIP from the pre-drag layout would jump it back first. Pulse only.
  const handleDragEnd = ({ active, over }) => {
    dragging.current = false
    if (!over || active.id === over.id) return
    const from = sb.stops.findIndex((s) => s.key === active.id)
    const to = sb.stops.findIndex((s) => s.key === over.id)
    const check = canReorderStop(sb, from, to)
    if (!check.ok) { setErrorMsg(check.reason); return }
    setErrorMsg(null)
    // User 2026-09-29: a moved stop doesn't pulse when it lands.
    setSb((s) => reorderStop(s, from, to))
  }
  const sortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const startEditing = () => { setErrorMsg(null); setSnapshot(sb); setEditing(true); setPriorCollapsed(true) }
  const leaveEditing = (next) => {
    if (next) setSb(next)
    setErrorMsg(null)
    setEditing(false)
    setPriorCollapsed(false)
    setSnapshot(null)
    setStopsPrompt(null)
  }
  const canReset = sigOf(sb) !== sigOf(initial)
  const handleDiscardStops = () => (sigOf(sb) !== sigOf(snapshot) ? setStopsPrompt('discard') : leaveEditing(snapshot))

  const handleMoveToPending = (id) => {
    setErrorMsg(null)
    snapshotTops()
    flashOn([`pending:${id}`])
    setSb((s) => moveToPending(s, id))
  }
  const handleStopDate = (key, date) => {
    setErrorMsg(null)
    setSb((s) => setStopDate(s, key, date))
  }
  const handleAddTo = (id) => {
    setErrorMsg(null)
    snapshotTops()
    flashOn([`order:${id}`])
    setSb((s) => addToStop(s, id, allOrders))
  }

  // DEC-207 (T2) — the footer's Evaluate opens the routing modal directly;
  // there is no separate View Routing button any more.
  const blocker = routeBlocker(sb)
  const blockerTooltip = blocker === 'sequence'
    ? `Order ${firstSequenceViolation(sb.stops)} is delivered before it is picked up. Move its pickup stop above its delivery stop.`
    : BLOCKER_TOOLTIP[blocker]
  const evaluateDisabled = !isRoutable(sb) || saving || editing

  // T1.2 — "Keep here" (a P?/D? stop's own row action): sequences it in
  // place, no move — so it pulses (flashOn) like every other action here,
  // but never slides (no snapshotTops call before the state update).
  const handleKeepHere = (key) => {
    setErrorMsg(null)
    flashOn([`stop:${key}`])
    setSb((s) => confirmStop(s, key))
  }

  const liveOrderIds = new Set()
  sb.stops.forEach((s) => s.orderIds.forEach((id) => liveOrderIds.add(id)))
  const planningOrders = allOrders.filter((o) => liveOrderIds.has(o.orderNumber))

  // E1 — the route's X and breadcrumbs leave through this same dirty check
  // (via `cancelRef`), each with its own destination; the footer Cancel uses
  // the default (`onCancel`).
  const leaveTo = useRef(null)
  const handleCancel = (to) => {
    leaveTo.current = typeof to === 'function' ? to : onCancel
    if (sb.dirty) { setModal('discard'); return }
    leaveTo.current?.()
  }
  if (cancelRef) cancelRef.current = handleCancel

  // D7: the record comes off the SOURCE shipment's detail through the same
  // mapper the shipment's own orders use — same fmtLocation, so Add to's
  // match-or-create sees the same strings.
  const handleAddOrders = async (rows) => {
    setModal(null)
    // Fired from an onClick — a rejected fetch here is an unhandled
    // rejection with nothing on screen unless it's caught and surfaced.
    try {
      const fetched = await Promise.all(rows.map(async (r) => {
        const d = await getSellShipmentDetail(r.sourceSellShipment)
        const vm = d.orderDetails.find((o) => o.orderNumber === r.orderNumber)
        return vm ? { ...vm, sourceSellShipment: r.sourceSellShipment } : null
      }))
      const recs = fetched.filter(Boolean)
      setExtraOrders((prev) => [...prev, ...recs.filter((r) => !prev.some((p) => p.orderNumber === r.orderNumber))])
      setSb((s) => addPending(s, recs.map((r) => r.orderNumber)))
    } catch {
      setErrorMsg('Could not load the selected orders. Try again.')
    }
  }

  // D8 — external orders that made it onto a stop ride Approve's second arg
  // to Save; ones left pending are dropped by the confirm's promise (D2).
  const externalOrdersOnStops = extraOrders
    .filter((r) => liveOrderIds.has(r.orderNumber))
    .map((r) => ({ orderNumber: r.orderNumber, sourceSellShipment: r.sourceSellShipment }))

  // A6/B2 (DEC-198) — live legs recomputed from sb.stops' own coordinates on
  // every move/place, via the SAME legMiles the seed used (so the initial
  // render always agrees with the seeded header). Replaces the static
  // consolidation.summaryChanges.distance read this used before B2 landed.
  const newLegs = legDistances(sb.stops)
  const priorLegs = legDistances(sb.prior)
  const initialLegs = useMemo(() => legDistances(initial.stops), [initial])
  const distance = newLegs.total
  const distanceChanged = newLegs.total !== initialLegs.total
  const weightChanged = curTotals.grossWeight !== initialTotals.grossWeight
  const volumeChanged = curTotals.volume !== initialTotals.volume

  const violations = windowViolations(sb.stops, allOrders)
  const violationOf = (stopKey, id) => violations.find((v) => v.stopKey === stopKey && v.orderId === id)

  const alertVariant = errorMsg ? 'error' : 'info'
  const alertText = errorMsg || (editing ? HINT.editing : HINT.collapsed)

  // DEC-197 (Jana 2026-09-24, user ruling): Prior and New side by side, both
  // always visible — no toggle, nothing collapsible. One builder renders
  // both; Prior is read-only and carries the planner-edit badges.
  const buildItems = (list, isPrior) => {
    const labels = labelsOf({ stops: list })
    return list.map((s, i) => {
      const label = labels[i]
      const isPickup = s.type === 'pickup'
      const removed = isPrior && diff.removedStopKeys.includes(s.key)
      const moved = isPrior && !removed && diff.movedStopKeys.includes(s.key)
      // User 2026-09-24: an arrow is disabled whenever that move can't happen —
      // edges AND sequencing (LINX-15669), via the same canMoveStop the move uses.
      const upDisabled = !canMoveStop(sb, i, 'up').ok
      const downDisabled = !canMoveStop(sb, i, 'down').ok
      // Collapsed New rows are read-only apart from drag + Keep here.
      const readOnly = isPrior || !editing
      const Row = isPrior || editing ? 'div' : SortableStop
      const rowProps = Row === SortableStop ? { id: s.key } : {}
      // A6/B2 (DEC-198) — the leg drawn by THIS stop's line: to the next
      // stop (legs[i + 1]); the last stop has none. '--' when a leg's
      // coordinate is missing (a brand-new P?/D? stop), not a wrong number.
      if (i < list.length - 1) {
        const panel = isPrior ? 'prior' : 'new'
        const leg = (isPrior ? priorLegs : newLegs).legs[i + 1]
        legTips[panel][s.key] = { next: list[i + 1].key, subtitle: `Distance from ${label} to ${labels[i + 1]}`, content: leg == null ? '--' : `${leg.toFixed(2)} mi` }
        // data-leg-tip: the row whose line is tipped — edit-stops.css darkens
        // that row's own segment while it's set.
        rowProps['data-leg-tip'] = tip?.key === `${panel}:${s.key}` || undefined
      }
      return {
        key: s.key,
        label,
        // User ruling 2026-09-09: purple ('changed'), not the plain green rail —
        // this editor already reads P/D badges as change markers alongside the
        // amber Removed/Moved badges above, so the rail follows suit.
        // User 2026-09-24: Prior's P/D markers are green like the plain
        // Stops tab ('completed'); purple stays on New only.
        status: isPrior ? 'completed' : 'changed',
        // Consolidation's Planned Stops (user, 2026-09-28): no mini status
        // icons on the rail — tracking language, not planning.
        showStatusBadge: false,
        // User 2026-09-28: both ends of the tipped leg read bolder.
        badgeClassName: tip && (tip.key === `${isPrior ? 'prior' : 'new'}:${s.key}` || (tip.key.startsWith(isPrior ? 'prior:' : 'new:') && tip.next === s.key)) ? 'edit-stops__badge--leg' : undefined,
        // User 2026-09-28 (round 2): a stop is a light row in the
        // Consolidation Planned Stops anatomy (ConsolidationReviewRoute
        // StopContent, VD 3039:147748) — no HeaderStrip, no card frame, no
        // "Stop N": the rail's P1/D1 badge and the row order carry position.
        content: (
          <Row {...rowProps} className={`edit-stops__stop${isPrior ? '' : ' edit-stops__stop--editable'}`} data-stop-key={s.key} data-flash={isPrior ? undefined : flashes(`stop:${s.key}`)}>
            <div className="edit-stops__stop-head">
              <span className="edit-stops__stop-lead">
              {/* User 2026-09-28: the badges stay beside the address text. The
                  LAST word is glued to them (nowrap), so when there's no room
                  the word wraps down together with the badges, never leaving
                  a badge alone on its own line. */}
              {(() => {
                const loc = s.location || '--'
                const cut = loc.lastIndexOf(' ')
                return (
                  <span className="text-label-sm-medium edit-stops__stop-location" data-location={loc}>
                    {cut === -1 ? '' : `${loc.slice(0, cut)} `}
                    <span className="edit-stops__stop-glue">{cut === -1 ? loc : loc.slice(cut + 1)}
              {/* User ruling 2026-09-09: purple, not green — this editor
                  already carries purple/gray change badges (Removed/Moved
                  here), so the stop-type badge picks up the same purple used
                  elsewhere on this surface. Canon reserves purple for the
                  customer's change (vault/10-domains/shipments/order-change.md
                  §10.3, DEC-136); the type badge is not a change signal, so
                  this is a deliberate, user-ruled reuse of the color — do not
                  "fix" it back to the canon mapping.
                  Also per the 2026-09-09 ruling: Prior mode's planner-edit
                  badges (Removed/Moved here, and the removed-order pill
                  below) are `gray`, not `amber` — the amber treatment read
                  too strong in Prior. Canon's "amber = what the planner
                  changed" (§10.3/DEC-136) is stale for this surface pending
                  a docs pass. */}
              {/* User 2026-09-28: Prior's type badge is green, like its rail
                  markers and the plain Stops tab; New stays purple. */}
              <Badge variant={isPrior ? 'green' : 'purple'}>{isPickup ? 'Pickup' : 'Delivery'}</Badge>
              {removed && <Badge variant="gray">Removed</Badge>}
              {moved && <Badge variant="gray">Moved</Badge>}
                    </span>
                  </span>
                )
              })()}
              </span>
              {!isPrior && (
                <span className="edit-stops__stop-trail">
                  {/* T1.2/T2 — "Keep here": a P?/D? stop only, beside the
                      arrows. Sequences without moving. */}
                  {s.unsequenced && (
                    <Button variant="secondary" size="sm" onClick={() => handleKeepHere(s.key)}>Keep here</Button>
                  )}
                  {editing ? (
                    // User 2026-09-28: icon Buttons. S164 F4 (Jana 09-29 @05:33):
                    // always visible in edit mode; a blocked move stays disabled.
                    <span className="edit-stops__stop-arrows">
                      <Button variant="icon" icon={<ArrowUp {...ICON_MD} />} aria-label="Move stop up" disabled={upDisabled} onClick={() => handleMove(i, 'up')} />
                      <Button variant="icon" icon={<ArrowDown {...ICON_MD} />} aria-label="Move stop down" disabled={downDisabled} onClick={() => handleMove(i, 'down')} />
                    </span>
                  ) : (
                    <GripVertical {...ICON_MD} className="edit-stops__stop-grip" aria-hidden="true" />
                  )}
                </span>
              )}
            </div>
            {/* C17 (LINX-15667 §3) — the street address under the location, Prior and New alike. */}
            {s.address && s.address !== '--' && <span className="text-label-xs-regular edit-stops__stop-meta">{s.address}</span>}
            {/* DEC-195: a stop shows only its own date. DEC-199: editable
                in the New plan; Prior stays the record of what was. */}
            {readOnly
              ? <span className="text-label-xs-regular edit-stops__stop-meta">{isPickup ? 'Pickup Date' : 'Delivery Date'}: {s.date || '--'}</span>
              : <StopDateField id={`stop-${s.key}`} label={isPickup ? 'Pickup Date' : 'Delivery Date'} value={s.date} onChange={(d) => handleStopDate(s.key, d)} />}
            {/* User 2026-09-28: read-only rows (Prior, collapsed New) list
                their orders inline; edit mode keeps one row per order for
                its Remove button. */}
            <div className={`edit-stops__orders${readOnly ? ' edit-stops__orders--inline' : ''}`}>
              <span className="text-label-xs-regular edit-stops__stop-meta">Orders:</span>
              {s.orderIds.map((id) => {
                const isRemovedOrder = diff.removedOrderIds.includes(id)
                return (
                  <div className="edit-stops__order-row" key={id} data-flash={isPrior ? undefined : flashes(`order:${id}`)}>
                    <div className="edit-stops__order-lead">
                      {isRemovedOrder
                        ? <Badge variant="gray">{id}</Badge>
                        // ponytail: no order drill-in yet — deferred, wire up when the
                        // Order Compare / detail surface has a route for this VM.
                        : (
                          <TooltipTrigger tooltipProps={orderTooltipProps(orderById.get(id), s.type, id)}>
                            <Button variant="link" className="edit-stops__order-link" onClick={() => {}}>{id}</Button>
                          </TooltipTrigger>
                        )}
                      {!isPrior && violationOf(s.key, id) && (() => {
                        const v = violationOf(s.key, id)
                        return (
                          <TooltipTrigger tooltipProps={{ groups: [{ subtitle: `Order ${v.type} window`, content: `${v.from} – ${v.to}` }] }}>
                            <Badge variant="amber" leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />}>Outside planning window</Badge>
                          </TooltipTrigger>
                        )
                      })()}
                    </div>
                    {readOnly ? null : singleOrderLeft ? (
                      <TooltipTrigger tooltipProps={{ groups: [{ content: LAST_ORDER_TOOLTIP }] }}>
                        <Button variant="secondary" size="sm" disabled>Remove</Button>
                      </TooltipTrigger>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMoveToPending(id)}
                      >
                        {/* DEC-194 (amended 09-29): "Move To Pending" → "Set Aside" → "Remove", text only. */}
                        Remove
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
            {/* S164 F3 (Jana 09-29 @04:54): a DECORATIVE cue that the leg
                below this stop carries a distance. It sits over the rail's
                segment (pointer-events none, so the rail still owns the hover
                and showRailTip / the tooltip are untouched). */}
            {i < list.length - 1 && <span className="edit-stops__leg-icon" aria-hidden="true"><Info {...ICON_MD} /></span>}
          </Row>
        ),
      }
    })
  }

  // S164 F1 — collapsed Prior: markers only (no content but a focusable hit
  // area carrying the tooltip). Moved = gray dot, Removed = struck + dimmed,
  // from the same diff the expanded badges read.
  const priorMarkers = () => {
    const labels = labelsOf({ stops: sb.prior })
    return sb.prior.map((s, i) => {
      const removed = diff.removedStopKeys.includes(s.key)
      const moved = !removed && diff.movedStopKeys.includes(s.key)
      const state = removed ? 'Removed' : moved ? 'Moved' : null
      return {
        key: s.key,
        label: labels[i],
        status: 'completed',
        showStatusBadge: false,
        badgeClassName: removed ? 'edit-stops__badge--removed' : undefined,
        content: (
          <TooltipTrigger tooltipProps={{ groups: [{ subtitle: `${labels[i]}${state ? ` · ${state}` : ''}`, content: `${s.location || '--'} · ${s.date || '--'}` }] }}>
            <button type="button" className="edit-stops__mark" aria-label={`${labels[i]}, ${s.location || '--'}, ${s.date || '--'}${state ? `, ${state}` : ''}`}>
              {moved && <span className="edit-stops__mark-dot" aria-hidden="true" />}
            </button>
          </TooltipTrigger>
        ),
      }
    })
  }

  return (
    <div className="edit-stops" ref={rootRef}>
      {/* S164 F2 (revised) — the strip (Distance/Gross Weight/Volume/Prior Cost/New Direct Cost) lives
          here: live values + the collapse state are this component's. */}
      <ReviewKpiStrip
        summary={summary}
        changes={consolidation?.summaryChanges}
        priorCollapsed={editing && priorCollapsed}
        live={{
          grossWeight: curTotals.grossWeight,
          volume: curTotals.volume,
          distance: distance == null ? '--' : `${distance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`,
          priorCost: val(consolidation?.costs?.prior),
          newDirectCost: val(consolidation?.costs?.newDirect),
          changed: { grossWeight: weightChanged, volume: volumeChanged, distance: distanceChanged },
        }}
      />
      <SubAccordion
        title="All Stops"
        collapsible={false}
      >
        <div className="edit-stops__head">
          <div className="edit-stops__metrics">
            <TitleSubtitle subtitle="New Consolidated Cost" title={val(consolidation?.costs?.newConsolidated)} />
            {/* S164 F2 (revised): plain, from the summary prop. */}
            <TitleSubtitle subtitle="Accepted Carrier" title={summary?.acceptedCarrier || '--'} />
            <TitleSubtitle subtitle="Seed Equipment" title={summary?.seedEquipment || '--'} />
            <TitleSubtitle subtitle="Utilization" title={summary?.utilization || '--'} />
          </div>
          <div className="edit-stops__head-actions">
            {/* DEC-207 (T2) — View Routing is gone; Evaluate (footer) is the
                only door into the routing modal now. */}
            {/* User 2026-09-28: a link with a leading calendar (ButtonLink's
                leading icon is LG/20px) — Button drops the link underline
                itself when an icon is present. */}
            <Button variant="link" icon={<CalendarDays {...ICON_LG} aria-hidden="true" />} onClick={() => setModal('planning')}>View Planning Dates</Button>
          </div>
        </div>

        <Alert variant={alertVariant} showClose={false}>{alertText}</Alert>

        <div className="edit-stops__body">
          <section className={`edit-stops__plan edit-stops__plan--prior${editing && priorCollapsed ? ' edit-stops__plan--collapsed' : ''}`} aria-label="Prior plan" onMouseMove={(e) => showRailTip(e, 'prior')} onMouseLeave={() => setTip(null)}>
            {editing && priorCollapsed ? (
              <>
                <div className="edit-stops__prior-head">
                  <h3 className="text-label-sm-medium edit-stops__plan-label">Prior</h3>
                  <Button variant="icon" icon={<ChevronsRight {...ICON_MD} />} aria-label="Show prior plan" aria-expanded="false" onClick={() => setPriorCollapsed(false)} />
                </div>
                <Timeline items={priorMarkers()} className="edit-stops__rail edit-stops__rail--markers" aria-label="Prior stops" />
              </>
            ) : (
              <>
                <div className="edit-stops__plan-head">
                  <h3 className="text-label-base-semibold edit-stops__plan-title">Prior</h3>
                  {editing && <Button variant="icon" icon={<ChevronsLeft {...ICON_MD} />} aria-label="Hide prior plan" aria-expanded="true" onClick={() => setPriorCollapsed(true)} />}
                </div>
                <Timeline items={buildItems(sb.prior, true)} className="edit-stops__rail" aria-label="Prior stops" />
              </>
            )}
          </section>
          <section className="edit-stops__plan" aria-label="New plan" ref={newPlanRef} onMouseMove={(e) => showRailTip(e, 'new')} onMouseLeave={() => setTip(null)}>
            <div className="edit-stops__plan-head">
              {/* User 2026-09-28: sm buttons; Reset sits beside the "New"
                  title, Discard + Save on the trail. */}
              <span className="edit-stops__plan-lead">
                <h3 className="text-label-base-semibold edit-stops__plan-title">New</h3>
                {editing && <Button variant="secondary" size="sm" disabled={!canReset} onClick={() => setStopsPrompt('reset')}>Reset</Button>}
              </span>
              <span className="edit-stops__plan-actions">
                {editing ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleDiscardStops}>Discard</Button>
                    <Button size="sm" onClick={() => leaveEditing()}>Save</Button>
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={startEditing}>Edit</Button>
                )}
              </span>
            </div>
            {/* User 2026-09-28: New's rail is detached and static, like
                Consolidation's editing timeline — no arrival animation. */}
            {editing ? (
              <Timeline items={buildItems(sb.stops, false)} className="edit-stops__rail edit-stops__rail--detached" aria-label="All stops" />
            ) : (
              <DndContext
                sensors={sortSensors}
                collisionDetection={closestCenter}
                onDragStart={() => { dragging.current = true; setTip(null) }}
                onDragEnd={handleDragEnd}
                onDragCancel={() => { dragging.current = false }}
              >
                <SortableContext items={sb.stops.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                  <Timeline items={buildItems(sb.stops, false)} className="edit-stops__rail edit-stops__rail--detached" aria-label="All stops" />
                </SortableContext>
              </DndContext>
            )}
          </section>

          {/* User 2026-09-28: the pending column shows in edit mode only
              (Remove / Add live there), floating on the right as before,
              and slides open / closed. It stays mounted so it can animate
              out; closed, it's inert and hidden from assistive tech. */}
          <div className={`edit-stops__pending-slot${editing ? ' edit-stops__pending-slot--open' : ''}`} inert={!editing} aria-hidden={editing ? undefined : true}>
          <div className="edit-stops__pending">
            <h3 className="text-label-sm-semibold edit-stops__plan-title">Orders Pending To Assign</h3>
            <Button variant="secondary" onClick={() => setModal('add-orders')}>Add New Order</Button>
            {sb.pending.map((id) => (
              <div className="edit-stops__pending-row" key={id} data-flash={flashes(`pending:${id}`)}>
                {/* ponytail: no order drill-in yet — deferred, wire up when the
                    Order Compare / detail surface has a route for this VM. */}
                <TooltipTrigger tooltipProps={orderTooltipProps(orderById.get(id), undefined, id)}>
                  <Button variant="link" className="edit-stops__order-link" onClick={() => {}}>{id}</Button>
                </TooltipTrigger>
                {/* DEC-193: no stop picker — the system places each leg
                    (same type + location, else a new P?/D?). */}
                <Button variant="secondary" size="sm" aria-label={`Add order ${id}`} onClick={() => handleAddTo(id)}>Add</Button>
              </div>
            ))}
          </div>
          </div>
        </div>
      </SubAccordion>

      {/* Page footer (S158, user 2026-09-24): sticky, so Cancel / Evaluate
          stay reachable while the stop list scrolls.
          DEC-207 (T2) — "Approve Changes" → "Evaluate": it opens the routing
          modal (never approves directly any more). D22 — StepperButtonsFooter
          now has `primaryTooltip` for exactly this case (a disabled primary
          that needs to explain itself), so this no longer hand-rolls the bar
          from `.stepper-footer` classes. */}
      <StepperButtonsFooter
        className="edit-stops__footer"
        cancelLabel="Cancel"
        primaryLabel="Evaluate"
        primaryDisabled={evaluateDisabled}
        primaryTooltip={editing ? EDITING_TOOLTIP : blockerTooltip}
        onCancel={() => handleCancel()}
        onPrimary={() => setModal('routing')}
      />

      {tip && createPortal(
        <div style={{ position: 'fixed', left: tip.x, top: tip.y, transform: 'translate(-100%, -50%)', width: 'max-content', zIndex: 9999, pointerEvents: 'none' }}>
          <Tooltip groups={[{ subtitle: tip.subtitle, content: tip.content }]} />
        </div>,
        document.body,
      )}
      {modal === 'planning' && <PlanningDatesModal orders={planningOrders} violations={violations} planned={plannedDates(sb.stops)} onClose={() => setModal(null)} />}
      {modal === 'routing' && (
        <ViewRoutingModal
          orderChange={orderChange}
          stops={sb.stops}
          summary={summary}
          onClose={() => setModal(null)}
          secondaryLabel="Keep Editing"
          onSecondary={() => setModal(null)}
          primaryLabel="Approve Changes"
          onPrimary={() => setConfirmOpen(true)}
          primaryLoading={saving}
          primaryDisabled={saving}
          error={saveError}
        />
      )}
      {confirmOpen && (
        // VD 2066-77150 / DEC-141 / DEC-207: stacks ABOVE the routing modal
        // (both portal to document.body) — Approve fires onApprove exactly
        // as before; the routing modal stays open underneath so a save
        // error (below) surfaces there, in place.
        <ConfirmDialog
          title={CONFIRM_TITLE}
          message={CONFIRM_BODY}
          confirmLabel="Approve"
          cancelLabel="Cancel"
          onConfirm={() => { setConfirmOpen(false); onApprove?.(toDto(sb), externalOrdersOnStops) }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      {modal === 'add-orders' && (
        <AddOrdersModal
          sellShipment={sellShipment}
          customerId={customerId}
          customerName={customerName}
          excludeOrderIds={[...liveOrderIds, ...sb.pending]}
          onAdd={handleAddOrders}
          onClose={() => setModal(null)}
        />
      )}
      {stopsPrompt === 'discard' && (
        <ConfirmDialog
          title="Discard Stop Changes"
          message="Are you sure you want to discard your changes? The stops will return to their last saved state."
          confirmLabel="Yes, Discard"
          cancelLabel="No"
          onConfirm={() => leaveEditing(snapshot)}
          onCancel={() => setStopsPrompt(null)}
        />
      )}
      {stopsPrompt === 'reset' && (
        <ConfirmDialog
          title="Reset Stop Sequence"
          message="Are you sure you want to reset the stops? Every change on this page, saved or not (moves, dates, set-aside and added orders), will be undone and the stops will return to how they were when you opened it."
          confirmLabel="Yes, Reset"
          cancelLabel="No"
          onConfirm={() => leaveEditing(initial)}
          onCancel={() => setStopsPrompt(null)}
        />
      )}
      {modal === 'discard' && (
        <ConfirmDialog
          title="Discard changes?"
          message="Your stop changes will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => { setModal(null); leaveTo.current?.() }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

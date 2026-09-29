import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, CalendarDays, TriangleAlert } from 'lucide-react'
import { Alert, Badge, Button, DatePicker, HeaderStrip, SubAccordion, TitleSubtitle, Timeline, TimePicker, StepperButtonsFooter } from '@odyssey/ui'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import TimezoneSelect from '../../orders/create/fields/TimezoneSelect'
import PlanningDatesModal from './PlanningDatesModal.jsx'
import ViewRoutingModal from './ViewRoutingModal.jsx'
import AddOrdersModal from './AddOrdersModal.jsx'
import { getSellShipmentDetail } from '../../../api/services/shipmentService'
import { DiffValue, val } from '../../shipments/order-change/comparisonHelpers.jsx'
import { orderTooltipProps } from './orderTooltip.js'
import {
  initSandbox, labelsOf, canMoveStop, moveStop, moveToPending, addToStop, addPending,
  isRoutable, routeBlocker, confirmStop, totals, priorDiff, toDto,
  parseStamp, formatStopDate, setStopDate, windowViolations, legDistances,
} from './stopsSandbox.js'
import './edit-stops.css'

const HINT = 'Use the (↑ ↓) arrow buttons on each stop to move the entire stop (including all its orders) to a different position.'
const LAST_ORDER_TOOLTIP = 'The last remaining order cannot be removed from the shipment.'
// DEC-207 (T2) — Evaluate's disabled tooltip, keyed off routeBlocker's reason.
const BLOCKER_TOOLTIP = {
  unsequenced: 'Place every P? / D? stop first',
  undated: 'Set a date on every stop',
}
const CONFIRM_TITLE = 'Approve Shipment Change'
const CONFIRM_BODY = 'Any orders left pending for assignment will be removed from this shipment when you approve it.'

// LINX-15667…15671/15869/15871, VD x38TOJGsNryYl3LsKhCtSc node 2134-53584.
// Editor over the pure stopsSandbox model — every mutation here goes through
// the sandbox's own functions so the reducer logic stays independently tested.
// DEC-199 / LINX-15669 §3–5: the stop's own planned date, time and zone.
// Controlled off the stop's date string; every edit writes the same long
// shape back ("June 4, 2026 08:00 CDT") so save-stops and the cards agree.
// The zone select lists standard abbreviations only, so a DST label maps to
// its standard twin for display.
const STD_TZ = { CDT: 'CST', EDT: 'EST', MDT: 'MST', PDT: 'PST', AKDT: 'AKST', HDT: 'HST' }
const pad2 = (n) => String(n).padStart(2, '0')

function StopDateField({ id, label, value, onChange }) {
  const p = parseStamp(value) ?? { y: null, mo: 0, d: 1, h: 0, mi: 0, tz: '' }
  const date = p.y != null ? new Date(p.y, p.mo, p.d) : null
  const time = p.y != null ? `${pad2(p.h)}:${pad2(p.mi)}` : ''
  const emit = (next) => { if (next.y != null) onChange(formatStopDate(next)) }
  return (
    <div className="edit-stops__date">
      <DatePicker
        id={`${id}-date`}
        label={label}
        value={date}
        onChange={(d) => d && emit({ ...p, y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() })}
      />
      <TimePicker
        id={`${id}-time`}
        label="Time"
        value={time}
        onChange={(t) => {
          const [h, mi] = (t || '').split(':').map(Number)
          if (Number.isFinite(h) && Number.isFinite(mi)) emit({ ...p, h, mi })
        }}
      />
      <TimezoneSelect id={`${id}-tz`} label="Time Zone" value={STD_TZ[p.tz] ?? p.tz} onChange={(tz) => emit({ ...p, tz })} short />
    </div>
  )
}

export default function EditStopsView({ stops, consolidation, orders, orderChange, summary, saving, saveError, onApprove, onCancel, sellShipment, customerId, customerName }) {
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
    // normalized @odyssey/ui component) — the card carries data-stop-key.
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

  const handleMove = (i, dir) => {
    const check = canMoveStop(sb, i, dir)
    if (!check.ok) { setErrorMsg(check.reason); return }
    setErrorMsg(null)
    snapshotTops()
    flashOn([`stop:${sb.stops[i].key}`])
    setSb((s) => moveStop(s, i, dir))
  }
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
  const evaluateDisabled = !isRoutable(sb) || saving

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

  const handleCancel = () => {
    if (sb.dirty) { setModal('discard'); return }
    onCancel?.()
  }

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
  const alertText = errorMsg || HINT

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
      return {
        key: s.key,
        label,
        // User ruling 2026-09-09: purple ('changed'), not the plain green rail —
        // this editor already reads P/D badges as change markers alongside the
        // amber Removed/Moved badges above, so the rail follows suit.
        // User 2026-09-24: Prior's P/D markers are green like the plain
        // Stops tab ('completed'); purple stays on New only.
        status: isPrior ? 'completed' : 'changed',
        content: (
          <div className="edit-stops__card" data-stop-key={s.key} data-flash={isPrior ? undefined : flashes(`stop:${s.key}`)}>
            <HeaderStrip
              title={`Stop ${i + 1}`}
              badge={(
                <>
                  {/* User ruling 2026-09-09: purple, not green — this editor
                      already carries purple/gray change badges (Removed/Moved
                      below), so the stop-type badge picks up the same purple
                      used elsewhere on this surface. Canon reserves purple for
                      the customer's change (vault/10-domains/shipments/order-change.md
                      §10.3, DEC-136); the type badge is not a change signal, so this
                      is a deliberate, user-ruled reuse of the color — do not
                      "fix" it back to the canon mapping.
                      Also per the 2026-09-09 ruling: Prior mode's planner-edit
                      badges (Removed/Moved here, and the removed-order pill
                      below) are `gray`, not `amber` — the amber treatment read
                      too strong in Prior. Canon's "amber = what the planner
                      changed" (§10.3/DEC-136) is stale for this surface pending
                      a docs pass. */}
                  <Badge variant={isPrior ? 'gray' : 'purple'}>{isPickup ? 'Pickup' : 'Delivery'}</Badge>
                  {removed && <Badge variant="gray">Removed</Badge>}
                  {moved && <Badge variant="gray">Moved</Badge>}
                </>
              )}
              trail={isPrior ? null : (
                <>
                  {/* T1.2/T2 — "Keep here": a P?/D? stop only, beside the
                      arrows. Sequences without moving. */}
                  {s.unsequenced && (
                    <Button variant="secondary" size="sm" onClick={() => handleKeepHere(s.key)}>Keep here</Button>
                  )}
                  <Button variant="icon" icon={<ArrowUp {...ICON_MD} />} aria-label="Move stop up" disabled={upDisabled} onClick={() => handleMove(i, 'up')} />
                  <Button variant="icon" icon={<ArrowDown {...ICON_MD} />} aria-label="Move stop down" disabled={downDisabled} onClick={() => handleMove(i, 'down')} />
                </>
              )}
            />
            {/* User 2026-09-28: the Stops-tab review ("Consol") card — a
                TitleSubtitle grid, Location | Distance then the stop's date,
                then ONE "Orders" label over the order rows. */}
            <div className="edit-stops__fields">
              <TitleSubtitle subtitle="Location" title={s.location || '--'} />
              {/* A6/B2 (DEC-198) — leg from the PREVIOUS stop in this same
                  plan; the first stop has none. '--' when a leg's coordinate
                  is missing (a brand-new P?/D? stop), not a wrong number. */}
              <TitleSubtitle subtitle="Distance" title={(() => {
                const leg = (isPrior ? priorLegs : newLegs).legs[i]
                return leg == null ? '--' : `${leg.toFixed(2)} mi`
              })()} />
              {/* DEC-195: a stop shows only its own date. DEC-199: editable
                  in the New plan; Prior stays the record of what was. */}
              {isPrior
                ? <TitleSubtitle className="edit-stops__span" subtitle={isPickup ? 'Pickup Date' : 'Delivery Date'} title={s.date || '--'} />
                : <StopDateField id={`stop-${s.key}`} label={isPickup ? 'Pickup Date' : 'Delivery Date'} value={s.date} onChange={(d) => handleStopDate(s.key, d)} />}
              <div className="edit-stops__orders edit-stops__span">
                <TitleSubtitle subtitle="Orders" />
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
                              <Button variant="link" onClick={() => {}}>{id}</Button>
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
                      {isPrior ? null : singleOrderLeft ? (
                        <TooltipTrigger tooltipProps={{ groups: [{ content: LAST_ORDER_TOOLTIP }] }}>
                          <Button variant="secondary" disabled>Set Aside</Button>
                        </TooltipTrigger>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => handleMoveToPending(id)}
                        >
                          {/* DEC-194: "Move To Pending" → "Set Aside", text only. */}
                          Set Aside
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ),
      }
    })
  }

  return (
    <div className="edit-stops" ref={rootRef}>
      <SubAccordion
        title="All Stops"
        collapsible={false}
      >
        <div className="edit-stops__head">
          <div className="edit-stops__metrics">
            <TitleSubtitle subtitle="Prior Cost" title={val(consolidation?.costs?.prior)} />
            <TitleSubtitle subtitle="New Direct Cost" title={val(consolidation?.costs?.newDirect)} />
            <TitleSubtitle subtitle="New Consolidated Cost" title={val(consolidation?.costs?.newConsolidated)} />
            {/* T2 — thousands separator, same formatter as the header KPI (fmtDistance). */}
            <TitleSubtitle subtitle="Distance" title={<DiffValue value={distance == null ? '--' : `${distance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`} changed={distanceChanged} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />} />
            <TitleSubtitle subtitle="Gross Weight" title={<DiffValue value={curTotals.grossWeight} changed={weightChanged} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />} />
            <TitleSubtitle subtitle="Volume" title={<DiffValue value={curTotals.volume} changed={volumeChanged} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />} />
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
          <section className="edit-stops__plan edit-stops__plan--prior" aria-label="Prior plan">
            <HeaderStrip title="Prior" />
            <Timeline items={buildItems(sb.prior, true)} className="edit-stops__rail" aria-label="Prior stops" />
          </section>
          <section className="edit-stops__plan" aria-label="New plan" ref={newPlanRef}>
            <HeaderStrip title="New" />
            <Timeline animate items={buildItems(sb.stops, false)} className="edit-stops__rail" aria-label="All stops" />
          </section>

          <div className="edit-stops__pending">
            <HeaderStrip title="Orders Pending To Assign" />
            <Button variant="secondary" className="edit-stops__add-new" onClick={() => setModal('add-orders')}>Add New Order</Button>
            {sb.pending.map((id) => (
              <div className="edit-stops__pending-row" key={id} data-flash={flashes(`pending:${id}`)}>
                {/* ponytail: no order drill-in yet — deferred, wire up when the
                    Order Compare / detail surface has a route for this VM. */}
                <TooltipTrigger tooltipProps={orderTooltipProps(orderById.get(id), undefined, id)}>
                  <Button variant="link" onClick={() => {}}>{id}</Button>
                </TooltipTrigger>
                {/* DEC-193: no stop picker — the system places each leg
                    (same type + location, else a new P?/D?). */}
                <Button variant="secondary" aria-label={`Add order ${id}`} onClick={() => handleAddTo(id)}>Add</Button>
              </div>
            ))}
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
        primaryTooltip={blocker ? BLOCKER_TOOLTIP[blocker] : undefined}
        onCancel={handleCancel}
        onPrimary={() => setModal('routing')}
      />

      {modal === 'planning' && <PlanningDatesModal orders={planningOrders} violations={violations} onClose={() => setModal(null)} />}
      {modal === 'routing' && (
        <ViewRoutingModal
          orderChange={orderChange}
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
      {modal === 'discard' && (
        <ConfirmDialog
          title="Discard changes?"
          message="Your stop changes will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => { setModal(null); onCancel?.() }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

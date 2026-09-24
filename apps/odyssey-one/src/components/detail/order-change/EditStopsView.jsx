import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, TriangleAlert } from 'lucide-react'
import { Alert, Badge, Button, DatePicker, HeaderStrip, SubAccordion, TitleSubtitle, Timeline, TimePicker, StepperButtonsFooter } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'
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
  isRoutable, markRouted, totals, priorDiff, toDto,
  parseStamp, formatStopDate, setStopDate, windowViolations,
} from './stopsSandbox.js'
import './edit-stops.css'

const HINT = 'Use the (↑ ↓) arrow buttons on each stop to move the entire stop (including all its orders) to a different position.'
const LAST_ORDER_TOOLTIP = 'The last remaining order cannot be removed from the shipment.'
const ROUTING_TOOLTIP = 'Place every P? / D? stop first'
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

export default function EditStopsView({ stops, consolidation, orders, orderChange, summary, saving, onApprove, onCancel, sellShipment, customerId, customerName }) {
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
  const [modal, setModal] = useState(null) // 'planning' | 'routing' | 'discard' | 'confirm' | 'add-orders'

  const initialTotals = useMemo(() => totals(initial, orders), [initial, orders])
  const curTotals = totals(sb, allOrders)
  const diff = priorDiff(sb)

  const allOrderIds = new Set()
  sb.stops.forEach((s) => s.orderIds.forEach((id) => allOrderIds.add(id)))
  const singleOrderLeft = allOrderIds.size <= 1

  const handleMove = (i, dir) => {
    const check = canMoveStop(sb, i, dir)
    if (!check.ok) { setErrorMsg(check.reason); return }
    setErrorMsg(null)
    setSb((s) => moveStop(s, i, dir))
  }
  const handleMoveToPending = (id) => {
    setErrorMsg(null)
    setSb((s) => moveToPending(s, id))
  }
  const handleStopDate = (key, date) => {
    setErrorMsg(null)
    setSb((s) => setStopDate(s, key, date))
  }
  const handleAddTo = (id) => {
    setErrorMsg(null)
    setSb((s) => addToStop(s, id, allOrders))
  }

  const routable = isRoutable(sb)
  const routingDisabled = !routable
  const handleViewRouting = () => {
    setSb((s) => markRouted(s))
    setModal('routing')
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

  const distance = consolidation?.summaryChanges?.distance?.new ?? summary?.distance
  const distanceChanged = !!consolidation?.summaryChanges?.distance
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
      // Structural edges only (first stop has no up, last has no down) — a
      // move that's illegal for sequencing reasons (LINX-15669) stays
      // clickable so canMoveStop's reason can surface in the Alert.
      const upDisabled = i === 0
      const downDisabled = i === list.length - 1
      return {
        key: s.key,
        label,
        // User ruling 2026-09-09: purple ('changed'), not the plain green rail —
        // this editor already reads P/D badges as change markers alongside the
        // amber Removed/Moved badges above, so the rail follows suit.
        status: 'changed',
        content: (
          <div className="edit-stops__card">
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
                  <Badge variant="purple">{isPickup ? 'Pickup' : 'Delivery'}</Badge>
                  {removed && <Badge variant="gray">Removed</Badge>}
                  {moved && <Badge variant="gray">Moved</Badge>}
                </>
              )}
              trail={isPrior ? null : (
                <>
                  <Button variant="icon" icon={<ArrowUp {...ICON_MD} />} aria-label="Move stop up" disabled={upDisabled} onClick={() => handleMove(i, 'up')} />
                  <Button variant="icon" icon={<ArrowDown {...ICON_MD} />} aria-label="Move stop down" disabled={downDisabled} onClick={() => handleMove(i, 'down')} />
                </>
              )}
            />
            <div className="edit-stops__fields">
              <TitleSubtitle subtitle="Location" title={s.location || '--'} />
              <TitleSubtitle subtitle="Distance" title="--" />
              {/* DEC-195: a stop shows only its own date. DEC-199: editable
                  in the New plan; Prior stays the record of what was. */}
              {isPrior
                ? <TitleSubtitle subtitle={isPickup ? 'Pickup Date' : 'Delivery Date'} title={s.date || '--'} />
                : <StopDateField id={`stop-${s.key}`} label={isPickup ? 'Pickup Date' : 'Delivery Date'} value={s.date} onChange={(d) => handleStopDate(s.key, d)} />}
            </div>
            <div className="edit-stops__orders">
              {s.orderIds.map((id) => {
                const isRemovedOrder = diff.removedOrderIds.includes(id)
                return (
                  <div className="edit-stops__order-row" key={id}>
                    <div className="edit-stops__order-lead">
                      <span className="edit-stops__order-label text-label-sm-medium">Order #</span>
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
        ),
      }
    })
  }

  return (
    <div className="edit-stops">
      <SubAccordion
        title="All Stops"
        collapsible={false}
      >
        <div className="edit-stops__head">
          <div className="edit-stops__metrics">
            <TitleSubtitle subtitle="Prior Cost" title={val(consolidation?.costs?.prior)} />
            <TitleSubtitle subtitle="New Direct Cost" title={val(consolidation?.costs?.newDirect)} />
            <TitleSubtitle subtitle="New Consolidated Cost" title={val(consolidation?.costs?.newConsolidated)} />
            <TitleSubtitle subtitle="Distance" title={<DiffValue value={distance} changed={distanceChanged} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />} />
            <TitleSubtitle subtitle="Gross Weight" title={<DiffValue value={curTotals.grossWeight} changed={weightChanged} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />} />
            <TitleSubtitle subtitle="Volume" title={<DiffValue value={curTotals.volume} changed={volumeChanged} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />} />
          </div>
          <div className="edit-stops__head-actions">
            <Button variant="secondary" onClick={() => setModal('planning')}>View Planning Dates</Button>
            {routingDisabled ? (
              <TooltipTrigger tooltipProps={{ groups: [{ content: ROUTING_TOOLTIP }] }}>
                <Button variant="secondary" disabled>View Routing</Button>
              </TooltipTrigger>
            ) : (
              <Button variant="secondary" onClick={handleViewRouting}>View Routing</Button>
            )}
          </div>
        </div>

        <Alert variant={alertVariant} showClose={false}>{alertText}</Alert>

        <div className="edit-stops__body">
          <section className="edit-stops__plan edit-stops__plan--prior" aria-label="Prior plan">
            <HeaderStrip title="Prior" />
            <Timeline items={buildItems(sb.prior, true)} className="edit-stops__rail" aria-label="Prior stops" />
          </section>
          <section className="edit-stops__plan" aria-label="New plan">
            <HeaderStrip title="New" />
            <Timeline animate items={buildItems(sb.stops, false)} className="edit-stops__rail" aria-label="All stops" />
          </section>

          <div className="edit-stops__pending">
            <HeaderStrip title="Orders Pending To Assign" />
            <Button variant="secondary" className="edit-stops__add-new" onClick={() => setModal('add-orders')}>Add New Order</Button>
            {sb.pending.map((id) => (
              <div className="edit-stops__pending-row" key={id}>
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

      {/* Page footer (S158, user 2026-09-24): the normalized sticky
          StepperButtonsFooter replaces the in-flow ModalFooter, so Cancel /
          Approve Changes stay reachable while the stop list scrolls. */}
      <StepperButtonsFooter
        className="edit-stops__footer"
        cancelLabel="Cancel"
        primaryLabel="Approve Changes"
        primaryDisabled={!sb.routed || saving}
        onCancel={handleCancel}
        onPrimary={() => setModal('confirm')}
      />

      {modal === 'planning' && <PlanningDatesModal orders={planningOrders} violations={violations} onClose={() => setModal(null)} />}
      {modal === 'routing' && <ViewRoutingModal orderChange={orderChange} onClose={() => setModal(null)} />}
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
      {modal === 'confirm' && (
        // VD 2066-77150 / DEC-141: Approve Changes confirms before committing —
        // any orders still sitting in the pending buffer are dropped from the
        // shipment on approval, so the planner gets one last chance to back out.
        <ConfirmDialog
          title={CONFIRM_TITLE}
          message={CONFIRM_BODY}
          confirmLabel="Approve"
          cancelLabel="Cancel"
          onConfirm={() => { setModal(null); onApprove?.(toDto(sb), externalOrdersOnStops) }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

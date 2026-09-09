import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, ClipboardList, Plus, TriangleAlert } from 'lucide-react'
import {
  Alert, Badge, Button, HeaderStrip, ModalFooter, SubAccordion, TitleSubtitle, ButtonToggle, Timeline, ActionMenu,
} from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import PlanningDatesModal from './PlanningDatesModal.jsx'
import ViewRoutingModal from './ViewRoutingModal.jsx'
import AddOrdersModal from './AddOrdersModal.jsx'
import { getSellShipmentDetail } from '../../../api/services/shipmentService'
import { DiffValue, val } from '../../shipments/order-change/comparisonHelpers.jsx'
import { orderTooltipProps } from './orderTooltip.js'
import {
  initSandbox, labelsOf, canMoveStop, moveStop, moveToPending, addToStop, addPending,
  isRoutable, markRouted, totals, priorDiff, toDto,
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
  const [view, setView] = useState('first') // 'first' = New, 'second' = Prior
  const [errorMsg, setErrorMsg] = useState(null)
  const [modal, setModal] = useState(null) // 'planning' | 'routing' | 'discard' | 'confirm' | 'add-orders'

  const isPrior = view === 'second'
  const initialTotals = useMemo(() => totals(initial, orders), [initial, orders])
  const curTotals = totals(sb, allOrders)
  const diff = priorDiff(sb)
  const displayStops = isPrior ? sb.prior : sb.stops
  const labels = labelsOf({ stops: displayStops })

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
  const handleAddTo = (id, stopKey) => {
    setErrorMsg(null)
    setSb((s) => addToStop(s, id, allOrders, stopKey))
  }
  const handleViewChange = (next) => {
    setErrorMsg(null)
    setView(next)
  }

  const routable = isRoutable(sb)
  const routingDisabled = !routable || isPrior
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

  const alertVariant = isPrior ? 'info' : (errorMsg ? 'error' : 'info')
  const alertText = isPrior ? 'Prior changes view mode' : (errorMsg || HINT)

  const items = displayStops.map((s, i) => {
    const label = labels[i]
    const isPickup = s.type === 'pickup'
    const removed = isPrior && diff.removedStopKeys.includes(s.key)
    const moved = isPrior && !removed && diff.movedStopKeys.includes(s.key)
    // Structural edges only (first stop has no up, last has no down) — a
    // move that's illegal for sequencing reasons (LINX-15669) stays
    // clickable so canMoveStop's reason can surface in the Alert.
    const upDisabled = isPrior || i === 0
    const downDisabled = isPrior || i === displayStops.length - 1
    return {
      key: s.key,
      label,
      status: 'completed', // no per-stop status on this VM; VD shows a plain rail
      content: (
        <div className="edit-stops__card">
          <HeaderStrip
            title={`Stop ${i + 1}`}
            badge={(
              <>
                <Badge variant="green">{isPickup ? 'Pickup' : 'Delivery'}</Badge>
                {removed && <Badge variant="amber">Removed</Badge>}
                {moved && <Badge variant="amber">Moved</Badge>}
              </>
            )}
            trail={(
              <>
                <Button variant="icon" icon={<ArrowUp {...ICON_MD} />} aria-label="Move stop up" disabled={upDisabled} onClick={() => handleMove(i, 'up')} />
                <Button variant="icon" icon={<ArrowDown {...ICON_MD} />} aria-label="Move stop down" disabled={downDisabled} onClick={() => handleMove(i, 'down')} />
              </>
            )}
          />
          <div className="edit-stops__fields">
            <TitleSubtitle subtitle="Location" title={s.location || '--'} />
            <TitleSubtitle subtitle="Distance" title="--" />
            <TitleSubtitle subtitle="Pickup Date" title={isPickup ? (s.date || '--') : '--'} />
            <TitleSubtitle subtitle="Delivery Date" title={!isPickup ? (s.date || '--') : '--'} />
          </div>
          <div className="edit-stops__orders">
            {s.orderIds.map((id) => {
              const isRemovedOrder = diff.removedOrderIds.includes(id)
              return (
                <div className="edit-stops__order-row" key={id}>
                  <span className="edit-stops__order-label text-label-sm-medium">Order #</span>
                  {isRemovedOrder
                    ? <Badge variant="amber">{id}</Badge>
                    // ponytail: no order drill-in yet — deferred, wire up when the
                    // Order Compare / detail surface has a route for this VM.
                    : (
                      <TooltipTrigger tooltipProps={orderTooltipProps(orderById.get(id), s.type, id)}>
                        <Button variant="link" onClick={() => {}}>{id}</Button>
                      </TooltipTrigger>
                    )}
                  {singleOrderLeft ? (
                    <TooltipTrigger tooltipProps={{ groups: [{ content: LAST_ORDER_TOOLTIP }] }}>
                      <Button variant="secondary" icon={<ClipboardList {...ICON_MD} />} disabled>Move To Pending</Button>
                    </TooltipTrigger>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={<ClipboardList {...ICON_MD} />}
                      disabled={isPrior}
                      onClick={() => handleMoveToPending(id)}
                    >
                      Move To Pending
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

  return (
    <div className="edit-stops">
      <SubAccordion
        title={isPrior ? 'All Stops - Prior Changes' : 'All Stops'}
        collapsible={false}
        buttonToggle={(
          <ButtonToggle
            firstLabel="New"
            secondLabel="Prior"
            selected={view}
            onChange={handleViewChange}
            disabled={!sb.dirty}
          />
        )}
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
            <Button variant="secondary" disabled={isPrior} onClick={() => setModal('planning')}>View Planning Dates</Button>
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
          <Timeline animate items={items} className="edit-stops__rail" aria-label="All stops" />

          <div className={`edit-stops__pending${isPrior ? ' edit-stops__pending--muted' : ''}`}>
            <HeaderStrip title="Orders Pending To Assign" />
            <Button variant="secondary" disabled={isPrior} className="edit-stops__add-new" onClick={() => setModal('add-orders')}>Add New Order</Button>
            {sb.pending.map((id) => (
              <div className="edit-stops__pending-row" key={id}>
                {/* ponytail: no order drill-in yet — deferred, wire up when the
                    Order Compare / detail surface has a route for this VM. */}
                <TooltipTrigger tooltipProps={orderTooltipProps(orderById.get(id), undefined, id)}>
                  <Button variant="link" onClick={() => {}}>{id}</Button>
                </TooltipTrigger>
                {isPrior
                  ? <Button variant="secondary" icon={<Plus {...ICON_MD} />} disabled>Add to</Button>
                  : (
                    <ActionMenu
                      label="Add to"
                      ariaLabel={`Add to stop — order ${id}`}
                      align="right"
                      // D3 — the planner chooses; type + location make the choice readable.
                      // VD 2076-8110 / DEC-140: the pending column is a buffer pool, not
                      // an auto-matcher — Add to opens a menu of stops instead of guessing one.
                      options={sb.stops.map((s, i) => ({ id: s.key, label: `Stop ${i + 1} · ${s.type === 'pickup' ? 'Pickup' : 'Delivery'} · ${s.location || '--'}`, onSelect: () => handleAddTo(id, s.key) }))}
                    />
                  )}
              </div>
            ))}
          </div>
        </div>
      </SubAccordion>

      <ModalFooter
        type="confirm"
        cancelLabel="Cancel"
        saveLabel="Approve Changes"
        saveDisabled={!sb.routed || isPrior || saving}
        onCancel={handleCancel}
        onSave={() => setModal('confirm')}
      />

      {modal === 'planning' && <PlanningDatesModal orders={planningOrders} onClose={() => setModal(null)} />}
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

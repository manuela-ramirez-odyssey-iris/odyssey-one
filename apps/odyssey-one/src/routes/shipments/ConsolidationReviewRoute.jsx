import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { Inbox, MapPin, GripVertical, Trash2, Replace } from 'lucide-react'
import { Alert, Badge, Breadcrumb, Button, DataTable, EmptyState, ModalMedium, PageHeader, Radio, StepperButtonsFooter, SubAccordion, SummaryStrip, Timeline } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { DEFAULT_COLUMNS } from '../../components/detail/ColumnPanel.jsx'
import { getSellShipmentDetail, saveTenderOption } from '../../api/services/shipmentService'
import { shipmentDetailQueryKey } from '../../api/queries/useShipmentDetail'
import { useApplyConsolidation } from '../../api/queries/useApplyConsolidation'
import { routingOptionVmToDto } from '../../api/mappers/mapSellShipmentOutToDetail'
import { applyTenderAction } from '../../lib/tenderAction.js'
import { buildProposal } from '../../consolidation/proposal'
import { reorderStops, invalidStopKeys } from '../../consolidation/stopOrder'
import { currentUser } from '../../data/sso-mock.js'
import { formatDateTimeMDYHM } from '../../lib/dates.js'
import useSheet from '../useSheet'
import '../../components/shipments/order-change/order-change.css'
import './consolidation-review.css'

// Review & Apply Manual Consolidation — /shipments/consolidate/review
// (LINX-15787; VD x38TOJGsNryYl3LsKhCtSc node 2249:46444, Efrain pass S161).
// Input is the selection ShipmentsRoute's consolidate mode hands over in
// location.state.rows; nothing is fetched to render the page except each
// shipment's detail, for volume/hazmat/routing. Apply (S155) creates the `C…`
// shipment through useApplyConsolidation and turns this page into a read-only
// preview of what it made.
//
// S161 (Efrain pass) — the rows here ARE the consolidation (no more
// include/exclude checkboxes, B1): the only way to change the set is Edit
// Consolidation (back to the mode), or the Tendered Shipment Detected flow
// (B3) dropping a row that got tendered out from under the planner.

const COLUMN_BY_KEY = Object.fromEntries(COLUMN_CONFIG.map((c) => [c.key, c]))
const REVIEW_COLUMNS = ['odysseyShipmentIdentifier', 'customerId', 'shipmentStatus', 'orderCount', 'orders', 'pickupDate']
const columnHelper = createColumnHelper()

// Mirrors consolidation/eligibility.js's ACTIVE_TENDER — not exported there
// (that file is untouched in this pass), so the set is duplicated rather than
// reached into.
const ACTIVE_TENDER = new Set(['Sent', 'Accepted'])

const fmtLb = (n) => `${Math.round(n).toLocaleString('en-US')} LB`
const fmtCuft = (n) => (n == null ? '--' : `${Math.round(n).toLocaleString('en-US')} cuft`)
const fmtPct = (n) => (n == null ? '--' : `${n}%`)

// Copy per user ruling 2026-09-25 (item 1) — "already" dropped, singular/plural forms.
const tenderedErrorMessage = (tenderedRows) => (tenderedRows.length === 1
  ? `Shipment ${tenderedRows[0].odysseyShipmentIdentifier} has been tendered and cannot be consolidated.`
  : `Shipments ${tenderedRows.map((r) => r.odysseyShipmentIdentifier).join(', ')} have been tendered and cannot be consolidated.`)
const removedAlertMessage = (ids) => (ids.length === 1
  ? `Tendered shipment ${ids[0]} removed from the consolidation.`
  : `Tendered shipments ${ids.join(', ')} removed from the consolidation.`)
const cancelledAlertMessage = (ids) => (ids.length === 1
  ? `Tender cancelled on shipment ${ids[0]}.`
  : `Tender cancelled on shipments ${ids.join(', ')}.`)

// >5s in the Confirm state re-arms the concurrent-tender roll on the next
// Apply click (user ruling item 3, "Simulation"). ponytail: prototype-only.
const CONFIRM_REROLL_MS = 5000

// Read-only listing — the pre-Apply "Selected shipments to consolidate" rows
// (REVIEW_COLUMNS) or, post-Apply, the ONE created C… row on the Shipments
// list's own default column set. No select column either way since B1 — the
// table stopped being an include/exclude control.
function ShipmentsPreviewTable({ rows, columnKeys, ariaLabel }) {
  const columns = useMemo(() => columnKeys.map((key) => {
    const cfg = COLUMN_BY_KEY[key]
    return columnHelper.accessor(key, {
      id: key,
      header: cfg?.label ?? key,
      cell: cfg?.render ? ({ row }) => cfg.render(row.original) : ({ getValue }) => getValue() ?? '—',
      enableSorting: false,
    })
  }), [columnKeys])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })
  return <DataTable table={table} ariaLabel={ariaLabel} truncationTooltip />
}

// The small table inside the Tendered Shipment Detected modal (B3) — every
// row currently in the review, so the planner sees which one(s) tripped the
// check next to the ones that didn't.
function TenderedCheckTable({ rows }) {
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'tenderedStatus',
      header: 'Shipment Status',
      cell: ({ row }) => (ACTIVE_TENDER.has(row.original.tenderStatus) ? <Badge variant="red">Tendered</Badge> : null),
    }),
    columnHelper.accessor('odysseyShipmentIdentifier', { header: 'Odyssey Shipment ID' }),
    columnHelper.accessor('customerId', { header: 'Customer ID(s)' }),
    columnHelper.display({
      id: 'orderNumber',
      header: 'Order Number',
      cell: ({ row }) => (
        <div className="consolidation-review__chips">
          {(row.original.orders ?? []).map((o) => <Badge key={o} variant="amber">{o}</Badge>)}
        </div>
      ),
    }),
    columnHelper.accessor('pickupDate', { header: 'Pickup Date' }),
  ], [])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })
  return <DataTable table={table} ariaLabel="Shipments in this consolidation" truncationTooltip />
}

// Shared row body for a Planned Stop — `grip` shows the drag-handle icon
// (editable/sortable rows only). `tone` (user, 2026-09-25): 'invalid' = red
// (a delivery above its own pickup, after a Save attempt), 'changed' =
// purple (moved since the last save), otherwise the original colours.
function StopContent({ s, tone, grip }) {
  const toneClass = tone ? ` consolidation-review__stop-location--${tone}` : ''
  return (
    <div className="consolidation-review__stop-inner">
      <div className="consolidation-review__stop-head">
        <span className={`text-label-sm-medium${toneClass}`}>{s.location}</span>
        <Badge variant={s.type === 'pickup' ? 'blue' : 'green'}>{s.type === 'pickup' ? 'Pickup' : 'Delivery'}</Badge>
        {grip && <GripVertical size={16} className="consolidation-review__stop-grip" aria-hidden="true" />}
      </div>
      <span className="text-label-xs-regular consolidation-review__stop-date">Scheduled: {s.date}</span>
      {/* The pair key (user, 2026-09-27): a shipment's P and D share this ID. */}
      <span className="text-label-xs-regular consolidation-review__stop-date consolidation-review__stop-shipment">Shipment: {s.shipmentId}</span>
    </div>
  )
}

// S161 — same sortable-row pattern as Home's metrics-library panel list
// (SortablePanelItem in routes/Home.jsx): useSortable's own transform drives
// an inline translate3d, no custom ghost/FLIP/hysteresis. Listeners go on the
// whole row (not just the grip icon), matching Home.
function SortableStop({ s, tone, paired, onPairHover }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.key })
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    background: isDragging ? 'var(--deep-sea-neutral-200)' : undefined,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`consolidation-review__stop${paired ? ' consolidation-review__stop--paired' : ''}`}
      data-dragging={isDragging ? 'true' : undefined}
      onMouseEnter={() => onPairHover(s.sellShipment)}
      onMouseLeave={() => onPairHover(null)}
      {...attributes}
      {...listeners}
    >
      <StopContent s={s} tone={tone} grip />
    </div>
  )
}

// Timeline item builder for the Planned Stops list — sortable rows only while
// `pair` is passed (read-only, no grip, once applied). `pair.shipment` lights
// up both stops of the hovered/dragged shipment (user, 2026-09-27).
function stopTimelineItems(stops, changedKeys, invalidKeys, pair) {
  return stops.map((s) => {
    // A gray (mid-drag, affected) stop drops its red alert too.
    const tone = invalidKeys.has(s.key) && !s.gray ? 'invalid' : changedKeys.has(s.key) ? 'changed' : null
    return {
      key: s.key,
      label: s.label,
      status: tone === 'invalid' ? 'issue' : tone === 'changed' ? 'changed' : 'completed',
      // Mini status icon (user, 2026-09-27): the check only on a NUMBERED
      // unchanged stop, the alert on an invalid one; none while unconfirmed.
      showStatusBadge: tone === 'invalid' || (!tone && /\d/.test(s.label)),
      badgeClassName: s.type === 'pickup' ? 'consolidation-review__stop-badge--pickup' : undefined,
      content: pair
        ? <SortableStop s={s} tone={tone} paired={pair.shipment === s.sellShipment} onPairHover={pair.onHover} />
        : <div className="consolidation-review__stop"><StopContent s={s} tone={tone} grip={false} /></div>,
    }
  })
}

export default function ConsolidationReviewRoute() {
  const location = useLocation()
  const { closeSheet } = useSheet()
  const queryClient = useQueryClient()
  // B1: rows ARE the consolidation, so this is state, not a derived const —
  // B3's Remove outcome drops rows straight out of it.
  const [rows, setRows] = useState(() => location.state?.rows ?? [])
  const [pending, setPending] = useState(null) // 'cancel' | null — Apply's own confirm now lives in applyModal
  const apply = useApplyConsolidation()
  const applied = apply.data ?? null
  const [alertDismissed, setAlertDismissed] = useState(false)

  // Volume/hazmat/routing live on the detail, not the grid row (proposal.js
  // + B3's tender check both read it).
  const detailQueries = useQueries({
    queries: rows.map((r) => ({
      queryKey: shipmentDetailQueryKey(r.sellShipment),
      queryFn: () => getSellShipmentDetail(r.sellShipment),
    })),
  })
  const details = detailQueries.map((q) => q.data)
  const detailsFailed = detailQueries.some((q) => q.isError)
  const proposal = buildProposal(rows, details)

  // ── B2: draggable Planned Stops ─────────────────────────────────────────
  // committed = the SAVED stop order Apply builds from; draft = the working
  // copy the drag handlers move. Both are plain key arrays (proposal.js's
  // stop.key shape). Reset to the default order whenever the underlying stop
  // set changes under us (row count via Edit Consolidation or B3's Remove) —
  // a stale custom order would no longer name a valid set.
  const byStopKey = useMemo(() => Object.fromEntries(proposal.stops.map((s) => [s.key, s])), [proposal.stops])
  const defaultOrder = useMemo(() => proposal.stops.map((s) => s.key), [proposal.stops])
  const defaultSig = defaultOrder.join('|')
  const [committedStops, setCommittedStops] = useState({ sig: defaultSig, order: defaultOrder })
  const [draftStops, setDraftStops] = useState(committedStops.order)
  // After a Save attempt: the out-of-order pairs (red) and the Amend/Reset
  // dialog. `showChanged` goes false on every Save attempt — valid stops fall
  // back to their original colours — and true again on the next reorder.
  const [invalidKeys, setInvalidKeys] = useState(() => new Set())
  const [invalidPrompt, setInvalidPrompt] = useState(false)
  const [showChanged, setShowChanged] = useState(true)
  const stopsOutOfSync = defaultSig !== committedStops.sig
  if (stopsOutOfSync) {
    setCommittedStops({ sig: defaultSig, order: defaultOrder })
    setDraftStops(defaultOrder)
    setInvalidKeys(new Set())
  }
  // React doesn't apply the setState calls above until the NEXT render, so
  // anything computed later in THIS render still has to use `defaultOrder`
  // (fresh, matches `byStopKey`) rather than the state, which is stale by
  // exactly one render whenever the underlying stop set just changed.
  const effectiveCommittedOrder = stopsOutOfSync ? defaultOrder : committedStops.order
  const effectiveDraftOrder = stopsOutOfSync ? defaultOrder : draftStops
  const stopsDirty = effectiveDraftOrder.join('|') !== effectiveCommittedOrder.join('|')
  // Labels follow the PAIR, not the position (user, 2026-09-27): P1/D1 are
  // always shipment 1's pickup and delivery (proposal.js), so they travel with
  // the stop when it moves — "D1 above P1" then reads as exactly the error it is.
  // From the first stop that moved since the last successful save DOWN, every
  // stop shows its type letter only (P / D) — the sequence below a change is
  // unconfirmed until it saves (user, 2026-09-27).
  // While a stop is held it's a "gray moment" (user, 2026-09-27) for every
  // stop it could affect — from the higher of its origin slot and the slot
  // it's over, down: no number, no check, no alert until the drop.
  // `dragFrom` = that index, null when nothing is held.
  const [dragFrom, setDragFrom] = useState(null)
  // The shipment whose pair is lit — hovered, or held in a drag.
  const [pairShipment, setPairShipment] = useState(null)
  const savedFirstMoved = effectiveDraftOrder.findIndex((key, i) => effectiveCommittedOrder[i] !== key)
  const firstMoved = dragFrom == null ? savedFirstMoved
    : savedFirstMoved === -1 ? dragFrom : Math.min(savedFirstMoved, dragFrom)
  const displayedStops = effectiveDraftOrder.map((key, i) => {
    const s = byStopKey[key]
    // Hovered pair (not mid-drag): its markers drop their numbers too
    // (user, 2026-09-27 — trial, replaces the opacity fade).
    const hoveredPair = dragFrom == null && pairShipment === s.sellShipment
    if (hoveredPair) return { ...s, label: s.type === 'pickup' ? 'P' : 'D' }
    if (firstMoved === -1 || i < firstMoved) return s
    return { ...s, label: s.type === 'pickup' ? 'P' : 'D', gray: dragFrom != null }
  })
  const trackDrag = (activeId, overId) => {
    const a = effectiveDraftOrder.indexOf(activeId)
    const o = overId == null ? a : effectiveDraftOrder.indexOf(overId)
    setDragFrom(Math.min(a, o === -1 ? a : o))
  }
  // S161 — same sensors as Home's dnd-kit sortables (PointerSensor with an
  // 8px activation distance so a plain click doesn't start a drag, plus
  // KeyboardSensor for accessible reordering).
  const sortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const handleStopDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setShowChanged(true)
    setDraftStops((prev) => {
      const from = prev.indexOf(active.id)
      const to = prev.indexOf(over.id)
      if (from === -1 || to === -1) return prev
      return reorderStops(prev, from, to)
    })
  }
  // Reset = back to the ORIGINAL proposal (user, 2026-09-25), saved or not.
  const stopsCustomised = effectiveDraftOrder.join('|') !== defaultSig || effectiveCommittedOrder.join('|') !== defaultSig
  const handleResetStops = () => {
    setCommittedStops({ sig: defaultSig, order: defaultOrder })
    setDraftStops(defaultOrder)
    setInvalidKeys(new Set())
    setInvalidPrompt(false)
  }
  const handleSaveStops = () => {
    const bad = invalidStopKeys(draftStops)
    setInvalidKeys(bad)
    setShowChanged(false)
    if (bad.size) { setInvalidPrompt(true); return }
    setCommittedStops({ sig: defaultSig, order: draftStops })
  }

  // ── B3/B4 follow-up: one Apply modal, Confirm ⇄ Tendered-error ──────────
  // { phase: 'confirm'|'error', action?: 'remove'|'discard'|'cancelTender', alert?: string } | null
  const [applyModal, setApplyModal] = useState(null)
  // Set/reset every time the modal (re-)enters Confirm — the >5s re-roll
  // (below) measures from here, not from when the modal first opened.
  const [confirmEnteredAt, setConfirmEnteredAt] = useState(null)
  const tenderedRows = rows.filter((r) => ACTIVE_TENDER.has(r.tenderStatus))
  const [tenderCheckBusy, setTenderCheckBusy] = useState(false)
  const [tenderCheckError, setTenderCheckError] = useState(null)
  // ponytail: prototype-only simulation of a concurrent tender acceptance —
  // eligibility.js already refuses a tendered row at selection time, so the
  // real trigger for this check ("a tender got accepted WHILE the planner was
  // mid-review") has no event to hang off in this prototype. A coin flip on
  // the FIRST Apply attempt stands in for it, once per review, so the B3 flow
  // stays reachable without a live trigger. A second roll re-arms once the
  // modal has sat in Confirm for >5s (CONFIRM_REROLL_MS) — see
  // handleConfirmApplyClick.
  const [simulatedOnce, setSimulatedOnce] = useState(false)
  const [checkingApply, setCheckingApply] = useState(false)

  async function simulateConcurrentTender(row, detail) {
    const options = detail?.routingData?.options ?? []
    const target = options[0]
    if (!target) return null
    const now = formatDateTimeMDYHM(new Date())
    const { updated, touched } = applyTenderAction(options, target.rank, 'Accept', {
      now, currentUserName: currentUser.name, sellShipment: row.sellShipment,
    })
    await Promise.all(touched.map((r) =>
      saveTenderOption(row.sellShipment, routingOptionVmToDto(updated.find((o) => o.rank === r)))))
    queryClient.invalidateQueries({ queryKey: shipmentDetailQueryKey(row.sellShipment) })
    return { ...row, tenderStatus: 'Accepted' }
  }

  // Opens the merged Apply modal — runs the FIRST-open 50% roll (once per
  // review), then lands in the Error phase (a tendered row is in the set) or
  // the Confirm phase (clean).
  const openApplyModal = async () => {
    setCheckingApply(true)
    try {
      let currentRows = rows
      if (!simulatedOnce) {
        setSimulatedOnce(true)
        if (Math.random() < 0.5) {
          const idx = Math.floor(Math.random() * rows.length)
          const tendered = await simulateConcurrentTender(rows[idx], details[idx])
          if (tendered) {
            currentRows = rows.map((r, i) => (i === idx ? tendered : r))
            setRows(currentRows)
          }
        }
      }
      const tenderedNow = currentRows.filter((r) => ACTIVE_TENDER.has(r.tenderStatus))
      if (tenderedNow.length) {
        const remaining = currentRows.length - tenderedNow.length
        setApplyModal({ phase: 'error', action: remaining >= 2 ? 'remove' : 'discard' })
        return
      }
      setApplyModal({ phase: 'confirm' })
      setConfirmEnteredAt(Date.now())
    } finally {
      setCheckingApply(false)
    }
  }


  // The Confirm-phase "Apply Consolidation" click: re-verifies no row has
  // gone tendered since the modal opened (user ruling item 3, "re-verifies"),
  // and — if the modal has sat in Confirm for >5s — rolls the same 50% coin
  // flip a second time before applying (ponytail: prototype-only).
  const handleConfirmApplyClick = async () => {
    let currentRows = rows
    const sittingLong = confirmEnteredAt != null && Date.now() - confirmEnteredAt > CONFIRM_REROLL_MS
    if (sittingLong && Math.random() < 0.5) {
      const untenderedIdx = rows.reduce((acc, r, i) => (ACTIVE_TENDER.has(r.tenderStatus) ? acc : [...acc, i]), [])
      if (untenderedIdx.length) {
        const idx = untenderedIdx[Math.floor(Math.random() * untenderedIdx.length)]
        const tendered = await simulateConcurrentTender(rows[idx], details[idx])
        if (tendered) {
          currentRows = rows.map((r, i) => (i === idx ? tendered : r))
          setRows(currentRows)
        }
      }
    }
    const tenderedNow = currentRows.filter((r) => ACTIVE_TENDER.has(r.tenderStatus))
    if (tenderedNow.length) {
      const remaining = currentRows.length - tenderedNow.length
      setApplyModal({ phase: 'error', action: remaining >= 2 ? 'remove' : 'discard' })
      return
    }
    setApplyModal(null)
    apply.mutate({ sellShipments: currentRows.map((r) => r.sellShipment), stopOrder: committedStops.order })
  }

  // "Cancel tendered shipment(s)" reuses the Tender tab's OWN Cancel path
  // (lib/tenderAction.js's applyTenderAction, shared with RoutingGuideTab.jsx)
  // — including its auto-tender cascade — rather than a hand-rolled variant
  // (user ruling, 2026-09-25). Rows stay (not dropped) — only their
  // tenderStatus clears, so the Tendered badge goes away and the next
  // re-verify doesn't re-trip on them.
  const handleCancelTenders = async () => {
    setTenderCheckBusy(true)
    setTenderCheckError(null)
    try {
      const ids = tenderedRows.map((r) => r.odysseyShipmentIdentifier)
      await Promise.all(tenderedRows.map(async (row) => {
        const idx = rows.indexOf(row)
        const options = details[idx]?.routingData?.options ?? []
        const active = options.find((o) => ACTIVE_TENDER.has(o.status))
        if (!active) return
        const now = formatDateTimeMDYHM(new Date())
        const { updated, touched } = applyTenderAction(options, active.rank, 'Cancel', {
          now, currentUserName: currentUser.name, sellShipment: row.sellShipment,
        })
        await Promise.all(touched.map((r) =>
          saveTenderOption(row.sellShipment, routingOptionVmToDto(updated.find((o) => o.rank === r)))))
        queryClient.invalidateQueries({ queryKey: shipmentDetailQueryKey(row.sellShipment) })
      }))
      const cancelledIds = new Set(tenderedRows.map((r) => r.id))
      setRows((rs) => rs.map((r) => (cancelledIds.has(r.id) ? { ...r, tenderStatus: 'Cancelled' } : r)))
      setApplyModal({ phase: 'confirm', alert: cancelledAlertMessage(ids) })
      setConfirmEnteredAt(Date.now())
    } catch (e) {
      setTenderCheckError(e?.message || "Couldn't cancel the tender. Nothing was changed.")
    } finally {
      setTenderCheckBusy(false)
    }
  }

  // Zero-arg on purpose — these are click handlers, and a default parameter
  // would swallow the event object as its argument.
  const backInModeWith = (rowsBack) => closeSheet('/shipments', { state: { consolidate: { rows: rowsBack } } })
  const backInMode = () => backInModeWith(rows)
  // `consolidateExit: true` (S158 plan §4) — ShipmentsRoute stays MOUNTED
  // under this sheet, so leaving here must explicitly tell it to exit
  // consolidate mode (restoring its prior panel/filters); a full remount used
  // to do that silently by resetting everything to defaults.
  const leave = () => closeSheet('/shipments', { state: { consolidateExit: true } })
  const viewCreated = () => closeSheet('/shipments', { state: { consolidateExit: true, createdShipment: applied.row } })

  // The Error-phase "Apply Solution" click — does NOT close the modal
  // (user ruling item 3): Remove/Cancel land back in the Confirm phase with a
  // green success Alert; Discard is the only outcome that exits the page.
  const handleApplySolution = async () => {
    if (applyModal.action === 'remove') {
      const ids = tenderedRows.map((r) => r.odysseyShipmentIdentifier)
      const dropped = new Set(tenderedRows.map((r) => r.id))
      setRows((rs) => rs.filter((r) => !dropped.has(r.id)))
      setApplyModal({ phase: 'confirm', alert: removedAlertMessage(ids) })
      setConfirmEnteredAt(Date.now())
      return
    }
    if (applyModal.action === 'discard') {
      const dropped = new Set(tenderedRows.map((r) => r.id))
      setApplyModal(null)
      backInModeWith(rows.filter((r) => !dropped.has(r.id)))
      return
    }
    await handleCancelTenders()
  }

  if (!rows.length) {
    return (
      <AppShell titleMode={{ title: 'Manual Consolidation', onClose: leave }} sidebarHidden>
        <div className="order-change">
          <EmptyState icon={<Inbox size={32} />} message="No consolidation to review." />
          <div><Button variant="secondary" onClick={leave}>Back to Shipments</Button></div>
        </div>
      </AppShell>
    )
  }

  // S154: the VD's marker pills are SOLID with white text, not the outlined
  // "pending" skin — `completed` is already exactly the delivery marker
  // (Caribbean Green/600 + white); pickup reuses it as its base and gets
  // re-tinted blue by a scoped CSS rule (Timeline forwards badgeClassName to
  // StopBadge). No status circle — these are planned stops, not tracked
  // progress.
  // A stop is "changed" (user ruling 2026-09-25, item 1) when its position in
  // the currently displayed order differs from the ORIGINAL proposed order
  // (`defaultOrder` — the default sequence the review opened with, not just
  // the last saved one). Holds for unsaved and saved changes alike, and stays
  // after Apply since `displayedStops` still reads from the same order.
  const changedKeys = showChanged ? new Set(effectiveDraftOrder.filter((key, i) => effectiveCommittedOrder[i] !== key)) : new Set()
  const timelineItems = stopTimelineItems(displayedStops, changedKeys, invalidKeys, applied ? null : {
    shipment: pairShipment,
    // Hover is ignored mid-drag — the pointer passing over other stops must not re-light pairs.
    onHover: (shipment) => { if (dragFrom == null) setPairShipment(shipment) },
  })

  const tableRows = applied ? [applied.row] : rows
  const tableColumns = applied ? DEFAULT_COLUMNS : REVIEW_COLUMNS
  const remaining = rows.length - tenderedRows.length
  const radioOptions = applyModal?.phase === 'error' && (remaining >= 2
    ? [
        { value: 'remove', label: `Remove tendered shipment(s) and proceed with the remaining ${remaining}.`, Icon: Trash2 },
        { value: 'cancelTender', label: 'Cancel tender on the accepted shipments and continue consolidation.', Icon: Replace },
      ]
    : [
        { value: 'discard', label: 'Discard and select different shipments. Consolidation requires at least 2 shipments.', Icon: Trash2 },
        { value: 'cancelTender', label: 'Cancel tender on the accepted shipment and continue consolidation.', Icon: Replace },
      ])

  return (
    // sidebarHidden: the VD (2249:46444) shows no rail, and this screen
    // continues consolidate mode from /shipments, which already hid it —
    // it should stay hidden for the rest of the flow.
    <AppShell titleMode={{ title: 'Manual Consolidation', onClose: applied ? leave : backInMode }} sidebarHidden>
      <div className="order-change consolidation-review">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipments Consolidation" onClick={applied ? leave : backInMode} />
          <Breadcrumb label={applied ? `Review ${applied.row.odysseyShipmentIdentifier}` : 'Review & Apply'} current />
        </nav>

        {/* Outcome banners sit ABOVE the header (VD): the result of the action
            the planner just took outranks the page's own title. */}
        {applied && !alertDismissed && (
          <Alert
            variant="success"
            showLink
            linkLabel="View Shipment"
            onLinkClick={viewCreated}
            onClose={() => setAlertDismissed(true)}
          >
            Consolidation Successfully Applied! Consolidation ID: {applied.row.odysseyShipmentIdentifier}. {rows.length} Shipments successfully consolidated.
          </Alert>
        )}
        {apply.isError && (
          <Alert variant="error" showClose={false}>
            {apply.error?.message || "Couldn't apply the consolidation. Nothing was changed."}
          </Alert>
        )}

        <PageHeader title={applied ? `Review ${applied.row.odysseyShipmentIdentifier}` : 'Review & Apply Manual Consolidation'} />

        <div className="consolidation-review__body">
          <aside className="consolidation-review__side">
            <h2 className="text-heading-xl-semibold consolidation-review__side-title">Proposed Stop Count &amp; Sequence</h2>
            <div className="consolidation-review__counts">
              <div className="consolidation-review__count consolidation-review__count--pickup">
                <MapPin size={16} />
                <span className="text-label-sm-medium">{proposal.pickupCount} Pickup Stops</span>
              </div>
              <div className="consolidation-review__count consolidation-review__count--delivery">
                <MapPin size={16} />
                <span className="text-label-sm-medium">{proposal.deliveryCount} Delivery Stops</span>
              </div>
            </div>
            <h3 className="text-label-base-semibold consolidation-review__stops-heading">Planned Stops</h3>
            {!applied && (
              <span className="text-label-sm-regular consolidation-review__stops-helper">Drag stops to reorganize</span>
            )}
            {applied ? (
              <Timeline items={timelineItems} animate aria-label="Planned stops" />
            ) : (
              <DndContext
                sensors={sortSensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => { trackDrag(active.id, null); setPairShipment(byStopKey[active.id]?.sellShipment ?? null) }}
                onDragOver={({ active, over }) => trackDrag(active.id, over?.id ?? null)}
                onDragEnd={(e) => { setDragFrom(null); setPairShipment(null); handleStopDragEnd(e) }}
                onDragCancel={() => { setDragFrom(null); setPairShipment(null) }}
              >
                <SortableContext items={effectiveDraftOrder} strategy={verticalListSortingStrategy}>
                  <Timeline items={timelineItems} animate aria-label="Planned stops" />
                </SortableContext>
              </DndContext>
            )}
            {!applied && (
              <>
                <div className="consolidation-review__stop-actions">
                  <Button variant="secondary" disabled={!stopsCustomised} onClick={handleResetStops}>Reset</Button>
                </div>
              </>
            )}
          </aside>

          <section className="consolidation-review__main">
            <h2 className="text-heading-xl-semibold">Consolidation Summary</h2>
            {/* Same strip molecule as the metrics below, backgroundless — one
                label/value idea on the page instead of a bespoke grid (S155 §2.2). */}
            <SummaryStrip
              className="consolidation-review__strip consolidation-review__info-strip"
              background={false}
              aria-label="Consolidation summary"
              items={applied ? [
                { label: 'Customer Name', value: proposal.customerName || proposal.customerId || '--' },
                { label: 'Odyssey Shipment ID', value: applied.row.odysseyShipmentIdentifier },
                {
                  label: 'Orders',
                  value: (
                    <div className="consolidation-review__chips">
                      {(applied.row.orders ?? []).map((o) => <Badge key={o} variant="blue">{o}</Badge>)}
                    </div>
                  ),
                },
              ] : [
                { label: 'Customer Name', value: proposal.customerName || proposal.customerId || '--' },
                {
                  label: `Selected Shipments (${rows.length})`,
                  value: (
                    <div className="consolidation-review__chips">
                      {proposal.identifiers.map((id) => <Badge key={id} variant="purple">{id}</Badge>)}
                    </div>
                  ),
                },
              ]}
            />
            {detailsFailed && (
              <Alert variant="error" showClose={false}>
                Couldn't load volume and hazmat for every selected shipment. The totals below are incomplete.
              </Alert>
            )}
            {/* Weight/Weight Utilization come from the grid rows (proposal.js), not the
                per-shipment detail fetch above — a failed detail fetch doesn't affect them. */}
            <SummaryStrip
              className="consolidation-review__strip"
              items={[
                { label: 'Total Weight', value: fmtLb(proposal.weightLb) },
                { label: 'Weight Utilization', value: fmtPct(proposal.weightUtilization) },
                { label: 'Total Volume', value: fmtCuft(proposal.volumeCuft) },
                { label: 'Volume Utilization', value: fmtPct(proposal.volumeUtilization) },
                { label: 'Hazmat', value: proposal.hazmat == null ? '--' : (proposal.hazmat ? 'Yes' : 'No'), tone: proposal.hazmat ? 'negative' : undefined },
              ]}
            />
            {/* The accordion's action slot is empty since S155: "Edit
                Consolidation" in the footer is the one way back. */}
            <SubAccordion title="Selected shipments to consolidate" collapsible={false}>
              <div className="consolidation-review__table-count text-label-sm-regular">{tableRows.length} items</div>
              <ShipmentsPreviewTable rows={tableRows} columnKeys={tableColumns} ariaLabel="Selected shipments to consolidate" />
            </SubAccordion>
          </section>
        </div>

        {applied ? (
            <StepperButtonsFooter
              className="consolidation-review__footer"
              cancelLabel="Back to Shipments"
              primaryLabel="Edit Consolidated Shipment"
              showSave={false}
              // Same exit as the banner's "View Shipment" (user, 2026-09-21):
              // both land on Shipments with the new row pinned + highlighted.
              onCancel={viewCreated}
              // The created C… row goes back into consolidate mode as the
              // anchor selection — a consolidation is itself a source (§3.3,
              // CNS-09 id reuse).
              onPrimary={() => backInModeWith([applied.row])}
            />
          ) : (
            <StepperButtonsFooter
              className="consolidation-review__footer"
              cancelLabel="Cancel Consolidation"
              showSave
              saveLabel="Edit Consolidation"
              primaryLabel={stopsDirty ? 'Save Stop Changes' : 'Apply Consolidation'}
              primaryDisabled={rows.length < 2 || checkingApply}
              saving={apply.isPending}
              onCancel={() => setPending('cancel')}
              onSave={backInMode}
              onPrimary={stopsDirty ? handleSaveStops : openApplyModal}
            />
          )}

        {/* B4 follow-up: ONE modal, Confirm ⇄ Tendered-error (user ruling
            item 3) — replaces the separate Tendered-Shipment-Detected modal
            and the plain Apply confirmation dialog. */}
        {applyModal && (
          <ModalMedium
            title={applyModal.phase === 'error' ? 'Tendered Shipment Detected' : 'Apply Consolidation'}
            onClose={() => setApplyModal(null)}
            footer={applyModal.phase === 'error' ? (
              <>
                <Button variant="secondary" onClick={() => setApplyModal(null)}>Nevermind</Button>
                <Button onClick={handleApplySolution} disabled={tenderCheckBusy}>Apply Solution</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setApplyModal(null)}>Cancel</Button>
                <Button onClick={handleConfirmApplyClick}>Apply Consolidation</Button>
              </>
            )}
          >
            {applyModal.phase === 'error' ? (
              <Alert variant="error" showClose={false}>
                {tenderedRows.length} Error(s): {tenderedErrorMessage(tenderedRows)}
              </Alert>
            ) : applyModal.alert ? (
              <Alert variant="success" showClose={false}>{applyModal.alert}</Alert>
            ) : (
              <p className="text-label-sm-regular">Are you sure you want to apply the proposed consolidation?</p>
            )}
            {tenderCheckError && <Alert variant="error" showClose={false}>{tenderCheckError}</Alert>}
            <TenderedCheckTable rows={rows} />
            {/* Local markup, not @odyssey/ui — Figma's radio cards (2808:53668 /
                2808:58194) are detached frames, so this is a normalization
                candidate once a real master exists, not a component yet. */}
            {radioOptions && (
              <div className="consolidation-review__radio-cards">
                {radioOptions.map((opt) => {
                  const OptionIcon = opt.Icon
                  return (
                    <label key={opt.value} className="consolidation-review__radio-card" data-selected={applyModal.action === opt.value || undefined}>
                      <Radio
                        checked={applyModal.action === opt.value}
                        onChange={() => setApplyModal((m) => ({ ...m, action: opt.value }))}
                        name="tender-check-action"
                        value={opt.value}
                        showLabel={false}
                      />
                      <OptionIcon size={20} aria-hidden="true" />
                      <span className="text-label-sm-medium">{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </ModalMedium>
        )}

        {invalidPrompt && (
          <ModalMedium
            title="Invalid Stop Sequence"
            onClose={() => setInvalidPrompt(false)}
            footer={(
              <>
                <Button variant="secondary" onClick={handleResetStops}>Reset</Button>
                <Button onClick={() => setInvalidPrompt(false)}>Amend</Button>
              </>
            )}
          >
            <p className="text-label-sm-regular">
              An order must be picked up before it can be delivered. Move the stops marked in red so each shipment's pickup comes first, or reset to the original sequence.
            </p>
          </ModalMedium>
        )}

        {pending === 'cancel' && (
          <ConfirmDialog
            title="Cancel Proposed Consolidation"
            message="Are you sure you want to cancel the proposed consolidation? All the selected shipments will be removed from the proposed consolidation."
            confirmLabel="Yes, Cancel"
            cancelLabel="No"
            onConfirm={leave}
            onCancel={() => setPending(null)}
          />
        )}
      </div>
    </AppShell>
  )
}

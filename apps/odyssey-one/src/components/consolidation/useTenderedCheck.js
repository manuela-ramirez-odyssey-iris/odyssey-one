import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSellShipmentDetail, saveTenderOption } from '../../api/services/shipmentService'
import { shipmentDetailQueryKey } from '../../api/queries/useShipmentDetail'
import { routingOptionVmToDto } from '../../api/mappers/mapSellShipmentOutToDetail'
import { applyTenderAction } from '../../lib/tenderAction.js'
import { currentUser } from '../../data/sso-mock.js'
import { formatDateTimeMDYHM } from '../../lib/dates.js'
import { ACTIVE_TENDER } from '../../consolidation/eligibility.js'

export { ACTIVE_TENDER }
export const isTendered = (r) => ACTIVE_TENDER.has(r.tenderStatus)

// >5s in the Confirm state re-arms the concurrent-tender roll on the next
// Apply click (user ruling item 3, "Simulation"). ponytail: prototype-only.
export const CONFIRM_REROLL_MS = 5000

// Copy per user ruling 2026-09-25 (item 1) — "already" dropped, singular/plural forms.
export const tenderedErrorMessage = (tenderedRows) => (tenderedRows.length === 1
  ? `Shipment ${tenderedRows[0].odysseyShipmentIdentifier} has been tendered and cannot be consolidated.`
  : `Shipments ${tenderedRows.map((r) => r.odysseyShipmentIdentifier).join(', ')} have been tendered and cannot be consolidated.`)
const removedAlertMessage = (ids) => (ids.length === 1
  ? `Tendered shipment ${ids[0]} removed from the consolidation.`
  : `Tendered shipments ${ids.join(', ')} removed from the consolidation.`)
const cancelledAlertMessage = (ids) => (ids.length === 1
  ? `Tender cancelled on shipment ${ids[0]}.`
  : `Tender cancelled on shipments ${ids.join(', ')}.`)

/**
 * External-order rows for the tender check (S6.2): one per source shipment of
 * an order pulled in through Add New Order. `removeIds` = the orders to drop
 * from the sandbox if the planner removes that row.
 */
export function externalCheckRows(externalOrders) {
  const bySell = new Map()
  for (const o of externalOrders) {
    const r = bySell.get(o.sourceSellShipment) ?? {
      id: `ext:${o.sourceSellShipment}`,
      sellShipment: o.sourceSellShipment,
      odysseyShipmentIdentifier: o.sourceIdentifier || o.sourceSellShipment,
      customerId: o.sourceCustomerId,
      orders: o.sourceOrders ?? [],
      pickupDate: o.sourcePickupDate,
      tenderStatus: o.sourceTenderStatus ?? '',
      removeIds: [],
      external: true,
    }
    r.removeIds.push(o.orderNumber)
    bySell.set(o.sourceSellShipment, r)
  }
  return [...bySell.values()]
}

/**
 * The B3/B4 flow of the retired Review & Apply page, unchanged in behaviour
 * and copy (CNS-19, S6.1): a merged modal (confirm phase and error phase),
 * the first-open 50% concurrent-tender roll, and the cancel-tender path
 * through applyTenderAction + saveTenderOption.
 *
 * `rows` = the selected sources (host state, so Remove/Cancel can edit it);
 * `details` = { [sellShipment]: detail VM } for the tender simulation/cancel.
 * Outcomes are the host's: onRemove(orderIds) puts orders back to pending in the
 * editor, onDiscard(rows) returns to the mode, onProceed(rows) writes.
 */
export function useTenderedCheck({ rows, setRows, details, onRemove, onDiscard, onProceed }) {
  const queryClient = useQueryClient()
  // { phase: 'confirm'|'error', action?: 'remove'|'discard'|'cancelTender', alert?: string } | null
  const [modal, setModal] = useState(null)
  // Set/reset every time the modal (re-)enters Confirm — the >5s re-roll
  // measures from here, not from when the modal first opened.
  const [confirmEnteredAt, setConfirmEnteredAt] = useState(null)
  const [externals, setExternals] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // ponytail: prototype-only simulation of a concurrent tender acceptance —
  // eligibility.js already refuses a tendered row at selection time, so the
  // real trigger ("a tender got accepted WHILE the planner was mid-review")
  // has no event to hang off in this prototype. A coin flip on the FIRST open
  // stands in for it, once per session; a second roll re-arms once the modal
  // has sat in Confirm for >5s (CONFIRM_REROLL_MS).
  const [simulatedOnce, setSimulatedOnce] = useState(false)
  const [checking, setChecking] = useState(false)

  const checkRows = [...rows, ...externals]
  const tenderedRows = checkRows.filter(isTendered)

  // Remove needs >=2 source shipments left; otherwise Discard (S6.3). A tendered
  // EXTERNAL row alone never costs a source, so it is always Remove.
  const actionFor = (curRows) => {
    const tenderedSources = curRows.filter(isTendered).length
    return tenderedSources === 0 || curRows.length - tenderedSources >= 2 ? 'remove' : 'discard'
  }

  async function simulateConcurrentTender(row) {
    const options = details[row.sellShipment]?.routingData?.options ?? []
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

  const enterConfirm = (extra) => {
    setModal({ phase: 'confirm', ...extra })
    setConfirmEnteredAt(Date.now())
  }
  const evaluate = (curRows, curExt) => {
    if ([...curRows, ...curExt].some(isTendered)) {
      setModal({ phase: 'error', action: actionFor(curRows) })
      return true
    }
    return false
  }

  // Approve in the editor -> the merged modal: first-open roll, then the Error
  // phase (a tendered row is in the set) or the Confirm phase (clean).
  const open = async (externalOrders) => {
    setChecking(true)
    try {
      const ext = externalCheckRows(externalOrders)
      setExternals(ext)
      setError(null)
      let currentRows = rows
      if (!simulatedOnce) {
        setSimulatedOnce(true)
        if (rows.length && Math.random() < 0.5) {
          const idx = Math.floor(Math.random() * rows.length)
          const tendered = await simulateConcurrentTender(rows[idx])
          if (tendered) {
            currentRows = rows.map((r, i) => (i === idx ? tendered : r))
            setRows(currentRows)
          }
        }
      }
      if (!evaluate(currentRows, ext)) enterConfirm()
    } catch (e) {
      // A rejected simulated tender write must surface, not vanish.
      setError(e?.message || "Couldn't verify the tender status. Try again.")
      enterConfirm()
    } finally {
      setChecking(false)
    }
  }

  // The Confirm-phase "Apply Consolidation" click: re-verifies no row has gone
  // tendered since the modal opened (user ruling item 3, "re-verifies"), and —
  // if the modal has sat in Confirm for >5s — rolls the same 50% coin flip
  // a second time before applying (ponytail: prototype-only).
  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await runConfirm()
    } catch (e) {
      setError(e?.message || "Couldn't verify the tender status. Try again.")
    } finally {
      setBusy(false)
    }
  }
  const runConfirm = async () => {
    let currentRows = rows
    const sittingLong = confirmEnteredAt != null && Date.now() - confirmEnteredAt > CONFIRM_REROLL_MS
    if (sittingLong && Math.random() < 0.5) {
      const untendered = rows.filter((r) => !isTendered(r))
      if (untendered.length) {
        const row = untendered[Math.floor(Math.random() * untendered.length)]
        const tendered = await simulateConcurrentTender(row)
        if (tendered) {
          currentRows = rows.map((r) => (r.id === row.id ? tendered : r))
          setRows(currentRows)
        }
      }
    }
    if (evaluate(currentRows, externals)) return
    // The modal stays open through the write (S6.4): an error surfaces in it.
    onProceed(currentRows)
  }

  // "Cancel tendered shipment(s)" reuses the Tender tab's OWN Cancel path
  // (lib/tenderAction.js's applyTenderAction, shared with RoutingGuideTab.jsx)
  // — including its auto-tender cascade (user ruling, 2026-09-25). Rows stay —
  // only their tenderStatus clears, so the next re-verify doesn't re-trip.
  const cancelTenders = async () => {
    setBusy(true)
    setError(null)
    try {
      const ids = tenderedRows.map((r) => r.odysseyShipmentIdentifier)
      await Promise.all(tenderedRows.map(async (row) => {
        const detail = details[row.sellShipment] ?? await getSellShipmentDetail(row.sellShipment)
        const options = detail?.routingData?.options ?? []
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
      const done = new Set(tenderedRows.map((r) => r.id))
      const cancel = (r) => (done.has(r.id) ? { ...r, tenderStatus: 'Cancelled' } : r)
      setRows((rs) => rs.map(cancel))
      setExternals((es) => es.map(cancel))
      enterConfirm({ alert: cancelledAlertMessage(ids) })
    } catch (e) {
      setError(e?.message || "Couldn't cancel the tender. Nothing was changed.")
    } finally {
      setBusy(false)
    }
  }

  // The Error-phase "Apply Solution" click — does NOT close the modal (user
  // ruling item 3): Remove/Cancel land back in Confirm with a success Alert;
  // Discard is the only outcome that leaves the page.
  const applySolution = async () => {
    if (modal.action === 'remove') {
      const ids = tenderedRows.map((r) => r.odysseyShipmentIdentifier)
      const gone = new Set(tenderedRows.map((r) => r.id))
      onRemove(tenderedRows.flatMap((r) => r.removeIds ?? r.orders ?? []))
      setRows((rs) => rs.filter((r) => !gone.has(r.id)))
      setExternals((es) => es.filter((r) => !gone.has(r.id)))
      enterConfirm({ alert: removedAlertMessage(ids) })
      return
    }
    if (modal.action === 'discard') {
      setModal(null)
      onDiscard(rows.filter((r) => !isTendered(r)))
      return
    }
    await cancelTenders()
  }

  return {
    modal,
    close: () => setModal(null),
    setAction: (action) => setModal((m) => ({ ...m, action })),
    open, confirm, applySolution,
    checking, busy, error,
    checkRows, tenderedRows,
    remaining: rows.filter((r) => !isTendered(r)).length,
    canRemove: actionFor(rows) === 'remove',
  }
}

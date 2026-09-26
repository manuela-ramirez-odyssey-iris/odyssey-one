import { createPortal } from 'react-dom'
import { Alert, Badge, GroupTable, ModalFooter, ModalMedium } from '@odyssey/ui'
import { DiffValue, rowsToFlatGroups, val } from '../../shipments/order-change/comparisonHelpers.jsx'

// LINX-15438 View Routing — VD 2108-14708. New above Prior (canon §7, same
// ordering as the Direct review's OrderChangeTenderLists), the Tender tab's
// 8 columns, AP Cost badged purple on BOTH sides when it differs between the
// two lists (VD 2108-14708 shows Prior's changed cost badged too, same as
// the Direct review's OrderChangeTenderLists). The AC also lists Dropped
// Carriers — the VD omits them; a third table renders the new version's
// drops (DroppedCarriersModal is the closest existing precedent for that
// column set, reduced to what the AC asks for here: SCAC / Carrier Name /
// Reason). The three costs the AC lists already sit in the Stops-tab card
// head and are not repeated here.
const COLS = [
  { key: 'routeRank', label: 'Route Rank' },
  { key: 'rank', label: 'Rank' },
  { key: 'scac', label: 'SCAC' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost' },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]
const DROP_COLS = [
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'reason', label: 'Reason' },
]
// Not exported from RoutingGuideTab.jsx (STATUS_STYLES there is bg/color
// pairs, not Badge variants, and is itself unexported) — source of truth is
// src/components/detail/RoutingGuideTab.jsx:24-29. All 4 are seeded
// (tools/generate.mjs TENDER_STATUSES, generate.mjs:149).
const STATUS_VARIANT = { Accepted: 'green', Sent: 'blue', Declined: 'red', Cancelled: 'gray' }

const costByScac = (rows) => Object.fromEntries(rows.map((o) => [o.scac, o.cost]))

function TenderTable({ title, rows, otherCostByScac }) {
  const cell = (r, c) => {
    if (c.key === 'cost') {
      // SCAC-keyed: a carrier appearing twice at different ranks collapses to
      // its last occurrence (same known bug class as OrderChangeTenderLists'
      // buildChangeMap docblock) — accepted here since this modal is
      // read-only and the Direct review's per-row change map isn't exported.
      const changed = Object.hasOwn(otherCostByScac, r.scac) && otherCostByScac[r.scac] !== r.cost
      return <DiffValue value={r.cost} changed={changed} />
    }
    if (c.key === 'status') return r.status ? <Badge variant={STATUS_VARIANT[r.status] ?? 'gray'}>{r.status}</Badge> : ''
    return val(r[c.key])
  }
  return <GroupTable flat header={{ title }} columns={COLS} groups={rowsToFlatGroups(rows, COLS, cell)} />
}

// DEC-207 (T2) — the Stops-tab read-only use (StopsTab.jsx) passes none of
// the footer props below and stays byte-identical (no footer — the header
// close is its only exit, per the 2026-09-24 ruling this comment used to
// live under). Edit Shipment Stops (EditStopsView.jsx) is the first caller
// to pass them, for its Keep Editing / Approve Changes footer (T3 gives
// StopsTab its own Keep Reviewing / Approve Plan pair the same way).
export default function ViewRoutingModal({
  orderChange: oc, onClose,
  secondaryLabel, onSecondary, primaryLabel, onPrimary, primaryLoading = false, primaryDisabled = false,
  error,
}) {
  const priorList = oc?.priorTenderList ?? []
  const newList = oc?.newTenderList ?? []
  const dropped = oc?.droppedCarriers?.new ?? []
  const hasFooter = !!(secondaryLabel || primaryLabel)

  // Portalled to document.body — the bottom bar's own box clips this modal
  // when the bar is partially open (user, 2026-09-09).
  return createPortal(
    <ModalMedium
      title="View Routing"
      ariaLabel="View Routing"
      onClose={onClose}
      scrollableContent
      className="view-routing-modal"
      footer={hasFooter ? (
        <ModalFooter
          type="confirm"
          cancelLabel={secondaryLabel}
          // Loading implies busy — Keep Editing/Reviewing is a no-op rather
          // than a visually-disabled button (ModalFooter's Cancel has no
          // disabled prop to wire up; see LINX-15872 body).
          onCancel={primaryLoading ? undefined : onSecondary}
          saveLabel={primaryLoading ? 'Approving…' : primaryLabel}
          saveDisabled={primaryDisabled || primaryLoading}
          onSave={onPrimary}
        />
      ) : undefined}
    >
      {/* LINX-15872 — a failed Approve keeps this modal open with the error
          shown here, not on the (unmounted-on-success) route behind it. */}
      {error && <Alert variant="error" showClose={false}>{error}</Alert>}
      <TenderTable title="New" rows={newList} otherCostByScac={costByScac(priorList)} />
      <TenderTable title="Prior" rows={priorList} otherCostByScac={costByScac(newList)} />
      <GroupTable
        flat
        header={{ title: 'Dropped Carriers' }}
        columns={DROP_COLS}
        groups={rowsToFlatGroups(dropped, DROP_COLS, (r, c) => val(r[c.key]))}
      />
    </ModalMedium>,
    document.body,
  )
}

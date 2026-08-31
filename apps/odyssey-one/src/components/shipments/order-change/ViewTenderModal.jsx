import { createPortal } from 'react-dom'
import { GroupTable, ModalMedium } from '@odyssey/ui'
import { rowsToFlatGroups, val } from './comparisonHelpers.jsx'

/**
 * "View Tender" (S135) — the shipment's LIVE tender options, read-only, in a
 * modal.
 *
 * PROVENANCE: the button appears beside the New Tender List on Jana's mock
 * deck (p3) but he never explains it on the call, so the behaviour comes from
 * LINX-14509's two rules instead — *"the user shall be able to view Tender
 * information while the shipment is pending Order Change review"* and *"the
 * user shall not be allowed to perform tender-related actions until the Order
 * Change review process has been completed."* View, not act.
 *
 * NOT the same thing as the Preview Tender List section: that compares the
 * PRIOR and NEW tender option VERSIONS the order change produced. This is the
 * shipment's own current tender (`detail.routingData.options` — the same rows
 * the Tender tab renders), which is what the planner needs to look up while
 * deciding, without leaving the review.
 *
 * A MODAL, not a navigation (designer, S135): leaving the screen would drop
 * the cost selection the planner has already made, and the AC only asks that
 * they can SEE tender information. `ModalMedium` (designer, S135) — its
 * content-sized shell fits the nine-column table; the read-only caveat is the
 * first line of CONTENT, not a header subtitle.
 *
 * Deliberately flat and actionless — no row menu, no quote entry, no tender
 * buttons. Reusing RoutingGuideTab here would import exactly the actions the
 * AC forbids during review.
 */
const COLUMNS = [
  { key: 'rank', label: 'Rank', align: 'center' },
  { key: 'routeRank', label: 'Route Rank', align: 'center' },
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost', align: 'right' },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

export default function ViewTenderModal({ options = [], onClose }) {
  const groups = rowsToFlatGroups(options, COLUMNS, (row, col) => val(row[col.key]))

  return createPortal(
    <ModalMedium title="Tender" ariaLabel="Tender" onClose={onClose} className="view-tender-modal">
      <div className="view-tender-modal__body">
        <p className="text-label-sm-regular view-tender-modal__caveat">
          Current tender options — read-only while the order change is under review
        </p>
        {options.length === 0 ? (
          <p className="text-label-sm-regular">This shipment has no tender options yet.</p>
        ) : (
          <GroupTable columns={COLUMNS} groups={groups} flat />
        )}
      </div>
    </ModalMedium>,
    document.body,
  )
}

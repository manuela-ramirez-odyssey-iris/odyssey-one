import { createPortal } from 'react-dom'
import { GroupTable, ModalMedium } from '@odyssey/ui'
import { rowsToFlatGroups, val } from './comparisonHelpers.jsx'

/**
 * Dropped Carriers modal (S135, designer — third iteration of the dropped
 * display after the quiet note and the standalone accordion): opened from the
 * "Preview Dropped Carriers" button in the New Tender List's header strip.
 * Shows the carriers THIS tender version's routing did not return, read-only
 * — same vocabulary as the Tender tab's Dropped Carriers section
 * (LINX-13953/13954), reduced to the review's columns; the full row (dates,
 * transit, RPC data) and the Process SCAC action stay on the Tender tab,
 * since tender actions are locked during review (LINX-14509).
 */
const COLUMNS = [
  { key: 'scac', label: 'SCAC' },
  { key: 'carrierName', label: 'Carrier Name' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'routeRank', label: 'Route Rank', align: 'center' },
  { key: 'dropCode', label: 'Drop Code', align: 'center' },
  { key: 'reason', label: 'Reason' },
  { key: 'reasonDescription', label: 'Reason Description' },
]

export default function DroppedCarriersModal({ dropped = [], onClose }) {
  const groups = rowsToFlatGroups(dropped, COLUMNS, (row, col) => val(row[col.key]))

  return createPortal(
    // S137 — these three classes were `view-tender-modal*`, borrowed from the
    // sibling View Tender modal this file was modelled on. That modal is now
    // deleted (designer: "we don't need it"), which left this modal styled by
    // a rule named after a component that no longer exists — and the sweep
    // that removed the dead View Tender CSS silently took this modal's own
    // layout with it. Renamed to the consumer that actually owns them.
    <ModalMedium title="Dropped Carriers" ariaLabel="Dropped Carriers" onClose={onClose} className="dropped-carriers-modal">
      <div className="dropped-carriers-modal__body">
        <p className="text-label-sm-regular dropped-carriers-modal__caveat">
          Carriers not returned by this version&apos;s routing
        </p>
        <GroupTable columns={COLUMNS} groups={groups} flat />
      </div>
    </ModalMedium>,
    document.body,
  )
}

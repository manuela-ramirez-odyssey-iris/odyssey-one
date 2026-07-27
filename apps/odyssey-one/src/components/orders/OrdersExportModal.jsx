import { createPortal } from 'react-dom'
import { ModalMedium, Button } from '@odyssey/ui'

export const EXPORT_ROW_CAP = 25000
// Exact string from LINX-9896 BR V / LINX-13298.
export const EXPORT_CAP_MESSAGE =
  'Exporting is limited to 25000 rows. Please apply additional filters to fetch upto 25000 rows for download'

const TAB_LABELS = { all: 'All', draft: 'Draft', 'validation-errors': 'Validation Errors' }

/**
 * OrdersExportModal — LINX-9896 BR V: export the CURRENT tab's rows to Excel,
 * hard 25,000-row cap (blocked with the spec's exact message).
 */
export default function OrdersExportModal({ tab, rowCount, onExport, onClose }) {
  const overCap = rowCount > EXPORT_ROW_CAP
  return createPortal(
    <ModalMedium
      title="Export to Excel"
      onClose={onClose}
      ariaLabel="Export to Excel"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="lg" disabled={overCap} onClick={() => { onExport(); onClose() }}>
            Export
          </Button>
        </>
      }
    >
      <p className="text-label-sm-regular" style={{ margin: 0 }}>
        Current tab: <strong>{TAB_LABELS[tab] ?? tab}</strong> — {rowCount.toLocaleString('en-US')} orders.
      </p>
      {overCap && (
        <p className="text-label-sm-regular" style={{ color: 'var(--text-error)', margin: 0 }}>
          {EXPORT_CAP_MESSAGE}
        </p>
      )}
    </ModalMedium>,
    document.body,
  )
}

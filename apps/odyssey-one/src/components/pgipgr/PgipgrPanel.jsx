import { useState } from 'react'
import { PillTab, Button } from '@odyssey/ui'
import PgipgrTable from './PgipgrTable'
import ConfirmDialog from '../common/ConfirmDialog'
import { effectivePgipgrTab } from '../../data/pgipgrWidgets'
import { showToast } from '../../utils/toast'
import {
  FULL_COLUMNS, ALL_SELL_SHIPMENTS_COLUMNS, POST_ERRORS_PILLS,
  POST_ERRORS_ROWS, ALL_SELL_SHIPMENTS_ROWS, RATING_ERRORS_ROWS, NOT_RESPONSIBLE_ROWS,
} from './pgipgrTableData'

// PgipgrPanel — the PGI/PGR panel's table area (S159): a per-category
// SORTABLE DataTable replacing the old "Coming soon" placeholder, plus the
// Post PGI/PGR Errors pill-filter row (spec #2) and the Rating Errors / Not
// Responsible bulk actions (spec #3/#4).
export default function PgipgrPanel({ activeTab }) {
  const [pillFilter, setPillFilter] = useState('total')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const tab = effectivePgipgrTab(activeTab)

  const reRate = () => showToast('Re-rate requested.')
  const notResponsible = () => setConfirmOpen(true)
  const confirmNotResponsible = () => {
    setConfirmOpen(false)
    showToast('Rating Status updated to "Not Responsible".')
  }

  // Widget cards → this panel's content gap is set on ShipmentsPanelTabs'
  // widget row itself (marginBottom, S159 spacing fix) — nothing to add here.

  if (tab === 'post-errors') {
    const rows = pillFilter === 'total' ? POST_ERRORS_ROWS : POST_ERRORS_ROWS.filter((r) => r.errorType === pillFilter)
    return (
      <div>
        {/* Pills → "N Records Found" row: ~24px (Figma 2554:58830). */}
        <div className="flex items-center" style={{ gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-6)' }}>
          {POST_ERRORS_PILLS.map((p) => (
            <PillTab
              key={p.key}
              label={p.label}
              count={p.count}
              selected={pillFilter === p.key}
              onClick={() => setPillFilter(p.key)}
            />
          ))}
        </div>
        <PgipgrTable rows={rows} columns={FULL_COLUMNS} exportFilename="post-pgipgr-errors" linkMode="edit" />
      </div>
    )
  }

  if (tab === 'all-sell-shipments') {
    return <PgipgrTable rows={ALL_SELL_SHIPMENTS_ROWS} columns={ALL_SELL_SHIPMENTS_COLUMNS} exportFilename="all-sell-shipments" />
  }

  if (tab === 'rating-errors') {
    return (
      <>
        <PgipgrTable
          rows={RATING_ERRORS_ROWS}
          columns={FULL_COLUMNS}
          exportFilename="rating-errors"
          toolbarActions={(
            <>
              <Button variant="primary" size="sm" onClick={notResponsible}>Not Responsible</Button>
              <Button variant="primary" size="sm" onClick={reRate}>Re-Rate</Button>
            </>
          )}
        />
        {confirmOpen && (
          <ConfirmDialog
            title="Confirmation"
            message={'Rating Status will be updated to "Not Responsible". Once updated, it cannot be edited or changed.'}
            cancelLabel="Never mind"
            confirmLabel="Yes, Update"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={confirmNotResponsible}
          />
        )}
      </>
    )
  }

  // 'not-responsible'
  return (
    <PgipgrTable
      rows={NOT_RESPONSIBLE_ROWS}
      columns={FULL_COLUMNS}
      exportFilename="not-responsible"
      toolbarActions={<Button variant="primary" size="sm" onClick={reRate}>Re-Rate</Button>}
    />
  )
}

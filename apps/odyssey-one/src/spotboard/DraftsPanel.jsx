import { Trash2 } from 'lucide-react'
import { Button, EmptyState, SubAccordion } from '@odyssey/ui'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import './spotboard.css'

const COLUMNS = [
  { key: 'saved', label: 'Saved' },
  { key: 'duration', label: 'Duration' },
  { key: 'carriers', label: 'Carriers' },
  { key: 'lists', label: 'Lists' },
  { key: 'actions', label: null },
]

/**
 * DraftsPanel — SpotBoard "Drafts" sub-tab: lists saved Setup & Carriers
 * snapshots (draftStore.js) with Restore/Delete row actions. Follows the same
 * plain `odyssey-table` idiom as SetupCarriers.
 */
export default function DraftsPanel({ drafts, restoreDisabled, onRestore, onDelete }) {
  return (
    <div className="pane-col pane-col--wide">
      <SubAccordion title="Drafts" showIcon={false} collapsible={false}>
        {drafts.length === 0 ? (
          <EmptyState message="No saved drafts yet — Save Draft from Setup & Carriers." />
        ) : (
          <div className="drafts-panel__table-wrap">
            <table className="odyssey-table drafts-panel__table" aria-label="Saved Drafts">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="text-label-sm-semibold">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id}>
                    <td className="text-label-sm-regular">{formatDateTimeMDYHM(new Date(d.savedAt))}</td>
                    <td className="text-label-sm-regular">{d.payload.durationMin} min</td>
                    <td className="text-label-sm-regular">
                      {d.payload.carriers.filter((c) => c.incl).length}/{d.payload.carriers.length}
                    </td>
                    <td className="text-label-sm-regular">{d.payload.listName || '--'}</td>
                    <td className="drafts-panel__col-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={restoreDisabled}
                        title={restoreDisabled ? 'Unavailable while a quote is open' : undefined}
                        onClick={() => onRestore(d)}
                      >
                        Restore
                      </Button>
                      {/* Plain icon affordance, never a Button (row-action convention). */}
                      <button
                        type="button"
                        className="drafts-panel__remove"
                        aria-label="Delete draft"
                        onClick={() => onDelete(d)}
                      >
                        <Trash2 size={20} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SubAccordion>
    </div>
  )
}

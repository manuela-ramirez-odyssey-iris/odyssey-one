import { Fragment } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'

export const newRowId = () => `row-${Math.random().toString(36).slice(2, 9)}`

/**
 * RepeatableRows — add/delete row table (spec §8): References (two cols,
 * guided rows lock the Type cell) and Instructions (numbered, one desc col).
 * Rendered as a <table> so row separator borders match Efrain's design (item 8).
 *
 * columns:        [{ key, header, placeholder, maxLength? }]
 * lockedCell:     (row, colKey) => boolean — render as static label
 * rowPlaceholder: (row, colKey) => string | undefined — per-row override
 *
 * Decision-13 Controller pattern: rows are plain objects keyed by `id`;
 * the parent owns the array (Controller + immutable updates). This component
 * is presentation-only — no internal row state.
 */
export default function RepeatableRows({
  numbered = false,
  columns,
  rows,
  lockedCell,
  rowPlaceholder,
  onCellChange,   // (rowId, colKey, value)
  onDeleteRow,    // (rowId)
  onAddRow,       // ()
  addLabel,
}) {
  return (
    <div className="co-rep">
      {rows.length > 0 && (
        <table className="co-rep__table">
          <thead>
            <tr className="co-rep__head-row">
              {numbered && <th className="co-rep__head text-label-sm-medium co-rep__cell--num">#</th>}
              {columns.map((col) => (
                <th key={col.key} className="co-rep__head text-label-sm-medium">{col.header}</th>
              ))}
              <th className="co-rep__head co-rep__cell--action" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="co-rep__row">
                {numbered && (
                  <td className="co-rep__num text-label-sm-regular co-rep__cell--num">{i + 1}</td>
                )}
                {columns.map((col) =>
                  lockedCell?.(row, col.key) ? (
                    <td key={col.key} className="co-rep__locked text-label-sm-medium">{row[col.key]}</td>
                  ) : (
                    <td key={col.key}>
                      <FormField
                        showLabel={false}
                        placeholder={rowPlaceholder?.(row, col.key) ?? col.placeholder}
                        value={row[col.key]}
                        maxLength={col.maxLength}
                        onChange={(e) => onCellChange(row.id, col.key, e.target.value)}
                      />
                    </td>
                  ),
                )}
                <td className="co-rep__cell--action">
                  <Button
                    variant="icon"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    aria-label="Delete row"
                    onClick={() => onDeleteRow(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button variant="link" icon={<Plus size={16} />} onClick={onAddRow}>{addLabel}</Button>
    </div>
  )
}

import { Fragment } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'

export const newRowId = () => `row-${Math.random().toString(36).slice(2, 9)}`

/**
 * RepeatableRows — generic add/delete row table (spec §8): References
 * (two columns, guided rows lock the Type cell to a static label — Q21)
 * and Instructions (numbered, one description column). Rows are plain
 * objects keyed by `id`; the parent owns the array (Controller +
 * immutable updates — plan decision 13).
 *
 * columns:        [{ key, header, placeholder, maxLength? }]
 * lockedCell:     (row, colKey) => boolean — render as static label
 * rowPlaceholder: (row, colKey) => string | undefined — per-row override
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
  const template = `${numbered ? '32px ' : ''}repeat(${columns.length}, 1fr) 40px`
  return (
    <div className="co-rep">
      {rows.length > 0 && (
        <div className="co-rep__grid" style={{ gridTemplateColumns: template }}>
          {numbered && <span className="co-rep__head text-label-sm-medium">#</span>}
          {columns.map((col) => (
            <span key={col.key} className="co-rep__head text-label-sm-medium">{col.header}</span>
          ))}
          <span className="co-rep__head" aria-hidden="true" />
          {rows.map((row, i) => (
            <Fragment key={row.id}>
              {numbered && <span className="co-rep__num text-label-sm-regular">{i + 1}</span>}
              {columns.map((col) =>
                lockedCell?.(row, col.key) ? (
                  <span key={col.key} className="co-rep__locked text-label-sm-medium">{row[col.key]}</span>
                ) : (
                  <FormField
                    key={col.key}
                    showLabel={false}
                    placeholder={rowPlaceholder?.(row, col.key) ?? col.placeholder}
                    value={row[col.key]}
                    maxLength={col.maxLength}
                    onChange={(e) => onCellChange(row.id, col.key, e.target.value)}
                  />
                ),
              )}
              <Button
                variant="icon"
                size="sm"
                icon={<Trash2 size={16} />}
                aria-label="Delete row"
                onClick={() => onDeleteRow(row.id)}
              />
            </Fragment>
          ))}
        </div>
      )}
      <Button variant="link" icon={<Plus size={16} />} onClick={onAddRow}>{addLabel}</Button>
    </div>
  )
}

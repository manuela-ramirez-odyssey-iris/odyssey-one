import { Plus, Trash2 } from 'lucide-react'
import { Button, ComboBox, FormField } from '@odyssey/ui'
// The .co-rep table surface lives in create-order.css, which is code-split
// with the Orders route. Imported here so this component works outside it —
// same reason and same idiom as fields/MeasureField.jsx.
import './create-order.css'

export const newRowId = () => `row-${Math.random().toString(36).slice(2, 9)}`

/**
 * RepeatableRows — add/delete row table (spec §8): References (two cols,
 * guided rows lock the Type cell) and Instructions (numbered, one desc col).
 * Rendered as a <table> so row separator borders match Efrain's design (item 8).
 *
 * columns:        [{ key, header, placeholder, maxLength?, maxWidth?, select? }]
 *                 maxWidth caps the column (Figma 6238:24599: refs 350, instr 620);
 *                 select: { options, placeholder } renders a pick-only ComboBox
 *                 in unlocked cells (References type cell — small static list,
 *                 so a plain dropdown, not ComboBox)
 * lockedCell:     (row, colKey) => boolean — render as static label
 * rowPlaceholder: (row, colKey) => string | undefined — per-row override
 * canDeleteRow:   (row) => boolean — guided rows have no trash (Figma 6238:24599)
 *
 * Delete is a PLAIN clickable trash icon, not a Button — order-creation
 * convention (user, 2026-07-27).
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
  canDeleteRow,
  onCellChange,   // (rowId, colKey, value)
  onDeleteRow,    // (rowId)
  onAddRow,       // ()
  addLabel,
  disabled = false, // locks every cell, trash, and the add button (resolve mode)
}) {
  const colStyle = (col) =>
    col.maxWidth ? { width: col.maxWidth, maxWidth: col.maxWidth } : undefined

  return (
    <div className="co-rep">
      {rows.length > 0 && (
        <table className="co-rep__table">
          <thead>
            <tr className="co-rep__head-row">
              {numbered && <th className="co-rep__head text-label-sm-semibold co-rep__cell--num">#</th>}
              {columns.map((col) => (
                <th key={col.key} className="co-rep__head text-label-sm-semibold" style={colStyle(col)}>
                  {col.header}
                </th>
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
                    <td key={col.key} className="co-rep__locked text-label-sm-medium" style={colStyle(col)}>{row[col.key]}</td>
                  ) : (
                    <td key={col.key} style={colStyle(col)}>
                      {col.select ? (
                        <ComboBox
                          variant="select"
                          typable={false}
                          placeholder={col.select.placeholder}
                          options={typeof col.select.options === 'function'
                            ? col.select.options(row)
                            : col.select.options}
                          value={row[col.key]}
                          disabled={disabled}
                          onSelect={(val) => onCellChange(row.id, col.key, val ?? '')}
                        />
                      ) : (
                        <FormField
                          showLabel={false}
                          placeholder={rowPlaceholder?.(row, col.key) ?? col.placeholder}
                          value={row[col.key]}
                          maxLength={col.maxLength}
                          disabled={disabled}
                          onChange={(e) => onCellChange(row.id, col.key, e.target.value)}
                        />
                      )}
                    </td>
                  ),
                )}
                <td className="co-rep__cell--action">
                  {(canDeleteRow?.(row) ?? true) && (
                    <button
                      type="button"
                      className="co-rep__trash"
                      aria-label="Delete row"
                      disabled={disabled}
                      onClick={() => onDeleteRow(row.id)}
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button variant="link" icon={<Plus size={16} />} disabled={disabled} onClick={onAddRow}>{addLabel}</Button>
    </div>
  )
}

import { useState } from 'react'
import { FormField, PillTab } from '@odyssey/ui'

const linesLabel = (lines) => (lines.length === 1 ? `line ${lines[0]}` : `lines ${lines.join(', ')}`)

/**
 * ConflictPicker — Step 1 (LINX-16049) cross-line conflict, one FIELD at a
 * time (PO ruling recorded in interfaceErrors.js: an address conflict is
 * picked field by field, so the planner may take City from line 1 and Postal
 * from line 3 — never whole blocks). Nothing here is individually invalid;
 * the order lines simply disagree, so no parser can pick a winner and the
 * planner chooses the one value that applies to the whole order.
 *
 * One PillTab chip per distinct value found across the lines, labelled with
 * which lines carry it ("Pre-Paid · lines 1, 2"), plus "Enter another value"
 * which reveals a plain FormField for a value none of the lines proposed.
 * Controlled: `value` + `onPick(value)`. `disabled` = the read-only look-back
 * from Step 2, where the picks are shown but no longer editable.
 *
 * Options come straight from `interfaceErrors.js` `derived.conflicts`, a
 * Map<fieldPath, [{ value, lines }]>.
 */
export default function ConflictPicker({ id, label, message, options = [], value, onPick, disabled = false }) {
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherValue, setOtherValue] = useState('')
  const picked = value != null && value !== ''
  const inputId = id ?? `conflict-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div
      className={`conflict-picker${picked ? ' conflict-picker--picked' : ''}`}
      role="group"
      /* The group is named "<label> conflict", NOT "<label>": the escape-hatch
         input below is labelled with the bare field name, and two elements
         sharing one accessible name is an ambiguous label for AT (and for
         getByLabelText). The visible heading stays the bare field name. */
      aria-label={`${label} conflict`}
      id={inputId}
    >
      <span className="conflict-picker__label text-label-sm-medium">{label}</span>
      {!picked && message && <p className="conflict-picker__message text-label-xs-regular">{message}</p>}
      <div className="conflict-picker__chips">
        {options.filter((o) => o.lines.length > 0).map((o) => (
          <PillTab
            key={o.value}
            label={`${o.label ?? o.value} · ${linesLabel(o.lines)}`}
            showCount={false}
            selected={value === o.value}
            /* PillTab has no `disabled` prop of its own — it spreads `...rest`
               onto its <button>, so this is the NATIVE disabled attribute
               (its hover CSS already guards `:not(:disabled)`). Nothing to
               add to the shared atom, so no Figma/DSM change is owed. */
            disabled={disabled}
            onClick={() => { setOtherOpen(false); onPick(o.value) }}
          />
        ))}
        {!disabled && (
          <PillTab label="Enter another value" showCount={false} selected={otherOpen} onClick={() => setOtherOpen((v) => !v)} />
        )}
      </div>
      {otherOpen && !disabled && (
        <FormField
          id={`${inputId}-input`}
          /* showLabel={false} + aria-label: the field name is already on
             screen as the group heading, so repeating it above the input is
             visual noise — but the input still owes AT its own name. */
          label={label}
          showLabel={false}
          aria-label={label}
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          /* onBlur reaches the <input> through FormField's `...rest`. Commit
             on blur (not per keystroke) so a half-typed value never becomes
             the order-wide pick. */
          onBlur={() => { if (otherValue.trim()) onPick(otherValue.trim()) }}
          placeholder="Type the value for the whole order"
        />
      )}
      {picked && <p className="conflict-picker__validated text-label-xs-regular">Validated</p>}
    </div>
  )
}

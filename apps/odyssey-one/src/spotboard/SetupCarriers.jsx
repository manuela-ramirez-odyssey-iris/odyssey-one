import { useEffect, useState } from 'react'
import {
  Badge, Button, Checkbox, ComboBox, FormField, ModalMedium,
  SubAccordion, TitleSubtitle,
} from '@odyssey/ui'
import DateField from '../components/orders/create/fields/DateField.jsx'
import { NAMED_LISTS, buildCarrierRows, FLAG_LABELS } from './carrierList.js'
import './spotboard.css'

// A row is selectable once it has both dates — the per-row Incl. checkbox is
// disabled otherwise, and the header select-all must never include a
// date-less row.
const isSelectable = (row) => !!(row.plannedPickup && row.plannedDelivery)

// The TL/LTL mode picks WHICH list the table shows — one mode at a time, not
// both (user, S112). Rendered as a select-style ComboBox (typable={false}) —
// a pick-only two-option control — so the modes map onto option values
// 'first' | 'second'; NAMED_LISTS order is the contract.
const MODES = [
  { key: 'first', label: 'TL', list: NAMED_LISTS[0] },
  { key: 'second', label: 'LTL', list: NAMED_LISTS[1] },
]

// ComboBox options derived straight from MODES — one source of truth for the
// mode → list mapping and the two picker entries.
const MODE_OPTIONS = MODES.map((m) => ({ value: m.key, label: m.label }))

// Rows built before the multi-list change carry no `listId` — they belong to
// the quote's own single list, so attribute them to the first mode rather than
// dropping them off the table entirely.
const listIdOf = (row) => row.listId ?? NAMED_LISTS[0].id

const COLUMNS = [
  { key: 'incl', label: null }, // select-all checkbox, rendered separately
  { key: 'carrier', label: 'Carrier (SCAC · Name)' },
  { key: 'equipment', label: 'Equip' },
  { key: 'email', label: 'Contact Email' },
  { key: 'plannedPickup', label: 'Planned Pickup' },
  { key: 'plannedDelivery', label: 'Planned Delivery' },
  { key: 'flags', label: 'Flags' },
]

/**
 * SetupCarriers — SpotBoard "Setup & Carriers" sub-tab. Two cards (S112):
 * a "Shipment Summary" SubAccordion carrying the order-view field grid, then
 * "Setup & Carriers" holding the carrier table and its controls.
 *
 * The table follows the Orders product-information recipe — a plain
 * `odyssey-table`, not DataTable or GroupTable — because the TL/LTL toggle
 * shows exactly one list at a time, leaving nothing to group. Rows for BOTH
 * lists are built and held in state regardless, so a planner's inclusions and
 * dates survive toggling back and forth.
 *
 * `carrierOptions` arrives pre-resolved ({value: scac, label} from the async
 * `getLookupOptions('carrier', q)` pool) — the fetch is the parent's job
 * (SpotBoardTab), so this component stays sync, feeding it straight into the
 * pure `buildCarrierRows`.
 */
export default function SetupCarriers({
  quote,
  carrierOptions,
  summaryFields = [],
  defaultPickup = '',
  defaultDelivery = '',
  readOnly = false,
  onSaveDraft,
  onSendRFQ,
  onCancel,
}) {
  // Left EMPTY on a fresh quote: the active mode's default rides in the
  // placeholder instead ("Open Window 120min"), so switching TL↔LTL re-states
  // the default without silently overwriting anything typed (user, S112).
  const [durationMin, setDurationMin] = useState(
    quote?.durationMin != null ? String(quote.durationMin) : ''
  )
  const [flexiblePickup, setFlexiblePickup] = useState(quote?.flexiblePickup ?? false)
  const [rows, setRows] = useState(quote?.carriers ?? [])
  const [confirming, setConfirming] = useState(false)
  const [mode, setMode] = useState('first')

  // Build every list's rows in one pass, stamping each row with the list it
  // came from so the toggle can filter them. `carrierOptions` resolves async in
  // the parent, so on first mount this builds zero rows — guarded on
  // `rows.length === 0` so the effect re-fires once the pool arrives, then
  // stops, never clobbering a planner's incl/date edits.
  useEffect(() => {
    if (quote || rows.length > 0) return
    // Rows arrive PRESELECTED (except routed carriers), so they must also
    // arrive DATED — the two halves of the same ruling. Without the dates the
    // preselection is inert: Send RFQ requires a date on every included row,
    // so a preselected-but-undated table can never be sent.
    const built = NAMED_LISTS.flatMap((list) =>
      buildCarrierRows(list, carrierOptions).map((r) => ({
        ...r,
        listId: list.id,
        plannedPickup: defaultPickup || r.plannedPickup,
        plannedDelivery: defaultDelivery || r.plannedDelivery,
      }))
    )
    if (built.length > 0) setRows(built)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierOptions])

  const toggleIncl = (scac) =>
    setRows((rs) => rs.map((r) => (r.scac === scac ? { ...r, incl: !r.incl } : r)))

  // Editing a date auto-checks the row once both dates are present, and
  // auto-unchecks (+ disables, via the checkbox's own disabled expression
  // below) it the moment a date is cleared — only a user EDIT does this,
  // never the initial prefill (buildCarrierRows always seeds incl:false).
  const updateDate = (scac, field, value) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.scac !== scac) return r
        const next = { ...r, [field]: value }
        next.incl = !!(next.plannedPickup && next.plannedDelivery)
        return next
      })
    )

  const activeList = MODES.find((m) => m.key === mode).list
  const visibleRows = rows.filter((r) => listIdOf(r) === activeList.id)

  // Select-all is scoped to what's ON SCREEN — it must never silently include
  // carriers from the mode you can't currently see.
  const selectable = visibleRows.filter(isSelectable)
  const includedSelectable = selectable.filter((r) => r.incl)
  const allChecked = selectable.length > 0 && includedSelectable.length === selectable.length
  const someChecked = includedSelectable.length > 0 && !allChecked

  // Same asymmetry as the per-row checkbox: including is date-gated, excluding
  // is not. Deselect-all must be able to clear preselected rows that have no
  // dates yet, or the header control silently leaves rows behind.
  const toggleAll = (include) => {
    const ids = new Set((include ? selectable : visibleRows).map((r) => r.scac))
    setRows((rs) => rs.map((r) => (ids.has(r.scac) ? { ...r, incl: include } : r)))
  }

  const renderCell = (row, col) => {
    switch (col.key) {
      case 'incl':
        return (
          <Checkbox
            checked={row.incl}
            onChange={() => toggleIncl(row.scac)}
            // The date gate blocks turning a carrier ON without planned dates —
            // it must never block turning one OFF. Rows now arrive preselected
            // (Kathleen [27:52]), so a flat `!isSelectable` would render them
            // checked AND disabled: included, with no way to opt out.
            disabled={readOnly || (!isSelectable(row) && !row.incl)}
            showLabel={false}
            aria-label={`Include ${row.scac}`}
          />
        )
      case 'carrier':
        return `${row.scac} · ${row.name}`
      case 'plannedPickup':
      case 'plannedDelivery':
        return (
          <div data-testid={`${col.key === 'plannedPickup' ? 'pickup' : 'delivery'}-${row.scac}`}>
            <DateField
              value={row[col.key]}
              onChange={(v) => updateDate(row.scac, col.key, v)}
              disabled={readOnly}
            />
          </div>
        )
      case 'flags':
        return row.flags.map((f) => (
          <Badge key={f} variant="red">{FLAG_LABELS[f] || f}</Badge>
        ))
      default:
        return row[col.key] ?? '--'
    }
  }

  // Inclusion spans BOTH modes — a planner can toggle to LTL, include a couple,
  // toggle back, and send them all together.
  const includedRows = rows.filter((r) => r.incl)
  const canSend =
    includedRows.length > 0 &&
    includedRows.every((r) => r.plannedPickup && r.plannedDelivery)

  // Lists that actually contributed an included carrier — the payload's
  // listId/listName describe what is being SENT, not a single up-front choice.
  const includedLists = NAMED_LISTS.filter((l) =>
    includedRows.some((r) => listIdOf(r) === l.id)
  )

  // An untouched field means "use the default" — the one the placeholder is
  // advertising for the mode on screen.
  const effectiveDuration = Number(durationMin) || activeList.defaultDurationMin

  const buildPayload = () => ({
    listId: includedLists.map((l) => l.id).join('+'),
    listName: includedLists.map((l) => l.name).join(' + '),
    durationMin: effectiveDuration,
    carriers: rows,
    flexiblePickup,
  })

  // Cancel leads on the left; Save Draft and the primary Send RFQ trail on the
  // right (user, S112). All md; Cancel is a secondary button, not a link.
  const actions = readOnly ? null : (
    <div className="setup-carriers__actions">
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <div className="setup-carriers__actions-trail">
        <Button variant="secondary" onClick={() => onSaveDraft?.(buildPayload())}>
          Save Draft
        </Button>
        <Button variant="primary" disabled={!canSend} onClick={() => setConfirming(true)}>
          Send RFQ
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Collapsible (user, S112) — open by default so the context is still the
          first thing read, but it can be folded away once absorbed. */}
      {summaryFields.length > 0 && (
        <SubAccordion title="Shipment Summary" showIcon={false} defaultExpanded>
          {/* Order-view field grid — label over value in columns (user, S112). */}
          <div className="order-pane__fields-grid">
            {summaryFields.map(({ label, value }) => (
              <TitleSubtitle key={label} subtitle={label} title={value || '--'} />
            ))}
          </div>
        </SubAccordion>
      )}

      <SubAccordion title="Setup & Carriers" showIcon={false} collapsible={false}>
        <div className="order-pane__section setup-carriers">
          <div className="order-pane__block">
            {/* RFQ terms lead the card, directly below the accordion header —
                a sibling of the table, not part of it (user, S112). 4-column
                grid: mode ComboBox, Quote Duration, Flexible Pickup, then an
                unused 4th track — no other control here naturally fills it. */}
            <div className="setup-carriers__controls">
              <ComboBox
                id="setup-carriers-mode"
                variant="select"
                typable={false}
                options={MODE_OPTIONS}
                value={mode}
                onSelect={(val) => setMode(val)}
                disabled={readOnly}
              />
              <FormField
                id="quote-duration"
                label="Quote Duration"
                placeholder={`Open Window ${activeList.defaultDurationMin}min`}
                format="integer"
                maxLength={5}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                disabled={readOnly}
              />
              <Checkbox
                label="Flexible Pickup"
                checked={flexiblePickup}
                onChange={(e) => setFlexiblePickup(e.target.checked)}
                disabled={readOnly}
              />
            </div>

            {/* …then the count, directly above the table. */}
            <div className="setup-carriers__toolbar-top">
              <span className="setup-carriers__toolbar-count text-label-sm-regular">
                {visibleRows.length} {visibleRows.length === 1 ? 'carrier' : 'carriers'}
              </span>
            </div>

            <div className="setup-carriers__table-wrap">
              <table className="odyssey-table setup-carriers__table" aria-label="Carrier List">
                <thead>
                  <tr>
                    <th className="setup-carriers__col-incl">
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked}
                        onChange={() => toggleAll(!allChecked)}
                        disabled={readOnly || selectable.length === 0}
                        showLabel={false}
                        aria-label="Select all carriers"
                      />
                    </th>
                    {COLUMNS.slice(1).map((col) => (
                      <th key={col.key} className="text-label-sm-semibold">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td className="text-label-sm-regular" colSpan={COLUMNS.length}>
                        No carriers in this list.
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((row) => (
                    <tr key={row.scac}>
                      {COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={col.key === 'incl'
                            ? 'setup-carriers__col-incl'
                            : 'text-label-sm-regular'}
                        >
                          {renderCell(row, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {actions && <div className="order-pane__block">{actions}</div>}
        </div>

        {confirming && (
          <ModalMedium
            title="Send RFQ"
            onClose={() => setConfirming(false)}
            footer={
              <>
                <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setConfirming(false)
                    onSendRFQ?.(buildPayload())
                  }}
                >
                  Confirm &amp; Send
                </Button>
              </>
            }
          >
            <div className="setup-carriers__confirm">
              <p className="text-label-sm-regular setup-carriers__confirm-lead">
                The RFQ will be sent to {includedRows.length}{' '}
                {includedRows.length === 1 ? 'carrier' : 'carriers'}:
              </p>
              <ul className="setup-carriers__confirm-list">
                {includedRows.map((r) => (
                  <li key={r.scac} className="text-label-sm-regular">{r.scac} · {r.name}</li>
                ))}
              </ul>
              <div className="order-pane__fields-grid">
                <TitleSubtitle subtitle="Quote Duration" title={`${effectiveDuration} min`} />
                <TitleSubtitle subtitle="Flexible Pickup" title={flexiblePickup ? 'Yes' : 'No'} />
                <TitleSubtitle subtitle="Carrier Lists" title={includedLists.map((l) => l.name).join(' + ') || '--'} />
              </div>
            </div>
          </ModalMedium>
        )}
      </SubAccordion>
    </>
  )
}

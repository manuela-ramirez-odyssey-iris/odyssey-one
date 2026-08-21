import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Badge, Button, Checkbox, ModalMedium, PillTab,
  SubAccordion, TitleSubtitle,
} from '@odyssey/ui'
import DateField from '../components/orders/create/fields/DateField.jsx'
import DurationPicker from '../components/fields/DurationPicker.jsx'
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

// Mode is now a PILL TAB band (user, 2026-08-19) — replacing the select-style
// ComboBox. 'all' shows every list's rows at once, which the ComboBox could
// not express and which matches how inclusion already worked (it always
// spanned both modes; only the VIEW was single-list).
//
// All-first, and the default mode (user, 2026-08-20, Task 6) — a planner
// opens the pane wanting the full carrier picture, not one list arbitrarily
// picked over the other.
const MODE_ALL = 'all'
const MODE_TABS = [{ key: MODE_ALL, label: 'All' }, ...MODES.map((m) => ({ key: m.key, label: m.label }))]

// Quote Duration default (user, 2026-08-19). Deliberately a flat constant, not
// `activeList.defaultDurationMin`: those are 120 (TL) and 240 (LTL), and 240
// cannot be picked in a minutes picker capped at 120 — so the list defaults are
// no longer the seed for this field. They remain on NAMED_LISTS as data.
const DEFAULT_DURATION_MIN = 30

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
 * SetupCarriers — SpotBoard "Setup & Carriers" sub-tab: heading, mode pills,
 * RFQ terms, and the carrier table/controls. The shipment context (Origin /
 * Destination / Pickup Window / Duration) that used to render here as a
 * "Shipment Summary" SubAccordion field grid (S112) moved OUT to a sticky
 * `SpotSummaryStrip` rendered by the parent (SpotBoardTab, 2026-08-20) —
 * this component no longer takes a `summaryFields` prop.
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
  defaultPickup = '',
  defaultDelivery = '',
  readOnly = false,
  onSaveDraft,
  onSendRFQ,
  onTermsChange,
}) {
  // Defaults to 30 MINUTES on a fresh quote (user, 2026-08-19), replacing
  // S112's empty-field-plus-placeholder scheme. The per-list
  // `defaultDurationMin` (120 TL / 240 LTL) no longer seeds this field — a
  // single stated default beats one that changes under you when you flip mode,
  // and the picker is now a fixed option list, so an empty value has nothing to
  // advertise.
  //
  // ⚠ 240 (the LTL list default) is NOT expressible in a minutes picker whose
  // ceiling is 120 — see DEFAULT_DURATION_MIN below.
  const [durationMin, setDurationMin] = useState(quote?.durationMin ?? DEFAULT_DURATION_MIN)
  const [flexiblePickup, setFlexiblePickup] = useState(quote?.flexiblePickup ?? false)
  const [rows, setRows] = useState(quote?.carriers ?? [])
  const [confirming, setConfirming] = useState(false)
  const [mode, setMode] = useState(MODE_ALL)

  // Quote Setup modal (Task 5) — Duration / Planned Pickup for All / Planned
  // Delivery for All / Flexible, triggered by the "Setup Quote" button
  // trailing the carrier-count row. Drafts are separate from the committed
  // durationMin/flexiblePickup state so Cancel discards them; they are
  // reseeded from the committed values every time the modal opens.
  const [setupOpen, setSetupOpen] = useState(false)
  const [draftDuration, setDraftDuration] = useState(durationMin)
  const [draftPickup, setDraftPickup] = useState('')
  const [draftDelivery, setDraftDelivery] = useState('')
  const [draftFlexible, setDraftFlexible] = useState(flexiblePickup)

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

  // Seed the drafts from the committed values every time the modal opens —
  // Cancel must discard anything typed without touching committed state, and
  // a stale draft from a previous open must never leak into a new one. Dates
  // seed blank: they are a mass-APPLY action, not a display of any single
  // row's current date.
  const openSetup = () => {
    setDraftDuration(durationMin)
    setDraftPickup('')
    setDraftDelivery('')
    setDraftFlexible(flexiblePickup)
    setSetupOpen(true)
  }

  // Apply commits the drafts, mass-applies whichever planned date(s) were
  // typed to EVERY row (leaving the other field alone when only one was
  // supplied), and recomputes `incl` per row with the same
  // both-dates-present rule `updateDate` uses on a single-row edit.
  const applySetup = () => {
    setDurationMin(draftDuration)
    setFlexiblePickup(draftFlexible)
    if (draftPickup || draftDelivery) {
      setRows((rs) =>
        rs.map((r) => {
          const next = { ...r }
          if (draftPickup) next.plannedPickup = draftPickup
          if (draftDelivery) next.plannedDelivery = draftDelivery
          next.incl = !!(next.plannedPickup && next.plannedDelivery)
          return next
        })
      )
    }
    onTermsChange?.({ durationMin: draftDuration, flexiblePickup: draftFlexible })
    setSetupOpen(false)
  }

  // `activeList` is null in 'All' — there is no single list to attribute to.
  // Everything downstream that used it for a per-list default is gone (the
  // duration default is now a flat constant), so null is safe here.
  const activeList = MODES.find((m) => m.key === mode)?.list ?? null
  const visibleRows = mode === MODE_ALL ? rows : rows.filter((r) => listIdOf(r) === activeList.id)

  // Each pill's own count Badge (Task 6) — All = every built row, TL/LTL =
  // that list's rows only. Independent of `visibleRows`/`mode`: a pill always
  // reports ITS OWN count, not the currently-selected one's.
  const countFor = (key) =>
    key === MODE_ALL
      ? rows.length
      : rows.filter((r) => listIdOf(r) === MODES.find((m) => m.key === key).list.id).length

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

  // The picker always holds a real value now (it seeds at 30 and its options
  // start at 10), so the old "empty means use the list default" fallback is
  // gone; DEFAULT_DURATION_MIN only covers a malformed persisted quote.
  const effectiveDuration = Number(durationMin) || DEFAULT_DURATION_MIN

  const buildPayload = () => ({
    listId: includedLists.map((l) => l.id).join('+'),
    listName: includedLists.map((l) => l.name).join(' + '),
    durationMin: effectiveDuration,
    carriers: rows,
    flexiblePickup,
  })

  // Save Draft and the primary Send RFQ trail on the right (user, S112).
  // Cancel is GONE (Task 7, 2026-08-20, user) — there is nothing to lead the
  // row on the left anymore. The primary button's label counts included vs
  // total rows ("Send x/y RFQ", Task 7) instead of a flat "Send RFQ".
  //
  // The buttons are ALWAYS MOUNTED (user, 2026-08-19) — once the RFQ is sent
  // they go `disabled`, they do not disappear. A control that vanishes reads as
  // a rendering bug and costs the planner the affordance's position; a disabled
  // one says "this existed, and it is not available now".
  const actions = (
    <div className="setup-carriers__actions">
      <div className="setup-carriers__actions-trail">
        <Button variant="secondary" disabled={readOnly} onClick={() => onSaveDraft?.(buildPayload())}>
          Save Draft
        </Button>
        <Button variant="primary" disabled={readOnly || !canSend} onClick={() => setConfirming(true)}>
          {`Send ${includedRows.length}/${rows.length} RFQ`}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Restructured round 2 (user, 2026-08-21): the SubAccordion owns the
          "Setup & Carriers" title again (a plain h3 sibling would double it),
          and the mode band now lives INSIDE the accordion, between the header
          and the count+button toolbar row. The live countdown that used to
          render here moved out entirely — it's now the Quote Duration cell in
          the sticky SpotSummaryStrip (SpotBoardTab), so this component no
          longer reads `quote.status`/`closeAt` for a running field:

            ┌ SubAccordion "Setup & Carriers" ───────────────────────────┐
            │ [ All ][ TL ][ LTL ]        ← PillTab mode band            │
            │ N carriers          [ Quote Setup ] ← count + primary btn  │
            │ ┌ table ──────────────────────────────────────────────┐   │
            └──────────────────────────────────────────────────────────┘
                   Save · Send x/y RFQ  ← actions, always mounted, no Cancel,
                                           still BELOW the accordion */}
      <SubAccordion title="Setup & Carriers" showIcon={false} collapsible={false}>
        <div className="order-pane__section setup-carriers">
          <div className="order-pane__block">

            <div className="setup-carriers__modes" role="group" aria-label="Carrier list mode">
              {MODE_TABS.map((m) => (
                <PillTab
                  key={m.key}
                  label={m.label}
                  count={countFor(m.key)}
                  selected={mode === m.key}
                  onClick={() => setMode(m.key)}
                />
              ))}
            </div>

            {/* …then the count, directly above the table, with the Quote
                Setup trigger trailing it (Task 5; primary variant + "Quote
                Setup" label, round 2). */}
            <div className="setup-carriers__toolbar-top">
              <span className="setup-carriers__toolbar-count text-label-sm-regular">
                {visibleRows.length} {visibleRows.length === 1 ? 'carrier' : 'carriers'}
              </span>
              <Button variant="primary" disabled={readOnly} onClick={openSetup}>
                Quote Setup
              </Button>
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

        </div>

      </SubAccordion>

      {/* Actions live BELOW the accordion (user, 2026-08-19) — the card is the
          table, the actions act on the card. */}
      {actions}

      {/* ponytail: portal at the call site — ModalMedium should portal itself;
          deferred to its next normalization cycle to avoid demoting it for a
          behavior change. Moved out of the SubAccordion above: a
          transformed/overflow ancestor there clips the modal's fixed overlay
          (same root cause ShipmentDetailsModal.jsx already portals around). */}
      {/* Quote Setup modal (Task 5) — Duration, General Planned Pickup/
          Delivery, and Flexible, gathered behind the "Quote Setup" trigger.
          Portaled for the same reason the Send RFQ modal below is: an
          ancestor here clips a fixed overlay. */}
      {setupOpen && createPortal(
        <ModalMedium
          title="Quote Setup"
          onClose={() => setSetupOpen(false)}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setSetupOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" onClick={applySetup}>
                Apply
              </Button>
            </>
          }
        >
          {/* Row 1: Quote Duration (filled, see .setup-carriers__setup-grid
              .duration-picker) + Flexible. Row 2: the two General Planned
              dates, side by side (user, round 2). "General Planned Delivery"
              is the user's explicit rename; "General Planned Pickup" is
              renamed to match it for symmetry — the user only named the
              delivery field. */}
          <div className="setup-carriers__setup-grid">
            <DurationPicker
              id="setup-quote-duration"
              label="Quote Duration"
              unit="minutes"
              value={draftDuration}
              onChange={setDraftDuration}
            />
            <Checkbox
              label="Flexible"
              checked={draftFlexible}
              onChange={(e) => setDraftFlexible(e.target.checked)}
            />
            <DateField
              id="setup-pickup-all"
              label="General Planned Pickup"
              value={draftPickup}
              onChange={setDraftPickup}
            />
            <DateField
              id="setup-delivery-all"
              label="General Planned Delivery"
              value={draftDelivery}
              onChange={setDraftDelivery}
            />
          </div>
        </ModalMedium>,
        document.body
      )}

      {confirming && createPortal(
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
        </ModalMedium>,
        document.body
      )}
    </>
  )
}

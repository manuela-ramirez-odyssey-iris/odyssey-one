import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Badge, Button, Checkbox, Dropdown, DurationPicker, GroupTable, ModalMedium,
  PillTab, SubAccordion, TitleSubtitle,
} from '@odyssey/ui'
import DateField from '../components/orders/create/fields/DateField.jsx'

import { buildOverflowRows, FLAG_LABELS } from './carrierList.js'
import { getFlexConfig } from './flexConfig.js'
import './spotboard.css'

// The strip cell this component portals its Send RFQ button into.
// SpotBoardTab imports this to render the empty cell — declared HERE, in the
// child, so the two don't form an import cycle (in one, whichever module
// evaluates second reads the other's const as undefined).
export const SEND_RFQ_SLOT_ID = 'spot-send-rfq-slot'


// A row is selectable once it has both dates — the per-row Incl. checkbox is
// disabled otherwise, and the header select-all must never include a
// date-less row.
const isSelectable = (row) => !!(row.plannedPickup && row.plannedDelivery)

// The TL/LTL mode picks WHICH list the table shows — one mode at a time, not
// both (user, S112). Rows are no longer built from a static NAMED_LISTS
// fixture (S128) — buildOverflowRows stamps each row's own `listId` off the
// carrier's real mode ('TL'|'LTL'), so these two entries are just the pill
// labels + the id they filter rows on.
const MODES = [
  { key: 'first', label: 'TL', id: 'TL' },
  { key: 'second', label: 'LTL', id: 'LTL' },
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

// Quote Duration default (user, 2026-08-19). Deliberately a flat constant —
// no per-list default exists anymore (S128 dropped NAMED_LISTS entirely).
const DEFAULT_DURATION_MIN = 30

// SPB-66 (Kathleen, 2026-08-24): ONE currency selector per bid, USD or CAD,
// chosen by the planner in Quote Setup — never a per-charge-line toggle.
// Fixed two-value local list, so a Dropdown is the right control (project
// rule: fetch/lazyload -> ComboBox, local list -> Dropdown).
const DEFAULT_CURRENCY = 'USD'
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

// Rows built before the multi-list change carry no `listId` — they belong to
// the quote's own single list, so attribute them to the first mode rather than
// dropping them off the table entirely.
const listIdOf = (row) => row.listId ?? MODES[0].id

// The Incl. checkbox is NOT a column here: GroupTable's `selectable` prop owns
// that lane, header control included, so declaring it would render two.
const COLUMNS = [
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
 * The table is a `GroupTable` in `flat` mode (2026-09-06), replacing the
 * hand-rolled `odyssey-table` that preceded it. Nothing is grouped — the
 * TL/LTL toggle shows exactly one list at a time — which is precisely what
 * `flat` renders: one ordinary data row per `groups[]` entry, no chevrons, no
 * expansion. Selection and inline editing stay this component's: they ride in
 * as NODES (`col.label` for the select-all, `group.values` for each cell), so
 * the swap added nothing to @odyssey/ui. Rows for BOTH lists are built and
 * held in state regardless, so a planner's inclusions and dates survive
 * toggling back and forth.
 *
 * `carrierOptions` arrives pre-resolved ({value: scac, label, meta: {mode}}
 * from the async `getLookupOptions('carrier', q)` pool) — the fetch is the
 * parent's job (SpotBoardTab), so this component stays sync, feeding it
 * straight into the pure `buildOverflowRows` alongside `shipmentDetails`
 * (S128) — the route guide + dropped carriers the overflow list is derived
 * from, per shipment — and `shipmentId` (SpotBoardTab's own `sid`), which
 * seeds the overflow hash so composition actually varies by shipment.
 */
export default function SetupCarriers({
  quote,
  carrierOptions,
  shipmentDetails,
  shipmentId,
  // Root-cause fix (2026-08-21, SpotBid-pane-frozen-on-shipment-switch bug):
  // react-query's `isPlaceholderData` for the CURRENT shipment's detail fetch
  // (threaded down BottomBar -> SpotBoardTab -> here). On a shipment-to-
  // shipment switch, BottomBar's `key={selectedShipmentId}` remounts this
  // component SYNCHRONOUSLY, before the new shipment's detail query resolves
  // — `shipmentDetails` at that first render is still the PREVIOUS shipment's
  // data (`placeholderData: keepPreviousData`, useShipmentDetail.ts). Meanwhile
  // `carrierOptions` (getLookupOptions, lookupService.ts) is a LOCAL pool
  // wrapped in an async function with no real I/O — it resolves on the next
  // microtask, always winning the race against the network-bound detail
  // fetch. The build effect below used to gate ONLY on `carrierOptions.length
  // === 0`, so it fired the instant the pool arrived — building rows off the
  // stale placeholder `shipmentDetails` but the CORRECT `shipmentId`. Once
  // `rows.length > 0`, the effect's own `rows.length > 0` guard (needed so a
  // planner's edits survive re-renders) permanently blocked ever rebuilding —
  // even after the real per-shipment data landed moments later. Gating the
  // build on `!detailsStale` too defers it until real data for THIS shipment
  // is in hand, without touching the "don't clobber the planner's edits"
  // invariant the length check already provides.
  detailsStale = false,
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
  const [flexibleDelivery, setFlexibleDelivery] = useState(quote?.flexibleDelivery ?? false)
  const [currency, setCurrency] = useState(quote?.currency ?? DEFAULT_CURRENCY)
  // SPB-69/73: OCM config gates WHICH checkbox(es) even appear, per shipment.
  const flexConfig = getFlexConfig(shipmentId)
  const [rows, setRows] = useState(quote?.carriers ?? [])
  const [confirming, setConfirming] = useState(false)
  const [mode, setMode] = useState(MODE_ALL)

  // Quote Setup modal (Task 5) — Duration / Planned Pickup / Planned
  // Delivery / Flexible, triggered by the "Quote Setup" button trailing the
  // carrier-count row. Drafts are separate from the committed
  // durationMin/flexiblePickup/general-date state so Cancel discards them;
  // they are reseeded from the committed values every time the modal opens.
  //
  // generalPickup/generalDelivery are the COMMITTED "set the date for all at
  // once" values (user, 2026-08-21) — the single source the rows' dates trace
  // to. On a fresh (no-quote) mount the rows are seeded straight from
  // defaultPickup/defaultDelivery (see the effect below), so the general
  // fields start AT that same value — the modal must show what's already true
  // of every row, not claim to be empty while the table is dated. On a
  // quote-seeded mount there is no stored general value (the quote's rows
  // carry their OWN per-row dates, possibly diverging from each other) — '' is
  // the only honest starting point; applying then still works, it just hasn't
  // happened yet this page-life.
  const [setupOpen, setSetupOpen] = useState(false)
  const [draftDuration, setDraftDuration] = useState(durationMin)
  const [generalPickup, setGeneralPickup] = useState(quote ? '' : defaultPickup)
  const [generalDelivery, setGeneralDelivery] = useState(quote ? '' : defaultDelivery)
  const [draftPickup, setDraftPickup] = useState(generalPickup)
  const [draftDelivery, setDraftDelivery] = useState(generalDelivery)
  const [draftFlexible, setDraftFlexible] = useState(flexiblePickup)
  const [draftFlexibleDelivery, setDraftFlexibleDelivery] = useState(flexibleDelivery)
  const [draftCurrency, setDraftCurrency] = useState(currency)

  // Build the overflow list in one pass off the shipment's own route guide +
  // dropped carriers (S128) — buildOverflowRows already stamps each row's
  // `listId` off the carrier's real mode, so the toggle filters on that
  // directly. `carrierOptions` resolves async in the parent, so on first
  // mount the pool is empty — explicitly gated on `carrierOptions.length`
  // (route-guide rows alone no longer depend on the pool the way the old
  // NAMED_LISTS build did, so an empty guard can't be left implicit anymore)
  // and `rows.length === 0` so the effect re-fires once the pool arrives,
  // then stops, never clobbering a planner's incl/date edits.
  useEffect(() => {
    if (quote || rows.length > 0 || carrierOptions.length === 0 || detailsStale) return
    // Rows arrive PRESELECTED (except routed carriers), so they must also
    // arrive DATED — the two halves of the same ruling. Without the dates the
    // preselection is inert: Send RFQ requires a date on every included row,
    // so a preselected-but-undated table can never be sent.
    const built = buildOverflowRows(shipmentDetails, carrierOptions, shipmentId).map((r) => ({
      ...r,
      plannedPickup: defaultPickup || r.plannedPickup,
      plannedDelivery: defaultDelivery || r.plannedDelivery,
    }))
    if (built.length > 0) setRows(built)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierOptions, shipmentDetails, shipmentId, detailsStale])

  const toggleIncl = (scac) =>
    setRows((rs) => rs.map((r) => (r.scac === scac ? { ...r, incl: !r.incl } : r)))

  // Editing a date auto-checks the row once both dates are present, and
  // auto-unchecks (+ disables, via the checkbox's own disabled expression
  // below) it the moment a date is cleared — only a user EDIT does this,
  // never the initial prefill (buildOverflowRows always seeds a route-guide
  // row's incl to false).
  const updateDate = (scac, field, value) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.scac !== scac) return r
        const next = { ...r, [field]: value }
        next.incl = !!(next.plannedPickup && next.plannedDelivery)
        return next
      })
    )

  // Seed the drafts from the COMMITTED values every time the modal opens —
  // Cancel must discard anything typed without touching committed state, and
  // a stale draft from a previous open must never leak into a new one. Dates
  // seed from generalPickup/generalDelivery (not '') so a reopen shows
  // whatever was last applied this page-life — that's the "preserved unless
  // page is reloaded" rule (user, 2026-08-21); reseeding from '' every time
  // was the bug this replaces.
  const openSetup = () => {
    setDraftDuration(durationMin)
    setDraftPickup(generalPickup)
    setDraftDelivery(generalDelivery)
    setDraftFlexible(flexiblePickup)
    setDraftFlexibleDelivery(flexibleDelivery)
    setDraftCurrency(currency)
    setSetupOpen(true)
  }

  // Apply commits the drafts. The general dates are now the single declared
  // source for every row's dates (user, 2026-08-21) — they are assigned to
  // EVERY row whose dates actually CHANGE, including clearing: an emptied
  // general field blanks that field on every row that didn't already match.
  // (Previously only a non-empty draft overwrote its field, leaving the other
  // alone — that "only overwrite what's supplied" rule is gone along with the
  // always-blank seed above.) A row whose dates already equal the draft is
  // left COMPLETELY untouched — dates AND `incl` — so a planner who
  // deliberately unchecked a dated carrier and reopens the modal only to tweak
  // Duration/Flexible does not get that carrier silently re-included (user,
  // 2026-08-21). Only a row whose dates actually change recomputes `incl`,
  // via the same both-dates-present rule `updateDate` uses on a single-row
  // edit.
  const applySetup = () => {
    setDurationMin(draftDuration)
    setFlexiblePickup(draftFlexible)
    setFlexibleDelivery(draftFlexibleDelivery)
    setCurrency(draftCurrency)
    setGeneralPickup(draftPickup)
    setGeneralDelivery(draftDelivery)
    setRows((rs) =>
      rs.map((r) => {
        if (r.plannedPickup === draftPickup && r.plannedDelivery === draftDelivery) return r
        const next = { ...r, plannedPickup: draftPickup, plannedDelivery: draftDelivery }
        next.incl = !!(next.plannedPickup && next.plannedDelivery)
        return next
      })
    )
    onTermsChange?.({
      durationMin: draftDuration,
      flexiblePickup: draftFlexible,
      flexibleDelivery: draftFlexibleDelivery,
      currency: draftCurrency,
    })
    setSetupOpen(false)
  }

  // `activeMode` is null in 'All' — there is no single mode to attribute to.
  const activeMode = MODES.find((m) => m.key === mode) ?? null
  const visibleRows = mode === MODE_ALL ? rows : rows.filter((r) => listIdOf(r) === activeMode.id)

  // Each pill's own count Badge (Task 6) — All = every built row, TL/LTL =
  // that mode's rows only. Independent of `visibleRows`/`mode`: a pill always
  // reports ITS OWN count, not the currently-selected one's.
  const countFor = (key) =>
    key === MODE_ALL
      ? rows.length
      : rows.filter((r) => listIdOf(r) === MODES.find((m) => m.key === key).id).length

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

  // GroupTable's flat mode reads each row's cells from `group.values`, keyed by
  // column — so what used to be a `renderCell(row, col)` switch is now the same
  // switch evaluated up front into an object. Every value may be a node, which
  // is why the checkbox / DateField / Badge cells need no component support.
  const cellFor = (row, col) => {
    switch (col.key) {
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

  const valuesFor = (row) =>
    Object.fromEntries(COLUMNS.map((col) => [col.key, cellFor(row, col)]))

  // Inclusion spans BOTH modes — a planner can toggle to LTL, include a couple,
  // toggle back, and send them all together.
  const includedRows = rows.filter((r) => r.incl)
  const canSend =
    includedRows.length > 0 &&
    includedRows.every((r) => r.plannedPickup && r.plannedDelivery)

  // Modes that actually contributed an included carrier — the payload's
  // listId/listName describe what is being SENT, not a single up-front choice.
  const includedModes = MODES.filter((m) =>
    includedRows.some((r) => listIdOf(r) === m.id)
  )

  // The picker always holds a real value now (it seeds at 30 and its options
  // start at 10), so the old "empty means use the list default" fallback is
  // gone; DEFAULT_DURATION_MIN only covers a malformed persisted quote.
  const effectiveDuration = Number(durationMin) || DEFAULT_DURATION_MIN

  const buildPayload = () => ({
    listId: includedModes.map((m) => m.id).join('+'),
    listName: includedModes.map((m) => m.label).join(' + '),
    durationMin: effectiveDuration,
    carriers: rows,
    flexiblePickup,
    flexibleDelivery,
    currency,
  })

  // Send RFQ moved INTO the sticky strip (user, 2026-08-24) — SpotBoardTab
  // contributes the cell, this component fills it, because only it knows
  // whether every included row carries the dates Send requires and it owns
  // the confirmation modal. Portal rather than lifted state: the alternative
  // was hoisting all of the row-validity machinery into the parent purely to
  // render one label. The slot element is a sibling in the same commit, so
  // it exists by the time this effect runs.
  //
  // The button is ALWAYS MOUNTED (user, 2026-08-19) — once the RFQ is sent it
  // goes `disabled`, it does not disappear. A control that vanishes reads as a
  // rendering bug and costs the planner the affordance's position; a disabled
  // one says "this existed, and it is not available now". Its LABEL states
  // which of the two it is (user, 2026-08-24): "Send x/y" while it is an
  // action, "x/y Sent" once it has become a record of one. `readOnly` is the
  // right trigger because SpotBoardTab sets it for exactly the states an RFQ
  // has gone out in — open, closed and awarded.
  // `slotChecked` gates the first paint: the slot can only be found AFTER
  // the parent's commit, so rendering the fallback immediately would flash
  // the button in the wrong place for one frame.
  const [sendSlot, setSendSlot] = useState(null)
  const [slotChecked, setSlotChecked] = useState(false)
  useEffect(() => {
    setSendSlot(document.getElementById(SEND_RFQ_SLOT_ID))
    setSlotChecked(true)
  }, [])
  const sendButton = (
    <Button size="sm" variant="primary" disabled={readOnly || !canSend} onClick={() => setConfirming(true)}>
      {readOnly
        ? `${includedRows.length}/${rows.length} Sent`
        : `Send ${includedRows.length}/${rows.length}`}
    </Button>
  )

  // Save Draft + Quote Setup trail the PILL TAB row (user, 2026-08-24) —
  // same component, so these render inline; no slot, no portal. BOTH
  // secondary: the tab's one primary action is Send RFQ in the strip, and
  // two competing primaries is what made the old pair read as equal weight.
  const tabActions = (
    <>
      <Button size="sm" variant="secondary" disabled={readOnly} onClick={() => onSaveDraft?.(buildPayload())}>
        Save Draft
      </Button>
      <Button size="sm" variant="secondary" disabled={readOnly} onClick={openSetup}>
        Quote Setup
      </Button>
    </>
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

            <div className="setup-carriers__modes-row">
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
              <div className="setup-carriers__modes-actions">{tabActions}</div>
            </div>

            {/* …then the count, directly above the table. Save Draft and
                Quote Setup moved OUT to the sub-tab row's trail slot (user,
                2026-08-24) — see `tabActions` above. */}
            <div className="setup-carriers__toolbar-top">
              <span className="setup-carriers__toolbar-count text-label-sm-regular">
                {visibleRows.length} {visibleRows.length === 1 ? 'carrier' : 'carriers'}
              </span>
            </div>

            {/* GroupTable in `flat` + `selectable` mode (2026-09-06) — the
                hand-rolled <table> it replaces was already flat: one level, no
                groups, no expansion.

                `selectable` is GroupTable's own checkbox lane (user ruling: the
                option belongs on the component, not re-hand-rolled per
                consumer), but it is plumbing only — the RULES stay here, and
                they are the reason a generic selection model could not have
                worked: selecting is gated on a row having both planned dates,
                deselecting is not, and select-all is scoped to whichever list
                the TL/LTL pill is showing. GroupTable renders the controls and
                derives the header's checked/indeterminate state; `onSelectAll`
                hands us a direction, not a list of ids.

                Every remaining cell (DateField, Badge) still rides in
                `group.values` as a node — that part needed no component
                support and still doesn't.

                `headerStyle` is left at its default ('standard' — `flat` does
                NOT imply the strip band, see resolveHeaderStyle), which is the
                plain column header this table has always had. */}
            <GroupTable
              flat
              selectable
              className="setup-carriers__group-table"
              // GroupTable spreads unknown props onto its ROOT SCROLLER, not the
              // <table> — its only way to name the table itself is the visible
              // `header` strip, which would duplicate the SubAccordion's own
              // "Setup & Carriers" title. So the region is named instead of the
              // table: `role="group"` is what makes the label readable at all
              // (a bare div with aria-label is ignored).
              role="group"
              aria-label="Carrier List"
              columns={COLUMNS}
              groups={visibleRows.map((row) => ({
                id: row.scac,
                label: row.scac,
                values: valuesFor(row),
                // The date gate blocks turning a carrier ON without planned
                // dates — it must never block turning one OFF. Rows arrive
                // preselected (Kathleen [27:52]), so a flat `!isSelectable`
                // would render them checked AND disabled: included, with no way
                // to opt out.
                selectDisabled: readOnly || (!isSelectable(row) && !row.incl),
                // Out of select-all's maths without disabling the row's own
                // control: an undated row that is already included must stay
                // un-includable, but select-all has nothing it may turn ON, so
                // it reads unchecked and disabled rather than "all selected".
                selectAllExempt: !isSelectable(row),
              }))}
              selectedIds={visibleRows.filter((r) => r.incl).map((r) => r.scac)}
              onSelect={(scac) => toggleIncl(scac)}
              // GroupTable asks "moving to checked or unchecked?" and leaves the
              // meaning of "all" here, which is the whole point: selecting spans
              // only dated rows, deselecting spans every row on screen, and both
              // are scoped to the TL/LTL pill's current view.
              onSelectAll={toggleAll}
              selectAllLabel="Select all carriers"
              selectLabel={(group) => `Include ${group.id}`}
            />
            {visibleRows.length === 0 && (
              // Sibling, not a colSpan row: GroupTable has no empty-state slot,
              // and inventing one for a single consumer is the library change
              // this swap exists to avoid.
              <p className="setup-carriers__empty text-label-sm-regular">
                No carriers in this list.
              </p>
            )}
          </div>

        </div>

      </SubAccordion>

      {/* The action row that used to live BELOW the accordion is gone (user,
          2026-08-24): Save Draft moved up beside Quote Setup, and Send RFQ
          moved into the sticky strip via this portal. */}
      {slotChecked && (sendSlot
        ? createPortal(sendButton, sendSlot)
        : (
          // No strip to portal into (standalone render, DSM demo, tests) —
          // the button must still exist, in its old place below the card,
          // rather than silently disappearing with its slot.
          <div className="setup-carriers__actions">
            <div className="setup-carriers__actions-trail">{sendButton}</div>
          </div>
        ))}

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
          {/* Two sections, separated by a subtle rule (user, 2026-09-07 —
              was three): (1) the quote's own terms, Duration beside Currency;
              (2) the planned dates, with each direction's Flexible checkbox
              BELOW its picker rather than above the pair. Labeled "Planned
              Pickup"/"Planned Delivery" (user, 2026-08-21 — dropped the
              "General" prefix to match the table's own column headers; the
              modal context already implies "applies to all carriers"). */}
          <div className="setup-carriers__setup-grid">
            <DurationPicker
              id="setup-quote-duration"
              label="Quote Duration"
              unit="minutes"
              value={draftDuration}
              onChange={setDraftDuration}
            />
            <div className="setup-carriers__currency-field">
              <label htmlFor="setup-currency" className="text-label-sm-medium setup-carriers__currency-label">
                Currency
              </label>
              <Dropdown
                id="setup-currency"
                value={draftCurrency}
                options={CURRENCY_OPTIONS}
                onChange={setDraftCurrency}
              />
            </div>
          </div>

          <hr className="setup-carriers__setup-divider" />

          <div className="setup-carriers__setup-grid">
            <DateField
              id="setup-pickup-all"
              label="Planned Pickup"
              value={draftPickup}
              onChange={setDraftPickup}
            />
            <DateField
              id="setup-delivery-all"
              label="Planned Delivery"
              value={draftDelivery}
              onChange={setDraftDelivery}
            />
            {flexConfig.pickupDays != null ? (
              <Checkbox
                label={`Flexible pickup (±${flexConfig.pickupDays} days)`}
                checked={draftFlexible}
                onChange={(e) => setDraftFlexible(e.target.checked)}
              />
            ) : <span />}
            {flexConfig.deliveryDays != null && (
              <Checkbox
                label={`Flexible delivery (±${flexConfig.deliveryDays} days)`}
                checked={draftFlexibleDelivery}
                onChange={(e) => setDraftFlexibleDelivery(e.target.checked)}
              />
            )}
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
              {flexConfig.pickupDays != null && (
                <TitleSubtitle subtitle="Flexible Pickup" title={flexiblePickup ? 'Yes' : 'No'} />
              )}
              {flexConfig.deliveryDays != null && (
                <TitleSubtitle subtitle="Flexible Delivery" title={flexibleDelivery ? 'Yes' : 'No'} />
              )}
              <TitleSubtitle subtitle="Carrier Lists" title={includedModes.map((m) => m.label).join(' + ') || '--'} />
            </div>
          </div>
        </ModalMedium>,
        document.body
      )}
    </>
  )
}

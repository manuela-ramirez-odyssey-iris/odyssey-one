import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Button, ComboBox, GroupTable, ModalMedium, SummaryStrip, Tab, TitleSubtitle } from '@odyssey/ui'
import { isDirty, startEdit } from './sectionDraft.js'
import { QuoteModal, QuoteModalFooter } from './QuoteModal.jsx'
import DiscardChangesModal from './DiscardChangesModal.jsx'
import MeasureField from '../orders/create/fields/MeasureField.jsx'
import RepeatableRows, { newRowId } from '../orders/create/RepeatableRows.jsx'
import { EQUIPMENT_CODES, EQUIPMENT_LABELS, MODES, REFERENCE_TYPES, UOM_VOLUME, UOM_WEIGHT } from '../../data/master-data'
import { saveShipmentOverrides, saveTenderOption } from '../../api/services/shipmentService'
import { routingOptionVmToDto } from '../../api/mappers/mapSellShipmentOutToDetail'

const REFERENCE_TYPE_OPTIONS = REFERENCE_TYPES.map((t) => ({ value: t, label: t }))

const DASH = '--' // LINX-13590 — empty optional fields read '--', never blank

// The ONLY editable General Information fields (user, 2026-08-11). A label
// absent here renders exactly as before, in edit mode and out of it.
const EDITABLE_GENERAL = new Set(['Gross Weight', 'Volume', 'Mode', 'Equipment'])

const MODE_OPTIONS = MODES.map((m) => ({ value: m, label: m }))
const EQUIPMENT_OPTIONS = EQUIPMENT_CODES.map((c) => ({ value: c, label: `${c} - ${EQUIPMENT_LABELS[c]}` }))

// "44,470 LB" ⇄ { value: '44470', uom: 'lb' }. MeasureField owns value+UoM as
// one control, so the display string has to split on the way in and rejoin on
// the way out. A value that doesn't match the shape (including '--') opens
// empty rather than guessing.
function splitMeasure(display, fallbackUom) {
  const m = /^([\d,.]+)\s*(\S+)?$/.exec(String(display ?? '').trim())
  if (!m) return { value: '', uom: fallbackUom }
  return { value: m[1].replace(/,/g, ''), uom: (m[2] ?? fallbackUom).toLowerCase() }
}

function joinMeasure({ value, uom }, options) {
  if (value === '' || value == null) return DASH
  const label = options.find((o) => o.value === uom)?.label ?? uom
  return `${Number(value).toLocaleString('en-US')} ${label}`
}

// Display-only formatter for Markup's ORIGINAL value: rateDetails.markup is
// a raw number (routingData.options[].rateDetails, NOT costData — Margin
// must never read from costSummary.margin), while every other Cost row is a
// pre-formatted "$X,XXX.XX" string. Matches that convention. Not used for
// any AP/AR/Margin math — QuoteModal owns that derivation entirely; this
// modal never re-derives it (drift risk the user flagged explicitly).
function fmtMoney(n, currency = 'USD') {
  const symbol = currency === 'EUR' ? '€' : '$'
  return `${symbol}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Overrides written by a quote save. Lower-case keys throughout (DEC-86,
// 2026-08-12) — `equipment` matches the exact key General Information's own
// draft/read sites already use (draftFor/renderGeneralField/the fields array
// below), so a quote's equipment change is visible there and vice versa,
// instead of the old `Equipment` (capitalized) key that nothing ever read.
// `base`/`markup` are new (the old `Base`/`Markup` keys were dead — the Cost
// section read straight off costData/option, never off overrides), added
// here alongside the same override-first read added to Cost's fields array
// below, matching the precedent General Information already set.
function quoteOverridesFrom(result) {
  return {
    base: fmtMoney(result.rateDetails.baseRate, result.rateDetails.currency),
    markup: fmtMoney(result.rateDetails.markup, result.rateDetails.currency),
    equipment: result.equipment,
  }
}

// The header strip and General Information both want the "current option" —
// the shipping option the carrier accepted. Falls back to rank 1 (then the
// first option) so a not-yet-accepted shipment still shows dates.
function currentOption(options = []) {
  return (
    options.find(o => o.status === 'Accepted') ||
    options.find(o => o.rank === 1) ||
    options[0]
  )
}

// Section header = title + its edit control. `editable` opts a section in;
// `editing` swaps the label Edit → Save Changes and adds a cancel X.
//
// BOTH faces are SECONDARY (user, 2026-08-12, reversing the 2026-08-11 call
// that promoted the save face). A section header sits inside a modal that has
// its own primary action; promoting an in-body button competes with it, and
// with up to four editable sections the page could show several primaries at
// once. The variant no longer carries state — `disabled` does.
//
// Save Changes stays disabled until something actually changed, so the button
// itself communicates whether there is anything to lose.
function Section({
  title, fields, renderField, children,
  editable = false, editing = false, dirty = false, editDisabled = false,
  onEdit, onSave, onCancel,
}) {
  return (
    <section className="shp-details__section">
      <div className="shp-details__section-head">
        <h3 className="text-label-base-semibold shp-details__section-title">{title}</h3>
        {editable && (
          <div className="shp-details__section-actions">
            {editing ? (
              <>
                <Button variant="secondary" size="sm" disabled={!dirty} onClick={onSave}>
                  Save Changes
                </Button>
                <button
                  type="button"
                  className="icon-action"
                  aria-label={`Cancel editing ${title}`}
                  onClick={onCancel}
                >
                  <X {...ICON_LG} />
                </button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={editDisabled}
                aria-label={`Edit ${title}`}
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>
      {fields ? (
        <div className="shp-details__grid">
          {fields.map(([label, value]) =>
            renderField
              ? renderField(label, value)
              : <TitleSubtitle key={label} subtitle={label} title={value || DASH} />,
          )}
        </div>
      ) : children}
    </section>
  )
}

// Customer Reference Values — the spec's block is keyed by ORDER (the
// "L14372086" codes are order numbers, per the user). Same six reference
// fields the Orders pane renders, and sparse the same way: only populated
// rows appear, so an order with no references collapses to '--'.
function referencesFor(o) {
  return [
    ['Sales Order Number', o.salesOrder],
    ['Delivery Number', o.deliveryNumber],
    ['PO Number', o.poNumber],
    ['Pro/Booking Number', o.proBooking],
    ['Pickup Number', o.pickupNumber],
    ['Confirmation Number', o.confirmationNumber],
  ].filter(([, v]) => v && v !== DASH)
}

// Filled in by Task 7 — for now, the seeded values only.
function referenceRowsFor(order, overrides) {
  return overrides?.references?.[order.orderNumber] ?? referencesFor(order).map(([type, value], i) => ({
    id: `${order.orderNumber}-${i}`, type, value,
  }))
}

// User Defined Fields — one GroupTable group per order, mirroring Cost
// Allocation's Compare AP/AR. Sparse by nature (customer-supplied, often from
// a CSV drop or email), so an order with zero fields still gets a group and
// reads empty rather than being hidden.
const UDF_COLUMNS = [
  { key: 'name', label: 'Field' },
  { key: 'value', label: 'Value' },
]

// View Shipment Details — opened from the ShipmentsBar's shipment-id ButtonLink
// (S93). Information model per the 2026-07-30 annotated spec
// (vault/10-domains/shipments/shipment-details-modal-spec-2026-07-30.md): the
// modal is a SUMMARY OF THE WHOLE BAR, not a shipment/order field dump.
// Layout mimics CostAllocationTab: a tab row on top — tabs leading, the
// Routing Query (QCP) action trailing — then the identifiers SummaryStrip flush
// beneath it, then the per-tab content. NO FOOTER (user, 2026-07-30): the modal
// is a read-only summary and QCP was its only real action. Supersedes the S102
// four-section model (Figma 1348:16364). Error variant per 1357:17184.
//
// Stops is a SUMMARY here — the full pane stays in the bar's Stops tab. The
// two mandatory bits (user): every stop links to its order in the Orders
// domain, and the address is shown.
//
// Portaled to <body>: rendered inside the fixed bar it would inherit its
// stacking context and z-index (same reasoning as TableControls' export modal).
export default function ShipmentDetailsModal({ shipment, shipmentDetails, error, onClose }) {
  const [tab, setTab] = useState('details')
  const navigate = useNavigate()

  // Field editing (2026-08-10). `overrides` is the ONLY persistence local to
  // THIS modal — there is no shipment update endpoint of its own — but every
  // commit still comes from QuoteModal's real save (saveTenderOption → PUT
  // .../tender), so it durably survives a reload; `overrides` just keeps this
  // modal's own display in sync with what was actually saved without a
  // refetch.
  const [overrides, setOverrides] = useState({})

  // View navigation (Task 11, 2026-08-12): Edit Quote is a VIEW of THIS modal
  // (ModalMedium's onBack chevron), not a second dialog stacked on top of it
  // (user's explicit requirement) — so one modal, one view flag, not a second
  // open/close boolean.
  const [view, setView] = useState('details')
  const quoteRef = useRef(null)
  const [quoteSaveDisabled, setQuoteSaveDisabled] = useState(true)

  // Section edit mode (2026-08-11). ONE state object, so "only one section at
  // a time" is structural rather than a rule to enforce — `section` cannot
  // hold two values. Null = nothing is being edited.
  const [edit, setEdit] = useState(null)
  const dirty = isDirty(edit)

  // Discard-or-save guard (2026-08-11). Every way OUT of an edited section
  // funnels through `requestExit`, so the prompt cannot be bypassed by
  // adding a new exit later: modal close, section cancel, opening another
  // section, and switching tabs all call it. `pendingExit` holds the
  // proceed callback for whichever exit triggered the prompt.
  const [pendingExit, setPendingExit] = useState(null)

  const requestExit = (proceed) => {
    // setPendingExit(() => proceed) is the functional-update form on
    // purpose — setPendingExit(proceed) would call proceed AS a state
    // updater instead of storing it.
    if (dirty) { setPendingExit(() => proceed); return }
    proceed()
  }

  const handleClose = () => requestExit(() => onClose?.())
  const switchTab = (next) => requestExit(() => { setEdit(null); setTab(next) })

  // Stop → the order view in the Orders domain (/orders/:orderId). The modal
  // closes first: leaving it mounted over a different route strands the user.
  const openOrder = (orderId) => {
    onClose?.()
    navigate(`/orders/${orderId}`)
  }

  const orders = shipmentDetails?.orderDetails || []
  const order = orders[0]
  const summary = shipmentDetails?.stopsData?.summary || {}
  const cost = shipmentDetails?.costData?.planned?.summary || {}
  const routingOptions = shipmentDetails?.routingData?.options || []
  const option = currentOption(routingOptions)
  // Every option on a shipment shares its pickup/delivery timezone (same
  // fallback QuoteModal's own opener, RoutingGuideTab.jsx:1330, uses) — reused
  // as-is so a quote missing its own TZ still gets the shipment's.
  const shipmentTz = {
    pickup: routingOptions.find((o) => o.pickupTZ && o.pickupTZ !== DASH)?.pickupTZ,
    delivery: routingOptions.find((o) => o.deliveryTZ && o.deliveryTZ !== DASH)?.deliveryTZ,
  }
  const udfOrders = shipmentDetails?.userDefinedData?.orders || []
  const stops = shipmentDetails?.stopsData?.stops || []

  // Same precedence General Information's fields already use (local
  // `overrides` > `shipmentDetails.overrides` > raw), applied once here so
  // both the draft seed and the read-only render agree on what "current"
  // means for references (Task 6's mechanism, not a new one).
  const overridesForRead = { ...shipmentDetails?.overrides, ...overrides }

  // Draft seeds, one per editable section. Read at Edit-click time so the
  // draft always starts from what is currently on screen — which means
  // reading `overrides` first: a value saved in an earlier edit pass and not
  // yet reflected in shipmentDetails (no refetch) must win over the original
  // load, or re-opening Edit after a save would silently discard it.
  const draftFor = (section) => {
    if (section === 'general') {
      return {
        grossWeight: overrides.grossWeight ?? summary.grossWeight ?? DASH,
        volume: overrides.volume ?? summary.volume ?? DASH,
        mode: overrides.mode ?? shipmentDetails.overrides?.mode ?? shipment?.mode ?? DASH,
        equipment: overrides.equipment ?? option?.equipment ?? DASH,
      }
    }
    return Object.fromEntries(orders.map((o) => [o.orderNumber, referenceRowsFor(o, overridesForRead)]))
  }

  const sectionProps = (section) => ({
    editable: true,
    editing: edit?.section === section,
    dirty,
    onEdit: () => requestExit(() => setEdit(startEdit(section, draftFor(section)))),
    onCancel: () => requestExit(() => setEdit(null)),
    onSave: () => saveSection(section),
  })

  // Renders a General Information field: the 4 editable ones get a live
  // control while editing, everything else (and everything when NOT editing)
  // stays the plain read-only TitleSubtitle it always was.
  const renderGeneralField = (label, value) => {
    const editing = edit?.section === 'general'
    if (!editing || !EDITABLE_GENERAL.has(label)) {
      return <TitleSubtitle key={label} subtitle={label} title={value || DASH} />
    }
    const set = (patch) => setEdit((e) => ({ ...e, draft: { ...e.draft, ...patch } }))

    if (label === 'Gross Weight' || label === 'Volume') {
      const isWeight = label === 'Gross Weight'
      const options = isWeight ? UOM_WEIGHT : UOM_VOLUME
      const key = isWeight ? 'grossWeight' : 'volume'
      return (
        <MeasureField
          key={label}
          id={`shp-details-${key}`}
          showLabel
          label={label}
          options={options}
          value={splitMeasure(edit.draft[key], isWeight ? 'lb' : 'cuft')}
          onChange={(next) => set({ [key]: joinMeasure(next, options) })}
        />
      )
    }

    const isMode = label === 'Mode'
    return (
      <ComboBox
        key={label}
        id={`shp-details-${isMode ? 'mode' : 'equipment'}`}
        variant="select"
        showLabel
        label={label}
        options={isMode ? MODE_OPTIONS : EQUIPMENT_OPTIONS}
        value={isMode ? edit.draft.mode : edit.draft.equipment}
        onSelect={(v) => set(isMode ? { mode: v ?? '' } : { equipment: v ?? '' })}
      />
    )
  }

  // General Information saves to TWO places on purpose: Equipment belongs to
  // the routing option (tenders row), everything else is shipment-stage.
  // Sequential, not Promise.all — if the tender write fails we must not have
  // already told the user the whole save succeeded.
  const saveSection = async (section) => {
    const id = shipment?.sellShipment
    if (section === 'general') {
      const { equipment, ...stage } = edit.draft
      await saveShipmentOverrides(id, { ...shipmentDetails.overrides, ...stage })
      if (equipment !== option?.equipment && option) {
        await saveTenderOption(id, routingOptionVmToDto({ ...option, equipment }))
      }
    } else {
      await saveShipmentOverrides(id, { ...shipmentDetails.overrides, references: edit.draft })
    }
    // General's draft keys (grossWeight, mode, ...) ARE overrides' top-level
    // shape, so a flat spread mirrors them directly. References persist under
    // their own `references` key (same shape saveShipmentOverrides just sent)
    // — the local mirror has to nest the same way or overridesForRead's
    // `overrides.references` lookup would miss it entirely.
    setOverrides((prev) => (
      section === 'general' ? { ...prev, ...edit.draft } : { ...prev, references: edit.draft }
    ))
    setEdit(null)
  }

  // Was missing entirely before 2026-08-12 — two comment blocks near the old
  // wiring (removed) claimed this persisted and it never did (DEC-86): the
  // old onSave only called setOverrides, so every Base/Markup/Equipment edit
  // made from this modal was lost on reload. Same choke point RoutingGuideTab
  // uses for its own quote saves: VM → DTO → PUT .../tender.
  const handleQuoteSave = async (result) => {
    await saveTenderOption(shipment?.sellShipment, routingOptionVmToDto(result))
    setOverrides((prev) => ({ ...prev, ...quoteOverridesFrom(result) }))
    setView('details')
  }

  return createPortal(
    <ModalMedium
      title={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
      ariaLabel={view === 'quote' ? 'Edit Quote' : 'Shipment Details'}
      onClose={handleClose}
      onBack={view === 'quote' ? () => setView('details') : undefined}
      footer={view === 'quote' ? (
        <QuoteModalFooter
          onCancel={() => setView('details')}
          onSave={() => quoteRef.current?.save()}
          disabled={quoteSaveDisabled}
        />
      ) : null}
    >
      {pendingExit && (
        <DiscardChangesModal
          onStay={() => setPendingExit(null)}
          onDiscard={() => { const go = pendingExit; setEdit(null); setPendingExit(null); go() }}
          onSave={async () => { const go = pendingExit; await saveSection(edit.section); setPendingExit(null); go() }}
        />
      )}

      {/* Edit Quote is a VIEW of THIS modal, not a second dialog (user,
          2026-08-11) — it REPLACES the details body below rather than
          layering over it, so the two are mutually exclusive branches of the
          same conditional, never both mounted. `carrierData` is the
          shipment's current routing option — the exact RoutingOptionVM shape
          QuoteModal already consumes elsewhere (BottomBar.jsx passes the
          same shipmentDetails.routingData down to RoutingGuideTab, whose
          local `options` state is that array untouched — confirmed no shape
          mismatch). handleQuoteSave does NOT re-derive AP Total/AR
          Total/Margin — QuoteModal already owns that math. */}
      {view === 'quote' ? (
        <QuoteModal
          ref={quoteRef}
          embedded
          mode="edit"
          carrierData={option}
          shipmentTz={shipmentTz}
          onSave={handleQuoteSave}
          onValidityChange={setQuoteSaveDisabled}
        />
      ) : error || !shipmentDetails ? (
        <div className="shp-details__error" role="alert">
          <p className="text-label-sm-regular">Unable to load shipment details at the moment.</p>
          <p className="text-label-sm-regular">
            Please try again later. If the issue persists,{' '}
            <a className="shp-details__error-link" href="mailto:support@odyssey.com">
              contact system administrator
            </a>.
          </p>
        </div>
      ) : (
        <div className="shp-details">
          {/* CostAllocationTab layout: tabs band on top, identifiers strip
              directly below with no gap. The strip is Details-only — the UDF
              tab doesn't need it. Tracking Link reads `trackingUrl`, whose URL
              shape is INVENTED (R2-1) — the real contract has no such field. */}
          <div className="shp-details__topbar">
            {/* Tabs lead, Routing Query trails — the modal has no footer
                (user, 2026-07-30); the row's hairline runs under both. */}
            <div className="shp-details__tabrow">
              <div className="shp-details__tabs tab-group" role="tablist" aria-label="Shipment details view">
                <Tab
                  label="Details"
                  current={tab === 'details'}
                  onClick={() => switchTab('details')}
                  aria-selected={tab === 'details'}
                  role="tab"
                />
                <Tab
                  label="User Defined Fields"
                  current={tab === 'udf'}
                  onClick={() => switchTab('udf')}
                  aria-selected={tab === 'udf'}
                  role="tab"
                />
              </div>

              <Button variant="primary" size="sm" onClick={() => { /* TODO: wire Routing Query (QCP) */ }}>
                Routing Query (QCP)
              </Button>
            </div>

            {tab === 'details' && (
              <SummaryStrip
                aria-label="Shipment identifiers"
                items={[
                  { label: 'Buy Shipment',  value: shipment?.buyShipment },
                  { label: 'Pro/Booking #', value: shipment?.pro || order?.proBooking },
                  // Display convention (user, 2026-08-02): strip the protocol —
                  // no reseed needed, the stored URL keeps it.
                  { label: 'Tracking Link', value: shipmentDetails.trackingUrl?.replace(/^https?:\/\//, ''), truncate: 'lead' },
                  { label: 'Rating Status', value: shipmentDetails.ratingStatus },
                  { label: 'Sell Shipment', value: shipment?.sellShipment },
                ]}
              />
            )}
          </div>

          {tab === 'udf' ? (
            <GroupTable
              columns={UDF_COLUMNS}
              groups={udfOrders.map(o => ({
                id: o.orderId,
                label: o.orderId,
                rows: o.fields,
              }))}
              aria-label="User defined fields by order"
            />
          ) : (
            <>
              <Section
                title="General Information"
                {...sectionProps('general')}
                renderField={renderGeneralField}
                fields={[
                  // "Source Name" in the spec is Jana's wording for the customer.
                  ['Source Name', shipment?.customerName],
                  ['Shipment Status', shipment?.shipmentStatus],
                  ['Carrier', summary.acceptedCarrier],
                  // "from current option" per the spec annotation
                  ['Pickup Date/Time', option?.pickupDateTime],
                  ['Delivery Date/Time', option?.deliveryDateTime],
                  // `overrides` (local, saved-this-session state) wins over the
                  // original load so a save is visible without a refetch —
                  // same precedence draftFor uses to seed the next Edit.
                  ['Gross Weight', overrides.grossWeight ?? summary.grossWeight],
                  ['Volume', overrides.volume ?? summary.volume],
                  ['Mode', overrides.mode ?? shipmentDetails.overrides?.mode ?? shipment?.mode],
                  // Equipment reads the CURRENT ROUTING OPTION's equipment
                  // (the quote's — RoutingOptionVM.equipment,
                  // shipmentDetail.ts:149 / mapSellShipmentOutToDetail.ts:267),
                  // NOT the shipment-level summary.seedEquipment/equipmentCode
                  // (user, 2026-08-10 — "the one related to the quote"). No
                  // current option → DASH, not a silent fallback to the
                  // shipment's value: that would display one equipment while
                  // editing a different one.
                  ['Equipment', overrides.equipment ?? option?.equipment ?? DASH],
                  // paymentTerms IS the freight term, already label-mapped by the mapper
                  ['Freight Term', order?.paymentTerms],
                  ['Hazmat', order?.hazmat === 'Yes' ? 'Yes' : 'No'],
                ]}
              />

              <Section
                title="Cost"
                editable
                onEdit={() => requestExit(() => setView('quote'))}
                fields={[
                  // `overrides.base` wins when a quote save just wrote it —
                  // same override-first precedence General Information's own
                  // fields use — so Edit Quote's Base is visible here without
                  // a refetch (2026-08-12; the old capitalized `Base` key was
                  // written but never read anywhere, see quoteOverridesFrom).
                  ['Base', overrides.base ?? cost.base],
                  ['Fuel (FSC)', cost.fuel],
                  ['Accessorials', cost.accessorials],
                  ['AP Total (Carrier)', cost.apTotal],
                  ['AR Total (Customer)', cost.arTotal],
                  // Markup — NOT in costData (there's no costSummary.markup);
                  // backed by the current routing option's rateDetails.markup,
                  // the same value the Tender quote edits. Adjacent to Margin
                  // (its dependent) so the input and its result read together.
                  ['Markup', overrides.markup ?? fmtMoney(option?.rateDetails?.markup, option?.rateDetails?.currency)],
                  // Margin stays read-only and derived (AR − AP) — Cost has no
                  // per-field editing any more, only the section-level Edit,
                  // which navigates to the Edit Quote view (Task 11).
                  ['Margin', cost.margin],
                  ['Direct Cost', cost.directCost],
                ]}
              />

              {/* Stops — summary only (the full pane lives in the bar's Stops
                  tab). Mandatory per the user: every stop links to its order in
                  the Orders domain, and the address is shown. */}
              {/* Stops editing is not built yet (user, 2026-08-11: "we will not
                  do this one for now but will be triggered by the same button").
                  The control renders DISABLED so the affordance is visible and
                  a click gives honest feedback instead of silently doing
                  nothing. Wire onEdit when the Stops draft shape is decided. */}
              <Section title="Stops" editable editDisabled>
                <div className="shp-details__orders">
                  {stops.length ? stops.map((s, i) => (
                    <div key={s.stopNumber ?? i} className="shp-details__order">
                      <TitleSubtitle
                        subtitle={s.type === 'pickup' ? 'Pickup' : 'Delivery'}
                        title={`Stop ${s.stopNumber ?? i + 1}`}
                      />
                      <div className="shp-details__order-refs">
                        <TitleSubtitle
                          subtitle={s.orderIds?.length > 1 ? 'Orders' : 'Order'}
                          title={s.orderIds?.length ? (
                            /* One link per order — a stop can serve several.
                               Wraps instead of overflowing the next column. */
                            <span className="shp-details__stop-orders">
                              {s.orderIds.map(id => (
                                <Button key={id} variant="link" onClick={() => openOrder(id)}>{id}</Button>
                              ))}
                            </span>
                          ) : DASH}
                        />
                        <TitleSubtitle subtitle="Address" title={s.address || DASH} />
                        <TitleSubtitle subtitle="Date" title={s.date || DASH} />
                      </div>
                    </div>
                  )) : <span className="text-label-sm-regular">{DASH}</span>}
                </div>
              </Section>

              <Section title="Customer Reference Values" {...sectionProps('references')}>
                <div className="shp-details__orders">
                  {orders.map((o) => {
                    const editing = edit?.section === 'references'
                    const rows = editing
                      ? edit.draft[o.orderNumber] ?? []
                      : referenceRowsFor(o, overridesForRead)

                    const setRows = (next) => setEdit((e) => ({
                      ...e, draft: { ...e.draft, [o.orderNumber]: next },
                    }))

                    return (
                      /* Order in column 1, its references flowing through the
                         remaining columns and wrapping downward (user, 2026-07-30). */
                      <div key={o.orderNumber} className="shp-details__order">
                        {/* Order Number is never editable (user, 2026-08-11) —
                            it identifies the group, it is not a reference. */}
                        <TitleSubtitle subtitle="Order" title={o.orderNumber || DASH} />
                        {editing ? (
                          /* The Orders create-flow References block, minus its
                             own "References" heading — this section header
                             already names it (user, 2026-08-11). */
                          <div className="co-confirm-block">
                            <RepeatableRows
                              rows={rows}
                              columns={[
                                {
                                  key: 'type',
                                  header: 'Reference Type',
                                  maxWidth: 350,
                                  select: {
                                    placeholder: 'Select a Reference Type',
                                    options: (row) => REFERENCE_TYPE_OPTIONS.filter(
                                      (opt) => !rows.some((r) => r.id !== row.id && r.type === opt.value),
                                    ),
                                  },
                                },
                                { key: 'value', header: 'Reference Value', placeholder: 'Enter Reference Value', maxWidth: 350 },
                              ]}
                              lockedCell={(row, colKey) => colKey === 'type' && !!row.type}
                              canDeleteRow={(row) => !!row.type}
                              rowPlaceholder={(row, colKey) =>
                                row.type && colKey === 'value' ? `Enter a ${row.type}` : undefined}
                              onCellChange={(rowId, colKey, value) =>
                                setRows(rows.map((r) => (r.id === rowId ? { ...r, [colKey]: value } : r)))}
                              onDeleteRow={(rowId) => setRows(rows.filter((r) => r.id !== rowId))}
                              onAddRow={() => {
                                // One pending row at a time — reuse the blank
                                // one if it exists (same rule as order creation).
                                if (!rows.some((r) => !r.type && !r.value)) {
                                  setRows([...rows, { id: newRowId(), type: '', value: '' }])
                                }
                              }}
                              addLabel="Add New Reference Code"
                            />
                          </div>
                        ) : rows.length ? (
                          <div className="shp-details__order-refs">
                            {rows.map((r) => (
                              <TitleSubtitle key={r.id} subtitle={r.type} title={r.value} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-label-sm-regular">{DASH}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </ModalMedium>,
    document.body,
  )
}

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import { Button, GroupTable, ModalMedium, SummaryStrip, Tab, TitleSubtitle } from '@odyssey/ui'
import { QuoteModal } from './QuoteModal.jsx'

const DASH = '--' // LINX-13590 — empty optional fields read '--', never blank

// FINAL editable set (2026-08-10, user-confirmed, corrected same day) — Base,
// Markup, Equipment. Every pen opens the shared Tender QuoteModal
// (QuoteModal.jsx) in edit mode; there is no inline control anywhere in this
// modal any more (an earlier pass gave Equipment its own inline ComboBox +
// confirmation, and separately dropped Base's pen by misreading the user —
// both reverted). Rationale (user): a commit must PERSIST like everything
// else. QuoteModal's save already routes through saveTenderOption → PUT
// .../tender → a real `tenders` row write; an inline draft had no write path
// and would silently vanish on reload.
//
// This map is still the single place that decides which fields are
// editable — a label present here gets a pen; a label absent renders exactly
// as before (plain TitleSubtitle). Everything else stays read-only: the
// other Cost totals and Margin are derived, Hazmat is system-driven per
// decision ORD-12. The value carries nothing since there is only one control
// type left (a boolean map would do — kept as an object in case a future
// field ever needs its own note here, same shape either way).
export const EDITABLE_FIELDS = {
  Base: true,
  Markup: true,
  Equipment: true,
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

// One grid cell of Section's `fields` form. Not in EDITABLE_FIELDS → byte-
// identical to the original plain TitleSubtitle. Editable fields all open
// QuoteModal directly — no inline draft, no local confirmation; the pen never
// becomes a save icon here since QuoteModal owns its own Save Quote / Cancel.
// Idiom matches packages/ui/src/SectionLabel.jsx: `icon-action`, ICON_LG,
// type="button", real aria-label.
function EditableField({ label, value, overrides, onOpenQuoteModal }) {
  const displayValue = overrides[label] ?? value
  if (!EDITABLE_FIELDS[label]) return <TitleSubtitle subtitle={label} title={displayValue || DASH} />

  return (
    <div className="shp-details__field">
      <TitleSubtitle subtitle={label} title={displayValue || DASH} />
      <button
        type="button"
        className="icon-action shp-details__field-action"
        aria-label={`Edit ${label}`}
        onClick={onOpenQuoteModal}
      >
        <Pencil {...ICON_LG} />
      </button>
    </div>
  )
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

function Section({ title, fields, renderField, children }) {
  return (
    <section className="shp-details__section">
      <h3 className="text-label-base-semibold shp-details__section-title">{title}</h3>
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
  // refetch. All three editable fields (Base, Markup, Equipment) share ONE
  // QuoteModal instance — there's nothing per-field to track beyond whether
  // it's open.
  const [overrides, setOverrides] = useState({})
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const openQuoteModal = () => setQuoteModalOpen(true)

  // Escape must close the quote modal WITHOUT closing the outer ModalMedium —
  // whose own Escape handling is an unconditional
  // `window.addEventListener('keydown', ...)` we can't touch (packages/ui) or
  // guard from inside (unlike CustomersModal's self-owned popover, which just
  // no-ops its own listener while confirmOpen). QuoteModal has the identical
  // unconditional listener (its own ModalMedium) — same fix, same reason.
  // Capture phase on window fires before ANY bubble-phase listener on window,
  // regardless of mount order, so stopping propagation here reliably beats
  // both of their listeners to the punch.
  useEffect(() => {
    function onKeyCapture(e) {
      if (e.key !== 'Escape') return
      if (quoteModalOpen) { e.stopPropagation(); setQuoteModalOpen(false) }
    }
    window.addEventListener('keydown', onKeyCapture, true)
    return () => window.removeEventListener('keydown', onKeyCapture, true)
  }, [quoteModalOpen])

  const renderField = (label, value) => (
    <EditableField
      key={label}
      label={label}
      value={value}
      overrides={overrides}
      onOpenQuoteModal={openQuoteModal}
    />
  )

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

  return createPortal(
    <ModalMedium
      title="Shipment Details"
      onClose={onClose}
      ariaLabel="Shipment Details"
    >
      {/* Base / Markup / Equipment — ALL THREE pens open the Tender quote
          modal whole (mode="edit"), not forked, not inline. QuoteModal
          self-portals to document.body (QuoteModal.jsx) with the SAME z-200
          sibling-DOM-order stacking this file relies on elsewhere, so no
          extra wiring is needed here for it to sit above the Shipment Details
          dialog. `carrierData` is the shipment's current routing option — the
          exact RoutingOptionVM shape QuoteModal already consumes elsewhere
          (BottomBar.jsx passes the same shipmentDetails.routingData down to
          RoutingGuideTab, whose local `options` state is that array untouched
          — confirmed no shape mismatch). onSave does NOT re-derive AP
          Total/AR Total/Margin — QuoteModal already owns that math and this
          modal must not re-implement it. Any of the three pens opens the
          SAME instance with the SAME carrierData, so one save always refreshes
          all three overrides together — there's no per-field edit entry point
          to go stale against what was actually saved. */}
      {quoteModalOpen && (
        <QuoteModal
          mode="edit"
          carrierData={option}
          shipmentTz={shipmentTz}
          onSave={(result) => {
            setOverrides((prev) => ({
              ...prev,
              Base: fmtMoney(result.rateDetails.baseRate, result.rateDetails.currency),
              Markup: fmtMoney(result.rateDetails.markup, result.rateDetails.currency),
              Equipment: result.equipment,
            }))
            setQuoteModalOpen(false)
          }}
          onClose={() => setQuoteModalOpen(false)}
        />
      )}

      {error || !shipmentDetails ? (
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
                  onClick={() => setTab('details')}
                  aria-selected={tab === 'details'}
                  role="tab"
                />
                <Tab
                  label="User Defined Fields"
                  current={tab === 'udf'}
                  onClick={() => setTab('udf')}
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
                renderField={renderField}
                fields={[
                  // "Source Name" in the spec is Jana's wording for the customer.
                  ['Source Name', shipment?.customerName],
                  ['Shipment Status', shipment?.shipmentStatus],
                  ['Carrier', summary.acceptedCarrier],
                  // "from current option" per the spec annotation
                  ['Pickup Date/Time', option?.pickupDateTime],
                  ['Delivery Date/Time', option?.deliveryDateTime],
                  ['Gross Weight', summary.grossWeight],
                  ['Volume', summary.volume],
                  ['Mode', shipment?.mode],
                  // Equipment reads the CURRENT ROUTING OPTION's equipment
                  // (the quote's — RoutingOptionVM.equipment,
                  // shipmentDetail.ts:149 / mapSellShipmentOutToDetail.ts:267),
                  // NOT the shipment-level summary.seedEquipment/equipmentCode
                  // (user, 2026-08-10 — "the one related to the quote"). No
                  // current option → DASH, not a silent fallback to the
                  // shipment's value: that would display one equipment while
                  // editing a different one.
                  ['Equipment', option?.equipment ?? DASH],
                  // paymentTerms IS the freight term, already label-mapped by the mapper
                  ['Freight Term', order?.paymentTerms],
                  ['Hazmat', order?.hazmat === 'Yes' ? 'Yes' : 'No'],
                ]}
              />

              <Section
                title="Cost"
                renderField={renderField}
                fields={[
                  // Base — has a pen (2026-08-10, corrected same day; an
                  // earlier pass cut it on a misread of the user). Opens the
                  // same QuoteModal as Markup/Equipment.
                  ['Base', cost.base],
                  ['Fuel (FSC)', cost.fuel],
                  ['Accessorials', cost.accessorials],
                  ['AP Total (Carrier)', cost.apTotal],
                  ['AR Total (Customer)', cost.arTotal],
                  // Markup — NOT in costData (there's no costSummary.markup);
                  // backed by the current routing option's rateDetails.markup,
                  // the same value the Tender quote edits. Adjacent to Margin
                  // (its dependent) so the input and its result read together.
                  ['Markup', fmtMoney(option?.rateDetails?.markup, option?.rateDetails?.currency)],
                  // Margin stays read-only and derived (AR − AP) — absent from
                  // EDITABLE_FIELDS, so renderField falls through to plain
                  // TitleSubtitle same as every other unconfigured Cost row.
                  ['Margin', cost.margin],
                  ['Direct Cost', cost.directCost],
                ]}
              />

              {/* Stops — summary only (the full pane lives in the bar's Stops
                  tab). Mandatory per the user: every stop links to its order in
                  the Orders domain, and the address is shown. */}
              <Section title="Stops">
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

              <Section title="Customer Reference Values">
                <div className="shp-details__orders">
                  {orders.map((o) => {
                    const refs = referencesFor(o)
                    return (
                      /* Order in column 1, its references flowing through the
                         remaining columns and wrapping downward (user, 2026-07-30). */
                      <div key={o.orderNumber} className="shp-details__order">
                        <TitleSubtitle subtitle="Order" title={o.orderNumber || DASH} />
                        {refs.length ? (
                          <div className="shp-details__order-refs">
                            {refs.map(([label, value]) => (
                              <TitleSubtitle key={label} subtitle={label} title={value} />
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

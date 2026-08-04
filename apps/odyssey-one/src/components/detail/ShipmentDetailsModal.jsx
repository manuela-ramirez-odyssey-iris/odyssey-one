import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Button, GroupTable, ModalMedium, SummaryStrip, Tab, TitleSubtitle } from '@odyssey/ui'

const DASH = '--' // LINX-13590 — empty optional fields read '--', never blank

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

function Section({ title, fields, children }) {
  return (
    <section className="shp-details__section">
      <h3 className="text-label-base-semibold shp-details__section-title">{title}</h3>
      {fields ? (
        <div className="shp-details__grid">
          {fields.map(([label, value]) => (
            <TitleSubtitle key={label} subtitle={label} title={value || DASH} />
          ))}
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
  const option = currentOption(shipmentDetails?.routingData?.options)
  const udfOrders = shipmentDetails?.userDefinedData?.orders || []
  const stops = shipmentDetails?.stopsData?.stops || []

  return createPortal(
    <ModalMedium
      title="Shipment Details"
      onClose={onClose}
      ariaLabel="Shipment Details"
    >
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
                  ['Equipment', summary.seedEquipment || shipment?.equipmentCode],
                  // paymentTerms IS the freight term, already label-mapped by the mapper
                  ['Freight Term', order?.paymentTerms],
                  ['Hazmat', order?.hazmat === 'Yes' ? 'Yes' : 'No'],
                ]}
              />

              <Section
                title="Cost"
                fields={[
                  ['Base', cost.base],
                  ['Fuel (FSC)', cost.fuel],
                  ['Accessorials', cost.accessorials],
                  ['AP Total (Carrier)', cost.apTotal],
                  ['AR Total (Customer)', cost.arTotal],
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

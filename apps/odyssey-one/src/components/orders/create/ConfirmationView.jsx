import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, Alert, Badge, Button, PageHeader } from '@odyssey/ui'
import { computeProductRollups, convertMeasureDisplay } from './productMath'

const formatOrderDate = (iso, tz) => {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-')
  return `${m}/${d}/${y} ${time.slice(0, 5)}${tz ? `, ${tz}` : ''}`
}

const triadLabel = (t) => (t.date ? `${t.date} at ${t.time} ${t.timezone}`.trim() : '')

function KV({ label, value }) {
  return (
    <div className="co-kv__item">
      <span className="co-kv__label text-label-xs-regular">{label}</span>
      <span className="co-kv__value text-label-sm-medium">{value || '–'}</span>
    </div>
  )
}

function PartyBlock({ title, party }) {
  return (
    <div className="co-confirm-block">
      <h3 className="co-subhead text-label-base-medium">{title}</h3>
      <div className="co-kv">
        <KV label="ID/Org Name" value={party.idOrgName} />
        <KV label="Long Name" value={party.longName} />
        <KV label="Address 1" value={party.address1} />
        <KV label="Address 2" value={party.address2} />
        <KV label="City" value={party.city} />
        <KV label="State" value={party.state} />
        <KV label="Postal" value={party.postal} />
        <KV label="Country" value={party.country} />
        {party.contactName && <KV label="Contact Name" value={party.contactName} />}
        {party.contactPhone && <KV label="Phone Number" value={party.contactPhone} />}
        {party.contactEmail && <KV label="Email Address" value={party.contactEmail} />}
      </div>
    </div>
  )
}

/**
 * ConfirmationView — screens 6 (sync) / 7 (async). Read-only accordions,
 * all expanded, status green. Renders what was filled — Long-only blocks
 * (references with values, instructions, contacts, carrier) appear only
 * when present. Header strip: Order Number · Order Date/TZ · Shipment Mode
 * (mock "Ground", Q28) · Payment terms (= Freight Term — label drift noted).
 */
export default function ConfirmationView({ data, values, variant }) {
  const [alertOpen, setAlertOpen] = useState(true)
  const isAsync = variant === 'async'
  const { general, pickupDelivery, products, specialServices } = values
  const rollups = computeProductRollups(products, 'us')
  const filledReferences = general.references.filter(
    (r) => r.value.trim() !== '' || (!r.guided && r.type.trim() !== ''),
  )
  const filledInstructions = general.instructions.filter((i) => i.description.trim() !== '')

  return (
    <>
      <PageHeader title="Create New Order">
        <Link to="/orders" style={{ textDecoration: 'none' }}>
          <Button variant="secondary">Back to Orders</Button>
        </Link>
      </PageHeader>

      {alertOpen && (isAsync ? (
        <Alert variant="info" onClose={() => setAlertOpen(false)}>
          Your Order was saved. You will receive a notification when the Order number have been created.
        </Alert>
      ) : (
        <Alert variant="success" onClose={() => setAlertOpen(false)}>
          Your Order was created successfully
        </Alert>
      ))}

      <div className="co-confirm-strip">
        <KV label="Order Number" value={isAsync ? '–' : data?.orderNumber} />
        <KV label="Order Date" value={formatOrderDate(data?.orderDate, data?.orderDateTimeZoneCode)} />
        <KV label="Shipment Mode" value={data?.shipmentMode} />
        <KV label="Payment terms" value={general.freightTerm} />
      </div>

      <div className="co-sections">
        <Accordion position="start" status="on" title="General Information" defaultExpanded>
          <div className="co-section-body">
            <div className="co-confirm-block">
              <h3 className="co-subhead text-label-base-medium">General</h3>
              <div className="co-kv">
                <KV label="Owning Organization" value={general.owningOrganizationName || general.owningOrganization} />
                <KV label="Freight Term" value={general.freightTerm} />
                <KV label="Ship Direction" value={general.shipDirection} />
                <KV label="Consolidatable" value={general.consolidatable ? 'Yes' : 'No'} />
              </div>
            </div>
            <div className="co-confirm-block">
              <h3 className="co-subhead text-label-base-medium">Requested Transportation</h3>
              <div className="co-kv">
                <KV label="Equipment" value={general.equipment} />
                {general.equipmentReferenceNumber && (
                  <KV label="Equipment Reference Number" value={general.equipmentReferenceNumber} />
                )}
                {general.carrierScac && (
                  <KV label="Customer Required Carrier" value={general.carrierScac} />
                )}
              </div>
            </div>
            {filledReferences.length > 0 && (
              <div className="co-confirm-block">
                <h3 className="co-subhead text-label-base-medium">References</h3>
                <table className="co-services-table">
                  <thead>
                    <tr>
                      <th className="text-label-sm-medium">Reference Type</th>
                      <th className="text-label-sm-medium">Reference Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledReferences.map((r) => (
                      <tr key={r.id}>
                        <td className="text-label-sm-regular">{r.type}</td>
                        <td className="text-label-sm-regular">{r.value || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filledInstructions.length > 0 && (
              <div className="co-confirm-block">
                <h3 className="co-subhead text-label-base-medium">Instructions</h3>
                <table className="co-services-table">
                  <thead>
                    <tr>
                      <th className="text-label-sm-medium">#</th>
                      <th className="text-label-sm-medium">Instruction Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledInstructions.map((ins, i) => (
                      <tr key={ins.id}>
                        <td className="text-label-sm-regular">{i + 1}</td>
                        <td className="text-label-sm-regular">{ins.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion position="mid" status="on" title="Pickup and Delivery" defaultExpanded>
          <div className="co-section-body">
            <div className="co-party-grid">
              <PartyBlock title="Consignor details" party={pickupDelivery.consignor} />
              <PartyBlock title="Consignee details" party={pickupDelivery.consignee} />
            </div>
            <div className="co-confirm-block">
              <h3 className="co-subhead text-label-base-medium">Planning Date/Time</h3>
              <div className="co-kv">
                {pickupDelivery.earlyPickup.date && <KV label="Early Pickup" value={triadLabel(pickupDelivery.earlyPickup)} />}
                {pickupDelivery.latePickup.date && <KV label="Late Pickup" value={triadLabel(pickupDelivery.latePickup)} />}
                {pickupDelivery.earlyDelivery.date && <KV label="Early Delivery" value={triadLabel(pickupDelivery.earlyDelivery)} />}
                {pickupDelivery.lateDelivery.date && <KV label="Late Delivery" value={triadLabel(pickupDelivery.lateDelivery)} />}
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion position="mid" status="on" title="Product Information" defaultExpanded>
          <div className="co-section-body">
            <div className="co-kv">
              <KV label="Number of Products" value={String(rollups.count)} />
              <KV label="Total Product Weight" value={rollups.totalWeight} />
              <KV label="Total Volume" value={rollups.totalVolume} />
              <KV label="Hazmat" value={rollups.hazmat} />
            </div>
            <table className="co-services-table">
              <thead>
                <tr>
                  <th className="text-label-sm-medium">#</th>
                  <th className="text-label-sm-medium">Product ID</th>
                  <th className="text-label-sm-medium">Product Description</th>
                  <th className="text-label-sm-medium">Gross Weight</th>
                  <th className="text-label-sm-medium">Volume</th>
                  <th className="text-label-sm-medium">Ship Class</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-label-sm-regular">{i + 1}</td>
                    <td className="text-label-sm-regular">{p.productId}</td>
                    <td className="text-label-sm-regular">{p.description}</td>
                    <td className="text-label-sm-regular">{convertMeasureDisplay(p.grossWeight, 'us')}</td>
                    <td className="text-label-sm-regular">{convertMeasureDisplay(p.volume, 'us')}</td>
                    <td className="text-label-sm-regular">{p.shipClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion position="end" status="on" title="Special Services (Optional)" defaultExpanded>
          <table className="co-services-table">
            <thead>
              <tr>
                <th className="text-label-sm-medium">Service Category</th>
                <th className="text-label-sm-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {specialServices.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-label-sm-regular co-cell--empty">
                    No special services added
                  </td>
                </tr>
              ) : (
                specialServices.map((s) => (
                  <tr key={s.code}>
                    <td><Badge variant="gray">{s.code}</Badge></td>
                    <td className="text-label-sm-regular">{s.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Accordion>
      </div>
    </>
  )
}

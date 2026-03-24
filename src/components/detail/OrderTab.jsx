import { useMemo } from 'react'

function Section({ title, children, cols = 4 }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="text-xs font-semibold uppercase tracking-wide"
        style={{
          color: 'var(--text-tertiary)',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {title}
      </div>
      <div className={`grid gap-x-6 gap-y-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>{children}</div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-placeholder)', marginBottom: 2 }}>
        {label}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {value || '--'}
      </div>
    </div>
  )
}

export default function OrderTab({ data }) {
  const d = useMemo(() => data || {}, [data])

  if (!data) return <div className="text-sm" style={{ color: 'var(--text-placeholder)' }}>No order data available.</div>

  return (
    <div>
      {/* General */}
      <Section title="General">
        <Field label="Order Number" value={d.orderNumber} />
        <Field label="Ship Direction" value={d.shipDirection} />
        <Field label="Order Date" value={d.orderDate} />
        <Field label="Payment Terms" value={d.paymentTerms} />
        <Field label="Shipment Mode" value={d.shipmentMode} />
        <Field label="Expedited" value={d.expedited} />
        <Field label="Consolidatable" value={d.consolidatable} />
        <Field label="Equipment" value={d.equipment} />
        <Field label="Special Services" value={d.specialServices} />
        <Field label="LSP" value={d.lsp} />
        <Field label="Carrier" value={d.carrier} />
      </Section>

      {/* Requested Transportation */}
      <Section title="Requested Transportation">
        <Field label="Mode" value={d.shipmentMode} />
        <Field label="Equipment Type" value={d.equipment} />
        <Field label="Service Level" value={d.serviceLevel} />
        <Field label="Transport Priority" value={d.transportPriority} />
      </Section>

      {/* Ship From */}
      <Section title="Ship From">
        <Field label="Site ID" value={d.shipFrom?.siteId} />
        <Field label="Company" value={d.shipFrom?.company} />
        <Field label="Location" value={d.shipFrom?.location} />
        <Field label="Address" value={d.shipFrom?.address} />
      </Section>

      {/* Ship To */}
      <Section title="Ship To">
        <Field label="Site ID" value={d.shipTo?.siteId} />
        <Field label="Company" value={d.shipTo?.company} />
        <Field label="Location" value={d.shipTo?.location} />
        <Field label="Address" value={d.shipTo?.address} />
      </Section>

      {/* Schedule */}
      <Section title="Requested Schedule">
        <Field label="Earliest Pickup" value={d.earliestPickup} />
        <Field label="Latest Pickup" value={d.latestPickup} />
        <Field label="Earliest Delivery" value={d.earliestDelivery} />
        <Field label="Latest Delivery" value={d.latestDelivery} />
      </Section>

      {/* Products */}
      <Section title="Products Info">
        <Field label="Number of Products" value={d.numProducts} />
        <Field label="Total Weight" value={d.totalWeight} />
        <Field label="Total Volume" value={d.totalVolume} />
        <Field label="Hazmat" value={d.hazmat} />
      </Section>

      {/* Totals */}
      <Section title="Totals">
        <Field label="Total Product Weight" value={d.totalWeight} />
        <Field label="Total Product Volume" value={d.totalVolume} />
        <Field label="Total Gross Weight" value={d.grossWeight} />
        <Field label="Total Tare Weight" value={d.tareWeight} />
      </Section>

      {/* Incoterms & Ports */}
      <Section title="Incoterms & Ocean/Air Ports">
        <Field label="Incoterm" value={d.incoterm} />
        <Field label="Incoterm Location" value={d.incotermLocation} />
        <Field label="Port of Loading" value={d.portOfLoading} />
        <Field label="Port of Discharge" value={d.portOfDischarge} />
      </Section>

      {/* References */}
      <Section title="References">
        <Field label="Sales Order #" value={d.salesOrder} />
        <Field label="Delivery #" value={d.deliveryNumber} />
        <Field label="PO Number" value={d.poNumber} />
        <Field label="Pro#/Booking #" value={d.proBooking} />
        <Field label="Pickup Number" value={d.pickupNumber} />
        <Field label="Confirmation #" value={d.confirmationNumber} />
      </Section>

      {/* Merged References */}
      <Section title="Merged References">
        <Field label="Quote #" value={d.quoteNumber} />
        <Field label="BOL #" value={d.bolNumber} />
      </Section>

      {/* Contacts */}
      <Section title="Contact Details">
        <Field label="Contact Name" value={d.contactName} />
        <Field label="Contact Email" value={d.contactEmail} />
        <Field label="Contact Phone" value={d.contactPhone} />
      </Section>

      {/* Custom Fields */}
      <Section title="Custom Fields General">
        <Field label="Custom Field 1" value={d.customField1} />
        <Field label="Custom Field 2" value={d.customField2} />
      </Section>
    </div>
  )
}

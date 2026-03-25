import { useMemo } from 'react'

const sectionStyle = {
  padding: 'var(--spacing-4) var(--spacing-5)',
  borderRight: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-subtle)',
}

const lastColSectionStyle = {
  ...sectionStyle,
  borderRight: 'none',
}

function SectionCell({ title, children, isLastCol = false }) {
  return (
    <div style={isLastCol ? lastColSectionStyle : sectionStyle}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          paddingBottom: 'var(--spacing-2)',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          lineHeight: 'var(--line-height-xs)',
          marginBottom: '2px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 'var(--line-height-sm)',
        }}
      >
        {value || '--'}
      </div>
    </div>
  )
}

export default function OrderTab({ data }) {
  const d = useMemo(() => data || {}, [data])

  if (!data)
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>
        No order data available.
      </div>
    )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Row 1 */}
      <SectionCell title="General">
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
      </SectionCell>

      <SectionCell title="Requested Transportation">
        <Field label="Mode" value={d.shipmentMode} />
        <Field label="Equipment Type" value={d.equipment} />
        <Field label="Service Level" value={d.serviceLevel} />
        <Field label="Transport Priority" value={d.transportPriority} />
      </SectionCell>

      <SectionCell title="Ship From">
        <Field label="Site ID" value={d.shipFrom?.siteId} />
        <Field label="Company" value={d.shipFrom?.company} />
        <Field label="Location" value={d.shipFrom?.location} />
        <Field label="Address" value={d.shipFrom?.address} />
      </SectionCell>

      <SectionCell title="Ship To" isLastCol>
        <Field label="Site ID" value={d.shipTo?.siteId} />
        <Field label="Company" value={d.shipTo?.company} />
        <Field label="Location" value={d.shipTo?.location} />
        <Field label="Address" value={d.shipTo?.address} />
      </SectionCell>

      {/* Row 2 */}
      <SectionCell title="Requested Schedule (Fixed Pickup)">
        <Field label="Earliest Pickup" value={d.earliestPickup} />
        <Field label="Latest Pickup" value={d.latestPickup} />
        <Field label="Earliest Delivery" value={d.earliestDelivery} />
        <Field label="Latest Delivery" value={d.latestDelivery} />
      </SectionCell>

      <SectionCell title="Products Info">
        <Field label="Number of Products" value={d.numProducts} />
        <Field label="Total Weight" value={d.totalWeight} />
        <Field label="Total Volume" value={d.totalVolume} />
        <Field label="Hazmat" value={d.hazmat} />
      </SectionCell>

      <SectionCell title="Totals">
        <Field label="Total Product Weight" value={d.totalWeight} />
        <Field label="Total Product Volume" value={d.totalVolume} />
        <Field label="Total Gross Weight" value={d.grossWeight} />
        <Field label="Total Tare Weight" value={d.tareWeight} />
      </SectionCell>

      <SectionCell title="Incoterms & Ocean/Air Ports" isLastCol>
        <Field label="Incoterm" value={d.incoterm} />
        <Field label="Incoterm Location" value={d.incotermLocation} />
        <Field label="Port of Loading" value={d.portOfLoading} />
        <Field label="Port of Discharge" value={d.portOfDischarge} />
      </SectionCell>

      {/* Row 3 */}
      <SectionCell title="References">
        <Field label="Sales Order #" value={d.salesOrder} />
        <Field label="Delivery #" value={d.deliveryNumber} />
        <Field label="PO Number" value={d.poNumber} />
        <Field label="Pro#/Booking #" value={d.proBooking} />
        <Field label="Pickup Number" value={d.pickupNumber} />
        <Field label="Confirmation #" value={d.confirmationNumber} />
      </SectionCell>

      <SectionCell title="Merged References">
        <Field label="Quote #" value={d.quoteNumber} />
        <Field label="BOL #" value={d.bolNumber} />
      </SectionCell>

      <SectionCell title="Contact Details">
        <Field label="Contact Name" value={d.contactName} />
        <Field label="Contact Email" value={d.contactEmail} />
        <Field label="Contact Phone" value={d.contactPhone} />
      </SectionCell>

      <SectionCell title="Custom Fields General" isLastCol>
        <Field label="Custom Field 1" value={d.customField1} />
        <Field label="Custom Field 2" value={d.customField2} />
      </SectionCell>
    </div>
  )
}

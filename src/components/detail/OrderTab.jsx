import React, { useMemo } from 'react'

const sectionStyle = {
  padding: 'var(--spacing-4) var(--spacing-5)',
  borderRight: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-subtle)',
}

const lastColSectionStyle = {
  ...sectionStyle,
  borderRight: 'none',
}

const appointmentBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(59, 130, 246, 0.10)',
  color: 'rgb(37, 99, 235)',
  marginTop: 4,
}

function SectionCell({ title, children, isLastCol = false, appointment }) {
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
        {appointment && (
          <div>
            <span style={appointmentBadgeStyle}>Appointment</span>
          </div>
        )}
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

const OrderTab = React.memo(function OrderTab({ data }) {
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
      {/* Row 1: General | Totals (promoted) | Ship From + Pickup Dates | Ship To + Delivery Dates */}
      <SectionCell title="General">
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

      <SectionCell title="Totals">
        <Field label="Total Product Weight" value={d.totalWeight} />
        <Field label="Total Product Volume" value={d.totalVolume} />
        <Field label="Total Gross Weight" value={d.grossWeight} />
        <Field label="Total Tare Weight" value={d.tareWeight} />
      </SectionCell>

      <SectionCell title="Ship From" appointment={d.pickupAppointment}>
        <Field label="Site ID" value={d.shipFrom?.siteId} />
        <Field label="Company" value={d.shipFrom?.company} />
        <Field label="Location" value={d.shipFrom?.location} />
        <Field label="Address" value={d.shipFrom?.address} />
        <Field label="Earliest Pickup" value={d.earliestPickup} />
        <Field label="Latest Pickup" value={d.latestPickup} />
      </SectionCell>

      <SectionCell title="Ship To" isLastCol appointment={d.deliveryAppointment}>
        <Field label="Site ID" value={d.shipTo?.siteId} />
        <Field label="Company" value={d.shipTo?.company} />
        <Field label="Location" value={d.shipTo?.location} />
        <Field label="Address" value={d.shipTo?.address} />
        <Field label="Earliest Delivery" value={d.earliestDelivery} />
        <Field label="Latest Delivery" value={d.latestDelivery} />
      </SectionCell>

      {/* Row 2: Req. Transportation (demoted) | Products Info | References | Incoterms */}
      <SectionCell title="Requested Transportation">
        <Field label="Mode" value={d.shipmentMode} />
        <Field label="Equipment Type" value={d.equipment} />
        <Field label="Service Level" value={d.serviceLevel} />
        <Field label="Transport Priority" value={d.transportPriority} />
      </SectionCell>

      <SectionCell title="Products Info">
        <Field label="Number of Products" value={d.numProducts} />
        <Field label="Total Weight" value={d.totalWeight} />
        <Field label="Total Volume" value={d.totalVolume} />
        <Field label="Hazmat" value={d.hazmat} />
      </SectionCell>

      <SectionCell title="References">
        <Field label="Sales Order #" value={d.salesOrder} />
        <Field label="Delivery #" value={d.deliveryNumber} />
        <Field label="PO Number" value={d.poNumber} />
        <Field label="Pro#/Booking #" value={d.proBooking} />
        <Field label="Pickup Number" value={d.pickupNumber} />
        <Field label="Confirmation #" value={d.confirmationNumber} />
      </SectionCell>

      <SectionCell title="Incoterms & Ports" isLastCol>
        <Field label="Incoterm" value={d.incoterm} />
        <Field label="Incoterm Location" value={d.incotermLocation} />
        <Field label="Port of Loading" value={d.portOfLoading} />
        <Field label="Port of Discharge" value={d.portOfDischarge} />
      </SectionCell>

      {/* Row 3: Contact Details | Custom Fields */}
      <SectionCell title="Contact Details">
        <Field label="Contact Name" value={d.contactName} />
        <Field label="Contact Email" value={d.contactEmail} />
        <Field label="Contact Phone" value={d.contactPhone} />
      </SectionCell>

      <SectionCell title="Custom Fields" isLastCol>
        <Field label="Custom Field 1" value={d.customField1} />
        <Field label="Custom Field 2" value={d.customField2} />
      </SectionCell>
    </div>
  )
})
export default OrderTab

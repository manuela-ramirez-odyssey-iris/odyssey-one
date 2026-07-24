import { createPortal } from 'react-dom'
import { Button, ModalMedium } from '@odyssey/ui'
import { Field, SectionHeader } from './RoutingGuideTab'

// View Shipment Details — opened from the ShipmentsBar's shipment-id ButtonLink
// (S93; formerly the Tender tab's "View Shipment Details" button + hand-rolled
// modal). ModalMedium shell (540) → the four sections stack in a 2×2 grid.
// Portaled to <body>: rendered inside the fixed bar it would inherit its
// stacking context and z-index (same reasoning as TableControls' export modal).
export default function ShipmentDetailsModal({ shipment, shipmentDetails, onClose }) {
  const order = shipmentDetails?.orderDetails?.[0]
  const stops = shipmentDetails?.stopsData?.stops || []
  const summary = shipmentDetails?.stopsData?.summary || {}
  const costOrder = shipmentDetails?.costData?.planned?.orders?.[0]
  const pickupStop = stops.find(s => s.type === 'pickup')
  const deliveryStop = [...stops].reverse().find(s => s.type === 'delivery')

  const cell = { minWidth: 0 }

  return createPortal(
    <ModalMedium
      title="Shipment Details"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={() => { /* TODO: wire View Stops */ }}>
            View Stops
          </Button>
          <Button variant="primary" size="lg" onClick={() => { /* TODO: wire Routing Query (QCP) */ }}>
            Routing Query (QCP)
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
        <div style={cell}>
          <SectionHeader>Shipment</SectionHeader>
          <Field label="Buy Shipment ID" value={shipment?.buyShipment} />
          <Field label="Sell Shipment ID" value={shipment?.sellShipment} />
          <Field label="Mode" value={shipment?.mode} />
          <Field label="Seed Equipment" value={shipment?.equipmentCode} />
          <Field label="Planning Date Type" value="RDD" />
          <Field label="Gross Weight" value={shipment?.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} LB` : null} />
          <Field label="Pkg Count" value={pickupStop?.packageCount || null} />
          <Field label="Volume" value={summary.volume} />
          <Field label="Distance" value={summary.distance} />
          <Field label="Instructions" value={
            (() => {
              const orders = shipmentDetails?.instructionsData?.orders || []
              const count = orders.reduce((sum, o) => sum + (o.instructions?.length || 0), 0)
              return count > 0 ? `${count} instruction${count !== 1 ? 's' : ''}` : 'No instructions'
            })()
          } />
          <Field label="Hazardous" value={
            order?.hazmat === 'Yes'
              ? (() => {
                  const products = shipmentDetails?.productData?.orders?.[0]?.products || []
                  const haz = products.find(p => p.hazmat)
                  return haz ? `Yes — ${haz.hazmatClass || ''} ${haz.hazmatDescription || ''}`.trim() : 'Yes'
                })()
              : 'No'
          } />
        </div>

        <div style={cell}>
          <SectionHeader>Order</SectionHeader>
          <Field label="Planning Date Type" value="RDD" />
          <Field label="Order Pickup Date/Time" value={order?.earliestPickup} />
          <Field label="Order Delivery Date/Time" value={order?.earliestDelivery} />
          <Field label="Order #" value={shipment?.orders?.join(', ')} />
          <Field label="Direct Cost" value={costOrder?.directCost || null} />
          <Field label="Pickup #" value={order?.pickupNumber || null} />
        </div>

        <div style={cell}>
          <SectionHeader>Initial Pickup</SectionHeader>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Pickup location name &amp; Address
          </div>
          <Field label="Company" value={order?.shipFrom?.company} />
          <Field label="Address" value={order?.shipFrom?.address} />
          <Field label="Location" value={order?.shipFrom?.location} />
          <div style={{ marginTop: 8 }} />
          <Field label="Pickup Date/Time" value={pickupStop?.date} />
        </div>

        <div style={cell}>
          <SectionHeader>Final Delivery</SectionHeader>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Delivery location name &amp; Address
          </div>
          <Field label="Company" value={order?.shipTo?.company} />
          <Field label="Address" value={order?.shipTo?.address} />
          <Field label="Location" value={order?.shipTo?.location} />
          <div style={{ marginTop: 8 }} />
          <Field label="Delivery Date/Time" value={deliveryStop?.date} />
        </div>
      </div>
    </ModalMedium>,
    document.body,
  )
}

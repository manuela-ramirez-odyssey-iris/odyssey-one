import { createPortal } from 'react-dom'
import { Button, ModalMedium, TitleSubtitle } from '@odyssey/ui'

const DASH = '--' // LINX-13590 — empty optional fields read '--', never blank

// "06/02/2026 08:00 CST" → "06/02/2026 08:00 CST, WED" (mock 1348:16364).
// Anything that isn't a MM/DD/YYYY-leading string passes through untouched.
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
function withWeekday(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value ?? '')
  if (!m) return value
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]))
  return `${value}, ${WEEKDAYS[d.getDay()]}`
}

function Section({ title, fields }) {
  return (
    <section className="shp-details__section">
      <h3 className="text-label-base-semibold shp-details__section-title">{title}</h3>
      <div className="shp-details__grid">
        {fields.map(([label, value]) => (
          <TitleSubtitle key={label} subtitle={label} title={value || DASH} />
        ))}
      </div>
    </section>
  )
}

// View Shipment Details — opened from the ShipmentsBar's shipment-id ButtonLink
// (S93; formerly the Tender tab's "View Shipment Details" button + hand-rolled
// modal). Data organization per Figma 1348:16364: four full-width sections
// stacked, each a 4-column grid of TitleSubtitle label/value pairs. Error
// variant per 1357:17184.
// Portaled to <body>: rendered inside the fixed bar it would inherit its
// stacking context and z-index (same reasoning as TableControls' export modal).
export default function ShipmentDetailsModal({ shipment, shipmentDetails, error, onClose }) {
  const order = shipmentDetails?.orderDetails?.[0]
  const stops = shipmentDetails?.stopsData?.stops || []
  const summary = shipmentDetails?.stopsData?.summary || {}
  const costOrder = shipmentDetails?.costData?.planned?.orders?.[0]
  const pickupStop = stops.find(s => s.type === 'pickup')
  const deliveryStop = [...stops].reverse().find(s => s.type === 'delivery')

  const instructionCount = (shipmentDetails?.instructionsData?.orders || [])
    .reduce((sum, o) => sum + (o.instructions?.length || 0), 0)

  return createPortal(
    <ModalMedium
      title="Shipment Details"
      onClose={onClose}
      ariaLabel="Shipment Details"
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
          <Section
            title="Shipment"
            fields={[
              ['Buy Shipment ID', shipment?.buyShipment],
              ['Sell Shipment', shipment?.sellShipment],
              ['Mode', shipment?.mode],
              ['Seed Equipment', shipment?.equipmentCode],
              ['Gross Weight', shipment?.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} LB` : null],
              ['Pkg Count', pickupStop?.packageCount],
              ['Volume', summary.volume],
              ['Distance', summary.distance],
              ['Instructions', instructionCount > 0 ? `${instructionCount} instruction${instructionCount !== 1 ? 's' : ''}` : 'No instructions'],
              ['Hazardous', order?.hazmat === 'Yes' ? 'Yes' : 'No'],
            ]}
          />
          <Section
            title="Order"
            fields={[
              ['Planning Date Type', 'RDD'],
              ['Order Pickup Date', order?.earliestPickup],
              ['Order Delivery Date', order?.earliestDelivery],
              ['Order #', shipment?.orders?.join(', ')],
              ['Direct Cost', costOrder?.directCost],
              ['Pickup #', order?.pickupNumber],
            ]}
          />
          <Section
            title="Initial Pickup"
            fields={[
              ['Company', order?.shipFrom?.company],
              ['Address', order?.shipFrom?.address],
              ['Location', order?.shipFrom?.location],
              ['Pickup Date/Time', withWeekday(pickupStop?.date)],
            ]}
          />
          <Section
            title="Final Delivery"
            fields={[
              ['Company', order?.shipTo?.company],
              ['Address', order?.shipTo?.address],
              ['Location', order?.shipTo?.location],
              ['Delivery Date/Time', withWeekday(deliveryStop?.date)],
            ]}
          />
        </div>
      )}
    </ModalMedium>,
    document.body,
  )
}

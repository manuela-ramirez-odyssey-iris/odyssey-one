import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, DatePicker, ModalMedium, TimePicker } from '@odyssey/ui'
import TimezoneSelect from '../orders/create/fields/TimezoneSelect'

/**
 * LINX-13954 — Manual Pickup and Delivery Entry.
 *
 * Opens on the routing-failure branch, when routing came back without dates.
 * That is the single most common case in the seeded data (Missing Transit Time
 * is 6 of every 11 dropped carriers), so this dialog is on the main path, not
 * an edge case.
 *
 * BOTH validations are hard blocks — OK stays disabled until each passes.
 * "Pickup cannot be in the past" is the one we questioned (a late load is
 * plausible, not impossible); it was ruled "per the story", so it blocks.
 *
 * `now` is a prop, not `new Date()` read inline, so the past-check is testable
 * without the wall clock deciding whether the suite passes.
 *
 * Composition copies RoutingGuideTab's `ConfirmDialog` shell (ModalMedium +
 * createPortal + a Cancel/OK footer) — same known-working pattern, not the
 * narrowed `confirm-dialog` className, since this dialog carries real input
 * fields rather than one line of message text.
 *
 * ── PICKERS, NOT TYPED TEXT (user, 2026-08-18) ─────────────────────────────
 * Each field is a normalized `DatePicker` + `TimePicker` pair rather than one
 * free-text box expecting "MM/DD/YYYY HH:MM". The AC names the field "Pickup
 * Date/Time" and says nothing about the control; typing a masked datetime is
 * the worst of both, and this dialog sits on the MOST COMMON branch (Missing
 * Transit Time is 6 of every 11 dropped carriers), so it is not a corner to
 * cut. Both components are already normalized in @odyssey/ui — used on their
 * own contracts, no wrappers, no escape hatches.
 *
 * ── TIME ZONE (Soni, S144, LINX-13954) ─────────────────────────────────────
 * A `TimezoneSelect` (reused as-is, no wrapper) sits beside each Date/Time
 * pair so the planner can say which zone the entered times are in. The
 * `onConfirm` payload strings now carry that zone as a suffix — "MM/DD/YYYY
 * HH:MM CST" — same format `dates.js`'s `splitDateTime` already parses and
 * `processScac.test.js` already exercises (line ~182). Default is 'CST',
 * matching `splitDateTime`'s own fallback. The zone is a LABEL on the
 * payload only — it is not applied to the past/order Date comparisons below.
 */

export const PICKUP_PAST_ERROR = 'Pickup Date/Time cannot be in the past.'
export const DELIVERY_ORDER_ERROR = 'Delivery Date/Time must be later than Pickup Date/Time.'

const pad = (n) => String(n).padStart(2, '0')

// DatePicker emits a Date; TimePicker emits canonical 24h "HH:MM". Neither is
// meaningful alone, so both halves must be present before a value exists.
function combine(date, time) {
  if (!date || !time) return null
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d
}

// Back to the wire format the rest of the flow already speaks.
function format(d) {
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ManualDatesModal({ now = new Date(), onConfirm, onCancel }) {
  const [pickupDate, setPickupDate] = useState(null)
  const [pickupTime, setPickupTime] = useState('')
  const [pickupTz, setPickupTz] = useState('CST')
  const [deliveryDate, setDeliveryDate] = useState(null)
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryTz, setDeliveryTz] = useState('CST')

  const pickup = combine(pickupDate, pickupTime)
  const delivery = combine(deliveryDate, deliveryTime)

  // Only shown once there's a parseable value to judge — an error ahead of
  // any input reads as the form being broken, not as guidance.
  const pastError = pickup && pickup < now ? PICKUP_PAST_ERROR : null
  const orderError = pickup && delivery && delivery <= pickup ? DELIVERY_ORDER_ERROR : null
  const valid = !!pickup && !!delivery && !pastError && !orderError

  const handleConfirm = () => {
    if (!valid) return
    onConfirm({
      pickupDateTime: pickupTz ? `${format(pickup)} ${pickupTz}` : format(pickup),
      deliveryDateTime: deliveryTz ? `${format(delivery)} ${deliveryTz}` : format(delivery),
    })
  }

  return createPortal(
    <ModalMedium
      title="Reinstate Dropped Carrier"
      onClose={onCancel}
      ariaLabel="Reinstate Dropped Carrier"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={handleConfirm} disabled={!valid}>OK</Button>
        </>
      }
    >
      {/* The AC puts each message "under the pickup date" / "under the
          delivery date", so the error binds to the DATE half of each pair
          even though both halves feed the comparison. */}
      <div className="manual-dates__row">
        <DatePicker
          id="manual-dates-pickup-date"
          label="Pickup Date"
          value={pickupDate}
          onChange={setPickupDate}
          error={pastError}
        />
        <TimePicker
          id="manual-dates-pickup-time"
          label="Pickup Time"
          value={pickupTime}
          onChange={setPickupTime}
        />
        <TimezoneSelect
          id="manual-dates-pickup-tz"
          label="Pickup Time Zone"
          value={pickupTz}
          onChange={setPickupTz}
        />
      </div>
      <div className="manual-dates__row">
        <DatePicker
          id="manual-dates-delivery-date"
          label="Delivery Date"
          value={deliveryDate}
          onChange={setDeliveryDate}
          error={orderError}
        />
        <TimePicker
          id="manual-dates-delivery-time"
          label="Delivery Time"
          value={deliveryTime}
          onChange={setDeliveryTime}
        />
        <TimezoneSelect
          id="manual-dates-delivery-tz"
          label="Delivery Time Zone"
          value={deliveryTz}
          onChange={setDeliveryTz}
        />
      </div>
    </ModalMedium>,
    document.body,
  )
}

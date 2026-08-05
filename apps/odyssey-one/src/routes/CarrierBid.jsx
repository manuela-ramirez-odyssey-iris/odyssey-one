import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { OdysseyLogo, Button, Alert, FormField } from '@odyssey/ui'
import MeasureField from '../components/orders/create/fields/MeasureField.jsx'
import { decodeToken } from '../spotboard/token.js'
import { getQuote, submitBid, declineBid } from '../spotboard/spotStore.js'
import Countdown from '../spotboard/Countdown.jsx'
import { useShipmentDetail } from '../api/queries/useShipmentDetail'
import { parseDollar, fmtDollar } from '../utils/money'
import { formatDateTimeMDYHM } from '../lib/dates.js'
import './carrierBid.css'

const USD_OPTIONS = [{ value: 'USD', label: 'USD' }]
const round2 = (n) => Math.round(n * 100) / 100

// Standalone external carrier page — reached via an unauthenticated token link
// (no login), so it renders NOTHING from AppShell: no sidebar, no navbar, no
// nav landmark at all (SpotBoard canon: carriers see only their own lane).
export default function CarrierBid() {
  const { token } = useParams()
  const decoded = useMemo(() => decodeToken(token), [token])
  const shipmentId = decoded?.shipmentId ?? null
  const scac = decoded?.scac ?? null

  const [quote, setQuote] = useState(() => (shipmentId ? getQuote(shipmentId) : null))
  const { data: shipment, isLoading } = useShipmentDetail(shipmentId)

  const carrier = quote?.carriers.find((c) => c.scac === scac) ?? null
  const priorBid = carrier?.bid?.status === 'bid' ? carrier.bid : null
  const declined = carrier?.bid?.status === 'declined'

  const [linehaulValue, setLinehaulValue] = useState(() => String(priorBid?.linehaul ?? ''))
  const [accessorialAmounts, setAccessorialAmounts] = useState(() => {
    const map = {}
    for (const a of priorBid?.accessorials ?? []) map[a.code] = String(a.amount)
    return map
  })

  const isExpired = !!quote?.closeAt && Date.now() > quote.closeAt
  let closedReason = null
  if (!decoded) closedReason = 'This link is invalid.'
  else if (!quote) closedReason = 'This quote is no longer available.'
  else if (!carrier) closedReason = 'This link is invalid.'
  else if (quote.status !== 'open' || isExpired) closedReason = 'This bidding window has closed.'

  if (closedReason) {
    return (
      <div className="carrier-bid-page">
        <header className="carrier-bid-page__header">
          <OdysseyLogo variant="dark" />
        </header>
        <main>
          <Alert variant="warning" showClose={false}>{closedReason}</Alert>
        </main>
      </div>
    )
  }

  // ── Shipment detail (order[0] stands in for the shipment — SpotBoard lanes
  // are single-order in practice; a multi-order shipment would need a real
  // per-order picker, out of scope for v1). Instructions are read by the same
  // array position, never by orderId, so no order identifier is ever touched.
  const order = shipment?.orderDetails?.[0] ?? null
  const services = order?.specialServices ?? []
  // ponytail: the VM has no per-carrier fuel figure at bid time — stand in
  // with the shipment's own AP fuel amount ("precalculated") rather than
  // inventing a number. Flagged for Jana/David: real fuel-index source TBD.
  const fuel = shipment ? parseDollar(shipment.costData.planned.summary.fuel) ?? 0 : 0
  const instructionsText = shipment
    ? (shipment.instructionsData.orders[0]?.instructions ?? []).map((i) => i.text).join(' ')
    : ''

  const linehaulNum = Number(linehaulValue) || 0
  const accessorialLines = services.map((s) => ({
    code: s.code,
    description: s.desc,
    amount: Number(accessorialAmounts[s.code]) || 0,
  }))
  const accessorialSum = accessorialLines.reduce((sum, a) => sum + a.amount, 0)
  const total = round2(linehaulNum + fuel + accessorialSum)

  const handleSubmit = () => {
    const bid = { linehaul: linehaulNum, fuel, accessorials: accessorialLines, total, submittedBy: carrier.name }
    setQuote(submitBid(shipmentId, scac, bid, Date.now()))
  }
  const handleDecline = () => {
    setQuote(declineBid(shipmentId, scac, Date.now()))
  }

  return (
    <div className="carrier-bid-page">
      <header className="carrier-bid-page__header">
        <OdysseyLogo variant="dark" />
      </header>

      <div className="carrier-bid-page__countdown">
        <span className="text-label-sm-regular carrier-bid-page__countdown-label">Bid closes in</span>
        <Countdown closeAt={quote.closeAt} onExpire={() => setQuote(getQuote(shipmentId))} />
      </div>

      <main>
      {isLoading || !order ? (
        <p className="carrier-bid-page__loading text-label-sm-regular">Loading shipment details…</p>
      ) : (
        <>
          <section className="carrier-bid-card">
            <h1 className="text-label-base-semibold carrier-bid-card__title">Shipment Detail — Quote {quote.quoteId}</h1>
            <div className="carrier-bid-card__grid">
              <FormField id="cb-shipper" label="Shipper" value={order.shipFrom.company} readOnly />
              <FormField id="cb-equipment" label="Equipment" value={order.equipment} readOnly />
              <FormField id="cb-origin" label="Origin" value={order.shipFrom.location} readOnly />
              <FormField id="cb-destination" label="Destination" value={order.shipTo.location} readOnly />
              <FormField id="cb-stops" label="Stops" value={String(shipment.stopsData.stops.length)} readOnly />
              <FormField id="cb-distance" label="Distance" value={shipment.stopsData.summary.distance} readOnly />
              <FormField id="cb-pickup" label="Pickup" value={order.earliestPickup} readOnly />
              <FormField id="cb-delivery" label="Delivery" value={order.earliestDelivery} readOnly />
              <FormField id="cb-hazmat" label="Hazmat" value={order.hazmat} readOnly />
              {order.hazmat === 'Yes' && (
                // ponytail: no MSDS document URL exists on the VM — stub link,
                // flagged for a real source when one is available.
                <a
                  className="carrier-bid-card__msds text-label-sm-regular"
                  href="#msds"
                  onClick={(e) => e.preventDefault()}
                >
                  View MSDS
                </a>
              )}
              <FormField id="cb-special-services" label="Special Services" value={services.length ? services.map((s) => s.desc).join(', ') : '--'} readOnly />
              <FormField id="cb-instructions" label="Instructions" value={instructionsText || '--'} readOnly />
            </div>
          </section>

          <section className="carrier-bid-card">
            <h2 className="text-label-base-semibold carrier-bid-card__title">Your Bid</h2>
            <div className="carrier-bid-card__grid">
              <MeasureField
                id="cb-linehaul"
                showLabel
                label="Linehaul / Base"
                value={{ value: linehaulValue, uom: 'USD' }}
                options={USD_OPTIONS}
                decimals={2}
                onChange={(v) => setLinehaulValue(v.value)}
              />
              <FormField id="cb-fuel" label="Fuel" value={fmtDollar(fuel)} readOnly />
              {accessorialLines.map((a) => (
                <FormField
                  key={a.code}
                  id={`cb-accessorial-${a.code}`}
                  label={`Accessorial — ${a.description}`}
                  format="decimal"
                  value={accessorialAmounts[a.code] ?? ''}
                  onChange={(e) => setAccessorialAmounts((m) => ({ ...m, [a.code]: e.target.value }))}
                />
              ))}
              <div className="carrier-bid-total text-label-sm-medium">
                <span>Total</span>
                <span>{fmtDollar(total)}</span>
              </div>
            </div>

            {priorBid && (
              <p className="carrier-bid-page__last-submitted text-label-sm-regular">
                Last submitted: {fmtDollar(priorBid.total)} by {priorBid.submittedBy} · {formatDateTimeMDYHM(new Date(priorBid.respondedAt))}
              </p>
            )}
            {declined && !priorBid && (
              <p className="carrier-bid-page__note text-label-sm-regular">
                You declined this quote. You can still submit a bid while this window is open.
              </p>
            )}

            <div className="carrier-bid-page__actions">
              <Button variant="secondary" size="lg" onClick={handleDecline}>Decline</Button>
              <Button variant="primary" size="lg" onClick={handleSubmit}>
                {priorBid ? 'Update Bid' : 'Submit Bid'}
              </Button>
            </div>
          </section>
        </>
      )}
      </main>
    </div>
  )
}

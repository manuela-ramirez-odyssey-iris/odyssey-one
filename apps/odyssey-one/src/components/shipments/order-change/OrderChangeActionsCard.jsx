import { useState } from 'react'
import { Badge, Button, FormField, Radio } from '@odyssey/ui'
import { QuoteModal } from '../../detail/QuoteModal.jsx'

// "Actions to Keep Current Carrier" (Figma 1794-5544, LINX-14513/14514). The
// entire card is about ONE carrier — the prior one (domain expert: "the
// decision is about the prior carrier") — so `oc.prior`/`oc.newOption` are
// the same carrier's slot before/after re-routing, never two different
// carriers.
const DASH = '--' // LINX-13590 convention — empty optional values read '--'

// Tender Status renders as a Badge (Figma) — same palette RoutingGuideTab's
// STATUS_STYLES already uses for these four values, just through the shared
// Badge atom instead of an inline-styled span.
const STATUS_BADGE_VARIANT = { Accepted: 'green', Sent: 'blue', Declined: 'red', Cancelled: 'gray' }

// Cost inputs show a plain number ("2790.00"), never a "$" — the trailing
// "USD" FieldSelect already carries the currency, matching the
// MeasureField/QuoteModal convention (Base Rate/Markup) rather than
// fmtDollar's "$"-prefixed display string.
const amountStr = (n) => (n == null ? '' : n.toFixed(2))

const dash = (v) => (v === null || v === undefined || v === '' ? DASH : v)

function StatusBadge({ status }) {
  if (!status) return <span className="text-label-sm-regular">{DASH}</span>
  return <Badge variant={STATUS_BADGE_VARIANT[status] || 'gray'}>{status}</Badge>
}

// Route Rank / Rank — Badges per Figma; '--' covers the one case the AC
// documents (routeRank absent from the new tender list).
function RankBadge({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-label-sm-regular">{DASH}</span>
  }
  return <Badge variant="gray">{value}</Badge>
}

function ComparisonRow({ label, children }) {
  return (
    <div className="order-change-actions__row">
      <dt className="text-label-sm-regular">{label}</dt>
      <dd className="text-label-sm-medium">{children}</dd>
    </div>
  )
}

// One side of the Prior|New panel. Field order is the AC's own table order —
// note Delivery precedes Pickup, not the reverse.
function ComparisonColumn({ heading, carrier }) {
  return (
    <div className="order-change-actions__col">
      <h3 className="text-label-sm-semibold order-change-actions__col-heading">{heading}</h3>
      <dl className="order-change-actions__dl">
        <ComparisonRow label="SCAC">{dash(carrier.scac)}</ComparisonRow>
        <ComparisonRow label="Equipment">{dash(carrier.equipment)}</ComparisonRow>
        <ComparisonRow label="Tender Status"><StatusBadge status={carrier.tenderStatus} /></ComparisonRow>
        <ComparisonRow label="Route Rank"><RankBadge value={carrier.routeRank} /></ComparisonRow>
        <ComparisonRow label="Rank"><RankBadge value={carrier.rank} /></ComparisonRow>
        <ComparisonRow label="Delivery Date/Time">{dash(carrier.deliveryDateTime)}</ComparisonRow>
        <ComparisonRow label="Pickup Date/Time">{dash(carrier.pickupDateTime)}</ComparisonRow>
      </dl>
    </div>
  )
}

export default function OrderChangeActionsCard({ oc, onAction }) {
  const { prior, newOption } = oc

  // LINX-14513 — "automatically it selects the new cost" when re-routing
  // returned a new rated cost; when it didn't (`newOption.apCost == null`,
  // scenario `not-returned`), New Cost has nothing to select and Prior Cost
  // is the sensible default.
  const newCostDisabled = newOption.apCost == null
  const [choice, setChoice] = useState(() => (newCostDisabled ? 'prior' : 'new'))
  const [quoteAmount, setQuoteAmount] = useState(null)
  const [quoteOpen, setQuoteOpen] = useState(false)

  const amountFor = { prior: prior.apCost, new: newOption.apCost, quote: quoteAmount }
  const selectedAmount = amountFor[choice]

  // The quote being entered is for the PRIOR carrier (the card's one subject)
  // — its own row on the PRIOR tender list, matched by scac, is what
  // QuoteModal's "Carrier Option" section reads SCAC/Carrier Name/Equipment/
  // Pickup/Delivery from.
  const priorRoutingOption = oc.priorTenderList.find((o) => o.scac === prior.scac) || null

  const chooseQuote = () => {
    setChoice('quote')
    setQuoteOpen(true)
  }

  // QuoteModal's onSave payload (QuoteModal.jsx handleSave): { scac,
  // carrierName, equipment, pickupDateTime, deliveryDateTime, rateDetails:
  // { baseRate, currency, markup, additionalCharges, apTotal, arTotal } } —
  // apTotal is the AP figure this card cares about, same field RoutingGuideTab
  // reads into its own `cost` column.
  const handleQuoteSave = (formData) => {
    setQuoteAmount(formData.rateDetails.apTotal)
    setChoice('quote')
    setQuoteOpen(false)
  }

  const fire = (action) => onAction(action, { choice, amount: selectedAmount })

  return (
    <section className="order-change-actions">
      <h2 className="text-label-base-semibold order-change-actions__title">Actions to Keep Current Carrier</h2>

      <div className="order-change-actions__cost">
        <div className="text-label-sm-medium order-change-actions__cost-label">Select Cost</div>
        <div className="order-change-actions__cost-row">
          <div className="order-change-actions__cost-option">
            <div className="order-change-actions__radio-row">
              <Radio
                name="oc-cost-choice"
                value="prior"
                label="Prior Cost"
                checked={choice === 'prior'}
                onChange={() => setChoice('prior')}
              />
              {/* LINX-14514 — if the prior cost was itself a quote, selecting
                  it copies the whole quote across (backend concern, not this
                  card's) — the badge is this card's only trace of that rule. */}
              {prior.quoted && <Badge variant="blue">Quoted Cost</Badge>}
            </div>
            <FormField
              showLabel={false}
              aria-label="Prior Cost amount"
              value={amountStr(prior.apCost)}
              onChange={() => {}}
              readOnly
              disabled={choice !== 'prior'}
              trailingSelect={{ label: 'USD', locked: true }}
            />
          </div>

          <div className="order-change-actions__cost-option">
            <div className="order-change-actions__radio-row">
              <Radio
                name="oc-cost-choice"
                value="new"
                label="New Cost"
                checked={choice === 'new'}
                disabled={newCostDisabled}
                onChange={() => setChoice('new')}
              />
            </div>
            <FormField
              showLabel={false}
              aria-label="New Cost amount"
              value={amountStr(newOption.apCost)}
              onChange={() => {}}
              readOnly
              disabled={newCostDisabled || choice !== 'new'}
              trailingSelect={{ label: 'USD', locked: true }}
            />
          </div>

          <div className="order-change-actions__cost-option">
            <div className="order-change-actions__radio-row">
              <Radio
                name="oc-cost-choice"
                value="quote"
                label="New Quote"
                checked={choice === 'quote'}
                onChange={chooseQuote}
              />
            </div>
            <FormField
              showLabel={false}
              aria-label="New Quote amount"
              placeholder="Enter Quote"
              value={quoteAmount != null ? amountStr(quoteAmount) : ''}
              onChange={() => {}}
              readOnly
              disabled={choice !== 'quote'}
              trailingSelect={{ label: 'USD', locked: true }}
            />
          </div>
        </div>
      </div>

      <hr className="order-change-actions__hr" />

      <div className="order-change-actions__comparison">
        <ComparisonColumn heading="Prior" carrier={prior} />
        <ComparisonColumn heading="New" carrier={newOption} />
      </div>

      <hr className="order-change-actions__hr" />

      <div className="order-change-actions__footer">
        <span className="text-label-sm-medium">Select Tender Action *</span>
        <div className="order-change-actions__footer-actions">
          {/* Bypass — keep the carrier, no message, prior tender status
              retained (backend's job; this card only reports the choice). */}
          <Button variant="secondary" onClick={() => fire('bypass')} disabled={selectedAmount == null}>
            Bypass Tender
          </Button>
          {/* Re tender — keep the carrier, DO send a message; new status
              becomes Sent even if it was Accepted (backend's job too). */}
          <Button variant="primary" onClick={() => fire('retender')} disabled={selectedAmount == null}>
            Re tender
          </Button>
        </div>
      </div>

      {quoteOpen && priorRoutingOption && (
        <QuoteModal
          mode="add"
          carrierData={priorRoutingOption}
          onSave={handleQuoteSave}
          onClose={() => setQuoteOpen(false)}
        />
      )}
    </section>
  )
}

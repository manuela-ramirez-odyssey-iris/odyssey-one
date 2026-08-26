import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ModalMedium, TitleSubtitle } from '@odyssey/ui'
import Countdown, { useCountdown } from './Countdown'
import { fmtDollar } from '../utils/money'
import './liveBids.css'

const DASH = '--'

/**
 * Section — the Shipment Details modal's own body anatomy, replicated
 * (user, 2026-08-24: "mimic how the information is shown in shipment
 * details"): a `text-label-base-semibold` section title over a 4-column grid
 * of `TitleSubtitle` fields. Every value in this dialog goes through it —
 * including the tolerance read — so nothing carries a bespoke type ramp or
 * its own layout.
 *
 * Class names are this component's own rather than borrowed `shp-details__*`
 * ones: identical structure and tokens, no cross-surface BEM coupling (the
 * precedent is CarrierBid dropping QuoteModal's `.quote-charges*` names).
 */
function Section({ title, children }) {
  return (
    <section className="award-modal__section">
      <h3 className="text-label-base-semibold award-modal__section-title">{title}</h3>
      <div className="award-modal__section-grid">{children}</div>
    </section>
  )
}

// Header trail: the label flips with the clock (user, 2026-08-24) — "Bid
// Live" while the window is open, "Bid Closed" the moment it reaches 00:00.
// ponytail: its own useCountdown rather than plumbing state out of
// <Countdown> — a second 1s interval inside one modal is cheaper than a
// callback contract, and both read the same `closeAt`.
function HeaderCountdown({ quote }) {
  const remaining = useCountdown(quote.closeAt)
  return (
    <span className="award-modal__header-countdown">
      <span className="text-label-sm-medium">{remaining > 0 ? 'Bid Live' : 'Bid Closed'}</span>
      <Countdown closeAt={quote.closeAt} openAt={quote.openAt} zeroWhenExpired />
    </span>
  )
}

/**
 * AwardModal — the confirmation step behind Live Bids' "Stage" action.
 * Two VIEWS of ONE dialog, not two dialogs: the sibling-navigation pattern
 * ShipmentDetailsModal uses for Edit Quote (`key={view}` + `modal-nav-view`
 * slide + `onBack`).
 *
 *  • `confirm`    — who is being awarded and at what cost. Confirm is
 *                   DISABLED until the quote is closed and a carrier is
 *                   picked (SPB-63: close gates execution).
 *  • `forceClose` — reached from the confirm view. The quote's own state and
 *                   the tolerance verdict, over the actions that act on them.
 *
 * Closing the bid is what makes Confirm reachable, so force-closing returns
 * to `confirm` rather than dismissing — the planner lands back on the step
 * they were blocked at, now unblocked.
 */
export default function AwardModal({
  quote, carrier, cost, clientCost, tolerance, toleranceBanner, closed: closedProp,
  onForceClose, onModify, onClear, onConfirm, onClose,
}) {
  const [view, setView] = useState('confirm')
  const [nav, setNav] = useState(null)
  const navClass = nav ? `modal-nav-view${nav.dir === 'back' ? ' modal-nav-view--back' : ''}` : ''
  const enterForceClose = () => { setNav({ dir: 'forward' }); setView('forceClose') }
  const exitForceClose = () => { setNav({ dir: 'back' }); setView('confirm') }

  // `closed` comes from the caller because expiry closes a quote before the
  // store write lands (LiveBids fires closeQuote off the countdown) — reading
  // `quote.status` alone would show a live bid as still open for one render.
  const closed = closedProp ?? quote.status === 'closed'
  const canConfirm = closed && !!carrier

  const handleForceClose = () => {
    onForceClose?.()
    exitForceClose()
  }

  const invited = quote.carriers.filter((c) => c.incl).length
  const received = quote.carriers.filter((c) => c.bid?.status === 'bid').length

  return createPortal(
    <ModalMedium
      key={view}
      className={navClass}
      title={view === 'forceClose' ? 'Close Bidding' : 'Award and Tender'}
      onClose={onClose}
      onBack={view === 'forceClose' ? exitForceClose : undefined}
      /* The live countdown rides the HEADER, beside the X (user,
         2026-08-24) — one placement for both views, and it stays put while
         the body scrolls. */
      headerTrail={<HeaderCountdown quote={quote} />}
      /* Both views share one footer shape: Cancel on the LEAD edge, every
         action grouped on the TRAIL edge. No Back button in either —
         ModalMedium's header already carries that affordance. Shape follows
         the house convention (QuoteModalFooter, CarrierBid's confirm
         dialog): a FRAGMENT whose children are direct children of
         `.modal-medium__footer`, itself a flex row with space-between — so
         the lead/trail split is the component's own. */
      footer={view === 'forceClose' ? (
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <div className="award-modal__footer-trail">
            <Button variant="secondary" size="lg" onClick={onModify}>Modify &amp; Resend</Button>
            <Button variant="secondary" size="lg" onClick={onClear}>Clear &amp; Start Over</Button>
            <Button variant="primary" size="lg" disabled={closed} onClick={handleForceClose}>
              {closed ? 'Bidding Closed' : 'Force Close Bidding'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <div className="award-modal__footer-trail">
            {/* Force Close sits beside the award action — the two things a
                planner does from this dialog. It NAVIGATES to the sibling
                view rather than closing outright: closing is irreversible,
                so it gets its own screen with the tolerance read on it. */}
            <Button variant="secondary" size="lg" onClick={enterForceClose}>Force Close</Button>
            <Button variant="primary" size="lg" disabled={!canConfirm} onClick={onConfirm}>
              Award and Tender
            </Button>
          </div>
        </>
      )}
    >
      {view === 'forceClose' ? (
        <div className="award-modal">
          <Section title="Quote">
            <TitleSubtitle subtitle="Quote ID" title={quote.quoteId} />
            <TitleSubtitle subtitle="Carrier List" title={quote.listName ?? DASH} />
            <TitleSubtitle subtitle="Invited Carriers" title={String(invited)} />
            <TitleSubtitle subtitle="Bids Received" title={String(received)} />
          </Section>

          {/* The tolerance read is WHY this view exists: closing early is a
              judgement about whether the bids on the table are good enough,
              so the verdict sits over the actions that act on it. This is the
              ONLY place it renders now (2026-08-24) — the Live Bids tab no
              longer carries the card — so it must be complete: the same eight
              fields, plus the verdict banner underneath. Fields rather than
              the bordered card, so it reads at the same altitude as every
              other field in this dialog. */}
          {tolerance && (
            <Section title="Tolerance Evaluation">
              {tolerance}
              {toleranceBanner && (
                <div className="award-modal__field--full">{toleranceBanner}</div>
              )}
            </Section>
          )}

          <Section title="Before You Close">
            <TitleSubtitle
              className="award-modal__field--full"
              subtitle="Irreversible"
              title="Closing ends bidding for every invited carrier. A closed quote cannot be reopened — re-quoting creates a new quote."
            />
          </Section>
        </div>
      ) : (
        <div className="award-modal">
          <Section title="Award">
            <TitleSubtitle subtitle="Award To" title={carrier ? `${carrier.scac} · ${carrier.name}` : DASH} />
            <TitleSubtitle subtitle="Cost" title={carrier ? fmtDollar(cost) : DASH} />
            <TitleSubtitle subtitle="Client Cost" title={carrier ? fmtDollar(clientCost) : DASH} />
            <TitleSubtitle subtitle="Bidding" title={closed ? 'Closed' : 'Open'} />
          </Section>

          <Section title="What Happens Next">
            <TitleSubtitle
              className="award-modal__field--full"
              subtitle={closed ? 'Award and tender' : 'Bidding still open'}
              title={closed
                ? 'Award moves the carrier into the shipment tendering flow — it does not assign the load until tendered.'
                : 'A bid can only be awarded once the quote closes. Use Force Close to end bidding now.'}
            />
          </Section>
        </div>
      )}
    </ModalMedium>,
    document.body,
  )
}

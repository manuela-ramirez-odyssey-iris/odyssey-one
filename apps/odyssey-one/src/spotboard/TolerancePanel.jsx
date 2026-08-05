import { Alert } from '@odyssey/ui'
import { evaluateTolerance } from './tolerance'
import { fmtDollar } from '../utils/money'
import './spotboard.css'

const REASON_TEXT = {
  'out-of-tolerance': 'Out of tolerance — exceeds the ceiling.',
  'total-cap': 'Exceeds the total cap.',
  'manual-review': 'Flagged for manual review.',
}

// Kept identical to the Alert copy on purpose — the Result row is a
// scannable field-list echo of the same verdict, not a separate wording.
const WITHIN_TOLERANCE_TEXT = 'Within tolerance — eligible for auto-award'

function Field({ label, value }) {
  return (
    <div className="tolerance-panel__field">
      <div className="tolerance-panel__field-label">{label}</div>
      <div className="tolerance-panel__field-value">{value}</div>
    </div>
  )
}

export default function TolerancePanel({ benchmark, tolerancePct, lowestBid, manualReview, monetaryCap, totalCap }) {
  const { ceiling, withinTolerance, reason } = evaluateTolerance({
    benchmark, tolerancePct, lowestBid, manualReview, monetaryCap, totalCap,
  })
  const verdictText = withinTolerance ? WITHIN_TOLERANCE_TEXT : (REASON_TEXT[reason] || reason)

  return (
    <div className="tolerance-panel">
      <h3 className="text-label-base-semibold tolerance-panel__heading">Tolerance Evaluation</h3>
      <div className="tolerance-panel__fields">
        <Field label="Highest routed cost (benchmark)" value={fmtDollar(benchmark)} />
        <Field label="Tolerance (% above)" value={`${tolerancePct}%`} />
        <Field label="Tolerance ceiling" value={fmtDollar(ceiling)} />
        <Field label="Lowest bid" value={fmtDollar(lowestBid)} />
        <Field label="Result" value={verdictText} />
        {/* OFF renders as a plain "OFF" — the ON copy is the load-bearing
            string (canon: manual review routes to a planner); OFF has no
            equivalent routing behavior to name, so it stays terse. */}
        <Field label="Manual-review flag" value={manualReview ? 'ON → routed to planner' : 'OFF'} />
      </div>
      {withinTolerance ? (
        <Alert variant="success" showClose={false}>{WITHIN_TOLERANCE_TEXT}</Alert>
      ) : (
        <Alert variant="warning" showClose={false}>{REASON_TEXT[reason] || reason}</Alert>
      )}
    </div>
  )
}

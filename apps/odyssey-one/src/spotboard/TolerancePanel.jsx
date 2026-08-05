import { Alert } from '@odyssey/ui'
import { evaluateTolerance } from './tolerance'
import { fmtDollar } from '../utils/money'
import './spotboard.css'

const REASON_TEXT = {
  'out-of-tolerance': 'Out of tolerance — exceeds the ceiling.',
  'total-cap': 'Exceeds the total cap.',
  'manual-review': 'Flagged for manual review.',
}

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

  return (
    <div className="tolerance-panel">
      <div className="tolerance-panel__fields">
        <Field label="Highest routed cost (benchmark)" value={fmtDollar(benchmark)} />
        <Field label="Tolerance %" value={`${tolerancePct}%`} />
        <Field label="Ceiling" value={fmtDollar(ceiling)} />
        <Field label="Lowest bid" value={fmtDollar(lowestBid)} />
      </div>
      {withinTolerance ? (
        <Alert variant="success" showClose={false}>Within tolerance — eligible for auto-award</Alert>
      ) : (
        <Alert variant="warning" showClose={false}>{REASON_TEXT[reason] || reason}</Alert>
      )}
    </div>
  )
}

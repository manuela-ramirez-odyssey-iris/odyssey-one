import { Badge, SummaryStrip } from '@odyssey/ui'
import './consolidation-summary.css'

// The old Review page's summary top block (S11), heading dropped (user 2026-09-30): the
// backgroundless Customer Name / Selected Shipments info strip. The metrics
// strip beneath it is EditStopsView's own (it owns the live totals and edit
// mode). Chips are gray: purple is reserved for an external change (2026-09-30).
export default function ConsolidationSummary({ customerName, customerId, rows }) {
  return (
    <div className="consolidation-summary">
      <SummaryStrip
        className="consolidation-summary__info-strip"
        background={false}
        aria-label="Consolidation summary"
        items={[
          { label: 'Customer Name', value: customerName || customerId || '--' },
          {
            label: `Selected Shipments (${rows.length})`,
            value: (
              <div className="consolidation-summary__chips">
                {rows.map((r) => <Badge key={r.id} variant="gray">{r.odysseyShipmentIdentifier || r.buyShipment || r.sellShipment}</Badge>)}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

import { Badge, SummaryStrip } from '@odyssey/ui'
import './consolidation-summary.css'

// The old Review page's summary top block (S11), heading dropped (user 2026-09-30): the
// backgroundless Customer Name / Selected Shipments info strip. The metrics
// strip beneath it is EditStopsView's own (it owns the live totals and edit
// mode). The shipment ID chips are PURPLE as on the old page - the
// user's one exception (2026-09-30) to "no purple in a consolidation" (purple is
// otherwise reserved for an external change).
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
                {rows.map((r) => <Badge key={r.id} variant="purple">{r.odysseyShipmentIdentifier || r.buyShipment || r.sellShipment}</Badge>)}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

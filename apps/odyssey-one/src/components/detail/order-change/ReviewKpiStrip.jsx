import { Badge, SummaryStrip } from '@odyssey/ui'
import { TriangleAlert } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { DiffValue } from '../../shipments/order-change/comparisonHelpers.jsx'

// KPI strip (SummaryStrip staging, S79e — Figma `Overview` 4178:8365).
// Extracted from StopsTab (S143 Task 2b) so the standalone Edit Shipment
// Stops route (OrderChangeEditStopsRoute) can render the SAME review-mode
// strip above the editor — StopsTab keeps rendering it unchanged via this
// import, no markup/behavior change there.
//
// S164 F2 (revised, user 2026-09-29): the Edit Stops editor renders it with the
// optional `live` / `priorCollapsed` props: exactly Distance, Gross Weight, Volume,
// Prior Cost, New Direct Cost (the rest lives in the All Stops header; no label
// in both). Without
// them (StopsTab) the output is today's 6 cells.
//
// S5.2 (CNS-19): `showPrior={false}` (a new C, nothing to compare) keeps only
// Distance, Gross Weight, Volume as live values — no pair, no changed icon.
export default function ReviewKpiStrip({ summary, changes, live, priorCollapsed, showPrior = true }) {
  // LINX-15435: "Distance, Gross Weight, and Volume shall display Prior and
  // New values when changed. If a value has not changed, only the current
  // value shall be displayed."
  const cell = (key, label, value) => {
    const c = changes?.[key]
    if (!c) return { label, value }
    return {
      label,
      value: (
        <span className="stops-kpi__pair">
          <span className="stops-kpi__pair-row"><Badge variant="gray">Prior</Badge>{c.prior}</span>
          <span className="stops-kpi__pair-row"><Badge variant="purple">New</Badge>{c.new}</span>
        </span>
      ),
    }
  }
  if (live && !showPrior) {
    const plain = (label, value) => ({ label, value })
    const items = [plain('Distance', live.distance), plain('Gross Weight', live.grossWeight), plain('Volume', live.volume)]
    return <SummaryStrip sticky className="stops-kpi-strip" items={items} aria-label="Shipment KPIs" />
  }
  if (live) {
    // Live current value; a changed one keeps the DiffValue signal (as the
    // All Stops row had it). Expanded Prior: today's Prior/New pair when the
    // consolidation changed it, its New half live.
    const liveCell = (key, label) => {
      const shown = <DiffValue value={live[key]} changed={live.changed?.[key]} leftIcon={<TriangleAlert {...ICON_MD} aria-hidden="true" />} />
      const c = changes?.[key]
      if (priorCollapsed || !c) return { label, value: shown }
      return {
        label,
        value: (
          <span className="stops-kpi__pair">
            <span className="stops-kpi__pair-row"><Badge variant="gray">Prior</Badge>{c.prior}</span>
            <span className="stops-kpi__pair-row"><Badge variant="purple">New</Badge>{shown}</span>
          </span>
        ),
      }
    }
    // StopsTab's order, so the .stops-kpi-strip first-cell width lands on Distance.
    const liveItems = [
      liveCell('distance', 'Distance'),
      liveCell('grossWeight', 'Gross Weight'),
      liveCell('volume', 'Volume'),
      // Same in both states: no pair, no changed signal.
      { label: 'Prior Cost', value: live.priorCost },
      { label: 'New Direct Cost', value: live.newDirectCost },
    ]
    return <SummaryStrip sticky className="stops-kpi-strip" items={liveItems} aria-label="Shipment KPIs" />
  }
  const items = [
    cell('distance', 'Distance', summary.distance),
    cell('grossWeight', 'Gross Weight', summary.grossWeight),
    cell('volume', 'Volume', summary.volume),
    { label: 'Accepted Carrier', value: summary.acceptedCarrier },
    { label: 'Seed Equipment', value: summary.seedEquipment },
    { label: 'Utilization', value: summary.utilization },
  ]
  return <SummaryStrip sticky className="stops-kpi-strip" items={items} aria-label="Shipment KPIs" />
}

import { Badge, SummaryStrip } from '@odyssey/ui'

// KPI strip (SummaryStrip staging, S79e — Figma `Overview` 4178:8365).
// Extracted from StopsTab (S143 Task 2b) so the standalone Edit Shipment
// Stops route (OrderChangeEditStopsRoute) can render the SAME review-mode
// strip above the editor — StopsTab keeps rendering it unchanged via this
// import, no markup/behavior change there.
export default function ReviewKpiStrip({ summary, changes }) {
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
  const items = [
    cell('distance', 'Distance', summary.distance),
    cell('grossWeight', 'Gross Weight', summary.grossWeight),
    cell('volume', 'Volume', summary.volume),
    { label: 'Accepted Carrier', value: summary.acceptedCarrier },
    { label: 'Seed Equipment', value: summary.seedEquipment },
    { label: 'Utilization', value: summary.utilization },
  ]
  return <SummaryStrip items={items} aria-label="Shipment KPIs" />
}

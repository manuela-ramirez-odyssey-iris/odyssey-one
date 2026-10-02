// LINX-17756 — tender events only, newest first, in Shipment History's anatomy
// (Pappu 2026-09-30: "VD will be similar to the Shipment history").
import { SubAccordion } from '@odyssey/ui'
import PaneEmpty from './PaneEmpty'
import { HistoryEntries, isTenderEvent } from './HistoryTab'

export default function TenderHistoryTab({ data }) {
  const entries = (data?.entries ?? []).filter(isTenderEvent)
  if (!entries.length) {
    return (
      <PaneEmpty
        message="No tender history is available"
        hint="Tender history will appear here once tender-related events are recorded for this shipment."
      />
    )
  }
  return (
    <div className="pane-canvas">
      <div className="pane-col pane-col--narrow">
        <SubAccordion title="Tender History" collapsible={false}>
          <HistoryEntries entries={entries} />
        </SubAccordion>
      </div>
    </div>
  )
}

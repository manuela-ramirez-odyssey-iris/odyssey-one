// /tender-emails — a REFERENCE GALLERY of the tender notification email
// (TE-1 Email, TE-2 Email & EDI, TE-4 cancellation; TE-3 acceptance hidden per Papu 2026-10-01), sibling of
// /spot-emails (S156).
import { useQueries } from '@tanstack/react-query'
import EmailGallery from '../spot-emails/EmailGallery.jsx'
import { shipmentDetailQueryKey } from '../../api/queries/useShipmentDetail'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { SCENARIOS, LIVE_TENDERS, emailsForScenario, defaultEmailIdFor } from './fixture.js'

const KIND_TONE = { 'TE-1': 'info', 'TE-2': 'amber', 'TE-3': 'green', 'TE-4': 'red' }
const LIVE_KEYS = Object.keys(LIVE_TENDERS)

export default function TenderEmailsRoute() {
  const results = useQueries({
    queries: LIVE_KEYS.map((k) => ({
      queryKey: shipmentDetailQueryKey(LIVE_TENDERS[k].sellShipment),
      queryFn: () => getSellShipmentDetail(LIVE_TENDERS[k].sellShipment),
    })),
  })
  const live = Object.fromEntries(LIVE_KEYS.map((k, i) => [k, results[i].data]))

  return (
    <EmailGallery
      title="Tender notification email"
      lede="A reference for the tender email a carrier gets on Tender / Re-Tender — Email and Email & EDI copy, plus a
          consolidation subject variant. The Review button opens that shipment's real carrier review page."
      scenarios={SCENARIOS}
      emailsForScenario={(key) => emailsForScenario(key, live)}
      defaultEmailIdFor={defaultEmailIdFor}
      kindTone={KIND_TONE}
    />
  )
}

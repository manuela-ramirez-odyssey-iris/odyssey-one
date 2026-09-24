// /tender-emails — a REFERENCE GALLERY of the tender notification email
// (TE-1 Email, TE-2 Email & EDI, TE-3 acceptance confirmation), sibling of
// /spot-emails (S156).
import EmailGallery from '../spot-emails/EmailGallery.jsx'
import { SCENARIOS, emailsForScenario, defaultEmailIdFor } from './fixture.js'

const KIND_TONE = { 'TE-1': 'info', 'TE-2': 'amber', 'TE-3': 'green' }

export default function TenderEmailsRoute() {
  return (
    <EmailGallery
      title="Tender notification email"
      lede="A reference for the tender email a carrier gets on Tender / Re-Tender — Email and Email & EDI copy, plus a
          consolidation subject variant. Rendered exactly as an inbox would show it, from seeded sample data."
      scenarios={SCENARIOS}
      emailsForScenario={emailsForScenario}
      defaultEmailIdFor={defaultEmailIdFor}
      kindTone={KIND_TONE}
    />
  )
}

// /spot-emails — a REFERENCE GALLERY of the eight overflow emails, kept
// deliberately outside the SpotBid tab (user, 2026-09-02) so nobody reads it
// as a screen to build. Thin wrapper over EmailGallery + the spot fixture
// (S156 extraction — /tender-emails is the sibling wrapper).
import EmailGallery from './EmailGallery.jsx'
import { SCENARIOS, emailsForScenario, defaultEmailIdFor } from './fixture.js'

// Badge has no success/error/warning variants — map to the closest real ones.
const KIND_TONE = { 'CE-1': 'info', 'CE-2': 'green', 'IE-1': 'red', 'IE-4': 'red' }

export default function SpotEmailsRoute() {
  return (
    <EmailGallery
      title="Overflow email set"
      lede="A reference for the eight messages overflow bidding sends: two to carriers, six to the planning group.
          Rendered exactly as an inbox would show them, from seeded sample data. Not a screen in OdysseyONE."
      scenarios={SCENARIOS}
      emailsForScenario={emailsForScenario}
      defaultEmailIdFor={defaultEmailIdFor}
      kindTone={KIND_TONE}
    />
  )
}

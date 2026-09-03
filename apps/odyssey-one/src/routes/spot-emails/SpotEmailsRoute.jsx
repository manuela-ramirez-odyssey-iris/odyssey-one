// /spot-emails — a REFERENCE GALLERY of the eight overflow emails, kept
// deliberately outside the SpotBid tab (user, 2026-09-02) so nobody reads it
// as a screen to build. Scenario on the left, the emails that scenario
// produces beside it, and the selected one rendered in a SANDBOXED iframe:
// the app's stylesheet cannot reach inside, so what is shown is the exact
// document that would be sent.
import { useState } from 'react'
import { Badge, Button } from '@odyssey/ui'
import { SCENARIOS, scenarioFor, emailsForScenario, defaultEmailIdFor } from './fixture.js'
import './spotEmails.css'

// Badge has no success/error/warning variants — map to the closest real ones.
const KIND_TONE = { 'CE-1': 'info', 'CE-2': 'green', 'IE-1': 'red', 'IE-4': 'red' }

export default function SpotEmailsRoute() {
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key)
  const [mode, setMode] = useState('html')
  const scenario = scenarioFor(scenarioKey)
  const emails = emailsForScenario(scenarioKey)
  const [selectedId, setSelectedId] = useState(null)
  const defaultId = defaultEmailIdFor(scenarioKey, emails)
  const selected = emails.find((e) => e.id === selectedId) ?? emails.find((e) => e.id === defaultId)

  const pickScenario = (key) => { setScenarioKey(key); setSelectedId(null) }

  return (
    <div className="spot-emails">
      <header className="spot-emails__header">
        <h1 className="spot-emails__title">Overflow email set</h1>
        <p className="spot-emails__lede">
          A reference for the eight messages overflow bidding sends: two to carriers, six to the planning group.
          Rendered exactly as an inbox would show them, from seeded sample data. Not a screen in OdysseyONE.
        </p>
      </header>

      <div className="spot-emails__body">
        <nav className="spot-emails__scenarios" aria-labelledby="spot-emails-scenarios-title">
          <h2 id="spot-emails-scenarios-title" className="spot-emails__scenarios-title">Scenarios</h2>
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`spot-emails__scenario${s.key === scenarioKey ? ' spot-emails__scenario--current' : ''}`}
              onClick={() => pickScenario(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="spot-emails__main">
          <p className="spot-emails__note">{scenario.note}</p>

          <ul className="spot-emails__list" aria-label="Emails in this scenario">
            {emails.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`spot-emails__row${e.id === selected?.id ? ' spot-emails__row--current' : ''}`}
                  onClick={() => setSelectedId(e.id)}
                >
                  <Badge variant={KIND_TONE[e.kind] ?? 'amber'}>{e.kind}</Badge>
                  <span className="spot-emails__recipient">{e.recipientLabel}</span>
                  <span className="spot-emails__subject">{e.subject}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <section className="spot-emails__pane" aria-label="Selected email">
              <dl className="spot-emails__envelope">
                <dt>From</dt><dd>{selected.from}</dd>
                <dt>To</dt><dd>{selected.to}</dd>
                <dt>Subject</dt><dd>{selected.subject}</dd>
              </dl>
              <div className="spot-emails__toolbar" role="group" aria-label="Preview mode">
                <Button size="sm" variant={mode === 'html' ? 'primary' : 'secondary'} onClick={() => setMode('html')}>HTML</Button>
                <Button size="sm" variant={mode === 'text' ? 'primary' : 'secondary'} onClick={() => setMode('text')}>Text</Button>
              </div>
              {mode === 'html' ? (
                <iframe className="spot-emails__frame" title="Email preview" sandbox="" srcDoc={selected.html} />
              ) : (
                <pre className="spot-emails__text">{selected.text}</pre>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

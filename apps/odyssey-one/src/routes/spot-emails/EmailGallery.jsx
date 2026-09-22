// A REFERENCE GALLERY shell for any email set: scenario on the left, the
// emails that scenario produces beside it, selected one rendered in a
// SANDBOXED iframe (the app's stylesheet cannot reach inside, so what is
// shown is the exact document that would be sent). Extracted from
// SpotEmailsRoute so /tender-emails (S156) can reuse it without duplicating
// the iframe-measuring/scenario-switch plumbing — SpotEmailsRoute is now a
// thin wrapper passing the spot fixture; its rendering/tests are unchanged.
import { useState, useRef, useEffect } from 'react'
import { Badge, Button } from '@odyssey/ui'
import './spotEmails.css'

// Fallback for when the frame's document can't be measured (e.g. jsdom, or a
// browser that refuses the read despite allow-same-origin).
const FALLBACK_FRAME_HEIGHT = 760
const FRAME_HEIGHT_ALLOWANCE = 24

export default function EmailGallery({ title, lede, scenarios, emailsForScenario, defaultEmailIdFor, kindTone }) {
  const [scenarioKey, setScenarioKey] = useState(scenarios[0].key)
  const [mode, setMode] = useState('html')
  const scenario = scenarios.find((s) => s.key === scenarioKey) ?? scenarios[0]
  const emails = emailsForScenario(scenarioKey)
  const [selectedId, setSelectedId] = useState(null)
  const defaultId = defaultEmailIdFor(scenarioKey, emails)
  const selected = emails.find((e) => e.id === selectedId) ?? emails.find((e) => e.id === defaultId)
  const frameRef = useRef(null)
  const [frameHeight, setFrameHeight] = useState(FALLBACK_FRAME_HEIGHT)

  const measureFrame = () => {
    try {
      const doc = frameRef.current?.contentDocument
      const height = doc?.documentElement?.scrollHeight
      setFrameHeight(height ? height + FRAME_HEIGHT_ALLOWANCE : FALLBACK_FRAME_HEIGHT)
    } catch {
      setFrameHeight(FALLBACK_FRAME_HEIGHT)
    }
  }

  // Re-measure whenever the selected email changes (srcDoc swap re-fires load).
  useEffect(() => {
    setFrameHeight(FALLBACK_FRAME_HEIGHT)
  }, [selected?.id])

  const pickScenario = (key) => { setScenarioKey(key); setSelectedId(null) }

  return (
    <div className="spot-emails">
      <header className="spot-emails__header">
        <h1 className="spot-emails__title">{title}</h1>
        <p className="spot-emails__lede">{lede}</p>
      </header>

      <div className="spot-emails__body">
        <nav className="spot-emails__scenarios" aria-labelledby="spot-emails-scenarios-title">
          <h2 id="spot-emails-scenarios-title" className="spot-emails__scenarios-title">Scenarios</h2>
          {scenarios.map((s) => (
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
                  <Badge variant={kindTone[e.kind] ?? 'amber'}>{e.kind}</Badge>
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
                <iframe
                  ref={frameRef}
                  className="spot-emails__frame"
                  title="Email preview"
                  sandbox="allow-same-origin"
                  srcDoc={selected.html}
                  style={{ height: frameHeight }}
                  onLoad={measureFrame}
                />
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

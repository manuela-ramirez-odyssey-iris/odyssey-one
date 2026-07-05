import { useState } from 'react'
import { Accordion, Button, FormField, Checkbox } from '@odyssey/ui'

export const meta = {
  name: 'Accordion',
  tier: 'molecule',
  version: '0.2.0',
  createdVersion: '0.2.0',
  figmaNode: '2850:612',
  codeConnect: 'packages/ui/src/Accordion.figma.tsx',
}

export const props = [
  { name: 'position', type: 'start|mid|end', desc: 'Slot in the stepper stack — drives the connector lines and whether the expanded card shows the bottom line stub (end gets bottom padding instead). Default start.' },
  { name: 'status', type: 'off|on', desc: 'Validation state, consumer-driven: flip to on when the section is correctly filled. Default off.' },
  { name: 'title', type: 'string', desc: 'Header title (heading/lg semibold).' },
  { name: 'description', type: 'string', desc: 'Supporting text under the title (label/sm regular). Optional.' },
  { name: 'expanded', type: 'boolean', desc: 'Controlled expansion. Omit for uncontrolled.' },
  { name: 'defaultExpanded', type: 'boolean', desc: 'Uncontrolled initial state. Default false.' },
  { name: 'onToggle', type: '(next: boolean) => void', desc: 'Fires on header click with the next expansion state.' },
  { name: 'children', type: 'node', desc: 'Content slot — revealed below the header when expanded (Figma Content SLOT).' },
]

export const tokens = [
  { token: '--bg-primary', resolves: 'White', usage: 'card surface' },
  { token: '--border-subtle', resolves: 'Deep Sea Neutral/200', usage: 'card border (card-surface convention)' },
  { token: '--radius-2xl', resolves: '16px', usage: 'card corners' },
  { token: '--spacing-6', resolves: '24px', usage: 'card horizontal padding' },
  { token: '--spacing-3', resolves: '12px', usage: 'header gap' },
  { token: '--spacing-8', resolves: '32px', usage: 'content gap above/below' },
  { token: '--transition-reveal', resolves: '300ms ease-out-quart', usage: 'reveal + chevron animation; the travel-line is glued to the card bottom edge so it rides the reveal geometrically (no opacity handoff)' },
  { token: '--text-primary / --text-tertiary', resolves: 'DSN/900 · DSN/500', usage: 'title · description + chevron' },
]

const SECTIONS = [
  { title: 'Shipment Details', description: 'Origin, destination and schedule for this shipment.' },
  { title: 'Products', description: 'Add the products this shipment carries.' },
  { title: 'Documents', description: 'Attach the BoL and supporting documents.' },
]

// Each section validates when its (demo) required field is filled — showing the
// consumer-driven pattern: the form decides validity, the Accordion reflects it.
function ValidatedSection({ index, count, title, description }) {
  const [expanded, setExpanded] = useState(index === 0)
  const [value, setValue] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const isValid = value.trim() !== '' && confirmed

  const position = index === 0 ? 'start' : index === count - 1 ? 'end' : 'mid'

  return (
    <Accordion
      position={position}
      status={isValid ? 'on' : 'off'}
      title={title}
      description={description}
      expanded={expanded}
      onToggle={setExpanded}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', maxWidth: 420 }}>
        <FormField
          label="Required field"
          placeholder="Type anything to fill this section"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Checkbox
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          label="I confirm this information is correct"
        />
        <div>
          <Button variant="secondary" size="sm" onClick={() => setExpanded(false)}>
            Collapse section
          </Button>
        </div>
      </div>
    </Accordion>
  )
}

export default function AccordionDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Expandable form-section card with a stepper/validation indicator. The
        stepper line is &ldquo;cut&rdquo; by the expansion — the content interrupts it and a
        stub re-anchors it at the card&rsquo;s bottom (start/mid; end pads instead).
        Fill a section&rsquo;s field + confirm to see validation flip the indicator green.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Interactive stack — animated expand/collapse + consumer-driven validation</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {SECTIONS.map((s, i) => (
            <ValidatedSection key={s.title} index={i} count={SECTIONS.length} {...s} />
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Static states</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Accordion position="start" status="off" title="Collapsed / pending" description="Default resting state." />
          <Accordion position="mid" status="on" title="Collapsed / validated" description="Indicator reflects a correctly filled section." />
          <Accordion position="end" status="off" title="End position" description="No continuing line below — expanded shows bottom padding instead of the stub." defaultExpanded>
            <div className="text-label-sm-regular" style={{ color: 'var(--text-tertiary)' }}>
              Arbitrary slot content.
            </div>
          </Accordion>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Accordion, Button, FormField, Checkbox } from '@odyssey/ui'

export const meta = {
  name: 'Accordion',
  tier: 'molecule',
  version: '0.8.0',
  createdVersion: '0.2.0',
  normalizing: true,
  figmaNode: '2850:612',
  codeConnect: 'packages/ui/src/Accordion.figma.tsx',
  approved: true,
  ported: true,
}

export const props = [
  { name: 'position', type: 'start|mid|end', desc: 'Slot in the stepper stack — drives the connector lines and whether the expanded card shows the bottom line stub (end gets bottom padding instead). Default start.' },
  { name: 'status', type: 'off|on|error', desc: 'Validation state, consumer-driven: on when the section is correctly filled, error when at least one field inside has an error. Default off.' },
  { name: 'errorCount', type: 'number', desc: 'Error total for the section — with status="error" renders the red "N Errors" Badge; with status="on" renders the green "Completed · N Errors validated" Badge (all errors solved — Figma "Show validated badge" BOOLEAN). 0/omitted = no badge. Default 0.' },
  { name: 'title', type: 'string', desc: 'Header title (heading/lg semibold).' },
  { name: 'description', type: 'string', desc: 'Supporting text under the title (label/sm regular). Optional — omit it and the header hugs to a single line (Figma master: "Show supporting text" BOOLEAN).' },
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

// ── Schematic ───────────────────────────────────────────────────────────────
// Slot-marker pink — a DSM annotation device (NOT a product design token; there is no pink
// in the palette). Kept local so it never reads as a real token. (RightPanel convention.)
const SLOT_BORDER = '#e85aad'
const SLOT_BG = 'rgba(232, 90, 173, 0.07)'
const SLOT_TEXT = '#b03b81'

function SlotPlaceholder() {
  return (
    <div style={{ minHeight: 72, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-4)', border: `2px dashed ${SLOT_BORDER}`, borderRadius: 'var(--radius-md)', background: SLOT_BG, color: SLOT_TEXT, fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
      Slot (children)
      <span style={{ fontWeight: 'var(--font-weight-regular)' }}>section body renders here (e.g. a form step)</span>
    </div>
  )
}

function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      {/* A 3-card stepper stack so the connector lines are visible. The middle
          card is expanded to show the content slot cutting the line. */}
      <div style={{ flex: '1 1 420px', minWidth: 340, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <Accordion position="start" status="on" errorCount={3} title="Shipment Details" description="Origin, destination and schedule." />
        <Accordion position="mid" status="off" title="Products" description="Add the products this shipment carries." defaultExpanded>
          <SlotPlaceholder />
        </Accordion>
        <Accordion position="end" status="error" errorCount={3} title="Documents" description="Attach the BoL and supporting documents." />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="card" tier="molecule">White shell: <code>--bg-primary</code>, <code>--radius-2xl</code>, <code>--border-subtle</code>, 24px horizontal padding — one stepper step.</LegendRow>
        <LegendRow part="status indicator" tier="atom" nested><code>StepIndicator</code> circle on the left, driven by <code>status</code> (<code>off</code> pending → <code>on</code> validated/green → <code>error</code> red/octagon-x). Consumer-driven; the Accordion only reflects it.</LegendRow>
        <LegendRow part="error badge" tier="atom" nested>Red <code>Badge</code> (octagon-x + &ldquo;N Errors&rdquo;) next to the title when <code>status=&quot;error&quot;</code> and <code>errorCount &gt; 0</code> — how many fields inside the section need attention. With <code>status=&quot;on&quot;</code> the same <code>errorCount</code> flips it to the green &ldquo;Completed · N Errors validated&rdquo; Badge (all errors solved).</LegendRow>
        <LegendRow part="connector lines" nested>Vertical <code>travel-line</code> between steps, driven by <code>position</code>: <code>start</code>/<code>mid</code> continue the line down; <code>end</code> terminates it. The expanded content <strong>cuts</strong> the line and a bottom stub re-anchors it at the card edge.</LegendRow>
        <LegendRow part="title" nested><code>title</code>, <code>heading/lg semibold</code>, <code>--text-primary</code>.</LegendRow>
        <LegendRow part="supporting text" nested>Optional <code>description</code>, <code>label/sm regular</code>, <code>--text-tertiary</code>. Omit it and the header hugs to a single line. (Figma: "Show supporting text" BOOLEAN.)</LegendRow>
        <LegendRow part="chevron" nested><code>lucide/chevron-down</code>, 20px, <code>--text-tertiary</code>; rotates 180° on expand (→ <code>--text-primary</code> on header hover).</LegendRow>
        <LegendRow part="content slot" nested><code>children</code>, revealed via grid-rows 0fr→1fr under the header; 32px gap above/below. (Figma: Content SLOT.)</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}
function Field({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
      {label}
      <input value={value} onChange={(e) => set(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }} />
    </label>
  )
}

// The controls drive the FIRST card in a live 3-card stack (start/mid/end) so
// the connector lines stay visible while you edit props. `position` moves the
// controlled card through the stack; the other two fill the remaining slots.
const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }

function ExampleBody({ onCollapse }) {
  const [value, setValue] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', maxWidth: 420 }}>
      <FormField label="Required field" placeholder="Type anything to fill this section" value={value} onChange={(e) => setValue(e.target.value)} />
      <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} label="I confirm this information is correct" />
      <div>
        <Button variant="secondary" size="sm" onClick={onCollapse}>Collapse section</Button>
      </div>
    </div>
  )
}

function Playground() {
  const [position, setPosition] = useState('start')
  const [status, setStatus] = useState('off')
  const [errorCount, setErrorCount] = useState(3)
  const [title, setTitle] = useState('Shipment Details')
  const [description, setDescription] = useState('Origin, destination and schedule for this shipment.')
  const [showDescription, setShowDescription] = useState(true)
  const [expanded, setExpanded] = useState(true)

  // Fill the two stack slots the controlled card doesn't occupy, in order.
  const others = [
    { position: 'start', title: 'Shipment Details', description: 'Origin & schedule.' },
    { position: 'mid', title: 'Products', description: 'Products this shipment carries.' },
    { position: 'end', title: 'Documents', description: 'BoL and supporting documents.' },
  ].filter((s) => s.position !== position)

  const controlled = (
    <Accordion
      key="controlled"
      position={position}
      status={status}
      errorCount={errorCount}
      title={title}
      description={showDescription ? description : undefined}
      expanded={expanded}
      onToggle={setExpanded}
    >
      <ExampleBody onCollapse={() => setExpanded(false)} />
    </Accordion>
  )
  const filler = (s) => (
    <Accordion key={s.position} position={s.position} status="off" title={s.title} description={s.description} />
  )

  // Render the stack in start→mid→end order with the controlled card in its slot.
  const order = ['start', 'mid', 'end']
  const cards = order.map((pos) =>
    pos === position ? controlled : filler(others.shift()),
  )

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          position
          <select value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle}>
            <option value="start">start</option>
            <option value="mid">mid</option>
            <option value="end">end</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
          status
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="off">off</option>
            <option value="on">on</option>
            <option value="error">error</option>
          </select>
        </label>
        {status !== 'off' && (
          <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
            errorCount
            <input
              type="number"
              min="0"
              value={errorCount}
              onChange={(e) => setErrorCount(Math.max(0, Number(e.target.value)))}
              style={{ ...inputStyle, width: 72 }}
            />
          </label>
        )}
        <Field label="title" value={title} set={setTitle} />
        <Field label="description" value={description} set={setDescription} />
        <Toggle label="show supporting text" value={showDescription} set={setShowDescription} />
        <Toggle label="expanded" value={expanded} set={setExpanded} />
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>{cards}</div>
      </div>
    </div>
  )
}

export default function AccordionDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Expandable form-section card with a stepper/validation indicator. The
        stepper line is &ldquo;cut&rdquo; by the expansion — the content interrupts it and a
        stub re-anchors it at the card&rsquo;s bottom (start/mid; end pads instead).
        Validation is consumer-driven: flip <code>status</code> to <code>on</code> when the
        section is correctly filled. Supporting text is optional — omit
        <code>description</code> and the header hugs to a single line.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (3-card stepper stack)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — controls drive one card in a live start/mid/end stack</h4>
        <Playground />
      </div>
    </div>
  )
}

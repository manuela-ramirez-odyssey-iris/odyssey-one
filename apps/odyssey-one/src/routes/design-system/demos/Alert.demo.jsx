import { useState } from 'react'
import { Alert } from '@odyssey/ui'

export const meta = {
  name: 'Alert',
  tier: 'molecule',
  version: '0.9.0',
  createdVersion: '0.2.0',
  figmaNode: '2569:1841',
  codeConnect: 'packages/ui/src/Alert.figma.tsx',
  normalizing: false,
}

export const props = [
  { name: 'variant', type: 'info|success|warning|error', desc: 'Drives the tinted /200 background + status icon. Default info.' },
  { name: 'children', type: 'ReactNode', desc: 'The alert message.' },
  { name: 'showLink', type: 'boolean', desc: 'Show the trailing "Click here →" ButtonLink (Black/underline style). Default false.' },
  { name: 'linkLabel', type: 'string', desc: 'Link text. Default "Click here".' },
  { name: 'onLinkClick', type: '() => void', desc: 'Link click handler.' },
  { name: 'showClose', type: 'boolean', desc: 'Show the trailing X dismiss button. Default true.' },
  { name: 'onClose', type: '() => void', desc: 'Dismiss handler (wire to remove/hide the alert).' },
  { name: 'errors', type: '{field, reason, resolved?}[]', desc: 'Non-empty → error-validation anatomy (replaces message/link/close): "N Errors: Validation Required" header (N = unresolved), Validate Errors link, chevron-collapsible per-field error list. resolved: true entries drop out of the count + the rows.' },
  { name: 'contextText', type: 'string', desc: 'Header context after the count — e.g. "ORD-D78120458 · Integrated from ACME" (order id · source + customer).' },
  { name: 'expanded / defaultExpanded / onToggle', type: 'boolean / boolean / (next) => void', desc: 'Error-list collapse state (chevron) — controlled or uncontrolled. Default collapsed.' },
  { name: 'docked', type: 'boolean', desc: 'Sticky morph: full-width squared bar, header "resolved out of total errors resolved" (derived from the resolved flags), link becomes the ← Error i/N → stepper over the unresolved errors. The consumer owns position:sticky + the scroll trigger. Resolving the error the stepper sits on clamps it to the LAST open error (Next greys out, not Prev). Default false.' },
  { name: 'errorIndex', type: 'number', desc: 'Current error (0-based, original-array index) for the docked stepper label + nav. Default 0.' },
  { name: 'onErrorNav', type: '(index) => void', desc: 'Jump-to-error intent: Validate Errors click (current index), list-row click (row index), docked arrows (index ± 1). The consumer autoscrolls to the red field.' },
]

export const tokens = [
  { token: '--alert-info-bg', resolves: '--status-info-message', usage: 'info surface' },
  { token: '--alert-success-bg', resolves: '--status-success-message', usage: 'success surface' },
  { token: '--alert-warning-bg', resolves: '--status-warning-message', usage: 'warning surface' },
  { token: '--alert-error-bg', resolves: '--status-error-message', usage: 'error surface' },
  { token: '--status-*-message', resolves: 'DSN-backed Status semantics', usage: 'new semantic layer (mirrors Figma Status/*-message)' },
  { token: '--alert-text', resolves: 'DSN/900', usage: 'uniform text + icon color (via currentColor)' },
  { token: '--radius-xl', resolves: 'radius/xl (12px)', usage: 'banner corner radius (docked: 0)' },
  { token: '--text-error', resolves: 'Bittersweet/600', usage: 'error-list rows (field + reason)' },
  { token: '--bittersweet-300', resolves: 'Bittersweet/300', usage: 'error-list row dividers (token\'s first consumer)' },
  { token: '--spacing-1 / -3 / -12', resolves: '4 / 12 / 48px', usage: 'error-row padding (y / left / right)' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function ChildLink({ to, children }) {
  return <a href={`#comp-${to}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'underline', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{children}</a>
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
      <div style={{ flex: '1 1 420px', minWidth: 320, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
        <Alert variant="info" showLink linkLabel="Click here" onLinkClick={() => {}}>
          A new shipment needs your attention.
        </Alert>
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">Full-width flex banner, <code>--radius-xl</code>. Surface is the tinted <code>/200</code> per <code>variant</code> (all 4 route through <code>--status-*-message</code>).</LegendRow>
        <LegendRow part="status icon" nested>Per-variant lucide (info / circle-check / triangle-alert / octagon-x), 20px, uniform DSN/900 via <code>currentColor</code>.</LegendRow>
        <LegendRow part="message" nested>Body text, <code>label/sm regular</code>, DSN/900.</LegendRow>
        <LegendRow part={<ChildLink to="Button">Button (link)</ChildLink>} tier="atom" nested>Optional — the trailing "Click here →" ButtonLink (Black tone). Shown when <code>showLink</code>.</LegendRow>
        <LegendRow part="close X" nested>Optional — trailing dismiss button (<code>lucide/x</code>, 20px). Shown when <code>showClose</code> (default true).</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set, disabled }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  )
}
const VARIANTS = [
  { variant: 'info', message: 'A new shipment needs your attention.' },
  { variant: 'success', message: 'Shipment created successfully.' },
  { variant: 'warning', message: 'This shipment is missing a BOL.' },
  { variant: 'error', message: 'Failed to save the shipment. Try again.' },
]

// Pool of fake field errors — the demo's errorCount control slices this to
// emulate the domain, where the count = how many fields failed validation.
const DEMO_ERROR_POOL = [
  { field: 'Equipment *', reason: 'Invalid Data' },
  { field: 'Freight Term *', reason: 'Missing Mandatory' },
  { field: 'Ship Direction *', reason: 'Missing Mandatory' },
  { field: 'ID/Org Name *', reason: 'No match found' },
  { field: 'Address 1 *', reason: 'No match found' },
  { field: 'State *', reason: 'No match found' },
  { field: 'Postal Code *', reason: 'No match found' },
  { field: 'Line 2 - Product Description *', reason: 'Please enter product description' },
  { field: 'Line 4 - Gross Weight *', reason: 'Enter Gross Weight value' },
]

function ValidationPlayground() {
  const [docked, setDocked] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [errorIndex, setErrorIndex] = useState(0)
  const [errorCount, setErrorCount] = useState(5)
  const [resolvedCount, setResolvedCount] = useState(0)
  const [lastNav, setLastNav] = useState(null)
  // errorCount emulates "how many fields have errors" (slices the pool);
  // resolvedCount marks the FIRST N of those resolved — they leave the count/rows.
  const errors = DEMO_ERROR_POOL
    .slice(0, errorCount)
    .map((e, i) => ({ ...e, resolved: i < resolvedCount }))

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle label="docked (sticky morph)" value={docked} set={setDocked} />
        <Toggle label="expanded" value={expanded} set={setExpanded} disabled={docked} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}>
          errored fields
          <input type="number" min="1" max={DEMO_ERROR_POOL.length} value={errorCount} onChange={(e) => setErrorCount(Math.min(DEMO_ERROR_POOL.length, Math.max(1, Number(e.target.value))))} style={{ width: 56, padding: '2px 6px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}>
          resolvedCount
          <input type="number" min="0" max={errorCount} value={resolvedCount} onChange={(e) => setResolvedCount(Math.min(errorCount, Math.max(0, Number(e.target.value))))} style={{ width: 56, padding: '2px 6px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
        </label>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
          {lastNav == null ? 'onErrorNav: —' : `onErrorNav → ${lastNav}: ${errors[lastNav]?.field ?? '?'}`}
        </span>
      </div>
      <Alert
        errors={errors}
        contextText="ORD-D78120458 · Integrated from ACME"
        expanded={expanded}
        onToggle={setExpanded}
        docked={docked}
        errorIndex={errorIndex}
        onErrorNav={(i) => {
          const next = Math.max(0, Math.min(errors.length - 1, i))
          setErrorIndex(next)
          setLastNav(next)
          // Emulates the page behavior: any jump (Validate Errors / row click)
          // autoscrolls to the field AND flips the alert into docked mode,
          // where the ← Error i/N → stepper takes over.
          if (!docked) setDocked(true)
        }}
      />
    </div>
  )
}

function Playground() {
  const [showLink, setShowLink] = useState(false)
  const [showClose, setShowClose] = useState(true)

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle label="showLink" value={showLink} set={setShowLink} />
        <Toggle label="showClose" value={showClose} set={setShowClose} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        {VARIANTS.map((v) => (
          <Alert
            key={v.variant}
            variant={v.variant}
            showLink={showLink}
            linkLabel="Click here"
            onLinkClick={() => {}}
            showClose={showClose}
            onClose={() => {}}
          >
            {v.message}
          </Alert>
        ))}
      </div>
    </div>
  )
}

export default function AlertDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Inline status banner. Tinted <code>/200</code> background per variant (all four
        route through <code>--status-*-message</code>); text and icon are uniformly
        DSN/900. Each variant has its own lucide glyph — info / circle-check /
        triangle-alert / octagon-x. Optional trailing <code>ButtonLink</code> and X dismiss.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — all 4 variants; toggle link + close</h4>
        <Playground />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Error validation — errors list, chevron collapse, docked sticky morph (Figma Layout Default/Expanded/Sticky)</h4>
        <ValidationPlayground />
      </div>
    </div>
  )
}

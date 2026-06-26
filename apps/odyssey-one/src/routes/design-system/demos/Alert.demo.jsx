import { useState } from 'react'
import { Alert, Button } from '@odyssey/ui'

export const meta = {
  name: 'Alert',
  tier: 'molecule',
  version: '0.2.0',
  figmaNode: '2569:1841',
  codeConnect: 'packages/ui/src/Alert.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'info|success|warning|error', desc: 'Drives the tinted /200 background + status icon. Default info.' },
  { name: 'children', type: 'ReactNode', desc: 'The alert message.' },
  { name: 'showLink', type: 'boolean', desc: 'Show the trailing "Click here →" ButtonLink (Black/underline style). Default false.' },
  { name: 'linkLabel', type: 'string', desc: 'Link text. Default "Click here".' },
  { name: 'onLinkClick', type: '() => void', desc: 'Link click handler.' },
  { name: 'showClose', type: 'boolean', desc: 'Show the trailing X dismiss button. Default true.' },
  { name: 'onClose', type: '() => void', desc: 'Dismiss handler (wire to remove/hide the alert).' },
]

export const tokens = [
  { token: '--alert-info-bg', resolves: 'Carolina Blue/200', usage: 'info surface' },
  { token: '--alert-success-bg', resolves: 'Caribbean Green/200', usage: 'success surface' },
  { token: '--alert-warning-bg', resolves: 'Sunrise Yellow/200', usage: 'warning surface' },
  { token: '--alert-error-bg', resolves: 'Bittersweet/200', usage: 'error surface' },
  { token: '--alert-text', resolves: 'DSN/900', usage: 'uniform text + icon color (via currentColor)' },
  { token: '--radius-xl', resolves: 'radius/xl (12px)', usage: 'banner corner radius' },
]

const VARIANTS = [
  { variant: 'info', message: 'Info Message' },
  { variant: 'success', message: 'Success Message!' },
  { variant: 'warning', message: 'Warning Message!' },
  { variant: 'error', message: 'Error Message!' },
]

export default function AlertDemo() {
  const [open, setOpen] = useState(() => VARIANTS.map(() => true))
  const allClosed = open.every((v) => !v)

  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Inline status banner. Tinted <code>/200</code> background per variant; text and icon
        are uniformly DSN/900. Warning and Error share <code>triangle-alert</code>, separated by
        color.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Variants</h4>
        <div className="ds-demo-col" style={{ gap: 'var(--spacing-3)' }}>
          {VARIANTS.map(({ variant, message }) => (
            <Alert key={variant} variant={variant} showClose={false}>
              {message}
            </Alert>
          ))}
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">With link + dismiss (showLink, showClose)</h4>
        <div className="ds-demo-col" style={{ gap: 'var(--spacing-3)' }}>
          <Alert variant="info" showLink linkLabel="Click here" onLinkClick={() => {}}>
            A new shipment needs your attention.
          </Alert>
          <Alert variant="warning" showLink linkLabel="Review now" onLinkClick={() => {}}>
            3 tenders are about to expire.
          </Alert>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Dismissible — click the X</h4>
        <div className="ds-demo-col" style={{ gap: 'var(--spacing-3)' }}>
          {VARIANTS.map(({ variant, message }, i) =>
            open[i] ? (
              <Alert
                key={variant}
                variant={variant}
                onClose={() => setOpen((s) => s.map((v, j) => (j === i ? false : v)))}
              >
                {message}
              </Alert>
            ) : null
          )}
          {allClosed && (
            <Button variant="secondary" size="sm" onClick={() => setOpen(VARIANTS.map(() => true))}>
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

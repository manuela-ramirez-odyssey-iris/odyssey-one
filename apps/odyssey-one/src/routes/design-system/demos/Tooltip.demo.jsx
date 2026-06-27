import { Tooltip } from '@odyssey/ui'

export const meta = {
  name: 'Tooltip',
  tier: 'molecule',
  version: '0.4.0',
  figmaNode: '3762:237',
  codeConnect: 'packages/ui/src/Tooltip.figma.tsx',
}

export const props = [
  { name: 'badgeVariant', type: "'time' | 'info'", desc: 'Header icon Badge (composes <Badge variant iconOnly>). Omit → no badge.' },
  { name: 'leftIcon', type: 'ReactNode', desc: 'Overrides the badge’s baked default icon (16px).' },
  { name: 'label', type: 'string', desc: 'Header label.' },
  { name: 'status', type: 'string', desc: 'Header right-aligned status. Omit → no status (and no min-gap).' },
  { name: 'groups', type: '{ subtitle?, content }[]', desc: 'Body rows. subtitle optional per group (off → content-only).' },
  { name: 'className', type: 'string', desc: 'Additional classes for the root.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-900', resolves: 'DSN/900', usage: 'card background' },
  { token: '--white', resolves: '#FFFFFF', usage: 'label / status / content text' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'subtitle text' },
  { token: '--shadow-lg', resolves: '0 8 32 / 16%', usage: 'card elevation (shadow/lg)' },
  { token: '--radius-sm', resolves: '4px', usage: 'card corner' },
  { token: '--spacing-3 / --spacing-2 / --spacing-1', resolves: '12 / 8 / 4', usage: 'padding / header↔body gap / group gaps' },
  { token: '--font-size-xs / --line-height-xs', resolves: '12 / 16', usage: 'all text (label/xs regular)' },
]

export default function TooltipDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Dark info card. Three presentations fall out of props — header (badge +
        label + status) toggles, and each group's subtitle toggles. Width hugs
        content; the header keeps a <strong>30px minimum gap</strong> between label
        and status (CSS <code>gap</code>) and pushes the status to the edge when the
        body forces a wider card (<code>space-between</code>).
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">1 — Detailed (header + status + subtitle groups)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Tooltip
            badgeVariant="time"
            label="Picked Up 1"
            status="On Time"
            groups={[
              { subtitle: 'Location:', content: 'Sparta, NJ' },
              { subtitle: 'Scheduled Pickup:', content: '02/10/2026 at 8:00 AM' },
              { subtitle: 'Actual Pickup:', content: '02/10/2026 at 8:00 AM' },
            ]}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">2 — Comment (header, no status, no subtitle)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Tooltip
            badgeVariant="info"
            label="Comment"
            groups={[{ content: 'Customer requested delivery after 2 PM due to dock availability.' }]}
          />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">3 — Simple (plain content, no header)</h4>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start' }}>
          <Tooltip groups={[{ content: 'Tender Status: Declined' }]} />
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Hug width + minimum gap</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Narrow content → exactly 30px between label and status. Wider body →
          status pushed to the right edge.
        </p>
        <div className="ds-demo-row" style={{ alignItems: 'flex-start', gap: 'var(--spacing-6)' }}>
          <Tooltip badgeVariant="time" label="A" status="Late" groups={[{ subtitle: 'Note:', content: 'Short' }]} />
          <Tooltip
            badgeVariant="time"
            label="Picked Up 1"
            status="On Time"
            groups={[{ subtitle: 'Location:', content: 'A much longer line that widens the card' }]}
          />
        </div>
      </div>
    </div>
  )
}

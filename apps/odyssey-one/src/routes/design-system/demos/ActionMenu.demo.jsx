import { EllipsisVertical, Zap } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { ActionMenu } from '@odyssey/ui'

export const meta = {
  name: 'ActionMenu',
  tier: 'molecule',
  version: '0.11.0',
  createdVersion: '0.3.0',
  codeOnly: true,
  // Code-first molecule — composes DropdownMenu + MenuRow (both already in Figma), so no
  // standalone Figma master. React built S66; Angular twin shipped S67 → full cycle complete.
  normalizing: true,
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: 'The trigger glyph — the library is icon-agnostic, so pass a real icon (⋮, ⚡, …). Lives inside a normalized 28×28 transparent trigger button. Required unless `label` is given.' },
  { name: 'label', type: 'string', desc: 'Renders a LABELLED trigger instead of an icon one — the normalized DropdownButton atom (value + chevron, chevron flips with open). For toolbar action menus that must announce themselves ("Actions") rather than hide behind a 3-dot glyph. Mutually exclusive with `icon`; `label` wins if both are passed.' },
  { name: 'options', type: '{ label, onSelect, disabled?, danger? }[]', desc: 'The action items. Each fires onSelect + closes. disabled → inert + muted; danger → destructive color.' },
  { name: 'align', type: "'right' | 'left'", desc: "Horizontal anchor. 'right' (default) pins the menu's right edge to the trigger (safe for far-right action columns); 'left' pins its left edge." },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible name for the icon-only trigger button.' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
]

export const tokens = [
  { token: '(composed)', resolves: 'DropdownMenu + MenuRow', usage: 'the menu surface + rows come from the normalized primitives' },
  { token: '--text-tertiary', resolves: 'Deep Sea Neutral/500', usage: 'trigger icon at rest' },
  { token: '--bg-secondary', resolves: 'Deep Sea Neutral/50', usage: 'trigger hover fill' },
  { token: '--text-error', resolves: 'Bittersweet/600 (#D23930)', usage: 'danger item label' },
]

const ACTIONS = [
  { label: 'View', onSelect: () => {} },
  { label: 'Edit', onSelect: () => {} },
  { label: 'Duplicate', onSelect: () => {} },
  { label: 'Delete', onSelect: () => {}, danger: true },
]

const WITH_DISABLED = [
  { label: 'View', onSelect: () => {} },
  { label: 'Restore', onSelect: () => {}, disabled: true },
  { label: 'Delete', onSelect: () => {}, danger: true },
]

function Row({ children, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}

export default function ActionMenuDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <code>Dropdown</code>'s action-flavored sibling — a customizable icon trigger that opens an
        anchored <code>DropdownMenu</code> of actions. One implementation owns the trigger,
        positioning, the boundary <strong>flip</strong> (open near the window bottom → it opens
        upward), and a11y (focus-first, Escape, outside-click close). Per-table option sets are just
        an array; the trigger glyph is whatever you pass.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Triggers + alignment</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Row label="Ellipsis (⋮), align right (default)">
            <ActionMenu icon={<EllipsisVertical {...ICON_MD} />} options={ACTIONS} ariaLabel="Row actions" />
          </Row>
          <Row label="Custom trigger (⚡ Zap), align left">
            <ActionMenu icon={<Zap {...ICON_MD} />} options={ACTIONS} align="left" ariaLabel="Quick actions" />
          </Row>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Disabled + danger items</h4>
        <Row label="Restore disabled, Delete destructive">
          <ActionMenu icon={<EllipsisVertical {...ICON_MD} />} options={WITH_DISABLED} ariaLabel="Row actions" />
        </Row>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ShipmentsBar } from '@odyssey/ui'

export const meta = {
  name: 'ShipmentsBar',
  tier: 'organism',
  version: '0.9.0',
  createdVersion: '0.6.0',
  normalizing: true,
  figmaNode: '4120:4623',
  codeConnect: 'packages/ui/src/ShipmentsBar.figma.tsx',
  approved: true,
}

export const props = [
  { name: 'shipmentId', type: 'string | null', desc: 'Current entity label in the lead segment; null renders the placeholder and disables the bar. (Figma: Shipment ID TEXT prop.)' },
  { name: 'onShipmentIdClick', type: '() => void', desc: 'S93: when provided (and a shipment is selected) the ID renders as a ButtonLink (Button variant="link", default non-black tone, semibold) — e.g. opens the View Shipment Details modal. Without it: plain semibold label. Figma master sync owed.' },
  { name: 'placeholder', type: 'string', desc: "Lead label when nothing is selected. Default 'Select a Shipment'." },
  { name: 'onPrevShipment / onNextShipment', type: '() => void', desc: 'Prev/next arrows (20px, DSN/500) beside the ID — render only when provided; pair with prevDisabled/nextDisabled at list bounds.' },
  { name: 'tabs', type: '[{ key, label }]', desc: "The tab slots; overflow scrolls natively. Plain tabs only — the dropdown-tab face (prelabel/value/chevron) retired S80 with the Figma State=Selected Dropdown variant; in-pane switchers live in the pane content. (Figma: ShipmentsBarTab State=Default|Selected, Label TEXT.)" },
  { name: 'activeTab / onTabChange', type: 'string / (key) => void', desc: 'Controlled selection. Selected tab = DSN/100 fill — a real Selected state (the mock faked it with Cell State=Hover). (Figma: State VARIANT Default|Selected.)' },
  { name: 'expanded / onExpandedChange', type: 'boolean / (next) => void', desc: 'Controlled expansion: 48px strip ↔ the fixed stage height (S93 three-stage model — the S79d adaptive content height + ratchet was retired; pane content scrolls within the stage height). CollapseExpand fires onExpandedChange(true) only in the expand direction — closing goes through onClose.' },
  { name: 'stage / onStageChange', type: "'partial' | 'full' / (next) => void", desc: "S82 three-state expansion. 'partial' caps the open bar at --bottombar-partial (60dvh); 'full' fixes it at 100dvh − --navbar-height — every pixel between the navbar and the viewport bottom (2026-08-15; supersedes the earlier --bottombar-top-clearance mid-page-title cap). Definite heights — stage changes and open/close animate on the plain CSS drawer transition (S93). CollapseExpand walks closed → partial (arrow-up-to-line, fires onExpandedChange(true)) → full (chevrons-up, fires onStageChange('full')) → closed (chevrons-down, fires onClose). Consumers reset to 'partial' on a fresh open. Default 'full' (two-state back-compat)." },
  { name: 'onClose', type: '() => void', desc: "CLOSE (S79c): fired by CollapseExpand while expanded (chevrons-down, aria-label 'Close panel') — the consumer deselects the entity, returning the bar to the placeholder strip. The close ANIMATES (S79d): the last-rendered pane stays mounted (inert) while the height eases back to 48px on the drawer curve. No 'collapsed with selection' state exists. Falls back to onExpandedChange(false) when not provided." },
  { name: 'onTabArrangement', type: '() => void', desc: 'The TabArrangement PanelAction (Button Icon/sm, columns+cog) — e.g. opens the column-arrangement panel. Renders only when provided. (Figma: PanelActions.)' },
  { name: 'closeOnOutsideClick', type: 'boolean', desc: 'Opt-in (RightPanel parity, S93): while expanded the bar renders a scrim (.shipments-bar__scrim) over the page content — the first outside click only fires onClose (collapse), never reaching the content underneath. Consumers position the scrim via CSS (inset below their app chrome).' },
  { name: 'rightOffset', type: 'number', desc: 'Pixel inset when side panels (filters/columns) are open.' },
  { name: 'children', type: 'node', desc: "The active tab's pane, rendered in the Content slot while expanded — each tab is a content slot. This bar REPLACES the old BottomBar chrome (no close X, no scroll chevrons, no fullscreen)." },
]

export const tokens = [
  { token: '--bottombar-collapsed', resolves: '48px', usage: 'strip height (the Figma bar is exactly 48)' },
  { token: '--bg-primary', resolves: 'white', usage: 'strip + tab background (over the DSN/100 bar canvas)' },
  { token: '--border-subtle', resolves: 'DSN/200', usage: 'bar top hairline + per-segment bottom hairline (CurrentShipment + unselected tabs; the selected tab breaks the line — designer master edit)' },
  { token: 'text-label-sm-semibold', resolves: '14 / 20 / 600', usage: 'shipment ID + tab labels' },
  { token: '--text-primary', resolves: 'DSN/900', usage: 'ID + tab label color (all tabs — selection is fill-based)' },
  { token: '--deep-sea-neutral-100', resolves: '#f2f3f5', usage: 'selected tab fill + the bar canvas behind the Content slot' },
  { token: '--white (gradient)', resolves: 'white → transparent fade', usage: 'PanelActions backdrop — overflowing tabs dissolve under the actions' },
  { token: '--deep-sea-neutral-50', resolves: '#f7f8fa', usage: 'tab hover fill (code-only)' },
  { token: '--deep-sea-neutral-500', resolves: '#6b7280', usage: 'prev/next arrows' },
  { token: '--spacing-3 / --spacing-6', resolves: '12 / 24', usage: 'PanelActions gap + padding (24 left / 12 right)' },
  { token: '--shadow-up-lg', resolves: '0 -5px 30px rgba(0,0,0,.2)', usage: 'expanded bar (Figma shadow/up-lg) — clipped up-only via clip-path: inset(-40px 0 0 0) so it never paints over the sidebar/side panels (code-only)' },
  { token: '--navbar-height', resolves: '64px', usage: "full-stage height: 100dvh − navbar-height — the bar's top edge sits exactly at the navbar's bottom edge (2026-08-15; replaces the retired --bottombar-top-clearance mid-page-title cap)" },
  { token: '--transition-drawer / --transition-base', resolves: '300ms cubic-bezier(0.16,1,0.3,1) / 200ms ease', usage: 'height eases on the non-linear drawer curve in BOTH directions plus content growth (S79d: JS-measured length→length transitions — interpolate-size retired, its uncapped auto endpoint slammed into the max-height clamp; close keeps the last pane mounted, inert, while shrinking); right (panel inset) on base; reduced-motion snaps' },
]

// Slot-marker pink — DSM annotation device (NOT a product token). RightPanel convention.
const SLOT_BORDER = '#e85aad'
const SLOT_BG = 'rgba(232, 90, 173, 0.07)'
const SLOT_TEXT = '#b03b81'

function SlotPlaceholder({ tab }) {
  return (
    <div style={{ minHeight: 120, height: '100%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-4)', border: `2px dashed ${SLOT_BORDER}`, borderRadius: 'var(--radius-md)', background: SLOT_BG, color: SLOT_TEXT, fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
      Content slot (children)
      <span style={{ fontWeight: 'var(--font-weight-regular)' }}>the "{tab}" pane renders here — each tab is a content slot</span>
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

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'product', label: 'Product' },
  { key: 'stops', label: 'Stops' },
  { key: 'tender', label: 'Tender' },
  { key: 'cost', label: 'Cost Allocation' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'History' },
  { key: 'tender-history', label: 'Tender History' },
]

// The demo un-fixes the bar (position:relative) so it sits in the flow.
const INLINE = { position: 'relative', left: 'auto', right: 'auto', bottom: 'auto', width: '100%' }

function Schematic() {
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <ShipmentsBar
          shipmentId="B28826319"
          onShipmentIdClick={() => {}}
          onPrevShipment={() => {}}
          onNextShipment={() => {}}
          tabs={TABS}
          activeTab="orders"
          onTabChange={() => {}}
          expanded={false}
          onExpandedChange={() => {}}
          onTabArrangement={() => {}}
          style={INLINE}
        />
      </div>
      <ul style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="bar" tier="organism">Docked bottom detail bar — 48px white strip (<code>--bottombar-collapsed</code>) over a <code>DSN/100</code> canvas; hairline per segment (selected tab breaks it). Expands to partial (<code>--bottombar-partial</code>) or full — full fills every pixel between the navbar and the viewport bottom, <code>100dvh − --navbar-height</code> (Figma: <code>State=Collapsed|Expanded</code>). <strong>Replaces the old BottomBar chrome</strong> — no close X, no scroll chevrons, no fullscreen.</LegendRow>
        <LegendRow part="current shipment" nested>Lead segment: prev/next arrows (<code>lucide/arrow-left|right</code>, 20px, <code>--deep-sea-neutral-500</code>) + shipment ID. With <code>onShipmentIdClick</code> (S93) the ID renders as a <strong>ButtonLink</strong> (<code>Button variant="link"</code>, default non-black tone, kept semibold) — the app opens the View Shipment Details modal; without it: plain <code>label/sm semibold</code> <code>--text-primary</code>. (Figma: Shipment ID TEXT — link face sync owed.)</LegendRow>
        <LegendRow part="tab slots" nested>Strip of <code>ShipmentsBarTab</code>s — <code>label/sm semibold</code>, padding 14/16; selected = <code>DSN/100</code> fill (real Selected state, not Hover); hover <code>DSN/50</code> code-only; overflow scrolls natively. Each tab is a content slot.</LegendRow>
        <LegendRow part="PanelActions" nested>The ONLY controls (Figma 4095:3070), composing <code>Button Icon/sm</code>: <strong>TabArrangement</strong> (columns+cog — closest lucide is <code>columns-3-cog</code>; the mock draws 2 columns) + <strong>CollapseExpand</strong> — expanded → <code>chevrons-down</code> is a <strong>CLOSE</strong> gesture (fires <code>onClose</code>; the app deselects the row — S79c); the placeholder strip shows <code>chevrons-up</code>, disabled without a selection. Gap <code>--spacing-3</code>, padding 24/12.</LegendRow>
        <LegendRow part="Content slot" nested><code>children</code> — the active pane, rendered while expanded (see Playground). (Figma: native Content slot below the strip.)</LegendRow>
      </ul>
    </div>
  )
}

function Playground() {
  const [shipmentIdx, setShipmentIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('orders')
  const [expanded, setExpanded] = useState(true)
  const [idClicks, setIdClicks] = useState(0)
  const shipments = ['B28826319', 'B28826320', 'B28826321']
  const activeLabel = TABS.find(t => t.key === activeTab)?.label

  // Plain tabs only — the dropdown-tab face retired S80 with the Figma
  // `State=Selected Dropdown` variant; in-pane switchers live in the panes.
  const tabs = TABS

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>arrows step shipments · the ID is a ButtonLink (in the app it opens View Shipment Details{idClicks > 0 ? ` — clicked ${idClicks}×` : ''}) · tabs switch the slot · chevrons-down = CLOSE (in the app it deselects the row; here it just collapses so chevrons-up can re-expand) · open/close and partial↔full ease on the drawer curve between the fixed stage heights (S93 — adaptive ratchet retired)</span>
      </div>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <ShipmentsBar
          shipmentId={shipments[shipmentIdx]}
          onShipmentIdClick={() => setIdClicks(n => n + 1)}
          onPrevShipment={() => setShipmentIdx(i => Math.max(0, i - 1))}
          onNextShipment={() => setShipmentIdx(i => Math.min(shipments.length - 1, i + 1))}
          prevDisabled={shipmentIdx === 0}
          nextDisabled={shipmentIdx === shipments.length - 1}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onClose={() => setExpanded(false)}
          onTabArrangement={() => {}}
          style={INLINE}
        >
          <SlotPlaceholder tab={activeLabel} />
        </ShipmentsBar>
      </div>
    </div>
  )
}

export default function ShipmentsBarDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The docked bottom detail bar for Shipments — a 48px strip (prev/next + shipment ID
        + tab slots + <strong>PanelActions</strong>) over a <strong>Content slot</strong>{' '}
        (<code>children</code>) revealed while expanded. A <em>replacement</em> for the old
        BottomBar, not a preservation of its chrome: the only controls are TabArrangement
        and CollapseExpand. The app-local BottomBar keeps the data wiring (lazy panes per
        tab, order switcher, retry) and slots the active pane in.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (collapsed strip)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — step shipments, switch tab slots, collapse/expand</h4>
        <Playground />
      </div>
    </div>
  )
}

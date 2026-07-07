import { useState } from 'react'
import { Timeline } from '@odyssey/ui'

export const meta = {
  name: 'Timeline',
  tier: 'molecule',
  version: '0.7.0',
  createdVersion: '0.7.0',
  normalizing: false,
  figmaNode: '4280:642',
  codeConnect: 'packages/ui/src/Timeline.figma.tsx',
}

export const props = [
  { name: 'items', type: '[{ key, label, status, content }]', desc: 'One stop per item. `label`/`status` feed the StopBadge marker; `content` is any ReactNode rendered right of the rail — the connector stretches with it, so row height is content-driven.' },
  { name: 'animate', type: 'boolean', desc: 'Grows the fills top-down on mount, staggered ~350ms per segment (truck marker fades in after its segment lands). CSS-only; replays on remount (key trick); disabled under prefers-reduced-motion. Default false.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root element.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-100', resolves: 'DSN/100', usage: '2px track (the unfilled rail)' },
  { token: '--deep-sea-neutral-400', resolves: 'DSN/400', usage: 'progress fill riding the track' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'truck marker icon (lucide Truck 16px, --white plate behind it)' },
  { token: '--spacing-3', resolves: '12px', usage: 'rail ↔ content gap' },
  { token: '--spacing-6', resolves: '24px', usage: 'segment min-height (rows with tiny content)' },
  { token: '(composed) StopBadge', resolves: 'atom', usage: 'stop markers — see the StopBadge entry for its tokens' },
]

// ── Schematic ───────────────────────────────────────────────────────────────
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

// Simple placeholder content block — stands in for the StopsTab stop card.
function StopContent({ title, detail }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-3) var(--spacing-4)', marginBottom: 'var(--spacing-3)', fontFamily: 'var(--font-primary)' }}>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{detail}</div>
    </div>
  )
}

const SCHEMATIC_ITEMS = [
  { key: 'p1', label: 'P1', status: 'completed', content: <StopContent title="Pickup — Charlotte, NC" detail="Departed 06:40 · full segment below (next stop reached)" /> },
  { key: 'd1', label: 'D1', status: 'completed', content: <StopContent title="Delivery — Atlanta, GA" detail="Delivered 11:15 · partial segment + truck (next stop pending)" /> },
  { key: 'd2', label: 'D2', status: 'pending', content: <StopContent title="Delivery — Mobile, AL" detail="ETA 16:30 · empty track below (both ends pending)" /> },
  { key: 'd3', label: 'D3', status: 'pending', content: <StopContent title="Delivery — Houston, TX" detail="ETA tomorrow 09:00 · last stop — no segment" /> },
]

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 360px', minWidth: 320, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)' }}>
        <Timeline items={SCHEMATIC_ITEMS} />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="row" tier="molecule">One flex row per stop: a fixed 32px <strong>rail</strong> + the consumer&apos;s <code>content</code> node (<code>--spacing-3</code> gap). The connector stretches with the content, so row height is content-driven.</LegendRow>
        <LegendRow part="badge" nested><code>StopBadge</code> atom (label + status straight from the item) — see its own entry for the pill/circle anatomy.</LegendRow>
        <LegendRow part="track" nested>2px <code>--deep-sea-neutral-100</code> line between adjacent badges (min-height <code>--spacing-6</code>). The last stop has no segment.</LegendRow>
        <LegendRow part="fill" nested><code>--deep-sea-neutral-400</code> overlay derived from the ADJACENT statuses: reached→reached (completed/issue both count as reached) = <strong>full</strong>; reached→pending = <strong>partial</strong> (~70%); pending→pending = <strong>empty</strong>.</LegendRow>
        <LegendRow part="truck marker" nested>Lucide <code>Truck</code> 16px (<code>--text-tertiary</code> on a <code>--white</code> plate that breaks the track) riding the tip of a partial fill — "the truck is between these two stops".</LegendRow>
        <LegendRow part="animate" nested>Fills <code>scaleY</code> 0→1 top-down, staggered 350ms per segment; the marker fades in 250ms after its segment. Runs on mount only — remount to replay; off under <code>prefers-reduced-motion</code>.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
const inputStyle = { padding: '4px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }

function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

const STOPS = [
  { key: 'p1', label: 'P1', title: 'Pickup — Charlotte, NC' },
  { key: 'p2', label: 'P2', title: 'Pickup — Greenville, SC' },
  { key: 'd1', label: 'D1', title: 'Delivery — Atlanta, GA' },
  { key: 'd2', label: 'D2', title: 'Delivery — Mobile, AL' },
]

function Playground() {
  const [statuses, setStatuses] = useState(['completed', 'completed', 'pending', 'pending'])
  const [animate, setAnimate] = useState(true)
  // Bumping the key remounts the Timeline, replaying the mount animation.
  const [run, setRun] = useState(0)

  const patch = (idx, status) => {
    setStatuses((prev) => prev.map((s, i) => (i === idx ? status : s)))
    setRun((r) => r + 1)
  }

  const items = STOPS.map((stop, i) => ({
    key: stop.key,
    label: stop.label,
    status: statuses[i],
    content: <StopContent title={stop.title} detail={`status: ${statuses[i]}`} />,
  }))

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {STOPS.map((stop, i) => (
          <label key={stop.key} style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' }}>
            {stop.label}
            <select value={statuses[i]} onChange={(e) => patch(i, e.target.value)} style={inputStyle}>
              <option value="completed">completed</option>
              <option value="issue">issue</option>
              <option value="pending">pending</option>
            </select>
          </label>
        ))}
        <Toggle label="animate" value={animate} set={(v) => { setAnimate(v); setRun((r) => r + 1) }} />
        <button type="button" onClick={() => setRun((r) => r + 1)} style={{ ...inputStyle, cursor: 'pointer' }}>replay (remount)</button>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <div style={{ maxWidth: 480, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)' }}>
          <Timeline key={run} items={items} animate={animate} />
        </div>
      </div>
    </div>
  )
}

export default function TimelineDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Vertical stop-progress timeline — <code>StopBadge</code> markers over a
        2px rail whose fill derives from the adjacent statuses: full between
        reached stops, partial (~70%) with a truck riding the tip toward the
        next pending stop, empty between pending stops. Content-agnostic — the
        consumer feeds any node per stop and the connector stretches with it.
        First consumer: the Stops tab All Stops card. Figma masters are still
        staging <strong>frames</strong> (4274:15599; detailed variant
        4274:15672 out of scope) — componentization pending.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy (full / partial + truck / empty segments)</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — per-stop status, animate, replay via remount</h4>
        <Playground />
      </div>
    </div>
  )
}

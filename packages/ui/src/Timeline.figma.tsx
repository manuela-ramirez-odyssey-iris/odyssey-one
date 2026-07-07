import figma from '@figma/code-connect'
import Timeline from './Timeline'

// Master: `Timeline` 4280:642 (Components-Molecules › Sections) — a composition
// master with no variant axes: StopBadge instances over the 2px track with a
// DSN/400 progress fill + the lucide/truck 16px marker riding the partial
// segment's tip. In code the fills DERIVE from adjacent item statuses
// (completed/issue = reached → full; reached→pending = partial + truck;
// pending→pending = empty), so the mapping is a static data-driven example —
// per-item `content` renders right of the rail and stretches the connector.
// `animate` runs the mount-only arrival choreography (CSS, reduced-motion aware).
figma.connect(
  Timeline,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4280-642',
  {
    imports: ["import { Timeline } from '@odyssey/ui'"],
    example: () => (
      <Timeline
        animate
        items={[
          { key: 'p1', label: 'P1', status: 'completed', content: <div>Charlotte, NC — picked up</div> },
          { key: 'd1', label: 'D1', status: 'pending', content: <div>Atlanta, GA — ETA tomorrow</div> },
        ]}
      />
    ),
  },
)

import figma from '@figma/code-connect'
import StopBadge from './StopBadge'

// Master: `StopBadge` set 4279:5101 (Components-Atoms › Badges) — the stop-marker
// pill for the shipment Timeline. `Status` VARIANT {Completed, Issue, Pending} →
// `status`; `Label` TEXT → `label` ("P1"/"D2"…); `Show Status Badge` BOOLEAN →
// `showStatusBadge` (the 10px overlapping circle). NOTE: the Figma boolean
// defaults TRUE set-wide — designers switch it off on Pending instances, while
// code auto-hides the circle for `status="pending"` unless forced on.
figma.connect(
  StopBadge,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4279-5101',
  {
    imports: ["import { StopBadge } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      status: figma.enum('Status', {
        Completed: 'completed',
        Issue: 'issue',
        Pending: 'pending',
      }),
      showStatusBadge: figma.boolean('Show Status Badge'),
    },
    example: ({ label, status, showStatusBadge }) => (
      <StopBadge label={label} status={status} showStatusBadge={showStatusBadge} />
    ),
  },
)

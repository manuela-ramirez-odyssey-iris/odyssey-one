import figma from '@figma/code-connect'
import Tooltip from './Tooltip'

figma.connect(
  Tooltip,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3762-237',
  {
    imports: ["import { Tooltip } from '@odyssey/ui'"],
    props: {
      // Header text + presence (Show header gates the whole header in Figma; in
      // code the header renders when any of badgeVariant/label/status is set).
      label: figma.string('Label'),
      status: figma.boolean('Show status', {
        true: figma.string('Status'),
        false: undefined,
      }),
      // The exposed nested Badge's color variant → the Tooltip's badgeVariant.
      badge: figma.nestedProps('Badge', {
        variant: figma.enum('Variant', { time: 'time', info: 'info' }),
      }),
    },
    // The body groups are data-driven in code (Figma shows a representative set).
    example: ({ label, status, badge }) => (
      <Tooltip
        badgeVariant={badge.variant}
        label={label}
        status={status}
        groups={[
          { subtitle: 'Location:', content: 'Sparta, NJ' },
          { subtitle: 'Scheduled Pickup:', content: '02/10/2026 at 8:00 AM' },
        ]}
      />
    ),
  },
)

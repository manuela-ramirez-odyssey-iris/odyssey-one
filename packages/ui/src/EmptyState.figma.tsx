import figma from '@figma/code-connect'
import EmptyState from './EmptyState'

// Master: Components-Atoms page, Panels artboard, `EmptyState` at 2159:295.
// Icon swappable via INSTANCE_SWAP; message via TEXT.
figma.connect(
  EmptyState,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2159-295',
  {
    imports: ["import { EmptyState } from '@odyssey/ui'"],
    props: {
      icon: figma.instance('Icon'),
      message: figma.string('Message'),
    },
    example: ({ icon, message }) => (
      <EmptyState icon={icon} message={message} />
    ),
  },
)

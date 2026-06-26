import figma from '@figma/code-connect'
import DropdownButton from './DropdownButton'

// Master: DropdownButton set 3272:3880 (Components-Atoms).
// Value TEXT → value; State variant Idle/Hover/Pressed/Disabled → Pressed→open,
// Disabled→disabled; hover/pressed are otherwise CSS-driven.
figma.connect(
  DropdownButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3272-3880',
  {
    imports: ["import { DropdownButton } from '@odyssey/ui'"],
    props: {
      value: figma.string('Value'),
      open: figma.enum('State', { Pressed: true }),
      disabled: figma.enum('State', { Disabled: true }),
    },
    example: ({ value, open, disabled }) => (
      <DropdownButton value={value} open={open} disabled={disabled} />
    ),
  },
)

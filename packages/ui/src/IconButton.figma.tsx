import figma from '@figma/code-connect'
import IconButton from './IconButton'

// Maps the IconButton component set (variants State=Idle / Hover / Pressed).
// All three variants resolve to the same React component — state is CSS-driven
// via `:hover` / `:active` (no React `state` prop).
figma.connect(
  IconButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1754-295',
  {
    imports: ["import { IconButton } from '@odyssey/ui'"],
    props: {
      icon: figma.instance('Icon'),
    },
    example: ({ icon }) => <IconButton icon={icon} />,
  },
)

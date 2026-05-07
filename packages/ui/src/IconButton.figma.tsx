import figma from '@figma/code-connect'
import IconButton from './IconButton'

figma.connect(
  IconButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1711-297',
  {
    imports: ["import { IconButton } from '@odyssey/ui'"],
    props: {
      icon: figma.instance('Icon'),
    },
    example: ({ icon }) => <IconButton icon={icon} />,
  },
)

import figma from '@figma/code-connect'
import SidebarButton from './SidebarButton'

figma.connect(
  SidebarButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=514-2479',
  {
    imports: ["import { SidebarButton } from '@odyssey/ui'"],
    props: {
      state: figma.enum('Property 1', {
        Default: 'default',
        Hover: 'hover',
        Selected: 'selected',
      }),
      icon: figma.instance('Icon'),
    },
    example: ({ state, icon }) => (
      <SidebarButton state={state} icon={icon} />
    ),
  },
)

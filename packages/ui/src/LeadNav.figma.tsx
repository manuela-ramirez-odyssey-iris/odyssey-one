import figma from '@figma/code-connect'
import LeadNav from './LeadNav'

figma.connect(
  LeadNav,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=5902-1145',
  {
    imports: ["import { LeadNav } from '@odyssey/ui'"],
    props: {
      logo: figma.instance('Logo'),
      showMenu: figma.boolean('Show menu'),
      active: figma.enum('Menu state', {
        Off: false,
        On: true,
      }),
    },
    example: ({ logo, showMenu, active }) => (
      <LeadNav logo={logo} showMenu={showMenu} active={active} />
    ),
  },
)

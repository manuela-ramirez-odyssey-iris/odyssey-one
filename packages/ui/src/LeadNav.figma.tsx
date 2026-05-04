import figma from '@figma/code-connect'
import LeadNav from './LeadNav'

figma.connect(
  LeadNav,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=639-564',
  {
    imports: ["import { LeadNav } from '@odyssey/ui'"],
    props: {
      logo: figma.instance('Logo'),
    },
    example: ({ logo }) => (
      <LeadNav logo={logo} />
    ),
  },
)

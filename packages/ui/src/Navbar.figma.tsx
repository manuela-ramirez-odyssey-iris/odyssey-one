import figma from '@figma/code-connect'
import Navbar from './Navbar'

figma.connect(
  Navbar,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1661-206',
  {
    imports: ["import { Navbar } from '@odyssey/ui'"],
    props: {
      lead: figma.instance('LeadNav'),
      search: figma.instance('GlobalSearch'),
      trail: figma.instance('TrailNav'),
    },
    example: ({ lead, search, trail }) => (
      <Navbar lead={lead} search={search} trail={trail} />
    ),
  },
)

import figma from '@figma/code-connect'
import Navbar from './Navbar'

// Navbar is now a component SET (5152:3908) with variant Context = Internal | External.
// Mapping the set (not the old 1661:206 Internal-only node) so Code Connect resolves
// both variants. Two connect calls — one per variant — instead of a ternary in the
// example (ternaries trip the Code Connect parser), same idiom as TrailNav's Mode split.

figma.connect(
  Navbar,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=5152-3908',
  {
    imports: ["import { Navbar } from '@odyssey/ui'"],
    variant: { Context: 'Internal' },
    props: {
      lead: figma.instance('LeadNav'),
      search: figma.instance('GlobalSearch'),
      trail: figma.instance('TrailNav'),
    },
    example: ({ lead, search, trail }) => (
      <Navbar lead={lead} search={search} trail={trail} context="internal" />
    ),
  },
)

figma.connect(
  Navbar,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=5152-3908',
  {
    imports: ["import { Navbar } from '@odyssey/ui'"],
    variant: { Context: 'External' },
    props: {
      lead: figma.instance('LeadNav'),
      search: figma.instance('GlobalSearch'),
      trail: figma.instance('TrailNav'),
    },
    example: ({ lead, search, trail }) => (
      <Navbar lead={lead} search={search} trail={trail} context="external" />
    ),
  },
)

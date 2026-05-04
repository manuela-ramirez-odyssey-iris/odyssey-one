import figma from '@figma/code-connect'
import GlobalSearch from './GlobalSearch'

figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    props: {
      dropdownIcon: figma.instance('Dropdown icon'),
    },
    example: ({ dropdownIcon }) => (
      <GlobalSearch dropdownIcon={dropdownIcon} />
    ),
  },
)

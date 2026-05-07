import figma from '@figma/code-connect'
import GlobalSearch from './GlobalSearch'

// State=Default | State=Focused — both render the search bar (mode='search')
figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Default' },
    props: {
      dropdownIcon: figma.instance('Dropdown icon'),
    },
    example: ({ dropdownIcon }) => (
      <GlobalSearch mode="search" dropdownIcon={dropdownIcon} />
    ),
  },
)

figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Focused' },
    props: {
      dropdownIcon: figma.instance('Dropdown icon'),
    },
    example: ({ dropdownIcon }) => (
      <GlobalSearch mode="search" dropdownOpen dropdownIcon={dropdownIcon} />
    ),
  },
)

// State=Title — renders centered title text (mode='title')
figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Title' },
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) => (
      <GlobalSearch mode="title" title={title} />
    ),
  },
)

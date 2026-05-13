import figma from '@figma/code-connect'
import GlobalSearch from './GlobalSearch'

// State=Default | State=Focused — both render the search bar (mode='search').
// Visual difference between the two is internal focus state; one mapping covers both.
figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Default' },
    example: () => <GlobalSearch mode="search" />,
  },
)

figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Focused' },
    example: () => <GlobalSearch mode="search" />,
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

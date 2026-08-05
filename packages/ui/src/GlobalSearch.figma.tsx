import figma from '@figma/code-connect'
import GlobalSearch from './GlobalSearch'

// State=Default | State=Focused — both render the search bar (mode='search').
// Visual difference between the two is internal focus state; one mapping covers both.
// `Copy Search Icon` sits before `Clear Search Icon` in both — it renders only
// when `onCopy` is wired, so the snippet passes one.
figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Default' },
    example: () => <GlobalSearch mode="search" onCopy={() => {}} />,
  },
)

figma.connect(
  GlobalSearch,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=658-18',
  {
    imports: ["import { GlobalSearch } from '@odyssey/ui'"],
    variant: { State: 'Focused' },
    example: () => <GlobalSearch mode="search" onCopy={() => {}} />,
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

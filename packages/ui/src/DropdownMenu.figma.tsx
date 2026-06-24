import figma from '@figma/code-connect'
import DropdownMenu from './DropdownMenu'
import MenuRow from './MenuRow'

// Master: DropdownMenu set 3600:1879 (Components-Molecules).
// State=Content → children (typically flat MenuRow atoms; a MenuDropdown group
// also composes); State=Empty → the centered empty message (Empty message TEXT →
// emptyMessage). In code the state is derived from children presence.
figma.connect(
  DropdownMenu,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3600-1879',
  {
    variant: { State: 'Content' },
    imports: ["import { DropdownMenu, MenuRow } from '@odyssey/ui'"],
    example: () => (
      <DropdownMenu>
        <MenuRow label="10 per page" selected />
        <MenuRow label="25 per page" />
        <MenuRow label="50 per page" />
      </DropdownMenu>
    ),
  },
)

figma.connect(
  DropdownMenu,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3600-1879',
  {
    variant: { State: 'Empty' },
    imports: ["import { DropdownMenu } from '@odyssey/ui'"],
    props: {
      emptyMessage: figma.string('Empty message'),
    },
    example: ({ emptyMessage }) => <DropdownMenu emptyMessage={emptyMessage} />,
  },
)

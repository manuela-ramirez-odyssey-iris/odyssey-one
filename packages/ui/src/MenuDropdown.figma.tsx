import figma from '@figma/code-connect'
import MenuDropdown from './MenuDropdown'
import MenuRow from './MenuRow'

// Master: Components-Molecules page, node 1981:79 (MenuDropdown).
// The `ContentSlot` SLOT property is consumer-driven — mirrors the Widget pattern
// where slot content is not exposed as a Figma prop. Example renders a placeholder
// MenuRow child to show typical composition.
figma.connect(
  MenuDropdown,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1981-79',
  {
    imports: ["import { MenuDropdown, MenuRow } from '@odyssey/ui'"],
    props: {
      title: figma.textContent('Title'),
      expanded: figma.boolean('Expanded'),
    },
    example: ({ title, expanded }) => (
      <MenuDropdown title={title} expanded={expanded}>
        <MenuRow label="Total Orders" />
      </MenuDropdown>
    ),
  },
)

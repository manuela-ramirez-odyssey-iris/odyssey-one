import figma from '@figma/code-connect'
import MenuRow from './MenuRow'

// Master: Components-Molecules page, MenuRow set 1973:87.
// `Type` (Select / Navigate / Navigate-bordered / Draggable) maps to the semantic
// `variant`; the `-bordered` value additionally sets `bordered`. `State=Selected`
// (Efrain's "Focused" renamed) maps to `selected`; Hover/Pressed are runtime CSS,
// not props, so they collapse to the same snippet.
figma.connect(
  MenuRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1973-87',
  {
    imports: ["import { MenuRow } from '@odyssey/ui'"],
    props: {
      label: figma.string('Text Row'),
      leadingIcon: figma.boolean('Show Leading Icon', {
        true: figma.instance('Leading Icon'),
        false: undefined,
      }),
      variant: figma.enum('Type', {
        Select: 'select',
        Navigate: 'navigate',
        'Navigate-bordered': 'navigate',
        Draggable: 'draggable',
      }),
      bordered: figma.enum('Type', { 'Navigate-bordered': true }),
      selected: figma.enum('State', { Selected: true }),
    },
    example: ({ label, leadingIcon, variant, bordered, selected }) => (
      <MenuRow
        label={label}
        variant={variant}
        bordered={bordered}
        selected={selected}
        leadingIcon={leadingIcon}
      />
    ),
  },
)

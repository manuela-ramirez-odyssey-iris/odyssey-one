import figma from '@figma/code-connect'
import SidebarButton from './SidebarButton'

figma.connect(
  SidebarButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=514-2479',
  {
    imports: ["import { SidebarButton } from '@odyssey/ui'"],
    props: {
      type: figma.enum('Type', {
        Collapsed: 'collapsed',
        Domain: 'domain',
        Submenu: 'submenu',
      }),
      state: figma.enum('State', {
        Default: 'default',
        Hover: 'hover',
        Selected: 'selected',
      }),
      icon: figma.instance('Icon'),
      label: figma.string('Label'),
      // Omitting `count` is what hides the badge — there is no `showCount` prop.
      count: figma.boolean('Show count', {
        true: figma.string('Count'),
        false: undefined,
      }),
      // Figma swaps a chevron INSTANCE; code names a direction. The parser
      // cannot read which glyph the instance resolves to, so this emits the
      // disclosure default and the direction is the consumer's to set.
      chevron: figma.boolean('Show chevron', {
        true: 'down',
        false: undefined,
      }),
    },
    example: ({ type, state, icon, label, count, chevron }) => (
      <SidebarButton
        type={type}
        state={state}
        icon={icon}
        label={label}
        count={count}
        chevron={chevron}
      />
    ),
  },
)

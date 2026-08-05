import figma from '@figma/code-connect'
import MenuRowRadio from './MenuRowRadio'

figma.connect(
  MenuRowRadio,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3447-6593',
  {
    imports: ["import { MenuRowRadio } from '@odyssey/ui'"],
    props: {
      label: figma.string('Text Row'),
      draggable: figma.boolean('Draggable'),
      badge: figma.boolean('Show Badge', { true: 'by: username', false: undefined }),
      selected: figma.enum('State', { Selected: true, Default: false, Hover: false, Pressed: false, Disabled: false }),
      disabled: figma.enum('State', { Disabled: true, Default: false, Hover: false, Pressed: false, Selected: false }),
    },
    example: ({ label, draggable, badge, selected, disabled }) => (
      <MenuRowRadio label={label} draggable={draggable} badge={badge} selected={selected} disabled={disabled} onSelect={() => {}} onNavigate={() => {}} />
    ),
  },
)

import figma from '@figma/code-connect'
import MenuRowCheckbox from './MenuRowCheckbox'

figma.connect(
  MenuRowCheckbox,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3447-6592',
  {
    imports: ["import { MenuRowCheckbox } from '@odyssey/ui'"],
    props: {
      label: figma.string('Text Row'),
      draggable: figma.boolean('Draggable'),
      bordered: figma.enum('Type', { Bordered: true, Default: false }),
      checked: figma.enum('State', { Selected: true, Default: false, Hover: false, Pressed: false, Disabled: false }),
      disabled: figma.enum('State', { Disabled: true, Default: false, Hover: false, Pressed: false, Selected: false }),
    },
    example: ({ label, draggable, bordered, checked, disabled }) => (
      <MenuRowCheckbox label={label} draggable={draggable} bordered={bordered} checked={checked} disabled={disabled} onToggle={() => {}} />
    ),
  },
)

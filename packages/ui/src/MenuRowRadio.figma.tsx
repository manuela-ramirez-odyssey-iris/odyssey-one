import figma from '@figma/code-connect'
import MenuRowRadio from './MenuRowRadio'

figma.connect(
  MenuRowRadio,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3447-6593',
  {
    imports: ["import { MenuRowRadio } from '@odyssey/ui'"],
    props: {
      label: figma.string('Text Row'),
      selected: figma.enum('State', { Selected: true, Default: false, Hover: false, Pressed: false, Disabled: false }),
      disabled: figma.enum('State', { Disabled: true, Default: false, Hover: false, Pressed: false, Selected: false }),
    },
    example: ({ label, selected, disabled }) => (
      <MenuRowRadio label={label} selected={selected} disabled={disabled} onSelect={() => {}} onNavigate={() => {}} />
    ),
  },
)

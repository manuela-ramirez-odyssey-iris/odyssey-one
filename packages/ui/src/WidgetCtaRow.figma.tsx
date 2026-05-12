import figma from '@figma/code-connect'
import WidgetCtaRow from './WidgetCtaRow'

// Master: Components-Molecules page, node 1927:84 (WidgetCtaRow).
figma.connect(
  WidgetCtaRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1927-84',
  {
    imports: ["import { WidgetCtaRow } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
      icon: figma.instance('Icon'),
    },
    example: ({ label, icon }) => (
      <WidgetCtaRow
        icon={icon}
        label={label}
        onClick={() => {}}
      />
    ),
  },
)

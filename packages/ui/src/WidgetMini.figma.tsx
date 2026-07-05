import figma from '@figma/code-connect'
import WidgetMini from './WidgetMini'

// Master: `WidgetMini` set 4103:5027 (Components-Molecules). Compact metric
// filter card — count + label + slim 64px donut. `State` VARIANT
// {Default, Selected} → `selected` boolean; `Value`/`Label`/`Percentage` TEXT
// props → value/label/percentage (percentage is numeric in code and renders
// its own "N%" center text). Hover is code-only. NOT a Widget variant — kept
// out of the Home widget picker by design.
figma.connect(
  WidgetMini,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4103-5027',
  {
    imports: ["import { WidgetMini } from '@odyssey/ui'"],
    props: {
      selected: figma.enum('State', { Default: false, Selected: true }),
      value: figma.string('Value'),
      label: figma.string('Label'),
    },
    example: ({ selected, value, label }) => (
      <WidgetMini value={value} label={label} percentage={24} selected={selected} />
    ),
  },
)

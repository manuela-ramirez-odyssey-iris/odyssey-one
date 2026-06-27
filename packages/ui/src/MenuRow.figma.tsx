import figma from '@figma/code-connect'
import MenuRow from './MenuRow'

// Master: Components-Molecules, MenuRow set 1973:87 — Type=Select (single-select base).
// `Draggable` boolean → draggable (trailing grip). `State=Selected` → selected,
// `State=Disable` → disabled; Default/Hover/Pressed are runtime CSS, so they collapse
// to the base snippet. navigate → MenuRowRadio, multi-select → MenuRowCheckbox.
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
      draggable: figma.boolean('Draggable'),
      selected: figma.enum('State', { Selected: true }),
      disabled: figma.enum('State', { Disable: true }),
    },
    example: ({ label, leadingIcon, draggable, selected, disabled }) => (
      <MenuRow
        label={label}
        draggable={draggable}
        selected={selected}
        disabled={disabled}
        leadingIcon={leadingIcon}
      />
    ),
  },
)

import figma from '@figma/code-connect'
import Checkbox from './Checkbox'

// Master: `Checkbox` set 2821:330 (Components-Atoms). `State` VARIANT
// {Unchecked, Checked, Indeterminate} maps to the `checked` + `indeterminate`
// booleans; `Disabled` VARIANT → `disabled`; `Show label` BOOLEAN → `showLabel`;
// `Label` TEXT → `label`. Hover/focus are CSS-only (not Figma variants).
figma.connect(
  Checkbox,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2821-330',
  {
    imports: ["import { Checkbox } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      showLabel: figma.boolean('Show label'),
      checked: figma.enum('State', { Checked: true, Unchecked: false, Indeterminate: false }),
      indeterminate: figma.enum('State', { Indeterminate: true, Checked: false, Unchecked: false }),
      disabled: figma.enum('Disabled', { True: true, False: false }),
    },
    example: ({ label, showLabel, checked, indeterminate, disabled }) => (
      <Checkbox
        label={label}
        showLabel={showLabel}
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
      />
    ),
  },
)

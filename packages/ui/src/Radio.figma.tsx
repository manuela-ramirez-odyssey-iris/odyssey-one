import figma from '@figma/code-connect'
import Radio from './Radio'

// Master: `Radio` set 2824:330 (Components-Atoms). `State` VARIANT
// {Unchecked, Checked} → `checked`; `Disabled` VARIANT → `disabled`;
// `Show label` BOOLEAN → `showLabel`; `Label` TEXT → `label`. Group radios by
// passing a shared `name`. Hover/focus are CSS-only (not Figma variants).
figma.connect(
  Radio,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2824-330',
  {
    imports: ["import { Radio } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      showLabel: figma.boolean('Show label'),
      checked: figma.enum('State', { Checked: true, Unchecked: false }),
      disabled: figma.enum('Disabled', { True: true, False: false }),
    },
    example: ({ label, showLabel, checked, disabled }) => (
      <Radio label={label} showLabel={showLabel} checked={checked} disabled={disabled} />
    ),
  },
)

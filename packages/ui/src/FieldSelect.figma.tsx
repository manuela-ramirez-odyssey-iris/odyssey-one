import figma from '@figma/code-connect'
import FieldSelect from './FieldSelect'

// Master: `FieldSelect` set 2627:153 (Components-Atoms). `Variant` (Leading|Trailing)
// → `variant`; `State` (Default/Focus/Disabled/Error Default/Error) → `state`. The
// label text is consumer-supplied (no Figma TEXT property — variants hardcode
// "+1"/"Select" as placeholders). Leading reddens label+chevron on error; trailing
// reddens the divider only — deliberate, handled in CSS.
figma.connect(
  FieldSelect,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2627-153',
  {
    imports: ["import { FieldSelect } from '@odyssey/ui'"],
    props: {
      variant: figma.enum('Variant', { Leading: 'leading', Trailing: 'trailing' }),
      state: figma.enum('State', {
        Default: 'default',
        Focus: 'focus',
        Disabled: 'disabled',
        'Error Default': 'error-default',
        Error: 'error',
      }),
    },
    example: ({ variant, state }) => (
      <FieldSelect variant={variant} state={state} label="Select" />
    ),
  },
)

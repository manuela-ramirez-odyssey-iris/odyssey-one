import figma from '@figma/code-connect'
import FormField from './FormField'

// Master: Components-Molecules page, FormField component set 2255:98.
// State=Default|Focus|Error × Show icon BOOLEAN × Icon INSTANCE_SWAP.
// Default and Focus map to no error (focus is a CSS :focus-within pseudo-state
// at runtime). Error maps to an example error message — consumer supplies the
// real string via the `error` prop.
figma.connect(
  FormField,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2255-98',
  {
    imports: ["import { FormField } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
      placeholder: figma.textContent('Placeholder'),
      trailingIcon: figma.boolean('Show icon', {
        true: figma.instance('Icon'),
        false: undefined,
      }),
      error: figma.enum('State', {
        Default: undefined,
        Focus: undefined,
        Error: 'Invalid input',
      }),
    },
    example: ({ label, placeholder, trailingIcon, error }) => (
      <FormField label={label} placeholder={placeholder} trailingIcon={trailingIcon} error={error} />
    ),
  },
)

import figma from '@figma/code-connect'
import FormField from './FormField'

// Master: Components-Molecules page, redesigned FormField set 2602:1424
// (supersedes the retired 2255:98). The Figma property set maps directly to the
// React API: Label/Placeholder TEXT, Show label / Show info icon BOOLEAN, the
// Show+Swap icon pairs → node props, Show X Icon → onClear. The 18-value `State`
// axis collapses in code: error-states → an `error` string, disabled-states →
// `disabled`; focused/filled are runtime (:focus-within / value present). The
// leading/trailing FieldSelect slots are code-driven ({label,onClick}) — not
// mapped here.
figma.connect(
  FormField,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2602-1424',
  {
    imports: ["import { FormField } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      showLabel: figma.boolean('Show label'),
      showInfo: figma.boolean('Show info icon'),
      placeholder: figma.string('Placeholder'),
      leadingIcon: figma.boolean('Show Leading Icon', {
        true: figma.instance('Leading Icon'),
        false: undefined,
      }),
      trailingIcon: figma.boolean('Show Trailing Icon', {
        true: figma.instance('Trailing Icon'),
        false: undefined,
      }),
      error: figma.enum('State', {
        Error: 'Invalid input',
        'Focused Error': 'Invalid input',
        'Error Leading Button': 'Invalid input',
        'Focused Error Leading Button': 'Invalid input',
        'Error Trailing Button': 'Invalid input',
        'Focused Error Trailing Button': 'Invalid input',
      }),
      disabled: figma.enum('State', {
        Disabled: true,
        'Disabled Leading Button': true,
        'Disabled Trailing Button': true,
      }),
    },
    example: ({ label, showLabel, showInfo, placeholder, leadingIcon, trailingIcon, error, disabled }) => (
      <FormField
        label={label}
        showLabel={showLabel}
        showInfo={showInfo}
        placeholder={placeholder}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        error={error}
        disabled={disabled}
      />
    ),
  },
)

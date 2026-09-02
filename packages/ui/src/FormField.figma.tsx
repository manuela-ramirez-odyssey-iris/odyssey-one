import figma from '@figma/code-connect'
import FormField from './FormField'
import Badge from './Badge'

// Master: Components-Molecules page, redesigned FormField set 2602:1424
// (supersedes the retired 2255:98). The Figma property set maps directly to the
// React API: Label/Placeholder TEXT, Show label / Show info icon BOOLEAN, the
// Show+Swap icon pairs → node props, Show X Icon → onClear. The 18-value `State`
// axis collapses in code: error-states → an `error` string, disabled-states →
// `disabled`; focused/filled are runtime (:focus-within / value present). The
// leading/trailing FieldSelect slots are code-driven ({label,onClick}) — not
// mapped here.
//
// Two new `State` variants — `Radio Trailing Button` (5432:19/5432:20) and
// `Radio Selected Trailing Button` (5432:27/5432:28) — map to the `radio`
// prop (`{ checked, onChange, name, value }`) via the same `State` enum this
// file already uses for `error`/`disabled`. Unselected → `checked: false`
// (unchecked = the whole field disabled, per `isDisabled` in FormField.jsx);
// selected → `checked: true`. `onChange`/`name`/`value` have no Figma
// counterpart (runtime wiring), so the sample supplies a no-op/placeholder.
//
// `Show badge` BOOLEAN (default false, id `Show badge#5454:0`) → `labelBadge`
// (a node; the caller passes a `Badge`). Boolean value mapping, no ternary
// (parser trap, S130) — mirrors the `leadingIcon`/`trailingIcon` mappings
// below.
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
      radio: figma.enum('State', {
        'Radio Trailing Button': { checked: false, onChange: () => {}, name: 'field', value: 'option' },
        'Radio Selected Trailing Button': { checked: true, onChange: () => {}, name: 'field', value: 'option' },
      }),
      labelBadge: figma.boolean('Show badge', {
        true: <Badge>New</Badge>,
        false: undefined,
      }),
    },
    example: ({ label, showLabel, showInfo, placeholder, leadingIcon, trailingIcon, error, disabled, radio, labelBadge }) => (
      <FormField
        label={label}
        showLabel={showLabel}
        showInfo={showInfo}
        placeholder={placeholder}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        error={error}
        disabled={disabled}
        radio={radio}
        labelBadge={labelBadge}
      />
    ),
  },
)

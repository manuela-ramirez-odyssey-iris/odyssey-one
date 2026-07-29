import figma from '@figma/code-connect'
import ComboBox from './ComboBox'

// FIGMA: master updated S94 (SearchField→ComboBox + Select variant); Code Connect publish owed at batch close.
figma.connect(
  ComboBox,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4715-6142',
  {
    imports: ["import { ComboBox } from '@odyssey/ui'"],
    props: {
      variant: figma.enum('Variant', {
        Search: 'search',
        Select: 'select',
      }),
      placeholder: figma.string('Placeholder'),
      showLabel: figma.boolean('Show label'),
      label: figma.string('Label'),
      showInfoIcon: figma.boolean('Show info icon'),
      // `Content` SLOT (gated by the `Show results` boolean) → the `results` dropdown slot.
      // Typically a <FieldSearchResults>; the shell chrome lives on .search-field__results.
      results: figma.instance('Content'),
      // State axis (S99 error/validated + S101 disabled). Focused states are
      // runtime-only in code (:focus-within) — no prop mapping.
      error: figma.enum('State', {
        Error: 'Error text',
        'Focused Error': 'Error text',
      }),
      validated: figma.enum('State', {
        Validated: true,
        'Focused Validated': true,
      }),
      disabled: figma.enum('State', {
        Disabled: true,
      }),
    },
    example: ({ variant, placeholder, showLabel, label, showInfoIcon, results, error, validated, disabled }) => (
      <ComboBox
        variant={variant}
        placeholder={placeholder}
        showLabel={showLabel}
        label={label}
        showInfoIcon={showInfoIcon}
        value=""
        onChange={() => {}}
        results={results}
        error={error}
        validated={validated}
        disabled={disabled}
      />
    ),
  },
)

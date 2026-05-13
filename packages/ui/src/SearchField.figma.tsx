import figma from '@figma/code-connect'
import SearchField from './SearchField'

figma.connect(
  SearchField,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1959-76',
  {
    imports: ["import { SearchField } from '@odyssey/ui'"],
    props: {
      placeholder: figma.string('Placeholder'),
      showLabel: figma.boolean('Show label'),
      label: figma.string('Label'),
      showInfoIcon: figma.boolean('Show info icon'),
    },
    example: ({ placeholder, showLabel, label, showInfoIcon }) => (
      <SearchField
        placeholder={placeholder}
        showLabel={showLabel}
        label={label}
        showInfoIcon={showInfoIcon}
        value=""
        onChange={() => {}}
      />
    ),
  },
)

import figma from '@figma/code-connect'
import FilterSuggestions from './FilterSuggestions'

figma.connect(
  FilterSuggestions,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2400-2',
  {
    imports: ["import { FilterSuggestions } from '@odyssey/ui'"],
    props: {
      // The chip column is data-driven (the `items` array) — not modelled as Figma
      // component properties. Only the section title is editable on the master.
      title: figma.string('Title'),
    },
    example: ({ title }) => (
      <FilterSuggestions
        title={title}
        items={[
          'Status: Delivered',
          'Client: Delaware Inc.',
          'Carrier: Delaware Logistic Service',
          'Status: At Risk Delivery',
        ]}
        onSelect={() => {}}
      />
    ),
  },
)

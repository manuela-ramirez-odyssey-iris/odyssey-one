import figma from '@figma/code-connect'
import MultiSelect from './MultiSelect'

// Master: `MultiSelect` at 4536:5333.
figma.connect(
  MultiSelect,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4536-5333',
  {
    imports: ["import { MultiSelect } from '@odyssey/ui'"],
    props: {
      // Figma is a visual master (Closed/Open state); the code API is
      // options/selected/onChange — driven by data, no 1:1 Figma property to map.
    },
    example: () => (
      <MultiSelect
        label="Special Services"
        options={[
          { value: 'palexg', label: 'PALEXG', description: 'Pallet Jack' },
          { value: 'lftg', label: 'LFTG', description: 'Liftgate Service' },
        ]}
        selected={['palexg']}
        onChange={() => {}}
      />
    ),
  },
)

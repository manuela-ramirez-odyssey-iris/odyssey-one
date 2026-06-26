import figma from '@figma/code-connect'
import Dropdown from './Dropdown'

// Master: Dropdown set 3644:549 (Components-Molecules) — interactive Closed/Open
// variants. Behavioral composition (DropdownButton + DropdownMenu + MenuRow
// options); open/close + selection are runtime, so this maps to a usage example.
figma.connect(
  Dropdown,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3644-549',
  {
    imports: ["import { Dropdown } from '@odyssey/ui'"],
    example: () => (
      <Dropdown
        value="50"
        options={[
          { value: '10', label: '10' },
          { value: '25', label: '25' },
          { value: '50', label: '50' },
          { value: '100', label: '100' },
        ]}
        onChange={() => {}}
      />
    ),
  },
)

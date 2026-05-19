import figma from '@figma/code-connect'
import CustomerRow from './CustomerRow'

// Master: Components-Molecules page, set `CustomerRow` at 2029:461.
// Variant axes: Mode=List|Result × Favorite=False|True (4 variants total).
// Mode drives row size + which trailing action shows (Trash vs Star toggle);
// Favorite drives the green Badge overlay (List mode) or filled star (Result mode).
figma.connect(
  CustomerRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2029-461',
  {
    imports: ["import { CustomerRow } from '@odyssey/ui'"],
    props: {
      mode: figma.enum('Mode', { List: 'list', Result: 'result' }),
      favorite: figma.enum('Favorite', { True: true, False: false }),
      label: figma.string('Label'),
      icon: figma.instance('Icon'),
    },
    example: ({ mode, favorite, label, icon }) => (
      <CustomerRow mode={mode} favorite={favorite} label={label} icon={icon} />
    ),
  },
)

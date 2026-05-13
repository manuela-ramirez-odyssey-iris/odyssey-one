import figma from '@figma/code-connect'
import MenuRow from './MenuRow'

// Master: Components-Molecules page, node 1973:87 (MenuRow set).
// Visual states (Default / Hover / Pressed) are CSS-only in code — pseudo-classes
// at runtime — so all three variants resolve to the same JSX snippet.
figma.connect(
  MenuRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1973-87',
  {
    variant: { State: 'Default' },
    imports: ["import { MenuRow } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
    },
    example: ({ label }) => <MenuRow label={label} />,
  },
)

figma.connect(
  MenuRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1973-87',
  {
    variant: { State: 'Hover' },
    imports: ["import { MenuRow } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
    },
    example: ({ label }) => <MenuRow label={label} />,
  },
)

figma.connect(
  MenuRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1973-87',
  {
    variant: { State: 'Pressed' },
    imports: ["import { MenuRow } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
    },
    example: ({ label }) => <MenuRow label={label} />,
  },
)

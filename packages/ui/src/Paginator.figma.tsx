import figma from '@figma/code-connect'
import Paginator from './Paginator'

// Master: Paginator 3272:3890 (Components-Molecules). Presentation-only — driven
// by a runtime @tanstack/react-table instance (no Figma variant props), so this
// maps to a usage example.
figma.connect(
  Paginator,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3272-3890',
  {
    imports: ["import { Paginator } from '@odyssey/ui'"],
    example: () => <Paginator table={table} pageSizeOptions={[10, 25, 50, 100]} />,
  },
)

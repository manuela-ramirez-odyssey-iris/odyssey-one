import figma from '@figma/code-connect'
import EmptyState from './EmptyState'

// Master: Components-Atoms page, Panels artboard, `EmptyState` at 2159:295.
// NOTE: the Figma master no longer exposes Icon/Message component properties
// (they were removed when the component was restructured), so the mapping uses a
// static example. The React API still accepts `icon` + `message` props.
figma.connect(
  EmptyState,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2159-295',
  {
    imports: ["import { EmptyState } from '@odyssey/ui'"],
    example: () => <EmptyState message="No items to show yet." />,
  },
)

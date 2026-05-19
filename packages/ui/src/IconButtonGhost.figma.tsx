import figma from '@figma/code-connect'
import IconButtonGhost from './IconButtonGhost'

// Master: Components-Atoms page, set `IconButtonGhost` at 2138:304.
// State (Idle | Hover | Pressed) is CSS-driven in code (`:hover` / `:active`),
// so the Figma State variant axis maps to nothing on the React side — the
// snippet shows the static structure and the running app handles transitions.
figma.connect(
  IconButtonGhost,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2138-304',
  {
    imports: ["import { IconButtonGhost } from '@odyssey/ui'"],
    props: {
      icon: figma.instance('Icon'),
    },
    example: ({ icon }) => (
      <IconButtonGhost icon={icon} onClick={() => {}} ariaLabel="Action" />
    ),
  },
)

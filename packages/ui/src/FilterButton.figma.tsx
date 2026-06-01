import figma from '@figma/code-connect'
import FilterButton from './FilterButton'

// State variants map to interaction states. Hover + Pressed are CSS-only
// (:hover / :active) and don't correspond to a prop; Active = drawer-open
// (the `active` prop). Default/Hover/Pressed all render the resting markup.
// The count badge is owned by GlobalSearch, not FilterButton.
figma.connect(
  FilterButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2347-325',
  {
    imports: ["import { FilterButton } from '@odyssey/ui'"],
    props: {
      active: figma.enum('State', {
        Default: false,
        Hover: false,
        Pressed: false,
        Active: true,
      }),
    },
    example: ({ active }) => <FilterButton active={active} />,
  },
)

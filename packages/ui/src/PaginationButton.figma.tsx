import figma from '@figma/code-connect'
import PaginationButton from './PaginationButton'

const URL =
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3234-3857'

// Figma `Property 1` maps to the React `variant` (+ `current` for the active page).
// The `State` axis (Idle/Hover/Pressed) is CSS-driven (:hover / :active) — not a prop —
// so each kind gets one variant-restricted mapping.

// Primary = active/current page.
figma.connect(PaginationButton, URL, {
  variant: { 'Property 1': 'Primary' },
  imports: ["import { PaginationButton } from '@odyssey/ui'"],
  example: () => (
    <PaginationButton variant="page" current>
      1
    </PaginationButton>
  ),
})

// Secondary = inactive page.
figma.connect(PaginationButton, URL, {
  variant: { 'Property 1': 'Secondary' },
  imports: ["import { PaginationButton } from '@odyssey/ui'"],
  example: () => <PaginationButton variant="page">1</PaginationButton>,
})

// Icon Left = previous-page arrow.
figma.connect(PaginationButton, URL, {
  variant: { 'Property 1': 'Icon Left' },
  imports: ["import { PaginationButton } from '@odyssey/ui'"],
  example: () => <PaginationButton variant="prev" />,
})

// Icon Right = next-page arrow.
figma.connect(PaginationButton, URL, {
  variant: { 'Property 1': 'Icon Right' },
  imports: ["import { PaginationButton } from '@odyssey/ui'"],
  example: () => <PaginationButton variant="next" />,
})

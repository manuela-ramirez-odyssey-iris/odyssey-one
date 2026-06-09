import figma from '@figma/code-connect'
import PillTab from './PillTab'

// Master: `PillTab` set 2787:330 (Components-Atoms, moved to the tabs artboard).
// Built from our primitives (not the foreign 36-variant Tab set). `Selected`
// VARIANT → React `selected` boolean; `Label` TEXT; `Show count` BOOLEAN. The
// count number lives on the nested (exposed) Badge metric instance in Figma; in
// code it's the `count` prop rendered as <Badge variant="metric">.
figma.connect(
  PillTab,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2787-330',
  {
    imports: ["import { PillTab } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      selected: figma.enum('Selected', { True: true, False: false }),
      showCount: figma.boolean('Show count'),
    },
    example: ({ label, selected, showCount }) => (
      <PillTab label={label} count={3} selected={selected} showCount={showCount} />
    ),
  },
)

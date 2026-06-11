import figma from '@figma/code-connect'
import Tab from './Tab'

figma.connect(
  Tab,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3057-362',
  {
    imports: ["import { Tab } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      current: figma.enum('Current', {
        True: true,
        False: false,
      }),
      // The count VALUE lives in the exposed nested Badge (metric) — Figma
      // can't pierce nested instances, so the boolean maps to a sample count.
      count: figma.boolean('Show count', {
        true: 4,
        false: undefined,
      }),
    },
    example: ({ label, current, count }) => (
      <Tab label={label} current={current} count={count} />
    ),
  },
)

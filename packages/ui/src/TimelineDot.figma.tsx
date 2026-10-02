import figma from '@figma/code-connect'
import TimelineDot from './TimelineDot'

// Master: `TimelineDot` SET 6945:301 (Components-Atoms › Badges). One `Color`
// variant axis. Code defaults to gray where Figma defaults to amber (unknown
// → neutral); the mapping is 1:1 otherwise.
figma.connect(
  TimelineDot,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=6945-301',
  {
    props: {
      color: figma.enum('Color', {
        amber: 'amber',
        blue: 'blue',
        green: 'green',
        red: 'red',
        purple: 'purple',
        gray: 'gray',
        info: 'info',
      }),
    },
    imports: ["import { TimelineDot } from '@odyssey/ui'"],
    example: ({ color }) => <TimelineDot color={color} />,
  },
)

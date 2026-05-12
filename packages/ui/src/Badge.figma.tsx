import figma from '@figma/code-connect'
import Badge from './Badge'

figma.connect(
  Badge,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27',
  {
    imports: ["import { Badge } from '@odyssey/ui'"],
    props: {
      variant: figma.enum('Variant', {
        amber: 'amber',
        blue: 'blue',
        green: 'green',
        red: 'red',
        purple: 'purple',
        gray: 'gray',
        notification: 'notification',
        metric: 'metric',
      }),
      statusDot: figma.boolean('Show dot'),
      leftIcon: figma.boolean('Show left icon', {
        true: figma.instance('Left icon'),
        false: undefined,
      }),
      rightIcon: figma.boolean('Show right icon', {
        true: figma.instance('Right icon'),
        false: undefined,
      }),
      label: figma.textContent('Badge'),
    },
    example: ({ variant, statusDot, leftIcon, rightIcon, label }) => (
      <Badge
        variant={variant}
        statusDot={statusDot}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
      >
        {label}
      </Badge>
    ),
  },
)

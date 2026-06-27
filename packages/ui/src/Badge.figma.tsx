import figma from '@figma/code-connect'
import Badge from './Badge'

// Generic mapping for text-bearing + notification + metric variants.
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
        // "gray selected" is the SELECTED (toggle-on) state of the gray badge,
        // not a separate React variant — it maps to `gray`. The selected look is
        // driven in code by `aria-pressed="true"` on the `.badge-interactive`
        // toggle button wrapping the Badge.
        // ('gray focused' kept transitionally until Efrain renames the Figma
        // variant to 'gray selected'; remove once Figma is renamed.)
        'gray selected': 'gray',
        'gray focused': 'gray',
        notification: 'notification',
        count: 'count',
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

// Dedicated mapping for the favorite indicator (icon-only, no children, no slots).
figma.connect(
  Badge,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27',
  {
    variant: { Variant: 'favorite' },
    imports: ["import { Badge } from '@odyssey/ui'"],
    example: () => <Badge variant="favorite" />,
  },
)

// Shape=Icon — square soft-tint, icon-only semantic badges (baked clock/info).
figma.connect(
  Badge,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27',
  {
    variant: { Shape: 'Icon' },
    imports: ["import { Badge } from '@odyssey/ui'"],
    props: {
      variant: figma.enum('Variant', { time: 'time', info: 'info' }),
    },
    example: ({ variant }) => <Badge variant={variant} iconOnly />,
  },
)

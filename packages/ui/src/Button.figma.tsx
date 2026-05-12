import figma from '@figma/code-connect'
import Button from './Button'

figma.connect(
  Button,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1307-333',
  {
    imports: ["import { Button } from '@odyssey/ui'"],
    props: {
      variant: figma.enum('Variant', {
        Primary: 'primary',
        Secondary: 'secondary',
        Outline: 'outline',
        Ghost: 'ghost',
      }),
      size: figma.enum('Size', {
        sm: 'sm',
        md: 'md',
        lg: 'lg',
      }),
      // Idle/Hover/Pressed all map to disabled:false — those are CSS pseudo-classes at runtime.
      // Only Figma's State=Disabled flips the React `disabled` prop.
      disabled: figma.enum('State', {
        Idle: false,
        Hover: false,
        Pressed: false,
        Disabled: true,
      }),
      icon: figma.boolean('Show icon', {
        true: figma.instance('Icon'),
        false: undefined,
      }),
      label: figma.textContent('Label'),
    },
    example: ({ variant, size, disabled, icon, label }) => (
      <Button variant={variant} size={size} disabled={disabled} icon={icon}>
        {label}
      </Button>
    ),
  },
)

// Separate Link Button variant set at 1895:7 (inside "Link Buttons" frame).
// Maps to the same Button atom with variant="link" + iconRight slot.
// State=Idle|Hover|Pressed — Hover/Pressed are CSS pseudo-classes at runtime,
// no React `disabled` flip (ButtonLink doesn't have a Disabled variant yet).
figma.connect(
  Button,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1895-7',
  {
    imports: ["import { Button } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
      iconRight: figma.boolean('Show icon', {
        true: figma.instance('Icon'),
        false: undefined,
      }),
    },
    example: ({ label, iconRight }) => (
      <Button variant="link" size="sm" iconRight={iconRight}>
        {label}
      </Button>
    ),
  },
)

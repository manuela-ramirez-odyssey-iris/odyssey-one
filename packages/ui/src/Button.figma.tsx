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
        Error: 'error',
        Icon: 'icon',
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

// ButtonLink variant set at 1895:7 (Components-Atoms). Maps to the same Button
// atom with variant="link". Efrain's set has Variant=Default(blue)|Black ×
// State=Idle|Hover|Pressed; Hover/Pressed are CSS pseudo-classes at runtime, no
// React `disabled` flip (no Disabled variant yet). Asymmetric icon slots:
// leading 20×20 (`Leading icon` / `Show leading icon`), trailing 16×16
// (`Trailing icon` / `Show trailing icon`). Variant=Black → the `.btn--link-black`
// tone modifier (underlined, neutral DSN/900→500→950 ladder); Default → blue.
figma.connect(
  Button,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1895-7',
  {
    imports: ["import { Button } from '@odyssey/ui'"],
    props: {
      label: figma.textContent('Label'),
      tone: figma.enum('Variant', {
        Default: '',
        Black: 'btn--link-black',
      }),
      icon: figma.boolean('Show leading icon', {
        true: figma.instance('Leading icon'),
        false: undefined,
      }),
      iconRight: figma.boolean('Show trailing icon', {
        true: figma.instance('Trailing icon'),
        false: undefined,
      }),
    },
    example: ({ label, tone, icon, iconRight }) => (
      <Button variant="link" size="sm" className={tone} icon={icon} iconRight={iconRight}>
        {label}
      </Button>
    ),
  },
)

import figma from '@figma/code-connect'
import StepIndicator from './StepIndicator'

// Master: `StepIndicator` set 2909:13 (Components-Atoms). `Position` VARIANT
// {Start, Mid, End} → `position`; `Status` VARIANT {Off, On} → `status`.
// The check icon (lucide/check lg) is baked; hidden connector lines keep their
// 16px slot (uniform 40×72). Composed by Accordion.
figma.connect(
  StepIndicator,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2909-13',
  {
    imports: ["import { StepIndicator } from '@odyssey/ui'"],
    props: {
      position: figma.enum('Position', { Start: 'start', Mid: 'mid', End: 'end' }),
      status: figma.enum('Status', { Off: 'off', On: 'on' }),
    },
    example: ({ position, status }) => <StepIndicator position={position} status={status} />,
  },
)

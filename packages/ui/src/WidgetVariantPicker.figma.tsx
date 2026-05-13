import figma from '@figma/code-connect'
import WidgetVariantPicker from './WidgetVariantPicker'

// Master: Components-Molecules page, node 2005:554 (WidgetVariantPicker set).
// Four VARIANT options — each renders the same React component with a different
// `variant` prop. Interactive behavior (arrows, dot clicks) is code-only.
figma.connect(
  WidgetVariantPicker,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '1x' },
    imports: ["import { WidgetVariantPicker } from '@odyssey/ui'"],
    example: () => <WidgetVariantPicker variant="1x" onVariantChange={() => {}} />,
  },
)

figma.connect(
  WidgetVariantPicker,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '2x' },
    imports: ["import { WidgetVariantPicker } from '@odyssey/ui'"],
    example: () => <WidgetVariantPicker variant="2x" onVariantChange={() => {}} />,
  },
)

figma.connect(
  WidgetVariantPicker,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '3x' },
    imports: ["import { WidgetVariantPicker } from '@odyssey/ui'"],
    example: () => <WidgetVariantPicker variant="3x" onVariantChange={() => {}} />,
  },
)

figma.connect(
  WidgetVariantPicker,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2005-554',
  {
    variant: { Variant: '3xChart' },
    imports: ["import { WidgetVariantPicker } from '@odyssey/ui'"],
    example: () => <WidgetVariantPicker variant="3xChart" onVariantChange={() => {}} />,
  },
)

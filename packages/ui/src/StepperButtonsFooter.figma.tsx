import figma from '@figma/code-connect'
import StepperButtonsFooter from './StepperButtonsFooter'

// Master: StepperButtonsFooter (3164:2169). The `Tertiary Button` BOOLEAN → showSave. The
// button labels (Cancel / Save / Continue) are baked in the Figma master (no TEXT props),
// so they surface as code props with the Figma defaults — same pattern as ModalFooter. The
// `Property 1` VARIANT has a single value ("Default") — no mapping needed yet.
figma.connect(
  StepperButtonsFooter,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3164-2169',
  {
    imports: ["import { StepperButtonsFooter } from '@odyssey/ui'"],
    props: {
      showSave: figma.boolean('Tertiary Button'),
    },
    example: ({ showSave }) => (
      <StepperButtonsFooter
        showSave={showSave}
        onCancel={() => {}}
        onSave={() => {}}
        onPrimary={() => {}}
      />
    ),
  },
)

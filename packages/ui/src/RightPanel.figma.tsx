import figma from '@figma/code-connect'
import RightPanel from './RightPanel'

// Master: RightPanel (3449:10701). Slot → children; Footer (BOOLEAN) → the `footer`
// boolean, which shows the baked ModalFooter (Cancel/Save) — NOT a content slot. The
// header (title/subtitle/back/edit) is static in the Figma ModalHeader instance — there
// are no Figma props for it; onBack/onClose/onCancel/onSave are code-only callbacks.
figma.connect(
  RightPanel,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3449-10701',
  {
    imports: ["import { RightPanel } from '@odyssey/ui'"],
    props: {
      children: figma.instance('Slot'),
      footer: figma.boolean('Footer'),
    },
    example: ({ children, footer }) => (
      <RightPanel
        title="Modal Title"
        subtitle="Modal SubTitle"
        onClose={() => {}}
        footer={footer}
        onCancel={() => {}}
        onSave={() => {}}
      >
        {children}
      </RightPanel>
    ),
  },
)

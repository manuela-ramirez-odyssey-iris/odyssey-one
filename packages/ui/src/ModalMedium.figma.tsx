import figma from '@figma/code-connect'
import ModalMedium from './ModalMedium'

// Master: Components-Organisms page, node 2032:915 (ModalMedium organism).
// Content / Footer are SLOT properties — they map to React children / footer
// props. onClose is a code-only callback supplied by the consumer.
figma.connect(
  ModalMedium,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2032-915',
  {
    imports: ["import { ModalMedium } from '@odyssey/ui'"],
    props: {
      title: figma.textContent('Title'),
      children: figma.instance('Content'),
      footer: figma.instance('Footer'),
    },
    example: ({ title, children, footer }) => (
      <ModalMedium title={title} onClose={() => {}} footer={footer}>
        {children}
      </ModalMedium>
    ),
  },
)

import figma from '@figma/code-connect'
import ModalLarge from './ModalLarge'

// Master: Components-Organisms page, node 2006:663 (ModalLarge organism).
// Content / Footer are SLOT properties — they map to React children / footer
// props. onClose is a code-only callback supplied by the consumer.
figma.connect(
  ModalLarge,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2006-663',
  {
    imports: ["import { ModalLarge } from '@odyssey/ui'"],
    props: {
      title: figma.textContent('Title'),
      subtitle: figma.textContent('Subtitle'),
      showSubtitle: figma.boolean('Show subtitle'),
      children: figma.instance('Content'),
      footer: figma.instance('Footer'),
    },
    example: ({ title, subtitle, showSubtitle, children, footer }) => (
      <ModalLarge
        title={title}
        subtitle={subtitle}
        showSubtitle={showSubtitle}
        onClose={() => {}}
        footer={footer}
      >
        {children}
      </ModalLarge>
    ),
  },
)

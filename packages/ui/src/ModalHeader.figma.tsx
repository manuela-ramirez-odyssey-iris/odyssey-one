import figma from '@figma/code-connect'
import ModalHeader from './ModalHeader'

// Master: ModalHeader (3447:7661). Title is an editable TEXT prop → figma.string. Subtitle is
// a TEXT prop gated by the Show Subtitle BOOLEAN → the single optional `subtitle` string (the
// boolean value-map nests the string, avoiding a ternary). Show Back / Editable BOOLEANs →
// onBack / editableTitle. The close X is always shown.
figma.connect(
  ModalHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3447-7661',
  {
    imports: ["import { ModalHeader } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
      subtitle: figma.boolean('Show Subtitle', { true: figma.string('Subtitle'), false: undefined }),
      editableTitle: figma.boolean('Editable'),
      onBack: figma.boolean('Show Back', { true: () => {}, false: undefined }),
    },
    example: ({ title, subtitle, editableTitle, onBack }) => (
      <ModalHeader
        title={title}
        subtitle={subtitle}
        editableTitle={editableTitle}
        onBack={onBack}
        onClose={() => {}}
      />
    ),
  },
)

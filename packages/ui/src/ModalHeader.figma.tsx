import figma from '@figma/code-connect'
import ModalHeader from './ModalHeader'

// Master: ModalHeader SET 6169:7418 (Components-Molecules › Panels).
//
// REPOINTED 2026-09-18 (D16): this mapped 3447:7661, which WAS the standalone
// component when session 73 wrote it. A designer has since combined it into a
// variant set (`Property 1 = Default | Hover`), making 3447:7661 a variant —
// and Code Connect rejects a non-top-level node, which failed validation for the
// WHOLE library publish, not just this file. Every prop mapped below still
// exists on the set, so only the URL moved.
//
// `Property 1 = Hover` is deliberately NOT mapped: appearance states live in
// Figma, hover/focus/active are code + DSM only (the control-state model).
// The set also gained `Show arrow-left` / `Show Title` / `Show close` BOOLEANs
// that postdate this mapping — ModalHeader's own normalize cycle, flagged not
// smuggled in here.
//
// Title is an editable TEXT prop → figma.string. Subtitle is
// a TEXT prop gated by the Show Subtitle BOOLEAN → the single optional `subtitle` string (the
// boolean value-map nests the string, avoiding a ternary). Show Back / Editable BOOLEANs →
// onBack / editableTitle. The close X is always shown.
figma.connect(
  ModalHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=6169-7418',
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

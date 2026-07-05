import figma from '@figma/code-connect'
import TextArea from './TextArea'

// Master: `TextArea` 4138:577 (Components-Molecules, Fields section) — single
// variant; FormField's state model (focus/error/disabled) is code-side (state
// variants pending Efrain). Label row mirrors FormField: `Show label`/`Label`/
// `Show info icon` → showLabel/label/showInfo. `Placeholder` TEXT →
// placeholder; `Show Count` BOOLEAN → showCount; the `Count` TEXT ("130/200")
// is derived in code from value.length + maxLength, so the example wires
// maxLength instead. The mock's hidden AI-assist affordances are deliberately
// unmapped (deferred).
figma.connect(
  TextArea,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=4138-577',
  {
    imports: ["import { TextArea } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      showLabel: figma.boolean('Show label'),
      showInfo: figma.boolean('Show info icon'),
      placeholder: figma.string('Placeholder'),
      showCount: figma.boolean('Show Count'),
    },
    example: ({ label, showLabel, showInfo, placeholder, showCount }) => (
      <TextArea
        label={label}
        showLabel={showLabel}
        showInfo={showInfo}
        placeholder={placeholder}
        value=""
        onChange={() => {}}
        maxLength={200}
        showCount={showCount}
      />
    ),
  },
)

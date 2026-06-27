import figma from '@figma/code-connect'
import CustomerRow from './CustomerRow'

// Master: Components-Molecules page, set `CustomerRow` at 2029:461.
// Variant axes (current Figma): Type=List|Result × State=Default|Hover|Pressed|Focus.
// Type drives row size + trailing action; State = interaction states (code-only).
// (The old Favorite axis was removed in Figma; `favorite` remains a React prop.)
figma.connect(
  CustomerRow,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2029-461',
  {
    imports: ["import { CustomerRow } from '@odyssey/ui'"],
    props: {
      // Figma axis renamed Mode → Type; the Favorite axis was removed (replaced
      // by interaction State variants, which are code-only). `favorite` stays a
      // React prop, defaulted in the example.
      mode: figma.enum('Type', { List: 'list', Result: 'result' }),
      label: figma.string('Label'),
      icon: figma.instance('Icon'),
    },
    example: ({ mode, label, icon }) => (
      <CustomerRow mode={mode} label={label} icon={icon} />
    ),
  },
)

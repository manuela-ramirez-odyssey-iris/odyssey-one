import figma from '@figma/code-connect'
import SectionLabel from './SectionLabel'

figma.connect(
  SectionLabel,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2198-308',
  {
    imports: ["import { SectionLabel } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      mode: figma.enum('Mode', { Default: 'default', Edit: 'edit' }),
    },
    example: ({ label, mode }) => (
      <SectionLabel label={label} mode={mode} onEdit={() => {}} onDelete={() => {}} />
    ),
  },
)

import figma from '@figma/code-connect'
import AddSectionDivider from './AddSectionDivider'

figma.connect(
  AddSectionDivider,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2203-297',
  {
    imports: ["import { AddSectionDivider } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
    },
    example: ({ label }) => <AddSectionDivider label={label} />,
  },
)

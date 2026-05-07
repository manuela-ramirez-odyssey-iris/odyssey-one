import figma from '@figma/code-connect'
import SectionHeader from './SectionHeader'

figma.connect(
  SectionHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1696-49',
  {
    imports: ["import { SectionHeader } from '@odyssey/ui'"],
    props: {
      title: figma.textContent('Title'),
      supportingText: figma.textContent('Supporting text'),
    },
    example: ({ title, supportingText }) => (
      <SectionHeader title={title} supportingText={supportingText} />
    ),
  },
)

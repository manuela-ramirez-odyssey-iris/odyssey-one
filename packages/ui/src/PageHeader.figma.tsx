import figma from '@figma/code-connect'
import PageHeader from './PageHeader'

figma.connect(
  PageHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1693-49',
  {
    imports: ["import { PageHeader } from '@odyssey/ui'"],
    props: {
      title: figma.textContent('Title'),
    },
    example: ({ title }) => <PageHeader title={title} />,
  },
)

import figma from '@figma/code-connect'
import AddSectionButton from './AddSectionButton'

figma.connect(
  AddSectionButton,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=2210-302',
  {
    imports: ["import { AddSectionButton } from '@odyssey/ui'"],
    example: () => <AddSectionButton onClick={() => {}} />,
  },
)

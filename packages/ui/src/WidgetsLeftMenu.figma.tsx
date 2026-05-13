import figma from '@figma/code-connect'
import WidgetsLeftMenu from './WidgetsLeftMenu'

figma.connect(
  WidgetsLeftMenu,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1961-393',
  {
    imports: ["import { WidgetsLeftMenu } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
    },
    example: ({ title }) => (
      <WidgetsLeftMenu
        title={title}
        groups={[]}
        searchValue=""
        onSearchChange={() => {}}
      />
    ),
  },
)

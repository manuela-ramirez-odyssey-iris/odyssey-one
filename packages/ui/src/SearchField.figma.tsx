import figma from '@figma/code-connect'
import SearchField from './SearchField'

figma.connect(
  SearchField,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1959-76',
  {
    imports: ["import { SearchField } from '@odyssey/ui'"],
    props: {
      placeholder: figma.string('Placeholder'),
    },
    example: ({ placeholder }) => (
      <SearchField placeholder={placeholder} value="" onChange={() => {}} />
    ),
  },
)

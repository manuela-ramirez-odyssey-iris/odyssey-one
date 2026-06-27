import figma from '@figma/code-connect'
import Breadcrumb from './Breadcrumb'

figma.connect(
  Breadcrumb,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3141-732',
  {
    imports: ["import { Breadcrumb } from '@odyssey/ui'"],
    props: {
      label: figma.string('Label'),
      // Figma variant property is slash-prefixed ("Breadcrumb/Current") — match it verbatim.
      current: figma.enum('Breadcrumb/Current', {
        True: true,
        False: false,
      }),
    },
    example: ({ label, current }) => (
      <Breadcrumb label={label} current={current} onClick={() => {}} />
    ),
  },
)

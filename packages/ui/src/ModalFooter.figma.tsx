import figma from '@figma/code-connect'
import ModalFooter from './ModalFooter'

// Master: ModalFooter set (3170:3649). The Type VARIANT → the `type` prop (semantic names).
// Labels are code props (the Figma variant carries fixed sample labels); no booleans.
figma.connect(
  ModalFooter,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3170-3649',
  {
    imports: ["import { ModalFooter } from '@odyssey/ui'"],
    props: {
      type: figma.enum('Type', {
        ModalFooter1: 'confirm',
        ModalFooter2: 'filters',
        ModalFooter3: 'link',
      }),
    },
    example: ({ type }) => (
      <ModalFooter type={type} onCancel={() => {}} onSave={() => {}} />
    ),
  },
)

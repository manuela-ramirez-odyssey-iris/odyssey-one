import figma from '@figma/code-connect'
import SubSectionHeader from './SubSectionHeader'

// Master: Components-Molecules page, `SubSectionHeader` `3303:3665`.
// `Title` TEXT → title; `Info Icon` / `Dropdown` BOOLEANs gate the two static glyphs.
figma.connect(
  SubSectionHeader,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3303-3665',
  {
    imports: ["import { SubSectionHeader } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
      showInfo: figma.boolean('Info Icon'),
      showDropdown: figma.boolean('Dropdown'),
    },
    example: ({ title, showInfo, showDropdown }) => (
      <SubSectionHeader title={title} showInfo={showInfo} showDropdown={showDropdown} />
    ),
  },
)

import figma from '@figma/code-connect'
import TitleSubtitle from './TitleSubtitle'

// Master: TitleSubtitle (3016:2056). TEXT props Title / Subtitle → figma.string. The
// Show Icon BOOLEAN gates the static `copy` glyph → showIcon. (onIconClick is a code-side
// additive that upgrades the glyph to a copy affordance; not represented in Figma.)
figma.connect(
  TitleSubtitle,
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=3016-2056',
  {
    imports: ["import { TitleSubtitle } from '@odyssey/ui'"],
    props: {
      title: figma.string('Title'),
      subtitle: figma.string('Subtitle'),
      showIcon: figma.boolean('Show Icon'),
    },
    example: ({ title, subtitle, showIcon }) => (
      <TitleSubtitle title={title} subtitle={subtitle} showIcon={showIcon} />
    ),
  },
)
